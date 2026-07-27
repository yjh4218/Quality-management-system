import React from 'react';
import StatusBadgeRenderer from './StatusBadgeRenderer';

/**
 * 입고 품질 대시보드 차트 클릭 시 표시되는 목록 팝업 모달
 */
const InboundListModal = ({ title, inbounds = [], onClose, onSelectInbound }) => {
    return (
        <div style={{
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
            zIndex: 1100,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                width: '1200px',
                maxWidth: '96vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 모달 헤더 */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>📋</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                                {title}
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                총 {inbounds.length}건의 대상 제품 목록이 검색되었습니다.
                            </p>
                        </div>
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

                {/* 목록 테이블 바디 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {inbounds.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                            해당 조건의 입고 내역이 존재하지 않습니다.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>입고번호</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>품목코드</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>품목명</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Lot 번호</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>제조사</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>입고수량</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>입고일자</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>검사결과</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>상세 현황</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inbounds.map((item, idx) => (
                                    <tr 
                                        key={item.id || idx}
                                        style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                    >
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>{item.grnNumber || '-'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace' }}>{item.itemCode || '-'}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>{item.productName || '-'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.lotNumber || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#334155' }}>{item.manufacturer || '-'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                                            {item.inboundQuantity ? item.inboundQuantity.toLocaleString() : (item.quantity ? item.quantity.toLocaleString() : '-')}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                                            {item.inboundDate ? (typeof item.inboundDate === 'string' ? item.inboundDate.split('T')[0] : item.inboundDate) : '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <StatusBadgeRenderer value={item.inspectionResult || item.inboundInspectionResult || '대기'} />
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => onSelectInbound(item)}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#3b82f6',
                                                    backgroundColor: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
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

                {/* 하단 푸터 */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#475569',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
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

export default InboundListModal;
