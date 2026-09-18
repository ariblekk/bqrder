package realtime

import "sync"

// Event is pushed to branch subscribers when an order changes.
type Event struct {
	Type        string `json:"type"`
	OrderID     int    `json:"order_id"`
	OrderNumber string `json:"order_number"`
}

// Hub fans events out to each branch's open SSE subscribers.
// ponytail: per-branch in-memory map; if multi-instance BE is ever needed,
// swap for a Redis pub/sub with the same Publish/Subscribe API.
type Hub struct {
	mu   sync.Mutex
	subs map[int]map[chan Event]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[int]map[chan Event]struct{})}
}

func (h *Hub) Publish(branchID int, ev Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.subs[branchID] {
		select {
		case ch <- ev:
		default:
			// Slow subscriber: drop; it still has the poll fallback.
		}
	}
}

func (h *Hub) Subscribe(branchID int) (<-chan Event, func()) {
	ch := make(chan Event, 32)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[branchID] == nil {
		h.subs[branchID] = make(map[chan Event]struct{})
	}
	h.subs[branchID][ch] = struct{}{}
	return ch, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		delete(h.subs[branchID], ch)
	}
}
