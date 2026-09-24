package logger

import (
	"log"
	"sync/atomic"
)

var debugEnabled atomic.Bool

func init() {
	debugEnabled.Store(true)
}

// EnableDebug toggles Debug output. Call once at startup; production should
// pass false so debug logs never reach the output.
func EnableDebug(enabled bool) {
	debugEnabled.Store(enabled)
}

func Debug(format string, args ...any) {
	if debugEnabled.Load() {
		log.Printf("[DEBUG] "+format, args...)
	}
}

func Info(format string, args ...any) {
	log.Printf("[INFO] "+format, args...)
}

func Success(format string, args ...any) {
	log.Printf("[SUCCESS] "+format, args...)
}

func Error(format string, args ...any) {
	log.Printf("[ERROR] "+format, args...)
}