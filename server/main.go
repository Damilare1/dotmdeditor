package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	mathrand "math/rand"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

// ── Constants ────────────────────────────────────────────────────────────────

const (
	maxContentBytes = 512 * 1024 // 512 KB
	cacheTTL        = 5 * time.Hour
	slugLen         = 8
	slugAlphabet    = "abcdefghijklmnopqrstuvwxyz0123456789"
	rateLimitWindow = time.Minute
	rateLimitMax    = 10
)

// ── Models ───────────────────────────────────────────────────────────────────

type Document struct {
	Slug    string `json:"slug"`
	Content string `json:"content"`
	Title   string `json:"title,omitempty"`
	Locked  bool   `json:"locked"`
}

type saveRequest struct {
	Content string `json:"content"`
	Title   string `json:"title,omitempty"`
}

// ── Slug ─────────────────────────────────────────────────────────────────────

var rng = mathrand.New(mathrand.NewSource(time.Now().UnixNano()))

func newSlug() string {
	b := make([]byte, slugLen)
	for i := range b {
		b[i] = slugAlphabet[rng.Intn(len(slugAlphabet))]
	}
	return string(b)
}

// newEditToken generates a 32-byte crypto-random token (64 hex chars).
func newEditToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// ── PostgreSQL ────────────────────────────────────────────────────────────────

func initSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id         BIGSERIAL    PRIMARY KEY,
			email      VARCHAR(255) UNIQUE NOT NULL,
			created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS documents (
			id         BIGSERIAL    PRIMARY KEY,
			slug       VARCHAR(20)  UNIQUE NOT NULL,
			content    TEXT         NOT NULL,
			title      VARCHAR(200),
			created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents (slug);

		-- Idempotent migrations for columns added after initial deploy.
		ALTER TABLE documents
			ADD COLUMN IF NOT EXISTS user_id    BIGINT       REFERENCES users(id) ON DELETE SET NULL;
		ALTER TABLE documents
			ADD COLUMN IF NOT EXISTS edit_token VARCHAR(64);
		ALTER TABLE documents
			ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
		ALTER TABLE documents
			ADD COLUMN IF NOT EXISTS locked     BOOLEAN      NOT NULL DEFAULT false;
		CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
	`)
	return err
}

// dbInsert persists a new document and returns the generated edit_token.
func dbInsert(ctx context.Context, pool *pgxpool.Pool, slug, content, title string, userID *int64) (string, error) {
	token := newEditToken()
	_, err := pool.Exec(ctx,
		`INSERT INTO documents (slug, content, title, user_id, edit_token)
		 VALUES ($1, $2, NULLIF($3, ''), $4, $5)`,
		slug, content, title, userID, token,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

func dbFetch(ctx context.Context, pool *pgxpool.Pool, slug string) (*Document, error) {
	var d Document
	err := pool.QueryRow(ctx,
		`SELECT slug, content, COALESCE(title, ''), locked
		 FROM documents WHERE slug = $1`,
		slug,
	).Scan(&d.Slug, &d.Content, &d.Title, &d.Locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &d, err
}

func isUniqueViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}

// ── Redis ─────────────────────────────────────────────────────────────────────

func cacheKey(slug string) string { return "doc:" + slug }

func cacheGet(ctx context.Context, rdb *redis.Client, slug string) (*Document, bool) {
	raw, err := rdb.Get(ctx, cacheKey(slug)).Bytes()
	if err != nil {
		return nil, false
	}
	var d Document
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil, false
	}
	return &d, true
}

func cacheSet(ctx context.Context, rdb *redis.Client, d *Document) {
	raw, err := json.Marshal(d)
	if err != nil {
		return
	}
	if err := rdb.Set(ctx, cacheKey(d.Slug), raw, cacheTTL).Err(); err != nil {
		log.Printf("cache set %s: %v", d.Slug, err)
	}
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

// trustProxyHeaders controls whether realIP honours client-supplied
// X-Real-IP / X-Forwarded-For headers. It is enabled at startup only when
// TRUST_PROXY_HEADERS=true, i.e. when the service runs behind a reverse proxy
// that overwrites those headers. When false we use the TCP peer address, which
// cannot be spoofed — otherwise an attacker could forge a unique header per
// request and bypass the rate limiter entirely (e.g. to brute-force OTPs).
var trustProxyHeaders bool

// realIP extracts the client IP. Proxy-set headers are honoured only when the
// operator has declared (via TRUST_PROXY_HEADERS) that a trusted proxy sits in
// front and sanitises them; otherwise only the unspoofable RemoteAddr is used.
func realIP(r *http.Request) string {
	if trustProxyHeaders {
		if v := r.Header.Get("X-Real-IP"); v != "" {
			if ip := net.ParseIP(strings.TrimSpace(v)); ip != nil {
				return ip.String()
			}
		}
		if v := r.Header.Get("X-Forwarded-For"); v != "" {
			// X-Forwarded-For may be a comma-separated list; the leftmost is the client.
			if ip := net.ParseIP(strings.TrimSpace(strings.SplitN(v, ",", 2)[0])); ip != nil {
				return ip.String()
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// rlKey returns the Redis key for the current fixed time window.
// The window bucket advances every rateLimitWindow, so keys expire naturally.
func rlKey(ip string) string {
	bucket := time.Now().Unix() / int64(rateLimitWindow.Seconds())
	return fmt.Sprintf("rl:%s:%d", ip, bucket)
}

// rateLimiter is a Redis-backed fixed-window middleware.
// It sets standard RateLimit headers and returns 429 once the limit is exceeded.
// If Redis is unavailable it fails open so transient cache outages don't block users.
func rateLimiter(rdb *redis.Client) func(http.Handler) http.Handler {
	windowSecs := int(rateLimitWindow.Seconds())
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := realIP(r)
			key := rlKey(ip)

			// Atomically increment and set TTL on the first request in the window.
			pipe := rdb.Pipeline()
			incr := pipe.Incr(r.Context(), key)
			pipe.Expire(r.Context(), key, rateLimitWindow+5*time.Second) // +5 s safety margin
			if _, err := pipe.Exec(r.Context()); err != nil {
				// Redis unavailable — fail open, log and continue.
				log.Printf("rate limiter redis error for %s: %v", ip, err)
				next.ServeHTTP(w, r)
				return
			}

			count := int(incr.Val())
			remaining := rateLimitMax - count
			if remaining < 0 {
				remaining = 0
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(rateLimitMax))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Window", strconv.Itoa(windowSecs))

			if count > rateLimitMax {
				logSecurity(r, "rate_limited", "method", r.Method, "path", r.URL.Path, "count", count)
				w.Header().Set("Retry-After", strconv.Itoa(windowSecs))
				writeError(w, http.StatusTooManyRequests,
					fmt.Sprintf("rate limit exceeded — max %d requests per minute", rateLimitMax))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// tokenMatch compares two secret tokens in constant time to avoid leaking how
// many leading characters matched via response-timing differences.
func tokenMatch(got, want string) bool {
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

// maskEmail returns a privacy-preserving identifier for audit logs: the local
// part is masked down to its last two characters while the domain is kept in
// clear, so events stay correlatable (and domain-targeted attacks visible)
// without recording the user's full address. The mask uses one '*' per hidden
// character so the original local-part length stays apparent.
// Example: "alice@gmail.com" -> "***ce@gmail.com".
func maskEmail(email string) string {
	at := strings.LastIndexByte(email, '@')
	if at < 0 {
		return strings.Repeat("*", len(email)) // not a well-formed address — don't leak it
	}
	local, domain := email[:at], email[at:]
	keep := 2
	if len(local) < keep {
		keep = len(local)
	}
	return strings.Repeat("*", len(local)-keep) + local[len(local)-keep:] + domain
}

// logSecurity emits a single greppable audit line for a security-relevant event
// (auth attempts, permission grants/denials, rate limiting). Lines look like:
//
//	[SECURITY] event=login_success ip=203.0.113.7 email=a1b2c3d4@b.com user_id=42
//
// Filter the log stream on the "[SECURITY]" prefix to feed a SIEM/alerting rule.
// Never pass secrets (OTP codes, edit/session tokens) or raw emails as values —
// only identifiers and outcomes belong here; use hashEmail for addresses.
func logSecurity(r *http.Request, event string, kv ...any) {
	var sb strings.Builder
	fmt.Fprintf(&sb, "[SECURITY] event=%s ip=%s", event, realIP(r))
	for i := 0; i+1 < len(kv); i += 2 {
		fmt.Fprintf(&sb, " %v=%v", kv[i], kv[i+1])
	}
	log.Print(sb.String())
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// POST /api/documents
func handleSave(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req saveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		req.Content = strings.TrimSpace(req.Content)
		if req.Content == "" {
			writeError(w, http.StatusBadRequest, "content is required")
			return
		}
		if len(req.Content) > maxContentBytes {
			writeError(w, http.StatusRequestEntityTooLarge, "content exceeds the 512 KB limit")
			return
		}

		// Attach to the authenticated user if a valid session token was provided.
		var uid *int64
		if id, ok := userIDFromCtx(r.Context()); ok {
			uid = &id
		}

		// Attempt insert; retry on the rare slug collision (36^8 ≈ 2.8 trillion combos)
		var slug, editToken string
		for attempt := range 5 {
			slug = newSlug()
			tok, err := dbInsert(r.Context(), pool, slug, req.Content, req.Title, uid)
			if err == nil {
				editToken = tok
				break
			}
			if isUniqueViolation(err) {
				slug = ""
				continue
			}
			log.Printf("db insert (attempt %d): %v", attempt+1, err)
			writeError(w, http.StatusInternalServerError, "failed to save document")
			return
		}
		if slug == "" {
			writeError(w, http.StatusInternalServerError, "could not generate a unique slug")
			return
		}

		doc := &Document{Slug: slug, Content: req.Content, Title: req.Title}
		cacheSet(r.Context(), rdb, doc)

		writeJSON(w, http.StatusCreated, map[string]string{
			"slug":       slug,
			"edit_token": editToken,
		})
	}
}

// GET /api/documents/{slug}
func handleLoad(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")
		if slug == "" || len(slug) > 20 {
			writeError(w, http.StatusBadRequest, "invalid slug")
			return
		}

		// Redis cache hit
		if doc, ok := cacheGet(r.Context(), rdb, slug); ok {
			w.Header().Set("X-Cache", "HIT")
			writeJSON(w, http.StatusOK, doc)
			return
		}

		// Cache miss — query Postgres
		doc, err := dbFetch(r.Context(), pool, slug)
		if err != nil {
			log.Printf("db fetch %s: %v", slug, err)
			writeError(w, http.StatusInternalServerError, "failed to load document")
			return
		}
		if doc == nil {
			writeError(w, http.StatusNotFound, "document not found")
			return
		}

		// Populate cache for next request
		cacheSet(r.Context(), rdb, doc)

		w.Header().Set("X-Cache", "MISS")
		writeJSON(w, http.StatusOK, doc)
	}
}

// PUT /api/documents/{slug}
func handleUpdate(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")
		if slug == "" || len(slug) > 20 {
			writeError(w, http.StatusBadRequest, "invalid slug")
			return
		}

		var req saveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		req.Content = strings.TrimSpace(req.Content)
		if req.Content == "" {
			writeError(w, http.StatusBadRequest, "content is required")
			return
		}
		if len(req.Content) > maxContentBytes {
			writeError(w, http.StatusRequestEntityTooLarge, "content exceeds the 512 KB limit")
			return
		}

		// Load stored owner, edit_token, and locked flag for this document.
		var storedToken string
		var ownerID *int64
		var locked bool
		err := pool.QueryRow(r.Context(),
			`SELECT edit_token, user_id, locked FROM documents WHERE slug = $1`, slug,
		).Scan(&storedToken, &ownerID, &locked)
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "document not found")
			return
		}
		if err != nil {
			log.Printf("db read for update %s: %v", slug, err)
			writeError(w, http.StatusInternalServerError, "failed to load document")
			return
		}

		documentOwner := false
		if uid, ok := userIDFromCtx(r.Context()); ok && ownerID != nil && uid == *ownerID {
			documentOwner = true
		}

		// Only document owner can edit a locked document.
		if locked && !documentOwner {
			logSecurity(r, "doc_edit_denied", "slug", slug, "reason", "locked")
			writeError(w, http.StatusLocked, "this document is locked and cannot be edited — unlock it first")
			return
		}

		// Authorise: valid X-Edit-Token OR authenticated owner.
		editToken := r.Header.Get("X-Edit-Token")

		if !documentOwner && !tokenMatch(editToken, storedToken) {
			logSecurity(r, "doc_edit_denied", "slug", slug, "reason", "bad_edit_token")
			writeError(w, http.StatusForbidden, "you do not have permission to edit this document")
			return
		}

		_, err = pool.Exec(r.Context(),
			`UPDATE documents
			 SET content = $1, title = NULLIF($2, ''), updated_at = NOW()
			 WHERE slug = $3`,
			req.Content, req.Title, slug,
		)
		if err != nil {
			log.Printf("db update %s: %v", slug, err)
			writeError(w, http.StatusInternalServerError, "failed to update document")
			return
		}

		authMethod := "edit_token"
		if documentOwner {
			authMethod = "session_owner"
		}
		logSecurity(r, "doc_edit", "slug", slug, "auth", authMethod)

		// Bust the cache so the next load reflects the new content.
		rdb.Del(r.Context(), cacheKey(slug))

		writeJSON(w, http.StatusOK, map[string]string{"slug": slug})
	}
}

// PATCH /api/documents/{slug}  — toggle the locked flag
func handlePatch(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")
		if slug == "" || len(slug) > 20 {
			writeError(w, http.StatusBadRequest, "invalid slug")
			return
		}

		var body struct {
			Locked *bool `json:"locked"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Locked == nil {
			writeError(w, http.StatusBadRequest, `body must be {"locked": true} or {"locked": false}`)
			return
		}

		var storedToken string
		var ownerID *int64
		err := pool.QueryRow(r.Context(),
			`SELECT edit_token, user_id FROM documents WHERE slug = $1`, slug,
		).Scan(&storedToken, &ownerID)
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "document not found")
			return
		}
		if err != nil {
			log.Printf("db read for patch %s: %v", slug, err)
			writeError(w, http.StatusInternalServerError, "failed to load document")
			return
		}

		editToken := r.Header.Get("X-Edit-Token")
		sessionOwner := false
		if uid, ok := userIDFromCtx(r.Context()); ok && ownerID != nil && uid == *ownerID {
			sessionOwner = true
		}

		action := "unlock"
		if *body.Locked {
			action = "lock"
		}

		if *body.Locked {
			// Locking: edit-token holder or session owner may lock.
			if !tokenMatch(editToken, storedToken) && !sessionOwner {
				logSecurity(r, "doc_lock_denied", "slug", slug, "action", action, "reason", "bad_edit_token")
				writeError(w, http.StatusForbidden, "you do not have permission to lock this document")
				return
			}
		} else {
			// Unlocking: session owner is always allowed.
			// For anonymous documents (no user_id) the edit token is the only credential,
			// so fall back to that so the original saver is never permanently locked out.
			if ownerID != nil && !sessionOwner {
				logSecurity(r, "doc_lock_denied", "slug", slug, "action", action, "reason", "not_owner")
				writeError(w, http.StatusForbidden, "only the document owner can unlock this document — sign in to continue")
				return
			}
			if ownerID == nil && !tokenMatch(editToken, storedToken) {
				logSecurity(r, "doc_lock_denied", "slug", slug, "action", action, "reason", "bad_edit_token")
				writeError(w, http.StatusForbidden, "you do not have permission to unlock this document")
				return
			}
		}

		if _, err := pool.Exec(r.Context(),
			`UPDATE documents SET locked = $1 WHERE slug = $2`, *body.Locked, slug,
		); err != nil {
			log.Printf("db lock %s: %v", slug, err)
			writeError(w, http.StatusInternalServerError, "failed to update document")
			return
		}

		authMethod := "edit_token"
		if sessionOwner {
			authMethod = "session_owner"
		}
		logSecurity(r, "doc_"+action, "slug", slug, "auth", authMethod)

		rdb.Del(r.Context(), cacheKey(slug))

		writeJSON(w, http.StatusOK, map[string]bool{"locked": *body.Locked})
	}
}

// GET /health
func handleHealth(pool *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		dbOK := pool.Ping(ctx) == nil
		redisOK := rdb.Ping(ctx).Err() == nil
		status := http.StatusOK
		if !dbOK || !redisOK {
			status = http.StatusServiceUnavailable
		}
		writeJSON(w, status, map[string]bool{"db": dbOK, "redis": redisOK})
	}
}

// ── Startup ───────────────────────────────────────────────────────────────────

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	// Load .env if present. Silently ignored in production where vars are injected by the host.
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	ctx := context.Background()

	dbURL := env("DATABASE_URL", "postgres://postgres:postgres@localhost:5434/markdown_editor?sslmode=disable")
	redisURL := env("REDIS_URL", "redis://localhost:6380")
	port := env("PORT", "8080")
	allowedOrigin := env("ALLOWED_ORIGIN", "http://localhost:5173")

	// Only honour X-Forwarded-For / X-Real-IP when a trusted proxy sits in front
	// and overwrites them. Otherwise clients can spoof these to evade rate limits.
	trustProxyHeaders = env("TRUST_PROXY_HEADERS", "false") == "true"
	if trustProxyHeaders {
		log.Println("rate limiter: trusting X-Forwarded-For/X-Real-IP — ensure your proxy strips inbound copies of these headers")
	}

	// ── PostgreSQL ──
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("postgres connect: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("postgres ping: %v", err)
	}
	if err := initSchema(ctx, pool); err != nil {
		log.Fatalf("schema init: %v", err)
	}
	log.Println("postgres: connected")

	// ── Redis ──
	redisOpts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("redis URL parse: %v", err)
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}
	log.Println("redis: connected")

	emailCfg := loadEmailConfig()
	if emailCfg.devMode || emailCfg.host == "" {
		log.Println("email: dev mode — OTPs will be printed to stdout")
	}

	// ── Router ──
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{allowedOrigin},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Edit-Token"},
		MaxAge:         300,
	}))

	// /health is exempt — uptime monitors must not consume rate-limit quota.
	r.Get("/health", handleHealth(pool, rdb))

	// All /api routes share a rate-limit budget per IP and have session middleware.
	r.Group(func(r chi.Router) {
		r.Use(rateLimiter(rdb))
		r.Use(sessionMiddleware(rdb))

		// Document endpoints
		r.Post("/api/documents", handleSave(pool, rdb))
		r.Get("/api/documents/{slug}", handleLoad(pool, rdb))
		r.Put("/api/documents/{slug}", handleUpdate(pool, rdb))
		r.Patch("/api/documents/{slug}", handlePatch(pool, rdb))

		// Auth endpoints
		r.Post("/api/auth/request-code", handleRequestCode(rdb, emailCfg))
		r.Post("/api/auth/verify-code", handleVerifyCode(pool, rdb))
		r.Delete("/api/auth/session", handleSignOut(rdb))

		// User endpoints
		r.Get("/api/users/me/documents", handleMyDocuments(pool))
	})

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
