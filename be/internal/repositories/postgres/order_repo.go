package postgres

import (
	"database/sql"
	"time"

	"github.com/lib/pq"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

const orderListQuery = `
	SELECT o.id, o.branch_id, o.order_number, COALESCE(o.table_id, 0) AS table_id,
	       o.customer_name, o.total_amount,
	       o.status, o.payment_status, COALESCE(o.payment_method, '') AS payment_method,
	       o.created_at, o.updated_at,
	       COALESCE(t.table_number, '') AS table_number
	FROM orders o
	LEFT JOIN tables t ON t.id = o.table_id
`

type OrderRepo struct {
	q Querier
}

func NewOrderRepo(q Querier) repositories.OrderRepository {
	return &OrderRepo{q: q}
}

func scanOrder(scanner interface{ Scan(dest ...any) error }) (*entities.Order, error) {
	var o entities.Order
	err := scanner.Scan(&o.ID, &o.BranchID, &o.OrderNumber, &o.TableID, &o.CustomerName,
		&o.TotalAmount, &o.Status, &o.PaymentStatus, &o.PaymentMethod, &o.CreatedAt, &o.UpdatedAt,
		&o.TableNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepo) Create(order *entities.Order) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO orders (branch_id, order_number, table_id, customer_name, total_amount, status, payment_status, payment_method)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, order.BranchID, order.OrderNumber, order.TableID, order.CustomerName,
		order.TotalAmount, order.Status, order.PaymentStatus, order.PaymentMethod).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *OrderRepo) CreateOrderItem(item *entities.OrderItem) (int, error) {
	var id int
	err := r.q.QueryRow(`
		INSERT INTO order_items (order_id, product_id, quantity, price, notes, variant_name, option_names)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, item.OrderID, item.ProductID, item.Quantity, item.Price, item.Notes,
		item.VariantName, item.OptionNames).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *OrderRepo) FindByIDAndBranch(id, branchID int) (*entities.Order, error) {
	row := r.q.QueryRow(orderListQuery+`
		WHERE o.id = $1 AND o.branch_id = $2
	`, id, branchID)
	return scanOrder(row)
}

func (r *OrderRepo) FindByOrderNumber(number string) (*entities.Order, error) {
	row := r.q.QueryRow(orderListQuery+`
		WHERE o.order_number = $1
	`, number)
	return scanOrder(row)
}

func (r *OrderRepo) ListTodayByBranch(branchID int) ([]entities.Order, error) {
	rows, err := r.q.Query(orderListQuery+`
		WHERE o.branch_id = $1 AND o.created_at::date = CURRENT_DATE
		ORDER BY o.created_at DESC
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []entities.Order{}
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		orders = append(orders, *o)
	}
	return orders, rows.Err()
}

// UpdateStatus is guarded: it only applies when the order is still in
// fromStatus, so two concurrent cashiers cannot double-apply the same
// transition. A stale request gets ErrStatusConflict instead of silently no-oping.
func (r *OrderRepo) UpdateStatus(id int, fromStatus, toStatus entities.OrderStatus) error {
	res, err := r.q.Exec(`
		UPDATE orders SET status = $1, updated_at = $2
		WHERE id = $3 AND status = $4
	`, toStatus, time.Now(), id, fromStatus)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return repositories.ErrStatusConflict
	}
	return nil
}

func (r *OrderRepo) UpdatePayment(id int, paymentStatus entities.PaymentStatus, paymentMethod string) error {
	res, err := r.q.Exec(`
		UPDATE orders SET payment_status = $1, payment_method = $2, status = 'completed', updated_at = $3
		WHERE id = $4 AND payment_status <> 'paid'
	`, paymentStatus, paymentMethod, time.Now(), id)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return repositories.ErrAlreadyPaid
	}
	return nil
}

// NextOrderSeq atomically reserves the next per-day sequence number for a
// branch. Concurrent callers serialize on the counter row, so order numbers
// never collide.
func (r *OrderRepo) NextOrderSeq(branchID int, date string) (int, error) {
	var seq int
	err := r.q.QueryRow(`
		INSERT INTO order_counters (branch_id, order_date, seq)
		VALUES ($1, $2::date, 1)
		ON CONFLICT (branch_id, order_date)
		DO UPDATE SET seq = order_counters.seq + 1
		RETURNING seq
	`, branchID, date).Scan(&seq)
	if err != nil {
		return 0, err
	}
	return seq, nil
}

func (r *OrderRepo) GetOrderItems(orderID int) ([]entities.OrderItem, error) {
	items, err := r.GetOrderItemsBatch([]int{orderID})
	if err != nil {
		return nil, err
	}
	return items[orderID], nil
}

func (r *OrderRepo) GetOrderItemsBatch(orderIDs []int) (map[int][]entities.OrderItem, error) {
	if len(orderIDs) == 0 {
		return map[int][]entities.OrderItem{}, nil
	}

	rows, err := r.q.Query(`
		SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.notes,
		       oi.variant_name, oi.option_names,
		       p.name AS product_name,
		       oi.quantity::numeric * oi.price AS subtotal
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id = ANY($1)
		ORDER BY oi.order_id, oi.id
	`, pq.Array(orderIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := map[int][]entities.OrderItem{}
	for rows.Next() {
		var it entities.OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.Price,
			&it.Notes, &it.VariantName, &it.OptionNames, &it.ProductName, &it.Subtotal); err != nil {
			return nil, err
		}
		items[it.OrderID] = append(items[it.OrderID], it)
	}
	return items, rows.Err()
}

func (r *OrderRepo) GetSalesSummary(branchID int, period string) (*entities.SalesSummary, error) {
	var query string
	if period == "monthly" {
		query = `
			SELECT
				COUNT(*) AS total_orders,
				COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount END), 0) AS total_revenue,
				COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
				COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
				COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders
			FROM orders
			WHERE branch_id = $1
			  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
		`
	} else {
		query = `
			SELECT
				COUNT(*) AS total_orders,
				COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount END), 0) AS total_revenue,
				COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
				COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
				COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders
			FROM orders
			WHERE branch_id = $1
			  AND created_at::date = CURRENT_DATE
		`
	}

	var s entities.SalesSummary
	err := r.q.QueryRow(query, branchID).Scan(
		&s.TotalOrders, &s.TotalRevenue, &s.CompletedOrders,
		&s.CancelledOrders, &s.PendingOrders,
	)
	if err != nil {
		return nil, err
	}
	if s.TotalOrders > 0 {
		s.AverageOrderValue = s.TotalRevenue / float64(s.TotalOrders)
	}
	return &s, nil
}

func (r *OrderRepo) GetDailySales(branchID int, date string) (*entities.SalesSummary, error) {
	var s entities.SalesSummary
	err := r.q.QueryRow(`
		SELECT
			COUNT(*) AS total_orders,
			COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount END), 0) AS total_revenue,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders
		FROM orders
		WHERE branch_id = $1 AND created_at::date = $2::date
	`, branchID, date).Scan(
		&s.TotalOrders, &s.TotalRevenue, &s.CompletedOrders,
		&s.CancelledOrders, &s.PendingOrders,
	)
	if err != nil {
		return nil, err
	}
	if s.TotalOrders > 0 {
		s.AverageOrderValue = s.TotalRevenue / float64(s.TotalOrders)
	}
	return &s, nil
}

func (r *OrderRepo) GetSalesReport(branchID int, startDate, endDate string) (*entities.SalesReport, error) {
	report := &entities.SalesReport{}

	dailyRows, err := r.q.Query(`
		SELECT to_char(created_at, 'YYYY-MM-DD') AS date,
		       COUNT(*) AS total_orders,
		       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount END), 0) AS total_revenue
		FROM orders
		WHERE branch_id = $1 AND created_at::date BETWEEN $2::date AND $3::date
		GROUP BY date
		ORDER BY date
	`, branchID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer dailyRows.Close()

	for dailyRows.Next() {
		var ds entities.DailySales
		if err := dailyRows.Scan(&ds.Date, &ds.TotalOrders, &ds.TotalRevenue); err != nil {
			return nil, err
		}
		report.DailySales = append(report.DailySales, ds)
	}

	topRows, err := r.q.Query(`
		SELECT p.id, p.name,
		       SUM(oi.quantity) AS total_sold,
		       SUM(oi.quantity * oi.price) AS total_revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN products p ON p.id = oi.product_id
		WHERE o.branch_id = $1 AND o.status = 'completed'
		  AND o.created_at::date BETWEEN $2::date AND $3::date
		GROUP BY p.id, p.name
		ORDER BY total_sold DESC
		LIMIT 10
	`, branchID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer topRows.Close()

	for topRows.Next() {
		var tp entities.TopProduct
		if err := topRows.Scan(&tp.ProductID, &tp.ProductName, &tp.TotalSold, &tp.TotalRevenue); err != nil {
			return nil, err
		}
		report.TopProducts = append(report.TopProducts, tp)
	}

	var summary entities.SalesSummary
	err = r.q.QueryRow(`
		SELECT
			COUNT(*) AS total_orders,
			COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount END), 0) AS total_revenue,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders,
			COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END), 0) AS pending_orders
		FROM orders
		WHERE branch_id = $1 AND created_at::date BETWEEN $2::date AND $3::date
	`, branchID, startDate, endDate).Scan(
		&summary.TotalOrders, &summary.TotalRevenue, &summary.CompletedOrders,
		&summary.CancelledOrders, &summary.PendingOrders,
	)
	if err != nil {
		return nil, err
	}
	if summary.TotalOrders > 0 {
		summary.AverageOrderValue = summary.TotalRevenue / float64(summary.TotalOrders)
	}
	report.Summary = summary

	return report, nil
}
