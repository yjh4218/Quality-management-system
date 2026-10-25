import React, { useState, useMemo } from 'react';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';

/**
 * ⚖️ 규제 표준 가이드 (Regulatory Guide) 페이지 - RegulatoryGuidePage
 * - 표준 QMS UI/UX 시스템 준수 (rules/ui-ux-guide.md & QMS-AI-RULES.md):
 *   1. 3단계 표준 헤더 레이아웃 (타이틀, 액션 버튼, 규제 요약 설명, RegulatoryManualBanner)
 *   2. 4종 KPI 규제 지표 요약 카드 그리드 (국내 규제, 국제 표준, 글로벌 인허가, 법정책임자)
 *   3. 검색 필터 카드 (카테고리 탭, 키워드 검색, [초기화] outline 좌측, [조회] primary 우측)
 *   4. 카드형 규제 가이드 섹션 (화장품법 vs 의료기기법 비교표, UDI 가이드, 법정책임자, FDA/MDR)
 *   5. 브라우저 비의존적 100% 표준 인라인 스타일 & 디자인 토큰 적용
 */
const REGULATORY_SECTIONS = [
    {
        id: 'comparison',
        category: 'COMPARE',
        title: '📊 화장품 vs 의료기기 규제 프레임워크 비교표',
        summary: '화장품법 및 의료기기법, ISO 22716(우수제조관리기준)과 ISO 13485(의료기기 품질경영시스템)의 핵심 규제 요구사항 비교',
        content: [
            {
                subject: '주요 적용 법률',
                cosmetics: '화장품법 (식품의약품안전처)',
                medical: '의료기기법 (식품의약품안전처 / 한국의료기기안전정보원 NIDS)'
            },
            {
                subject: '국제 품질 규격',
                cosmetics: 'ISO 22716:2007 (우수화장품제조기준 CGMP)',
                medical: 'ISO 13485:2016 (의료기기 품질경영시스템)'
            },
            {
                subject: '품목 분류 체계',
                cosmetics: '일반화장품 / 기능성화장품(식약처 심사/보고) / 영유아·어린이 화장품',
                medical: '1등급(신고) / 2등급(인증) / 3·4등급(허가 및 기술문서 심사)'
            },
            {
                subject: '고유식별 및 추적성',
                cosmetics: '제조번호(LOT) 및 사용기한 표기 (개봉 후 사용기간 병행 가능)',
                medical: 'UDI-DI(기기식별자 GS1 GTIN) + UDI-PI(생산식별자 Lot/Exp/Serial)'
            },
            {
                subject: '법정 책임 인력',
                cosmetics: '화장품 책임판매관리자 (품질관리기준 GQP / 안전관리기준 GVP 총괄)',
                medical: '의료기기 품질책임자 (GMP 운영 및 완제품 출하 승인 최종 판정)'
            },
            {
                subject: '중대 이상사례 보고',
                cosmetics: '중대 유해사례 인지일로부터 15일 이내 식약처 신속보고',
                medical: '사망 또는 생명 위협: 7일 이내 / 중대 부작용: 15일 이내 신속보고'
            },
            {
                subject: '위험관리 규격',
                cosmetics: '화장품 원료 안전성 평가 및 배합한도 규정 준수',
                medical: 'ISO 14971:2019 (전주기 위험관리 및 FMEA 수용성 평가 필수)'
            },
            {
                subject: '정기 감사 및 갱신',
                cosmetics: '식약처 정기/수시 감시, CGMP 적합업소 3년 주기 사후관리',
                medical: '의료기기 제조 및 품질관리기준(GMP) 정기심사 3년 주기 갱신'
            }
        ]
    },
    {
        id: 'udi_guide',
        category: 'MEDICAL',
        title: '🏷️ 의료기기 UDI (고유기기식별코드) 실무 가이드',
        summary: 'UDI(Unique Device Identifier)는 전 세계적으로 의료기기의 유통 및 사용을 고유하게 식별·추적하기 위해 제품 및 포장에 부착하는 표준 바코드 체계입니다.',
        details: [
            {
                term: '1. UDI-DI (Device Identifier, 기기식별자)',
                desc: '의료기기 모델/품목별로 고유하게 부여되는 식별 코드로, 국제표준(GS1 GTIN-14) 14자리 숫자를 사용합니다. 식약처 의료기기 통합정보시스템(UDI 포털)에 사전 등록되어야 합니다.'
            },
            {
                term: '2. UDI-PI (Production Identifier, 생산식별자)',
                desc: '해당 제품 로트의 생산 정보를 담은 동적 데이터로, (10) LOT 번호, (17) 사용기한(YYMMDD), (21) 일련번호(Serial), (11) 제조일자 중 제품 특성에 맞게 결합 표기합니다.'
            },
            {
                term: '3. 표준 바코드 심볼로지 (Symbology)',
                desc: '• 1차원 바코드: GS1-128 (포장 박스 및 대형 라벨용)\n• 2차원 매트릭스: GS1 DataMatrix (소형 의료기기 직접 마킹 및 공간 제약 라벨용 필수)'
            },
            {
                term: '4. 등급별 단계적 시행 로드맵 및 공급내역 보고',
                desc: '4등급(2019년) → 3등급(2020년) → 2등급(2021년) → 1등급(2022년) 순으로 이미 전면 의무화가 시행 완료되어 모든 출하 의료기기에 UDI 부착 및 출고 공급내역 보고가 필수입니다.'
            }
        ]
    },
    {
        id: 'manager_roles',
        category: 'ROLES',
        title: '👨‍💼 법정 책임자 자격 요건 및 직무 범위',
        summary: '규제 준수와 품질 안전을 총괄하는 법정 책임자의 자격과 직무를 명확히 숙지하고 권한의 독립성을 보장해야 합니다.',
        details: [
            {
                term: '화장품 책임판매관리자 자격 및 직무',
                desc: '• 자격: 의사·약사, 이공계 학사 이상 또는 2년 이상 품질/제조 실무 경력자\n• 직무: 품질관리기준(GQP) 및 안전관리기준(GVP) 준수, 제품표준서 승인, 시험성적서 적합 확인, 유해사례 신속보고, 회수 조치 결정'
            },
            {
                term: '의료기기 품질책임자 자격 및 직무',
                desc: '• 자격: 면허 소지자(의사, 한의사, 치과의사, 약사, 한약사) 또는 의료기기 관련 학과 학사/석사 또는 실무 경력자\n• 직무: GMP(의료기기 제조 및 품질관리기준) 운영 총괄, 출하 승인 여부 최종 판정, 부적합품 시정조치(CAPA), 기술문서 및 변경통제 승인'
            },
            {
                term: '책임자의 직무 독립성 및 법적 권한',
                desc: '영업 및 마케팅 부서로부터 독립적인 품질 판정권을 보유하며, 대표이사는 품질책임자의 정당한 출하 중단 및 회수 명령을 거부할 수 없습니다.'
            }
        ]
    },
    {
        id: 'global_reg',
        category: 'GLOBAL',
        title: '🌐 글로벌 인허가 및 수출 규제 (FDA & EU MDR)',
        summary: '미국 FDA 및 유럽 EU MDR 수출 시 요구되는 주요 핵심 규정 요약 및 QMS 요구사항입니다.',
        details: [
            {
                term: '미국 FDA 21 CFR 820 (QMSR)',
                desc: '기존 FDA QSR 규정이 ISO 13485:2016과 공식 통합 개정(QMSR)되어 글로벌 단일 품질경영시스템 규격으로 수렴되었습니다. 전자서명 및 감사추적(21 CFR Part 11) 요구사항이 철저히 실사됩니다.'
            },
            {
                term: '유럽 MDR (Medical Device Regulation 2017/745)',
                desc: '기존 MDD 대비 임상 평가(Clinical Evaluation), 시판후 감시(PMS/PMCF), 유라메드(EUDAMED) 데이터베이스 등록, 경제운영자(수입자/유통업체) 책임 및 공인기관(Notified Body) 심사가 대폭 강화되었습니다.'
            },
            {
                term: '전자기록 및 전자서명 (21 CFR Part 11)',
                desc: 'QMS 시스템 내 모든 결재, 문서 승인, 변경 이력은 변경 불가능한 감사추적(Audit Trail)과 사용자 ID/비밀번호 기반의 전자서명이 결합되어야 합니다.'
            }
        ]
    }
];

const RegulatoryGuidePage = ({ user, onNavigate }) => {
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchKeyword, setSearchKeyword] = useState('');

    const filteredSections = useMemo(() => {
        let list = selectedCategory === 'ALL'
            ? REGULATORY_SECTIONS
            : REGULATORY_SECTIONS.filter(s => s.category === selectedCategory || s.category === 'COMPARE');

        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase().trim();
            list = list.filter(sec => 
                sec.title.toLowerCase().includes(kw) ||
                (sec.summary && sec.summary.toLowerCase().includes(kw)) ||
                (sec.content && sec.content.some(c => c.subject.toLowerCase().includes(kw) || c.cosmetics.toLowerCase().includes(kw) || c.medical.toLowerCase().includes(kw))) ||
                (sec.details && sec.details.some(d => d.term.toLowerCase().includes(kw) || d.desc.toLowerCase().includes(kw)))
            );
        }
        return list;
    }, [selectedCategory, searchKeyword]);

    const handleReset = () => {
        setSelectedCategory('ALL');
        setSearchKeyword('');
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
                            <span>⚖️</span>
                            <span>규제 표준 및 인허가 가이드 (Regulatory Guide)</span>
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onNavigate && (
                            <button
                                type="button"
                                onClick={() => onNavigate('sopManual')}
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
                                📖 표준 SOP 열람
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
                            🖨️ 가이드 인쇄 / PDF 저장
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
                        국내 식약처(MFDS), 미국 FDA 21 CFR 820(QMSR), 유럽 EU MDR(2017/745) 및 ISO 13485 / ISO 22716 인허가 표준 법정 기준 해설
                    </div>
                </div>
            </div>

            {/* 규제 기준 매뉴얼 가이드 배너 */}
            <RegulatoryManualBanner 
                pageKey="regulatoryGuide" 
                standardLabel="ISO 13485:2016 / ISO 22716:2007 / 의료기기법 및 화장품법 인허가 가이드라인" 
                onNavigate={onNavigate}
            />

            {/* ================================================================= */}
            {/* 2. 4종 KPI 규제 프레임워크 지표 요약 카드 그리드                    */}
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
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>국내 규제 법률 체계</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        화장품법 &amp; 의료기기법
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>식약처(MFDS) 전주기 안전관리</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #16a34a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>국제 품질경영 표준</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        ISO 13485 &amp; ISO 22716
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>CGMP &amp; 의료기기 QMS 적합성</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #9333ea',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>글로벌 인허가 수출 요건</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        FDA QMSR &amp; EU MDR
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#9333ea', marginTop: '2px' }}>21 CFR Part 11 &amp; EUDAMED</div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #d97706',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>법정 책임자 및 신속보고</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        책임판매관리자 &amp; 품질책임자
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginTop: '2px' }}>중대 부작용 15일 이내 의무보고</div>
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
                            🔍 규제 가이드 검색
                        </label>
                        <input
                            type="text"
                            placeholder="법률명, 규격, UDI, 책임자 직무, MDR, FDA 검색..."
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
                            카테고리 빠른 분류
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'ALL', label: '전체 보기' },
                                { key: 'COMPARE', label: '📊 법률비교표' },
                                { key: 'MEDICAL', label: '🩺 의료기기 UDI' },
                                { key: 'ROLES', label: '👨‍💼 법정책임자 요건' },
                                { key: 'GLOBAL', label: '🌐 글로벌(FDA/MDR)' }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setSelectedCategory(tab.key)}
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        border: selectedCategory === tab.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                        background: selectedCategory === tab.key ? '#eff6ff' : '#ffffff',
                                        color: selectedCategory === tab.key ? '#1d4ed8' : '#475569',
                                        fontSize: '12px',
                                        fontWeight: selectedCategory === tab.key ? 800 : 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
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
                        총 <strong style={{ color: '#2563eb' }}>{filteredSections.length}</strong>개의 핵심 규제 섹션이 표시 중입니다.
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
            {/* 4. 본문 규제 콘텐츠 카드 영역                                      */}
            {/* ================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. 비교표 섹션 */}
                {filteredSections.some(s => s.id === 'comparison') && (
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            background: '#0f172a',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>📊 화장품 vs 의료기기 규제 프레임워크 비교표</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>식약처(MFDS) &amp; ISO 법정 기준</span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                                        <th style={{ padding: '14px 18px', width: '20%', color: '#334155', fontWeight: 800, textAlign: 'left' }}>구분 항목</th>
                                        <th style={{ padding: '14px 18px', width: '40%', color: '#0369a1', fontWeight: 800, background: '#f0f9ff', textAlign: 'left' }}>
                                            🧴 화장품 (Cosmetics / ISO 22716)
                                        </th>
                                        <th style={{ padding: '14px 18px', width: '40%', color: '#15803d', fontWeight: 800, background: '#f0fdf4', textAlign: 'left' }}>
                                            🩺 의료기기 (Medical Device / ISO 13485)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {REGULATORY_SECTIONS[0].content.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b', background: '#f8fafc' }}>
                                                {row.subject}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#0f172a', lineHeight: '1.5' }}>
                                                {row.cosmetics}
                                            </td>
                                            <td style={{ padding: '14px 18px', color: '#0f172a', lineHeight: '1.5' }}>
                                                {row.medical}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. 카드형 가이드 섹션들 */}
                {filteredSections.filter(s => s.id !== 'comparison').map(sec => (
                    <div key={sec.id} style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        padding: '24px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 800,
                                color: '#0f172a'
                            }}>
                                {sec.title}
                            </h3>
                            <span style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1'
                            }}>
                                {sec.category}
                            </span>
                        </div>

                        {sec.summary && (
                            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                {sec.summary}
                            </p>
                        )}

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '14px'
                        }}>
                            {sec.details.map((item, idx) => (
                                <div key={idx} style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '16px 18px'
                                }}>
                                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>
                                        {item.term}
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                        {item.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    );
};

export default RegulatoryGuidePage;
