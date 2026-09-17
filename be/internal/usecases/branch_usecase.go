package usecases

import (
	"errors"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	"be/pkg/utils"
)

type BranchUseCase struct {
	branchRepo repositories.BranchRepository
	userRepo   repositories.UserRepository
}

func NewBranchUseCase(
	branchRepo repositories.BranchRepository,
	userRepo repositories.UserRepository,
) *BranchUseCase {
	return &BranchUseCase{
		branchRepo: branchRepo,
		userRepo:   userRepo,
	}
}

func (u *BranchUseCase) Create(req *entities.CreateBranchRequest) (*entities.Branch, error) {
	branch := &entities.Branch{
		Name:    req.Name,
		Address: req.Address,
		Phone:   req.Phone,
	}
	branch.IsActive = true

	id, err := u.branchRepo.Create(branch)
	if err != nil {
		return nil, err
	}

	return u.branchRepo.FindByID(id)
}

func (u *BranchUseCase) GetAll() ([]entities.Branch, error) {
	return u.branchRepo.List()
}

func (u *BranchUseCase) GetByID(id int) (*entities.Branch, error) {
	return u.branchRepo.FindByID(id)
}

func (u *BranchUseCase) Update(id int, req *entities.UpdateBranchRequest) (*entities.Branch, error) {
	branch, err := u.branchRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		branch.Name = req.Name
	}
	if req.Address != "" {
		branch.Address = req.Address
	}
	if req.Phone != "" {
		branch.Phone = req.Phone
	}
	if req.IsActive != nil {
		branch.IsActive = *req.IsActive
	}

	if err := u.branchRepo.Update(branch); err != nil {
		return nil, err
	}

	return u.branchRepo.FindByID(id)
}

func (u *BranchUseCase) CreateUser(req *entities.CreateUserRequest) (*entities.User, error) {
	if !req.Role.IsValid() {
		return nil, errors.New("invalid role, must be one of: super_admin, branch_admin, cashier")
	}

	if req.Role == entities.RoleSuperAdmin {
		return nil, errors.New("cannot create super_admin account")
	}

	if _, err := u.branchRepo.FindByID(req.BranchID); err != nil {
		return nil, errors.New("branch not found")
	}

	if _, err := u.userRepo.FindByEmail(req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &entities.User{
		BranchID:     req.BranchID,
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         req.Role,
	}

	id, err := u.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	return u.userRepo.FindByID(id)
}

func (u *BranchUseCase) ListUsers() ([]entities.User, error) {
	return u.userRepo.ListAll()
}

func (u *BranchUseCase) GetUserByID(id int) (*entities.User, error) {
	return u.userRepo.FindByID(id)
}

func (u *BranchUseCase) UpdateUser(id int, req *entities.UpdateUserRequest) (*entities.User, error) {
	if !req.Role.IsValid() {
		return nil, errors.New("invalid role, must be one of: super_admin, branch_admin, cashier")
	}
	if req.Role == entities.RoleSuperAdmin {
		return nil, errors.New("cannot assign super_admin role")
	}

	user, err := u.userRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if existing, err := u.userRepo.FindByEmail(req.Email); err == nil && existing.ID != user.ID {
		return nil, errors.New("email already registered")
	}

	user.Name = req.Name
	user.Email = req.Email
	user.Role = req.Role
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Password != "" {
		if len(req.Password) < 8 {
			return nil, errors.New("password must be at least 8 characters")
		}
		passwordHash, err := utils.HashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = passwordHash
	}

	if err := u.userRepo.Update(user); err != nil {
		return nil, err
	}
	return u.userRepo.FindByID(id)
}
