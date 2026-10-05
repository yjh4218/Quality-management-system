import { useEffect, useRef } from 'react';

/**
 * useGridTabRecovery
 * 탭 전환(visibility: hidden -> visible) 시 AG Grid의 가상 스크롤러(Virtualization Engine)가
 * 행(rows) 렌더링을 drop하여 텅 빈 상태로 남는 현상을 방지하고, 탭 활성화 즉시 화면을 100% 온전히 복원하는 훅.
 *
 * @param {React.RefObject} gridRef - AgGridReact ref
 * @param {boolean} isActive - 현재 탭이 활성화 상태인지 여부
 * @param {object} options - 추가 옵션 (sizeColumnsToFit, delay)
 */
export default function useGridTabRecovery(gridRef, isActive, options = {}) {
    const { sizeColumnsToFit = false } = options;
    const isFirstMount = useRef(true);

    const refreshGrid = () => {
        if (!gridRef?.current?.api) return;

        const api = gridRef.current.api;

        // 1단계: 즉각적인 프레임 렌더러 복구
        requestAnimationFrame(() => {
            try {
                api.redrawRows();
                api.refreshCells({ force: true });
                if (sizeColumnsToFit) {
                    api.sizeColumnsToFit();
                }
            } catch (err) {
                // Ignore transient layout errors during transition
            }
        });

        // 2단계: 브라우저 DOM 페인트 완료 후 2차 보정 (60ms)
        const t1 = setTimeout(() => {
            try {
                if (gridRef?.current?.api) {
                    gridRef.current.api.redrawRows();
                }
            } catch (err) {
                // Ignore
            }
        }, 60);

        // 3단계: 복잡한 뷰포트 레이아웃 안정화 (150ms)
        const t2 = setTimeout(() => {
            try {
                if (gridRef?.current?.api) {
                    gridRef.current.api.redrawRows();
                }
            } catch (err) {
                // Ignore
            }
        }, 150);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    };

    // 1. isActive prop 변화 감지
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        if (isActive) {
            const cleanup = refreshGrid();
            return cleanup;
        }
    }, [isActive]);

    // 2. 전역 탭 활성화 커스텀 이벤트 및 윈도우 리사이즈 보정 수신
    useEffect(() => {
        const handleTabActivated = () => {
            if (isActive) {
                refreshGrid();
            }
        };

        window.addEventListener('qms-tab-activated', handleTabActivated);
        window.addEventListener('resize', handleTabActivated);

        return () => {
            window.removeEventListener('qms-tab-activated', handleTabActivated);
            window.removeEventListener('resize', handleTabActivated);
        };
    }, [isActive]);
}
