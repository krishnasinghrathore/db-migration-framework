-- =====================================================
-- POSTGRESQL COMPLETE SCHEMA DUMP
-- =====================================================
-- Place your complete PostgreSQL database schema here
-- You can generate this using pg_dump or your preferred PostgreSQL tool
-- 
-- Example command to generate schema dump:
-- pg_dump -h your-postgres-host -U username -d database_name --schema-only > full-schema.sql
-- or for specific schema:
-- pg_dump -h your-postgres-host -U username -d database_name --schema-only --schema=dpwtanbeeh > full-schema.sql
--
-- This file should contain:
-- 1. All table definitions (CREATE TABLE statements)
-- 2. All indexes (CREATE INDEX statements)  
-- 3. All constraints (ALTER TABLE ... ADD CONSTRAINT statements)
-- 4. All views (CREATE VIEW statements)
-- 5. All sequences (CREATE SEQUENCE statements)
-- 6. All foreign key relationships
-- 7. All functions and triggers (if any)
-- =====================================================

-- PASTE YOUR COMPLETE POSTGRESQL SCHEMA BELOW THIS LINE
-- =====================================================

-- dpwtanbeeh.collections definition

-- Drop table

-- DROP TABLE dpwtanbeeh.collections;

CREATE TABLE dpwtanbeeh.collections (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	description varchar(255) NULL,
	is_valid bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT collections_code_unique UNIQUE (code),
	CONSTRAINT collections_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.configurations definition

-- Drop table

-- DROP TABLE dpwtanbeeh.configurations;

CREATE TABLE dpwtanbeeh.configurations (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	desc1 varchar(200) NOT NULL,
	desc2 varchar(500) NULL,
	category varchar(50) NULL,
	remarks varchar(2000) NULL,
	valid_from varchar(10) NOT NULL,
	valid_to varchar(10) NOT NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT configurations_code_unique UNIQUE (code),
	CONSTRAINT configurations_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.messages definition

-- Drop table

-- DROP TABLE dpwtanbeeh.messages;

CREATE TABLE dpwtanbeeh.messages (
	id bigserial NOT NULL,
	conversation_id text NOT NULL,
	"content" text NOT NULL,
	"type" public."message_type" NOT NULL,
	sender text NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.modules definition

-- Drop table

-- DROP TABLE dpwtanbeeh.modules;

CREATE TABLE dpwtanbeeh.modules (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	description varchar(255) NULL,
	is_valid bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT modules_code_unique UNIQUE (code),
	CONSTRAINT modules_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.notification_triggers definition

-- Drop table

-- DROP TABLE dpwtanbeeh.notification_triggers;

CREATE TABLE dpwtanbeeh.notification_triggers (
	id bigserial NOT NULL,
	"name" varchar(255) NOT NULL,
	description varchar(255) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT notification_triggers_name_unique UNIQUE (name),
	CONSTRAINT notification_triggers_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.notifications definition

-- Drop table

-- DROP TABLE dpwtanbeeh.notifications;

CREATE TABLE dpwtanbeeh.notifications (
	id bigserial NOT NULL,
	title text NOT NULL,
	message text NOT NULL,
	link text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.roles definition

-- Drop table

-- DROP TABLE dpwtanbeeh.roles;

CREATE TABLE dpwtanbeeh.roles (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	description varchar(255) NULL,
	is_valid bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT roles_code_unique UNIQUE (code),
	CONSTRAINT roles_pkey PRIMARY KEY (id)
);


-- dpwtanbeeh.streaming_users definition

-- Drop table

-- DROP TABLE dpwtanbeeh.streaming_users;

CREATE TABLE dpwtanbeeh.streaming_users (
	id bigserial NOT NULL,
	username varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" public."role" NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT streaming_users_pkey PRIMARY KEY (id),
	CONSTRAINT streaming_users_username_unique UNIQUE (username)
);


-- dpwtanbeeh.users definition

-- Drop table

-- DROP TABLE dpwtanbeeh.users;

CREATE TABLE dpwtanbeeh.users (
	id bigserial NOT NULL,
	"type" varchar(50) NOT NULL,
	code varchar(100) NOT NULL,
	description varchar(200) NULL,
	remarks varchar(2000) NULL,
	is_valid bool DEFAULT true NOT NULL,
	biz_code varchar(20) NOT NULL,
	region_code varchar(20) NOT NULL,
	source_system varchar(40) NOT NULL,
	created_by varchar(100) NOT NULL,
	created_at timestamp NOT NULL,
	modified_by varchar(100) NULL,
	updated_at timestamp NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX users_type_code_unique_idx ON dpwtanbeeh.users USING btree (type, code);


-- dpwtanbeeh.audit_trails definition

-- Drop table

-- DROP TABLE dpwtanbeeh.audit_trails;

CREATE TABLE dpwtanbeeh.audit_trails (
	id bigserial NOT NULL,
	"action" varchar(255) NOT NULL,
	table_name varchar(255) NOT NULL,
	record_id varchar(255) NULL,
	old_data jsonb NULL,
	new_data jsonb NULL,
	user_id int8 NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT audit_trails_pkey PRIMARY KEY (id),
	CONSTRAINT audit_trails_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES dpwtanbeeh.users(id)
);


-- dpwtanbeeh.categories definition

-- Drop table

-- DROP TABLE dpwtanbeeh.categories;

CREATE TABLE dpwtanbeeh.categories (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(30) NOT NULL,
	description varchar(255) NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	parent_id int8 NULL,
	is_valid bool DEFAULT true NOT NULL,
	biz_code varchar(20) NOT NULL,
	rgn_code varchar(20) NOT NULL,
	src_sys varchar(40) NOT NULL,
	created_by varchar(100) NOT NULL,
	created_date timestamp NOT NULL,
	modified_by varchar(100) NULL,
	modified_date timestamp NULL,
	CONSTRAINT categories_code_unique UNIQUE (code),
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES dpwtanbeeh.categories(id)
);


-- dpwtanbeeh.menu_configs definition

-- Drop table

-- DROP TABLE dpwtanbeeh.menu_configs;

CREATE TABLE dpwtanbeeh.menu_configs (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	icon varchar(255) NULL,
	"path" varchar(255) NULL,
	parent_id int8 NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	is_valid bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT menu_configs_code_unique UNIQUE (code),
	CONSTRAINT menu_configs_pkey PRIMARY KEY (id),
	CONSTRAINT menu_configs_parent_id_menu_configs_id_fk FOREIGN KEY (parent_id) REFERENCES dpwtanbeeh.menu_configs(id)
);


-- dpwtanbeeh.notification_logs definition

-- Drop table

-- DROP TABLE dpwtanbeeh.notification_logs;

CREATE TABLE dpwtanbeeh.notification_logs (
	id bigserial NOT NULL,
	notification_id int8 NOT NULL,
	user_id int8 NOT NULL,
	"read" bool DEFAULT false NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
	CONSTRAINT notification_logs_notification_id_notifications_id_fk FOREIGN KEY (notification_id) REFERENCES dpwtanbeeh.notifications(id),
	CONSTRAINT notification_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES dpwtanbeeh.users(id)
);


-- dpwtanbeeh.role_to_menu_configs definition

-- Drop table

-- DROP TABLE dpwtanbeeh.role_to_menu_configs;

CREATE TABLE dpwtanbeeh.role_to_menu_configs (
	role_id int8 NOT NULL,
	menu_config_id int8 NOT NULL,
	CONSTRAINT role_to_menu_configs_role_id_menu_config_id_pk PRIMARY KEY (role_id, menu_config_id),
	CONSTRAINT role_to_menu_configs_menu_config_id_menu_configs_id_fk FOREIGN KEY (menu_config_id) REFERENCES dpwtanbeeh.menu_configs(id),
	CONSTRAINT role_to_menu_configs_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES dpwtanbeeh.roles(id)
);


-- dpwtanbeeh.user_to_roles definition

-- Drop table

-- DROP TABLE dpwtanbeeh.user_to_roles;

CREATE TABLE dpwtanbeeh.user_to_roles (
	user_id int8 NOT NULL,
	role_id int8 NOT NULL,
	CONSTRAINT user_to_roles_user_id_role_id_pk PRIMARY KEY (user_id, role_id),
	CONSTRAINT user_to_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES dpwtanbeeh.roles(id),
	CONSTRAINT user_to_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES dpwtanbeeh.users(id)
);


-- dpwtanbeeh.cameras definition

-- Drop table

-- DROP TABLE dpwtanbeeh.cameras;

CREATE TABLE dpwtanbeeh.cameras (
	id bigserial NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	description varchar(255) NULL,
	http_uri varchar(255) NULL,
	rtsp_uri varchar(255) NULL,
	fps_target int4 DEFAULT 30 NOT NULL,
	rcis_lane_id varchar(50) NULL,
	"location" varchar(255) NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	category_id int8 NULL,
	is_valid bool DEFAULT true NOT NULL,
	biz_code varchar(20) NOT NULL,
	rgn_code varchar(20) NOT NULL,
	src_sys varchar(40) NOT NULL,
	created_by varchar(100) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	modified_by varchar(100) NULL,
	modified_date timestamp NULL,
	"server" varchar(255) NULL,
	streaming bool DEFAULT false NULL,
	CONSTRAINT cameras_code_unique UNIQUE (code),
	CONSTRAINT cameras_pkey PRIMARY KEY (id),
	CONSTRAINT cameras_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES dpwtanbeeh.categories(id)
);


-- dpwtanbeeh.face_details definition

-- Drop table

-- DROP TABLE dpwtanbeeh.face_details;

CREATE TABLE dpwtanbeeh.face_details (
	id bigserial NOT NULL,
	camera_id int8 NULL,
	face_id varchar(255) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT face_details_pkey PRIMARY KEY (id),
	CONSTRAINT face_details_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id)
);


-- dpwtanbeeh.incident_details definition

-- Drop table

-- DROP TABLE dpwtanbeeh.incident_details;

CREATE TABLE dpwtanbeeh.incident_details (
	id bigserial NOT NULL,
	camera_id int8 NULL,
	"type" varchar(255) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT incident_details_pkey PRIMARY KEY (id),
	CONSTRAINT incident_details_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id)
);


-- dpwtanbeeh.ppe_details definition

-- Drop table

-- DROP TABLE dpwtanbeeh.ppe_details;

CREATE TABLE dpwtanbeeh.ppe_details (
	id bigserial NOT NULL,
	camera_id int8 NULL,
	person_id varchar(255) NOT NULL,
	has_helmet bool NOT NULL,
	has_vest bool NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT ppe_details_pkey PRIMARY KEY (id),
	CONSTRAINT ppe_details_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id)
);


-- dpwtanbeeh.role_camera_accesses definition

-- Drop table

-- DROP TABLE dpwtanbeeh.role_camera_accesses;

CREATE TABLE dpwtanbeeh.role_camera_accesses (
	role_id int8 NOT NULL,
	camera_id int8 NOT NULL,
	access_level varchar(255) NOT NULL,
	CONSTRAINT role_camera_accesses_role_id_camera_id_pk PRIMARY KEY (role_id, camera_id),
	CONSTRAINT role_camera_accesses_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id),
	CONSTRAINT role_camera_accesses_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES dpwtanbeeh.roles(id)
);


-- dpwtanbeeh.role_to_cameras definition

-- Drop table

-- DROP TABLE dpwtanbeeh.role_to_cameras;

CREATE TABLE dpwtanbeeh.role_to_cameras (
	role_id int8 NOT NULL,
	camera_id int8 NOT NULL,
	CONSTRAINT role_to_cameras_role_id_camera_id_pk PRIMARY KEY (role_id, camera_id),
	CONSTRAINT role_to_cameras_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id),
	CONSTRAINT role_to_cameras_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES dpwtanbeeh.roles(id)
);


-- dpwtanbeeh.traffic_details definition

-- Drop table

-- DROP TABLE dpwtanbeeh.traffic_details;

CREATE TABLE dpwtanbeeh.traffic_details (
	id bigserial NOT NULL,
	camera_id int8 NULL,
	"type" varchar(255) NOT NULL,
	count int4 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT traffic_details_pkey PRIMARY KEY (id),
	CONSTRAINT traffic_details_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id)
);


-- dpwtanbeeh.camera_to_collections definition

-- Drop table

-- DROP TABLE dpwtanbeeh.camera_to_collections;

CREATE TABLE dpwtanbeeh.camera_to_collections (
	camera_id int8 NOT NULL,
	collection_id int8 NOT NULL,
	CONSTRAINT camera_to_collections_camera_id_collection_id_pk PRIMARY KEY (camera_id, collection_id),
	CONSTRAINT camera_to_collections_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id),
	CONSTRAINT camera_to_collections_collection_id_collections_id_fk FOREIGN KEY (collection_id) REFERENCES dpwtanbeeh.collections(id)
);


-- dpwtanbeeh.camera_to_modules definition

-- Drop table

-- DROP TABLE dpwtanbeeh.camera_to_modules;

CREATE TABLE dpwtanbeeh.camera_to_modules (
	camera_id int8 NOT NULL,
	module_id int8 NOT NULL,
	CONSTRAINT camera_to_modules_camera_id_module_id_pk PRIMARY KEY (camera_id, module_id),
	CONSTRAINT camera_to_modules_camera_id_cameras_id_fk FOREIGN KEY (camera_id) REFERENCES dpwtanbeeh.cameras(id),
	CONSTRAINT camera_to_modules_module_id_modules_id_fk FOREIGN KEY (module_id) REFERENCES dpwtanbeeh.modules(id)
);

-- =====================================================
-- END OF SCHEMA DUMP
-- =====================================================

-- INSTRUCTIONS:
-- 1. Replace the example content above with your actual PostgreSQL schema
-- 2. Make sure to include all tables, indexes, constraints, and views
-- 3. Preserve the exact column names, data types, and constraints
-- 4. Include the dpwtanbeeh schema prefix as shown in your Drizzle configuration
-- 5. Save this file after pasting your schema

-- TIPS FOR GENERATING SCHEMA DUMP:
-- 
-- Method 1 - Using pg_dump command line:
-- pg_dump -h hostname -p port -U username -d database --schema-only --schema=dpwtanbeeh > full-schema.sql
--
-- Method 2 - Using pg_dump for all schemas:
-- pg_dump -h hostname -p port -U username -d database --schema-only > full-schema.sql
--
-- Method 3 - Using psql to get table definitions:
-- psql -h hostname -p port -U username -d database -c "
-- SELECT 'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
--        array_to_string(array_agg(column_name || ' ' || data_type ||
--        CASE WHEN character_maximum_length IS NOT NULL 
--             THEN '(' || character_maximum_length || ')' 
--             ELSE '' END ||
--        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END), ', ') ||
--        ');' as ddl
-- FROM information_schema.columns 
-- WHERE table_schema = 'dpwtanbeeh'
-- GROUP BY schemaname, tablename;
-- "
--
-- Method 4 - Using pgAdmin or DBeaver:
-- 1. Connect to PostgreSQL database
-- 2. Right-click on dpwtanbeeh schema -> Generate SQL -> DDL
-- 3. Copy the generated DDL script
--
-- Method 5 - Export from your existing Drizzle setup:
-- If you're using Drizzle, you can use:
-- npx drizzle-kit introspect:pg --config=drizzle.config.ts
-- This will generate schema files that you can convert to SQL