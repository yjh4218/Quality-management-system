import React from 'react';

export default function ClaimDetailModal({ isOpen = true, claim, onClose }) {
    if (!isOpen || !claim) return null;

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4000,
                padding: '20px'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '850px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 헤더 */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                padding: '3px 8px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700
                            }}>
                                {claim.claimNumber || 'CLM-DETAIL'}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '17.5px', fontWeight: 700, color: '#0f172a' }}>
                                🔍 클레임 상세 현황
                            </h3>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            접수일: {claim.receiptDate || claim.createdDate || '-'} | 국가: {claim.country || '한국'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 바디 */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. 기본 인적/접수 정보 Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        backgroundColor: '#f8fafc',
                        padding: '16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>제품명</span>
                            <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{claim.productName || '-'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>품목코드</span>
                            <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{claim.itemCode || '-'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>LOT 번호</span>
                            <span style={{ fontSize: '13.5px', color: '#059669', fontWeight: 700 }}>{claim.lotNumber || '-'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>제조사</span>
                            <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 700 }}>{claim.manufacturer || '-'}</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>발생 수량</span>
                            <span style={{ fontSize: '13.5px', color: '#ef4444', fontWeight: 700 }}>{(claim.occurrenceQty || 1).toLocaleString()}개</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, display: 'block' }}>품질 진행 단계</span>
                            <span style={{ fontSize: '13.5px', color: '#2563eb', fontWeight: 700 }}>{claim.qualityStatus || '0단계'}</span>
                        </div>
                    </div>

                    {/* 2. 클레임 유형 및 발생 원인 */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                            🏷️ 클레임 유형 분류
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '4px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}>
                                대분류: {claim.primaryCategory || '미분류'}
                            </span>
                            {claim.secondaryCategory && (
                                <span style={{ padding: '4px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}>
                                    중분류: {claim.secondaryCategory}
                                </span>
                            )}
                            {claim.tertiaryCategory && (
                                <span style={{ padding: '4px 12px', backgroundColor: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}>
                                    소분류: {claim.tertiaryCategory}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 3. 클레임 상세 내용 */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                            📝 클레임 상세 현황 및 발생 내용
                        </h4>
                        <div style={{
                            padding: '14px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {claim.claimContent || '등록된 상세 내용이 없습니다.'}
                        </div>
                    </div>

                </div>

                {/* 푸터 */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc',
                    borderBottomLeftRadius: '16px',
                    borderBottomRightRadius: '16px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 22px',
                            backgroundColor: '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
