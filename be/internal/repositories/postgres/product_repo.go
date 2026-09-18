package postgres

import (
	"database/sql"

	"github.com/lib/pq"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type ProductRepo struct {
	q Querier
}

func NewProductRepo(q Querier) repositories.ProductRepository {
	return &ProductRepo{q: q}
}

// attachChildren loads variants and options for a set of products in two
// batched queries, so lists never trigger N+1 round trips.
func (r *ProductRepo) attachChildren(products []entities.Product) error {
	ids := make([]int, 0, len(products))
	for _, p := range products {
		ids = append(ids, p.ID)
	}
	variants, err := r.ListVariants(ids)
	if err != nil {
		return err
	}
	options, err := r.ListOptions(ids)
	if err != nil {
		return err
	}
	for i := range products {
		v := variants[products[i].ID]
		if v == nil {
			v = []entities.ProductVariant{}
		}
		o := options[products[i].ID]
		if o == nil {
			o = []entities.ProductOption{}
		}
		products[i].Variants = v
		products[i].Options = o
	}
	return nil
}

func (r *ProductRepo) ListVariants(productIDs []int) (map[int][]entities.ProductVariant, error) {
	out := map[int][]entities.ProductVariant{}
	if len(productIDs) == 0 {
		return out, nil
	}
	rows, err := r.q.Query(`
		SELECT id, product_id, name, price FROM product_variants
		WHERE product_id = ANY($1)
		ORDER BY id
	`, pq.Array(productIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var v entities.ProductVariant
		if err := rows.Scan(&v.ID, &v.ProductID, &v.Name, &v.Price); err != nil {
			return nil, err
		}
		out[v.ProductID] = append(out[v.ProductID], v)
	}
	return out, rows.Err()
}

func (r *ProductRepo) ListOptions(productIDs []int) (map[int][]entities.ProductOption, error) {
	out := map[int][]entities.ProductOption{}
	if len(productIDs) == 0 {
		return out, nil
	}
	rows, err := r.q.Query(`
		SELECT id, product_id, name, price FROM product_options
		WHERE product_id = ANY($1)
		ORDER BY id
	`, pq.Array(productIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var o entities.ProductOption
		if err := rows.Scan(&o.ID, &o.ProductID, &o.Name, &o.Price); err != nil {
			return nil, err
		}
		out[o.ProductID] = append(out[o.ProductID], o)
	}
	return out, rows.Err()
}

func (r *ProductRepo) ReplaceVariants(productID int, variants []entities.ProductVariant) error {
	if err := r.deleteVariants(productID); err != nil {
		return err
	}
	for _, v := range variants {
		if _, err := r.q.Exec(
			`INSERT INTO product_variants (product_id, name, price) VALUES ($1, $2, $3)`,
			productID, v.Name, v.Price,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *ProductRepo) ReplaceOptions(productID int, options []entities.ProductOption) error {
	if err := r.deleteOptions(productID); err != nil {
		return err
	}
	for _, o := range options {
		if _, err := r.q.Exec(
			`INSERT INTO product_options (product_id, name, price) VALUES ($1, $2, $3)`,
			productID, o.Name, o.Price,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *ProductRepo) deleteVariants(productID int) error {
	_, err := r.q.Exec(`DELETE FROM product_variants WHERE product_id = $1`, productID)
	return err
}

func (r *ProductRepo) deleteOptions(productID int) error {
	_, err := r.q.Exec(`DELETE FROM product_options WHERE product_id = $1`, productID)
	return err
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
	if err := r.attachChildren([]entities.Product{p}); err != nil {
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
	if err := r.attachChildren([]entities.Product{p}); err != nil {
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
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachChildren(products); err != nil {
		return nil, err
	}
	return products, nil
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
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachChildren(products); err != nil {
		return nil, err
	}
	return products, nil
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
