package usecases

import (
	"fmt"

	"be/config"
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	"be/pkg/utils"
)

type TableUseCase struct {
	tableRepo repositories.TableRepository
	cfg       *config.Config
}

func NewTableUseCase(
	tableRepo repositories.TableRepository,
	cfg *config.Config,
) *TableUseCase {
	return &TableUseCase{
		tableRepo: tableRepo,
		cfg:       cfg,
	}
}

func (u *TableUseCase) Create(branchID int, req *entities.CreateTableRequest) (*entities.TableDetailResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	token, err := utils.GenerateQRToken()
	if err != nil {
		return nil, err
	}

	table := &entities.Table{
		BranchID:    branchID,
		TableNumber: req.TableNumber,
		QRToken:     token,
		Capacity:    req.Capacity,
		IsActive:    isActive,
	}

	id, err := u.tableRepo.Create(table)
	if err != nil {
		return nil, err
	}

	created, err := u.tableRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	return u.toDetailResponse(created), nil
}

func (u *TableUseCase) GetAll(branchID int) ([]entities.TableDetailResponse, error) {
	tables, err := u.tableRepo.ListByBranch(branchID)
	if err != nil {
		return nil, err
	}

	result := make([]entities.TableDetailResponse, 0, len(tables))
	for _, t := range tables {
		result = append(result, *u.toDetailResponse(&t))
	}
	return result, nil
}

func (u *TableUseCase) GetByID(id, branchID int) (*entities.TableDetailResponse, error) {
	table, err := u.tableRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}
	return u.toDetailResponse(table), nil
}

func (u *TableUseCase) Update(id, branchID int, req *entities.UpdateTableRequest) (*entities.TableDetailResponse, error) {
	table, err := u.tableRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	if req.TableNumber != "" {
		table.TableNumber = req.TableNumber
	}
	if req.Capacity > 0 {
		table.Capacity = req.Capacity
	}
	if req.IsActive != nil {
		table.IsActive = *req.IsActive
	}

	if err := u.tableRepo.Update(table); err != nil {
		return nil, err
	}

	updated, err := u.tableRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	return u.toDetailResponse(updated), nil
}

func (u *TableUseCase) Delete(id, branchID int) error {
	if _, err := u.tableRepo.FindByIDAndBranch(id, branchID); err != nil {
		return err
	}
	return u.tableRepo.Delete(id)
}

func (u *TableUseCase) GetQR(id, branchID int) (map[string]string, error) {
	table, err := u.tableRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"table_id":     fmt.Sprintf("%d", table.ID),
		"table_number": table.TableNumber,
		"qr_token":     table.QRToken,
		"qr_link":      u.cfg.FRONTEND_URL + "/menu?qr=" + table.QRToken,
	}, nil
}

func (u *TableUseCase) toDetailResponse(t *entities.Table) *entities.TableDetailResponse {
	return &entities.TableDetailResponse{
		ID:          t.ID,
		BranchID:    t.BranchID,
		TableNumber: t.TableNumber,
		QRToken:     t.QRToken,
		QRLink:      u.cfg.FRONTEND_URL + "/menu?qr=" + t.QRToken,
		Capacity:    t.Capacity,
		IsActive:    t.IsActive,
	}
}
