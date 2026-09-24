package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	"be/internal/fcm"
	"be/internal/realtime"
	"be/internal/usecases"
	"be/pkg/response"
)

type POSHandler struct {
	orderUseCase   *usecases.OrderUseCase
	productUseCase *usecases.ProductUseCase
	branchUseCase  *usecases.BranchUseCase
	audit          *usecases.AuditUseCase
	hub            *realtime.Hub
	devices        repositories.DeviceRepository
	push           *fcm.Service
}

func NewPOSHandler(
	orderUseCase *usecases.OrderUseCase,
	productUseCase *usecases.ProductUseCase,
	branchUseCase *usecases.BranchUseCase,
	audit *usecases.AuditUseCase,
	hub *realtime.Hub,
	devices repositories.DeviceRepository,
	push *fcm.Service,
) *POSHandler {
	return &POSHandler{
		orderUseCase:   orderUseCase,
		productUseCase: productUseCase,
		branchUseCase:  branchUseCase,
		audit:          audit,
		hub:            hub,
		devices:        devices,
		push:           push,
	}
}

// RegisterDevice stores this device's FCM token for the logged-in user so the
// branch's staff receive push notifications for new orders.
func (h *POSHandler) RegisterDevice(c *gin.Context) {
	var req struct {
		Token    string `json:"token"`
		Platform string `json:"platform"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		response.BadRequest(c, "token is required")
		return
	}
	platform := strings.ToLower(strings.TrimSpace(req.Platform))
	if platform != "ios" && platform != "android" {
		platform = "android"
	}
	if err := h.devices.Upsert(getUserID(c), req.Token, platform); err != nil {
		response.InternalServerError(c, "failed to register device")
		return
	}
	response.Success(c, "device registered", nil)
}

func (h *POSHandler) UnregisterDevice(c *gin.Context) {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Token == "" {
		response.BadRequest(c, "token is required")
		return
	}
	if err := h.devices.Remove(req.Token); err != nil {
		response.InternalServerError(c, "failed to remove device")
		return
	}
	response.Success(c, "device removed", nil)
}

func (h *POSHandler) GetCurrentBranch(c *gin.Context) {
	branch, err := h.branchUseCase.GetByID(getBranchID(c))
	if err != nil {
		response.NotFound(c, "branch not found")
		return
	}
	response.Success(c, "branch retrieved", branch)
}

func (h *POSHandler) ListTodayOrders(c *gin.Context) {
	orders, err := h.orderUseCase.GetTodayOrders(getBranchID(c))
	if err != nil {
		response.InternalServerError(c, "failed to fetch orders")
		return
	}
	response.Success(c, "orders retrieved", orders)
}

func (h *POSHandler) ListProducts(c *gin.Context) {
	listProducts(c, h.productUseCase)
}

func (h *POSHandler) UpdateOrderStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req entities.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	order, err := h.orderUseCase.UpdateStatus(id, getBranchID(c), req.Status)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "status", "order", id, string(order.Status))
	h.hub.Publish(getBranchID(c), realtime.Event{Type: "order.status", OrderID: order.ID, OrderNumber: order.OrderNumber})
	response.Success(c, "order status updated", order)
}

func (h *POSHandler) PayOrder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req entities.PayOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	order, err := h.orderUseCase.Pay(id, getBranchID(c), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "pay", "order", id, order.OrderNumber)
	h.hub.Publish(getBranchID(c), realtime.Event{Type: "order.paid", OrderID: order.ID, OrderNumber: order.OrderNumber})
	response.Success(c, "payment processed successfully", order)
}

func (h *POSHandler) GetReceipt(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	branchID := getBranchID(c)
	branch, err := h.branchUseCase.GetByID(branchID)
	if err != nil {
		response.InternalServerError(c, "failed to load branch")
		return
	}

	// Check if client wants plain text format (for thermal printers)
	format := c.Query("format")
	if format == "text" {
		text, err := h.orderUseCase.ReceiptPlainText(id, branchID, branch)
		if err != nil {
			response.NotFound(c, err.Error())
			return
		}
		response.Success(c, "receipt ready", gin.H{"receipt": text, "format": "text"})
		return
	}

	// Default: structured data for flexible frontend rendering
	receipt, err := h.orderUseCase.Receipt(id, branchID, branch)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "receipt ready", receipt)
}

func (h *POSHandler) CreateDirectOrder(c *gin.Context) {
	var req entities.CreateDirectOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	order, err := h.orderUseCase.CreateDirect(getBranchID(c), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "create", "order", order.ID, order.OrderNumber)
	h.hub.Publish(getBranchID(c), realtime.Event{Type: "order.new", OrderID: order.ID, OrderNumber: order.OrderNumber})
	h.push.OrderCreated(getBranchID(c), order)
	response.Created(c, "direct order created successfully", order)
}

func (h *POSHandler) StreamEvents(c *gin.Context) {
	branchID := getEffectiveBranchID(c)
	ch, unsub := h.hub.Subscribe(branchID)
	defer unsub()
	streamSSE(c, ch, nil)
}
