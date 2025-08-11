-- PostgreSQL Users Table DDL
-- Target schema matching the existing Drizzle schema structure

CREATE TABLE dpwtanbeeh.users (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    remarks VARCHAR(2000),
    is_valid BOOLEAN DEFAULT TRUE NOT NULL,
    biz_code VARCHAR(20) NOT NULL,
    region_code VARCHAR(20) NOT NULL,
    source_system VARCHAR(40) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    modified_by VARCHAR(100),
    updated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_type_code ON dpwtanbeeh.users(type, code);
CREATE INDEX idx_users_code ON dpwtanbeeh.users(code);
CREATE INDEX idx_users_type ON dpwtanbeeh.users(type);
CREATE INDEX idx_users_valid ON dpwtanbeeh.users(is_valid);
CREATE INDEX idx_users_created_at ON dpwtanbeeh.users(created_at);
CREATE INDEX idx_users_biz_region ON dpwtanbeeh.users(biz_code, region_code);

-- Constraints
CREATE UNIQUE INDEX users_type_code_unique_idx ON dpwtanbeeh.users(type, code);
ALTER TABLE dpwtanbeeh.users ADD CONSTRAINT chk_users_type 
    CHECK (type IN ('admin', 'standard', 'viewer', 'operator'));
ALTER TABLE dpwtanbeeh.users ADD CONSTRAINT chk_users_code_not_empty 
    CHECK (code IS NOT NULL AND LENGTH(TRIM(code)) > 0);