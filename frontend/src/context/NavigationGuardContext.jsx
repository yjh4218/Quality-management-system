import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import UnsavedChangesModal from '../components/common/UnsavedChangesModal';

const NavigationGuardContext = createContext(null);

export const NavigationGuardProvider = ({ children }) => {
    const guardsRef = useRef([]);
    const [pendingModal, setPendingModal] = useState({
        isOpen: false,
        targetName: '',
        changedFields: [],
        guard: null,
        pendingAction: null
    });

    const registerGuard = useCallback((guardConfig) => {
        guardsRef.current = guardsRef.current.filter(g => g.id !== guardConfig.id);
        guardsRef.current.push(guardConfig);
    }, []);

    const unregisterGuard = useCallback((guardId) => {
        guardsRef.current = guardsRef.current.filter(g => g.id !== guardId);
    }, []);

    /**
     * 내비게이션(메뉴 이동, 탭 닫기/전환 등)을 요청할 때 가로채어 수정사항을 검사합니다.
     */
    const requestNavigation = useCallback((navigateAction) => {
        if (!guardsRef.current || guardsRef.current.length === 0) {
            if (navigateAction) navigateAction();
            return true;
        }

        const activeGuard = guardsRef.current[guardsRef.current.length - 1];
        if (!activeGuard) {
            if (navigateAction) navigateAction();
            return true;
        }

        let isDirty = false;
        let changedFields = [];

        try {
            if (typeof activeGuard.isDirty === 'function') {
                const checkResult = activeGuard.isDirty();
                if (typeof checkResult === 'object' && checkResult !== null) {
                    isDirty = Boolean(checkResult.isDirty);
                    changedFields = Array.isArray(checkResult.changedFields) ? checkResult.changedFields : [];
                } else {
                    isDirty = Boolean(checkResult);
                }
            }
        } catch (e) {
            console.error('Guard isDirty check failed', e);
            isDirty = false;
        }

        // 수정사항이 없거나 변경 필드가 0개인 경우: 확인창 없이 즉시 팝업 닫고 이동!
        if (!isDirty || (changedFields && changedFields.length === 0 && typeof activeGuard.isDirty === 'function' && typeof activeGuard.isDirty() === 'object')) {
            try {
                if (typeof activeGuard.onClose === 'function') {
                    activeGuard.onClose();
                }
            } catch (e) {
                console.error('Guard onClose failed', e);
            }
            if (navigateAction) navigateAction();
            return true;
        }

        // 수정사항이 실제로 존재하는 경우: 수정된 내용 목록과 함께 3-Way 저장 확인 모달 오픈!
        setPendingModal({
            isOpen: true,
            targetName: activeGuard.targetName || '작성 중인 내용',
            changedFields,
            guard: activeGuard,
            pendingAction: navigateAction
        });
        return false;
    }, []);

    // 1) [저장 후 이동]
    const handleSaveAndProceed = async () => {
        const { guard, pendingAction } = pendingModal;
        if (!guard) {
            setPendingModal(prev => ({ ...prev, isOpen: false }));
            if (pendingAction) pendingAction();
            return;
        }

        let saveSuccess = false;
        try {
            if (typeof guard.onSave === 'function') {
                saveSuccess = await guard.onSave();
            } else {
                saveSuccess = true;
            }
        } catch (e) {
            console.error('Guard onSave failed', e);
            saveSuccess = false;
        }

        if (saveSuccess !== false) {
            if (typeof guard.onClose === 'function') {
                guard.onClose();
            }
            setPendingModal(prev => ({ ...prev, isOpen: false }));
            if (pendingAction) pendingAction();
        }
    };

    // 2) [저장하지 않고 이동]
    const handleDiscardAndProceed = () => {
        const { guard, pendingAction } = pendingModal;
        if (guard) {
            try {
                if (typeof guard.onDiscard === 'function') {
                    guard.onDiscard();
                }
                if (typeof guard.onClose === 'function') {
                    guard.onClose();
                }
            } catch (e) {
                console.error('Guard onDiscard failed', e);
            }
        }
        setPendingModal(prev => ({ ...prev, isOpen: false }));
        if (pendingAction) pendingAction();
    };

    // 3) [취소]
    const handleCancel = () => {
        setPendingModal(prev => ({ ...prev, isOpen: false }));
    };

    // [단축키] ESC 키 입력 시 최상위 활성 모달/드로어 안전 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                // 저장 확인 모달이 열려 있는 경우 취소 처리
                if (pendingModal.isOpen) {
                    setPendingModal(prev => ({ ...prev, isOpen: false }));
                    return;
                }

                // 활성 가드가 있는 경우 안전 닫기 트리거
                if (guardsRef.current && guardsRef.current.length > 0) {
                    const topGuard = guardsRef.current[guardsRef.current.length - 1];
                    if (topGuard && typeof topGuard.onClose === 'function') {
                        e.preventDefault();
                        requestNavigation(() => {
                            topGuard.onClose();
                        });
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pendingModal.isOpen, requestNavigation]);

    return (
        <NavigationGuardContext.Provider value={{
            registerGuard,
            unregisterGuard,
            requestNavigation
        }}>
            {children}
            <UnsavedChangesModal
                isOpen={pendingModal.isOpen}
                targetName={pendingModal.targetName}
                changedFields={pendingModal.changedFields}
                onSaveAndProceed={handleSaveAndProceed}
                onDiscardAndProceed={handleDiscardAndProceed}
                onCancel={handleCancel}
            />
        </NavigationGuardContext.Provider>
    );
};

export const useNavigationGuard = () => {
    const ctx = useContext(NavigationGuardContext);
    if (!ctx) {
        return {
            registerGuard: () => {},
            unregisterGuard: () => {},
            requestNavigation: (fn) => { if (fn) fn(); return true; }
        };
    }
    return ctx;
};

export default NavigationGuardContext;
