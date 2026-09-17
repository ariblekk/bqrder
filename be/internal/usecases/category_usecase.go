package usecases

import (
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type CategoryUseCase struct {
	categoryRepo repositories.CategoryRepository
}

func NewCategoryUseCase(
	categoryRepo repositories.CategoryRepository,
) *CategoryUseCase {
	return &CategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

func (u *CategoryUseCase) Create(branchID int, req *entities.CreateCategoryRequest) (*entities.Category, error) {
	category := &entities.Category{
		BranchID:    branchID,
		Name:        req.Name,
		Description: req.Description,
	}

	id, err := u.categoryRepo.Create(category)
	if err != nil {
		return nil, err
	}

	return u.categoryRepo.FindByID(id)
}

func (u *CategoryUseCase) GetAll(branchID int) ([]entities.Category, error) {
	return u.categoryRepo.ListByBranch(branchID)
}

func (u *CategoryUseCase) GetByID(id, branchID int) (*entities.Category, error) {
	return u.categoryRepo.FindByIDAndBranch(id, branchID)
}

func (u *CategoryUseCase) Update(id, branchID int, req *entities.UpdateCategoryRequest) (*entities.Category, error) {
	category, err := u.categoryRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Description != "" {
		category.Description = req.Description
	}

	if err := u.categoryRepo.Update(category); err != nil {
		return nil, err
	}

	return u.categoryRepo.FindByID(id)
}

func (u *CategoryUseCase) Delete(id, branchID int) error {
	if _, err := u.categoryRepo.FindByIDAndBranch(id, branchID); err != nil {
		return err
	}
	return u.categoryRepo.Delete(id)
}
