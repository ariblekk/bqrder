package routes

import (
	"testing"

	"be/config"
)

func TestSetupRouterRegistersEventRoutes(t *testing.T) {
	cfg := config.Load()
	cfg.UploadPath = t.TempDir()
	router := SetupRouter(nil, cfg)

	found := map[string]bool{}
	for _, r := range router.Routes() {
		found[r.Path] = true
	}
	for _, p := range []string{
		"/api/v1/pos/events",
		"/api/v1/public/orders/:order_number",
		"/api/v1/public/orders/:order_number/events",
	} {
		if !found[p] {
			t.Fatalf("route %s not registered", p)
		}
	}
}
