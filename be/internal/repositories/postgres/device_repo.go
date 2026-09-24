package postgres

import (
	"be/internal/domain/repositories"
)

type DeviceRepo struct {
	q Querier
}

func NewDeviceRepo(q Querier) repositories.DeviceRepository {
	return &DeviceRepo{q: q}
}

// Upsert registers a device token. A token reused by another user (e.g. after
// logout/login on the same phone) is re-assigned to the current owner.
func (r *DeviceRepo) Upsert(userID int, token, platform string) error {
	_, err := r.q.Exec(`
		INSERT INTO device_tokens (user_id, token, platform, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (token) DO UPDATE SET user_id = $1, platform = $3
	`, userID, token, platform)
	return err
}

func (r *DeviceRepo) Remove(token string) error {
	_, err := r.q.Exec(`DELETE FROM device_tokens WHERE token = $1`, token)
	return err
}

func (r *DeviceRepo) TokensByBranch(branchID int) ([]string, error) {
	rows, err := r.q.Query(`
		SELECT dt.token
		FROM device_tokens dt
		JOIN users u ON u.id = dt.user_id
		WHERE u.branch_id = $1 AND u.is_active
	`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tokens := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}