package jwt

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func newManager() *JWTManager {
	return NewJWTManager("s3cret-access", "s3cret-refresh", 24, 7)
}

func TestAccessTokenRoundTrip(t *testing.T) {
	m := newManager()
	tok, err := m.GenerateAccessToken(TokenPayload{UserID: 7, Role: "cashier", BranchID: 3})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}

	claims, err := m.ValidateAccessToken(tok)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if claims.UserID != 7 || claims.Role != "cashier" || claims.BranchID != 3 {
		t.Fatalf("claims mismatch: %+v", claims)
	}
}

func TestValidateAccessTokenWrongSecret(t *testing.T) {
	issuer := newManager()
	validator := NewJWTManager("other-secret", "s3cret-refresh", 24, 7)
	tok, _ := issuer.GenerateAccessToken(TokenPayload{UserID: 1})
	if _, err := validator.ValidateAccessToken(tok); err == nil {
		t.Fatal("expected error for wrong secret")
	}
}

func TestValidateAccessTokenRejectsRefreshToken(t *testing.T) {
	m := newManager()
	refresh, _ := m.GenerateRefreshToken(TokenPayload{UserID: 1})
	if _, err := m.ValidateAccessToken(refresh); err == nil {
		t.Fatal("refresh token must not validate as access token")
	}
}

func TestValidateAccessTokenExpired(t *testing.T) {
	expired := &Claims{
		UserID: 5,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			Subject:   "access_token",
		},
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, expired).SignedString([]byte("s3cret-access"))
	if err != nil {
		t.Fatalf("sign expired token: %v", err)
	}

	m := newManager()
	if _, err := m.ValidateAccessToken(tok); err == nil {
		t.Fatal("expired token must fail")
	}
}
