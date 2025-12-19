CREATE TABLE IF NOT EXISTS pending_agent_assignments (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  agent_email VARCHAR(255) NOT NULL,
  campaign_id UUID,
  template_sid VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  assigned BOOLEAN DEFAULT FALSE NOT NULL,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_assignments_phone ON pending_agent_assignments(phone);
CREATE INDEX IF NOT EXISTS idx_pending_assignments_active ON pending_agent_assignments(expires_at, assigned);
CREATE INDEX IF NOT EXISTS idx_pending_assignments_agent ON pending_agent_assignments(agent_email);
