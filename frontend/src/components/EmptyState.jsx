import React from 'react';

/**
 * 대시보드 및 리스트 뷰에서 데이터가 없는 경우(0건) 
 * 일관된 UI 피드백을 전달하기 위한 공통 빈 상태 컴포넌트입니다.
 * 
 * @param {Object} props
 * @param {string} props.message - 화면에 표시할 빈 상태 설명 메시지
 * @param {string} [props.icon] - 표시할 이모지 또는 아이콘 (기본값: 🔍)
 */
const EmptyState = ({ message, icon = '🔍' }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            margin: '8px 0',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <span style={{ fontSize: '32px', marginBottom: '10px', display: 'block' }}>{icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', lineHeight: '1.4' }}>
                {message}
            </span>
        </div>
    );
};

export default EmptyState;
