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
	branchRepo   repositories.BranchRepository
	orderUseCase *OrderUseCase
	frontendURL  string
}

func NewPublicUseCase(
	categoryRepo repositories.CategoryRepository,
	productRepo repositories.ProductRepository,
	tableRepo repositories.TableRepository,
	branchRepo repositories.BranchRepository,
	orderUseCase *OrderUseCase,
	frontendURL string,
) *PublicUseCase {
	return &PublicUseCase{
		categoryRepo: categoryRepo,
		productRepo:  productRepo,
		tableRepo:    tableRepo,
		branchRepo:   branchRepo,
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

	branchName := ""
	if branch, err := u.branchRepo.FindByID(table.BranchID); err == nil {
		branchName = branch.Name
	}

	return &entities.TableDetailResponse{
		ID:          table.ID,
		BranchID:    table.BranchID,
		BranchName:  branchName,
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

	featured, err := u.productRepo.ListFeaturedByBranch(branchID)
	if err != nil {
		featured = []entities.Product{}
	}

	// Load variants and options for all products
	allProducts := append(products, featured...)
	productIDs := make([]int, 0, len(allProducts))
	for _, p := range allProducts {
		productIDs = append(productIDs, p.ID)
	}
	variants, _ := u.productRepo.ListVariants(productIDs)
	options, _ := u.productRepo.ListOptions(productIDs)

	stats, err := u.productRepo.SalesStatsByBranch(branchID)
	if err != nil {
		stats = map[int]entities.ProductSales{}
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
				s := stats[p.ID]
				menuCat.Products = append(menuCat.Products, entities.MenuProduct{
					ID:            p.ID,
					Name:          p.Name,
					Description:   p.Description,
					Price:         p.Price,
					Stock:         p.Stock,
					IsUnlimited:   p.IsUnlimited,
					ImageURL:      p.ImageURL,
					IsFeatured:    p.IsFeatured,
					FeaturedOrder: p.FeaturedOrder,
					Variants:      variants[p.ID],
					Options:       options[p.ID],
					TotalSold:     s.TotalSold,
					TotalRevenue:  s.TotalRevenue,
				})
			}
		}

		if len(menuCat.Products) > 0 {
			result = append(result, menuCat)
		}
	}

	// Add featured products as a virtual category at the beginning
	if len(featured) > 0 {
		featuredCat := entities.MenuCategory{
			ID:          0,
			Name:        "⭐ Pilihan Unggulan",
			Description: "Menu baru & favorit",
			Products:    []entities.MenuProduct{},
		}
		for _, p := range featured {
			s := stats[p.ID]
			featuredCat.Products = append(featuredCat.Products, entities.MenuProduct{
				ID:            p.ID,
				Name:          p.Name,
				Description:   p.Description,
				Price:         p.Price,
				Stock:         p.Stock,
				IsUnlimited:   p.IsUnlimited,
				ImageURL:      p.ImageURL,
				IsFeatured:    p.IsFeatured,
				FeaturedOrder: p.FeaturedOrder,
				Variants:      variants[p.ID],
				Options:       options[p.ID],
				TotalSold:     s.TotalSold,
				TotalRevenue:  s.TotalRevenue,
			})
		}
		result = append([]entities.MenuCategory{featuredCat}, result...)
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
	order, err := u.orderUseCase.GetByOrderNumber(orderNumber)
	if err != nil {
		return nil, err
	}
	if branch, err := u.branchRepo.FindByID(order.BranchID); err == nil {
		order.BranchName = branch.Name
	}
	return order, nil
}
