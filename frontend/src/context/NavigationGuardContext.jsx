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

    // [전역 팝업 수정 감지] 모든 팝업 내 input/textarea/select 변경 시 dirty 플래그 자동 마킹
    useEffect(() => {
        const handleGlobalInput = (e) => {
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                const overlay = target.closest('.drawer-overlay, .modal-overlay, div[role="dialog"]');
                if (overlay) {
                    target.dataset.dirty = 'true';
                    overlay.dataset.dirty = 'true';
                }
            }
        };

        window.addEventListener('input', handleGlobalInput, true);
        window.addEventListener('change', handleGlobalInput, true);

        return () => {
            window.removeEventListener('input', handleGlobalInput, true);
            window.removeEventListener('change', handleGlobalInput, true);
        };
    }, []);

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
        // [Layer 1]: 등록된 가드가 있는 경우
        if (guardsRef.current && guardsRef.current.length > 0) {
            const activeGuard = guardsRef.current[guardsRef.current.length - 1];
            if (activeGuard) {
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
                    } else if (typeof activeGuard.isDirty === 'boolean') {
                        isDirty = activeGuard.isDirty;
                    }
                } catch (e) {
                    console.error('Guard isDirty check failed', e);
                    isDirty = false;
                }

                // [Fallback Check]: 만약 가드의 isDirty가 false더라도 실제 DOM에 수정 플래그가 있으면 dirty로 승격
                if (!isDirty) {
                    const openOverlay = document.querySelector('.drawer-overlay, .modal-overlay, div[role="dialog"]');
                    const isDomDirty = openOverlay && (
                        openOverlay.dataset.dirty === 'true' || 
                        !!openOverlay.querySelector('[data-dirty="true"], [data-modified="true"]')
                    );
                    if (isDomDirty) {
                        isDirty = true;
                        changedFields = ['수정된 입력 항목'];
                    }
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
            }
        }

        // [Layer 2 - Global DOM Fallback]: 등록된 가드가 없더라도 현재 DOM에 열려 있는 드로어/모달 전역 감지
        const openOverlay = document.querySelector('.drawer-overlay, .modal-overlay, div[role="dialog"]');
        if (openOverlay) {
            const isOverlayDirty = openOverlay.dataset.dirty === 'true';
            // 열린 팝업 내부의 입력 요소 감지
            const inputs = Array.from(openOverlay.querySelectorAll('input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])'));
            
            // 사용자가 수정한 요소 필터링
            const modifiedInputs = inputs.filter(el => {
                if (el.dataset.dirty === 'true' || el.dataset.modified === 'true') return true;
                if (el.type === 'checkbox' || el.type === 'radio') return el.defaultChecked !== el.checked;
                return el.defaultValue !== undefined && el.defaultValue !== el.value && el.value.trim() !== '';
            });

            const closeBtn = openOverlay.querySelector('.close-button, button[title*="닫기"], .drawer-header button, .modal-header button');

            if (isOverlayDirty || modifiedInputs.length > 0) {
                const fieldLabels = modifiedInputs.map(el => {
                    const labelEl = el.closest('.form-group, div, td')?.querySelector('label');
                    return labelEl ? labelEl.textContent.replace('*', '').trim() : (el.name || el.placeholder || '입력 필드');
                }).filter(Boolean).slice(0, 5);

                const modalTitle = openOverlay.querySelector('h2, h3, .drawer-header, .modal-header')?.textContent?.trim() || '작성 중인 화면';

                setPendingModal({
                    isOpen: true,
                    targetName: modalTitle.split('\n')[0].trim(),
                    changedFields: fieldLabels.length > 0 ? fieldLabels : ['수정된 입력 항목'],
                    guard: {
                        onClose: () => {
                            if (closeBtn) closeBtn.click();
                        },
                        onDiscard: () => {
                            if (closeBtn) closeBtn.click();
                        }
                    },
                    pendingAction: navigateAction
                });
                return false;
            } else {
                // 수정사항 없음! 팝업 닫고 즉시 이동!
                if (closeBtn) {
                    try { closeBtn.click(); } catch (e) {}
                }
                if (navigateAction) navigateAction();
                return true;
            }
        }

        if (navigateAction) navigateAction();
        return true;
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
