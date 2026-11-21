-- QMS Performance Optimization Indexes
-- 1. Enable pg_trgm extension for GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. B-Tree Indexes for sorting, filtering, and foreign key traversals
-- Products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created ON products (active, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_dimensions_status ON products (status);

-- Claims
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_receipt_mfr ON claims (receipt_date DESC, manufacturer);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_status_receipt ON claims (status, receipt_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_product_id ON claims (product_id);

-- NCR Reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ncr_status_created ON ncr_reports (status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ncr_product_id ON ncr_reports (product_id);

-- CAPA Records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capa_status_target ON capa_records (status, target_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_capa_source ON capa_records (source_type, source_id);

-- Change Requests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cr_status_created ON change_requests (status, created_at DESC);

-- Complaint Safety Evaluations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cse_status_date ON complaint_safety_evaluations (evaluation_status, evaluation_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cse_claim_id ON complaint_safety_evaluations (claim_id);

-- Approval Documents & Step Instances
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_status_created ON approval_documents (status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_submitted_status ON approval_documents (submitted_by, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_document_order ON approval_step_instances (document_id, step_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_assignee_status ON approval_step_instances (assignee_user_id, status);

-- Notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications (target_username, is_read, created_at DESC);

-- Audit & Access Logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_modified_action ON audit_logs (modified_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_created ON access_logs (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_username ON access_logs (username);

-- Integration & Mail Dispatch
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_sent_status ON mail_dispatch_histories (sent_at DESC, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_integration_created ON external_integration_logs (created_at DESC);

-- 3. GIN Full-Text Search Indexes for ILIKE optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_product_name_gin ON products USING gin (product_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_english_name_gin ON products USING gin (english_product_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_ingredients_gin ON products USING gin (ingredients gin_trgm_ops);
