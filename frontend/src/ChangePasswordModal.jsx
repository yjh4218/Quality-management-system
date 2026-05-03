import React, { useState } from 'react';
import { changePassword } from './api';

const ChangePasswordModal = ({ isOpen, onClose, isForced = false }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmNewPassword) {
            alert("새 비밀번호와 확인 입력이 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            await changePassword({
                currentPassword: isForced ? null : formData.currentPassword,
                newPassword: formData.newPassword
            });
            alert("비밀번호가 성공적으로 변경되었습니다.");
            onClose();
        } catch (err) {
            alert(err.response?.data || "비밀번호 변경 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={isForced ? null : onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
                {/* 1. Fixed Header Area */}
                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>🔒</span> {isForced ? '임시 비밀번호 필수 변경' : '비밀번호 변경'}
                    </h2>
                    {!isForced && (
                        <button onClick={onClose} className="secondary close-button">
                            <span className="icon">×</span> 닫기
                        </button>
                    )}
                </div>

                {/* 2. Modal Body Area */}
                <div className="modal-body white-bg">
                    {isForced && (
                        <div style={{ padding: '15px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '12px', marginBottom: '25px' }}>
                            <p style={{ color: '#c53030', fontSize: '13px', margin: 0, textAlign: 'center', fontWeight: '800', lineHeight: '1.5' }}>
                                ⚠️ 보안을 위해 임시 비밀번호를 새로운 비밀번호로 변경해야 서비스 이용이 가능합니다.
                            </p>
                        </div>
                    )}

                    <form id="change-password-form" onSubmit={handleSubmit}>
                        {!isForced && (
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>현재 비밀번호</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    style={{ height: '45px' }}
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>새 비밀번호</label>
                            <input
                                type="password"
                                placeholder="최소 8자 이상 (영문/숫자/특수문자)"
                                style={{ height: '45px' }}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>새 비밀번호 확인</label>
                            <input
                                type="password"
                                placeholder="동일하게 입력해주세요."
                                style={{ height: '45px' }}
                                value={formData.confirmNewPassword}
                                onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </form>
                </div>

                {/* 3. Fixed Footer Area */}
                <div className="modal-footer" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                        <button 
                            type="submit" 
                            form="change-password-form"
                            disabled={loading}
                            className="primary"
                            style={{ padding: '10px 30px', fontWeight: '800' }}
                        >
                            {loading ? '🔄 처리 중...' : '비밀번호 변경 완료'}
                        </button>
                        {!isForced && (
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="secondary"
                                style={{ padding: '10px 20px' }}
                            >
                                취소
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
