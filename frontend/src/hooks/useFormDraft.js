import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 폼 자동 임시저장(Autosave) 및 복원 훅
 * @param {string} draftKey - 고유 임시저장 키 (예: 'draft_product_new', 'draft_claim_new')
 * @param {Object} formData - 현재 폼 상태 객체
 * @param {Function} setFormData - 상태 갱신 함수
 * @param {Object} options - { debounceMs: 1500, enabled: true }
 */
export const useFormDraft = (draftKey, formData, setFormData, options = {}) => {
    const { debounceMs = 1500, enabled = true } = options;
    const [hasDraft, setHasDraft] = useState(false);
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const isInitialMount = useRef(true);
    const isRestoring = useRef(false);

    const storageKey = `qms_draft_${draftKey}`;

    // 초기 마운트 시 저장된 임시저장본 확인
    useEffect(() => {
        if (!enabled || !draftKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.data && parsed.savedAt) {
                    setHasDraft(true);
                    setDraftSavedAt(new Date(parsed.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                }
            }
        } catch (e) {
            console.error('Draft check failed', e);
        }
    }, [draftKey, enabled, storageKey]);

    // 폼 데이터 변경 시 디바운스 자동 저장
    useEffect(() => {
        if (!enabled || !draftKey) return;
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (isRestoring.current) {
            isRestoring.current = false;
            return;
        }

        // 비어있는 초기 상태는 저장하지 않음
        const isEmpty = !formData || Object.keys(formData).length === 0;
        if (isEmpty) return;

        const timer = setTimeout(() => {
            try {
                const payload = {
                    savedAt: new Date().toISOString(),
                    data: formData
                };
                localStorage.setItem(storageKey, JSON.stringify(payload));
                setDraftSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (e) {
                console.error('Failed to autosave draft', e);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [formData, draftKey, enabled, storageKey, debounceMs]);

    // 임시저장 데이터 복원
    const restoreDraft = useCallback(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.data) {
                    isRestoring.current = true;
                    setFormData(prev => ({
                        ...prev,
                        ...parsed.data
                    }));
                    setHasDraft(false);
                    return true;
                }
            }
        } catch (e) {
            console.error('Draft restore failed', e);
        }
        return false;
    }, [storageKey, setFormData]);

    // 임시저장 데이터 삭제
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
            setDraftSavedAt(null);
        } catch (e) {
            console.error('Draft clear failed', e);
        }
    }, [storageKey]);

    return {
        hasDraft,
        draftSavedAt,
        restoreDraft,
        clearDraft
    };
};

export default useFormDraft;
