import React from 'react';

/**
 * 대시보드 및 조회 화면에서 월, 분기, 반년, 년 단위의 빠른 날짜 선택을 제공하는 재사용 훅입니다.
 */
export function useDateRangePreset(setStartDate, setEndDate) {
    const applyPreset = (type) => {
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];
        let startObj = new Date();

        switch (type) {
            case '월':
            case 'month':
                startObj.setMonth(today.getMonth() - 1);
                break;
            case '분기':
            case 'quarter':
                startObj.setMonth(today.getMonth() - 3);
                break;
            case '반년':
            case 'halfYear':
                startObj.setMonth(today.getMonth() - 6);
                break;
            case '년':
            case 'year':
                startObj.setFullYear(today.getFullYear() - 1);
                break;
            default:
                break;
        }

        const startStr = startObj.toISOString().split('T')[0];
        if (setStartDate) setStartDate(startStr);
        if (setEndDate) setEndDate(endStr);
    };

    const renderPresetButtons = () => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[
                { label: '월', key: '월', title: '최근 1개월' },
                { label: '분기', key: '분기', title: '최근 3개월 (분기)' },
                { label: '반년', key: '반년', title: '최근 6개월 (반년)' },
                { label: '년', key: '년', title: '최근 1년' }
            ].map(b => (
                <button
                    key={b.key}
                    type="button"
                    title={b.title}
                    onClick={() => applyPreset(b.key)}
                    style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#4f46e5',
                        backgroundColor: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                        height: '32px'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#eef2ff';
                        e.currentTarget.style.color = '#4f46e5';
                    }}
                >
                    {b.label}
                </button>
            ))}
        </div>
    );

    return { applyPreset, renderPresetButtons };
}

export default useDateRangePreset;
