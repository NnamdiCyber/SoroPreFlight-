-- SoroPreFlight Enterprise Database Schema
-- PostgreSQL 16+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    sso_subject_id VARCHAR(255),
    sso_provider VARCHAR(50),
    roles TEXT[] NOT NULL DEFAULT '{viewer}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sso_subject ON users(sso_provider, sso_subject_id);

-- ============================================================
-- Workspaces
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- ============================================================
-- Workspace Members
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================
-- Simulation Reports
-- ============================================================
CREATE TABLE IF NOT EXISTS simulation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id VARCHAR(255) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES users(id),
    contract_id VARCHAR(56) NOT NULL,
    method VARCHAR(255) NOT NULL,
    network VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'ERROR')),
    summary TEXT,
    checks JSONB DEFAULT '[]',
    fee_estimate JSONB DEFAULT '{}',
    auth_results JSONB DEFAULT '[]',
    ai_analysis JSONB,
    raw_response JSONB,
    duration_ms INTEGER,
    git_commit_sha VARCHAR(40),
    environment VARCHAR(50),
    report_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_reports_workspace ON simulation_reports(workspace_id);
CREATE INDEX idx_simulation_reports_contract ON simulation_reports(contract_id);
CREATE INDEX idx_simulation_reports_created ON simulation_reports(created_at DESC);
CREATE INDEX idx_simulation_reports_status ON simulation_reports(status);

-- ============================================================
-- RBAC Policies
-- ============================================================
CREATE TABLE IF NOT EXISTS rbac_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
    allow_actions TEXT[] NOT NULL DEFAULT '{}',
    deny_actions TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE(workspace_id, role)
);

-- ============================================================
-- API Keys
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(8) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{simulate:read}',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================
-- Default RBAC policies
-- ============================================================
INSERT INTO rbac_policies (workspace_id, role, allow_actions, deny_actions) VALUES
    (NULL, 'owner',    '{*}'                                                , '{}'),
    (NULL, 'admin',    '{simulate:*,deploy:*,workspace:read,logs:*,users:*}', '{workspace:delete,workspace:invite}'),
    (NULL, 'developer','{simulate:*,deploy:simulate,logs:read}'             , '{workspace:*,users:*,logs:export}'),
    (NULL, 'viewer',   '{simulate:read,logs:read,reports:read}'             , '{simulate:write,deploy:*,workspace:*,users:*}')
ON CONFLICT DO NOTHING;
