import React, { useState } from 'react';
import { findPassword } from './api';

const FindPasswordModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/[^0-9]/g, '');
        let formatted = input;
        
        if (input.length > 3 && input.length <= 7) {
            formatted = `${input.slice(0, 3)}-${input.slice(3)}`;
        } else if (input.length > 7) {
            formatted = `${input.slice(0, 3)}-${input.slice(3, 7)}-${input.slice(7, 11)}`;
        }
        setFormData({ ...formData, phone: formatted });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await findPassword(formData);
            alert("입력하신 이메일로 임시 비밀번호가 발송되었습니다.\n로그인 후 반드시 비밀번호를 변경해 주세요.");
            onClose();
        } catch (err) {
            alert(err.response?.data || "일치하는 회원 정보를 찾을 수 없습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '450px' }}>
                {/* 1. Fixed Header Area */}
                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🔍</span> 비밀번호 찾기
                    </h2>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body Area */}
                <div className="modal-body white-bg">
                    <div style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '25px' }}>
                        <p style={{ margin: 0, textAlign: 'center', color: '#4a5568', fontSize: '13.5px', lineHeight: '1.6', fontWeight: '800' }}>
                            💡 계정에 등록된 정보를 입력해주세요. <br/>일치하는 경우 <span style={{ color: '#3182ce' }}>임시 비밀번호</span>를 발송해 드립니다.
                        </p>
                    </div>

                    <form id="find-password-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>아이디 (ID)</label>
                            <input
                                type="text"
                                placeholder="아이디를 입력하세요."
                                style={{ height: '45px' }}
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>성함</label>
                            <input
                                type="text"
                                placeholder="실명을 입력하세요."
                                style={{ height: '45px' }}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>이메일 주소</label>
                            <input
                                type="email"
                                placeholder="example@email.com"
                                style={{ height: '45px' }}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>전화번호</label>
                            <input
                                type="text"
                                placeholder="010-0000-0000"
                                style={{ height: '45px' }}
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                maxLength={13}
                                required
                            />
                        </div>
                    </form>
                </div>

                {/* 3. Fixed Footer Area */}
                <div className="modal-footer" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                        <button 
                            type="submit" 
                            form="find-password-form"
                            disabled={loading}
                            className="primary"
                            style={{ padding: '10px 30px', fontWeight: '800' }}
                        >
                            {loading ? '🔄 처리 중...' : '📩 임시 비밀번호 발급'}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="secondary"
                            style={{ padding: '10px 20px' }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FindPasswordModal;
