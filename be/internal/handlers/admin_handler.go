package handlers

import (
	"fmt"
	"log"
	"strconv"

	"github.com/gin-gonic/gin"

	"be/internal/domain/entities"
	"be/internal/usecases"
	"be/pkg/response"
	"be/pkg/utils"
)

type AdminHandler struct {
	branchUseCase   *usecases.BranchUseCase
	tableUseCase    *usecases.TableUseCase
	categoryUseCase *usecases.CategoryUseCase
	productUseCase  *usecases.ProductUseCase
	reportUseCase   *usecases.ReportUseCase
	audit           *usecases.AuditUseCase
}

func NewAdminHandler(
	branchUseCase *usecases.BranchUseCase,
	tableUseCase *usecases.TableUseCase,
	categoryUseCase *usecases.CategoryUseCase,
	productUseCase *usecases.ProductUseCase,
	reportUseCase *usecases.ReportUseCase,
	audit *usecases.AuditUseCase,
) *AdminHandler {
	return &AdminHandler{
		branchUseCase:   branchUseCase,
		tableUseCase:    tableUseCase,
		categoryUseCase: categoryUseCase,
		productUseCase:  productUseCase,
		reportUseCase:   reportUseCase,
		audit:           audit,
	}
}

// ---------- Branch Management (Super Admin) ----------

func (h *AdminHandler) ListBranches(c *gin.Context) {
	if getRole(c) != "super_admin" {
		response.Forbidden(c, "only super_admin can access branches")
		return
	}

	branches, err := h.branchUseCase.GetAll()
	if err != nil {
		response.InternalServerError(c, "failed to fetch branches")
		return
	}
	response.Success(c, "branches retrieved", branches)
}

func (h *AdminHandler) CreateBranch(c *gin.Context) {
	if getRole(c) != "super_admin" {
		response.Forbidden(c, "only super_admin can create branches")
		return
	}

	var req entities.CreateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	branch, err := h.branchUseCase.Create(&req)
	if err != nil {
		log.Printf("create branch failed: %v", err)
		response.InternalServerError(c, "failed to create branch")
		return
	}
	logAudit(h.audit, c, "create", "branch", branch.ID, branch.Name)
	response.Created(c, "branch created successfully", branch)
}

func (h *AdminHandler) UpdateBranch(c *gin.Context) {
	if getRole(c) != "super_admin" {
		response.Forbidden(c, "only super_admin can update branches")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid branch id")
		return
	}

	var req entities.UpdateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	branch, err := h.branchUseCase.Update(id, &req)
	if err != nil {
		log.Printf("update branch failed: %v", err)
		response.InternalServerError(c, "failed to update branch")
		return
	}
	logAudit(h.audit, c, "update", "branch", id, branch.Name)
	response.Success(c, "branch updated successfully", branch)
}

func (h *AdminHandler) GetCurrentBranch(c *gin.Context) {
	branch, err := h.branchUseCase.GetByID(getEffectiveBranchID(c))
	if err != nil {
		response.NotFound(c, "branch not found")
		return
	}
	response.Success(c, "branch retrieved", branch)
}

// ---------- User Management ----------

func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req entities.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	role := getRole(c)
	if role == "super_admin" {
		if req.Role == entities.RoleSuperAdmin {
			response.BadRequest(c, "cannot create super_admin account")
			return
		}
		if req.BranchID == 0 {
			response.BadRequest(c, "branch_id is required for non-super-admin users")
			return
		}
	} else if role == "branch_admin" {
		if req.BranchID != getBranchID(c) {
			response.Forbidden(c, "cannot create user for another branch")
			return
		}
		if req.Role != entities.RoleCashier {
			response.Forbidden(c, "branch_admin can only create cashier accounts")
			return
		}
	} else {
		response.Forbidden(c, "insufficient permissions")
		return
	}

	user, err := h.branchUseCase.CreateUser(&req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "create", "user", user.ID, req.Email)
	response.Created(c, "user created successfully", gin.H{
		"id":        user.ID,
		"branch_id": user.BranchID,
		"name":      user.Name,
		"email":     user.Email,
		"role":      user.Role,
	})
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.branchUseCase.ListUsers()
	if err != nil {
		response.InternalServerError(c, "failed to fetch users")
		return
	}

	role := getRole(c)
	result := []gin.H{}
	for _, u := range users {
		if role == "branch_admin" && u.BranchID != getBranchID(c) {
			continue
		}
		result = append(result, gin.H{
			"id":        u.ID,
			"branch_id": u.BranchID,
			"name":      u.Name,
			"email":     u.Email,
			"role":      u.Role,
			"is_active": u.IsActive,
		})
	}

	response.Success(c, "users retrieved", result)
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	var req entities.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	role := getRole(c)
	if role == "branch_admin" {
		target, err := h.branchUseCase.GetUserByID(id)
		if err != nil {
			response.NotFound(c, "user not found")
			return
		}
		if target.BranchID != getBranchID(c) {
			response.Forbidden(c, "cannot update user from another branch")
			return
		}
		if req.Role != entities.RoleCashier {
			response.Forbidden(c, "branch_admin can only update cashier accounts")
			return
		}
	}

	user, err := h.branchUseCase.UpdateUser(id, &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "update", "user", id, req.Email)
	response.Success(c, "user updated successfully", gin.H{
		"id":        user.ID,
		"branch_id": user.BranchID,
		"name":      user.Name,
		"email":     user.Email,
		"role":      user.Role,
	})
}

// ---------- Table Management ----------

func (h *AdminHandler) ListTables(c *gin.Context) {
	tables, err := h.tableUseCase.GetAll(getEffectiveBranchID(c))
	if err != nil {
		response.InternalServerError(c, "failed to fetch tables")
		return
	}
	response.Success(c, "tables retrieved", tables)
}

func (h *AdminHandler) CreateTable(c *gin.Context) {
	var req entities.CreateTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	table, err := h.tableUseCase.Create(getEffectiveBranchID(c), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, "table created successfully", table)
}

func (h *AdminHandler) UpdateTable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid table id")
		return
	}

	var req entities.UpdateTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	table, err := h.tableUseCase.Update(id, getEffectiveBranchID(c), &req)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "table updated successfully", table)
}

func (h *AdminHandler) DeleteTable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid table id")
		return
	}

	if err := h.tableUseCase.Delete(id, getEffectiveBranchID(c)); err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "table deleted successfully", nil)
}

func (h *AdminHandler) GetTableQR(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid table id")
		return
	}

	qr, err := h.tableUseCase.GetQR(id, getEffectiveBranchID(c))
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "QR link generated", qr)
}

// ---------- Category Management ----------

func (h *AdminHandler) ListCategories(c *gin.Context) {
	categories, err := h.categoryUseCase.GetAll(getEffectiveBranchID(c))
	if err != nil {
		response.InternalServerError(c, "failed to fetch categories")
		return
	}
	response.Success(c, "categories retrieved", categories)
}

func (h *AdminHandler) CreateCategory(c *gin.Context) {
	var req entities.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	category, err := h.categoryUseCase.Create(getEffectiveBranchID(c), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Created(c, "category created successfully", category)
}

func (h *AdminHandler) UpdateCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid category id")
		return
	}

	var req entities.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	category, err := h.categoryUseCase.Update(id, getEffectiveBranchID(c), &req)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "category updated successfully", category)
}

func (h *AdminHandler) DeleteCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid category id")
		return
	}

	if err := h.categoryUseCase.Delete(id, getEffectiveBranchID(c)); err != nil {
		response.NotFound(c, err.Error())
		return
	}
	response.Success(c, "category deleted successfully", nil)
}

// ---------- Product Management ----------

func (h *AdminHandler) ListProducts(c *gin.Context) {
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

func (h *AdminHandler) CreateProduct(c *gin.Context) {
	var req entities.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body: "+err.Error())
		return
	}

	product, err := h.productUseCase.Create(getEffectiveBranchID(c), &req)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "create", "product", product.ID, product.Name)
	response.Created(c, "product created successfully", product)
}

func (h *AdminHandler) UpdateProduct(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}

	var req entities.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request body")
		return
	}

	product, err := h.productUseCase.Update(id, getEffectiveBranchID(c), &req)
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}
	logAudit(h.audit, c, "update", "product", id, fmt.Sprintf("%s stock=%d", product.Name, product.Stock))
	response.Success(c, "product updated successfully", product)
}

func (h *AdminHandler) UploadProductImage(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid product id")
		return
	}

	fileHeader, err := c.FormFile("image")
	if err != nil {
		response.BadRequest(c, "image file is required")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		response.InternalServerError(c, "failed to open uploaded file")
		return
	}
	defer file.Close()

	upload := &usecases.UploadedFile{
		Filename:    fileHeader.Filename,
		Size:        fileHeader.Size,
		ContentType: fileHeader.Header.Get("Content-Type"),
		Reader:      file,
	}

	product, err := h.productUseCase.UploadImage(id, getEffectiveBranchID(c), upload)
	if err != nil {
		if err.Error() == "product not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}
	logAudit(h.audit, c, "update", "product", id, "image")
	response.Success(c, "image uploaded successfully", product)
}

// ---------- Reports ----------

func (h *AdminHandler) GetSalesReport(c *gin.Context) {
	period := c.DefaultQuery("period", "daily")

	if period == "daily" || period == "monthly" {
		summary, err := h.reportUseCase.GetSalesSummary(getEffectiveBranchID(c), period)
		if err != nil {
			response.BadRequest(c, err.Error())
			return
		}
		response.Success(c, "sales report retrieved", summary)
		return
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	report, err := h.reportUseCase.GetSalesReport(getEffectiveBranchID(c), period, startDate, endDate)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, "sales report retrieved", report)
}

func (h *AdminHandler) GetDailySales(c *gin.Context) {
	date := c.DefaultQuery("date", "")
	if date == "" {
		summary, err := h.reportUseCase.GetSalesSummary(getEffectiveBranchID(c), "daily")
		if err != nil {
			log.Printf("daily sales summary failed: %v", err)
			response.InternalServerError(c, "failed to retrieve daily sales")
			return
		}
		response.Success(c, "daily sales retrieved", summary)
		return
	}

	summary, err := h.reportUseCase.GetDailySales(getEffectiveBranchID(c), date)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.Success(c, "daily sales retrieved", summary)
}
