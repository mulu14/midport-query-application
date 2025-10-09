-- Tenant Configuration Database Schema
-- SQLite schema for storing multi-tenant ION API credentials
-- Author: Mulugeta Forsido
-- Date: October 2025

-- Table for storing tenant configurations
CREATE TABLE IF NOT EXISTS tenant_configs (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    environment_version TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Encrypted ION API configuration (JSON string)
    encrypted_ion_config TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_name ON tenant_configs(tenant_name);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_is_active ON tenant_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_created_at ON tenant_configs(created_at);

-- Table for storing tenant connection status and health checks
CREATE TABLE IF NOT EXISTS tenant_health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('connected', 'disconnected', 'error', 'testing')),
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(id) ON DELETE CASCADE
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
    
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(id) ON DELETE CASCADE
);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tenant_configs_timestamp 
    AFTER UPDATE ON tenant_configs
BEGIN
    UPDATE tenant_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Sample data structure (commented out - will be inserted via code)
/*
INSERT INTO tenant_configs (
    id, 
    tenant_name, 
    display_name, 
    environment_version,
    encrypted_ion_config
) VALUES (
    'tenant_001',
    'MIDPORT_DEM',
    'Midport Demo Environment',
    'V1480769020',
    'encrypted_json_configuration_here'
);
*/