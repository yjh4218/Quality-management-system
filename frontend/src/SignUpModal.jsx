import React, { useState, useEffect } from 'react';
import { getManufacturers, checkUsername, registerUser } from './api';

const SignUpModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        companyName: '',
        department: '',
        phone: '',
        email: ''
    });
    const [manufacturers, setManufacturers] = useState([]);
    const [isIdChecked, setIsIdChecked] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchManufacturers();
        }
    }, [isOpen]);

    const fetchManufacturers = async () => {
        try {
            const res = await getManufacturers();
            setManufacturers(res.data);
        } catch (err) {
            // Silently fail or handle error state
        }
    };

    const handleCheckId = async () => {
        if (!formData.username) {
            alert("아이디를 입력해주세요.");
            return;
        }
        try {
            const res = await checkUsername(formData.username);
            if (res.data.exists) {
                alert("이미 사용 중인 아이디입니다.");
                setIsIdChecked(false);
            } else {
                alert("사용 가능한 아이디입니다.");
                setIsIdChecked(true);
            }
        } catch (err) {
            alert("아이디 중복 확인 중 오류가 발생했습니다.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isIdChecked) {
            alert("아이디 중복 확인을 먼저 진행해주세요.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (!formData.companyName) {
            alert("소속 회사를 선택해주세요.");
            return;
        }

        setLoading(true);
        try {
            await registerUser(formData);
            alert("회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.");
            onClose();
        } catch (err) {
            alert(err.response?.data || "회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (e) => {
        const input = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 남기기
        let formatted = input;
        
        if (input.length > 3 && input.length <= 7) {
            formatted = `${input.slice(0, 3)}-${input.slice(3)}`;
        } else if (input.length > 7) {
            formatted = `${input.slice(0, 3)}-${input.slice(3, 7)}-${input.slice(7, 11)}`;
        }
        
        setFormData({ ...formData, phone: formatted });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '500px' }}>
                {/* 1. Fixed Header Area */}
                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', color: '#0056b3' }}>
                        <span>✨</span> 회원가입 신청
                    </h2>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="modal-body white-bg">
                    <form id="signup-form" onSubmit={handleSubmit} className="drawer-body-form">
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>아이디 (ID)</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="사용할 아이디를 입력하세요."
                                    style={{ flex: 1, height: '45px' }}
                                    value={formData.username}
                                    onChange={(e) => {
                                        setFormData({ ...formData, username: e.target.value });
                                        setIsIdChecked(false);
                                    }}
                                    required
                                />
                                <button 
                                    type="button" 
                                    onClick={handleCheckId}
                                    className="secondary"
                                    style={{ padding: '0 20px', height: '45px', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: '700' }}
                                >
                                    중복 확인
                                </button>
                            </div>
                            {isIdChecked && <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#38a169', fontWeight: '600' }}>✓ 사용 가능한 아이디입니다.</p>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>비밀번호</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    style={{ height: '45px' }}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>비밀번호 확인</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    style={{ height: '45px' }}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>성함 (Full Name)</label>
                                <input
                                    type="text"
                                    placeholder="홍길동"
                                    style={{ height: '45px', background: '#fff' }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>소속 회사 선택</label>
                                <select
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                    style={{ width: '100%', height: '45px', background: '#fff' }}
                                >
                                    <option value="">회사를 선택하세요</option>
                                    <option value="더파운더즈">더파운더즈 (관리자/품질팀)</option>
                                    {manufacturers.map(m => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>부서 / 팀</label>
                                <input
                                    type="text"
                                    placeholder="예: 품질관리팀"
                                    style={{ height: '45px', background: '#fff' }}
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>연락처 (Phone)</label>
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
                        </div>
                    </form>
                </div>

                {/* 3. Fixed Footer Area */}
                <div className="modal-footer" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                        <button 
                            type="submit" 
                            form="signup-form"
                            disabled={loading}
                            className="primary"
                            style={{ padding: '10px 30px', fontWeight: '800' }}
                        >
                            {loading ? '🚀 가입 신청 중...' : '🎉 회원가입 신청 완료'}
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

export default SignUpModal;
