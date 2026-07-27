import React from 'react';
import StatusBadgeRenderer from './StatusBadgeRenderer';

/**
 * 대시보드 상에서 이동 없이 바로 표시되는 입고 품질 검사 상세 내용 오버레이 모달/드로어
 */
const QualityInspectionDetailModal = ({ inbound, onClose }) => {
    if (!inbound) return null;

    const result = inbound.inspectionResult || inbound.inboundInspectionResult || '대기';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                width: '800px',
                maxWidth: '92vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '20px 28px',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚖️</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
                                입고 품질 검사 상세 현황
                            </h3>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                입고번호: {inbound.grnNumber || '-'} | 품목: {inbound.productName || '-'} ({inbound.itemCode || '-'})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '20px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 바디 (상세 검사 항목 정보) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 1. 기본 검수 개요 */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📦 기본 입고 및 검수 개요
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                            <div><strong style={{ color: '#64748b' }}>품목코드:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{inbound.itemCode || '-'}</span></div>
                            <div><strong style={{ color: '#64748b' }}>품목명:</strong> <span style={{ fontWeight: '600', color: '#0f172a' }}>{inbound.productName || '-'}</span></div>
                            <div><strong style={{ color: '#64748b' }}>Lot 번호:</strong> <span>{inbound.lotNumber || '-'}</span></div>
                            <div><strong style={{ color: '#64748b' }}>제조사:</strong> <span>{inbound.manufacturer || '-'}</span></div>
                            <div><strong style={{ color: '#64748b' }}>입고 수량:</strong> <span style={{ fontWeight: '700', color: '#2563eb' }}>{inbound.inboundQuantity ? inbound.inboundQuantity.toLocaleString() : (inbound.quantity ? inbound.quantity.toLocaleString() : '-')} EA</span></div>
                            <div><strong style={{ color: '#64748b' }}>입고 일자:</strong> <span>{inbound.inboundDate ? (typeof inbound.inboundDate === 'string' ? inbound.inboundDate.split('T')[0] : inbound.inboundDate) : '-'}</span></div>
                        </div>
                    </div>

                    {/* 2. 품질 검사 및 CoA 승인 현황 */}
                    <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🔬 품질 검사 & CoA 승인 결과
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <strong style={{ color: '#475569' }}>최종 판정 결과:</strong>
                                <StatusBadgeRenderer value={result} />
                            </div>
                            <div>
                                <strong style={{ color: '#475569' }}>CoA 판정 일자:</strong>{' '}
                                <span>{inbound.coaDecisionDate || inbound.inspectionDate || '판정 대기 중'}</span>
                            </div>
                            <div>
                                <strong style={{ color: '#475569' }}>입고 검사원:</strong>{' '}
                                <span>{inbound.inspector || inbound.inspectedBy || '품질관리팀'}</span>
                            </div>
                            <div>
                                <strong style={{ color: '#475569' }}>워크플로우 단계:</strong>{' '}
                                <span style={{ fontWeight: '600', color: '#4f46e5' }}>{inbound.overallStatus || 'STEP 3. CoA 검수'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. 특이사항 및 검수 의견 */}
                    <div style={{ backgroundColor: '#f1f5f9', padding: '16px 20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📝 검수 특이사항 및 종합 비고
                        </h4>
                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: '1.5',
                            minHeight: '60px'
                        }}>
                            {inbound.remark || inbound.finalInspectionRemarks || inbound.notes || '특이사항 및 비고 기재 사항이 없습니다.'}
                        </div>
                    </div>

                    {/* 4. 첨부 성적서/이미지 정보 */}
                    {(inbound.coaFileUrl || inbound.inspectionPhotoUrl) && (
                        <div style={{ backgroundColor: '#eff6ff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📎 첨부 검사 파일
                            </h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {inbound.coaFileUrl && (
                                    <a
                                        href={inbound.coaFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #93c5fd',
                                            borderRadius: '8px',
                                            color: '#2563eb',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        📄 CoA 시험성적서 열람/다운로드
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QualityInspectionDetailModal;
