package usecases

import (
	"errors"
	"time"

	"be/internal/domain/entities"
	"be/internal/domain/repositories"
)

type ReportUseCase struct {
	orderRepo repositories.OrderRepository
}

func NewReportUseCase(
	orderRepo repositories.OrderRepository,
) *ReportUseCase {
	return &ReportUseCase{
		orderRepo: orderRepo,
	}
}

func (u *ReportUseCase) GetSalesSummary(branchID int, period string) (*entities.SalesSummary, error) {
	if period != "daily" && period != "monthly" {
		return nil, errors.New("invalid period, must be 'daily' or 'monthly'")
	}
	return u.orderRepo.GetSalesSummary(branchID, period)
}

func (u *ReportUseCase) GetDailySales(branchID int, date string) (*entities.SalesSummary, error) {
	return u.orderRepo.GetDailySales(branchID, date)
}

func (u *ReportUseCase) GetSalesReport(branchID int, period string, startDate, endDate string) (*entities.SalesReport, error) {
	if period == "daily" {
		date := time.Now().Format("2006-01-02")
		if startDate == "" {
			startDate = date
		}
		if endDate == "" {
			endDate = date
		}
	}

	if startDate == "" && endDate == "" {
		now := time.Now()
		if period == "monthly" {
			startDate = now.Format("2006-01-01")
			endDate = now.Format("2006-01-31")
		} else {
			date := now.Format("2006-01-02")
			startDate = date
			endDate = date
		}
	}

	if startDate == "" || endDate == "" {
		return nil, errors.New("start_date and end_date must both be provided or both empty")
	}

	if _, err := time.Parse("2006-01-02", startDate); err != nil {
		return nil, errors.New("invalid start_date format, expected YYYY-MM-DD")
	}
	if _, err := time.Parse("2006-01-02", endDate); err != nil {
		return nil, errors.New("invalid end_date format, expected YYYY-MM-DD")
	}

	return u.orderRepo.GetSalesReport(branchID, startDate, endDate)
}
