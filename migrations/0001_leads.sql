-- wvrevive W7: lead log for wisevision.tech forms.
-- Retention: 24 months (see privacy notice). Controller: WiseVision. Deletion via hello@wisevision.tech.

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY,
  ts         TEXT    NOT NULL,                       -- ISO-8601 UTC
  form       TEXT    CHECK (form IN ('early-access', 'contact', 'demo')),
  email      TEXT    NOT NULL,
  org        TEXT,
  role       TEXT,
  use_case   TEXT,
  consent    INTEGER NOT NULL CHECK (consent = 1),
  ip_hash    TEXT    NOT NULL,                       -- SHA-256(ip + daily salt); raw IP is never stored
  ua         TEXT,
  dedupe_key TEXT    UNIQUE                          -- SHA-256(email|form|UTC day): race-safe duplicate guard
);

CREATE INDEX IF NOT EXISTS idx_leads_ts    ON leads (ts);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);

-- Every POST that reaches the handler is counted here, so the rate limit also
-- applies to rejected (invalid / bot) attempts. Rows older than 24 h are pruned by the handler.
CREATE TABLE IF NOT EXISTS lead_attempts (
  id      INTEGER PRIMARY KEY,
  ts      TEXT NOT NULL,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_attempts_ip_ts ON lead_attempts (ip_hash, ts);
