package entities

import "time"

type Product struct {
	ID          int       `json:"id" db:"id"`
	BranchID    int       `json:"branch_id" db:"branch_id"`
	CategoryID  int       `json:"category_id" db:"category_id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Price       float64   `json:"price" db:"price"`
	Stock       int       `json:"stock" db:"stock"`
	ImageURL    string    `json:"image_url" db:"image_url"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`

	CategoryName string           `json:"category_name,omitempty" db:"category_name"`
	Variants     []ProductVariant `json:"variants" db:"-"`
	Options      []ProductOption  `json:"options" db:"-"`
}

type ProductVariant struct {
	ID        int     `json:"id" db:"id"`
	ProductID int     `json:"product_id" db:"product_id"`
	Name      string  `json:"name" db:"name"`
	Price     float64 `json:"price" db:"price"`
}

type ProductOption struct {
	ID        int     `json:"id" db:"id"`
	ProductID int     `json:"product_id" db:"product_id"`
	Name      string  `json:"name" db:"name"`
	Price     float64 `json:"price" db:"price"`
}

type VariantInput struct {
	Name  string  `json:"name" binding:"required,min=1,max=100"`
	Price float64 `json:"price" binding:"required,gt=0"`
}

type OptionInput struct {
	Name  string  `json:"name" binding:"required,min=1,max=100"`
	Price float64 `json:"price" binding:"required,min=0"`
}

type CreateProductRequest struct {
	CategoryID  int            `json:"category_id" binding:"required"`
	Name        string         `json:"name" binding:"required,min=2,max=200"`
	Description string         `json:"description"`
	Price       float64        `json:"price" binding:"required,gt=0"`
	Stock       int            `json:"stock" binding:"required,min=0"`
	IsActive    *bool          `json:"is_active"`
	Variants    []VariantInput `json:"variants"`
	Options     []OptionInput  `json:"options"`
}

type UpdateProductRequest struct {
	CategoryID  int            `json:"category_id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Price       float64        `json:"price"`
	Stock       int            `json:"stock"`
	IsActive    *bool          `json:"is_active"`
	Variants    []VariantInput `json:"variants"`
	Options     []OptionInput  `json:"options"`
}

type MenuProduct struct {
	ID           int              `json:"id"`
	Name         string           `json:"name"`
	Description  string           `json:"description"`
	Price        float64          `json:"price"`
	Stock        int              `json:"stock"`
	ImageURL     string           `json:"image_url"`
	Variants     []ProductVariant `json:"variants"`
	Options      []ProductOption  `json:"options"`
	TotalSold    int              `json:"total_sold"`
	TotalRevenue float64          `json:"total_revenue"`
}

type ProductSales struct {
	TotalSold    int     `json:"total_sold"`
	TotalRevenue float64 `json:"total_revenue"`
}

type MenuCategory struct {
	ID          int           `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Products    []MenuProduct `json:"products"`
}
