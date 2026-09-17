package entities

import "time"

type AuditLog struct {
	ID        int       `json:"id" db:"id"`
	BranchID  int       `json:"branch_id" db:"branch_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	UserRole  string    `json:"user_role" db:"user_role"`
	Action    string    `json:"action" db:"action"`
	Entity    string    `json:"entity" db:"entity"`
	EntityID  int       `json:"entity_id" db:"entity_id"`
	Detail    string    `json:"detail" db:"detail"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}