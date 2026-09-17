package config

import "testing"

func TestValidateProductionFailsOnWeakSecrets(t *testing.T) {
	cfg := &Config{
		AppEnv:           "production",
		JWTSecret:        "your-secret-key",
		JWTRefreshSecret: "your-refresh-secret-key",
		DBPassword:       "x",
		BaseURL:          "https://api.example.com",
		FRONTEND_URL:     "https://example.com",
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected weak secrets to be rejected in production")
	}
}

func TestValidateProductionPassesWithStrongConfig(t *testing.T) {
	cfg := &Config{
		AppEnv:           "production",
		JWTSecret:        "0123456789abcdef0123456789abcdef01",
		JWTRefreshSecret: "0123456789abcdef0123456789abcdef02",
		DBPassword:       "secret",
		BaseURL:          "https://api.example.com",
		FRONTEND_URL:     "https://example.com",
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid config to pass, got: %v", err)
	}
}