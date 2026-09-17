package usecases

import (
	"testing"

	"be/config"
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	bqrjwt "be/pkg/jwt"
	"be/pkg/utils"
)

type fakeUserRepo struct {
	byEmail map[string]*entities.User
	byID    map[int]*entities.User
}

func (f *fakeUserRepo) Create(user *entities.User) (int, error) { return 0, nil }
func (f *fakeUserRepo) FindByID(id int) (*entities.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return u, nil
}
func (f *fakeUserRepo) FindByEmail(email string) (*entities.User, error) {
	u, ok := f.byEmail[email]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return u, nil
}
func (f *fakeUserRepo) ListAll() ([]entities.User, error) { return nil, nil }
func (f *fakeUserRepo) Update(user *entities.User) error  { return nil }

type fakeBranchRepo struct {
	byID map[int]*entities.Branch
}

func (f *fakeBranchRepo) Create(branch *entities.Branch) (int, error) { return 0, nil }
func (f *fakeBranchRepo) FindByID(id int) (*entities.Branch, error) {
	b, ok := f.byID[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return b, nil
}
func (f *fakeBranchRepo) List() ([]entities.Branch, error)     { return nil, nil }
func (f *fakeBranchRepo) Update(branch *entities.Branch) error { return nil }

func newAuthUseCase(users map[string]*entities.User, inactiveBranch bool) *AuthUseCase {
	hash, _ := utils.HashPassword("secret123")
	byEmail := make(map[string]*entities.User, len(users))
	byID := make(map[int]*entities.User, len(users))
	for email, u := range users {
		u.PasswordHash = hash
		byEmail[email] = u
		byID[u.ID] = u
	}
	branch := &entities.Branch{ID: 1, Name: "HQ", IsActive: !inactiveBranch}
	return NewAuthUseCase(
		&fakeUserRepo{byEmail: byEmail, byID: byID},
		&fakeBranchRepo{byID: map[int]*entities.Branch{1: branch}},
		bqrjwt.NewJWTManager("secret", "refresh", 24, 7),
		&config.Config{JWTExpiryHours: 24},
	)
}

func TestLoginSuccess(t *testing.T) {
	uc := newAuthUseCase(map[string]*entities.User{
		"admin@test.com": {ID: 1, BranchID: 1, Name: "Admin", Email: "admin@test.com", Role: entities.RoleCashier},
	}, false)

	resp, err := uc.Login(&entities.LoginRequest{Email: "admin@test.com", Password: "secret123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Fatal("expected tokens")
	}
	if resp.User.ID != 1 || resp.User.Role != entities.RoleCashier {
		t.Fatalf("user mismatch: %+v", resp.User)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	uc := newAuthUseCase(map[string]*entities.User{
		"admin@test.com": {ID: 1, BranchID: 1, Email: "admin@test.com", Role: entities.RoleCashier},
	}, false)

	if _, err := uc.Login(&entities.LoginRequest{Email: "admin@test.com", Password: "wrong"}); err == nil {
		t.Fatal("wrong password must fail")
	}
}

func TestLoginUnknownEmail(t *testing.T) {
	uc := newAuthUseCase(nil, false)
	if _, err := uc.Login(&entities.LoginRequest{Email: "nobody@test.com", Password: "secret123"}); err == nil {
		t.Fatal("unknown email must fail")
	}
}

func TestLoginInactiveBranch(t *testing.T) {
	uc := newAuthUseCase(map[string]*entities.User{
		"admin@test.com": {ID: 1, BranchID: 1, Email: "admin@test.com", Role: entities.RoleCashier},
	}, true)

	if _, err := uc.Login(&entities.LoginRequest{Email: "admin@test.com", Password: "secret123"}); err == nil {
		t.Fatal("inactive branch must fail")
	}
}

func TestRefreshBadToken(t *testing.T) {
	uc := newAuthUseCase(nil, false)
	if _, err := uc.Refresh("garbage"); err == nil {
		t.Fatal("garbage refresh token must fail")
	}
}

type bootUserRepo struct {
	byID map[int]*entities.User
	next int
}

func (f *bootUserRepo) Create(user *entities.User) (int, error) {
	f.next++
	user.ID = f.next
	f.byID[user.ID] = user
	return user.ID, nil
}
func (f *bootUserRepo) FindByID(id int) (*entities.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return u, nil
}
func (f *bootUserRepo) FindByEmail(email string) (*entities.User, error) {
	for _, u := range f.byID {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, repositories.ErrNotFound
}
func (f *bootUserRepo) ListAll() ([]entities.User, error) {
	out := []entities.User{}
	for _, u := range f.byID {
		out = append(out, *u)
	}
	return out, nil
}
func (f *bootUserRepo) Update(*entities.User) error { return nil }

type bootBranchRepo struct {
	byID map[int]*entities.Branch
	next int
}

func (f *bootBranchRepo) Create(b *entities.Branch) (int, error) {
	f.next++
	b.ID = f.next
	f.byID[b.ID] = b
	return b.ID, nil
}
func (f *bootBranchRepo) FindByID(id int) (*entities.Branch, error) {
	b, ok := f.byID[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return b, nil
}
func (f *bootBranchRepo) List() ([]entities.Branch, error) {
	out := []entities.Branch{}
	for _, b := range f.byID {
		out = append(out, *b)
	}
	return out, nil
}
func (f *bootBranchRepo) Update(*entities.Branch) error { return nil }

func newBootUseCase(u *bootUserRepo, b *bootBranchRepo) *AuthUseCase {
	return NewAuthUseCase(
		u,
		b,
		bqrjwt.NewJWTManager("secret", "refresh", 24, 7),
		&config.Config{JWTExpiryHours: 24},
	)
}

func TestBootstrapStatus(t *testing.T) {
	uc := newBootUseCase(
		&bootUserRepo{byID: map[int]*entities.User{}},
		&bootBranchRepo{byID: map[int]*entities.Branch{}},
	)
	if needed, _ := uc.BootstrapStatus(); !needed {
		t.Fatal("empty db must need bootstrap")
	}
	uc.userRepo.(*bootUserRepo).byID[1] = &entities.User{ID: 1, Email: "a@b.c"}
	if needed, _ := uc.BootstrapStatus(); needed {
		t.Fatal("existing user must not need bootstrap")
	}
}

func TestBootstrapCreatesSuperAdminAndBranch(t *testing.T) {
	u := &bootUserRepo{byID: map[int]*entities.User{}}
	b := &bootBranchRepo{byID: map[int]*entities.Branch{}}
	uc := newBootUseCase(u, b)

	resp, err := uc.Bootstrap(&entities.BootstrapRequest{
		Name: "Owner", Email: "owner@test.com", Password: "password123",
		Branch: entities.CreateBranchRequest{Name: "Kafe Melati", Address: "Jl. Melati", Phone: "0812"},
	})
	if err != nil {
		t.Fatalf("bootstrap: %v", err)
	}
	if resp.User.Role != entities.RoleSuperAdmin {
		t.Fatalf("expected super_admin, got %s", resp.User.Role)
	}
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Fatal("expected tokens")
	}
	if len(b.byID) != 1 || len(u.byID) != 1 {
		t.Fatalf("expected 1 branch & 1 user, got %d & %d", len(b.byID), len(u.byID))
	}
	if b.byID[1].Name != "Kafe Melati" || b.byID[1].Address != "Jl. Melati" {
		t.Fatalf("branch must use user-provided values, got %+v", b.byID[1])
	}
}

func TestBootstrapRejectsWhenUserExists(t *testing.T) {
	uc := newBootUseCase(
		&bootUserRepo{byID: map[int]*entities.User{1: {ID: 1, Email: "a@b.c"}}},
		&bootBranchRepo{byID: map[int]*entities.Branch{}},
	)
	if _, err := uc.Bootstrap(&entities.BootstrapRequest{Name: "Owner", Email: "x@y.z", Password: "password123"}); err == nil {
		t.Fatal("bootstrap must reject when a user already exists")
	}
}
