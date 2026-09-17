package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
	"be/pkg/utils"
)

type OrderUseCase struct {
	orderRepo   repositories.OrderRepository
	productRepo repositories.ProductRepository
	tableRepo   repositories.TableRepository
	tx          repositories.TxBeginner
}

func NewOrderUseCase(
	orderRepo repositories.OrderRepository,
	productRepo repositories.ProductRepository,
	tableRepo repositories.TableRepository,
	tx repositories.TxBeginner,
) *OrderUseCase {
	return &OrderUseCase{
		orderRepo:   orderRepo,
		productRepo: productRepo,
		tableRepo:   tableRepo,
		tx:          tx,
	}
}

func (u *OrderUseCase) CreateFromCustomer(branchID int, req *entities.CreateOrderRequest) (*entities.Order, error) {
	// Customer orders are settled by the payment gateway up front, so they are
	// recorded as paid immediately, but stay pending until the cashier hits
	// "Proses" and the kitchen starts working on them.
	return u.createOrder(branchID, req.TableID, req.CustomerName, req.Items, string(entities.PaymentMethodGateway), entities.OrderStatusPending)
}

func (u *OrderUseCase) CreateDirect(branchID int, req *entities.CreateDirectOrderRequest) (*entities.Order, error) {
	payMethod := ""
	startStatus := entities.OrderStatusPending
	if req.Pay {
		payMethod = string(entities.PaymentMethodCash)
		startStatus = entities.OrderStatusCompleted
	}
	return u.createOrder(branchID, req.TableID, req.CustomerName, req.Items, payMethod, startStatus)
}

// withTx runs fn inside a transaction. Every write that must be atomic goes
// through the transaction-bound repositories; a single failure rolls all back.
func (u *OrderUseCase) withTx(fn func(uow repositories.UnitOfWork) error) error {
	uow, err := u.tx.Begin(context.Background())
	if err != nil {
		return err
	}
	defer uow.Rollback()

	if err := fn(uow); err != nil {
		return err
	}
	return uow.Commit()
}

func (u *OrderUseCase) createOrder(
	branchID int,
	tableID *int,
	customerName string,
	items []entities.CreateOrderItemInput,
	payMethod string,
	startStatus entities.OrderStatus,
) (*entities.Order, error) {
	if len(items) == 0 {
		return nil, errors.New("order must have at least one item")
	}

	// Validate the table up front (empty-table touches no transaction).
	if tableID != nil {
		table, err := u.tableRepo.FindByIDAndBranch(*tableID, branchID)
		if err != nil {
			return nil, errors.New("table not found")
		}
		if !table.IsActive {
			return nil, errors.New("table is inactive")
		}
	}

	var order *entities.Order
	orderNumber, err := u.nextOrderNumber(branchID)
	if err != nil {
		return nil, err
	}

	err = u.withTx(func(uow repositories.UnitOfWork) error {
		// Pre-validate all items and capture product prices inside the tx.
		type validatedItem struct {
			item  entities.CreateOrderItemInput
			price float64
		}
		validated := make([]validatedItem, 0, len(items))
		var total float64
		for _, item := range items {
			product, err := uow.ProductRepo().FindByIDAndBranch(item.ProductID, branchID)
			if err != nil {
				return errors.New("product not found: invalid product_id")
			}
			if !product.IsActive {
				return errors.New("product is inactive")
			}

			validated = append(validated, validatedItem{item: item, price: product.Price})
			total += product.Price * float64(item.Quantity)
		}

		order = &entities.Order{
			BranchID:      branchID,
			OrderNumber:   orderNumber,
			TableID:       tableID,
			CustomerName:  customerName,
			TotalAmount:   utils.RoundFloat(total, 2),
			Status:        entities.OrderStatusPending,
			PaymentStatus: entities.PaymentStatusUnpaid,
		}
		if payMethod != "" {
			method := payMethod
			order.Status = startStatus
			order.PaymentStatus = entities.PaymentStatusPaid
			order.PaymentMethod = &method
		}

		id, err := uow.OrderRepo().Create(order)
		if err != nil {
			return err
		}
		order.ID = id

		for _, vi := range validated {
			orderItem := &entities.OrderItem{
				OrderID:   id,
				ProductID: vi.item.ProductID,
				Quantity:  vi.item.Quantity,
				Price:     vi.price,
				Notes:     vi.item.Notes,
			}

			if _, err := uow.OrderRepo().CreateOrderItem(orderItem); err != nil {
				return err
			}
			order.Items = append(order.Items, *orderItem)
		}

		if payMethod != "" {
			return deductStock(uow, order.Items)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return order, nil
}

// GetTodayOrders returns every order created today for the branch, including
// gateway orders that are already completed, so the cashier can still see them.
func (u *OrderUseCase) GetTodayOrders(branchID int) ([]entities.Order, error) {
	orders, err := u.orderRepo.ListTodayByBranch(branchID)
	if err != nil {
		return nil, err
	}

	ids := make([]int, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.ID)
	}
	itemsByOrder, err := u.orderRepo.GetOrderItemsBatch(ids)
	if err != nil {
		return nil, err
	}
	for i := range orders {
		orders[i].Items = itemsByOrder[orders[i].ID]
	}
	return orders, nil
}

func (u *OrderUseCase) GetByID(id, branchID int) (*entities.Order, error) {
	order, err := u.orderRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	items, err := u.orderRepo.GetOrderItems(id)
	if err != nil {
		return nil, err
	}
	order.Items = items

	return order, nil
}

func (u *OrderUseCase) GetByOrderNumber(orderNumber string) (*entities.Order, error) {
	order, err := u.orderRepo.FindByOrderNumber(orderNumber)
	if err != nil {
		return nil, err
	}

	items, err := u.orderRepo.GetOrderItems(order.ID)
	if err != nil {
		return nil, err
	}
	order.Items = items

	return order, nil
}

func (u *OrderUseCase) UpdateStatus(id, branchID int, status entities.OrderStatus) (*entities.Order, error) {
	if !status.IsValid() {
		return nil, errors.New("invalid status, must be one of: pending, processing, completed, cancelled")
	}

	order, err := u.orderRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	if order.Status == entities.OrderStatusCancelled {
		return nil, errors.New("cannot change status of a cancelled order")
	}
	if order.Status == entities.OrderStatusCompleted {
		return nil, errors.New("cannot change status of a completed order")
	}
	if status == entities.OrderStatusCompleted && order.PaymentStatus != entities.PaymentStatusPaid {
		return nil, errors.New("order must be paid before it can be completed")
	}

	if status == entities.OrderStatusCancelled && order.PaymentStatus == entities.PaymentStatusPaid {
		return nil, errors.New("cannot cancel a paid order")
	}
	if status == entities.OrderStatusPending && order.PaymentStatus == entities.PaymentStatusPaid {
		return nil, errors.New("a paid order must be completed, not reset to pending")
	}

	if err := u.orderRepo.UpdateStatus(id, order.Status, status); err != nil {
		if errors.Is(err, repositories.ErrStatusConflict) {
			return nil, errors.New("order status changed by another request, please refresh")
		}
		return nil, err
	}

	return u.GetByID(id, branchID)
}

func (u *OrderUseCase) Pay(id, branchID int, req *entities.PayOrderRequest) (*entities.Order, error) {
	order, err := u.orderRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	if order.Status == entities.OrderStatusCancelled {
		return nil, errors.New("cannot pay a cancelled order")
	}
	if order.PaymentStatus == entities.PaymentStatusPaid {
		return nil, errors.New("order already paid")
	}

	if req.PaymentMethod == "" {
		req.PaymentMethod = string(entities.PaymentMethodCash)
	}
	if req.PaymentMethod != string(entities.PaymentMethodCash) {
		return nil, errors.New("unsupported payment method")
	}

	orderItems, err := u.orderRepo.GetOrderItems(id)
	if err != nil {
		return nil, err
	}

	// Stock deduction and payment marking are atomic: either both happen or
	// neither does.
	err = u.withTx(func(uow repositories.UnitOfWork) error {
		if err := deductStock(uow, orderItems); err != nil {
			return err
		}
		return uow.OrderRepo().UpdatePayment(id, entities.PaymentStatusPaid, req.PaymentMethod)
	})
	if err != nil {
		return nil, err
	}

	return u.GetByID(id, branchID)
}

// deductStock verifies and decreases stock for every order item inside the
// caller's transaction. Fails on the first item without enough stock.
func deductStock(uow repositories.UnitOfWork, items []entities.OrderItem) error {
	for _, item := range items {
		product, err := uow.ProductRepo().FindByID(item.ProductID)
		if err != nil {
			return err
		}
		if product.Stock < item.Quantity {
			return errors.New("insufficient stock for product: " + product.Name)
		}
		if err := uow.ProductRepo().DecreaseStock(item.ProductID, item.Quantity); err != nil {
			return err
		}
	}
	return nil
}

// Receipt renders a plain-text (thermal-printer friendly) receipt for an order.
func (u *OrderUseCase) Receipt(id, branchID int, branch *entities.Branch) (string, error) {
	order, err := u.GetByID(id, branchID)
	if err != nil {
		return "", err
	}

	const width = 40
	var b strings.Builder
	line := strings.Repeat("=", width)
	sub := strings.Repeat("-", width)

	b.WriteString(line + "\n")
	b.WriteString(center("BQRDER", width) + "\n")
	if branch != nil {
		b.WriteString(center(branch.Name, width) + "\n")
		if branch.Address != "" {
			b.WriteString(center(branch.Address, width) + "\n")
		}
		if branch.Phone != "" {
			b.WriteString(center("Telp: "+branch.Phone, width) + "\n")
		}
	}
	b.WriteString(line + "\n")
	b.WriteString(fmt.Sprintf("No       : %s\n", order.OrderNumber))
	b.WriteString(fmt.Sprintf("Waktu    : %s\n", order.CreatedAt.Format("02/01/2006 15:04")))
	if order.CustomerName != "" {
		b.WriteString(fmt.Sprintf("Pelanggan: %s\n", order.CustomerName))
	}
	table := "-"
	if order.TableNumber != "" {
		table = order.TableNumber
	} else if order.TableID != nil {
		table = fmt.Sprintf("%d", *order.TableID)
	}
	b.WriteString(fmt.Sprintf("Meja     : %s\n", table))
	b.WriteString(sub + "\n")

	for _, item := range order.Items {
		b.WriteString(fmt.Sprintf("%s\n", item.ProductName))
		b.WriteString(fmt.Sprintf("  %d x %s%s\n", item.Quantity, formatIDR(item.Price), rightAlignIDR(item.Subtotal, width-15)))
		if item.Notes != "" {
			b.WriteString(fmt.Sprintf("  catatan: %s\n", item.Notes))
		}
	}

	b.WriteString(sub + "\n")
	b.WriteString(fmt.Sprintf("TOTAL    : %s\n", formatIDR(order.TotalAmount)))
	b.WriteString(fmt.Sprintf("Status   : %s / %s\n", order.Status, order.PaymentStatus))
	b.WriteString(line + "\n")
	b.WriteString(center("TERIMA KASIH", width) + "\n")
	b.WriteString(line + "\n")

	return b.String(), nil
}

func center(s string, width int) string {
	if len(s) >= width {
		return s
	}
	pad := (width - len(s)) / 2
	return strings.Repeat(" ", pad) + s
}

func rightAlignIDR(amount float64, width int) string {
	s := formatIDR(amount)
	if len(s) >= width {
		return s
	}
	return strings.Repeat(" ", width-len(s)) + s
}

func formatIDR(amount float64) string {
	neg := ""
	if amount < 0 {
		neg = "-"
		amount = -amount
	}
	whole := int64(amount)
	cents := int64((amount-float64(whole))*100 + 0.5)
	s := fmt.Sprintf("%d", whole)
	var parts []string
	for len(s) > 3 {
		parts = append([]string{s[len(s)-3:]}, parts...)
		s = s[:len(s)-3]
	}
	parts = append([]string{s}, parts...)
	out := neg + "Rp " + strings.Join(parts, ".")
	if cents > 0 {
		out += fmt.Sprintf(",%02d", cents)
	}
	return out
}

func (u *OrderUseCase) nextOrderNumber(branchID int) (string, error) {
	now := time.Now()
	seq, err := u.orderRepo.NextOrderSeq(branchID, now.Format("2006-01-02"))
	if err != nil {
		return "", err
	}
	return utils.GenerateOrderNumberWithSeq(seq), nil
}
