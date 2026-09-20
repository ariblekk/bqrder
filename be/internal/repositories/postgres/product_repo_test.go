package postgres

import (
	"database/sql"
	"database/sql/driver"
	"errors"
	"testing"
)

// recordingQuerier captures query args then fails, so repository methods can be
// exercised without a live database.
type recordingQuerier struct {
	lastArgs []any
}

func (q *recordingQuerier) Exec(string, ...any) (sql.Result, error) { return nil, nil }
func (q *recordingQuerier) Query(_ string, args ...any) (*sql.Rows, error) {
	q.lastArgs = args
	return nil, errors.New("stop")
}
func (q *recordingQuerier) QueryRow(string, ...any) *sql.Row { return nil }

// lib/pq cannot encode a raw []int; ids must go through pq.Array (a
// driver.Valuer) or the query fails at runtime and variants never load.
func TestListVariantsAndOptionsPassArrayArg(t *testing.T) {
	for _, tc := range []struct {
		name string
		call func(ProductRepo) error
	}{
		{"variants", func(r ProductRepo) error { _, err := r.ListVariants([]int{1, 2}); return err }},
		{"options", func(r ProductRepo) error { _, err := r.ListOptions([]int{1, 2}); return err }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			q := &recordingQuerier{}
			repo := ProductRepo{q: q}
			if err := tc.call(repo); err == nil {
				t.Fatal("expected the fake query to fail")
			}
			if len(q.lastArgs) != 1 {
				t.Fatalf("expected 1 arg, got %d", len(q.lastArgs))
			}
			if _, ok := q.lastArgs[0].(driver.Valuer); !ok {
				t.Fatalf("product ids must be passed as pq.Array, got %T", q.lastArgs[0])
			}
		})
	}
}
