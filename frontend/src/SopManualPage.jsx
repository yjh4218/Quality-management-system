import React, { useState, useMemo } from 'react';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';

/**
 * 📖 표준 품질경영 매뉴얼 (Process Manual / SOP) 페이지 - SopManualPage
 * - 표준 QMS UI/UX 시스템 준수 (rules/ui-ux-guide.md & QMS-AI-RULES.md):
 *   1. 3단계 표준 헤더 레이아웃 (타이틀, 액션 버튼, 규제 요약 설명, RegulatoryManualBanner)
 *   2. 4종 KPI 요약 지표 카드 그리드 (전체 SOP, 최신 유효 개정판, 실무 화면 연동, 전자기록 무결성)
 *   3. 검색 필터 카드 (카테고리 선택, 키워드 검색, [초기화] outline 좌측, [조회] primary 우측)
 *   4. 좌우 2단 마스터-디테일 탐색기 (좌측: 목차 아코디언, 우측: 표준 서식 전문 리더)
 *   5. 브라우저 비의존적 100% 표준 인라인 스타일 & 디자인 토큰 적용
 */
const SOP_CATEGORIES = [
    {
        id: 'cat_general',
        title: '🏛️ 품질경영 일반 (General QMS)',
        items: [
            {
                id: 'SOP-QM-01',
                docNumber: 'QMS-SOP-001',
                revision: 'Rev. 3.0',
                effectiveDate: '2026-01-01',
                title: '품질경영시스템 개요 및 문서화 절차서',
                standard: 'ISO 13485:2016 §4.2 / ISO 22716 §3',
                targetDept: '전 부서',
                approver: '품질책임자 / 대표이사',
                summary: '품질매뉴얼, 절차서(SOP), 지침서(WI), 기록(Record)의 4단계 문서 구조와 작성, 검토, 승인, 개정 및 보존 연한을 규정합니다.',
                sections: [
                    { subtitle: '1. 목적 및 적용범위', text: '본 절차서는 당사에서 운영하는 화장품 및 의료기기 품질경영시스템의 문서화 체계를 확립하고, 문서의 라이프사이클(제정-개정-폐기)을 통제함을 목적으로 한다.' },
                    { subtitle: '2. 문서 계층 구조', text: '• 1계층: 품질매뉴얼 (품질방침 및 조직 기준)\n• 2계층: 표준운영절차서 (SOP: 부서간 업무 프로세스)\n• 3계층: 작업지침서 (WI: 세부 단위 실무 지침)\n• 4계층: 품질기록 및 양식 (Form & Records)' },
                    { subtitle: '3. 보존 및 감사추적', text: '모든 품질문서 및 승인 기록은 21 CFR Part 11 및 규정에 따라 최소 5년(의료기기 제품 수명 고려 시 최대 10년)간 전자 보존하며, 승인 없는 임의 수정 및 물리 삭제를 엄격히 금지한다.' }
                ],
                relatedPage: 'controlledDocuments',
                relatedPageName: '통제문서 및 개정관리(DMS) 화면'
            },
            {
                id: 'SOP-QM-02',
                docNumber: 'QMS-SOP-002',
                revision: 'Rev. 2.1',
                effectiveDate: '2026-02-15',
                title: '경영검토 및 품질방침 관리 절차서',
                standard: 'ISO 13485:2016 §5.6 / ISO 22716 §4',
                targetDept: '경영진, 품질보증팀',
                approver: '대표이사',
                summary: '품질시스템의 적합성, 적절성, 유효성을 보장하기 위해 연 1회 이상 정기 경영검토를 실시하고 후속 시정조치를 도출합니다.',
                sections: [
                    { subtitle: '1. 경영검토 주기', text: '대표이사는 연 1회(매년 12월) 정기 경영검토 회의를 소집하며, 중대 부적합이나 회수 발생 시 특별 경영검토를 즉시 소집한다.' },
                    { subtitle: '2. 검토 입력 사항', text: '심사 결과, 고객 피드백 및 클레임 동향, 공정 수행도 및 제품 적합성, 시정 및 예방조치(CAPA) 상태, 이전 경영검토 후속조치 등을 평가한다.' }
                ]
            }
        ]
    },
    {
        id: 'cat_medical',
        title: '🩺 의료기기 규제 표준 (ISO 13485 & MDR)',
        items: [
            {
                id: 'SOP-MD-01',
                docNumber: 'QMS-SOP-MD-001',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-01',
                title: '의료기기 품목 마스터 및 UDI 관리 절차서',
                standard: 'ISO 13485:2016 §7.3, §7.5 / 의료기기법 제6조',
                targetDept: 'RA팀, 품질보증팀, 생산관리팀',
                approver: '품질책임자',
                summary: '의료기기 등급 분류(1~4등급), 허가번호 부여, 고유식별자(UDI-DI 및 UDI-PI) 부착 및 전주기 이력 추적을 관리합니다.',
                sections: [
                    { subtitle: '1. 품목 등급 분류 기준', text: '• 1등급: 잠재적 위험성이 거의 없는 기기 (식약처 신고 대상)\n• 2등급: 잠재적 위험성이 낮은 기기 (인증 대상)\n• 3등급: 중증도의 잠재적 위험성을 가진 기기 (품목 허가 대상)\n• 4등급: 고도의 위해성을 가진 기기 (식약처 본부 정밀 허가 및 기술문서 심사)' },
                    { subtitle: '2. 고유기기식별자 (UDI) 부여 원칙', text: '• UDI-DI: GS1 GTIN 14자리 표준 코드를 제품 모델별로 고유 부여\n• UDI-PI: 제조일자, 사용기한, LOT 번호 또는 일련번호를 바코드(GS1-128 / DataMatrix)로 라벨에 인쇄 표기' },
                    { subtitle: '3. 소프트웨어(SaMD) 및 멸균 관리', text: '소프트웨어가 내장되거나 단독 구동되는 기기는 버전 형상 관리를 필수화하며, 멸균 기기는 공인 멸균 밸리데이션(ISO 11135 / ISO 11137) 성적서를 제품 마스터에 연결 보존한다.' }
                ],
                relatedPage: 'medicalDevices',
                relatedPageName: '의료기기 품목 마스터 화면'
            },
            {
                id: 'SOP-MD-02',
                docNumber: 'QMS-SOP-MD-002',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-01',
                title: '의료기기 위험관리 절차서 (ISO 14971)',
                standard: 'ISO 14971:2019 / ISO 13485 §7.1',
                targetDept: '연구개발팀, RA팀, 품질보증팀',
                approver: '품질책임자',
                summary: '의료기기 전체 수명주기 동안 위해요인(Hazard) 분석, 위험도 평가, 통제조치 수립 및 잔여 위험 수용성 평가를 수행합니다.',
                sections: [
                    { subtitle: '1. 위험관리 3계층 프레임워크', text: '위해요인(Hazard) → 위해상황(Hazardous Situation) → 위해/피해(Harm)의 인과 관계를 추적하여 위험 발생 빈도와 심각도를 매트릭스로 산정한다.' },
                    { subtitle: '2. 위험 통제 우선순위', text: '1순위: 본질적으로 안전한 설계 (Inherent Safety)\n2순위: 방호 수단 및 경고 알람 (Protective Measures)\n3순위: 사용자 설명서 안전 정보 제공 (Safety Information)' },
                    { subtitle: '3. 잔여위험 종합 수용성 판정', text: '통제 조치 완료 후 모든 잔여위험이 수용 가능한 영역에 도달해야 하며, 필요한 경우 임상적 이익-위험 분석(Benefit-Risk Analysis)을 수행한다.' }
                ],
                relatedPage: 'riskManagement',
                relatedPageName: '위험관리(ISO 14971) 화면'
            },
            {
                id: 'SOP-MD-03',
                docNumber: 'QMS-SOP-MD-003',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-10',
                title: '의료기기 설계개발 및 DHF 관리 절차서',
                standard: 'ISO 13485:2016 §7.3 / 21 CFR 820.30',
                targetDept: '연구개발본부, RA/QA팀, 임상평가팀',
                approver: '품질책임자 / 연구소장',
                summary: '설계개발 6단계 라이프사이클(기획-입력-출력-검증-유효성확인-이관) 및 설계이력파일(DHF), 양방향 추적성(RTM) 관리 기준을 규정합니다.',
                sections: [
                    { subtitle: '1. 설계개발 단계별 게이트 심의 (Design Review)', text: '계획 수립부터 최종 설계 이관까지 6단계에 걸쳐 독립적 심의위원이 참여하는 공식 디자인 리뷰를 통과해야 다음 단계로 전이된다.' },
                    { subtitle: '2. 설계이력파일 (DHF) 통합 편철', text: '각 제품군별 승인된 설계계획서, 설계입력/출력문서, V&V 성적서, 위험관리파일, 설계변경이력을 누락 없이 영구 보존한다.' },
                    { subtitle: '3. 양방향 추적성 매트릭스 (RTM)', text: '사용자 요구사항 ↔ 설계입력 ↔ 설계출력 ↔ 검증/유효성확인 시험 ↔ ISO 14971 위해요인 간 전구간 역추적성을 보장한다.' }
                ],
                relatedPage: 'designControls',
                relatedPageName: '설계개발 및 DHF 관리 화면'
            }
        ]
    },
    {
        id: 'cat_cosmetics',
        title: '🧴 화장품 규제 표준 (ISO 22716 & 화장품법)',
        items: [
            {
                id: 'SOP-COS-01',
                docNumber: 'QMS-SOP-COS-001',
                revision: 'Rev. 4.0',
                effectiveDate: '2025-10-01',
                title: '화장품 제품표준서 및 원료 규격 관리 절차서',
                standard: 'ISO 22716:2007 §5 / 화장품법 제5조',
                targetDept: '상품기획팀, 개발팀, 품질팀',
                approver: '화장품 책임판매관리자',
                summary: '전성분 안전성 검토, 배합한도 규제 물질 검증, 제품표준서 승인 및 제조지시/기록서 연계 기준을 규정합니다.',
                sections: [
                    { subtitle: '1. 전성분 규제 검증 의무', text: '식약처 화장품 안전기준 등에 관한 규정 및 EU Cosing 기준에 따른 사용금지 원료, 배합한도 원료를 처방 확정 전 100% 전수 스크리닝한다.' },
                    { subtitle: '2. 제품표준서 승인선', text: '제품표준서는 상품기획, 품질관리, 화장품 책임판매관리자의 3단계 전자결재 합의 후 최종 발행된다.' }
                ],
                relatedPage: 'ingredientCompliance',
                relatedPageName: '성분 안전성 검토 화면'
            },
            {
                id: 'SOP-COS-02',
                docNumber: 'QMS-SOP-COS-002',
                revision: 'Rev. 2.0',
                effectiveDate: '2025-11-15',
                title: '화장품 안전성 정보 수집 및 신속보고 절차서',
                standard: '화장품법 제5조의2 / 동법 시행규칙 제13조',
                targetDept: '고객경영(CX)팀, 품질보증팀',
                approver: '책임판매관리자',
                summary: '사용 중 발생한 중대한 유해사례(이상반응)를 인지한 날로부터 15일 이내 식약처 의약품안전나라에 보고하는 기준을 정의합니다.',
                sections: [
                    { subtitle: '1. 중대한 유해사례 정의', text: '사망, 생명의 위협, 입원 또는 입원 기간의 연장, 지속적이거나 중대한 불구나 기능저하, 선천적 기형을 초래한 사례' },
                    { subtitle: '2. 보고 기한 통제', text: '중대 유해사례는 인지일 기준 15일 이내, 일반 안전성 정보는 반기 종료 후 1개월 이내 정기 보고한다.' }
                ],
                relatedPage: 'claims',
                relatedPageName: '클레임 관리 화면'
            }
        ]
    },
    {
        id: 'cat_assurance',
        title: '🛡️ 품질보증 및 시정예방조치 (CAPA & NCR)',
        items: [
            {
                id: 'SOP-QA-01',
                docNumber: 'QMS-SOP-QA-001',
                revision: 'Rev. 3.2',
                effectiveDate: '2026-03-01',
                title: '부적합품(NCR) 관리 및 시정/예방조치(CAPA) 절차서',
                standard: 'ISO 13485:2016 §8.3, §8.5 / ISO 22716 §11, §14',
                targetDept: '품질보증팀, 생산관리팀, 공급사',
                approver: '품질책임자',
                summary: '입고 검사, 공정 중, 출하 및 고객 클레임에서 발견된 부적합품의 격리, 원인 규명, 재발방지 조치 및 유효성 평가를 수행합니다.',
                sections: [
                    { subtitle: '1. 부적합품 발생 및 즉시 격리', text: '부적합이 식별된 로트는 시스템 상 "부적합 격리(QUARANTINE)" 상태로 전환되며, 자동 출하 락(Lock)이 적용되어 임의 출고가 원천 차단된다.' },
                    { subtitle: '2. 근본 원인 분석 (5-Why & Fishbone)', text: '단순 작업자 부주의로 결론짓지 않고 설비, 방법, 재료, 환경(4M) 관점에서 근본 원인을 도출하고 영구 개선책을 수립한다.' },
                    { subtitle: '3. 효과성 검증 (Effectiveness Check)', text: '조치 완료 후 3개월(또는 연속 3개 로트) 동안 동일 유형 결함 재발 여부를 추적 확인한 후 최종 종결 처리한다.' }
                ],
                relatedPage: 'quality',
                relatedPageName: '입고 품질 관리 화면'
            },
            {
                id: 'SOP-QA-02',
                docNumber: 'QMS-SOP-QA-002',
                revision: 'Rev. 2.0',
                effectiveDate: '2026-02-01',
                title: '변경관리 (Change Control) 운영 절차서',
                standard: 'ISO 13485 §7.3.9 / ISO 22716 §13',
                targetDept: '전 부서',
                approver: '품질책임자 / CCB 위원회',
                summary: '원자재, 처방, 제조공정, 포장재, 규격, 시험법의 모든 변경에 대한 타당성 검토, 영향 평가 및 승인을 거쳐 실행합니다.',
                sections: [
                    { subtitle: '1. 변경 등급 구분', text: '• 1등급(중대 변경): 인허가 변경 또는 제품 안전성에 직접 영향을 미치는 변경\n• 2등급(일반 변경): 포장 디자인, 부자재 사양 등 품질 영향이 경미한 변경\n• 3등급(경미 변경): 문서 오탈자 수정 등 단순 보완' },
                    { subtitle: '2. 변경 영향평가', text: '안전성, 안정성 시험, 인허가 신고 사항, 제조원 밸리데이션, 기존 재고 소진 계획 등을 종합 검토한다.' }
                ],
                relatedPage: 'changeControl',
                relatedPageName: '변경관리 (ISO 13485/22716) 화면'
            },
            {
                id: 'SOP-QA-03',
                docNumber: 'QMS-SOP-QA-003',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-15',
                title: '공급업체 적격성평가 및 품질협약(QAA) 관리 절차서',
                standard: 'ISO 13485:2016 §7.4 / ISO 22716:2007 §7',
                targetDept: '구매팀, 품질보증팀, 생산관리팀',
                approver: '품질책임자 / 구매본부장',
                summary: '원자재·위탁제조 공급업체에 대한 최초/정기 평가, 적격 공급업체 목록(ASL) 등재, 품질보증협약서(QAA) 체결 및 변경 사전 통보 의무를 규정합니다.',
                sections: [
                    { subtitle: '1. 적격 공급업체 목록 (ASL) 운영 원칙', text: '품질평가 4대 영역(품질경영 30점, 현장실사 30점, 납기준수 20점, 가격경쟁력 20점) 총점 90점 이상 A등급 또는 80점 이상 B등급 승인 업체만 ASL에 등재되며, 미승인 업체로부터의 구매 발주는 시스템 상 원천 차단된다.' },
                    { subtitle: '2. 품질보증협약(QAA) 체결 필수화', text: '원료, 핵심 부품, 포장재 및 OEM/ODM 위탁제조사는 제품 공급 전 품질보증협약서(QAA) 체결이 필수이며, 변경 사전 통보(4M 변경 등) 미이행 시 즉시 거래 정지(DISQUALIFIED) 조치한다.' },
                    { subtitle: '3. 정기 감사 및 등급 재평가 주기', text: 'A등급 업체는 2년 주기, B등급 업체는 1년 주기로 정기 감사 및 적격성 재평가를 실시하며, 등급 하락 시 시정조치 요구(CAPA)를 발송한다.' }
                ],
                relatedPage: 'supplierManagement',
                relatedPageName: '공급업체·위탁제조 관리 화면'
            },
            {
                id: 'SOP-TR-01',
                code: 'SOP-QA-008',
                categoryName: '식별 및 추적성 관리',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-20',
                title: '제품 식별, 양방향 추적성 및 외부 시스템 연계 절차서',
                standard: 'ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3 / 21 CFR 820.65',
                targetDept: '품질보증팀, 생산관리팀, 물류자재팀',
                approver: '품질책임자 / 공장장',
                summary: '원자재 입고부터 벌크 제조, 완제품 출하까지 전공정 LOT 양방향 추적성, ERP/WMS 재고 수기 대사 및 GS1 UDI 바코드 식별 표준을 규정합니다.',
                sections: [
                    { subtitle: '1. 배치(LOT) 번호 부여 및 식별 원칙', text: '원자재(RM), 포장재(PK), 벌크(BLK), 완제품(LOT), 출하(SHP) 등 공정 단계별로 유일무이한 식별 번호를 채번하고 시스템 상 연결 링크를 필수 생성한다.' },
                    { subtitle: '2. 양방향 전공정 추적성 검증', text: '원료 LOT 기준 완제품 파급 경로(정방향) 및 완제품 클레임/리콜 시 원자재 공급처 역추적(역방향)을 24시간 이내 100% 완료할 수 있는 추적성 매트릭스를 상시 유지한다.' },
                    { subtitle: '3. 외부 시스템 연동 및 수기 대사 (DEC-02)', text: 'ERP 및 WMS와의 데이터 연계 시 차이가 발생한 건은 품질 책임자가 실물 대사 후 수기 승인(Reconciliation) 처리하여 기록 무결성을 확보한다.' }
                ],
                relatedPage: 'traceabilityManagement',
                relatedPageName: '외부연계 및 추적성 관리 화면'
            },
            {
                id: 'SOP-QC-03',
                code: 'SOP-QA-009',
                categoryName: '부적합품 관리 및 출하승인',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-04-25',
                title: '부적합품(NCR) 관리, 특채 승인 및 출하승인 통제 절차서',
                standard: 'ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90',
                targetDept: '품질관리팀, 품질보증팀, 생산기술팀',
                approver: '품질책임자',
                summary: '원자재, 반제품, 완제품의 부적합 식별, 격리(Quarantine), 원인조사, 처리방안(폐기/반품/재작업/특채), CAPA 연계 및 출하 승인 게이트 통제를 규정합니다.',
                sections: [
                    { subtitle: '1. 즉각 식별 및 물리적 격리 (Quarantine)', text: '부적합이 확인된 로트는 발견 즉시 황색/적색 부적합 식별표를 부착하고 전용 격리창고(Q-Zone)로 이동하여 임의 사용을 원천 차단한다.' },
                    { subtitle: '2. 특채(Concession) 및 재작업(Rework) 통제', text: '특채는 제품 안전성·유효성에 영향이 없음을 문서화된 타당성 근거로 입증하여 품질책임자가 최종 승인한 경우에 한하며, 재작업은 정식 SOP 작업지침 및 전수 재검사를 필수 조건으로 한다.' },
                    { subtitle: '3. 출하 승인 게이트 연동 (Release Gate)', text: '해당 LOT에 미해결 부적합 보고서(NCR)가 존재하거나 수입/공정/완제품 검사 결과가 부적합인 경우 전자결재 출하승인(MARKET_RELEASE)이 시스템적으로 강제 차단된다.' }
                ],
                relatedPage: 'ncrManagement',
                relatedPageName: '부적합품 관리 및 출하승인(NCR) 화면'
            },
            {
                id: 'SOP-CS-01',
                code: 'SOP-QA-010',
                categoryName: '불만 및 이상사례 관리',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-05-01',
                title: '고객 불만 및 시판 후 이상사례 평가 관리 절차서',
                standard: 'ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198 / 화장품법 제5조의2',
                targetDept: 'CS팀, 품질보증팀, 학술연구소, RA팀',
                approver: '품질책임자 / 안전관리책임자',
                summary: '고객 불만 전수 접수(LOT 미상 포함), 의학적 인과관계(WHO-UMC 6단계) 평가, 규제당국(식약처 15일 이내 신속보고 / FDA MDR) 보고 및 CAPA 연계를 규정합니다.',
                sections: [
                    { subtitle: '1. LOT 미상 접수 보장 및 불만 파일 유지 (D-9 해소)', text: '소비자가 용기를 분실하였거나 포장재 번호가 마모된 경우에도 "LOT 번호 미상"으로 불만을 전수 접수하여 21 CFR 820.198 불만 파일에 의무 기록 보존하며, 판매 영수증 및 유통 경로 역추적으로 영향 로트를 탐색한다.' },
                    { subtitle: '2. 의학적 인과관계 6단계 평가 (WHO-UMC)', text: '접수된 이상사례에 대해 시간적 선후관계, 기저질환, 병용 약물/화장품 여부를 평가하여 확실(Certain), 가능성 높음(Probable), 가능함(Possible), 관련성 적음(Unlikely), 조건부(Conditional), 평가불가(Unassessable) 6단계로 판정한다.' },
                    { subtitle: '3. 규제기관 신속보고 (식약처 15일 / FDA MDR) 및 CAPA 연계', text: '사망, 입원, 영구장애 등 중대한 유해사례는 인지 후 15일 이내 식약처에 신속보고를 완료하고, 인과관계가 확실/가능성 높은 건은 16단계 시정 및 예방조치(CAPA)를 의무 개시한다. 21 CFR 820.198(b)에 따라 조사를 실시하지 않는 경우 정당화 사유를 문서화해야 한다.' }
                ],
                relatedPage: 'complaintSafetyManagement',
                relatedPageName: '불만·이상사례 관리 화면'
            },
            {
                id: 'SOP-CAPA-01',
                code: 'SOP-QA-011',
                categoryName: '시정 및 예방조치 (CAPA)',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-05-10',
                title: '시정 및 예방조치 (CAPA) 운영 및 효과성 검증 절차서',
                standard: 'ISO 13485:2016 §8.5.2, §8.5.3 / ISO 22716:2007 §10 / 21 CFR 820.100',
                targetDept: '품질보증팀, 품질관리팀, 생산기술팀, 개발팀',
                approver: '품질책임자 / 공장장',
                summary: '5대 품질 소스 연계 발의, 임시 봉쇄조치, 5-Why & Fishbone 근본원인 분석, 시정조치 및 수평전개 예방조치 실행, 사후 데이터 기반 효과성(Effectiveness) 검증 및 공식 종결 통제를 규정합니다.',
                sections: [
                    { subtitle: '1. 5대 품질 소스 연동 발의 및 임시 봉쇄조치 (Containment)', text: '고객 불만(15), 부적합품(14), 변경관리(11), 공급사 심사(12), 내부감사 등 5대 소스로부터 원클릭 CAPA를 연계 발의하며, 즉시 해당 재고 격리(HOLD) 및 출하 보류 등 위험 확산 방지 봉쇄조치를 선행한다.' },
                    { subtitle: '2. 5-Why & Fishbone 다차원 근본원인 규명', text: '단순 작업자 부주의가 아닌 프로세스 및 시스템적 결함을 도출하기 위해 5단계 근본원인 추적(5-Why)과 6M(사람/설비/재료/방법/측정/환경) 특성요인도 분석을 의무화한다.' },
                    { subtitle: '3. 시정/예방조치 실행 및 수평 전개', text: '직접 원인 제거 조치(시정)와 유사 설비/타 제품 라인으로의 확장 조치(예방) 과제를 명확한 기한 및 담당자와 함께 편성하여 이행을 추적한다.' },
                    { subtitle: '4. 사후 객관적 데이터 기반 효과성 검증 및 종결 가드', text: '조치 완료 후 30~90일 또는 후속 N개 배치 동안 실제 재발 여부 및 통계적 공정능력(CPK)을 평가하여 "EFFECTIVE" 판정 시에만 최종 종결이 승인되며, 미완료 과제 잔존 시 종결이 원천 차단된다.' }
                ],
                relatedPage: 'capaManagement',
                relatedPageName: '시정 및 예방조치 (CAPA) 화면'
            },
            {
                id: 'SOP-VR-01',
                code: 'SOP-QA-012',
                categoryName: '규제보고 및 회수 (Vigilance & Recall)',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-05-15',
                title: '규제기관 이상사례 보고 (Vigilance/MDR) 및 제품 회수 관리 절차서',
                standard: '의료기기법 제31조·제34조 / 21 CFR Part 803 (MDR) · Part 7 (Recall) / EU MDR 2017/745 Art. 87 / 화장품법 제5조의2·제5조의3',
                targetDept: '품질보증팀, RA팀, 임상안전팀, CS팀, 물류운영팀',
                approver: '품질책임자 / 대표이사',
                summary: '시판 후 제품의 이상사례/부작용 인지 시 국가별 법정 기한(식약처 7일/15일, FDA 5일/30일, EU 2일/10일) 내 신속보고 및 제품 회수 시 위해성 1~3등급 분류, 출고 총량 대비 회수·격리·폐기·미회수 수량의 100% 대사(Reconciliation) 일치 통제 절차를 규정합니다.',
                sections: [
                    { subtitle: '1. 국가별 법정 보고 기한 자동 산정 및 알림', text: '부작용 인지일(Awareness Date)을 기준으로 식약처 사망 7일/중대 15일, FDA 5-Day/30-Day, EU MDR 2일/10일/15일 등 법정 기한을 자동 산정하고 D-3 경고 알림을 발송한다.' },
                    { subtitle: '2. 제품 회수(Recall) 위해성 1~3등급 분류 및 공표', text: '완제품의 결함으로 인한 사망/영구장애 우려(1등급), 가역적 손상(2등급), 경미한 위반(3등급)을 신속 판정하여 회수계획서를 제출하고 거래처 및 소비자 공표를 개시한다.' },
                    { subtitle: '3. 100% 수량 대사 (Quantity Reconciliation) 및 종결 가드', text: '출고 수량 = 회수량 + 격리량 + 폐기량 + 미회수량(사유 명시) 100% 일치를 입증해야 하며, 불일치 시 시스템적으로 최종 종결 처리가 차단된다.' },
                    { subtitle: '4. 재발방지 CAPA 연계 및 폐기 검증', text: '회수 및 중대 이상사례 발생 시 즉시 원인규명 CAPA(16단계)를 연계하며, 폐기 시 환경법규 준수 및 입회인 서명을 필수로 첨부한다.' }
                ],
                relatedPage: 'vigilanceRecallManagement',
                relatedPageName: '규제보고 및 회수 관리 화면'
            },
            {
                id: 'SOP-EQ-01',
                code: 'SOP-QA-013',
                categoryName: '시설·설비, 교정 및 환경관리',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-05-20',
                title: '시설·설비 점검, 교정(Calibration) 및 청정환경 모니터링 절차서',
                standard: 'ISO 13485:2016 §6.3, §6.4, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70, 820.72',
                targetDept: '시설관리팀, 생산기술팀, 품질관리팀, 품질보증팀',
                approver: '품질책임자 / 공장장',
                summary: '제조 및 시험 설비 마스터 관리, 국가표준 소급성 주기적 교정(Calibration), 교정 불합격 시 사용중지 및 소급 영향평가 가드, 정기 예방보전(PM), 청정실 온·습도·차압·미립자 모니터링 표준을 규정합니다.',
                sections: [
                    { subtitle: '1. 장비/설비 마스터 원장 및 식별 관리', text: '제조, 시험, 보관 및 유틸리티 모든 설비에 대해 유일한 관리번호(EQ-)를 부여하고 모델, 시리얼, 관리부서, 중요도를 등록하여 라이프사이클을 추적한다.' },
                    { subtitle: '2. 국가표준 소급성 교정 및 불합격(FAIL) 가드', text: 'KOLAS 인정기관 등 공인성적서를 필수로 취합하며, 교정 불합격(OOS) 발생 시 즉시 해당 설비를 "사용 중지"로 전환하고 과거 제조/시험 로트에 대한 소급 품질 영향평가를 의무 실시한다.' },
                    { subtitle: '3. 정기 예방보전(PM) 및 고장 수리 이력', text: '설비별 권장 주기(분기/반기/연간)에 따라 사전 예방보전을 실시하고 부품 교체, 비용, 다운타임을 기록하여 최적 가동 상태를 유지한다.' },
                    { subtitle: '4. 청정실(Cleanroom) 환경 모니터링 및 OOS 조치', text: 'Grade C/D 청정실의 온도, 습도, 차압, 부유 미립자(0.5μm/5.0μm), 미생물 낙하균을 주기적으로 측정하여 허용한도 초과 시 환기율 조정 및 원인조사를 즉시 수행한다.' }
                ],
                relatedPage: 'facilityManagement',
                relatedPageName: '시설·교정·유지보수 화면'
            },
            {
                id: 'SOP-IA-01',
                code: 'SOP-QA-014',
                categoryName: '내부심사 및 경영검토',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-05-25',
                title: '내부심사, 자체점검 및 경영검토(Management Review) 운영 절차서',
                standard: 'ISO 13485:2016 §8.2.4, §5.6 / ISO 22716:2007 §13 / ISO 19011:2018 / 21 CFR 820.20, 820.22',
                targetDept: '품질경영본부, 경영진, 전 부서장, 공인 내부심사원',
                approver: '대표이사 / 품질책임자',
                summary: '연간 내부심사 프로그램 수립, 심사원 독립성 보장(자기부서 심사 금지), 체크리스트 실시간 점검 및 지적사항(Finding) 관리, 중대/주요 부적합 CAPA 연계 의무화, 최고경영자 주관 경영검토 12대 입력 및 3대 출력 운영 표준을 규정합니다.',
                sections: [
                    { subtitle: '1. 내부심사 프로그램 및 심사원 독립성', text: '객관성 및 공정성을 보장하기 위해 심사원은 자신의 소속 부서나 직접 수행하는 업무를 심사할 수 없으며, 독립된 적격 심사원을 지정해야 한다.' },
                    { subtitle: '2. 현장 체크리스트 점검 및 객관적 사실 기반 판정', text: '규격 조항별 체크포인트에 따라 문서, 현장, 인터뷰, 샘플링 실사를 수행하고 객관적 증빙에 근거하여 적합/부적합/해당없음을 엄격히 판정한다.' },
                    { subtitle: '3. 지적사항 분류 및 중대/주요 부적합 CAPA 연계 가드', text: 'Critical 및 Major 부적합은 시정 및 예방조치(16단계 CAPA) 연계 및 조치 완료 검증 없이는 시스템적으로 종결 처리가 불가능하다.' },
                    { subtitle: '4. 최고경영자 경영검토 12대 입력 및 3대 출력 의결', text: '심사결과, 고객불만, 공정성과, CAPA 현황 등 12대 필수 입력요소를 평가하고 QMS개선, 제품개선, 자원배분의 3대 출력을 공식 의결하여 회의록으로 영구 보존한다.' }
                ],
                relatedPage: 'internalAuditManagement',
                relatedPageName: '내부심사·경영검토 화면'
            },
            {
                id: 'SOP-DEC-01',
                code: 'SOP-QA-015',
                categoryName: '공식 원본 및 전자서명 정책',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-06-01',
                title: '전자기록 및 전자서명 관리 절차서 (Electronic Records & Electronic Signatures - 21 CFR Part 11 / DEC-01)',
                standard: 'FDA 21 CFR Part 11 / EU GMP Annex 11 / 의사결정대장 DEC-01 / 전자서명법',
                targetDept: '전 부서, 전 임직원, 시스템 관리자',
                approver: '품질책임자 / 대표이사',
                summary: 'DEC-01 준수 하이브리드(화면 서명 + 인쇄본 보존) 및 전자기록 원본 정책, 21 CFR §11.50 서명 매니페스트 블록 표기, §11.200 비밀번호 2차 재인증 의무화, SHA-256 서명 결합 무결성 검증 표준을 규정합니다.',
                sections: [
                    { subtitle: '1. 공식 원본(Official Original) 및 하이브리드 보존 체계 (DEC-01)', text: '기본적으로 eQMS 내의 암호화된 전자기록과 감사추적을 법적 공식 원본으로 관리하되, 규제기관 실사 제출 시 서명 매니페스트가 인쇄된 종이본에 수기 서명하여 바인더로 동시 보관하는 하이브리드 보존을 공식 인정한다.' },
                    { subtitle: '2. 21 CFR Part 11 §11.50 서명 매니페스트 및 의미(Intent) 규정', text: '모든 전자서명은 서명자 성명, 일시, 서명의도(작성 완료, 검토 완료, 승인, 품질책임자 인가, 입회 확인), 서명 사유를 인쇄본과 화면에 명확히 표기해야 한다.' },
                    { subtitle: '3. 21 CFR Part 11 §11.200 서명 시 비밀번호 2차 재인증 (Re-authentication)', text: '로그인 세션과 무관하게 서명 버튼 클릭 시 비밀번호를 재입력하도록 강제하며, 서버 단의 BCrypt 검증을 통과해야만 유효한 서명이 발행된다 (타인 부정/대리 서명 방지).' },
                    { subtitle: '4. SHA-256 서명 무결성 해시 및 결합(Linking)', text: '서명 원장은 대상 문서의 고유 정보와 타임스탬프를 암호학적으로 결합한 64자리 SHA-256 해시를 동기 저장하여 위변조 여부를 실시간 검증한다.' }
                ],
                relatedPage: 'officialRecords',
                relatedPageName: '공식 원본 및 전자서명 정책 화면'
            },
            {
                id: 'SOP-CSV-01',
                code: 'SOP-QA-016',
                categoryName: 'CSV 밸리데이션 및 운영 승인',
                revision: 'Rev. 1.0',
                effectiveDate: '2026-10-25',
                title: '컴퓨터화 시스템 밸리데이션(CSV) 및 운영 승인 관리 절차서 (Computer System Validation & Go-Live Authorization - GAMP 5)',
                standard: 'GAMP 5 (Second Edition) / FDA 21 CFR Part 11 / ISO 13485:2016 §4.1.6 / EU GMP Annex 11',
                targetDept: '전 부서, 시스템 관리자, 품질보증팀, 최고경영진',
                approver: '시스템 관리자 / 품질책임자 / 대표이사',
                summary: 'GAMP 5 V-모델 기반의 수명주기 적격성평가(IQ/OQ/PQ), URS 요구사항 추적성 매트릭스, 결함 및 잔여 리스크 수용 심의, 시스템 소유자·QA·대표이사 3자 서명 기반의 Go-Live 최종 릴리즈 운영 승인 절차를 규정합니다.',
                sections: [
                    { subtitle: '1. GAMP 5 카테고리 4/5 밸리데이션 수명주기 (V-Model)', text: '설정 가능 패키지 및 커스텀 품질 로직의 특성에 맞추어 URS(요구사항) -> FS/DS(설계) -> IQ/OQ/PQ(적격성평가) -> VSR(종합보고서)로 이어지는 수명주기 전 단계를 체계적으로 검증한다.' },
                    { subtitle: '2. IQ/OQ/PQ 적격성평가 및 URS 요구사항 100% 추적성 매트릭스', text: '인프라 및 DB 설치(IQ 4건), 전자서명 재인증 및 출하승인 등 핵심 비즈니스 가드(OQ 6건), 100 동시 사용자 부하 및 대용량 렌더링 성능(PQ 3건) 시험을 실행하고 판정 결과를 영구 보존한다.' },
                    { subtitle: '3. 결함(Defect) 심각도 분류 및 잔여 리스크 수용 통제', text: 'Critical 및 Major 미해결 결함이 존재할 경우 Go-Live 승인이 원천 차단되며, 경미 결함은 품질책임자 승인 하에 잔여 리스크 수용(ACCEPTED_RISK) 정당화 사유를 문서화해야 한다.' },
                    { subtitle: '4. 최종 Go-Live 운영 승인 헌장 및 3자 필수 전자서명', text: '모든 시험 합격 및 결함 통제 후, 시스템 관리자(System Owner), 품질관리 책임자(QA Lead), 최고경영자(Executive Sponsor) 3인의 필수 전자서명을 통해 시스템을 정식 가동(OPERATIONAL) 상태로 공식 인가한다.' }
                ],
                relatedPage: 'csvValidation',
                relatedPageName: 'CSV 밸리데이션 & Go-Live 화면'
            }
        ]
    }
];

const SopManualPage = ({ user, onNavigate }) => {
    const [selectedDocId, setSelectedDocId] = useState('SOP-MD-01');
    const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
    const [searchKeyword, setSearchKeyword] = useState('');

    // 현재 선택된 문서 검색
    const selectedDoc = useMemo(() => {
        for (const cat of SOP_CATEGORIES) {
            const found = cat.items.find(item => item.id === selectedDocId);
            if (found) return found;
        }
        return SOP_CATEGORIES[0].items[0];
    }, [selectedDocId]);

    // 검색 및 카테고리 필터링된 카테고리 목록
    const filteredCategories = useMemo(() => {
        let baseCategories = SOP_CATEGORIES;
        if (selectedCategoryId !== 'ALL') {
            baseCategories = SOP_CATEGORIES.filter(c => c.id === selectedCategoryId);
        }

        if (!searchKeyword.trim()) return baseCategories;
        const kw = searchKeyword.toLowerCase().trim();
        return baseCategories.map(cat => ({
            ...cat,
            items: cat.items.filter(item => 
                item.title.toLowerCase().includes(kw) ||
                item.docNumber.toLowerCase().includes(kw) ||
                item.standard.toLowerCase().includes(kw) ||
                item.summary.toLowerCase().includes(kw)
            )
        })).filter(cat => cat.items.length > 0);
    }, [selectedCategoryId, searchKeyword]);

    const totalDocCount = useMemo(() => {
        return filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
    }, [filteredCategories]);

    const handleReset = () => {
        setSelectedCategoryId('ALL');
        setSearchKeyword('');
        setSelectedDocId('SOP-MD-01');
    };

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', minHeight: '100%', width: '100%' }}>
            
            {/* ================================================================= */}
            {/* 1. 3-Tier Standard Header (ui-ux-guide.md 표준)                   */}
            {/* ================================================================= */}
            <div className="page-header-standard" style={{
                marginBottom: '16px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0'
            }}>
                {/* 1단계: 타이틀 및 핵심 액션 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            <span>📖</span>
                            <span>표준 품질경영 매뉴얼 (Process Manual / SOP)</span>
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onNavigate && (
                            <button
                                type="button"
                                onClick={() => onNavigate('regulatoryGuide')}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                ⚖️ 규제 표준 가이드
                            </button>
                        )}
                        {onNavigate && (
                            <button
                                type="button"
                                onClick={() => onNavigate('controlledDocuments')}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                📂 통제문서(DMS) 관리
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => window.print()}
                            style={{
                                padding: '9px 20px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '13px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                            }}
                        >
                            🖨️ 인쇄 / PDF 저장
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 요약 설명 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        화장품(ISO 22716:2007) 및 의료기기(ISO 13485:2016) 품질경영 표준운영절차서(SOP) 전문 열람, 제·개정 이력 추적 및 실무 화면 연동
                    </div>
                </div>
            </div>

            {/* 규제 기준 매뉴얼 가이드 배너 */}
            <RegulatoryManualBanner 
                pageKey="sopManual" 
                standardLabel="ISO 13485:2016 §4.2 (문서화 요건) / ISO 22716 §3 (품질경영시스템) 전사 표준절차서" 
                onNavigate={onNavigate}
            />

            {/* ================================================================= */}
            {/* 2. 4종 KPI SOP 요약 지표 카드 그리드                              */}
            {/* ================================================================= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #2563eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>전사 표준절차서 현황</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        총 10종 SOP <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>운영</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>품질·의료기기·화장품 전주기</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #16a34a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>최신 유효 개정 유지율</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                        100% 최신본 유효
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>구버전 현장 사용 원천 차단</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #0d9488',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>실무 업무 화면 연동</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        8개 모듈 딥링크
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488', marginTop: '2px' }}>DMS·의료기기·위험관리·설계·변경·공급업체</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #4f46e5',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>전자기록 무결성 보증</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
                        21 CFR Part 11
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', marginTop: '2px' }}>SHA-256 감사추적 영구보존</div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* 3. 검색 및 카테고리 필터 카드 (ui-ux-guide.md 표준)                 */}
            {/* ================================================================= */}
            <div className="card" style={{
                marginBottom: '16px',
                padding: '18px 24px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    alignItems: 'flex-end'
                }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            🔍 절차서 검색
                        </label>
                        <input
                            type="text"
                            placeholder="SOP 문서명, 규격, 문서번호, 부서 검색..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            SOP 카테고리
                        </label>
                        <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155',
                                outline: 'none'
                            }}
                        >
                            <option value="ALL">전체 카테고리 ({SOP_CATEGORIES.reduce((a, c) => a + c.items.length, 0)}건)</option>
                            {SOP_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.title} ({c.items.length}건)</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 검색 하단 버튼 바 (ui-ux-guide.md 표준: 초기화 outline, 조회 primary) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        총 <strong style={{ color: '#2563eb' }}>{totalDocCount}</strong>건의 표준운영절차서가 검색되었습니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleReset}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            ♻️ 초기화
                        </button>
                        <button
                            type="button"
                            onClick={() => {}}
                            style={{
                                padding: '8px 22px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* 4. 메인 2단 레이아웃: 좌측 목차 / 우측 본문 리더                   */}
            {/* ================================================================= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 380px) 1fr',
                gap: '16px',
                alignItems: 'start'
            }}>
                
                {/* 좌측: 카테고리 및 절차서 탐색기 카드 */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #f1f5f9'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                            📑 SOP 절차서 목차 ({totalDocCount}건)
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>클릭 시 즉시 열람</span>
                    </div>

                    <div style={{ maxHeight: '760px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {filteredCategories.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                                검색 조건에 일치하는 절차서가 없습니다.
                            </div>
                        ) : (
                            filteredCategories.map(cat => (
                                <div key={cat.id}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: '#334155',
                                        padding: '6px 10px',
                                        background: '#f1f5f9',
                                        borderRadius: '6px',
                                        marginBottom: '6px'
                                    }}>
                                        {cat.title}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {cat.items.map(item => {
                                            const isSelected = item.id === selectedDoc.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSelectedDocId(item.id)}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '12px 14px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
                                                        background: isSelected ? '#eff6ff' : '#ffffff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? '#1d4ed8' : '#2563eb', fontFamily: 'monospace' }}>
                                                            {item.docNumber}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                                                            color: isSelected ? '#1e40af' : '#64748b',
                                                            fontWeight: 700
                                                        }}>
                                                            {item.revision}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#334155', lineHeight: '1.4' }}>
                                                        {item.title}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 우측: 절차서 전문 리더 카드 */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '30px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    
                    {/* 문서 식별 헤더 테이블 */}
                    <div style={{
                        border: '2px solid #0f172a',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '14px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <div>
                                <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 700 }}>
                                    STANDARD OPERATING PROCEDURE
                                </span>
                                <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{selectedDoc.title}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px' }}>
                                <div>문서번호: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{selectedDoc.docNumber}</strong></div>
                                <div style={{ color: '#93c5fd', marginTop: '2px' }}>개정번호: <strong>{selectedDoc.revision}</strong></div>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            fontSize: '12px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0'
                        }}>
                            <div style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>적용 규격</span>
                                <strong style={{ color: '#1e40af' }}>{selectedDoc.standard}</strong>
                            </div>
                            <div style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>시행 일자</span>
                                <strong style={{ fontFamily: 'monospace' }}>{selectedDoc.effectiveDate}</strong>
                            </div>
                            <div style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>적용 부서</span>
                                <strong>{selectedDoc.targetDept}</strong>
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700 }}>최종 승인권자</span>
                                <strong style={{ color: '#16a34a' }}>✓ {selectedDoc.approver}</strong>
                            </div>
                        </div>
                    </div>

                    {/* 문서 개요 요약 */}
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        marginBottom: '24px',
                        fontSize: '13px',
                        color: '#166534',
                        lineHeight: '1.6'
                    }}>
                        <strong style={{ fontSize: '13.5px' }}>💡 절차서 핵심 요약:</strong> {selectedDoc.summary}
                    </div>

                    {/* 관련 실무 화면 딥링크 배너 */}
                    {selectedDoc.relatedPage && onNavigate && (
                        <div style={{
                            background: '#eff6ff',
                            border: '1px dashed #60a5fa',
                            borderRadius: '10px',
                            padding: '14px 20px',
                            marginBottom: '24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ fontSize: '13px', color: '#1e40af' }}>
                                🔗 <strong>실무 화면 바로가기:</strong> 본 절차서에 규정된 실제 업무는 <strong>[{selectedDoc.relatedPageName}]</strong>에서 수행합니다.
                            </div>
                            <button
                                type="button"
                                onClick={() => onNavigate(selectedDoc.relatedPage)}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: '8px',
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                }}
                            >
                                해당 실무 화면으로 이동 ▶
                            </button>
                        </div>
                    )}

                    {/* 본문 섹션들 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {selectedDoc.sections.map((sec, idx) => (
                            <div key={idx} style={{
                                padding: '18px 22px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                                <h3 style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ color: '#2563eb', fontWeight: 900 }}>§</span> {sec.subtitle}
                                </h3>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#334155',
                                    lineHeight: '1.8',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {sec.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 하단 전자서명 및 감사정보 푸터 */}
                    <div style={{
                        marginTop: '30px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '11px',
                        color: '#94a3b8'
                    }}>
                        <div>
                            전자문서 고유식별 해시: SHA-256 Verified • 21 CFR Part 11 적합성 보증
                        </div>
                        <div>
                            eQMS 통제문서 보존연한: 영구 보존 (최소 5년 보존 후 규정 아카이빙)
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SopManualPage;
