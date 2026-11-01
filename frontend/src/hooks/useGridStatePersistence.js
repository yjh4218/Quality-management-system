import { useEffect, useRef, useCallback } from 'react';

/**
 * useGridStatePersistence
 * AG Grid의 컬럼 설정(컬럼 너비, 순서, 숨김 여부, 정렬 등)을 localStorage에 영속화하여,
 * 화면을 새로고침하거나 탭을 닫았다 다시 열어도 사용자가 조정한 컬럼 레이아웃을 100% 복원하는 훅.
 *
 * @param {React.RefObject} gridRef - AgGridReact ref
 * @param {string} storageKey - localStorage에 저장될 유니크 키 (예: 'qms_grid_product_master')
 * @returns {object} { resetColumnState }
 */
export default function useGridStatePersistence(gridRef, storageKey) {
    const isApplyingRef = useRef(false);
    const saveTimerRef = useRef(null);

    // 컬럼 상태 저장 (디바운스 300ms)
    const saveState = useCallback(() => {
        if (!storageKey || !gridRef?.current?.api || isApplyingRef.current) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            try {
                const api = gridRef.current?.api;
                if (!api) return;

                const columnState = typeof api.getColumnState === 'function' ? api.getColumnState() : null;
                if (columnState && Array.isArray(columnState) && columnState.length > 0) {
                    localStorage.setItem(storageKey, JSON.stringify(columnState));
                }
            } catch (err) {
                // Ignore localStorage errors (e.g. quota or privacy mode)
            }
        }, 300);
    }, [gridRef, storageKey]);

    // 컬럼 상태 복원
    const restoreState = useCallback(() => {
        if (!storageKey || !gridRef?.current?.api) return;

        try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) return;

            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed) || parsed.length === 0) return;

            const api = gridRef.current.api;
            if (typeof api.applyColumnState === 'function') {
                isApplyingRef.current = true;
                api.applyColumnState({
                    state: parsed,
                    applyOrder: true
                });
                setTimeout(() => {
                    isApplyingRef.current = false;
                }, 100);
            }
        } catch (err) {
            // Safe fallback if schema changed
            isApplyingRef.current = false;
        }
    }, [gridRef, storageKey]);

    // 컬럼 상태 초기화
    const resetColumnState = useCallback(() => {
        if (!storageKey || !gridRef?.current?.api) return;

        try {
            localStorage.removeItem(storageKey);
            const api = gridRef.current.api;
            if (typeof api.resetColumnState === 'function') {
                api.resetColumnState();
            }
        } catch (err) {
            // Ignore
        }
    }, [gridRef, storageKey]);

    // 그리드 마운트 및 준비 시 복원 & 이벤트 바인딩
    useEffect(() => {
        if (!storageKey || !gridRef?.current) return;

        let checkInterval = null;
        let attempts = 0;

        const tryRestore = () => {
            if (gridRef.current?.api) {
                restoreState();
                if (checkInterval) clearInterval(checkInterval);
            } else if (++attempts > 20) {
                if (checkInterval) clearInterval(checkInterval);
            }
        };

        // 그리드 API 준비 대기
        tryRestore();
        if (!gridRef.current?.api) {
            checkInterval = setInterval(tryRestore, 100);
        }

        return () => {
            if (checkInterval) clearInterval(checkInterval);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [storageKey, gridRef, restoreState]);

    return {
        saveColumnState: saveState,
        restoreColumnState: restoreState,
        resetColumnState
    };
}

