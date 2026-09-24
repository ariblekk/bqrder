package fcm

import (
	"context"
	"fmt"
	"strconv"

	"be/internal/domain/entities"
	"be/pkg/logger"
)

// DeviceSource resolves the device tokens that should receive a branch's
// order notifications. Implemented by repositories.DeviceRepository.
type DeviceSource interface {
	TokensByBranch(branchID int) ([]string, error)
}

// Service fans order events out to the branch's registered devices via FCM.
// push is nil when push is disabled (no FCM_CREDENTIALS); every method is a
// no-op then, so the rest of the stack keeps working without Firebase.
type Service struct {
	devices DeviceSource
	push    *Push
}

func NewService(devices DeviceSource, push *Push) *Service {
	return &Service{devices: devices, push: push}
}

// OrderCreated pushes a "new order" notification to every active device of
// users in the order's branch. Best-effort: failures are logged, never
// returned, so order creation is not slowed down.
func (s *Service) OrderCreated(branchID int, o *entities.Order) {
	if s == nil || s.push == nil {
		return
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Debug("fcm OrderCreated panic: %v", r)
			}
		}()
		tokens, err := s.devices.TokensByBranch(branchID)
		if err != nil {
			logger.Error("fcm tokens by branch %d: %v", branchID, err)
			return
		}
		if len(tokens) == 0 {
			logger.Info("fcm order %s: no registered devices for branch %d", o.OrderNumber, branchID)
			return
		}
		title := "Order Baru · " + o.OrderNumber
		body := fmt.Sprintf("%s · Meja %s · Rp %.0f", o.CustomerName, o.TableNumber, o.TotalAmount)
		data := map[string]string{
			"type":         "order.new",
			"order_id":     strconv.Itoa(o.ID),
			"order_number": o.OrderNumber,
			"branch_id":    strconv.Itoa(branchID),
		}
		sent := 0
		for _, tok := range tokens {
			msg := Message{Token: tok, Title: title, Body: body, Data: data}
			if err := s.push.Send(context.Background(), msg); err != nil {
				logger.Error("fcm send to %s…: %v", truncate(tok), err)
				continue
			}
			sent++
		}
		logger.Info("fcm order %s: sent to %d/%d device(s)", o.OrderNumber, sent, len(tokens))
	}()
}

func truncate(s string) string {
	if len(s) > 8 {
		return s[:8]
	}
	return s
}