package routes

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/gin-contrib/cors"

	"be/config"
	"be/internal/domain/repositories"
	"be/internal/fcm"
	"be/internal/handlers"
	"be/internal/middleware"
	"be/internal/realtime"
	"be/internal/repositories/postgres"
	"be/internal/usecases"
	bqrjwt "be/pkg/jwt"
)

func SetupRouter(db *sql.DB, cfg *config.Config) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.SecurityHeaders(cfg.IsProduction()))
	router.Use(middleware.MaxBodySize(6 << 20)) // 6 MB, below 5 MB upload limit + form overhead

	// Only trust X-Forwarded-For when explicit proxies are configured, so
	// clients cannot spoof their IP to bypass rate limiting.
	if len(cfg.TrustedProxies) > 0 {
		_ = router.SetTrustedProxies(cfg.TrustedProxies)
	} else {
		_ = router.SetTrustedProxies(nil)
	}

	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: false,
	}))

	// ---- Repositories ----
	store := postgres.NewStore(db, cfg.AppTimezone)
	userRepo := postgres.NewUserRepo(db)
	branchRepo := postgres.NewBranchRepo(db)
	tableRepo := postgres.NewTableRepo(db)
	categoryRepo := postgres.NewCategoryRepo(db)
	productRepo := postgres.NewProductRepo(db)
	orderRepo := postgres.NewOrderRepo(db, cfg.AppTimezone)
	auditRepo := postgres.NewAuditRepo(db)
	deviceRepo := postgres.NewDeviceRepo(db)

	// ---- JWT ----
	jwtManager := bqrjwt.NewJWTManager(
		cfg.JWTSecret,
		cfg.JWTRefreshSecret,
		cfg.JWTExpiryHours,
		cfg.JWTRefreshDays,
	)

	// ---- Use Cases ----
	authUseCase := usecases.NewAuthUseCase(userRepo, branchRepo, jwtManager, cfg)
	branchUseCase := usecases.NewBranchUseCase(branchRepo, userRepo)
	tableUseCase := usecases.NewTableUseCase(tableRepo, cfg)
	categoryUseCase := usecases.NewCategoryUseCase(categoryRepo)
	productUseCase := usecases.NewProductUseCase(productRepo, categoryRepo, cfg)
	orderUseCase := usecases.NewOrderUseCase(orderRepo, productRepo, tableRepo, store)
	reportUseCase := usecases.NewReportUseCase(orderRepo)
	auditUseCase := usecases.NewAuditUseCase(auditRepo)

	publicUseCase := usecases.NewPublicUseCase(categoryRepo, productRepo, tableRepo, branchRepo, orderUseCase, cfg.FRONTEND_URL)

	// ---- Handlers ----
	hub := realtime.NewHub()
	pushService := buildPushService(cfg, deviceRepo)
	authHandler := handlers.NewAuthHandler(authUseCase, auditUseCase)
	adminHandler := handlers.NewAdminHandler(branchUseCase, tableUseCase, categoryUseCase, productUseCase, reportUseCase, auditUseCase)
	posHandler := handlers.NewPOSHandler(orderUseCase, productUseCase, branchUseCase, auditUseCase, hub, deviceRepo, pushService)
	publicHandler := handlers.NewPublicHandler(publicUseCase, hub, pushService)

	api := router.Group("/api/v1")

	// ---------- Auth ----------
	auth := api.Group("/auth")
	{
		auth.GET("/bootstrap", authHandler.BootstrapStatus)
		auth.POST("/bootstrap", middleware.RateLimit(10, time.Minute), authHandler.Bootstrap)
		auth.POST("/login", middleware.RateLimit(10, time.Minute), authHandler.Login)
		auth.POST("/refresh", middleware.RateLimit(30, time.Minute), authHandler.Refresh)
	}

	// ---------- Public (No Auth) ----------
	public := api.Group("/public")
	{
		public.GET("/table/:qr_token", publicHandler.ValidateTable)
		public.GET("/menu", publicHandler.GetMenu)
		public.POST("/orders", middleware.RateLimit(20, time.Minute), publicHandler.CreateOrder)
		public.GET("/orders/:order_number", publicHandler.GetOrderStatus)
		public.GET("/orders/:order_number/events", publicHandler.StreamOrderEvents)
	}

	// ---------- Admin (Super Admin + Branch Admin) ----------
	admin := api.Group("/admin")
	admin.Use(middleware.Auth(jwtManager))
	admin.Use(middleware.RequireAdmin())
	{
		admin.GET("/tables", adminHandler.ListTables)
		admin.POST("/tables", adminHandler.CreateTable)
		admin.PUT("/tables/:id", adminHandler.UpdateTable)
		admin.DELETE("/tables/:id", adminHandler.DeleteTable)
		admin.GET("/tables/:id/qr", adminHandler.GetTableQR)

		admin.GET("/categories", adminHandler.ListCategories)
		admin.POST("/categories", adminHandler.CreateCategory)
		admin.PUT("/categories/:id", adminHandler.UpdateCategory)
		admin.DELETE("/categories/:id", adminHandler.DeleteCategory)

		admin.GET("/products", adminHandler.ListProducts)
		admin.POST("/products", adminHandler.CreateProduct)
		admin.PUT("/products/:id", adminHandler.UpdateProduct)
		admin.POST("/products/:id/image", adminHandler.UploadProductImage)

		admin.GET("/reports/sales", adminHandler.GetSalesReport)
		admin.GET("/reports/sales/daily", adminHandler.GetDailySales)

		admin.POST("/users", adminHandler.CreateUser)
		admin.GET("/users", adminHandler.ListUsers)
		admin.PUT("/users/:id", adminHandler.UpdateUser)

		admin.GET("/branches", adminHandler.ListBranches)
		admin.GET("/branch", adminHandler.GetCurrentBranch)
		admin.POST("/branches", adminHandler.CreateBranch)
		admin.PUT("/branches/:id", adminHandler.UpdateBranch)
	}

	// ---------- POS (Admin + Cashier) ----------
	pos := api.Group("/pos")
	pos.Use(middleware.Auth(jwtManager))
	pos.Use(middleware.RequireRoles("super_admin", "branch_admin", "cashier"))
	{
		pos.GET("/events", posHandler.StreamEvents)
		pos.GET("/branch", posHandler.GetCurrentBranch)
		pos.GET("/orders", posHandler.ListTodayOrders)
		pos.GET("/products", posHandler.ListProducts)
		pos.PUT("/orders/:id/status", posHandler.UpdateOrderStatus)
		pos.POST("/orders/:id/pay", posHandler.PayOrder)
		pos.GET("/orders/:id/receipt", posHandler.GetReceipt)
		pos.POST("/orders/direct", posHandler.CreateDirectOrder)
		pos.POST("/devices", posHandler.RegisterDevice)
		pos.DELETE("/devices", posHandler.UnregisterDevice)
	}

	// Serve uploaded static files
	router.Static("/uploads", cfg.UploadPath)

	// Health check
	api.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"success": false,
				"message": "database unavailable",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "server is running",
		})
	})

	router.NoRoute(middleware.NotFoundHandler())

	return router
}

// buildPushService assembles the FCM push service. When push is not configured
// (FCM_CREDENTIALS empty) it returns a no-op service so the server runs fine
// without Firebase.
func buildPushService(cfg *config.Config, devices repositories.DeviceRepository) *fcm.Service {
	if cfg.FCMCredentials == "" {
		return fcm.NewService(devices, nil)
	}
	value := strings.TrimSpace(cfg.FCMCredentials)
	raw := []byte(value)
	// A path to the service account file, or the JSON content itself.
	if !strings.HasPrefix(value, "{") {
		b, err := os.ReadFile(value)
		if err != nil {
			log.Printf("[WARN] FCM_CREDENTIALS looks like a file path but cannot be read, push disabled: %v", err)
			return fcm.NewService(devices, nil)
		}
		raw = b
	}
	push, err := fcm.New(raw, func(format string, args ...any) {
		log.Printf("[FCM] "+format, args...)
	})
	if err != nil {
		// A broken notification credential must not take down the POS.
		log.Printf("[WARN] Invalid FCM_CREDENTIALS, push disabled: %v", err)
		return fcm.NewService(devices, nil)
	}
	log.Println("FCM push enabled")
	return fcm.NewService(devices, push)
}
