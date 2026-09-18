package handlers

import (
	"errors"
	"log"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	"be/internal/realtime"
	"be/internal/usecases"
	"be/pkg/response"
)

type PublicHandler struct {
	publicUseCase *usecases.PublicUseCase
	hub           *realtime.Hub
}

func NewPublicHandler(publicUseCase *usecases.PublicUseCase, hub *realtime.Hub) *PublicHandler {
	return &PublicHandler{
		publicUseCase: publicUseCase,
		hub:           hub,
	}
}

func (h *PublicHandler) ValidateTable(c *gin.Context) {
	token := c.Param("qr_token")
	if token == "" {
		response.BadRequest(c, "qr_token is required")
		return
	}

	table, err := h.publicUseCase.ValidateTable(token)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "table validated", table)
}

func (h *PublicHandler) GetMenu(c *gin.Context) {
	token := c.Query("qr_token")

	if token == "" {
		response.BadRequest(c, "qr_token query parameter is required")
		return
	}

	menu, err := h.publicUseCase.GetMenuByTable(token)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "menu retrieved", menu)
}

func (h *PublicHandler) CreateOrder(c *gin.Context) {
	token := c.Query("qr_token")
	if token == "" {
		response.BadRequest(c, "qr_token query parameter is required")
		return
	}

	table, err := h.publicUseCase.ValidateTable(token)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	var req entities.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	tableID := table.ID
	req.TableID = &tableID

	order, err := h.publicUseCase.CreateOrder(table.BranchID, &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	h.hub.Publish(order.BranchID, realtime.Event{Type: "order.new", OrderID: order.ID, OrderNumber: order.OrderNumber})
	response.Created(c, "order created successfully", order)
}

func (h *PublicHandler) GetOrderStatus(c *gin.Context) {
	orderNumber := c.Param("order_number")
	if orderNumber == "" {
		response.BadRequest(c, "order_number is required")
		return
	}

	order, err := h.publicUseCase.GetOrderStatus(orderNumber)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			response.NotFound(c, "order not found")
			return
		}
		log.Printf("get order status failed: %v", err)
		response.InternalServerError(c, "failed to retrieve order status")
		return
	}
	response.Success(c, "order status retrieved", order)
}
