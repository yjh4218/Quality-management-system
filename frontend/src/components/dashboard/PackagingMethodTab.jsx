import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import apiDefault, * as api from '../../api';
import ProductSearchPopup from '../../ProductSearchPopup';
import ExcelColorPickerPopover from '../common/ExcelColorPickerPopover';

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
                        ctx.save();
                        const strokeColor = obj.stroke || '#ef4444';
                        const strokeWidth = (obj.strokeWidth || 3) * scaleX;
                        const fillColor = obj.fill && obj.fill !== 'transparent' && obj.fill !== 'none' ? obj.fill : null;
                        const opacity = obj.opacity != null ? obj.opacity : 1;

                        ctx.globalAlpha = opacity;
                        ctx.strokeStyle = strokeColor;
                        ctx.lineWidth = strokeWidth;

                        if (obj.type === 'rect') {
                            const x = obj.left * scaleX;
                            const y = obj.top * scaleY;
                            const w = obj.width * (obj.scaleX || 1) * scaleX;
                            const h = obj.height * (obj.scaleY || 1) * scaleY;
                            const rx = (obj.rx || 0) * scaleX;

                            ctx.beginPath();
                            if (rx > 0 && ctx.roundRect) {
                                ctx.roundRect(x, y, w, h, rx);
                            } else {
                                ctx.rect(x, y, w, h);
                            }
                            if (fillColor) {
                                ctx.fillStyle = fillColor;
                                ctx.fill();
                            }
                            if (strokeWidth > 0) ctx.stroke();
                        } else if (obj.type === 'circle') {
                            const rx = (obj.radius || 40) * (obj.scaleX || 1) * scaleX;
                            const ry = (obj.radius || 40) * (obj.scaleY || 1) * scaleY;
                            const cx = obj.left * scaleX + rx;
                            const cy = obj.top * scaleY + ry;
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                            if (fillColor) {
                                ctx.fillStyle = fillColor;
                                ctx.fill();
                            }
                            if (strokeWidth > 0) ctx.stroke();
                        } else if (obj.type === 'line') {
                            const x1 = (obj.left || 0) * scaleX;
                            const y1 = (obj.top || 0) * scaleY;
                            const x2 = x1 + (obj.width || 100) * (obj.scaleX || 1) * scaleX;
                            const y2 = y1 + (obj.height || 0) * (obj.scaleY || 1) * scaleY;
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.stroke();
                        } else if (obj.type === 'i-text' || obj.type === 'text') {
                            const fontSize = (obj.fontSize || 18) * scaleX;
                            ctx.font = `${obj.fontWeight || 'bold'} ${fontSize}px sans-serif`;
                            ctx.fillStyle = obj.fill || '#ef4444';
                            ctx.fillText(obj.text || '', obj.left * scaleX, (obj.top + (obj.fontSize || 18)) * scaleY);
                        } else if (obj.type === 'path' || obj.type === 'group') {
                            // 복합 도형(화살표/말풍선) fallback stroke
                            const x = obj.left * scaleX;
                            const y = obj.top * scaleY;
                            const w = (obj.width || 60) * (obj.scaleX || 1) * scaleX;
                            const h = (obj.height || 40) * (obj.scaleY || 1) * scaleY;
                            ctx.beginPath();
                            ctx.rect(x, y, w, h);
                            ctx.stroke();
                        }
                        ctx.restore();
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
const PackagingMethodTab = ({ specId, canEdit, masterMethodImages, onRegisterSaveHandler, onRegisterReloadHandler, onRegisterInheritHandler, onEnsureSpecCreated, onImagesChange }) => {
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

    useEffect(() => { 
        imagesRef.current = images; 
        if (onImagesChange) onImagesChange(images);
    }, [images, onImagesChange]);
    useEffect(() => { pendingFilesRef.current = pendingFiles; }, [pendingFiles]);
    useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);
    useEffect(() => { hasUnsavedChangesRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);
    useEffect(() => { specIdRef.current = specId; }, [specId]);

    // 캔버스 모달 에디터 상태 (줌, 패닝, 다양한 도형, 선/면 색상 독립 제어)
    const [editingImage, setEditingImage] = useState(null);
    const [isCanvasDirty, setIsCanvasDirty] = useState(false);
    const [canvasTool, setCanvasTool] = useState('rect'); // 'rect', 'rounded-rect', 'circle', 'arrow', 'line', 'callout', 'text', 'check', 'cross'
    const [strokeColor, setStrokeColor] = useState('#ef4444');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [fillColor, setFillColor] = useState('transparent');
    const [fillOpacity, setFillOpacity] = useState(0); // 0 (투명) ~ 100 (불투명)
    const [textColor, setTextColor] = useState('#000000'); // 글상자 및 텍스트 폰트 색상
    const [zoomLevel, setZoomLevel] = useState(100);
    const [isPanMode, setIsPanMode] = useState(false);
    const isPanModeRef = useRef(false);
    const currentImgDimensionsRef = useRef({ width: 2400, height: 1600 });
    useEffect(() => { isPanModeRef.current = isPanMode; }, [isPanMode]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

    // 타 제품의 포장방법 사진 복사 핸들러
    const handleCopyFromProduct = async (selectedProd) => {
        if (!selectedProd || !selectedProd.itemCode) return;
        setIsProductSearchOpen(false);

        let activeSpecId = specIdRef.current || specId;
        if (!activeSpecId && onEnsureSpecCreated) {
            activeSpecId = await onEnsureSpecCreated();
        }
        if (!activeSpecId) {
            toast.error('포장사양서를 먼저 생성해야 사진을 복사해 올 수 있습니다.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.copyPackagingMethodImagesFromProduct(activeSpecId, selectedProd.itemCode);
            const copied = res.data;
            const copiedList = Array.isArray(copied) ? copied : (copied?.data && Array.isArray(copied.data) ? copied.data : []);
            if (copiedList.length > 0) {
                toast.success(`[${selectedProd.itemCode}] 제품의 포장방법 사진 ${copiedList.length}장을 성공적으로 가져왔습니다.`);
                await loadImages(activeSpecId);
            } else {
                toast.warning(`[${selectedProd.itemCode}] 제품에 등록된 포장방법 사진이 없습니다.`);
            }
        } catch (err) {
            console.error('Failed to copy method images from product', err);
            toast.error('포장방법 사진을 가져오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

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
            // 원본 이미지 URL(originalImageUrl)을 보존하여 재편집 시 무손실 로딩 보장
            const enhancedList = list.map(item => ({
                ...item,
                originalImageUrl: item.originalImageUrl || item.imageUrl
            }));
            setImages(enhancedList);
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
            originalImageUrl: img.originalImageUrl || img.imageUrl,
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
    const lastLoadedSpecIdRef = useRef(null);

    useEffect(() => {
        if (masterMethodImages && Array.isArray(masterMethodImages.images) && masterMethodImages.images.length > 0) {
            if (lastInheritedMasterSpecIdRef.current !== masterMethodImages.masterSpecId) {
                lastInheritedMasterSpecIdRef.current = masterMethodImages.masterSpecId;
                inheritMasterImages(masterMethodImages.images, masterMethodImages.masterSpecId);
            }
        }
    }, [masterMethodImages]);

    // specId가 존재하거나 변경 시 자동으로 포장방법 사진 목록을 서버에서 조회 (단, 이미 해당 specId로 로드된 경우 재로드 생략)
    useEffect(() => {
        if (specId && lastLoadedSpecIdRef.current !== specId) {
            lastLoadedSpecIdRef.current = specId;
            loadImages(specId);
        }
    }, [specId]);

    // 부모 컴포넌트에 최종 [저장하기], [새로고침], [마스터승계] 핸들러 단 1회 안정적 바인딩
    useEffect(() => {
        if (onRegisterSaveHandler) {
            onRegisterSaveHandler((overrideId) => saveAllChanges(overrideId));
        }
        if (onRegisterReloadHandler) {
            onRegisterReloadHandler((targetId) => {
                if (targetId) lastLoadedSpecIdRef.current = targetId;
                return loadImages(targetId);
            });
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
                originalImageUrl: blobUrl, // 최초 원본 URL 영구 보존!
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

    // 캔버스 주석 저장 (확대한 화면 그대로 초고화질 무손실 DataURL/Blob 추출 및 반영)
    const handleSaveCanvas = async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !editingImage) return;

        // 1. 객체 선택 해제하여 선택 박스(컨트롤러) 제거
        canvas.discardActiveObject();
        canvas.renderAll();

        // 2. 원본 이미지 실제 해상도(naturalWidth) 및 현재 줌 배율 기반 동적 초고화질(Multiplier 3.5~6.0x) 계산
        const natWidth = currentImgDimensionsRef.current?.width || 2400;
        const canvasWidth = canvas.getWidth() || 780;
        const currentZoom = canvas.getZoom() || 1.0;
        const baseMultiplier = natWidth / canvasWidth;
        const dynamicMultiplier = Math.min(6.0, Math.max(3.5, baseMultiplier * Math.max(1.0, currentZoom)));

        // 3. 현재 캔버스에 표시된 확대/이동 상태(뷰포트 그대로)의 초고해상도 무손실 PNG 추출 (3000px급 4K 해상도 보존)
        const compositeDataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: dynamicMultiplier,
            enableRetinaScaling: true
        });

        // 4. 주석 메타데이터(JSON) 및 뷰포트 상태 저장
        const canvasJson = canvas.toJSON();
        canvasJson.viewportTransform = canvas.viewportTransform;
        canvasJson.zoomLevel = canvas.getZoom();
        const jsonStr = JSON.stringify(canvasJson);

        // 5. DataURL을 Blob으로 변환하여 pendingFiles에 등록 (제품 마스터 저장 시 서버로 실제 전송)
        try {
            const res = await fetch(compositeDataUrl);
            const blob = await res.blob();
            const file = new File([blob], `annotated_${Date.now()}.png`, { type: 'image/png' });

            setPendingFiles(prev => {
                const filtered = prev.filter(p => p.tempId !== editingImage.id);
                return [...filtered, { tempId: editingImage.id, file }];
            });
        } catch (err) {
            console.error('Failed to convert composite image to blob', err);
        }

        // 6. 로컬 images state 갱신 (originalImageUrl은 영구 보존하고, 미리보기 및 사양서에는 초고화질 compositeDataUrl 바인딩)
        setImages(prev => prev.map(img => img.id === editingImage.id ? {
            ...img,
            originalImageUrl: img.originalImageUrl || img.imageUrl, // 원본 소스 영구 보존!
            imageUrl: compositeDataUrl,
            annotationsJson: jsonStr,
            isAnnotated: true
        } : img));

        setHasUnsavedChanges(true);
        setIsCanvasDirty(false);
        setEditingImage(null);
        toast.success('초고화질 주석 및 확대 화면이 반영되었습니다. 하단 [💾 저장하기]를 눌러 최종 저장하세요!');
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

    // 색상 + 투명도 변환 헬퍼 (Hex to RGBA)
    const getComputedFillColor = (hex, opacityPercent) => {
        if (!hex || hex === 'transparent' || hex === 'none' || opacityPercent === 0) {
            return 'transparent';
        }
        // hex to rgba
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const alpha = Math.min(Math.max(opacityPercent / 100, 0), 1);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Fabric.js 초기화 및 주석 로드 (줌/패닝 및 다양한 도형 지원)
    const openCanvasEditor = (img) => {
        setEditingImage(img);
        setIsCanvasDirty(false);
        setZoomLevel(100);
        setIsPanMode(false);

        setTimeout(() => {
            if (!canvasRef.current) return;
            
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
            }

            const canvasWidth = 780;
            const canvasHeight = 520;
            const canvas = new window.fabric.Canvas(canvasRef.current, {
                width: canvasWidth,
                height: canvasHeight,
                preserveObjectStacking: true
            });
            fabricCanvasRef.current = canvas;

            const rawImgUrl = img.originalImageUrl || img.imageUrl;
            const fullImgUrl = rawImgUrl?.startsWith('blob:') 
                ? rawImgUrl 
                : (api.getBaseURL ? `${api.getBaseURL()}${rawImgUrl?.startsWith('/') ? '' : '/'}${rawImgUrl}` : rawImgUrl);
            
            const loadIntoCanvas = (srcUrl) => {
                const htmlImg = new Image();
                htmlImg.crossOrigin = 'anonymous';
                htmlImg.onload = () => {
                    // 원본 이미지의 실제 해상도(naturalWidth, naturalHeight) 기록 (고해상도 동적 배율 계산용)
                    currentImgDimensionsRef.current = {
                        width: htmlImg.naturalWidth || htmlImg.width || 2400,
                        height: htmlImg.naturalHeight || htmlImg.height || 1600
                    };

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
                                // loadFromJSON 후 oImg가 누락되었으면 다시 추가하고 맨 뒤로 배치
                                const hasBg = canvas.getObjects().some(obj => obj === oImg);
                                if (!hasBg) {
                                    canvas.add(oImg);
                                    canvas.sendToBack(oImg);
                                }
                                if (parsed.viewportTransform && Array.isArray(parsed.viewportTransform)) {
                                    canvas.setViewportTransform(parsed.viewportTransform);
                                    if (parsed.zoomLevel) setZoomLevel(Math.round(parsed.zoomLevel * 100));
                                }
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
                    console.error('Failed to load image for canvas editor:', srcUrl, err);
                    canvas.renderAll();
                };
                htmlImg.src = srcUrl;
            };

            // Blob 변환을 통해 CORS Taint를 완벽하게 방지
            if (fullImgUrl?.startsWith('blob:') || fullImgUrl?.startsWith('data:')) {
                loadIntoCanvas(fullImgUrl);
            } else {
                fetch(fullImgUrl, { mode: 'cors', credentials: 'include' })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.blob();
                    })
                    .then(blob => {
                        const blobUrl = URL.createObjectURL(blob);
                        loadIntoCanvas(blobUrl);
                    })
                    .catch(err => {
                        console.warn('Direct blob fetch failed, falling back to direct URL with crossOrigin:', err);
                        loadIntoCanvas(fullImgUrl);
                    });
            }

            // 마우스 휠 줌
            canvas.on('mouse:wheel', function(opt) {
                const delta = opt.e.deltaY;
                let zoom = canvas.getZoom();
                zoom *= 0.999 ** delta;
                if (zoom > 3) zoom = 3;
                if (zoom < 0.5) zoom = 0.5;
                canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
                opt.e.preventDefault();
                opt.e.stopPropagation();
                setZoomLevel(Math.round(zoom * 100));
            });

            // 패닝 드래그 이벤트 (Space, Alt 키 또는 이동 모드 활성화 시)
            let isDragging = false;
            let lastPosX = 0;
            let lastPosY = 0;

            canvas.on('mouse:down', function(opt) {
                const evt = opt.e;
                if (evt.altKey || evt.spaceKey || isPanModeRef.current) {
                    isDragging = true;
                    canvas.selection = false;
                    lastPosX = evt.clientX;
                    lastPosY = evt.clientY;
                }
            });

            canvas.on('mouse:move', function(opt) {
                if (isDragging) {
                    const e = opt.e;
                    const vpt = canvas.viewportTransform;
                    vpt[4] += e.clientX - lastPosX;
                    vpt[5] += e.clientY - lastPosY;
                    canvas.requestRenderAll();
                    lastPosX = e.clientX;
                    lastPosY = e.clientY;
                }
            });

            canvas.on('mouse:up', function() {
                if (isDragging) {
                    canvas.setViewportTransform(canvas.viewportTransform);
                    isDragging = false;
                    canvas.selection = !isPanModeRef.current;
                }
            });

            // 객체 선택 시 툴바 속성 동기화
            const syncActiveObjectProps = (e) => {
                const obj = e.selected?.[0] || canvas.getActiveObject();
                if (!obj) return;
                if (obj.type === 'i-text') {
                    if (obj.fill) setTextColor(obj.fill);
                    setFillColor(obj.backgroundColor ? obj.backgroundColor : 'transparent');
                } else {
                    if (obj.stroke) setStrokeColor(obj.stroke);
                    if (obj.strokeWidth) setStrokeWidth(obj.strokeWidth);
                    if (obj.fill) setFillColor(obj.fill === 'transparent' ? 'transparent' : obj.fill);
                }
            };
            canvas.on('selection:created', syncActiveObjectProps);
            canvas.on('selection:updated', syncActiveObjectProps);

            canvas.on('object:added', () => setIsCanvasDirty(true));
            canvas.on('object:modified', () => setIsCanvasDirty(true));
            canvas.on('object:removed', () => setIsCanvasDirty(true));
        }, 100);
    };

    // 줌 핸들러
    const handleZoomIn = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        let zoom = canvas.getZoom() * 1.25;
        if (zoom > 3.5) zoom = 3.5;
        canvas.zoomToPoint({ x: canvas.width / 2, y: canvas.height / 2 }, zoom);
        setZoomLevel(Math.round(zoom * 100));
    };

    const handleZoomOut = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        let zoom = canvas.getZoom() / 1.25;
        if (zoom < 0.5) zoom = 0.5;
        canvas.zoomToPoint({ x: canvas.width / 2, y: canvas.height / 2 }, zoom);
        setZoomLevel(Math.round(zoom * 100));
    };

    const handleZoomReset = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        setZoomLevel(100);
    };

    // 상/하/좌/우 수동 이동(패닝) 핸들러
    const handlePanStep = (dx, dy) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.relativePan(new window.fabric.Point(dx, dy));
        canvas.requestRenderAll();
    };

    // 엑셀형 다양한 도형 추가
    const addCanvasShape = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const currentFill = getComputedFillColor(fillColor, fillOpacity);
        const currentStroke = strokeColor;
        const currentStrokeWidth = Number(strokeWidth);

        if (canvasTool === 'rect') {
            // 직사각형
            const rect = new window.fabric.Rect({
                left: 200, top: 150, width: 140, height: 90,
                fill: currentFill, stroke: currentStroke, strokeWidth: currentStrokeWidth
            });
            canvas.add(rect);
            canvas.setActiveObject(rect);
        } else if (canvasTool === 'rounded-rect') {
            // 둥근 모서리 사각형
            const roundRect = new window.fabric.Rect({
                left: 200, top: 150, width: 140, height: 90, rx: 14, ry: 14,
                fill: currentFill, stroke: currentStroke, strokeWidth: currentStrokeWidth
            });
            canvas.add(roundRect);
            canvas.setActiveObject(roundRect);
        } else if (canvasTool === 'circle') {
            // 타원 / 원
            const circle = new window.fabric.Circle({
                left: 220, top: 160, radius: 55,
                fill: currentFill, stroke: currentStroke, strokeWidth: currentStrokeWidth
            });
            canvas.add(circle);
            canvas.setActiveObject(circle);
        } else if (canvasTool === 'arrow') {
            // 화살표 (선 + 삼각형 머리 그룹)
            const line = new window.fabric.Line([50, 50, 180, 50], {
                stroke: currentStroke,
                strokeWidth: currentStrokeWidth,
                selectable: false
            });
            const triangle = new window.fabric.Triangle({
                left: 180, top: 50, originX: 'center', originY: 'center',
                angle: 90, width: currentStrokeWidth * 4 + 8, height: currentStrokeWidth * 4 + 8,
                fill: currentStroke, stroke: currentStroke, strokeWidth: 1, selectable: false
            });
            const arrowGroup = new window.fabric.Group([line, triangle], {
                left: 200, top: 180
            });
            canvas.add(arrowGroup);
            canvas.setActiveObject(arrowGroup);
        } else if (canvasTool === 'line') {
            // 직선
            const line = new window.fabric.Line([200, 150, 360, 150], {
                stroke: currentStroke, strokeWidth: currentStrokeWidth
            });
            canvas.add(line);
            canvas.setActiveObject(line);
        } else if (canvasTool === 'callout') {
            // 말풍선 / 메모 박스 (배경 사각형 + 텍스트)
            const bgRect = new window.fabric.Rect({
                width: 190, height: 60, rx: 8, ry: 8,
                fill: currentFill || 'rgba(255, 255, 255, 0.95)',
                stroke: currentStroke, strokeWidth: currentStrokeWidth
            });
            const textInside = new window.fabric.IText('중요 관리 포인트', {
                left: 14, top: 18, fontSize: 15, fill: textColor || '#1e293b', fontWeight: 'bold', fontFamily: 'sans-serif',
                stroke: null, strokeWidth: 0
            });
            const calloutGroup = new window.fabric.Group([bgRect, textInside], {
                left: 180, top: 150
            });
            canvas.add(calloutGroup);
            canvas.setActiveObject(calloutGroup);
        } else if (canvasTool === 'text') {
            // 단독 글상자 (선명한 텍스트 - 외곽선 간섭 제거)
            const text = new window.fabric.IText('여기에 세부 주석을 입력하세요', {
                left: 180, top: 180, fontFamily: 'sans-serif', fontSize: 20,
                fill: textColor || '#000000',
                backgroundColor: (currentFill === 'transparent' || !currentFill) ? '' : currentFill,
                stroke: null,
                strokeWidth: 0,
                fontWeight: 'bold'
            });
            canvas.add(text);
            canvas.setActiveObject(text);
        } else if (canvasTool === 'check') {
            // ✅ 체크 마크
            const check = new window.fabric.IText('✓', {
                left: 250, top: 160, fontFamily: 'sans-serif', fontSize: 48,
                fill: textColor || '#10b981', fontWeight: 'bold',
                stroke: null, strokeWidth: 0
            });
            canvas.add(check);
            canvas.setActiveObject(check);
        } else if (canvasTool === 'cross') {
            // ❌ X 마크
            const cross = new window.fabric.IText('✕', {
                left: 250, top: 160, fontFamily: 'sans-serif', fontSize: 44,
                fill: textColor || '#ef4444', fontWeight: 'bold',
                stroke: null, strokeWidth: 0
            });
            canvas.add(cross);
            canvas.setActiveObject(cross);
        }
        canvas.renderAll();
    };

    // 선택된 객체 속성(선 색상, 두께, 면 색상, 투명도, 글자 색상) 실시간 반영
    const applyStyleToActiveObject = (changes) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        if (activeObj.type === 'i-text') {
            // 텍스트 객체: 글자 색상(fill)과 텍스트 배경색(backgroundColor) 독립 제어
            if (changes.textColor !== undefined) {
                activeObj.set('fill', changes.textColor);
                activeObj.set('stroke', null);
                activeObj.set('strokeWidth', 0);
                if (activeObj.isEditing) {
                    activeObj.setSelectionStyles?.({ fill: changes.textColor, stroke: null, strokeWidth: 0 });
                }
            }
            if (changes.fill !== undefined) {
                activeObj.set('backgroundColor', (changes.fill === 'transparent' || !changes.fill) ? '' : changes.fill);
            }
            if (changes.opacity !== undefined) activeObj.set('opacity', changes.opacity);
            activeObj.initDimensions?.();
        } else {
            // 일반 도형 및 화살표
            if (changes.stroke !== undefined) activeObj.set('stroke', changes.stroke);
            if (changes.strokeWidth !== undefined) activeObj.set('strokeWidth', changes.strokeWidth);
            if (changes.fill !== undefined) activeObj.set('fill', changes.fill);
            if (changes.opacity !== undefined) activeObj.set('opacity', changes.opacity);
        }

        activeObj.setCoords();
        canvas.requestRenderAll();
        setIsCanvasDirty(true);
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
                        * 신규 직접 사진 업로드 또는 기존 등록된 타 제품의 포장방법 사진을 복사해 올 수 있습니다.<br />
                        (1장당 최대 10MB 제한 / 1회 최대 20장 / JPG, PNG, WEBP 포맷 지원)
                    </p>
                    
                    {canEdit && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'inline-block', position: 'relative' }}>
                                <button className="primary" style={{ background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                                    ➕ 신규 사진 추가
                                </button>
                                <input 
                                    type="file" multiple accept="image/jpeg,image/png,image/webp" 
                                    onChange={handleFileChange}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsProductSearchOpen(true)}
                                style={{ 
                                    background: '#f8fafc', color: '#2563eb', border: '1.5px solid #93c5fd', 
                                    borderRadius: '8px', padding: '10px 18px', fontWeight: 'bold', fontSize: '12px', 
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                                }}
                            >
                                📋 타 제품 포장사진 복사
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── 이미지 목록 카드 그리드 (드래그 앤 드롭 순서 변경 지원) ── */}
            {images.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🖐️ <strong>순서 변경:</strong> 카드를 마우스로 드래그 앤 드롭하여 배치하거나, ◀ ▶ 버튼으로 순서를 조정하세요.
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                총 {images.length}장 등록됨
                            </span>
                            {canEdit && (
                                <>
                                    <div style={{ display: 'inline-block', position: 'relative' }}>
                                        <button style={{ background: '#003366', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            ➕ 사진 추가
                                        </button>
                                        <input 
                                            type="file" multiple accept="image/jpeg,image/png,image/webp" 
                                            onChange={handleFileChange}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsProductSearchOpen(true)}
                                        style={{ 
                                            background: '#fff', color: '#2563eb', border: '1px solid #93c5fd', 
                                            borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px', fontWeight: 'bold', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        📋 타 제품 사진 복사
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

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
                                    {/* 🎨 엑셀 스타일 고도화 주석 툴바 */}
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', gap: '8px',
                                        background: '#fff', padding: '10px 16px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', width: '100%',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}>
                                        {/* 1행: 도형 선택 및 추가 & 선택 제어 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>📐 도형:</span>
                                                <select
                                                    value={canvasTool}
                                                    onChange={e => setCanvasTool(e.target.value)}
                                                    style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                >
                                                    <option value="rect">▭ 직사각형 (Rect)</option>
                                                    <option value="rounded-rect">▢ 둥근 사각형 (Rounded)</option>
                                                    <option value="circle">◯ 원 / 타원 (Circle)</option>
                                                    <option value="arrow">➔ 화살표 (Arrow)</option>
                                                    <option value="line">― 직선 (Line)</option>
                                                    <option value="callout">💬 말풍선 / 메모 박스</option>
                                                    <option value="text">🔤 글 상자 (Text)</option>
                                                    <option value="check">✅ 체크 마크 (Check)</option>
                                                    <option value="cross">❌ X 마크 (Cross)</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={addCanvasShape}
                                                    style={{
                                                        padding: '5px 12px', fontSize: '11px', background: '#003366', color: '#fff',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <span>➕</span> 도형 추가
                                                </button>
                                            </div>

                                            {/* 줌 및 화면 이동 (패닝) 컨트롤 */}
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleZoomOut}
                                                    title="화면 축소"
                                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    🔍-
                                                </button>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', minWidth: '42px', textAlign: 'center' }}>
                                                    {zoomLevel}%
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleZoomIn}
                                                    title="화면 확대"
                                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    🔍+
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleZoomReset}
                                                    title="원래 배율 (100%)"
                                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    100%
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPanMode(!isPanMode)}
                                                    title="화면 드래그 이동 모드 (또는 Alt/Space 키 누른 채 드래그)"
                                                    style={{
                                                        padding: '4px 8px', fontSize: '11px',
                                                        background: isPanMode ? '#dbeafe' : '#f1f5f9',
                                                        color: isPanMode ? '#1d4ed8' : '#475569',
                                                        border: isPanMode ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                                        borderRadius: '4px', cursor: 'pointer', fontWeight: isPanMode ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    ✋ 이동 모드
                                                </button>

                                                {/* 상/하/좌/우 미세 이동 버튼 */}
                                                <div style={{ display: 'inline-flex', gap: '1px', background: '#e2e8f0', padding: '1px', borderRadius: '4px' }}>
                                                    <button type="button" onClick={() => handlePanStep(-30, 0)} title="좌로 이동" style={{ padding: '3px 5px', fontSize: '10px', background: '#fff', border: 'none', cursor: 'pointer' }}>◀</button>
                                                    <button type="button" onClick={() => handlePanStep(0, -30)} title="위로 이동" style={{ padding: '3px 5px', fontSize: '10px', background: '#fff', border: 'none', cursor: 'pointer' }}>▲</button>
                                                    <button type="button" onClick={() => handlePanStep(0, 30)} title="아래로 이동" style={{ padding: '3px 5px', fontSize: '10px', background: '#fff', border: 'none', cursor: 'pointer' }}>▼</button>
                                                    <button type="button" onClick={() => handlePanStep(30, 0)} title="우로 이동" style={{ padding: '3px 5px', fontSize: '10px', background: '#fff', border: 'none', cursor: 'pointer' }}>▶</button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={deleteSelectedObject}
                                                    style={{ padding: '4px 10px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '6px' }}
                                                >
                                                    🗑️ 선택 삭제
                                                </button>
                                            </div>
                                        </div>

                                        {/* 2행: 선 색상/두께 & 내부 면 색상/투명도 & 글자 색상 분리 설정 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', flexWrap: 'wrap' }}>
                                            {/* 선(Stroke) 설정 (엑셀 컬러피커) */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>🖌️ 테두리 선:</span>
                                                <ExcelColorPickerPopover
                                                    title="선 색상 선택"
                                                    value={strokeColor}
                                                    onChange={c => {
                                                        setStrokeColor(c);
                                                        applyStyleToActiveObject({ stroke: c });
                                                    }}
                                                    icon="🖌️"
                                                    allowTransparent={true}
                                                />
                                                <select
                                                    value={strokeWidth}
                                                    onChange={e => {
                                                        const w = Number(e.target.value);
                                                        setStrokeWidth(w);
                                                        applyStyleToActiveObject({ strokeWidth: w });
                                                    }}
                                                    style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    title="선 두께 선택"
                                                >
                                                    <option value={1}>두께 1px</option>
                                                    <option value={2}>두께 2px</option>
                                                    <option value={3}>두께 3px (기본)</option>
                                                    <option value={5}>두께 5px (굵게)</option>
                                                    <option value={8}>두께 8px (매우 굵게)</option>
                                                </select>
                                            </div>

                                            {/* 내부 면(Fill) 설정 (엑셀 컬러피커) */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>🎨 내부 면:</span>
                                                <ExcelColorPickerPopover
                                                    title="내부 면 색상 선택"
                                                    value={fillColor}
                                                    onChange={c => {
                                                        setFillColor(c);
                                                        const nextOpacity = (c === 'transparent' || c === 'none') ? 0 : (fillOpacity === 0 ? 50 : fillOpacity);
                                                        if (c !== 'transparent' && fillOpacity === 0) setFillOpacity(50);
                                                        applyStyleToActiveObject({ fill: getComputedFillColor(c, nextOpacity) });
                                                    }}
                                                    icon="🎨"
                                                    allowTransparent={true}
                                                />
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>불투명도:</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="10"
                                                    value={fillOpacity}
                                                    onChange={e => {
                                                        const op = Number(e.target.value);
                                                        setFillOpacity(op);
                                                        applyStyleToActiveObject({ fill: getComputedFillColor(fillColor, op) });
                                                    }}
                                                    style={{ width: '70px', cursor: 'pointer' }}
                                                    title={`불투명도: ${fillOpacity}%`}
                                                />
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', width: '32px' }}>
                                                    {fillOpacity}%
                                                </span>
                                            </div>

                                            {/* 글자(Text) 색상 설정 (엑셀 컬러피커) */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>🔤 글자 색상:</span>
                                                <ExcelColorPickerPopover
                                                    title="글자 색상 선택"
                                                    value={textColor}
                                                    onChange={c => {
                                                        setTextColor(c);
                                                        applyStyleToActiveObject({ textColor: c });
                                                    }}
                                                    icon="🔤"
                                                    allowTransparent={false}
                                                    align="right"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        border: '1px solid #cbd5e1', background: '#fff',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '10px',
                                        overflow: 'hidden', position: 'relative'
                                    }}>
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

            {/* 타 제품 포장사진 복사용 제품 검색 팝업 */}
            {isProductSearchOpen && (
                <ProductSearchPopup 
                    isOpen={isProductSearchOpen}
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={handleCopyFromProduct}
                    onSelectProduct={handleCopyFromProduct}
                    title="📋 포장방법 사진을 복사해 올 제품 검색"
                />
            )}
        </div>
    );
};

export default PackagingMethodTab;
