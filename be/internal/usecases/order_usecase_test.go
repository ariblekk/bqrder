package usecases

import (
	"context"
	"strings"
	"testing"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type fakeOrderRepo struct {
	orders              map[int]*entities.Order
	nextID              int
	items               map[int][]entities.OrderItem
	nextItemID          int
	updatePaymentCalled bool
	nextSeq             int
}

func (f *fakeOrderRepo) Create(order *entities.Order) (int, error) {
	f.nextID++
	order.ID = f.nextID
	f.orders[order.ID] = order
	return order.ID, nil
}

func (f *fakeOrderRepo) CreateOrderItem(item *entities.OrderItem) (int, error) {
	f.nextItemID++
	item.ID = f.nextItemID
	if item.OrderID != 0 {
		f.items[item.OrderID] = append(f.items[item.OrderID], *item)
	}
	return item.ID, nil
}

func (f *fakeOrderRepo) FindByIDAndBranch(id, branchID int) (*entities.Order, error) {
	o, ok := f.orders[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return o, nil
}

func (f *fakeOrderRepo) FindByOrderNumber(number string) (*entities.Order, error) {
	for _, o := range f.orders {
		if o.OrderNumber == number {
			return o, nil
		}
	}
	return nil, repositories.ErrNotFound
}

func (f *fakeOrderRepo) ListTodayByBranch(branchID int) ([]entities.Order, error) {
	return nil, nil
}

func (f *fakeOrderRepo) UpdateStatus(id int, fromStatus, toStatus entities.OrderStatus) error {
	o, ok := f.orders[id]
	if !ok {
		return repositories.ErrNotFound
	}
	if o.Status != fromStatus {
		return repositories.ErrStatusConflict
	}
	o.Status = toStatus
	return nil
}

func (f *fakeOrderRepo) UpdatePayment(id int, paymentStatus entities.PaymentStatus, paymentMethod string) error {
	f.updatePaymentCalled = true
	return nil
}

func (f *fakeOrderRepo) NextOrderSeq(branchID int, date string) (int, error) {
	f.nextSeq++
	return f.nextSeq, nil
}

func (f *fakeOrderRepo) GetOrderItems(orderID int) ([]entities.OrderItem, error) {
	return f.items[orderID], nil
}

func (f *fakeOrderRepo) GetOrderItemsBatch(orderIDs []int) (map[int][]entities.OrderItem, error) {
	out := map[int][]entities.OrderItem{}
	for _, id := range orderIDs {
		out[id] = f.items[id]
	}
	return out, nil
}

func (f *fakeOrderRepo) GetSalesSummary(branchID int, period string) (*entities.SalesSummary, error) {
	return nil, nil
}

func (f *fakeOrderRepo) GetDailySales(branchID int, date string) (*entities.SalesSummary, error) {
	return nil, nil
}

func (f *fakeOrderRepo) GetSalesReport(branchID int, startDate, endDate string) (*entities.SalesReport, error) {
	return nil, nil
}
func (f *fakeOrderRepo) CreateOrderItemOptions(itemID int, optionIDs []int) error {
	return nil
}

type fakeProductRepo struct {
	stock          map[int]int
	unlimited      map[int]bool
	decreaseCalled []int
	fixed          *entities.Product
}

func (f *fakeProductRepo) Create(product *entities.Product) (int, error) { return 0, nil }
func (f *fakeProductRepo) FindByID(id int) (*entities.Product, error) {
	if f.fixed != nil {
		return f.fixed, nil
	}
	return &entities.Product{ID: id, Name: "prod", Stock: f.stock[id], IsUnlimited: f.unlimited[id]}, nil
}
func (f *fakeProductRepo) FindByIDAndBranch(id, branchID int) (*entities.Product, error) {
	if f.fixed != nil {
		return f.fixed, nil
	}
	return &entities.Product{ID: id, Name: "prod", Stock: f.stock[id], IsUnlimited: f.unlimited[id], Price: 10000, IsActive: true}, nil
}
func (f *fakeProductRepo) ListByBranch(branchID int, limit, offset int) ([]entities.Product, error) {
	return nil, nil
}
func (f *fakeProductRepo) CountByBranch(branchID int) (int, error) { return 0, nil }
func (f *fakeProductRepo) ListActiveByBranch(branchID int) ([]entities.Product, error) {
	return nil, nil
}
func (f *fakeProductRepo) Update(product *entities.Product) error    { return nil }
func (f *fakeProductRepo) UpdateImage(id int, imageURL string) error { return nil }
func (f *fakeProductRepo) DecreaseStock(productID, quantity int) error {
	f.decreaseCalled = append(f.decreaseCalled, productID)
	if !f.unlimited[productID] {
		f.stock[productID] -= quantity
	}
	return nil
}
func (f *fakeProductRepo) SalesStatsByBranch(branchID int) (map[int]entities.ProductSales, error) {
	return nil, nil
}
func (f *fakeProductRepo) ListFeaturedByBranch(branchID int) ([]entities.Product, error) {
	return nil, nil
}
func (f *fakeProductRepo) ListVariants(productIDs []int) (map[int][]entities.ProductVariant, error) {
	return map[int][]entities.ProductVariant{}, nil
}
func (f *fakeProductRepo) ListOptions(productIDs []int) (map[int][]entities.ProductOption, error) {
	return map[int][]entities.ProductOption{}, nil
}
func (f *fakeProductRepo) ReplaceVariants(productID int, variants []entities.ProductVariant) error {
	return nil
}
func (f *fakeProductRepo) ReplaceOptions(productID int, options []entities.ProductOption) error {
	return nil
}

type fakeTableRepo struct {
	tables map[int]*entities.Table
}

func (f *fakeTableRepo) Create(table *entities.Table) (int, error) { return 0, nil }
func (f *fakeTableRepo) FindByID(id int) (*entities.Table, error)  { return nil, nil }
func (f *fakeTableRepo) FindByIDAndBranch(id, branchID int) (*entities.Table, error) {
	t, ok := f.tables[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return t, nil
}
func (f *fakeTableRepo) FindByQRToken(token string) (*entities.Table, error) { return nil, nil }
func (f *fakeTableRepo) ListByBranch(branchID int) ([]entities.Table, error) { return nil, nil }
func (f *fakeTableRepo) Update(table *entities.Table) error                  { return nil }
func (f *fakeTableRepo) Delete(id int) error { return nil }

type fakeTx struct {
	uow repositories.UnitOfWork
}

func (f *fakeTx) Begin(ctx context.Context) (repositories.UnitOfWork, error) {
	return f.uow, nil
}

type fakeUOW struct {
	order   *fakeOrderRepo
	product *fakeProductRepo
}

func (f *fakeUOW) Commit() error   { return nil }
func (f *fakeUOW) Rollback() error { return nil }
func (f *fakeUOW) OrderRepo() repositories.OrderRepository {
	return f.order
}
func (f *fakeUOW) ProductRepo() repositories.ProductRepository {
	return f.product
}

func TestPayDeductsStockAndMarksPaid(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-001", Status: entities.OrderStatusPending, PaymentStatus: entities.PaymentStatusUnpaid},
		},
		items: map[int][]entities.OrderItem{
			1: {{ID: 1, OrderID: 1, ProductID: 10, Quantity: 2}},
		},
	}
	v := 5
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	tx := &fakeTx{uow: uow}

	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, tx)
	_, err := uc.Pay(1, 1, &entities.PayOrderRequest{PaymentMethod: "cash"})
	if err != nil {
		t.Fatalf("pay: %v", err)
	}
	if productRepo.stock[10] != 3 {
		t.Fatalf("stock should be 3, got %d", productRepo.stock[10])
	}
	if !orderRepo.updatePaymentCalled {
		t.Fatal("payment must be marked paid")
	}
}

func TestPayInsufficientStockDoesNotMarkPaid(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-002", Status: entities.OrderStatusPending, PaymentStatus: entities.PaymentStatusUnpaid},
		},
		items: map[int][]entities.OrderItem{
			1: {{ID: 1, OrderID: 1, ProductID: 10, Quantity: 5}},
		},
	}
	v := 3
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	tx := &fakeTx{uow: uow}

	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, tx)
	_, err := uc.Pay(1, 1, &entities.PayOrderRequest{PaymentMethod: "cash"})
	if err == nil {
		t.Fatal("insufficient stock must fail")
	}
	if orderRepo.updatePaymentCalled {
		t.Fatal("payment must NOT be marked when stock insufficient")
	}
	if len(productRepo.decreaseCalled) != 0 {
		t.Fatalf("no stock should be decremented, got %v", productRepo.decreaseCalled)
	}
}

func TestPayAlreadyPaidFails(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-003", Status: entities.OrderStatusCompleted, PaymentStatus: entities.PaymentStatusPaid},
		},
	}
	productRepo := &fakeProductRepo{stock: map[int]int{}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	tx := &fakeTx{uow: uow}

	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, tx)
	_, err := uc.Pay(1, 1, &entities.PayOrderRequest{PaymentMethod: "cash"})
	if err == nil {
		t.Fatal("already paid order must fail")
	}
}

func TestReceiptContainsTotalAndNumber(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-006", Status: entities.OrderStatusCompleted, PaymentStatus: entities.PaymentStatusPaid},
		},
		items: map[int][]entities.OrderItem{
			1: {{ID: 1, OrderID: 1, ProductID: 10, Quantity: 2, Price: 10000, ProductName: "Kopi", Subtotal: 20000}},
		},
	}
	uc := NewOrderUseCase(orderRepo, &fakeProductRepo{stock: map[int]int{}}, &fakeTableRepo{}, &fakeTx{})

	receipt, err := uc.Receipt(1, 1, &entities.Branch{Name: "Kafe Melati"})
	if err != nil {
		t.Fatalf("receipt: %v", err)
	}
	for _, want := range []string{"ORD-006", "Kopi", "Kafe Melati", "Rp 20.000"} {
		if !strings.Contains(receipt, want) {
			t.Fatalf("receipt missing %q:\n%s", want, receipt)
		}
	}
}

func TestCustomerOrderAutoPaidAndDeductsStock(t *testing.T) {
	orderRepo := &fakeOrderRepo{orders: map[int]*entities.Order{}, items: map[int][]entities.OrderItem{}}
	v := 5
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, &fakeTx{uow: uow})

	order, err := uc.CreateFromCustomer(1, &entities.CreateOrderRequest{
		Items: []entities.CreateOrderItemInput{{ProductID: 10, Quantity: 2}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if order.PaymentStatus != entities.PaymentStatusPaid || order.Status != entities.OrderStatusPending {
		t.Fatalf("gateway order must be paid+pending, got %s/%s", order.Status, order.PaymentStatus)
	}
	if productRepo.stock[10] != 3 {
		t.Fatalf("stock should be deducted to 3, got %d", productRepo.stock[10])
	}
}

func TestDirectOrderStaysUnpaid(t *testing.T) {
	orderRepo := &fakeOrderRepo{orders: map[int]*entities.Order{}, items: map[int][]entities.OrderItem{}}
	v := 5
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, &fakeTx{uow: uow})

	order, err := uc.CreateDirect(1, &entities.CreateDirectOrderRequest{
		CustomerName: "Budi",
		Items:        []entities.CreateOrderItemInput{{ProductID: 10, Quantity: 2}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if order.PaymentStatus != entities.PaymentStatusUnpaid || order.Status != entities.OrderStatusPending {
		t.Fatalf("cashier order must be unpaid+pending, got %s/%s", order.Status, order.PaymentStatus)
	}
	if productRepo.stock[10] != 5 {
		t.Fatalf("cashier order must not deduct stock yet, got %d", productRepo.stock[10])
	}
}

func TestDirectOrderPaidImmediately(t *testing.T) {
	orderRepo := &fakeOrderRepo{orders: map[int]*entities.Order{}, items: map[int][]entities.OrderItem{}}
	v := 5
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, &fakeTx{uow: uow})

	order, err := uc.CreateDirect(1, &entities.CreateDirectOrderRequest{
		CustomerName: "Budi",
		Pay:          true,
		Items:        []entities.CreateOrderItemInput{{ProductID: 10, Quantity: 2}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if order.PaymentStatus != entities.PaymentStatusPaid || order.Status != entities.OrderStatusCompleted {
		t.Fatalf("paid direct order must be paid+completed, got %s/%s", order.Status, order.PaymentStatus)
	}
	if order.PaymentMethod == nil || *order.PaymentMethod != string(entities.PaymentMethodCash) {
		t.Fatalf("paid direct order must be cash, got %v", order.PaymentMethod)
	}
	if productRepo.stock[10] != 3 {
		t.Fatalf("stock should be deducted to 3, got %d", productRepo.stock[10])
	}
}

func TestCustomerOrderProceedsThroughKitchen(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-007", Status: entities.OrderStatusPending, PaymentStatus: entities.PaymentStatusPaid},
		},
	}
	uc := NewOrderUseCase(orderRepo, &fakeProductRepo{stock: map[int]int{}}, &fakeTableRepo{}, &fakeTx{})

	if o, err := uc.UpdateStatus(1, 1, entities.OrderStatusProcessing); err != nil || o.Status != entities.OrderStatusProcessing {
		t.Fatalf("pending->processing must succeed, got %v/%v", o, err)
	}
	if o, err := uc.UpdateStatus(1, 1, entities.OrderStatusCompleted); err != nil || o.Status != entities.OrderStatusCompleted {
		t.Fatalf("processing->completed must succeed, got %v/%v", o, err)
	}
}

func TestStatusTransitionGuarded(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-009", Status: entities.OrderStatusProcessing, PaymentStatus: entities.PaymentStatusPaid},
		},
	}
	// A stale caller holding a pending snapshot tries to move the order after
	// another cashier already moved it to processing.
	if err := orderRepo.UpdateStatus(1, entities.OrderStatusPending, entities.OrderStatusProcessing); err == nil {
		t.Fatal("transition from a stale status must be rejected")
	}
	if err := orderRepo.UpdateStatus(1, entities.OrderStatusProcessing, entities.OrderStatusCompleted); err != nil {
		t.Fatalf("transition from the current status must succeed: %v", err)
	}
}

func TestUnpaidOrderCannotBeCompleted(t *testing.T) {
	orderRepo := &fakeOrderRepo{
		orders: map[int]*entities.Order{
			1: {ID: 1, BranchID: 1, OrderNumber: "ORD-008", Status: entities.OrderStatusPending, PaymentStatus: entities.PaymentStatusUnpaid},
		},
	}
	uc := NewOrderUseCase(orderRepo, &fakeProductRepo{stock: map[int]int{}}, &fakeTableRepo{}, &fakeTx{})

	if _, err := uc.UpdateStatus(1, 1, entities.OrderStatusCompleted); err == nil {
		t.Fatal("unpaid order must not be completable")
	}
}

func TestCreateOrderGeneratesSeqNumber(t *testing.T) {
	orderRepo := &fakeOrderRepo{orders: map[int]*entities.Order{}, items: map[int][]entities.OrderItem{}}
	v := 5
	productRepo := &fakeProductRepo{stock: map[int]int{10: v}}
	uow := &fakeUOW{order: orderRepo, product: productRepo}
	tx := &fakeTx{uow: uow}

	uc := NewOrderUseCase(orderRepo, productRepo, &fakeTableRepo{}, tx)
	order, err := uc.CreateFromCustomer(1, &entities.CreateOrderRequest{
		Items: []entities.CreateOrderItemInput{{ProductID: 10, Quantity: 2}},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if order.ID == 0 {
		t.Fatal("order must have an id")
	}
	if order.OrderNumber == "" {
		t.Fatal("order must have a number")
	}
	if order.TotalAmount != 20000 {
		t.Fatalf("total should be 20000, got %v", order.TotalAmount)
	}
	if len(order.Items) != 1 {
		t.Fatalf("order should have 1 item, got %d", len(order.Items))
	}
}
