import React from 'react';

const SaveConfirmModal = ({ isOpen, onClose, onConfirm, title = "저장 확인", message = "저장하시겠습니까?" }) => {
    if (!isOpen) return null;

    return (
        <div 
            onClick={e => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(2px)'
            }}
        >
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '320px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                    {title}
                </div>
                <div style={{ fontSize: '15px', color: '#666', marginBottom: '24px' }}>
                    {message}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        취소
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#1890ff',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveConfirmModal;
