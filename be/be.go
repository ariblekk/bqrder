package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/gin-gonic/gin"

	"be/config"
	"be/internal/database"
	"be/internal/routes"
	"be/pkg/logger"
)

func main() {
	cfg := config.Load()

	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	loc, err := time.LoadLocation(cfg.AppTimezone)
	if err != nil {
		log.Fatalf("Invalid APP_TIMEZONE %q: %v", cfg.AppTimezone, err)
	}
	time.Local = loc
	logger.Info("Application timezone: %s", loc)
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
		logger.EnableDebug(false)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := database.EnsureSchema(db); err != nil {
		log.Fatalf("Failed to ensure schema: %v", err)
	}

	uploadDir := cfg.UploadPath + "/products"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		logger.Error("failed to create upload directory: %v", err)
	} else {
		logger.Info("Upload directory ready: %s", uploadDir)
	}

	router := routes.SetupRouter(db, cfg)
	router.MaxMultipartMemory = 8 << 20 // 8 MB

	srv := &http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		host, _ := os.Hostname()
		logger.Info("Server running on %s (port %s, env %s)", host, cfg.ServerPort, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Success("Server exited gracefully")
}