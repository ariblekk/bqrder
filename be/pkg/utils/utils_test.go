package utils

import (
	"strings"
	"testing"
)

func TestRoundFloat(t *testing.T) {
	if got := RoundFloat(12.345, 2); got != 12.35 {
		t.Fatalf("RoundFloat(12.345, 2) = %v, want 12.35", got)
	}
	if got := RoundFloat(12.341, 2); got != 12.34 {
		t.Fatalf("RoundFloat(12.341, 2) = %v, want 12.34", got)
	}
}

func TestGenerateOrderNumberWithSeq(t *testing.T) {
	n := GenerateOrderNumberWithSeq(42)
	if !strings.HasPrefix(n, "ORD-20") || !strings.HasSuffix(n, "-042") {
		t.Fatalf("unexpected order number: %s", n)
	}
}

func TestGenerateQRToken(t *testing.T) {
	a, err := GenerateQRToken()
	if err != nil {
		t.Fatalf("token gen failed: %v", err)
	}
	b, _ := GenerateQRToken()
	if a == "" || len(a) != 32 {
		t.Fatalf("token must be 32 hex chars, got %q (len %d)", a, len(a))
	}
	if a == b {
		t.Fatal("two tokens must differ")
	}
}

func TestParsePagination(t *testing.T) {
	cases := []struct {
		page, limit, wantPage, wantLimit int
	}{
		{0, 0, 1, 10},
		{3, 25, 3, 25},
		{1, 500, 1, 100},
		{-2, -1, 1, 10},
	}
	for _, c := range cases {
		p, l := ParsePagination(c.page, c.limit)
		if p != c.wantPage || l != c.wantLimit {
			t.Fatalf("ParsePagination(%d, %d) = (%d, %d), want (%d, %d)", c.page, c.limit, p, l, c.wantPage, c.wantLimit)
		}
	}
}

func TestPaginationOffset(t *testing.T) {
	if got := PaginationOffset(1, 10); got != 0 {
		t.Fatalf("page 1 offset = %d, want 0", got)
	}
	if got := PaginationOffset(3, 10); got != 20 {
		t.Fatalf("page 3 offset = %d, want 20", got)
	}
}
