package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ── Constants ─────────────────────────────────────────────────────────────────

const (
	otpTTL     = 10 * time.Minute
	sessionTTL = 7 * 24 * time.Hour

	// maxOTPAttempts caps wrong guesses per issued code before it is burned.
	// A 6-digit code has 1,000,000 combinations; bounding attempts keeps the
	// odds of a successful blind guess negligible even if the IP rate limiter
	// is somehow bypassed.
	maxOTPAttempts = 5
)

// ── Context key ───────────────────────────────────────────────────────────────

type ctxKey string

const ctxUserID ctxKey = "userID"

func userIDFromCtx(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(ctxUserID).(int64)
	return id, ok
}

// ── Validation ────────────────────────────────────────────────────────────────

var emailRE = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func validEmail(s string) bool { return emailRE.MatchString(s) }

// ── Tokens ────────────────────────────────────────────────────────────────────

func newOTP() string {
	b := make([]byte, 4)
	rand.Read(b)
	n := (int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])) & 0x7fffffff
	return fmt.Sprintf("%06d", n%1_000_000)
}

func newSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ── Redis helpers ─────────────────────────────────────────────────────────────

func otpRedisKey(email string) string         { return "otp:" + email }
func otpAttemptsRedisKey(email string) string { return "otp_attempts:" + email }
func sessionRedisKey(tok string) string       { return "session:" + tok }

func lookupSession(ctx context.Context, rdb *redis.Client, token string) (int64, bool) {
	val, err := rdb.Get(ctx, sessionRedisKey(token)).Int64()
	if err != nil {
		return 0, false
	}
	return val, true
}

// ── Session middleware ────────────────────────────────────────────────────────

// sessionMiddleware reads the Bearer token from Authorization and injects the
// user ID into the request context. Routes that require auth must call
// userIDFromCtx themselves and return 401 if absent.
func sessionMiddleware(rdb *redis.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if token != "" {
				if uid, ok := lookupSession(r.Context(), rdb, token); ok {
					r = r.WithContext(context.WithValue(r.Context(), ctxUserID, uid))
				} else {
					// A Bearer token that resolves to no session: expired/revoked,
					// or someone probing with guessed tokens.
					logSecurity(r, "invalid_session_token")
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ── Database helpers ──────────────────────────────────────────────────────────

// upsertUser inserts a new user or returns the existing one's ID.
func upsertUser(ctx context.Context, pool *pgxpool.Pool, email string) (int64, error) {
	var id int64
	err := pool.QueryRow(ctx,
		`INSERT INTO users (email) VALUES ($1)
		 ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		 RETURNING id`,
		email,
	).Scan(&id)
	return id, err
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// POST /api/auth/request-code
func handleRequestCode(rdb *redis.Client, cfg emailConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		body.Email = strings.ToLower(strings.TrimSpace(body.Email))
		if !validEmail(body.Email) {
			logSecurity(r, "otp_request_rejected", "reason", "invalid_email")
			writeError(w, http.StatusBadRequest, "invalid email address")
			return
		}

		logSecurity(r, "otp_requested", "email", maskEmail(body.Email))

		code := newOTP()
		if err := rdb.Set(r.Context(), otpRedisKey(body.Email), code, otpTTL).Err(); err != nil {
			log.Printf("otp store [%s]: %v", body.Email, err)
			writeError(w, http.StatusInternalServerError, "failed to generate code")
			return
		}
		// A new code gets a fresh attempt budget.
		rdb.Del(r.Context(), otpAttemptsRedisKey(body.Email))

		if err := sendOTPEmail(cfg, body.Email, code); err != nil {
			log.Printf("otp email [%s]: %v", body.Email, err)
			writeError(w, http.StatusInternalServerError, "failed to send verification email")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Verification code sent"})
	}
}

// POST /api/auth/verify-code
func handleVerifyCode(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Email string `json:"email"`
			Code  string `json:"code"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		body.Email = strings.ToLower(strings.TrimSpace(body.Email))
		body.Code = strings.TrimSpace(body.Code)

		if !validEmail(body.Email) || body.Code == "" {
			writeError(w, http.StatusBadRequest, "email and code are required")
			return
		}

		masked := maskEmail(body.Email)

		stored, err := rdb.Get(r.Context(), otpRedisKey(body.Email)).Result()
		if err != nil {
			logSecurity(r, "login_failed", "email", masked, "reason", "no_active_code")
			writeError(w, http.StatusUnauthorized, "code is invalid or has expired")
			return
		}

		// Count this attempt before checking the code. Once the cap is reached,
		// burn the OTP so an attacker cannot keep guessing against a live code.
		attempts, err := rdb.Incr(r.Context(), otpAttemptsRedisKey(body.Email)).Result()
		if err == nil && attempts == 1 {
			// Tie the counter's lifetime to the code's so it cannot outlive it.
			rdb.Expire(r.Context(), otpAttemptsRedisKey(body.Email), otpTTL)
		}
		if attempts > maxOTPAttempts {
			rdb.Del(r.Context(), otpRedisKey(body.Email), otpAttemptsRedisKey(body.Email))
			logSecurity(r, "login_blocked", "email", masked, "reason", "too_many_attempts", "attempts", attempts)
			writeError(w, http.StatusTooManyRequests, "too many incorrect attempts — request a new code")
			return
		}

		// Constant-time comparison to avoid leaking the code via response timing.
		if subtle.ConstantTimeCompare([]byte(stored), []byte(body.Code)) != 1 {
			logSecurity(r, "login_failed", "email", masked, "reason", "incorrect_code", "attempt", attempts)
			writeError(w, http.StatusUnauthorized, "incorrect code")
			return
		}

		// Consume the OTP and its attempt counter so neither can be reused.
		rdb.Del(r.Context(), otpRedisKey(body.Email), otpAttemptsRedisKey(body.Email))

		uid, err := upsertUser(r.Context(), pool, body.Email)
		if err != nil {
			log.Printf("upsert user [%s]: %v", masked, err)
			writeError(w, http.StatusInternalServerError, "failed to verify")
			return
		}

		token := newSessionToken()
		if err := rdb.Set(r.Context(), sessionRedisKey(token), uid, sessionTTL).Err(); err != nil {
			log.Printf("session store [%s]: %v", masked, err)
			writeError(w, http.StatusInternalServerError, "failed to create session")
			return
		}

		logSecurity(r, "login_success", "email", masked, "user_id", uid)

		writeJSON(w, http.StatusOK, map[string]string{"token": token})
	}
}

// DELETE /api/auth/session
func handleSignOut(rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token != "" {
			if uid, ok := lookupSession(r.Context(), rdb, token); ok {
				logSecurity(r, "logout", "user_id", uid)
			}
			rdb.Del(r.Context(), sessionRedisKey(token))
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// GET /api/users/me/documents
func handleMyDocuments(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := userIDFromCtx(r.Context())
		if !ok {
			logSecurity(r, "unauthorized", "path", r.URL.Path)
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}

		rows, err := pool.Query(r.Context(),
			`SELECT slug, COALESCE(title, 'Untitled'), created_at
			 FROM documents
			 WHERE user_id = $1
			 ORDER BY created_at DESC
			 LIMIT 100`,
			uid,
		)
		if err != nil {
			log.Printf("list docs user=%d: %v", uid, err)
			writeError(w, http.StatusInternalServerError, "failed to load documents")
			return
		}
		defer rows.Close()

		type summary struct {
			Slug      string    `json:"slug"`
			Title     string    `json:"title"`
			CreatedAt time.Time `json:"created_at"`
		}
		docs := make([]summary, 0)
		for rows.Next() {
			var d summary
			if err := rows.Scan(&d.Slug, &d.Title, &d.CreatedAt); err != nil {
				continue
			}
			docs = append(docs, d)
		}

		writeJSON(w, http.StatusOK, docs)
	}
}
