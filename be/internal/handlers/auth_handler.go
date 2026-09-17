package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/usecases"
	"be/pkg/response"
)

type AuthHandler struct {
	authUseCase *usecases.AuthUseCase
	audit       *usecases.AuditUseCase
}

func NewAuthHandler(authUseCase *usecases.AuthUseCase, audit *usecases.AuditUseCase) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
		audit:       audit,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req entities.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	auth, err := h.authUseCase.Login(&req)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	logAudit(h.audit, c, "login", "user", auth.User.ID, auth.User.Email)
	response.Success(c, "login successful", auth)
}

func (h *AuthHandler) BootstrapStatus(c *gin.Context) {
	needed, err := h.authUseCase.BootstrapStatus()
	if err != nil {
		response.InternalServerError(c, "failed to check bootstrap status")
		return
	}
	response.Success(c, "bootstrap status retrieved", gin.H{"bootstrap_needed": needed})
}

func (h *AuthHandler) Bootstrap(c *gin.Context) {
	var req entities.BootstrapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	auth, err := h.authUseCase.Bootstrap(&req)
	if err != nil {
		if err.Error() == "first user already created" || err.Error() == "email already registered" {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, "super admin created", auth)
	logAudit(h.audit, c, "bootstrap", "user", auth.User.ID, auth.User.Email)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req entities.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	auth, err := h.authUseCase.Refresh(req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, err.Error())
		return
	}

	response.Success(c, "token refreshed successfully", auth)
}
