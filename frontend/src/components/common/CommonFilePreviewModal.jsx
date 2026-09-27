import React, { useEffect } from 'react';

/**
 * 전사 공통 파일/이미지/PDF 고화질 뷰어 모달
 * - 기준 디자인: SalesChannelManagement.jsx의 [🏷️ 채널 스티커 첨부 규정 미리보기] 규격
 */
const CommonFilePreviewModal = ({
    isOpen = true,
    file = null, // { url: string, title?: string, type?: string }
    title = '미리보기',
    onClose
}) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen || !file) return null;

    const fileUrl = typeof file === 'string' ? file : file.url;
    const fileTitle = (typeof file === 'object' && (file.title || file.name)) || title;
    
    // PDF 여부 판별
    const isPdf = (typeof file === 'object' && file.type?.toUpperCase() === 'PDF') ||
                  (fileUrl && fileUrl.toLowerCase().split('?')[0].endsWith('.pdf'));
    
    const displayType = isPdf ? 'PDF' : (typeof file === 'object' && file.type ? file.type.toUpperCase() : 'IMAGE');

    return (
        <div 
            onClick={onClose}
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(15, 23, 42, 0.75)', 
                zIndex: 99999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                backdropFilter: 'blur(4px)' 
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    width: '80vw', 
                    height: '85vh', 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' 
                }}
            >
                {/* 헤더 영역 */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px', 
                    borderBottom: '1px solid #e2e8f0', 
                    paddingBottom: '10px' 
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏷️</span> {fileTitle} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal' }}>({displayType})</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                style={{
                                    textDecoration: 'none',
                                    fontSize: '12px',
                                    padding: '6px 12px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    borderRadius: '6px',
                                    fontWeight: '600'
                                }}
                            >
                                💾 원본 저장
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ 
                                border: 'none', 
                                background: '#f1f5f9', 
                                borderRadius: '50%', 
                                width: '32px', 
                                height: '32px', 
                                cursor: 'pointer', 
                                fontWeight: 'bold',
                                fontSize: '15px',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 본문 뷰어 영역 */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    overflow: 'auto', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px',
                    position: 'relative'
                }}>
                    {isPdf ? (
                        <iframe 
                            src={fileUrl} 
                            title={fileTitle} 
                            style={{ width: '100%', height: '100%', border: 'none' }} 
                        />
                    ) : (
                        <img 
                            src={fileUrl} 
                            alt={fileTitle} 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommonFilePreviewModal;
