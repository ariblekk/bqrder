package fcm

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Message is a single device push notification.
type Message struct {
	Token string
	Title string
	Body  string
	Data  map[string]string
}

const (
	defaultTokenURL = "https://oauth2.googleapis.com/token"
	defaultFCMBase  = "https://fcm.googleapis.com"
	fcmScope        = "https://www.googleapis.com/auth/firebase.messaging"
)

// Push sends notifications through the FCM HTTP v1 API using a Firebase
// service account. Sensitive credential data lives only here, in the backend.
type Push struct {
	projectID   string
	clientEmail string
	key         *rsa.PrivateKey
	hc          *http.Client
	token       string
	tokenExp    time.Time
	tokenURL    string
	fcmBase     string
	logf        func(string, ...any)
}

// New parses a Firebase service account JSON and returns a ready Push client.
// logf is used for credential-refresh errors; it may be nil.
func New(credentialsJSON []byte, logf func(string, ...any)) (*Push, error) {
	var sa struct {
		ProjectID   string `json:"project_id"`
		ClientEmail string `json:"client_email"`
		PrivateKey  string `json:"private_key"`
	}
	if err := json.Unmarshal(credentialsJSON, &sa); err != nil {
		return nil, fmt.Errorf("parse service account: %w", err)
	}
	if sa.ProjectID == "" || sa.ClientEmail == "" || sa.PrivateKey == "" {
		return nil, errors.New("service account missing project_id, client_email, or private_key")
	}
	key, err := parsePrivateKey(sa.PrivateKey)
	if err != nil {
		return nil, err
	}
	return &Push{
		projectID:   sa.ProjectID,
		clientEmail: sa.ClientEmail,
		key:         key,
		hc:          &http.Client{Timeout: 10 * time.Second},
		tokenURL:    defaultTokenURL,
		fcmBase:     defaultFCMBase,
		logf:        logf,
	}, nil
}

func parsePrivateKey(pemStr string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, errors.New("service account private_key is not PEM")
	}
	if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		if rk, ok := key.(*rsa.PrivateKey); ok {
			return rk, nil
		}
		return nil, errors.New("service account private_key is not an RSA key")
	}
	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse private_key: %w", err)
	}
	return key, nil
}

// accessToken returns a cached OAuth2 access token, minting a new one via a
// signed JWT assertion when the cached copy is about to expire.
func (p *Push) accessToken(ctx context.Context) (string, error) {
	if p.token != "" && time.Until(p.tokenExp) > time.Minute {
		return p.token, nil
	}
	claims := jwt.MapClaims{
		"iss":   p.clientEmail,
		"scope": fcmScope,
		"aud":   p.tokenURL,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
	assertion, err := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(p.key)
	if err != nil {
		return "", fmt.Errorf("sign assertion: %w", err)
	}
	form := url.Values{}
	form.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	form.Set("assertion", assertion)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := p.hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("request access token: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("access token endpoint returned %d", res.StatusCode)
	}
	var body struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return "", fmt.Errorf("decode access token: %w", err)
	}
	if body.AccessToken == "" {
		return "", errors.New("access token endpoint returned no token")
	}
	p.token = body.AccessToken
	p.tokenExp = time.Now().Add(time.Duration(body.ExpiresIn) * time.Second)
	return p.token, nil
}

// Send pushes one message to one device and blocks until FCM responds.
func (p *Push) Send(ctx context.Context, msg Message) error {
	token, err := p.accessToken(ctx)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"message": map[string]any{
			"token": msg.Token,
			"notification": map[string]string{
				"title": msg.Title,
				"body":  msg.Body,
			},
			"data": msg.Data,
		},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/v1/projects/%s/messages:send", p.fcmBase, p.projectID),
		bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := p.hc.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return fmt.Errorf("fcm returned %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

// log logs through logf if set, otherwise silently drops (send is best-effort).
func (p *Push) log(format string, args ...any) {
	if p.logf != nil {
		p.logf(format, args...)
	}
}