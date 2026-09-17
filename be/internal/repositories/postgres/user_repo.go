package postgres

import (
	"database/sql"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type UserRepo struct {
	q Querier
}

func NewUserRepo(q Querier) repositories.UserRepository {
	return &UserRepo{q: q}
}

func (r *UserRepo) Create(user *entities.User) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO users (branch_id, name, email, password_hash, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, user.BranchID, user.Name, user.Email, user.PasswordHash, user.Role).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *UserRepo) FindByID(id int) (*entities.User, error) {
	var u entities.User
	err := r.q.QueryRow(`
		SELECT id, branch_id, name, email, password_hash, role, is_active, created_at
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.BranchID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive, &u.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) FindByEmail(email string) (*entities.User, error) {
	var u entities.User
	err := r.q.QueryRow(`
		SELECT id, branch_id, name, email, password_hash, role, is_active, created_at
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.BranchID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive, &u.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) ListAll() ([]entities.User, error) {
	rows, err := r.q.Query(`
		SELECT id, branch_id, name, email, role, is_active, created_at
		FROM users
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []entities.User{}
	for rows.Next() {
		var u entities.User
		if err := rows.Scan(&u.ID, &u.BranchID, &u.Name, &u.Email, &u.Role, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepo) Update(user *entities.User) error {
	_, err := r.q.Exec(`
		UPDATE users SET branch_id = $1, name = $2, email = $3, role = $4, password_hash = $5, is_active = $6
		WHERE id = $7
	`, user.BranchID, user.Name, user.Email, user.Role, user.PasswordHash, user.IsActive, user.ID)
	return err
}

type BranchRepo struct {
	q Querier
}

func NewBranchRepo(q Querier) repositories.BranchRepository {
	return &BranchRepo{q: q}
}

func (r *BranchRepo) Create(branch *entities.Branch) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO branches (name, address, phone, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, branch.Name, branch.Address, branch.Phone, branch.IsActive).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *BranchRepo) FindByID(id int) (*entities.Branch, error) {
	var b entities.Branch
	err := r.q.QueryRow(`
		SELECT id, name, address, phone, is_active, created_at
		FROM branches WHERE id = $1
	`, id).Scan(&b.ID, &b.Name, &b.Address, &b.Phone, &b.IsActive, &b.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *BranchRepo) List() ([]entities.Branch, error) {
	rows, err := r.q.Query(`
		SELECT id, name, address, phone, is_active, created_at
		FROM branches ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	branches := []entities.Branch{}
	for rows.Next() {
		var b entities.Branch
		if err := rows.Scan(&b.ID, &b.Name, &b.Address, &b.Phone, &b.IsActive, &b.CreatedAt); err != nil {
			return nil, err
		}
		branches = append(branches, b)
	}
	return branches, rows.Err()
}

func (r *BranchRepo) Update(branch *entities.Branch) error {
	_, err := r.q.Exec(`
		UPDATE branches SET name = $1, address = $2, phone = $3, is_active = $4
		WHERE id = $5
	`, branch.Name, branch.Address, branch.Phone, branch.IsActive, branch.ID)
	return err
}
