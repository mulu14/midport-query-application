-- Tenant Credentials Database Schema
-- SQLite schema for storing multi-tenant ION API credentials
-- Author: Mulugeta Forsido
-- Date: October 2025

-- Table for storing tenant credentials
CREATE TABLE IF NOT EXISTS tenant_credentials (
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
    ln_company TEXT,
    ln_identity TEXT,
    
    -- Encrypted sensitive fields (individually encrypted)
    encrypted_client_id TEXT NOT NULL,
    encrypted_client_secret TEXT NOT NULL,
    encrypted_service_account_access_key TEXT NOT NULL,
    encrypted_service_account_secret_key TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_credentials_tenant_name ON tenant_credentials(tenant_name);
CREATE INDEX IF NOT EXISTS idx_tenant_credentials_is_active ON tenant_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_credentials_created_at ON tenant_credentials(created_at);

-- Table for storing tenant connection status and health checks
CREATE TABLE IF NOT EXISTS tenant_health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('connected', 'disconnected', 'error', 'testing')),
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_credentials(id) ON DELETE CASCADE
);

-- Create index for health checks
CREATE INDEX IF NOT EXISTS idx_tenant_health_checks_tenant_id ON tenant_health_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_health_checks_checked_at ON tenant_health_checks(checked_at);

-- Table for storing OAuth2 tokens per tenant (optional - for caching)
CREATE TABLE IF NOT EXISTS tenant_oauth_tokens (
    tenant_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'Bearer',
    expires_at INTEGER NOT NULL, -- Unix timestamp
    refresh_token TEXT,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_credentials(id) ON DELETE CASCADE
);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tenant_credentials_timestamp 
    AFTER UPDATE ON tenant_credentials
BEGIN
    UPDATE tenant_credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

