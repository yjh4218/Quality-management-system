import React from 'react';

export default function EmptyState({ icon = "📋", title = "데이터가 없습니다", message = "" }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', margin: 0 }}>
                {title}
            </h3>
            {message && (
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: 0, lineHeight: '1.5' }}>
                    {message}
                </p>
            )}
        </div>
    );
}
