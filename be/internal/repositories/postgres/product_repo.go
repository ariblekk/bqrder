package postgres

import (
	"database/sql"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type ProductRepo struct {
	q Querier
}

func NewProductRepo(q Querier) repositories.ProductRepository {
	return &ProductRepo{q: q}
}

func (r *ProductRepo) Create(product *entities.Product) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO products (branch_id, category_id, name, description, price, stock, image_url, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, product.BranchID, product.CategoryID, product.Name, product.Description,
		product.Price, product.Stock, product.ImageURL, product.IsActive).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *ProductRepo) FindByID(id int) (*entities.Product, error) {
	var p entities.Product
	err := r.q.QueryRow(`
		SELECT p.id, p.branch_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.is_active, p.created_at,
		       c.name AS category_name
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1
	`, id).Scan(&p.ID, &p.BranchID, &p.CategoryID, &p.Name, &p.Description,
		&p.Price, &p.Stock, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.CategoryName)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepo) FindByIDAndBranch(id, branchID int) (*entities.Product, error) {
	var p entities.Product
	err := r.q.QueryRow(`
		SELECT p.id, p.branch_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.is_active, p.created_at,
		       c.name AS category_name
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = $1 AND p.branch_id = $2
	`, id, branchID).Scan(&p.ID, &p.BranchID, &p.CategoryID, &p.Name, &p.Description,
		&p.Price, &p.Stock, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.CategoryName)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepo) ListByBranch(branchID int, limit, offset int) ([]entities.Product, error) {
	rows, err := r.q.Query(`
		SELECT p.id, p.branch_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.is_active, p.created_at,
		       c.name AS category_name
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.branch_id = $1
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, branchID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []entities.Product{}
	for rows.Next() {
		var p entities.Product
		if err := rows.Scan(&p.ID, &p.BranchID, &p.CategoryID, &p.Name, &p.Description,
			&p.Price, &p.Stock, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.CategoryName); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func (r *ProductRepo) CountByBranch(branchID int) (int, error) {
	var count int
	err := r.q.QueryRow(`
		SELECT COUNT(*) FROM products WHERE branch_id = $1
	`, branchID).Scan(&count)
	return count, err
}

func (r *ProductRepo) ListActiveByBranch(branchID int) ([]entities.Product, error) {
	rows, err := r.q.Query(`
		SELECT p.id, p.branch_id, p.category_id, p.name, p.description, p.price, p.stock, p.image_url, p.is_active, p.created_at,
		       c.name AS category_name
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.branch_id = $1 AND p.is_active = TRUE
		ORDER BY c.name, p.name
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []entities.Product{}
	for rows.Next() {
		var p entities.Product
		if err := rows.Scan(&p.ID, &p.BranchID, &p.CategoryID, &p.Name, &p.Description,
			&p.Price, &p.Stock, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.CategoryName); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func (r *ProductRepo) SalesStatsByBranch(branchID int) (map[int]entities.ProductSales, error) {
	rows, err := r.q.Query(`
		SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0)::int, COALESCE(SUM(oi.quantity * oi.price), 0)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.branch_id = $1 AND o.status <> 'cancelled'
		GROUP BY oi.product_id
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := map[int]entities.ProductSales{}
	for rows.Next() {
		var productID int
		var s entities.ProductSales
		if err := rows.Scan(&productID, &s.TotalSold, &s.TotalRevenue); err != nil {
			return nil, err
		}
		stats[productID] = s
	}
	return stats, rows.Err()
}

func (r *ProductRepo) Update(product *entities.Product) error {
	_, err := r.q.Exec(`
		UPDATE products SET category_id = $1, name = $2, description = $3, price = $4, stock = $5, is_active = $6
		WHERE id = $7
	`, product.CategoryID, product.Name, product.Description, product.Price,
		product.Stock, product.IsActive, product.ID)
	return err
}

func (r *ProductRepo) UpdateImage(id int, imageURL string) error {
	_, err := r.q.Exec(`UPDATE products SET image_url = $1 WHERE id = $2`, imageURL, id)
	return err
}

func (r *ProductRepo) Delete(id int) error {
	_, err := r.q.Exec(`DELETE FROM products WHERE id = $1`, id)
	return err
}

func (r *ProductRepo) DecreaseStock(productID, quantity int) error {
	res, err := r.q.Exec(`
		UPDATE products SET stock = stock - $1
		WHERE id = $2 AND stock >= $1
	`, quantity, productID)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return repositories.ErrInsufficientStock
	}
	return nil
}
