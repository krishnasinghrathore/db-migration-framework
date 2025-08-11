-- Vertica Users Table DDL
-- This is an example of how to structure your Vertica DDL files

CREATE TABLE public.users (
    user_id IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT NOW(),
    created_by_user VARCHAR(100) NOT NULL,
    modified_date TIMESTAMP,
    modified_by_user VARCHAR(100),
    business_code VARCHAR(20) NOT NULL,
    region_code VARCHAR(20) NOT NULL,
    source_system VARCHAR(40) NOT NULL DEFAULT 'vertica',
    remarks VARCHAR(2000)
);

-- Indexes
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_type ON public.users(user_type);
CREATE INDEX idx_users_active ON public.users(is_active);
CREATE INDEX idx_users_created ON public.users(created_date);

-- Constraints
ALTER TABLE public.users ADD CONSTRAINT uk_users_username UNIQUE (username);
ALTER TABLE public.users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE public.users ADD CONSTRAINT chk_users_type 
    CHECK (user_type IN ('admin', 'standard', 'viewer', 'operator'));