-- Migration: Convert from JSON blob encryption to individual field encryption
-- This migration updates the tenant_configs table to store sensitive fields individually
-- Author: Mulugeta Forsido
-- Date: October 2025

-- First, backup the existing table
CREATE TABLE IF NOT EXISTS tenant_configs_backup AS SELECT * FROM tenant_configs;

-- Add new columns to existing table
ALTER TABLE tenant_configs ADD COLUMN identity_url TEXT;
ALTER TABLE tenant_configs ADD COLUMN portal_url_new TEXT;
ALTER TABLE tenant_configs ADD COLUMN tenant_id_new TEXT;
ALTER TABLE tenant_configs ADD COLUMN token_endpoint TEXT;
ALTER TABLE tenant_configs ADD COLUMN authorization_endpoint TEXT;
ALTER TABLE tenant_configs ADD COLUMN revoke_endpoint TEXT;
ALTER TABLE tenant_configs ADD COLUMN scope TEXT;
ALTER TABLE tenant_configs ADD COLUMN version TEXT;
ALTER TABLE tenant_configs ADD COLUMN client_name TEXT;
ALTER TABLE tenant_configs ADD COLUMN data_type TEXT;
ALTER TABLE tenant_configs ADD COLUMN ln_company TEXT;
ALTER TABLE tenant_configs ADD COLUMN ln_identity TEXT;
ALTER TABLE tenant_configs ADD COLUMN encrypted_client_id TEXT;
ALTER TABLE tenant_configs ADD COLUMN encrypted_client_secret TEXT;
ALTER TABLE tenant_configs ADD COLUMN encrypted_service_account_access_key TEXT;
ALTER TABLE tenant_configs ADD COLUMN encrypted_service_account_secret_key TEXT;

-- Note: Data migration will need to be handled by the application code
-- because we need to decrypt the JSON blob and re-encrypt individual fields

-- Create new table with correct schema (this will be the target)
CREATE TABLE IF NOT EXISTS tenant_configs_new (
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

-- Create indexes for new table
CREATE INDEX IF NOT EXISTS idx_tenant_configs_new_tenant_name ON tenant_configs_new(tenant_name);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_new_is_active ON tenant_configs_new(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_new_created_at ON tenant_configs_new(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_configs_new_tenant_id ON tenant_configs_new(tenant_id);

-- Create migration status table
CREATE TABLE IF NOT EXISTS migration_status (
    id INTEGER PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    started_at DATETIME,
    completed_at DATETIME,
    error_message TEXT
);

-- Record this migration
INSERT OR IGNORE INTO migration_status (migration_name, status) 
VALUES ('001_individual_field_encryption', 'pending');