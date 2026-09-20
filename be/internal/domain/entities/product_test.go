package entities

import (
	"testing"

	"github.com/gin-gonic/gin/binding"
)

func TestCreateProductRequestStockAndUnlimited(t *testing.T) {
	bind := func(body string) (*CreateProductRequest, error) {
		var req CreateProductRequest
		err := binding.JSON.BindBody([]byte(body), &req)
		return &req, err
	}

	// Omitted stock defaults to 0 and is accepted.
	if _, err := bind(`{"category_id":1,"name":"Nasi Goreng","price":1000}`); err != nil {
		t.Fatalf("omitted stock should be accepted: %v", err)
	}
	// Unlimited flag is independent of stock and accepted.
	req, err := bind(`{"category_id":1,"name":"Nasi Goreng","price":1000,"is_unlimited":true}`)
	if err != nil {
		t.Fatalf("unlimited product should be accepted: %v", err)
	}
	if req.IsUnlimited == nil || !*req.IsUnlimited {
		t.Fatal("is_unlimited should be parsed as true")
	}
	// Negative stock is rejected.
	if _, err := bind(`{"category_id":1,"name":"Nasi Goreng","price":1000,"stock":-1}`); err == nil {
		t.Fatal("negative stock should be rejected")
	}
}
