import React, { useState } from 'react';
import { login, getCurrentUser } from './api';
import SignUpModal from './SignUpModal';
import FindPasswordModal from './FindPasswordModal';
import ChangePasswordModal from './ChangePasswordModal';

const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [failedCount, setFailedCount] = useState(0);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isFindPwOpen, setIsFindPwOpen] = useState(false);
    const [isForcedResetOpen, setIsForcedResetOpen] = useState(false);

    const showAlert = (message) => {
        setAlertModal({ isOpen: true, message });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            
            // Check if password reset is required
            const userRes = await getCurrentUser();
            if (userRes.data.passwordResetRequired) {
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

            showAlert(displayMessage);
        }
    };

    const containerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5'
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
                    <h1 style={{ color: '#0056b3', margin: '0', fontSize: '28px' }}>QMS</h1>
                    <p style={{ color: '#666', marginTop: '5px' }}>Quality Management System</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>아이디 입력</label>
                        <input
                            type="text"
                            placeholder="아이디를 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <label>비밀번호 입력</label>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
                        로그인
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
                        <button 
                            type="button" 
                            onClick={() => setIsSignUpOpen(true)}
                            style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                        >
                            회원가입하기
                        </button>
                        <span style={{ color: '#ddd' }}>|</span>
                        <button 
                            type="button" 
                            onClick={() => setIsFindPwOpen(true)}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}
                        >
                            아이디/비밀번호 조회
                        </button>
                    </div>

                    {failedCount >= 5 && (
                        <p style={{ color: '#dc3545', textAlign: 'center', marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                            계정이 잠금 처리되었습니다. 내부에 문의해 주세요.
                        </p>
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

            {/* 커스텀 Alert 모달 */}
            {alertModal.isOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalBoxStyle}>
                        <p style={{ fontSize: '16px', marginBottom: '24px', color: '#333', fontWeight: '500', whiteSpace: 'pre-wrap' }}>
                            {alertModal.message}
                        </p>
                        <button 
                            onClick={() => setAlertModal({ isOpen: false, message: '' })} 
                            style={{ padding: '8px 32px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
