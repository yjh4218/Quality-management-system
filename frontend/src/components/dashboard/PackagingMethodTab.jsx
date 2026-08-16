import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import apiDefault, * as api from '../../api';

/**
 * 주석 데이터(annotationsJson)가 포함된 이미지를 카드 위에 렌더링하는 소형 캔버스 컴포넌트
 */
const AnnotatedCardImage = ({ imageUrl, annotationsJson, altText }) => {
    const canvasRef = useRef(null);
    const fullImgUrl = imageUrl?.startsWith('blob:') 
        ? imageUrl 
        : (api.getBaseURL ? `${api.getBaseURL()}${imageUrl?.startsWith('/') ? '' : '/'}${imageUrl}` : imageUrl);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvasEl = canvasRef.current;
        const ctx = canvasEl.getContext('2d');

        const htmlImg = new Image();
        htmlImg.onload = () => {
            const containerWidth = canvasEl.clientWidth || 380;
            const containerHeight = canvasEl.clientHeight || 250;
            canvasEl.width = containerWidth;
            canvasEl.height = containerHeight;

            // 1. 이미지 비율 맞추어 배경 렌더링
            const scale = Math.min(containerWidth / htmlImg.width, containerHeight / htmlImg.height);
            const drawWidth = htmlImg.width * scale;
            const drawHeight = htmlImg.height * scale;
            const offsetX = (containerWidth - drawWidth) / 2;
            const offsetY = (containerHeight - drawHeight) / 2;

            ctx.clearRect(0, 0, containerWidth, containerHeight);
            ctx.drawImage(htmlImg, offsetX, offsetY, drawWidth, drawHeight);

            // 2. 주석(annotationsJson)이 있을 경우 Canvas 렌더링
            if (annotationsJson) {
                try {
                    const parsed = typeof annotationsJson === 'string' ? JSON.parse(annotationsJson) : annotationsJson;
                    const objects = parsed.objects || [];

                    const editorWidth = 780;
                    const editorHeight = 520;
                    const scaleX = drawWidth / editorWidth;
                    const scaleY = drawHeight / editorHeight;

                    ctx.save();
                    ctx.translate(offsetX, offsetY);

                    objects.forEach(obj => {
                        if (obj.type === 'rect') {
                            ctx.beginPath();
                            ctx.strokeStyle = obj.stroke || '#ef4444';
                            ctx.lineWidth = (obj.strokeWidth || 3) * scaleX;
                            ctx.rect(obj.left * scaleX, obj.top * scaleY, obj.width * (obj.scaleX || 1) * scaleX, obj.height * (obj.scaleY || 1) * scaleY);
                            ctx.stroke();
                        } else if (obj.type === 'circle') {
                            ctx.beginPath();
                            ctx.strokeStyle = obj.stroke || '#ef4444';
                            ctx.lineWidth = (obj.strokeWidth || 3) * scaleX;
                            const rx = (obj.radius || 40) * (obj.scaleX || 1) * scaleX;
                            const ry = (obj.radius || 40) * (obj.scaleY || 1) * scaleY;
                            const cx = obj.left * scaleX + rx;
                            const cy = obj.top * scaleY + ry;
                            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                            ctx.stroke();
                        } else if (obj.type === 'i-text' || obj.type === 'text') {
                            ctx.font = `bold ${(obj.fontSize || 16) * scaleX}px sans-serif`;
                            ctx.fillStyle = obj.fill || '#ef4444';
                            ctx.fillText(obj.text || '', obj.left * scaleX, (obj.top + (obj.fontSize || 16)) * scaleY);
                        }
                    });

                    ctx.restore();
                } catch (e) {
                    console.error('Failed to draw annotations on card canvas', e);
                }
            }
        };
        htmlImg.src = fullImgUrl;
    }, [imageUrl, annotationsJson]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            {annotationsJson && annotationsJson !== '[]' && annotationsJson.length > 10 && (
                <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    🎨 주석 반영됨
                </span>
            )}
        </div>
    );
};

/**
 * 포장방법 탭 컴포넌트
 * - 다중 이미지 업로드 (최대 20장, 개당 10MB 제한)
 * - [저장하기] 버튼 클릭 시에만 일괄 백엔드 반영 (Batch Save Workflow)
 * - 3줄 전용 캡션 textarea
 * - 주석(도형/글씨) 카드 이미지 위 실시간 합성 표시
 */
const PackagingMethodTab = ({ specId, canEdit, masterMethodImages, onRegisterSaveHandler, onRegisterReloadHandler, onRegisterInheritHandler, onEnsureSpecCreated }) => {
    const [images, setImages] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]); // 업로드 대기 신규 파일
    const [deletedIds, setDeletedIds] = useState([]); // 삭제 대기 ID 목록
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loading, setLoading] = useState(false);
    const pendingMasterSpecIdRef = useRef(null);

    // 드래그 앤 드롭 순서 변경 상태
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // [Stale Closure 방지] 실시간 상태 동기화용 Ref
    const imagesRef = useRef(images);
    const pendingFilesRef = useRef(pendingFiles);
    const deletedIdsRef = useRef(deletedIds);
    const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
    const specIdRef = useRef(specId);

    useEffect(() => { imagesRef.current = images; }, [images]);
    useEffect(() => { pendingFilesRef.current = pendingFiles; }, [pendingFiles]);
    useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);
    useEffect(() => { hasUnsavedChangesRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);
    useEffect(() => { specIdRef.current = specId; }, [specId]);

    // 캔버스 모달 에디터 상태
    const [editingImage, setEditingImage] = useState(null);
    const [isCanvasDirty, setIsCanvasDirty] = useState(false);
    const [canvasColor, setCanvasColor] = useState('#ef4444');
    const [canvasTool, setCanvasTool] = useState('rect'); // 'rect', 'circle', 'text'
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── 드래그 앤 드롭 핸들러 ──
    const handleDragStart = (e, index) => {
        if (!canEdit) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        if (!canEdit) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e, index) => {
        if (dragOverIndex === index) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e, targetIndex) => {
        if (!canEdit) return;
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        reorderImages(draggedIndex, targetIndex);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // 이미지 순서 교환/재배치 공통 함수
    const reorderImages = (fromIndex, toIndex) => {
        if (fromIndex < 0 || fromIndex >= images.length || toIndex < 0 || toIndex >= images.length) return;

        setImages(prev => {
            const nextList = [...prev];
            const [movedItem] = nextList.splice(fromIndex, 1);
            nextList.splice(toIndex, 0, movedItem);
            return nextList;
        });
        setHasUnsavedChanges(true);
        toast.info('사진 순서가 변경되었습니다. 하단 [💾 저장하기]를 클릭하면 최종 저장됩니다.');
    };

    // 순서 조정 버튼 (◀ ▶)
    const moveImageStep = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex >= 0 && targetIndex < images.length) {
            reorderImages(index, targetIndex);
        }
    };

    // 이미지 목록 로드
    const loadImages = async (targetSpecId = null) => {
        const activeId = targetSpecId || specIdRef.current || specId;
        if (!activeId) return;
        try {
            const res = await apiDefault.get(`/api/packaging-specs/${activeId}/method-images`);
            const rawData = res.data;
            const list = Array.isArray(rawData) ? rawData : (rawData?.data && Array.isArray(rawData.data) ? rawData.data : []);
            setImages(list);
            setPendingFiles([]);
            setDeletedIds([]);
            setHasUnsavedChanges(false);
        } catch (e) {
            console.error('Failed to load packaging method images', e);
        }
    };

    // 마스터 포장방법 사진 승계 수신 함수
    const inheritMasterImages = (masterImages = [], masterSpecId = null) => {
        if (!Array.isArray(masterImages)) return;
        pendingMasterSpecIdRef.current = masterSpecId;
        const inheritedList = masterImages.map(img => ({
            ...img,
            id: `temp_master_${img.id}_${Math.random().toString(36).substring(2, 6)}`,
            isMasterInherited: true
        }));
        setImages(inheritedList);
        setPendingFiles([]);
        setDeletedIds([]);
        setHasUnsavedChanges(true);
        if (inheritedList.length > 0) {
            toast.info(`마스터 포장방법 사진 ${inheritedList.length}장을 성공적으로 불러왔습니다.`);
        }
    };

    const lastInheritedMasterSpecIdRef = useRef(null);

    useEffect(() => {
        if (masterMethodImages && Array.isArray(masterMethodImages.images) && masterMethodImages.images.length > 0) {
            if (lastInheritedMasterSpecIdRef.current !== masterMethodImages.masterSpecId) {
                lastInheritedMasterSpecIdRef.current = masterMethodImages.masterSpecId;
                inheritMasterImages(masterMethodImages.images, masterMethodImages.masterSpecId);
            }
        }
    }, [masterMethodImages]);

    // specId가 존재하거나 변경 시 자동으로 포장방법 사진 목록을 서버에서 조회
    useEffect(() => {
        if (specId) {
            loadImages(specId);
        }
    }, [specId]);

    // 부모 컴포넌트에 최종 [저장하기], [새로고침], [마스터승계] 핸들러 단 1회 안정적 바인딩
    useEffect(() => {
        if (onRegisterSaveHandler) {
            onRegisterSaveHandler((overrideId) => saveAllChanges(overrideId));
        }
        if (onRegisterReloadHandler) {
            onRegisterReloadHandler((targetId) => loadImages(targetId));
        }
        if (onRegisterInheritHandler) {
            onRegisterInheritHandler((masterImgs, masterSpecId) => inheritMasterImages(masterImgs, masterSpecId));
        }
    }, []);

    // 로컬 파일 임시 추가 (서버 자동 전송 X ➔ 로컬 미리보기 생성)
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        if (images.length + pendingFiles.length + selectedFiles.length > 20) {
            toast.error('포장방법 사진은 한 스펙당 최대 20장까지만 등록 가능합니다.');
            return;
        }

        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const newImages = [];
        const newFiles = [];

        for (const file of selectedFiles) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`"${file.name}" 파일이 제한 크기(10MB)를 초과하여 제외되었습니다.`);
                continue;
            }
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                toast.error(`"${file.name}" 파일은 허용되지 않는 포맷입니다. (jpg, png, webp 가능)`);
                continue;
            }

            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const blobUrl = URL.createObjectURL(file);

            newFiles.push({ tempId, file });
            newImages.push({
                id: tempId,
                imageUrl: blobUrl,
                captionText: '',
                annotationsJson: null,
                isTemp: true
            });
        }

        if (newImages.length > 0) {
            setImages(prev => [...prev, ...newImages]);
            setPendingFiles(prev => [...prev, ...newFiles]);
            setHasUnsavedChanges(true);
            toast.info('사진이 임시 추가되었습니다. 하단 [💾 저장하기] 버튼을 누르면 서버에 최종 저장됩니다.');
        }
    };

    // 캡션 수정 (3줄 textarea ➔ 로컬 state에만 임시 저장)
    const handleCaptionChange = (imageId, newCaption) => {
        setImages(prev => prev.map(img => img.id === imageId ? { ...img, captionText: newCaption } : img));
        setHasUnsavedChanges(true);
    };

    // 이미지 삭제 (로컬 삭제 예약)
    const handleDeleteImage = (img) => {
        if (!window.confirm('선택한 포장방법 이미지를 삭제하시겠습니까?\n([저장하기] 버튼을 누를 때 최종 삭제됩니다.)')) return;

        if (img.isTemp) {
            setPendingFiles(prev => prev.filter(p => p.tempId !== img.id));
        } else {
            setDeletedIds(prev => [...prev, img.id]);
        }
        setImages(prev => prev.filter(item => item.id !== img.id));
        setHasUnsavedChanges(true);
    };

    // 캔버스 주석 저장 (로컬 state 반영)
    const handleSaveCanvas = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !editingImage) return;

        const json = JSON.stringify(canvas.toJSON());
        setImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, annotationsJson: json } : img));
        setHasUnsavedChanges(true);
        setIsCanvasDirty(false);
        setEditingImage(null);
        toast.info('주석이 임시 적용되었습니다. 하단 [💾 저장하기] 버튼을 눌러 확정하세요.');
    };

    // 최종 [저장하기] 실행 (서버 배치 일괄 반영)
    const saveAllChanges = async (overrideSpecId) => {
        const currentPendingFiles = pendingFilesRef.current;
        const currentImages = imagesRef.current;
        const currentDeletedIds = deletedIdsRef.current;
        const currentHasUnsaved = hasUnsavedChangesRef.current;

        let activeSpecId = (typeof overrideSpecId === 'number' || (typeof overrideSpecId === 'string' && overrideSpecId)) ? overrideSpecId : (specIdRef.current || specId);
        console.log('[PMT-DEBUG] saveAllChanges called:', {
            overrideSpecId, specId, activeSpecId,
            pendingFilesCount: currentPendingFiles.length,
            imagesCount: currentImages.length,
            deletedIdsCount: currentDeletedIds.length,
            hasUnsavedChanges: currentHasUnsaved
        });
        if (!activeSpecId && onEnsureSpecCreated) {
            activeSpecId = await onEnsureSpecCreated();
            console.log('[PMT-DEBUG] activeSpecId generated from onEnsureSpecCreated:', activeSpecId);
        }

        if (!activeSpecId) {
            console.warn('[PMT-DEBUG] activeSpecId is missing, aborting photo save.');
            if (currentPendingFiles.length > 0 || currentDeletedIds.length > 0 || currentHasUnsaved) {
                toast.error('포장사양서를 생성할 수 없어 사진을 저장하지 못했습니다.');
            }
            return;
        }

        setLoading(true);
        try {
            // 1. 삭제 예약 파일 삭제 API
            for (const delId of currentDeletedIds) {
                try {
                    console.log('[PMT-DEBUG] deleting image id:', delId);
                    await apiDefault.delete(`/api/packaging-specs/method-images/${delId}`);
                } catch (e) {
                    console.error('Delete failed for id:', delId, e);
                }
            }

            // 2. 신규 임시 파일 배치 업로드 API
            let uploadedImagesMap = {};
            if (currentPendingFiles.length > 0) {
                console.log('[PMT-DEBUG] uploading pendingFiles:', currentPendingFiles.length);
                const formData = new FormData();
                currentPendingFiles.forEach(p => formData.append('files', p.file));

                const uploadRes = await apiDefault.post(`/api/packaging-specs/${activeSpecId}/method-images/batch-upload`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                console.log('[PMT-DEBUG] batch-upload response status:', uploadRes.status, 'data:', uploadRes.data);

                if (uploadRes.data && Array.isArray(uploadRes.data)) {
                    uploadRes.data.forEach((serverImg, idx) => {
                        if (currentPendingFiles[idx]) {
                            uploadedImagesMap[currentPendingFiles[idx].tempId] = serverImg;
                        }
                    });
                }
            } else if (pendingMasterSpecIdRef.current) {
                console.log('[PMT-DEBUG] copying method images from masterSpecId:', pendingMasterSpecIdRef.current);
                await apiDefault.post(`/api/packaging-specs/${activeSpecId}/method-images/copy-from/${pendingMasterSpecIdRef.current}`);
                pendingMasterSpecIdRef.current = null;
            } else {
                console.log('[PMT-DEBUG] pendingFiles is EMPTY. Skipping batch-upload.');
            }

            // 3. 기존 및 신규 이미지의 캡션/주석 및 순서(displayOrder) 업데이트
            for (let i = 0; i < currentImages.length; i++) {
                const img = currentImages[i];
                const targetId = img.isTemp ? (uploadedImagesMap[img.id]?.id) : img.id;
                if (targetId) {
                    const displayOrderVal = (i + 1) * 1000.0;
                    console.log('[PMT-DEBUG] updating caption/annotation/order for targetId:', targetId, 'displayOrder:', displayOrderVal);
                    await apiDefault.put(`/api/packaging-specs/method-images/${targetId}`, {
                        captionText: img.captionText || '',
                        annotationsJson: img.annotationsJson || null,
                        displayOrder: displayOrderVal
                    });
                }
            }

            toast.success('포장방법 사진, 순서 및 주석 정보가 성공적으로 저장되었습니다!');
            try {
                console.log('[PMT-DEBUG] reloading images for activeSpecId:', activeSpecId);
                const res = await apiDefault.get(`/api/packaging-specs/${activeSpecId}/method-images`);
                const rawData = res.data;
                const list = Array.isArray(rawData) ? rawData : (rawData?.data && Array.isArray(rawData.data) ? rawData.data : []);
                console.log('[PMT-DEBUG] reloaded list length:', list.length);
                setImages(list);
                setPendingFiles([]);
                setDeletedIds([]);
                setHasUnsavedChanges(false);
            } catch (e) {
                console.error('Failed to load packaging method images', e);
            }
        } catch (err) {
            console.error('Failed to save method image changes', err);
            toast.error('포장방법 정보 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Fabric.js 초기화 및 주석 로드
    const openCanvasEditor = (img) => {
        setEditingImage(img);
        setIsCanvasDirty(false);

        setTimeout(() => {
            if (!canvasRef.current) return;
            
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
            }

            const canvasWidth = 780;
            const canvasHeight = 520;
            const canvas = new window.fabric.Canvas(canvasRef.current, {
                width: canvasWidth,
                height: canvasHeight
            });
            fabricCanvasRef.current = canvas;

            const fullImgUrl = img.imageUrl?.startsWith('blob:') 
                ? img.imageUrl 
                : (api.getBaseURL ? `${api.getBaseURL()}${img.imageUrl?.startsWith('/') ? '' : '/'}${img.imageUrl}` : img.imageUrl);
            
            const htmlImg = new Image();
            htmlImg.onload = () => {
                const oImg = new window.fabric.Image(htmlImg, {
                    selectable: false,
                    evented: false
                });
                const scale = Math.min(canvasWidth / htmlImg.width, canvasHeight / htmlImg.height);
                oImg.scale(scale);
                canvas.centerObject(oImg);
                canvas.add(oImg);
                canvas.sendToBack(oImg);

                if (img.annotationsJson) {
                    try {
                        const parsed = JSON.parse(img.annotationsJson);
                        canvas.loadFromJSON(parsed, () => {
                            canvas.renderAll();
                        });
                    } catch (err) {
                        console.error('Failed to load annotation json', err);
                        canvas.renderAll();
                    }
                } else {
                    canvas.renderAll();
                }
            };
            htmlImg.onerror = (err) => {
                console.error('Failed to load image for canvas editor:', fullImgUrl, err);
                canvas.renderAll();
            };
            htmlImg.src = fullImgUrl;

            canvas.on('object:added', () => setIsCanvasDirty(true));
            canvas.on('object:modified', () => setIsCanvasDirty(true));
            canvas.on('object:removed', () => setIsCanvasDirty(true));
        }, 100);
    };

    const addCanvasShape = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        if (canvasTool === 'rect') {
            const rect = new window.fabric.Rect({
                left: 200, top: 150, width: 120, height: 90,
                fill: 'transparent', stroke: canvasColor, strokeWidth: 3
            });
            canvas.add(rect);
        } else if (canvasTool === 'circle') {
            const circle = new window.fabric.Circle({
                left: 220, top: 160, radius: 50,
                fill: 'transparent', stroke: canvasColor, strokeWidth: 3
            });
            canvas.add(circle);
        } else if (canvasTool === 'text') {
            const text = new window.fabric.IText('여기에 세부 주석을 입력하세요', {
                left: 180, top: 180, fontFamily: 'sans-serif', fontSize: 20,
                fill: canvasColor, fontWeight: 'bold'
            });
            canvas.add(text);
        }
        canvas.renderAll();
    };

    const deleteSelectedObject = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects) {
            activeObjects.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject().renderAll();
        }
    };

    const handleCloseEditor = () => {
        if (isCanvasDirty) {
            if (window.confirm('저장하지 않은 변경 사항이 있습니다. 편집창을 닫으시겠습니까?')) {
                setEditingImage(null);
            }
        } else {
            setEditingImage(null);
        }
    };

    return (
        <div style={{ padding: '4px 0' }}>
            
            {/* 변경 사항 안내 바 */}
            {hasUnsavedChanges && (
                <div style={{ marginBottom: '16px', padding: '12px 18px', background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                        ⚠️ 포장방법 사진/캡션/주석 변경 사항이 있습니다. 최하단 남색 [💾 저장하기] 버튼을 누르면 사양서와 함께 일괄 저장됩니다.
                    </span>
                </div>
            )}

            {/* ── 이미지 개수 0장일 때 빈 상태 ── */}
            {images.length === 0 && (
                <div style={{
                    border: '2.5px dashed #cbd5e1', borderRadius: '16px', padding: '60px 40px',
                    textAlign: 'center', background: '#f8fafc', margin: '10px 0 20px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                        포장방법 사진을 등록해보세요
                    </h4>
                    <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        * 사진 추가 후 ✏️ 주석 편집 및 3줄 캡션을 작성하고 [💾 저장하기]를 누르면 저장됩니다.<br />
                        (1장당 최대 10MB 제한 / 1회 최대 20장 / JPG, PNG, WEBP 포맷 지원)
                    </p>
                    
                    {canEdit && (
                        <div style={{ display: 'inline-block', position: 'relative' }}>
                            <button className="primary" style={{ background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                                ➕ 사진 추가하기
                            </button>
                            <input 
                                type="file" multiple accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileChange}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── 이미지 목록 카드 그리드 (드래그 앤 드롭 순서 변경 지원) ── */}
            {images.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    {canEdit && (
                        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🖐️ <strong>순서 변경:</strong> 카드를 마우스로 드래그 앤 드롭하여 배치하거나, ◀ ▶ 버튼으로 순서를 조정하세요.
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                총 {images.length}장 등록됨
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                        {images.map((img, idx) => {
                            const isDragging = draggedIndex === idx;
                            const isDragOver = dragOverIndex === idx;

                            return (
                                <div 
                                    key={img.id}
                                    draggable={canEdit}
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragLeave={(e) => handleDragLeave(e, idx)}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        border: isDragOver
                                            ? '2.5px solid #2563eb'
                                            : (img.isTemp ? '2px dashed #3b82f6' : '1.5px solid #cbd5e1'),
                                        borderRadius: '14px',
                                        background: isDragOver ? '#eff6ff' : '#fff',
                                        overflow: 'hidden',
                                        boxShadow: isDragOver 
                                            ? '0 0 16px rgba(37,99,235,0.35)' 
                                            : (isDragging ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)'),
                                        opacity: isDragging ? 0.4 : 1,
                                        transform: isDragging ? 'scale(0.98)' : (isDragOver ? 'scale(1.02)' : 'none'),
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        cursor: canEdit ? 'grab' : 'default',
                                        position: 'relative'
                                    }}
                                >
                                    {/* 드래그 오버 상태 타겟 안내 Overlay */}
                                    {isDragOver && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, background: 'rgba(37, 99, 235, 0.08)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                📍 이 위치로 이동
                                            </span>
                                        </div>
                                    )}

                                    {/* 이미지 및 주석 합성 렌더링 컨테이너 */}
                                    <div style={{ position: 'relative', height: '260px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AnnotatedCardImage imageUrl={img.imageUrl} annotationsJson={img.annotationsJson} altText={`포장방법 ${idx + 1}`} />
                                        
                                        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ background: img.isTemp ? '#2563eb' : 'rgba(15,23,42,0.85)', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ☰ NO. {idx + 1} {img.isTemp ? '(미저장)' : ''}
                                            </span>

                                            {/* 순서 조정 빠른 이동 버튼 (◀ ▶) */}
                                            {canEdit && (
                                                <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.95)', padding: '2px 4px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                                    <button 
                                                        type="button" 
                                                        disabled={idx === 0}
                                                        onClick={(e) => { e.stopPropagation(); moveImageStep(idx, -1); }}
                                                        style={{ border: 'none', background: idx === 0 ? '#e2e8f0' : '#fff', color: idx === 0 ? '#94a3b8' : '#1e293b', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                        title="앞으로 이동"
                                                    >
                                                        ◀
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        disabled={idx === images.length - 1}
                                                        onClick={(e) => { e.stopPropagation(); moveImageStep(idx, 1); }}
                                                        style={{ border: 'none', background: idx === images.length - 1 ? '#e2e8f0' : '#fff', color: idx === images.length - 1 ? '#94a3b8' : '#1e293b', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                                        title="뒤로 이동"
                                                    >
                                                        ▶
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {canEdit && (
                                            <button 
                                                type="button" onClick={() => handleDeleteImage(img)}
                                                style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.12)', fontSize: '14px' }}
                                                title="사진 삭제"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                        {/* 캡션 3줄 전용 textarea */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                                📝 캡션 (세부 설명 - 3줄 작성)
                                            </label>
                                            <textarea 
                                                rows={3}
                                                value={img.captionText || ''} 
                                                onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                                                placeholder="포장방법, 착인 규정, 파렛트 적재 시 주의사항을 3줄로 자유롭게 기재하세요..." 
                                                disabled={!canEdit}
                                                style={{ width: '100%', fontSize: '14px', fontWeight: '600', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: canEdit ? '#fff' : '#f8fafc', color: '#0f172a', resize: 'vertical', lineHeight: '1.5' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                type="button" onClick={() => openCanvasEditor(img)}
                                                style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                ✏️ 주석 편집 (도형/글씨 추가)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 사진 추가 카드 영역 */}
                    {canEdit && images.length < 20 && (
                        <div style={{
                            border: '2.5px dashed #cbd5e1', borderRadius: '14px', minHeight: '400px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: '#f8fafc', position: 'relative', cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '36px', marginBottom: '12px' }}>➕</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>사진 추가하기</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>(클릭하여 임시 등록)</span>
                            <input 
                                type="file" multiple accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileChange}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>
            )}



            {/* ── Fabric.js 캔버스 주석 에디터 모달 ── */}
            {editingImage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 20000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: '#fff', width: '90%', maxWidth: '850px',
                        borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                    🎨 포장방법 사진 주석 편집기
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                                    도형이나 글씨를 추가해 보관/적재 시 세부 착인 및 주의사항을 기재하세요
                                </p>
                            </div>
                            <button type="button" onClick={handleCloseEditor} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        <div style={{ flex: 1, padding: '20px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                            {isMobile ? (
                                <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#b91c1c', maxWidth: '400px', margin: '40px auto' }}>
                                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📱</span>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700' }}>모바일 브라우저 감지</h4>
                                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.6' }}>
                                        PC 환경에서 도형 및 글자 주석 편집을 이용해주시기 바랍니다.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>도구:</span>
                                            <select value={canvasTool} onChange={e => setCanvasTool(e.target.value)} style={{ fontSize: '12px', padding: '4px' }}>
                                                <option value="rect">사각형 (Rectangle)</option>
                                                <option value="circle">원 (Circle)</option>
                                                <option value="text">글 상자 (Text)</option>
                                            </select>
                                            
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginLeft: '10px' }}>색상:</span>
                                            <input type="color" value={canvasColor} onChange={e => setCanvasColor(e.target.value)} style={{ width: '26px', height: '26px', border: 'none', cursor: 'pointer' }} />
                                            
                                            <button type="button" onClick={addCanvasShape} style={{ padding: '4px 10px', fontSize: '11px', background: '#003366', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                ➕ 도형 추가
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button type="button" onClick={deleteSelectedObject} style={{ padding: '4px 10px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                🗑️ 선택 지우기
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                                        <canvas ref={canvasRef} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={handleCloseEditor} style={{ padding: '8px 16px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#64748b' }}>
                                취소
                            </button>
                            <button 
                                type="button" onClick={handleSaveCanvas} disabled={isMobile || !canEdit}
                                style={{ padding: '8px 20px', fontSize: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: (isMobile || !canEdit) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (isMobile || !canEdit) ? 0.6 : 1 }}
                            >
                                💾 임시 적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagingMethodTab;
