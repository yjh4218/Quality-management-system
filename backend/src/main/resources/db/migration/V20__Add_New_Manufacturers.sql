-- V20: 신규 제조사 추가 (컬럼명 엔티티 구조에 맞게 수정)
INSERT INTO manufacturers (identification_code, manufacturer_code, name, category, contact_person, phone_number, email, active) 
VALUES ('M-2026-001', 'M-2026-001', '글로벌 코스메틱', '화장품', '이영희', '010-1234-5678', 'global@example.com', true);

INSERT INTO manufacturers (identification_code, manufacturer_code, name, category, contact_person, phone_number, email, active) 
VALUES ('M-2026-002', 'M-2026-002', '퓨어 네이처', '화장품', '손흥민', '010-9876-5432', 'pure@example.com', true);

INSERT INTO manufacturers (identification_code, manufacturer_code, name, category, contact_person, phone_number, email, active) 
VALUES ('M-2026-003', 'M-2026-003', '에코 펫푸드', '반려동물 제품', '차두리', '010-5555-4444', 'echo@example.com', true);
