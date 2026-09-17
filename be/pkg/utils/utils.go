package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateQRToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func GenerateOrderNumberWithSeq(seq int) string {
	now := time.Now()
	dateStr := now.Format("20060102")
	return fmt.Sprintf("ORD-%s-%03d", dateStr, seq)
}

func RoundFloat(val float64, precision int) float64 {
	output := math.Pow(10, float64(precision))
	return math.Round(val*output) / output
}

// ParsePagination normalizes page/limit query params: page >= 1, limit in [1,100].
func ParsePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

func PaginationOffset(page, limit int) int {
	return (page - 1) * limit
}
