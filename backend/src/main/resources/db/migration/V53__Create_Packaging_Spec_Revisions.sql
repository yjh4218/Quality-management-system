-- V53: Create Packaging Spec Revisions table to resolve missing schema for PackagingSpecRevision entity
CREATE TABLE IF NOT EXISTS packaging_spec_revisions (
    id BIGSERIAL PRIMARY KEY,
    spec_id BIGINT NOT NULL,
    revision_no INTEGER,
    content TEXT,
    revision_date DATE,
    revision_author VARCHAR(255)
);

-- spec_id 조회 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_pkg_spec_revisions_spec_id ON packaging_spec_revisions(spec_id);
