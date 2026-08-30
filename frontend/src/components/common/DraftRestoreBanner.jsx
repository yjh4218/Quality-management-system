import React from 'react';

/**
 * 💾 폼 임시저장 복원 안내 배너 (DraftRestoreBanner)
 * 이전에 입력 중이던 임시 저장본이 있을 때 상단에 안내 배너를 띄워 원클릭 복원 또는 삭제를 지원합니다.
 */
const DraftRestoreBanner = ({
    hasDraft,
    draftSavedAt,
    onRestore,
    onClear
}) => {
    if (!hasDraft) return null;

    return (
        <div className="draft-restore-banner">
            <div className="draft-restore-content">
                <span>💾 작성 중이던 임시 저장본이 있습니다.</span>
                {draftSavedAt && (
                    <span className="draft-restore-time">({draftSavedAt} 자동 저장)</span>
                )}
            </div>
            <div className="draft-restore-actions">
                <button
                    type="button"
                    className="draft-restore-btn restore"
                    onClick={onRestore}
                >
                    🔄 복원하기
                </button>
                <button
                    type="button"
                    className="draft-restore-btn dismiss"
                    onClick={onClear}
                >
                    삭제
                </button>
            </div>
        </div>
    );
};

export default DraftRestoreBanner;
