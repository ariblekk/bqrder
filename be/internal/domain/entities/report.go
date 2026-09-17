package entities

import "time"

type SalesSummary struct {
	TotalOrders       int     `json:"total_orders"`
	TotalRevenue      float64 `json:"total_revenue"`
	CompletedOrders   int     `json:"completed_orders"`
	CancelledOrders   int     `json:"cancelled_orders"`
	PendingOrders     int     `json:"pending_orders"`
	AverageOrderValue float64 `json:"average_order_value"`
}

type DailySales struct {
	Date         string  `json:"date"`
	TotalOrders  int     `json:"total_orders"`
	TotalRevenue float64 `json:"total_revenue"`
}

type TopProduct struct {
	ProductID    int     `json:"product_id"`
	ProductName  string  `json:"product_name"`
	TotalSold    int     `json:"total_sold"`
	TotalRevenue float64 `json:"total_revenue"`
}

type SalesReport struct {
	Period      string       `json:"period"`
	StartDate   time.Time    `json:"start_date"`
	EndDate     time.Time    `json:"end_date"`
	Summary     SalesSummary `json:"summary"`
	DailySales  []DailySales `json:"daily_sales"`
	TopProducts []TopProduct `json:"top_products"`
}
