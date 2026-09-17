package usecases

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"be/config"
	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

const maxImageSize = 5 * 1024 * 1024

// allowedImageTypes maps the magic-byte sniffed content type to the extension
// we persist. The client-supplied filename/content-type is never trusted.
var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type UploadedFile struct {
	Filename    string
	Size        int64
	ContentType string
	Reader      io.Reader
}

type ProductUseCase struct {
	productRepo  repositories.ProductRepository
	categoryRepo repositories.CategoryRepository
	cfg          *config.Config
}

func NewProductUseCase(
	productRepo repositories.ProductRepository,
	categoryRepo repositories.CategoryRepository,
	cfg *config.Config,
) *ProductUseCase {
	return &ProductUseCase{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
		cfg:          cfg,
	}
}

func (u *ProductUseCase) Create(branchID int, req *entities.CreateProductRequest) (*entities.Product, error) {
	if _, err := u.categoryRepo.FindByIDAndBranch(req.CategoryID, branchID); err != nil {
		return nil, errors.New("category not found")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &entities.Product{
		BranchID:    branchID,
		CategoryID:  req.CategoryID,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		IsActive:    isActive,
	}

	id, err := u.productRepo.Create(product)
	if err != nil {
		return nil, err
	}

	return u.productRepo.FindByID(id)
}

func (u *ProductUseCase) GetAll(branchID, page, limit int) ([]entities.Product, int, error) {
	products, err := u.productRepo.ListByBranch(branchID, limit, (page-1)*limit)
	if err != nil {
		return nil, 0, err
	}
	total, err := u.productRepo.CountByBranch(branchID)
	if err != nil {
		return nil, 0, err
	}
	return products, total, nil
}

func (u *ProductUseCase) GetByID(id, branchID int) (*entities.Product, error) {
	return u.productRepo.FindByIDAndBranch(id, branchID)
}

func (u *ProductUseCase) Update(id, branchID int, req *entities.UpdateProductRequest) (*entities.Product, error) {
	product, err := u.productRepo.FindByIDAndBranch(id, branchID)
	if err != nil {
		return nil, err
	}

	if req.CategoryID > 0 {
		if _, err := u.categoryRepo.FindByIDAndBranch(req.CategoryID, branchID); err != nil {
			return nil, errors.New("category not found")
		}
		product.CategoryID = req.CategoryID
	}
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Description != "" {
		product.Description = req.Description
	}
	if req.Price > 0 {
		product.Price = req.Price
	}
	if req.Stock >= 0 {
		product.Stock = req.Stock
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}

	if err := u.productRepo.Update(product); err != nil {
		return nil, err
	}

	return u.productRepo.FindByID(id)
}

func (u *ProductUseCase) Delete(id, branchID int) error {
	if _, err := u.productRepo.FindByIDAndBranch(id, branchID); err != nil {
		return err
	}
	return u.productRepo.Delete(id)
}

func (u *ProductUseCase) UploadImage(id, branchID int, upload *UploadedFile) (*entities.Product, error) {
	if upload == nil {
		return nil, errors.New("no file uploaded")
	}

	if _, err := u.productRepo.FindByIDAndBranch(id, branchID); err != nil {
		return nil, errors.New("product not found")
	}

	if upload.Size > maxImageSize {
		return nil, errors.New("image size exceeds 5MB limit")
	}

	head := make([]byte, 512)
	n, err := io.ReadFull(upload.Reader, head)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return nil, errors.New("failed to read uploaded image")
	}
	head = head[:n]

	ext, ok := allowedImageTypes[http.DetectContentType(head)]
	if !ok {
		return nil, errors.New("invalid image format, allowed: jpg, jpeg, png, webp")
	}

	dir := filepath.Join(u.cfg.UploadPath, "products")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	filename := fmt.Sprintf("product_%d_%d%s", id, time.Now().Unix(), ext)
	dest := filepath.Join(dir, filename)

	out, err := os.Create(dest)
	if err != nil {
		return nil, err
	}
	defer out.Close()

	if _, err := out.Write(head); err != nil {
		return nil, err
	}
	if _, err := io.Copy(out, upload.Reader); err != nil {
		return nil, err
	}

	imageURL := "/uploads/products/" + filename
	if err := u.productRepo.UpdateImage(id, imageURL); err != nil {
		return nil, err
	}

	return u.productRepo.FindByID(id)
}
