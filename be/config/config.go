package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret        string
	JWTRefreshSecret string
	JWTExpiryHours   int
	JWTRefreshDays   int

	ServerPort     string
	UploadPath     string
	BaseURL        string
	FRONTEND_URL   string
	TrustedProxies []string

	// AppTimezone is the business timezone (IANA name). Order numbers, receipt
	// timestamps, and report date boundaries use it instead of the server's
	// clock, so a UTC host still reports the restaurant's local day.
	AppTimezone string

	// FCMCredentials is the Firebase service account (JSON content or path to
	// the file) used to send push notifications. Empty disables push.
	FCMCredentials string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	cfg := &Config{
		AppEnv:           getEnv("APP_ENV", "development"),
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnv("DB_PORT", "5432"),
		DBUser:           getEnv("DB_USER", "postgres"),
		DBPassword:       getEnv("DB_PASSWORD", ""),
		DBName:           getEnv("DB_NAME", "qrdigo"),
		DBSSLMode:        getEnv("DB_SSLMODE", "disable"),
		JWTSecret:        getEnv("JWT_SECRET", "your-secret-key"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "your-refresh-secret-key"),
		JWTExpiryHours:   getEnvInt("JWT_EXPIRY_HOURS", 24),
		JWTRefreshDays:   getEnvInt("JWT_REFRESH_DAYS", 7),
		ServerPort:       getEnv("SERVER_PORT", "8080"),
		UploadPath:       getEnv("UPLOAD_PATH", "./uploads"),
		BaseURL:          strings.TrimRight(getEnv("BASE_URL", "http://localhost:8080"), "/"),
		FRONTEND_URL:     strings.TrimRight(getEnv("FRONTEND_URL", "http://localhost:3000"), "/"),
		AppTimezone:      getEnv("APP_TIMEZONE", getEnv("TZ", "Asia/Jakarta")),
		FCMCredentials:   getEnv("FCM_CREDENTIALS", ""),
	}

	if raw := getEnv("TRUSTED_PROXIES", ""); raw != "" {
		for _, p := range strings.Split(raw, ",") {
			if p = strings.TrimSpace(p); p != "" {
				cfg.TrustedProxies = append(cfg.TrustedProxies, p)
			}
		}
	}

	return cfg
}

func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

var weakSecrets = map[string]bool{
	"":                        true,
	"your-secret-key":         true,
	"your-refresh-secret-key": true,
}

// Validate fails fast in production so the server never runs with weak
// defaults (forgeable JWT tokens, empty DB password, or localhost URLs).
func (c *Config) Validate() error {
	if !c.IsProduction() {
		return nil
	}

	var problems []string

	if weakSecrets[c.JWTSecret] || len(c.JWTSecret) < 32 {
		problems = append(problems, "JWT_SECRET must be set to a random string of at least 32 characters")
	}
	if weakSecrets[c.JWTRefreshSecret] || len(c.JWTRefreshSecret) < 32 {
		problems = append(problems, "JWT_REFRESH_SECRET must be set to a random string of at least 32 characters")
	}
	if c.JWTSecret == c.JWTRefreshSecret {
		problems = append(problems, "JWT_SECRET and JWT_REFRESH_SECRET must be different")
	}
	if c.DBPassword == "" {
		problems = append(problems, "DB_PASSWORD must not be empty")
	}
	if strings.Contains(c.BaseURL, "localhost") || strings.Contains(c.FRONTEND_URL, "localhost") {
		problems = append(problems, "BASE_URL and FRONTEND_URL must use public addresses in production")
	}

	if len(problems) > 0 {
		return fmt.Errorf("insecure production configuration:\n  - %s", strings.Join(problems, "\n  - "))
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return fallback
}