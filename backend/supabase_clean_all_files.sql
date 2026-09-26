-- ==============================================================================
-- Supabase 파일 및 이미지/PDF 참조 데이터 전면 초기화 스크립트
-- 목적: 배포 환경(Hugging Face)에 없는 로컬 파일 404 에러를 방지하고,
--       배포 환경에서 신규 파일/이미지/PDF를 깨끗하게 등록할 수 있도록 기존 파일 데이터를 초기화합니다.
-- ==============================================================================

BEGIN;

-- 1. DB 파일 바이너리 캐시 테이블 초기화
TRUNCATE TABLE "stored_files" CASCADE;

-- 2. 제품(Products) 관련 이미지 및 PDF 인증서 초기화
-- 2-1. 제품 서브 이미지 및 패키징 인증서 컬렉션 테이블
TRUNCATE TABLE "product_images" CASCADE;
TRUNCATE TABLE "product_packaging_certificates" CASCADE;

-- 2-2. 제품 마스터의 대표 이미지 및 표준서/MSDS/기능성보고서/유통기한설정서 PDF 경로 초기화
UPDATE "products"
SET "image_path" = NULL,
    "cert_standard" = NULL,
    "cert_msds" = NULL,
    "cert_function" = NULL,
    "cert_expiry" = NULL,
    "certificate_path" = NULL
WHERE "image_path" IS NOT NULL
   OR "cert_standard" IS NOT NULL
   OR "cert_msds" IS NOT NULL
   OR "cert_function" IS NOT NULL
   OR "cert_expiry" IS NOT NULL
   OR "certificate_path" IS NOT NULL;

-- 3. 포장사양서(Packaging Specifications) 관련 이미지 초기화
-- 3-1. 포장 작업 순서(Method) 이미지 테이블
TRUNCATE TABLE "packaging_method_images" CASCADE;

-- 3-2. 사양서 본문의 인박스/아웃박스/팔레트 레이아웃 및 착인 위치 이미지 초기화
UPDATE "packaging_specifications"
SET "outbox_layout_image" = NULL,
    "marking_location_image" = NULL,
    "inbox_layout_image" = NULL,
    "outbox_layout_image_file" = NULL,
    "pallet_layout_image" = NULL,
    "packaging_method_image" = NULL
WHERE "outbox_layout_image" IS NOT NULL
   OR "marking_location_image" IS NOT NULL
   OR "inbox_layout_image" IS NOT NULL
   OR "outbox_layout_image_file" IS NOT NULL
   OR "pallet_layout_image" IS NOT NULL
   OR "packaging_method_image" IS NOT NULL;

-- 3-3. 포장 자재 마스터(BOM) 이미지 초기화
UPDATE "master_packaging_materials"
SET "image_path" = NULL
WHERE "image_path" IS NOT NULL;

-- 3-4. 포장방법 템플릿 단계별 이미지 초기화
UPDATE "packaging_method_template_steps"
SET "image_url" = NULL
WHERE "image_url" IS NOT NULL;

-- 4. 품질 및 생산 감사(Production Audit) 사진 데이터 초기화
UPDATE "production_audit"
SET "container_images" = NULL,
    "box_images" = NULL,
    "load_images" = NULL
WHERE "container_images" IS NOT NULL
   OR "box_images" IS NOT NULL
   OR "load_images" IS NOT NULL;

-- 5. 클레임(Claims) 관련 사진 및 제조사 답변서 PDF 초기화
TRUNCATE TABLE "claim_photos" CASCADE;

UPDATE "claims"
SET "manufacturer_response_pdf" = NULL
WHERE "manufacturer_response_pdf" IS NOT NULL;

-- 6. 입고 검사(WMS Inbound) 성적서(COA) PDF 초기화
UPDATE "wms_inbound"
SET "coa_file_url" = NULL,
    "coa_file_url_eng" = NULL
WHERE "coa_file_url" IS NOT NULL
   OR "coa_file_url_eng" IS NOT NULL;

-- 7. 유통채널 특이사항(Channel Special Notes) 첨부 이미지 초기화
UPDATE "channel_special_notes"
SET "file_url" = NULL,
    "file_type" = NULL
WHERE "file_url" IS NOT NULL;

-- 8. 서류 제출 요청 로그(Document Request Logs) 파일 URL 초기화
UPDATE "document_request_logs"
SET "uploaded_file_url" = NULL
WHERE "uploaded_file_url" IS NOT NULL;

COMMIT;

-- 검증 조회 (모두 0건인지 확인)
SELECT 'stored_files' AS table_name, COUNT(*) AS count FROM "stored_files"
UNION ALL
SELECT 'product_images', COUNT(*) FROM "product_images"
UNION ALL
SELECT 'packaging_method_images', COUNT(*) FROM "packaging_method_images"
UNION ALL
SELECT 'claim_photos', COUNT(*) FROM "claim_photos"
UNION ALL
SELECT 'products_with_image', COUNT(*) FROM "products" WHERE "image_path" IS NOT NULL;
