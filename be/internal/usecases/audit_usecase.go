package usecases

import (
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type AuditUseCase struct {
	repo repositories.AuditRepository
}

func NewAuditUseCase(repo repositories.AuditRepository) *AuditUseCase {
	return &AuditUseCase{repo: repo}
}

func (u *AuditUseCase) Log(branchID, userID int, role, action, entity string, entityID int, detail string) {
	_ = u.repo.Create(&entities.AuditLog{
		BranchID: branchID,
		UserID:   userID,
		UserRole: role,
		Action:   action,
		Entity:   entity,
		EntityID: entityID,
		Detail:   detail,
	})
}