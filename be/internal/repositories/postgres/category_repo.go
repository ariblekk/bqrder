package postgres

import (
	"database/sql"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type CategoryRepo struct {
	q Querier
}

func NewCategoryRepo(q Querier) repositories.CategoryRepository {
	return &CategoryRepo{q: q}
}

func (r *CategoryRepo) Create(category *entities.Category) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO categories (branch_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id
	`, category.BranchID, category.Name, category.Description).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *CategoryRepo) FindByID(id int) (*entities.Category, error) {
	var c entities.Category
	err := r.q.QueryRow(`
		SELECT id, branch_id, name, description, created_at
		FROM categories WHERE id = $1
	`, id).Scan(&c.ID, &c.BranchID, &c.Name, &c.Description, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *CategoryRepo) FindByIDAndBranch(id, branchID int) (*entities.Category, error) {
	var c entities.Category
	err := r.q.QueryRow(`
		SELECT id, branch_id, name, description, created_at
		FROM categories WHERE id = $1 AND branch_id = $2
	`, id, branchID).Scan(&c.ID, &c.BranchID, &c.Name, &c.Description, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *CategoryRepo) ListByBranch(branchID int) ([]entities.Category, error) {
	rows, err := r.q.Query(`
		SELECT id, branch_id, name, description, created_at
		FROM categories WHERE branch_id = $1 ORDER BY name
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := []entities.Category{}
	for rows.Next() {
		var c entities.Category
		if err := rows.Scan(&c.ID, &c.BranchID, &c.Name, &c.Description, &c.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func (r *CategoryRepo) Update(category *entities.Category) error {
	_, err := r.q.Exec(`
		UPDATE categories SET name = $1, description = $2
		WHERE id = $3
	`, category.Name, category.Description, category.ID)
	return err
}

func (r *CategoryRepo) Delete(id int) error {
	_, err := r.q.Exec(`DELETE FROM categories WHERE id = $1`, id)
	return err
}
