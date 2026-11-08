-- V152: 팔레트 랩핑 3D 도면(스트레치 필름 및 팔레트 현품표 부착) 경로 및 뷰 상태 컬럼 추가
ALTER TABLE packaging_specifications ADD COLUMN pallet_wrapped_layout_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN pallet_wrapped_view_config TEXT;

