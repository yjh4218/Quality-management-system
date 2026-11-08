import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ⚠️ 수정사항 저장 확인 모달 (Unsaved Changes Guard Modal)
 * 사용자가 팝업을 닫거나 다른 메뉴로 이동하려 할 때 실제 수정된 항목(changedFields)이 있으면 3-Way 선택지를 제공합니다.
 * 
 * @param {boolean} isOpen - 모달 노출 여부
 * @param {string} targetName - 현재 편집 중인 항목 명칭 (예: '제품 마스터 [PRD-001]')
 * @param {Array<string>} changedFields - 실제 변경된 필드명 목록 (예: ['제품명(한글)', '단상자 가로 (W)'])
 * @param {Function} onSaveAndProceed - 저장 성공 후 이동 콜백
 * @param {Function} onDiscardAndProceed - 저장하지 않고 이동 콜백
 * @param {Function} onCancel - 이동 취소 및 편집 상태 유지 콜백
 */
const UnsavedChangesModal = ({
    isOpen,
    targetName = '작성 중인 내용',
    changedFields = [],
    onSaveAndProceed,
    onDiscardAndProceed,
    onCancel
}) => {
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            if (onSaveAndProceed) {
                await onSaveAndProceed();
            }
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div 
            className="modal-overlay unsaved-changes-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                boxSizing: 'border-box',
                animation: 'fadeInModal 0.15s ease-out'
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (!isSaving && onCancel) onCancel();
            }}
        >
            <div 
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '500px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#fffbeb'
                }}>
                    <span style={{ fontSize: '22px' }}>⚠️</span>
                    <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700', color: '#92400e' }}>
                        수정사항을 저장하시겠습니까?
                    </h3>
                </div>

                {/* 본문 */}
                <div style={{ padding: '20px 24px', color: '#334155', fontSize: '13.5px', lineHeight: '1.5' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '700', color: '#1e293b' }}>
                        [{targetName}] 항목에 저장되지 않은 수정사항이 있습니다.
                    </p>

                    {/* 실제 수정된 필드 목록 박스 */}
                    {changedFields && changedFields.length > 0 && (
                        <div style={{
                            margin: '12px 0 14px 0',
                            padding: '10px 14px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>✏️</span> 수정된 내용 ({changedFields.length}건):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {changedFields.map((field, idx) => (
                                    <span key={idx} style={{
                                        padding: '2px 8px',
                                        background: '#ffffff',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '4px',
                                        fontSize: '11.5px',
                                        fontWeight: '600',
                                        color: '#b91c1c'
                                    }}>
                                        {field}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px' }}>
                        저장하지 않고 이동하면 변경한 내용이 모두 사라집니다.<br />
                        수정사항을 저장하고 이동하시겠습니까?
                    </p>
                </div>

                {/* 액션 버튼 바 */}
                <div style={{
                    padding: '12px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ❌ 취소
                    </button>
                    <button
                        type="button"
                        onClick={onDiscardAndProceed}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        🗑️ 저장하지 않고 이동
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        style={{
                            padding: '8px 18px',
                            fontSize: '13px',
                            fontWeight: '700',
                            borderRadius: '8px',
                            background: isSaving ? '#93c5fd' : '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                        }}
                    >
                        {isSaving ? (
                            <span>저장 중...</span>
                        ) : (
                            <>
                                <span>💾</span>
                                <span>저장 후 이동</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UnsavedChangesModal;
