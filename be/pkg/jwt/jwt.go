package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPayload struct {
	UserID   int    `json:"user_id"`
	Role     string `json:"role"`
	BranchID int    `json:"branch_id"`
}

type Claims struct {
	UserID   int    `json:"user_id"`
	Role     string `json:"role"`
	BranchID int    `json:"branch_id"`
	jwt.RegisteredClaims
}

type JWTManager struct {
	secret        []byte
	refreshSecret []byte
	expiryHours   int
	refreshDays   int
}

func NewJWTManager(secret, refreshSecret string, expiryHours, refreshDays int) *JWTManager {
	return &JWTManager{
		secret:        []byte(secret),
		refreshSecret: []byte(refreshSecret),
		expiryHours:   expiryHours,
		refreshDays:   refreshDays,
	}
}

func (j *JWTManager) GenerateAccessToken(payload TokenPayload) (string, error) {
	claims := Claims{
		UserID:   payload.UserID,
		Role:     payload.Role,
		BranchID: payload.BranchID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(j.expiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   "access_token",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

func (j *JWTManager) GenerateRefreshToken(payload TokenPayload) (string, error) {
	claims := Claims{
		UserID:   payload.UserID,
		Role:     payload.Role,
		BranchID: payload.BranchID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(j.refreshDays) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   "refresh_token",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.refreshSecret)
}

func (j *JWTManager) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return j.secret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	if claims.Subject != "access_token" {
		return nil, errors.New("invalid token subject")
	}

	return claims, nil
}

func (j *JWTManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return j.refreshSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	if claims.Subject != "refresh_token" {
		return nil, errors.New("invalid token subject")
	}

	return claims, nil
}
