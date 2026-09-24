package fcm

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

// TestSendExercises the OAuth2 assertion flow and message delivery against a
// fake Google endpoint, verifying the signed JWT, the bearer token, and the
// FCM payload shape.
func TestSend(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	pemKey := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})

	const projectID = "qrdigo-proj"
	const email = "push@qrdigo-proj.iam.gserviceaccount.com"
	const fakeAccess = "ya29.fake-token"

	var gotAssertion, gotBearer string
	var gotPayload map[string]any

	tokenSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("token parse form: %v", err)
		}
		gotAssertion = r.PostForm.Get("assertion")
		if gotAssertion == "" {
			t.Error("assertion missing in token request")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"` + fakeAccess + `","expires_in":3600}`))
	}))
	defer tokenSrv.Close()

	fcmSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotBearer = r.Header.Get("Authorization")
		if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			t.Errorf("send content-type = %q", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Errorf("decode send body: %v", err)
		}
		_, _ = w.Write([]byte(`{"name":"projects/` + projectID + `/messages/1"}`))
	}))
	defer fcmSrv.Close()

	sa := map[string]string{
		"project_id":   projectID,
		"client_email": email,
		"private_key":  string(pemKey),
	}
	raw, _ := json.Marshal(sa)

	p, err := New(raw, nil)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	p.tokenURL = tokenSrv.URL
	p.fcmBase = fcmSrv.URL

	msg := Message{
		Token: "device-token-123",
		Title: "Order Baru · ORD-1",
		Body:  "Budi · Meja 3 · Rp 45000",
		Data:  map[string]string{"type": "order.new", "order_id": "7"},
	}
	if err := p.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send: %v", err)
	}

	claims := jwt.MapClaims{}
	if _, err := jwt.ParseWithClaims(gotAssertion, claims, func(tk *jwt.Token) (any, error) {
		if tk.Method != jwt.SigningMethodRS256 {
			t.Errorf("assertion alg = %v, want RS256", tk.Method.Alg())
		}
		return key.Public(), nil
	}); err != nil {
		t.Fatalf("parse assertion: %v", err)
	}
	if claims["iss"] != email {
		t.Errorf("assertion iss = %v, want %q", claims["iss"], email)
	}

	if gotBearer != "Bearer "+fakeAccess {
		t.Errorf("authorization = %q, want Bearer token from token endpoint", gotBearer)
	}

	m, ok := gotPayload["message"].(map[string]any)
	if !ok {
		t.Fatalf("payload missing message: %#v", gotPayload)
	}
	if m["token"] != msg.Token {
		t.Errorf("message.token = %v, want %q", m["token"], msg.Token)
	}
	notif := m["notification"].(map[string]any)
	if notif["title"] != msg.Title || notif["body"] != msg.Body {
		t.Errorf("notification mismatch: %#v", notif)
	}
	if m["data"].(map[string]any)["type"] != "order.new" {
		t.Errorf("data mismatch: %#v", m["data"])
	}
}