package postgres

import (
	"database/sql"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type TableRepo struct {
	q Querier
}

func NewTableRepo(q Querier) repositories.TableRepository {
	return &TableRepo{q: q}
}

func (r *TableRepo) Create(table *entities.Table) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO tables (branch_id, table_number, qr_token, capacity, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, table.BranchID, table.TableNumber, table.QRToken, table.Capacity, table.IsActive).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *TableRepo) FindByID(id int) (*entities.Table, error) {
	var t entities.Table
	err := r.q.QueryRow(`
		SELECT id, branch_id, table_number, qr_token, capacity, is_active, created_at
		FROM tables WHERE id = $1
	`, id).Scan(&t.ID, &t.BranchID, &t.TableNumber, &t.QRToken, &t.Capacity, &t.IsActive, &t.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (r *TableRepo) FindByIDAndBranch(id, branchID int) (*entities.Table, error) {
	var t entities.Table
	err := r.q.QueryRow(`
		SELECT id, branch_id, table_number, qr_token, capacity, is_active, created_at
		FROM tables WHERE id = $1 AND branch_id = $2
	`, id, branchID).Scan(&t.ID, &t.BranchID, &t.TableNumber, &t.QRToken, &t.Capacity, &t.IsActive, &t.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (r *TableRepo) FindByQRToken(token string) (*entities.Table, error) {
	var t entities.Table
	err := r.q.QueryRow(`
		SELECT id, branch_id, table_number, qr_token, capacity, is_active, created_at
		FROM tables WHERE qr_token = $1
	`, token).Scan(&t.ID, &t.BranchID, &t.TableNumber, &t.QRToken, &t.Capacity, &t.IsActive, &t.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

func (r *TableRepo) ListByBranch(branchID int) ([]entities.Table, error) {
	rows, err := r.q.Query(`
		SELECT id, branch_id, table_number, qr_token, capacity, is_active, created_at
		FROM tables WHERE branch_id = $1 ORDER BY table_number
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tables := []entities.Table{}
	for rows.Next() {
		var t entities.Table
		if err := rows.Scan(&t.ID, &t.BranchID, &t.TableNumber, &t.QRToken, &t.Capacity, &t.IsActive, &t.CreatedAt); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	return tables, rows.Err()
}

func (r *TableRepo) Update(table *entities.Table) error {
	_, err := r.q.Exec(`
		UPDATE tables SET table_number = $1, capacity = $2, is_active = $3
		WHERE id = $4
	`, table.TableNumber, table.Capacity, table.IsActive, table.ID)
	return err
}

func (r *TableRepo) Delete(id int) error {
	_, err := r.q.Exec(`DELETE FROM tables WHERE id = $1`, id)
	return err
}
