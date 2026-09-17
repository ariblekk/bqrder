package usecases

import (
	"errors"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type PublicUseCase struct {
	categoryRepo repositories.CategoryRepository
	productRepo  repositories.ProductRepository
	tableRepo    repositories.TableRepository
	orderUseCase *OrderUseCase
	frontendURL  string
}

func NewPublicUseCase(
	categoryRepo repositories.CategoryRepository,
	productRepo repositories.ProductRepository,
	tableRepo repositories.TableRepository,
	orderUseCase *OrderUseCase,
	frontendURL string,
) *PublicUseCase {
	return &PublicUseCase{
		categoryRepo: categoryRepo,
		productRepo:  productRepo,
		tableRepo:    tableRepo,
		orderUseCase: orderUseCase,
		frontendURL:  frontendURL,
	}
}

func (u *PublicUseCase) ValidateTable(token string) (*entities.TableDetailResponse, error) {
	table, err := u.tableRepo.FindByQRToken(token)
	if err != nil {
		return nil, errors.New("invalid QR token")
	}
	if !table.IsActive {
		return nil, errors.New("table is inactive")
	}

	return &entities.TableDetailResponse{
		ID:          table.ID,
		BranchID:    table.BranchID,
		TableNumber: table.TableNumber,
		QRToken:     table.QRToken,
		QRLink:      u.frontendURL + "/menu?qr=" + table.QRToken,
		Capacity:    table.Capacity,
		IsActive:    table.IsActive,
	}, nil
}

func (u *PublicUseCase) GetMenu(branchID int) ([]entities.MenuCategory, error) {
	categories, err := u.categoryRepo.ListByBranch(branchID)
	if err != nil {
		return nil, err
	}

	products, err := u.productRepo.ListActiveByBranch(branchID)
	if err != nil {
		return nil, err
	}

	result := make([]entities.MenuCategory, 0, len(categories))
	for _, cat := range categories {
		menuCat := entities.MenuCategory{
			ID:          cat.ID,
			Name:        cat.Name,
			Description: cat.Description,
			Products:    []entities.MenuProduct{},
		}

		for _, p := range products {
			if p.CategoryID == cat.ID {
				menuCat.Products = append(menuCat.Products, entities.MenuProduct{
					ID:          p.ID,
					Name:        p.Name,
					Description: p.Description,
					Price:       p.Price,
					Stock:       p.Stock,
					ImageURL:    p.ImageURL,
				})
			}
		}

		if len(menuCat.Products) > 0 {
			result = append(result, menuCat)
		}
	}

	return result, nil
}

func (u *PublicUseCase) GetMenuByTable(qrToken string) ([]entities.MenuCategory, error) {
	table, err := u.ValidateTable(qrToken)
	if err != nil {
		return nil, err
	}

	if table.BranchID == 0 {
		return nil, errors.New("invalid table data")
	}

	return u.GetMenu(table.BranchID)
}

func (u *PublicUseCase) CreateOrder(branchID int, req *entities.CreateOrderRequest) (*entities.Order, error) {
	if req.TableID == nil {
		return nil, errors.New("table_id is required for customer orders")
	}
	return u.orderUseCase.CreateFromCustomer(branchID, req)
}

func (u *PublicUseCase) GetOrderStatus(orderNumber string) (*entities.Order, error) {
	return u.orderUseCase.GetByOrderNumber(orderNumber)
}
