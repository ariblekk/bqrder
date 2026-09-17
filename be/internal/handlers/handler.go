package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/middleware"
	"be/internal/usecases"
)

func getRole(c *gin.Context) string {
	if val, ok := c.Get(middleware.ContextUserRole); ok {
		if role, ok := val.(string); ok {
			return role
		}
	}
	return ""
}

func getBranchID(c *gin.Context) int {
	if val, ok := c.Get(middleware.ContextBranchID); ok {
		if id, ok := val.(int); ok {
			return id
		}
	}
	return 0
}

func getUserID(c *gin.Context) int {
	if val, ok := c.Get(middleware.ContextUserID); ok {
		if id, ok := val.(int); ok {
			return id
		}
	}
	return 0
}

func logAudit(a *usecases.AuditUseCase, c *gin.Context, action, entity string, entityID int, detail string) {
	if a == nil {
		return
	}
	a.Log(getBranchID(c), getUserID(c), getRole(c), action, entity, entityID, detail)
}

// getEffectiveBranchID returns the active branch scope for the current request.
// For super_admin, it allows overriding via ?branch_id= query param.
// For branch_admin and cashier, the branch is forced from the JWT.
// If a super_admin provides an invalid branch_id, it falls back to the JWT branch.
func getEffectiveBranchID(c *gin.Context) int {
	role := getRole(c)
	fromToken := getBranchID(c)

	if role == string(entities.RoleSuperAdmin) {
		q := c.Query("branch_id")
		if q != "" {
			if id, err := strconv.Atoi(q); err == nil && id > 0 {
				return id
			}
		}
	}

	return fromToken
}
