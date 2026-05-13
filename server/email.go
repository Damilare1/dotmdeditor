package main

import (
	"fmt"
	"log"
	"net/smtp"
)

type emailConfig struct {
	host    string
	port    string
	user    string
	pass    string
	from    string
	devMode bool // when true, print to log instead of sending
}

func loadEmailConfig() emailConfig {
	return emailConfig{
		host:    env("SMTP_HOST", ""),
		port:    env("SMTP_PORT", "587"),
		user:    env("SMTP_USER", ""),
		pass:    env("SMTP_PASS", ""),
		from:    env("SMTP_FROM", env("SMTP_USER", "noreply@example.com")),
		devMode: env("EMAIL_DEV_MODE", "false") == "true",
	}
}

func sendOTPEmail(cfg emailConfig, to, code string) error {
	// Dev/unconfigured mode — log to stdout so local dev works without an SMTP server.
	if cfg.devMode || cfg.host == "" {
		log.Printf("[EMAIL] to=%s  subject=\"Your verification code\"  otp=%s", to, code)
		return nil
	}

	msg := fmt.Sprintf(
		"From: Markdown Editor <%s>\r\n"+
			"To: %s\r\n"+
			"Subject: Your Markdown Editor verification code\r\n"+
			"Content-Type: text/plain; charset=UTF-8\r\n"+
			"\r\n"+
			"Your verification code is:\r\n\r\n"+
			"    %s\r\n\r\n"+
			"It expires in 10 minutes.\r\n"+
			"If you did not request this code you can safely ignore this email.\r\n",
		cfg.from, to, code,
	)

	var auth smtp.Auth
	if cfg.user != "" {
		auth = smtp.PlainAuth("", cfg.user, cfg.pass, cfg.host)
	}

	return smtp.SendMail(cfg.host+":"+cfg.port, auth, cfg.from, []string{to}, []byte(msg))
}
