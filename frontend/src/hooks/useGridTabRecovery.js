import { useEffect, useRef } from 'react';

/**
 * useGridTabRecovery
 * 탭 전환(오프스크린 -> 온스크린) 시 AG Grid의 가상 스크롤러(Virtualization Engine)가
 * 행(rows) 렌더링을 멈추거나 백지로 남는 현상을 방지하고,
 * 탭 활성화 즉시 화면을 100% 온전히 복원 및 동기화하는 훅.
 *
 * @param {React.RefObject} gridRef - AgGridReact ref
 * @param {boolean} isActive - 현재 탭이 활성화 상태인지 여부
 * @param {object} options - 추가 옵션 (sizeColumnsToFit, onRecover)
 */
export default function useGridTabRecovery(gridRef, isActive, options = {}) {
    const { sizeColumnsToFit = false, onRecover = null } = options;
    const isFirstMount = useRef(true);

    const refreshGrid = () => {
        if (!gridRef?.current?.api) return;

        const api = gridRef.current.api;

        const executeRecovery = () => {
            try {
                // 1) 그리드 뷰포트 크기 강제 재측정 (AG Grid 31+)
                if (typeof api.checkGridSize === 'function') {
                    api.checkGridSize();
                }
                // 2) 행 노드 재렌더링 및 셀 내용 강제 리프레시
                if (typeof api.redrawRows === 'function') {
                    api.redrawRows();
                }
                if (typeof api.refreshCells === 'function') {
                    api.refreshCells({ force: true });
                }
                // 3) 컬럼 너비 맞춤 (옵션)
                if (sizeColumnsToFit && typeof api.sizeColumnsToFit === 'function') {
                    api.sizeColumnsToFit();
                }
            } catch (err) {
                // Ignore transient layout errors during transition
            }
        };

        // 1단계: rAF 즉각 복원
        requestAnimationFrame(() => {
            executeRecovery();
        });

        // 2단계: 브라우저 DOM 렌더링 완료 후 2차 보정 (50ms)
        const t1 = setTimeout(() => {
            executeRecovery();
        }, 50);

        // 3단계: 복잡한 flex 뷰포트 레이아웃 안정화 (150ms)
        const t2 = setTimeout(() => {
            executeRecovery();
            if (typeof onRecover === 'function') {
                try {
                    onRecover();
                } catch (e) {
                    // Ignore
                }
            }
        }, 150);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    };

    // 1. isActive prop 변화 감지 (false -> true 복귀 시 즉시 복원)
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            // 최초 마운트가 활성 탭 상태일 때도 안정적인 렌더링을 위해 보정
            if (isActive) {
                const cleanup = refreshGrid();
                return cleanup;
            }
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
