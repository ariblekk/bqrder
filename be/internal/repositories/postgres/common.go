package postgres

import (
	"context"
	"database/sql"

	"be/internal/domain/repositories"
)

// Querier is satisfied by both *sql.DB and *sql.Tx, letting repositories run
// against a connection or inside a transaction interchangeably.
type Querier interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
}

// Store owns the *sql.DB and starts transactions.
type Store struct {
	db *sql.DB
	tz string
}

func NewStore(db *sql.DB, tz string) *Store {
	return &Store{db: db, tz: tz}
}

func (s *Store) Begin(ctx context.Context) (repositories.UnitOfWork, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &storeTx{tx: tx, tz: s.tz}, nil
}

type storeTx struct {
	tx *sql.Tx
	tz string
}

func (t *storeTx) Commit() error   { return t.tx.Commit() }
func (t *storeTx) Rollback() error { return t.tx.Rollback() }

func (t *storeTx) OrderRepo() repositories.OrderRepository {
	return NewOrderRepo(t.tx, t.tz)
}

func (t *storeTx) ProductRepo() repositories.ProductRepository {
	return NewProductRepo(t.tx)
}
