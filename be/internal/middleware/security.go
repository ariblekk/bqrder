package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"be/pkg/response"
)

// ---------- Rate limiting ----------

type rateEntry struct {
	count int
	reset time.Time
}

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string]*rateEntry
	limit  int
	window time.Duration
	lastGC time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		hits:   make(map[string]*rateEntry),
		limit:  limit,
		window: window,
		lastGC: time.Now(),
	}
}

func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()

	rl.mu.Lock()
	defer rl.mu.Unlock()

	if now.Sub(rl.lastGC) > rl.window {
		for k, e := range rl.hits {
			if now.After(e.reset) {
				delete(rl.hits, k)
			}
		}
		rl.lastGC = now
	}

	entry, ok := rl.hits[key]
	if !ok || now.After(entry.reset) {
		rl.hits[key] = &rateEntry{count: 1, reset: now.Add(rl.window)}
		return true
	}

	entry.count++
	return entry.count <= rl.limit
}

// RateLimit allows at most `limit` requests per client IP within `window`.
// Intended for abuse-prone endpoints: login (brute force) and public writes.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	rl := newRateLimiter(limit, window)
	return func(c *gin.Context) {
		if !rl.allow(c.ClientIP()) {
			response.Error(c, http.StatusTooManyRequests, "too many requests, please try again later")
			c.Abort()
			return
		}
		c.Next()
	}
}

// ---------- Security headers ----------

func SecurityHeaders(production bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cross-Origin-Resource-Policy", "same-site")
		if production {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// ---------- Request body size limit ----------

// MaxBodySize caps the total request body size to protect against memory
// exhaustion. Multipart uploads are checked separately and are well below this.
func MaxBodySize(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		}
		c.Next()
	}
}