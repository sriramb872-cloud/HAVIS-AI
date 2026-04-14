-- 02_rate_limit.sql
CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    route TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, route, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits (client_id, route, window_start);

CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_client_id TEXT,
    p_route TEXT,
    p_window_start TIMESTAMPTZ,
    p_max_requests INT
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INT;
BEGIN
    INSERT INTO rate_limits (client_id, route, window_start, request_count)
    VALUES (p_client_id, p_route, p_window_start, 1)
    ON CONFLICT (client_id, route, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO current_count;

    IF current_count > p_max_requests THEN
        RETURN TRUE; -- Rate limited
    ELSE
        RETURN FALSE; -- Not limited
    END IF;
END;
$$ LANGUAGE plpgsql;
