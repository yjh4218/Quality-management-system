import React from 'react';

/**
 * StatusBadgeRenderer: AG Grid cellRenderer용 공용 상태 배지 컴포넌트
 * - 색상 매핑 규칙을 props로 정의하여 일관된 둥근 알약(pill) 형태 배지 렌더링
 * - 매칭 실패 시 기본 스타일(회색 배지)로 자동 폴백 보장
 */
const StatusBadgeRenderer = (props) => {
    const value = props.value;
    if (value === undefined || value === null) {
        return null;
    }

    const valueStr = String(value).trim();

    // 1. 색상 매핑 매트릭스 정의
    const colorMap = {
        // 클레임/품질 감사 진행 단계
        '0단계 (접수 대기)': { bg: '#f1f5f9', text: '#475569' }, // 접수 대기
        '1단계 (원인 분석)': { bg: '#eff6ff', text: '#1d4ed8' }, // 원인분석
        '3단계 (대책 수립)': { bg: '#fffbeb', text: '#b45309' }, // 대책수립
        '3단계 (대책 적용)': { bg: '#fdf2f8', text: '#be185d' }, // 대책적용
        '4단계 (효과 검증)': { bg: '#f0fdf4', text: '#15803d' }, // 효과검증
        '4단계 (대책 제출)': { bg: '#f5f3ff', text: '#6d28d9' }, // 대책제출
        '5단계 (종결)': { bg: '#ecfdf5', text: '#047857' },       // 종결
        '대책 재요청': { bg: '#fff1f2', text: '#be123c' },         // 재요청
        '접수': { bg: '#f1f5f9', text: '#94a3b8' },
        '원인분석': { bg: '#eef2ff', text: '#0d6efd' },
        '완료': { bg: '#ecfdf5', text: '#16a34a' },
        '대기': { bg: '#fffbeb', text: '#f59e0b' },

        // 포장공간비율 / 적합성 판정
        'PASS': { bg: '#ecfdf5', text: '#16a34a' },
        '적합': { bg: '#ecfdf5', text: '#16a34a' },
        'FAIL': { bg: '#fff1f2', text: '#dc2626' },
        '부적합': { bg: '#fff1f2', text: '#dc2626' },
        'REFER': { bg: '#fffbeb', text: '#f59e0b' },
        '참고': { bg: '#fffbeb', text: '#f59e0b' },
        'NOT_APPLICABLE': { bg: '#f8fafc', text: '#64748b' },
        '해당없음': { bg: '#f8fafc', text: '#64748b' },

        // 일반 등급 (A, B, C, D)
        'A': { bg: '#ecfdf5', text: '#16a34a' },
        'B': { bg: '#eef2ff', text: '#0d6efd' },
        'C': { bg: '#fffbeb', text: '#f59e0b' },
        'D': { bg: '#fff1f2', text: '#dc2626' },
        
        // 추가 폴백 매핑
        'ACTIVE': { bg: '#ecfdf5', text: '#16a34a' },
        'INACTIVE': { bg: '#f1f5f9', text: '#94a3b8' }
    };

    // 2. 값의 부분 일치 및 전체 일치 확인하여 색상 결정
    let matched = colorMap[valueStr];

    if (!matched) {
        // 단계별 키워드 매핑 폴백
        if (valueStr.includes('접수') || valueStr.includes('대기')) {
            matched = colorMap['대기'];
        } else if (valueStr.includes('분석') || valueStr.includes('진행')) {
            matched = colorMap['원인분석'];
        } else if (valueStr.includes('완료') || valueStr.includes('종결') || valueStr.includes('합격')) {
            matched = colorMap['완료'];
        } else if (valueStr.includes('부적합') || valueStr.includes('실패') || valueStr.includes('반려')) {
            matched = colorMap['부적합'];
        }
    }

    // 3. 매칭 실패 시 기본 회색 배지로 폴백 (텍스트만 둥둥 뜨는 현상 방지)
    const style = matched ? {
        backgroundColor: matched.bg,
        color: matched.text,
        border: `1px solid ${matched.text}33`
    } : {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: '1px solid #cbd5e1'
    };

    return (
        <span 
            className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm"
            style={style}
        >
            {valueStr}
        </span>
    );
};

export default StatusBadgeRenderer;
