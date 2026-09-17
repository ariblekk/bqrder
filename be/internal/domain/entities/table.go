package entities

import "time"

type Table struct {
	ID          int       `json:"id" db:"id"`
	BranchID    int       `json:"branch_id" db:"branch_id"`
	TableNumber string    `json:"table_number" db:"table_number"`
	QRToken     string    `json:"qr_token" db:"qr_token"`
	Capacity    int       `json:"capacity" db:"capacity"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type CreateTableRequest struct {
	TableNumber string `json:"table_number" binding:"required"`
	Capacity    int    `json:"capacity" binding:"required,min=1"`
	IsActive    *bool  `json:"is_active"`
}

type UpdateTableRequest struct {
	TableNumber string `json:"table_number"`
	Capacity    int    `json:"capacity"`
	IsActive    *bool  `json:"is_active"`
}

type TableDetailResponse struct {
	ID          int    `json:"id"`
	BranchID    int    `json:"branch_id"`
	TableNumber string `json:"table_number"`
	QRToken     string `json:"qr_token"`
	QRLink      string `json:"qr_link"`
	Capacity    int    `json:"capacity"`
	IsActive    bool   `json:"is_active"`
}
