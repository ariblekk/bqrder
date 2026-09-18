package handlers

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/realtime"
	"be/internal/usecases"
	"be/pkg/response"
	"be/pkg/utils"
)

type POSHandler struct {
	orderUseCase   *usecases.OrderUseCase
	productUseCase *usecases.ProductUseCase
	branchUseCase  *usecases.BranchUseCase
	audit          *usecases.AuditUseCase
	hub            *realtime.Hub
}

func NewPOSHandler(
	orderUseCase *usecases.OrderUseCase,
	productUseCase *usecases.ProductUseCase,
	branchUseCase *usecases.BranchUseCase,
	audit *usecases.AuditUseCase,
	hub *realtime.Hub,
) *POSHandler {
	return &POSHandler{
		orderUseCase:   orderUseCase,
		productUseCase: productUseCase,
		branchUseCase:  branchUseCase,
		audit:          audit,
		hub:            hub,
	}
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	page, limit = utils.ParsePagination(page, limit)

	products, total, err := h.productUseCase.GetAll(getEffectiveBranchID(c), page, limit)
	if err != nil {
		response.InternalServerError(c, "failed to fetch products")
		return
	}
	response.Paginated(c, "products retrieved", products, int64(total), page, limit)
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

	receipt, err := h.orderUseCase.Receipt(id, branchID, branch)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "receipt ready", gin.H{"receipt": receipt})
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
	response.Created(c, "direct order created successfully", order)
}

func (h *POSHandler) StreamEvents(c *gin.Context) {
	branchID := getBranchID(c)
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeader(200)

	ch, unsub := h.hub.Subscribe(branchID)
	defer unsub()

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
