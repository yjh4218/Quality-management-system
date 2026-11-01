import React, { useState } from 'react';
import { login, getCurrentUser } from './api';
import SignUpModal from './SignUpModal';
import FindPasswordModal from './FindPasswordModal';
import ChangePasswordModal from './ChangePasswordModal';
import PasswordResetModal from './PasswordResetModal';

const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [failedCount, setFailedCount] = useState(0);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', isPasswordError: false });
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isFindPwOpen, setIsFindPwOpen] = useState(false);
    const [isForcedResetOpen, setIsForcedResetOpen] = useState(false);
    const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
    const [resetSuccessMessage, setResetSuccessMessage] = useState('');

    const showAlert = (message, isPasswordError = false) => {
        setAlertModal({ isOpen: true, message, isPasswordError });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);

            // Check if password reset is required
            const userRes = await getCurrentUser();
            if (userRes?.data) {
                localStorage.setItem('user_info', JSON.stringify(userRes.data));
                sessionStorage.setItem('qms_authenticated', 'true');
            }
            if (userRes?.data?.passwordResetRequired) {
                setIsForcedResetOpen(true);
            } else {
                onLoginSuccess();
            }
        } catch (err) {
            setFailedCount(prev => prev + 1);

            const serverMessage = err.response?.data;
            let displayMessage = "아이디 또는 비밀번호가 일치하지 않습니다.";

            if (serverMessage) {
                if (typeof serverMessage === 'string') {
                    displayMessage = serverMessage;
                } else if (typeof serverMessage === 'object' && serverMessage.message) {
                    displayMessage = serverMessage.message;
                }
            }

            showAlert(displayMessage, true);
        }
    };

    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9', // Matte modern slate gray
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        zIndex: 9999
    };

    const loginBoxStyle = {
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
    };

    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const modalBoxStyle = {
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '8px',
        minWidth: '320px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    };

    return (
        <div style={containerStyle}>
            <div style={loginBoxStyle}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ color: '#0284c7', margin: '0', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>QMS</h1>
                    <p style={{ color: '#64748b', marginTop: '5px', fontSize: '13px', fontWeight: '500' }}>Quality Management System</p>
                </div>

                {resetSuccessMessage && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px 14px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: '#166534',
                        fontSize: '13px',
                        fontWeight: '600',
                        textAlign: 'center',
                        lineHeight: '1.4'
                    }}>
                        ✓ {resetSuccessMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>아이디 입력</label>
                        <input
                            type="text"
                            placeholder="아이디를 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>비밀번호 입력</label>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.15)'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0369a1'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#0284c7'}
                    >
                        로그인
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => setIsSignUpOpen(true)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                        >
                            회원가입하기
                        </button>
                        <span style={{ color: '#e2e8f0' }}>|</span>
                        <button
                            type="button"
                            onClick={() => setIsPasswordResetOpen(true)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                        >
                            비밀번호 재설정
                        </button>
                        <span style={{ color: '#e2e8f0' }}>|</span>
                        <button
                            type="button"
                            onClick={() => setIsFindPwOpen(true)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        >
                            아이디 찾기
                        </button>
                    </div>

                    {failedCount >= 1 && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            backgroundColor: failedCount >= 5 ? '#fef2f2' : '#f0f9ff',
                            border: failedCount >= 5 ? '1px solid #fecaca' : '1px solid #bae6fd',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                color: failedCount >= 5 ? '#dc3545' : '#0369a1',
                                margin: '0 0 8px 0',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}>
                                {failedCount >= 5
                                    ? '🚨 계정이 잠금 처리되었습니다.'
                                    : `비밀번호 입력 오류 (${failedCount}/5회)`}
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsPasswordResetOpen(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#0284c7',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0
                                }}
                            >
                                🔑 본인인증으로 비밀번호 재설정 {failedCount >= 5 && '& 잠금 해제'}
                            </button>
                        </div>
                    )}
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    &copy; 2026 QMS. All rights reserved.
                </div>
            </div>

            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <FindPasswordModal isOpen={isFindPwOpen} onClose={() => setIsFindPwOpen(false)} />
            <ChangePasswordModal
                isOpen={isForcedResetOpen}
                isForced={true}
                onClose={() => {
                    setIsForcedResetOpen(false);
                    onLoginSuccess();
                }}
            />
            <PasswordResetModal
                isOpen={isPasswordResetOpen}
                initialUsername={username}
                onClose={() => setIsPasswordResetOpen(false)}
                onSuccess={(resetUser) => {
                    setIsPasswordResetOpen(false);
                    setFailedCount(0);
                    setPassword('');
                    if (resetUser) setUsername(resetUser);
                    setResetSuccessMessage('비밀번호가 안전하게 재설정되었습니다. 새 비밀번호로 로그인해주세요.');
                    setTimeout(() => setResetSuccessMessage(''), 8000);
                }}
            />

            {/* 커스텀 Alert 모달 */}
            {alertModal.isOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalBoxStyle}>
                        <p style={{ fontSize: '15px', marginBottom: '20px', color: '#333', fontWeight: '500', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {alertModal.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button
                                onClick={() => setAlertModal({ isOpen: false, message: '', isPasswordError: false })}
                                style={{ padding: '8px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                            >
                                확인
                            </button>
                            {alertModal.isPasswordError && (
                                <button
                                    onClick={() => {
                                        setAlertModal({ isOpen: false, message: '', isPasswordError: false });
                                        setIsPasswordResetOpen(true);
                                    }}
                                    style={{ padding: '8px 18px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                >
                                    비밀번호 재설정
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;