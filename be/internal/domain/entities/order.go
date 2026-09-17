package entities

import "time"

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusCompleted  OrderStatus = "completed"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

type PaymentStatus string

const (
	PaymentStatusUnpaid   PaymentStatus = "unpaid"
	PaymentStatusPaid     PaymentStatus = "paid"
	PaymentStatusRefunded PaymentStatus = "refunded"
)

type PaymentMethod string

const (
	PaymentMethodCash    PaymentMethod = "cash"
	PaymentMethodGateway PaymentMethod = "gateway"
)

func (s OrderStatus) IsValid() bool {
	switch s {
	case OrderStatusPending, OrderStatusProcessing, OrderStatusCompleted, OrderStatusCancelled:
		return true
	}
	return false
}

type Order struct {
	ID            int           `json:"id" db:"id"`
	BranchID      int           `json:"branch_id" db:"branch_id"`
	OrderNumber   string        `json:"order_number" db:"order_number"`
	TableID       *int          `json:"table_id" db:"table_id"`
	TableNumber   string        `json:"table_number" db:"table_number"`
	CustomerName  string        `json:"customer_name" db:"customer_name"`
	TotalAmount   float64       `json:"total_amount" db:"total_amount"`
	Status        OrderStatus   `json:"status" db:"status"`
	PaymentStatus PaymentStatus `json:"payment_status" db:"payment_status"`
	PaymentMethod *string       `json:"payment_method" db:"payment_method"`
	CreatedAt     time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at" db:"updated_at"`

	Items []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID        int     `json:"id" db:"id"`
	OrderID   int     `json:"order_id" db:"order_id"`
	ProductID int     `json:"product_id" db:"product_id"`
	Quantity  int     `json:"quantity" db:"quantity"`
	Price     float64 `json:"price" db:"price"`
	Notes     string  `json:"notes" db:"notes"`

	ProductName string  `json:"product_name,omitempty" db:"product_name"`
	Subtotal    float64 `json:"subtotal" db:"subtotal"`
}

type CreateOrderRequest struct {
	TableID      *int                   `json:"table_id"`
	CustomerName string                 `json:"customer_name"`
	Items        []CreateOrderItemInput `json:"items" binding:"required,min=1,dive"`
}

type CreateOrderItemInput struct {
	ProductID int    `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
	Notes     string `json:"notes"`
}

type CreateDirectOrderRequest struct {
	TableID      *int                   `json:"table_id"`
	CustomerName string                 `json:"customer_name" binding:"required"`
	Items        []CreateOrderItemInput `json:"items" binding:"required,min=1,dive"`
	Pay          bool                   `json:"pay"`
}

type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" binding:"required"`
}

type PayOrderRequest struct {
	PaymentMethod string  `json:"payment_method"`
	AmountPaid    float64 `json:"amount_paid"`
}
