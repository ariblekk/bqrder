package handlers

import (
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"

	"be/internal/realtime"
)

// streamSSE writes an event-stream response for ch, dropping events filter
// rejects. Shared by the POS branch stream and the public single-order stream.
func streamSSE(c *gin.Context, ch <-chan realtime.Event, filter func(realtime.Event) bool) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(200)

	write := func(s string) bool {
		if _, err := c.Writer.WriteString(s); err != nil {
			return false
		}
		c.Writer.Flush()
		return true
	}

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case ev := <-ch:
			if filter != nil && !filter(ev) {
				continue
			}
			b, _ := json.Marshal(ev)
			if !write("data: " + string(b) + "\n\n") {
				return
			}
		case <-heartbeat.C:
			if !write(": ping\n\n") {
				return
			}
		}
	}
}