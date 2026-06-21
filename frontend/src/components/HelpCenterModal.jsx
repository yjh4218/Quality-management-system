import React, { useState, useEffect } from 'react';
import { getPageGuide } from '../api';

/**
 * 사용자 가이드 모달 컴포넌트
 * 데이터베이스에서 현재 페이지의 가이드를 실시간으로 조회하여 표시합니다.
 * 
 * @param {Object} props
 * @param {string} props.currentPage - 현재 활성화된 페이지 키
 * @param {Function} props.onClose - 모달 닫기 핸들러
 */
const HelpCenterModal = ({ currentPage, onClose, user }) => {
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                setLoading(true);
                const data = await getPageGuide(currentPage);
                // JSON 문자열로 저장된 섹션 정보를 파싱
                if (data.sectionsJson) {
                    data.sections = JSON.parse(data.sectionsJson);
                }
                setGuide(data);
            } catch (error) {
                setGuide({
                    title: "📄 이용 가이드",
                    sections: [
                        {
                            subtitle: "안내",
                            content: "이 화면에 대한 상세 가이드가 아직 준비되지 않았거나 서버 통신에 실패했습니다."
                        }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchGuide();
    }, [currentPage]);

    return (
        <div className="modal-overlay help-overlay">
            <div className="modal-content help-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>💡 {loading ? "가이드 로딩 중..." : guide?.title}</h3>
                    <button className="close-button" onClick={onClose}>
                        <span className="icon">✕</span> 닫기
                     </button>
                </div>
                
                <div className="modal-body white-bg">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>데이터를 가져오는 중입니다...</div>
                    ) : (
                        <>
                            <div className="help-intro">
                                QMS 전문 사용자 가이드입니다. 각 화면의 목적과 주요 동작 방식을 확인하세요.
                            </div>
                            
                            {isManufacturer && (
                                <div style={{
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{ fontWeight: '800', color: '#1d4ed8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🤝 제조사 담당자 필수 업무 요령
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                                        이 페이지는 완제품 품질 관리에 필수적인 연동 지점을 제공합니다. 
                                        제조 사양 변경 또는 품질 이상 징후 감증 시 즉각 소명 등록 또는 품질 담당자 핫라인으로 보고해 주세요.
                                    </div>
                                </div>
                            )}

                            <div className="help-sections">
                                {guide?.sections?.map((section, idx) => (
                                    <div key={idx} className="help-section-card">
                                        <h4>{section.subtitle}</h4>
                                        <p>{section.content}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="help-footer-note">
                                <p>※ 추가 기능 개발이나 오류 보고는 '시스템 관리자'를 통해 접수해 주세요.</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HelpCenterModal;
