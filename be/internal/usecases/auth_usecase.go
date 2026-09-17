package usecases

import (
	"errors"

	"be/config"
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	bqrjwt "be/pkg/jwt"
	"be/pkg/utils"
)

type AuthUseCase struct {
	userRepo   repositories.UserRepository
	branchRepo repositories.BranchRepository
	jwtManager *bqrjwt.JWTManager
	cfg        *config.Config
}

func NewAuthUseCase(
	userRepo repositories.UserRepository,
	branchRepo repositories.BranchRepository,
	jwtManager *bqrjwt.JWTManager,
	cfg *config.Config,
) *AuthUseCase {
	return &AuthUseCase{
		userRepo:   userRepo,
		branchRepo: branchRepo,
		jwtManager: jwtManager,
		cfg:        cfg,
	}
}

func (u *AuthUseCase) Login(req *entities.LoginRequest) (*entities.AuthResponse, error) {
	user, err := u.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	branch, err := u.branchRepo.FindByID(user.BranchID)
	if err != nil {
		return nil, errors.New("branch not found")
	}

	if !branch.IsActive {
		return nil, errors.New("branch is inactive")
	}

	return u.authResponse(user)
}

func (u *AuthUseCase) BootstrapStatus() (bool, error) {
	users, err := u.userRepo.ListAll()
	if err != nil {
		return false, err
	}
	return len(users) == 0, nil
}

func (u *AuthUseCase) Bootstrap(req *entities.BootstrapRequest) (*entities.AuthResponse, error) {
	users, err := u.userRepo.ListAll()
	if err != nil {
		return nil, err
	}
	if len(users) > 0 {
		return nil, errors.New("first user already created")
	}

	if _, err := u.userRepo.FindByEmail(req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	branches, err := u.branchRepo.List()
	if err != nil {
		return nil, err
	}
	var branchID int
	if len(branches) == 0 {
		branchID, err = u.branchRepo.Create(&entities.Branch{
			Name:     req.Branch.Name,
			Address:  req.Branch.Address,
			Phone:    req.Branch.Phone,
			IsActive: true,
		})
		if err != nil {
			return nil, err
		}
	} else {
		branchID = branches[0].ID
	}

	user := &entities.User{
		BranchID:     branchID,
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         entities.RoleSuperAdmin,
		IsActive:     true,
	}

	id, err := u.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	created, err := u.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	return u.authResponse(created)
}

func (u *AuthUseCase) authResponse(user *entities.User) (*entities.AuthResponse, error) {
	payload := bqrjwt.TokenPayload{
		UserID:   user.ID,
		Role:     string(user.Role),
		BranchID: user.BranchID,
	}

	accessToken, err := u.jwtManager.GenerateAccessToken(payload)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := u.jwtManager.GenerateRefreshToken(payload)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &entities.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    u.cfg.JWTExpiryHours * 3600,
		User: entities.UserDTO{
			ID:       user.ID,
			BranchID: user.BranchID,
			Name:     user.Name,
			Email:    user.Email,
			Role:     user.Role,
		},
	}, nil
}

func (u *AuthUseCase) Refresh(refreshToken string) (*entities.AuthResponse, error) {
	claims, err := u.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	user, err := u.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	branch, err := u.branchRepo.FindByID(user.BranchID)
	if err != nil {
		return nil, errors.New("branch not found")
	}

	if !branch.IsActive {
		return nil, errors.New("branch is inactive")
	}

	return u.authResponse(user)
}
