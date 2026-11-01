import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    checkUserForPasswordReset,
    sendPasswordResetCode,
    verifyPasswordResetCode,
    confirmPasswordReset
} from './api';

const PasswordResetModal = ({ isOpen, onClose, initialUsername = '', onSuccess }) => {
    // Current active step: 1 (Account/Method), 2 (Verification Code), 3 (New Password), 4 (Completed)
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Step 1 State
    const [username, setUsername] = useState(initialUsername || '');
    const [accountInfo, setAccountInfo] = useState(null); // { username, maskedEmail, maskedPhone, hasEmail, hasPhone, isLocked }
    const [selectedMethod, setSelectedMethod] = useState('EMAIL'); // 'EMAIL' | 'SMS'

    // Step 2 State
    const [code, setCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180s
    const [resendCooldown, setResendCooldown] = useState(0); // 60s cooldown for resend
    const [resetToken, setResetToken] = useState('');
    const timerRef = useRef(null);
    const cooldownRef = useRef(null);

    // Step 3 State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Sync initial username when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setUsername(initialUsername || '');
            setAccountInfo(null);
            setSelectedMethod('EMAIL');
            setCode('');
            setTimeLeft(180);
            setResendCooldown(0);
            setResetToken('');
            setNewPassword('');
            setConfirmPasswordVal('');
            setErrorMsg('');

            // If initialUsername is already provided, check user automatically
            if (initialUsername && initialUsername.trim()) {
                handleCheckUser(initialUsername.trim());
            }
        } else {
            clearInterval(timerRef.current);
            clearInterval(cooldownRef.current);
        }
        return () => {
            clearInterval(timerRef.current);
            clearInterval(cooldownRef.current);
        };
    }, [isOpen, initialUsername]);

    // Timer effect for step 2
    useEffect(() => {
        if (step === 2) {
            setTimeLeft(180);
            setResendCooldown(60);

            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            clearInterval(cooldownRef.current);
            cooldownRef.current = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(cooldownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            clearInterval(cooldownRef.current);
        }
    }, [step]);

    if (!isOpen) return null;

    // Helper: format seconds to MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Step 1: Check user
    const handleCheckUser = async (targetUsername = username) => {
        if (!targetUsername || !targetUsername.trim()) {
            setErrorMsg('아이디를 입력해주세요.');
            return;
        }
        setErrorMsg('');
        setLoading(true);
        try {
            const res = await checkUserForPasswordReset(targetUsername.trim());
            const data = res.data?.data || res.data;
            setAccountInfo(data);
            // Default selected method
            if (data.hasEmail) {
                setSelectedMethod('EMAIL');
            } else if (data.hasPhone) {
                setSelectedMethod('SMS');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || '일치하는 사용자 정보를 찾을 수 없습니다.';
            setErrorMsg(typeof msg === 'string' ? msg : '일치하는 사용자 정보를 찾을 수 없습니다.');
            setAccountInfo(null);
        } finally {
            setLoading(false);
        }
    };

    // Step 1 -> Step 2: Send verification code
    const handleSendCode = async () => {
        if (!accountInfo) return;
        if (!selectedMethod) {
            setErrorMsg('인증번호를 수신할 수단을 선택해주세요.');
            return;
        }
        setErrorMsg('');
        setLoading(true);
        try {
            await sendPasswordResetCode(accountInfo.username, selectedMethod);
            setCode('');
            setStep(2);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || '인증번호 발송에 실패했습니다.';
            setErrorMsg(typeof msg === 'string' ? msg : '인증번호 발송에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Resend verification code
    const handleResendCode = async () => {
        if (resendCooldown > 0 || loading) return;
        setErrorMsg('');
        setLoading(true);
        try {
            await sendPasswordResetCode(accountInfo.username, selectedMethod);
            setTimeLeft(180);
            setResendCooldown(60);
            setCode('');
            // Reset timers
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            clearInterval(cooldownRef.current);
            cooldownRef.current = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(cooldownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || '인증번호 재발송에 실패했습니다.';
            setErrorMsg(typeof msg === 'string' ? msg : '인증번호 재발송에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 -> Step 3: Verify Code
    const handleVerifyCode = async (e) => {
        e?.preventDefault();
        if (!code || code.trim().length !== 6) {
            setErrorMsg('6자리 숫자 인증번호를 정확히 입력해주세요.');
            return;
        }
        if (timeLeft <= 0) {
            setErrorMsg('인증시간이 만료되었습니다. 인증번호를 재발송해주세요.');
            return;
        }
        setErrorMsg('');
        setLoading(true);
        try {
            const res = await verifyPasswordResetCode(accountInfo.username, code.trim());
            const data = res.data?.data || res.data;
            if (data?.resetToken) {
                setResetToken(data.resetToken);
                setStep(3);
            } else {
                setErrorMsg('인증 토큰이 유효하지 않습니다.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || '인증번호가 일치하지 않거나 만료되었습니다.';
            setErrorMsg(typeof msg === 'string' ? msg : '인증번호가 일치하지 않거나 만료되었습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Password validation rules
    const hasMinLength = newPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
    const isMatching = newPassword && newPassword === confirmPasswordVal;
    const isPasswordValid = hasMinLength && hasLetter && hasNumber && hasSpecial && isMatching;

    // Step 3 -> Finish: Confirm Password Reset
    const handleConfirmReset = async (e) => {
        e?.preventDefault();
        if (!isPasswordValid) {
            setErrorMsg('비밀번호 보안 규칙을 모두 충족하고 일치해야 합니다.');
            return;
        }
        setErrorMsg('');
        setLoading(true);
        try {
            await confirmPasswordReset(accountInfo.username, resetToken, newPassword);
            setStep(4);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || '비밀번호 재설정에 실패했습니다.';
            setErrorMsg(typeof msg === 'string' ? msg : '비밀번호 재설정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        if (onSuccess) {
            onSuccess(accountInfo?.username || username);
        }
        onClose();
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    };

    const modalContainerStyle = {
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out'
    };

    const headerStyle = {
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff'
    };

    const stepperStyle = {
        display: 'flex',
        padding: '12px 24px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        justifyContent: 'space-between'
    };

    const getStepItemStyle = (stepNum) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: step === stepNum ? '700' : '500',
        color: step === stepNum ? '#0284c7' : step > stepNum ? '#10b981' : '#94a3b8'
    });

    const bodyStyle = {
        padding: '24px',
        overflowY: 'auto',
        maxHeight: 'calc(80vh - 140px)'
    };

    const footerStyle = {
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        backgroundColor: '#f8fafc'
    };

    const buttonPrimaryStyle = {
        padding: '10px 20px',
        backgroundColor: '#0284c7',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'background 0.2s'
    };

    const buttonSecondaryStyle = {
        padding: '10px 16px',
        backgroundColor: '#ffffff',
        color: '#64748b',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    };

    return createPortal(
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalContainerStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            🔐
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                                비밀번호 재설정
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                안전한 본인확인을 거쳐 비밀번호를 직접 재설정합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Stepper */}
                <div style={stepperStyle}>
                    <div style={getStepItemStyle(1)}>
                        <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: step === 1 ? '#0284c7' : step > 1 ? '#10b981' : '#e2e8f0',
                            color: step >= 1 ? '#ffffff' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px'
                        }}>
                            {step > 1 ? '✓' : '1'}
                        </span>
                        <span>계정 확인</span>
                    </div>
                    <span style={{ color: '#cbd5e1', fontSize: '11px' }}>➔</span>
                    <div style={getStepItemStyle(2)}>
                        <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: step === 2 ? '#0284c7' : step > 2 ? '#10b981' : '#e2e8f0',
                            color: step >= 2 ? '#ffffff' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px'
                        }}>
                            {step > 2 ? '✓' : '2'}
                        </span>
                        <span>본인인증</span>
                    </div>
                    <span style={{ color: '#cbd5e1', fontSize: '11px' }}>➔</span>
                    <div style={getStepItemStyle(3)}>
                        <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: step === 3 ? '#0284c7' : step > 3 ? '#10b981' : '#e2e8f0',
                            color: step >= 3 ? '#ffffff' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px'
                        }}>
                            {step > 3 ? '✓' : '3'}
                        </span>
                        <span>비밀번호 재설정</span>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div style={{
                        margin: '16px 24px 0 24px',
                        padding: '12px 14px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#b91c1c',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <span>⚠️</span>
                        <div style={{ flex: 1, lineHeight: '1.4' }}>{errorMsg}</div>
                    </div>
                )}

                {/* Body Content */}
                <div style={bodyStyle}>
                    {/* STEP 1: Account & Method Selection */}
                    {step === 1 && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                    아이디 (ID)
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="아이디를 입력하세요"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setAccountInfo(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCheckUser();
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            height: '42px',
                                            padding: '0 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCheckUser()}
                                        disabled={loading || !username.trim()}
                                        style={{
                                            padding: '0 16px',
                                            backgroundColor: '#0284c7',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: !username.trim() || loading ? 'not-allowed' : 'pointer',
                                            opacity: !username.trim() || loading ? 0.6 : 1,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        계정 확인
                                    </button>
                                </div>
                            </div>

                            {/* Account Verification Details & Method Choice */}
                            {accountInfo && (
                                <div style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    backgroundColor: '#f8fafc',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}>
                                    {accountInfo.isLocked && (
                                        <div style={{
                                            padding: '10px 12px',
                                            backgroundColor: '#fff1f2',
                                            border: '1px solid #fecdd3',
                                            borderRadius: '8px',
                                            marginBottom: '14px',
                                            color: '#e11d48',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span>🚨</span>
                                            <span>비밀번호 5회 오류로 계정이 잠금 상태입니다. 본인확인 후 잠금이 자동 해제됩니다.</span>
                                        </div>
                                    )}

                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
                                        인증번호 수신 방법 선택
                                    </div>

                                    {/* Email Option */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: '#ffffff',
                                        border: selectedMethod === 'EMAIL' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        marginBottom: '10px',
                                        cursor: accountInfo.hasEmail ? 'pointer' : 'not-allowed',
                                        opacity: accountInfo.hasEmail ? 1 : 0.5
                                    }}>
                                        <input
                                            type="radio"
                                            name="resetMethod"
                                            value="EMAIL"
                                            checked={selectedMethod === 'EMAIL'}
                                            disabled={!accountInfo.hasEmail}
                                            onChange={() => setSelectedMethod('EMAIL')}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                                📧 등록된 이메일로 인증
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                {accountInfo.hasEmail ? accountInfo.maskedEmail : '등록된 이메일이 없습니다.'}
                                            </div>
                                        </div>
                                    </label>

                                    {/* SMS Option */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: '#ffffff',
                                        border: selectedMethod === 'SMS' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: accountInfo.hasPhone ? 'pointer' : 'not-allowed',
                                        opacity: accountInfo.hasPhone ? 1 : 0.5
                                    }}>
                                        <input
                                            type="radio"
                                            name="resetMethod"
                                            value="SMS"
                                            checked={selectedMethod === 'SMS'}
                                            disabled={!accountInfo.hasPhone}
                                            onChange={() => setSelectedMethod('SMS')}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                                📱 등록된 휴대폰(SMS)으로 인증
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                {accountInfo.hasPhone ? accountInfo.maskedPhone : '등록된 휴대폰 번호가 없습니다.'}
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: 6-Digit Code Verification */}
                    {step === 2 && (
                        <div>
                            <div style={{
                                textAlign: 'center',
                                padding: '16px',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '12px',
                                border: '1px solid #bae6fd',
                                marginBottom: '20px'
                            }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontWeight: '600' }}>
                                    {selectedMethod === 'EMAIL' ? '📧 등록된 이메일(' + accountInfo?.maskedEmail + ')' : '📱 등록된 휴대폰(' + accountInfo?.maskedPhone + ')'}로
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#0c4a6e', fontWeight: '700' }}>
                                    6자리 인증번호가 발송되었습니다.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyCode}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                                        인증번호 (6자리)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            style={{
                                                width: '100%',
                                                height: '52px',
                                                fontSize: '24px',
                                                fontWeight: '800',
                                                letterSpacing: '10px',
                                                textAlign: 'center',
                                                border: timeLeft <= 30 ? '2px solid #ef4444' : '2px solid #0284c7',
                                                borderRadius: '10px',
                                                boxSizing: 'border-box',
                                                color: '#0f172a'
                                            }}
                                            autoFocus
                                            required
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            right: '14px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            color: timeLeft <= 30 ? '#ef4444' : '#0284c7'
                                        }}>
                                            ⏱ {formatTime(timeLeft)}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    color: '#64748b',
                                    marginTop: '12px'
                                }}>
                                    <span>인증번호를 받지 못하셨나요?</span>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={resendCooldown > 0 || loading}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: resendCooldown > 0 ? '#94a3b8' : '#0284c7',
                                            cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            textDecoration: resendCooldown > 0 ? 'none' : 'underline'
                                        }}
                                    >
                                        {resendCooldown > 0 ? `재발송 (${resendCooldown}초)` : '인증번호 재발송'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* STEP 3: Set New Password */}
                    {step === 3 && (
                        <form onSubmit={handleConfirmReset}>
                            <div style={{
                                padding: '12px 14px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '10px',
                                color: '#166534',
                                fontSize: '13px',
                                fontWeight: '600',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>✓</span>
                                <span>본인확인이 완료되었습니다. 새로운 비밀번호를 설정해주세요.</span>
                            </div>

                            {/* New Password */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                    새 비밀번호
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            padding: '0 40px 0 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {showNewPassword ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                    새 비밀번호 확인
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="새 비밀번호를 한번 더 입력해주세요"
                                        value={confirmPasswordVal}
                                        onChange={(e) => setConfirmPasswordVal(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            padding: '0 40px 0 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {showConfirmPassword ? '👁️' : '🔒'}
                                    </button>
                                </div>
                            </div>

                            {/* Password Quality Criteria Checklist */}
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}>
                                <div style={{ fontWeight: '700', color: '#475569', marginBottom: '6px' }}>비밀번호 필수 요건:</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <span style={{ color: hasMinLength ? '#10b981' : '#94a3b8', fontWeight: hasMinLength ? '700' : '400' }}>
                                        {hasMinLength ? '✓' : '○'} 8자 이상
                                    </span>
                                    <span style={{ color: hasLetter ? '#10b981' : '#94a3b8', fontWeight: hasLetter ? '700' : '400' }}>
                                        {hasLetter ? '✓' : '○'} 영문자 포함
                                    </span>
                                    <span style={{ color: hasNumber ? '#10b981' : '#94a3b8', fontWeight: hasNumber ? '700' : '400' }}>
                                        {hasNumber ? '✓' : '○'} 숫자 포함
                                    </span>
                                    <span style={{ color: hasSpecial ? '#10b981' : '#94a3b8', fontWeight: hasSpecial ? '700' : '400' }}>
                                        {hasSpecial ? '✓' : '○'} 특수문자 포함
                                    </span>
                                </div>
                                <div style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                                    <span style={{ color: isMatching ? '#10b981' : confirmPasswordVal ? '#ef4444' : '#94a3b8', fontWeight: isMatching ? '700' : '400' }}>
                                        {isMatching ? '✓ 비밀번호가 일치합니다' : confirmPasswordVal ? '✕ 비밀번호가 일치하지 않습니다' : '○ 비밀번호 일치 확인'}
                                    </span>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* STEP 4: Success View */}
                    {step === 4 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                fontSize: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto'
                            }}>
                                ✓
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                비밀번호 재설정 완료!
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                                새 비밀번호로 안전하게 변경되었습니다.<br />
                                {accountInfo?.isLocked && (
                                    <strong style={{ color: '#0284c7' }}>잠금 처리되었던 계정도 정상 해제되었습니다.<br /></strong>
                                )}
                                새 비밀번호로 다시 로그인해 주세요.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={footerStyle}>
                    {step === 1 && (
                        <>
                            <button type="button" onClick={onClose} style={buttonSecondaryStyle}>
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSendCode}
                                disabled={!accountInfo || loading}
                                style={{
                                    ...buttonPrimaryStyle,
                                    cursor: !accountInfo || loading ? 'not-allowed' : 'pointer',
                                    opacity: !accountInfo || loading ? 0.6 : 1
                                }}
                            >
                                {loading ? '발송 중...' : '인증번호 발송'}
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button type="button" onClick={() => setStep(1)} style={buttonSecondaryStyle}>
                                이전
                            </button>
                            <button
                                type="button"
                                onClick={handleVerifyCode}
                                disabled={code.length !== 6 || timeLeft <= 0 || loading}
                                style={{
                                    ...buttonPrimaryStyle,
                                    cursor: code.length !== 6 || timeLeft <= 0 || loading ? 'not-allowed' : 'pointer',
                                    opacity: code.length !== 6 || timeLeft <= 0 || loading ? 0.6 : 1
                                }}
                            >
                                {loading ? '확인 중...' : '인증번호 확인'}
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <button type="button" onClick={() => setStep(2)} style={buttonSecondaryStyle}>
                                이전
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReset}
                                disabled={!isPasswordValid || loading}
                                style={{
                                    ...buttonPrimaryStyle,
                                    cursor: !isPasswordValid || loading ? 'not-allowed' : 'pointer',
                                    opacity: !isPasswordValid || loading ? 0.6 : 1
                                }}
                            >
                                {loading ? '변경 중...' : '비밀번호 재설정 완료'}
                            </button>
                        </>
                    )}

                    {step === 4 && (
                        <button
                            type="button"
                            onClick={handleFinish}
                            style={{
                                ...buttonPrimaryStyle,
                                width: '100%',
                                padding: '12px'
                            }}
                        >
                            로그인하러 가기
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PasswordResetModal;
