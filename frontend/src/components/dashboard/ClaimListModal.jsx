import React, { useState } from 'react';
import ClaimDrawer from '../../ClaimDrawer';

export default function ClaimListModal({ isOpen = true, filterTitle, title, claims = [], onClose, onSelectClaim, user }) {
    const [selectedClaimForDrawer, setSelectedClaimForDrawer] = useState(null);

    if (!isOpen) return null;

    const displayTitle = title || filterTitle || '클레임 내역 리스트';

    const handleRowClick = (claim) => {
        setSelectedClaimForDrawer(claim);
        if (onSelectClaim) {
            onSelectClaim(claim);
        }
    };

    return (
        <>
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
                    zIndex: 2500,
                    padding: '20px'
                }}
            >
                <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '1250px',
                        maxWidth: '96vw',
                        maxHeight: '92vh',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'modalFadeIn 0.2s ease-out'
                    }}
                >
                    {/* 모달 헤더 */}
                    <div style={{
                        padding: '20px 28px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f8fafc'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                📋 {displayTitle}
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                항목을 클릭하시면 정식 클레임 상세 현황(0~5단계 접수 및 대책 내역)을 확인하실 수 있습니다. (총 {claims.length}건)
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '6px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 모달 바디 (스크롤) */}
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                        {claims.length === 0 ? (
                            <div style={{
                                padding: '48px 20px',
                                textAlign: 'center',
                                color: '#64748b',
                                fontSize: '14px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px dashed #cbd5e1'
                            }}>
                                해당 조건에 부합하는 클레임 데이터가 없습니다.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>클레임 번호</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>접수일자</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>제품명 (채널)</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>LOT 번호</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left' }}>제조사</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>클레임 유형</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>불량수량</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>상세 현황</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claims.map((claim, idx) => (
                                        <tr
                                            key={claim.id || idx}
                                            onClick={() => handleRowClick(claim)}
                                            style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb', textDecoration: 'underline' }}>
                                                {claim.claimNumber}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                                                {claim.receiptDate}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                                                {claim.productName}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 600 }}>
                                                {claim.lotNumber || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#475569' }}>
                                                {claim.manufacturer || '-'}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    backgroundColor: '#fef2f2',
                                                    color: '#ef4444',
                                                    border: '1px solid #fca5a5',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: 600
                                                }}>
                                                    {claim.primaryCategory || '미분류'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                {(claim.occurrenceQty || 1).toLocaleString()}개
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRowClick(claim);
                                                    }}
                                                    style={{
                                                        padding: '5px 12px',
                                                        backgroundColor: '#2563eb',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🔍 상세 현황
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 모달 푸터 */}
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
                                padding: '9px 24px',
                                backgroundColor: '#334155',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13.5px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>

            {/* 정식 클레임 상세 현황 (ClaimDrawer 팝업 오픈) */}
            {selectedClaimForDrawer && (
                <ClaimDrawer
                    claim={selectedClaimForDrawer}
                    readOnly={true}
                    user={user}
                    onClose={() => setSelectedClaimForDrawer(null)}
                />
            )}
        </>
    );
}
