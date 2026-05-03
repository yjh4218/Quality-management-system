import React, { useState, useEffect } from 'react';
import { updateProfile, getManufacturers } from './api';
import ChangePasswordModal from './ChangePasswordModal';

const ProfileModal = ({ user, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        companyName: user.companyName || '',
        department: user.department || '',
        position: user.position || ''
    });

    const [manufacturers, setManufacturers] = useState([]);
    const [isChangePwOpen, setIsChangePwOpen] = useState(false);

    useEffect(() => {
        const fetchMfrs = async () => {
            try {
                const res = await getManufacturers();
                setManufacturers(res.data);
            } catch (error) {
                // Silently fail
            }
        };
        fetchMfrs();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateProfile(formData);
            alert("프로필이 성공적으로 업데이트되었습니다.");
            onUpdate(); // Refresh user data in App.jsx
            onClose();
        } catch (error) {
            alert("프로필 수정에 실패했습니다.");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '450px' }}>
                {/* 1. Fixed Header Area */}
                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>👤</span> 개인정보 수정
                    </h2>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="modal-body white-bg">
                    <form id="profile-edit-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>이름 (Full Name)</label>
                            <input name="name" value={formData.name} onChange={handleChange} required placeholder="실명을 입력하세요." />
                        </div>
                        
                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>회사(제조사)명</label>
                            {user.companyName === '더파운더즈' ? (
                                <input name="companyName" value={formData.companyName} disabled style={{ backgroundColor: '#f7fafc', cursor: 'not-allowed' }} />
                            ) : (
                                <select name="companyName" value={formData.companyName} onChange={handleChange} required style={{ height: '45px' }}>
                                    <option value="">제조사를 선택하세요</option>
                                    {manufacturers.map(m => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>소속팀 / 부서</label>
                            <input name="department" value={formData.department} onChange={handleChange} required placeholder="예: 품질관리팀, 생산실 등" />
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '700', color: '#4a5568' }}>직책 / 직급</label>
                            <input name="position" value={formData.position} onChange={handleChange} placeholder="예: 팀장, 대리 등" />
                        </div>

                        <div style={{ marginTop: '25px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4a5568', fontWeight: '800' }}>계정 보안 설정</p>
                            <button 
                                type="button" 
                                className="secondary" 
                                style={{ width: '100%', borderColor: '#3182ce', color: '#3182ce', background: '#fff', fontWeight: '800', height: '42px' }}
                                onClick={() => setIsChangePwOpen(true)}
                            >
                                🔒 비밀번호 변경 프로세스 시작
                            </button>
                        </div>
                    </form>
                </div>

                {/* 3. Fixed Footer Area */}
                <div className="modal-footer" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                        <button type="submit" form="profile-edit-form" className="primary" style={{ padding: '10px 30px', fontWeight: '800' }}>✨ 프로필 업데이트</button>
                        <button type="button" onClick={onClose} className="secondary" style={{ padding: '10px 20px' }}>취소</button>
                    </div>
                </div>

                <ChangePasswordModal isOpen={isChangePwOpen} onClose={() => setIsChangePwOpen(false)} isForced={false} />
            </div>
        </div>
    );
};

export default ProfileModal;
