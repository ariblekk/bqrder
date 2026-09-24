package repositories

import (
	"context"
	"errors"

	"be/internal/domain/entities"
)

var (
	ErrNotFound          = errors.New("record not found")
	ErrAlreadyPaid       = errors.New("order already paid")
	ErrStatusConflict    = errors.New("order status changed by another request")
	ErrInsufficientStock = errors.New("insufficient stock")
)

type UserRepository interface {
	Create(user *entities.User) (int, error)
	FindByID(id int) (*entities.User, error)
	FindByEmail(email string) (*entities.User, error)
	ListAll() ([]entities.User, error)
	Update(user *entities.User) error
}

type BranchRepository interface {
	Create(branch *entities.Branch) (int, error)
	FindByID(id int) (*entities.Branch, error)
	List() ([]entities.Branch, error)
	Update(branch *entities.Branch) error
}

type TableRepository interface {
	Create(table *entities.Table) (int, error)
	FindByID(id int) (*entities.Table, error)
	FindByIDAndBranch(id, branchID int) (*entities.Table, error)
	FindByQRToken(token string) (*entities.Table, error)
	ListByBranch(branchID int) ([]entities.Table, error)
	Update(table *entities.Table) error
	Delete(id int) error
}

type CategoryRepository interface {
	Create(category *entities.Category) (int, error)
	FindByID(id int) (*entities.Category, error)
	FindByIDAndBranch(id, branchID int) (*entities.Category, error)
	ListByBranch(branchID int) ([]entities.Category, error)
	Update(category *entities.Category) error
	Delete(id int) error
}

type ProductRepository interface {
	Create(product *entities.Product) (int, error)
	FindByID(id int) (*entities.Product, error)
	FindByIDAndBranch(id, branchID int) (*entities.Product, error)
	ListByBranch(branchID int, limit, offset int) ([]entities.Product, error)
	CountByBranch(branchID int) (int, error)
	ListActiveByBranch(branchID int) ([]entities.Product, error)
	ListFeaturedByBranch(branchID int) ([]entities.Product, error)
	SalesStatsByBranch(branchID int) (map[int]entities.ProductSales, error)
	Update(product *entities.Product) error
	UpdateImage(id int, imageURL string) error
	DecreaseStock(productID, quantity int) error
	// Variants
	ListVariants(productIDs []int) (map[int][]entities.ProductVariant, error)
	ReplaceVariants(productID int, variants []entities.ProductVariant) error
	// Options
	ListOptions(productIDs []int) (map[int][]entities.ProductOption, error)
	ReplaceOptions(productID int, options []entities.ProductOption) error
}

type AuditRepository interface {
	Create(entry *entities.AuditLog) error
}

type DeviceRepository interface {
	Upsert(userID int, token, platform string) error
	Remove(token string) error
	TokensByBranch(branchID int) ([]string, error)
}

type OrderRepository interface {
	Create(order *entities.Order) (int, error)
	CreateOrderItem(item *entities.OrderItem) (int, error)
	CreateOrderItemOptions(itemID int, optionIDs []int) error
	FindByIDAndBranch(id, branchID int) (*entities.Order, error)
	FindByOrderNumber(number string) (*entities.Order, error)
	ListTodayByBranch(branchID int) ([]entities.Order, error)
	UpdateStatus(id int, fromStatus, toStatus entities.OrderStatus) error
	UpdatePayment(id int, paymentStatus entities.PaymentStatus, paymentMethod string) error
	NextOrderSeq(branchID int, date string) (int, error)
	GetOrderItems(orderID int) ([]entities.OrderItem, error)
	GetOrderItemsBatch(orderIDs []int) (map[int][]entities.OrderItem, error)
	GetSalesSummary(branchID int, period string) (*entities.SalesSummary, error)
	GetDailySales(branchID int, date string) (*entities.SalesSummary, error)
	GetSalesReport(branchID int, startDate, endDate string) (*entities.SalesReport, error)
}

// UnitOfWork groups transaction-scoped repository access.
// Implementations must return repositories bound to the same transaction so
// that all writes commit or roll back together.
type UnitOfWork interface {
	Commit() error
	Rollback() error
	OrderRepo() OrderRepository
	ProductRepo() ProductRepository
}

// TxBeginner starts a transaction; the resulting UnitOfWork provides
// transaction-bound repositories for atomic operations.
type TxBeginner interface {
	Begin(ctx context.Context) (UnitOfWork, error)
}
