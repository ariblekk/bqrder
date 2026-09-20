package entities

import "time"

type Product struct {
	ID            int        `json:"id" db:"id"`
	BranchID      int        `json:"branch_id" db:"branch_id"`
	CategoryID    int        `json:"category_id" db:"category_id"`
	Name          string     `json:"name" db:"name"`
	Description   string     `json:"description" db:"description"`
	Price         float64    `json:"price" db:"price"`
	Stock         int        `json:"stock" db:"stock"`
	IsUnlimited   bool       `json:"is_unlimited" db:"is_unlimited"`
	ImageURL      string     `json:"image_url" db:"image_url"`
	IsActive      bool       `json:"is_active" db:"is_active"`
	IsFeatured    bool       `json:"is_featured" db:"is_featured"`
	FeaturedOrder int        `json:"featured_order" db:"featured_order"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`

	CategoryName string         `json:"category_name,omitempty" db:"category_name"`
	Variants     []ProductVariant `json:"variants,omitempty" db:"-"`
	Options      []ProductOption  `json:"options,omitempty" db:"-"`
}

type ProductVariant struct {
	ID        int     `json:"id" db:"id"`
	ProductID int     `json:"product_id" db:"product_id"`
	Name      string  `json:"name" db:"name"`
	Price     float64 `json:"price" db:"price"`
	SortOrder int     `json:"sort_order" db:"sort_order"`
}

type ProductOption struct {
	ID        int     `json:"id" db:"id"`
	ProductID int     `json:"product_id" db:"product_id"`
	Name      string  `json:"name" db:"name"`
	Price     float64 `json:"price" db:"price"`
	SortOrder int     `json:"sort_order" db:"sort_order"`
}

type VariantInput struct {
	Name      string  `json:"name" binding:"required,min=1,max=100"`
	Price     float64 `json:"price" binding:"required,gt=0"`
	SortOrder int     `json:"sort_order"`
}

type OptionInput struct {
	Name      string  `json:"name" binding:"required,min=1,max=100"`
	Price     float64 `json:"price" binding:"min=0"`
	SortOrder int     `json:"sort_order"`
}

type CreateProductRequest struct {
	CategoryID   int           `json:"category_id" binding:"required"`
	Name         string        `json:"name" binding:"required,min=2,max=200"`
	Description  string        `json:"description"`
	Price        float64       `json:"price" binding:"required,gt=0"`
	Stock        int           `json:"stock" binding:"min=0"`
	IsUnlimited  *bool         `json:"is_unlimited"`
	IsActive     *bool         `json:"is_active"`
	IsFeatured   *bool         `json:"is_featured"`
	FeaturedOrder *int         `json:"featured_order"`
	Variants     []VariantInput `json:"variants"`
	Options      []OptionInput  `json:"options"`
}

type UpdateProductRequest struct {
	CategoryID    int           `json:"category_id"`
	Name          string        `json:"name"`
	Description   string        `json:"description"`
	Price         float64       `json:"price"`
	Stock         *int          `json:"stock"`
	IsUnlimited   *bool         `json:"is_unlimited"`
	IsActive      *bool         `json:"is_active"`
	IsFeatured    *bool         `json:"is_featured"`
	FeaturedOrder *int          `json:"featured_order"`
	Variants      []VariantInput `json:"variants"`
	Options       []OptionInput  `json:"options"`
}

type MenuProduct struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Price         float64 `json:"price"`
	Stock         int     `json:"stock"`
	IsUnlimited   bool    `json:"is_unlimited"`
	ImageURL      string  `json:"image_url"`
	IsFeatured    bool    `json:"is_featured"`
	FeaturedOrder int     `json:"featured_order"`
	Variants      []ProductVariant `json:"variants"`
	Options       []ProductOption  `json:"options"`
	TotalSold     int     `json:"total_sold"`
	TotalRevenue  float64 `json:"total_revenue"`
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
