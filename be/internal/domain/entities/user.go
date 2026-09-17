package entities

import "time"

type Role string

const (
	RoleSuperAdmin  Role = "super_admin"
	RoleBranchAdmin Role = "branch_admin"
	RoleCashier     Role = "cashier"
)

func (r Role) IsValid() bool {
	switch r {
	case RoleSuperAdmin, RoleBranchAdmin, RoleCashier:
		return true
	}
	return false
}

type User struct {
	ID           int       `json:"id" db:"id"`
	BranchID     int       `json:"branch_id" db:"branch_id"`
	Name         string    `json:"name" db:"name"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         Role      `json:"role" db:"role"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type CreateUserRequest struct {
	BranchID int    `json:"branch_id" binding:"required"`
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     Role   `json:"role" binding:"required"`
}

type UpdateUserRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password,omitempty"`
	Role     Role   `json:"role" binding:"required"`
	IsActive *bool  `json:"is_active"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
	TokenType    string  `json:"token_type"`
	ExpiresIn    int     `json:"expires_in"`
	User         UserDTO `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type BootstrapRequest struct {
	Name     string               `json:"name" binding:"required,min=2,max=100"`
	Email    string               `json:"email" binding:"required,email"`
	Password string               `json:"password" binding:"required,min=8"`
	Branch   CreateBranchRequest  `json:"branch" binding:"required"`
}

type UserDTO struct {
	ID       int    `json:"id"`
	BranchID int    `json:"branch_id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     Role   `json:"role"`
}
