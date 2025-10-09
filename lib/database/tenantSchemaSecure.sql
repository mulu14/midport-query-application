-- Secure Tenant Configuration Database Schema
-- SQLite schema for storing multi-tenant ION API credentials with individual field encryption
-- Author: Mulugeta Forsido
-- Date: October 2025
-- Security: Each sensitive field is encrypted individually

-- Table for storing tenant configurations with separate encrypted columns
CREATE TABLE IF NOT EXISTS tenant_configs_secure (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    environment_version TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Non-sensitive ION API configuration (plain text)
    identity_url TEXT,
    portal_url TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    token_endpoint TEXT,
    authorization_endpoint TEXT,
    revoke_endpoint TEXT,
    scope TEXT,
    version TEXT,
    client_name TEXT,
    data_type TEXT,
    
    -- Encrypted sensitive fields (individually encrypted)
    encrypted_client_id TEXT NOT NULL,
    encrypted_client_secret TEXT NOT NULL,
    encrypted_service_account_access_key TEXT NOT NULL,
    encrypted_service_account_secret_key TEXT NOT NULL,
    
    -- Optional Infor LN headers (encrypted if provided)
    encrypted_ln_company TEXT,
    encrypted_ln_identity TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_configs_secure_tenant_name ON tenant_configs_secure(tenant_name);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_secure_is_active ON tenant_configs_secure(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_secure_created_at ON tenant_configs_secure(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_secure_tenant_id ON tenant_configs_secure(tenant_id);

-- Table for storing tenant connection status and health checks
CREATE TABLE IF NOT EXISTS tenant_health_checks_secure (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('connected', 'disconnected', 'error', 'testing')),
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs_secure(id) ON DELETE CASCADE
);

-- Create index for health checks
CREATE INDEX IF NOT EXISTS idx_tenant_health_checks_secure_tenant_id ON tenant_health_checks_secure(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_health_checks_secure_checked_at ON tenant_health_checks_secure(checked_at);

-- Table for storing OAuth2 tokens per tenant (tokens are sensitive - encrypt them)
CREATE TABLE IF NOT EXISTS tenant_oauth_tokens_secure (
    tenant_id TEXT PRIMARY KEY,
    encrypted_access_token TEXT NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'Bearer',
    expires_at INTEGER NOT NULL, -- Unix timestamp
    encrypted_refresh_token TEXT,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs_secure(id) ON DELETE CASCADE
);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tenant_configs_secure_timestamp 
    AFTER UPDATE ON tenant_configs_secure
BEGIN
    UPDATE tenant_configs_secure SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Migration table to track schema versions
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Record this schema version
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES (2, 'Secure tenant configuration schema with individual field encryption');