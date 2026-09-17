package postgres

import (
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type AuditRepo struct {
	q Querier
}

func NewAuditRepo(q Querier) repositories.AuditRepository {
	return &AuditRepo{q: q}
}

func (r *AuditRepo) Create(entry *entities.AuditLog) error {
	_, err := r.q.Exec(`
		INSERT INTO audit_logs (branch_id, user_id, user_role, action, entity, entity_id, detail)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, entry.BranchID, entry.UserID, entry.UserRole, entry.Action,
		entry.Entity, entry.EntityID, entry.Detail)
	return err
}