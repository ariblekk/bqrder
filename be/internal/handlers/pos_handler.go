package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/usecases"
	"be/pkg/response"
	"be/pkg/utils"
)

type POSHandler struct {
	orderUseCase   *usecases.OrderUseCase
	productUseCase *usecases.ProductUseCase
	branchUseCase  *usecases.BranchUseCase
	audit          *usecases.AuditUseCase
}

func NewPOSHandler(
	orderUseCase *usecases.OrderUseCase,
	productUseCase *usecases.ProductUseCase,
	branchUseCase *usecases.BranchUseCase,
	audit *usecases.AuditUseCase,
) *POSHandler {
	return &POSHandler{
		orderUseCase:   orderUseCase,
		productUseCase: productUseCase,
		branchUseCase:  branchUseCase,
		audit:          audit,
	}
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
	response.Created(c, "direct order created successfully", order)
}
