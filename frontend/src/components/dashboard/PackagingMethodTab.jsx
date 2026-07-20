import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

/**
 * 포장방법 탭 컴포넌트
 * - 다중 이미지 업로드 (최대 20장, 개당 10MB 제한)
 * - 개별 캡션(Caption) 수정 (onBlur 시 자동저장)
 * - Fabric.js 기반 캔버스 주석 그리기 및 캔버스 Dirty 체크 이탈 방지
 * - 소프트 삭제(deletedAt) 및 5초 내 실행취소 토스트 구현
 * - 768px 미만 모바일 환경 편집 비활성화 안내
 */
const PackagingMethodTab = ({ specId, canEdit }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    
    // 삭제 실행취소를 위한 상태 관리
    const [lastDeletedImage, setLastDeletedImage] = useState(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const undoTimerRef = useRef(null);

    // 캔버스 모달 에디터 상태
    const [editingImage, setEditingImage] = useState(null);
    const [isCanvasDirty, setIsCanvasDirty] = useState(false);
    const [canvasColor, setCanvasColor] = useState('#ef4444');
    const [canvasTool, setCanvasTool] = useState('rect'); // 'rect', 'circle', 'text'
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);

    // 모바일 리사이즈 대응 감지
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 이미지 목록 로드
    const loadImages = async () => {
        try {
            const res = await fetch(`/api/packaging-specs/${specId}/method-images`);
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (e) {
            console.error('Failed to load packaging method images', e);
        }
    };

    useEffect(() => {
        if (specId) {
            loadImages();
        }
    }, [specId]);

    // 파일 유효성 검사 및 업로드
    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // 개수 제한 체크
        if (images.length + selectedFiles.length > 20) {
            toast.error('포장방법 사진은 한 스펙당 최대 20장까지만 등록 가능합니다.');
            return;
        }

        const validFiles = [];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

        for (const file of selectedFiles) {
            // 크기 제한 10MB
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`"${file.name}" 파일이 제한 크기(10MB)를 초과하여 제외되었습니다.`);
                continue;
            }
            // 확장자 체크
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                toast.error(`"${file.name}" 파일은 허용되지 않는 포맷입니다. (jpg, png, webp 가능)`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        // 순차적 개별 파일 업로드 및 진행률 표현
        setLoading(true);
        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            // 개별 진행률 상태 모킹 (xhr 활용)
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/packaging-specs/${specId}/method-images/batch-upload`, true);
            xhr.withCredentials = true; // 세션 세팅 정보 전송 허용
            
            // CSRF 토큰 주입 (Spring Security 연동용)
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1];
            if (csrfToken) {
                xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken);
            }

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress({ all: percent });
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    toast.success('사진이 성공적으로 등록되었습니다.');
                    loadImages();
                } else {
                    toast.error(xhr.responseText || '업로드 중 오류가 발생했습니다.');
                }
                setLoading(false);
                setUploadProgress({});
            };

            xhr.onerror = () => {
                toast.error('네트워크 통신 중 오류가 발생했습니다.');
                setLoading(false);
                setUploadProgress({});
            };

            xhr.send(formData);
        } catch (err) {
            console.error(err);
            setLoading(false);
            setUploadProgress({});
        }
    };

    // 캡션 수정 완료 시 (blur) 자동 저장 API 호출
    const handleCaptionBlur = async (imageId, newCaption) => {
        try {
            await fetch(`/api/packaging-specs/method-images/${imageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caption: newCaption })
            });
        } catch (e) {
            console.error('Failed to update caption', e);
        }
    };

    // 이미지 삭제 및 5초 실행취소 처리
    const handleDeleteImage = (img) => {
        const hasAnnotations = img.annotationsJson && img.annotationsJson !== '[]' && img.annotationsJson.length > 5;
        
        // 경고 모달 처리 대체용 창 확인
        const confirmMsg = hasAnnotations 
            ? `⚠️ 이 사진은 저장된 주석(드로잉) 정보가 포함되어 있습니다.\n삭제 시 주석도 함께 유실됩니다. 정말로 삭제하시겠습니까?`
            : '선택한 포장방법 이미지를 삭제하시겠습니까?';

        if (!window.confirm(confirmMsg)) return;

        // 즉시 UI에서 숨기고 임시 저장
        setLastDeletedImage(img);
        setImages(prev => prev.filter(item => item.id !== img.id));
        setShowUndoToast(true);

        // 이전 타이머 정리
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

        // 5초 후 백엔드 실제 Soft Delete 반영
        undoTimerRef.current = setTimeout(async () => {
            try {
                await fetch(`/api/packaging-specs/method-images/${img.id}`, { method: 'DELETE' });
                setShowUndoToast(false);
                setLastDeletedImage(null);
            } catch (e) {
                console.error(e);
            }
        }, 5000);
    };

    // 삭제 실행취소(복구) 클릭
    const handleUndoDelete = async () => {
        if (!lastDeletedImage) return;
        
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        
        try {
            const res = await fetch(`/api/packaging-specs/method-images/${lastDeletedImage.id}/restore`, { method: 'POST' });
            if (res.ok) {
                toast.info('삭제가 취소되고 이미지가 복구되었습니다.');
                loadImages();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setShowUndoToast(false);
            setLastDeletedImage(null);
        }
    };

    // Fabric.js 초기화 및 주석 로드
    const openCanvasEditor = (img) => {
        setEditingImage(img);
        setIsCanvasDirty(false);

        // 동적 Fabric.js 로드 바인딩
        setTimeout(() => {
            if (!canvasRef.current) return;
            
            // 기존 캔버스 정리
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
            }

            const canvas = new window.fabric.Canvas(canvasRef.current, {
                width: 700,
                height: 500
            });
            fabricCanvasRef.current = canvas;

            // 배경 이미지 세팅
            window.fabric.Image.fromURL(img.imagePath, (oImg) => {
                oImg.set({
                    selectable: false,
                    evented: false
                });
                // 비율 계산하여 캔버스 크기에 핏팅
                const scale = Math.min(700 / oImg.width, 500 / oImg.height);
                oImg.scale(scale);
                canvas.centerObject(oImg);
                canvas.add(oImg);
                canvas.sendToBack(oImg);

                // 기존 저장 주석 로드
                if (img.annotationsJson) {
                    try {
                        const parsed = JSON.parse(img.annotationsJson);
                        canvas.loadFromJSON(parsed, () => {
                            canvas.renderAll();
                        });
                    } catch (err) {
                        console.error('Failed to load annotation json', err);
                    }
                }
            }, { crossOrigin: 'anonymous' });

            // 변경 사항 감지
            canvas.on('object:added', () => setIsCanvasDirty(true));
            canvas.on('object:modified', () => setIsCanvasDirty(true));
            canvas.on('object:removed', () => setIsCanvasDirty(true));

        }, 100);
    };

    // 주석 도형/텍스트 그리기 툴 작동
    const addCanvasShape = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        if (canvasTool === 'rect') {
            const rect = new window.fabric.Rect({
                left: 100,
                top: 100,
                width: 80,
                height: 60,
                fill: 'transparent',
                stroke: canvasColor,
                strokeWidth: 3
            });
            canvas.add(rect);
        } else if (canvasTool === 'circle') {
            const circle = new window.fabric.Circle({
                left: 150,
                top: 150,
                radius: 40,
                fill: 'transparent',
                stroke: canvasColor,
                strokeWidth: 3
            });
            canvas.add(circle);
        } else if (canvasTool === 'text') {
            const text = new window.fabric.IText('여기에 설명글을 입력하세요', {
                left: 120,
                top: 120,
                fontFamily: 'Inter',
                fontSize: 16,
                fill: canvasColor,
                fontWeight: 'bold'
            });
            canvas.add(text);
        }
        canvas.renderAll();
    };

    // 선택 오브젝트 삭제
    const deleteSelectedObject = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects) {
            activeObjects.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject().renderAll();
        }
    };

    // 캔버스 변경 저장 API 호출
    const handleSaveCanvas = async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !editingImage) return;

        // JSON 직렬화
        const json = JSON.stringify(canvas.toJSON());

        try {
            const res = await fetch(`/api/packaging-specs/method-images/${editingImage.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ annotationsJson: json })
            });

            if (res.ok) {
                toast.success('주석이 저장되었습니다.');
                setIsCanvasDirty(false);
                setEditingImage(null);
                loadImages();
            } else {
                toast.error('주석 저장에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            toast.error('서버 연결 중 장애가 발생했습니다.');
        }
    };

    // 에디터 닫을 때 Dirty 체크
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
            
            {/* ── 이미지 개수 0장일 때 노출되는 빈 상태 (Empty State) ── */}
            {images.length === 0 && (
                <div style={{
                    border: '2.5px dashed #cbd5e1',
                    borderRadius: '16px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    margin: '10px 0 20px',
                    transition: 'all 0.2s',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                        포장방법 사진을 등록해보세요
                    </h4>
                    <p style={{ margin: '0 0 24px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        * 신규 단독 상품인 경우 이 자리에 빈 상태 전용 UI가 노출됩니다.<br />
                        * 마스터 품목코드에 이미 사진이 등록되어 있는 자식 상품코드는 마스터 정보가 상속되어 연동됩니다.<br />
                        (1장당 최대 10MB 제한 / 1회 최대 20장 / JPG, PNG, WEBP 포맷 지원)
                    </p>
                    
                    {canEdit && (
                        <div style={{ display: 'inline-block', position: 'relative' }}>
                            <button className="primary" style={{ background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                                ➕ 사진 추가하기
                            </button>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileChange}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── 이미지 목록 카드 그리드 ── */}
            {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    {images.map((img, idx) => (
                        <div key={img.id} style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            background: '#fff',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ position: 'relative', height: '140px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={img.imagePath} alt={`포장방법 ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                
                                <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                                    NO. {idx + 1}
                                </span>

                                {canEdit && (
                                    <button 
                                        type="button" 
                                        onClick={() => handleDeleteImage(img)}
                                        style={{ position: 'absolute', top: '8px', right: '8px', background: '#fff', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                        title="사진 삭제"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>

                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                {/* 캡션 텍스트 박스 바로 입력 및 blur 자동저장 */}
                                <input 
                                    type="text" 
                                    defaultValue={img.caption || ''} 
                                    onBlur={(e) => handleCaptionBlur(img.id, e.target.value)}
                                    placeholder="캡션(설명)을 입력하세요..." 
                                    disabled={!canEdit}
                                    style={{ width: '100%', fontSize: '11px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', background: canEdit ? '#fff' : '#f8fafc' }}
                                />

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        type="button"
                                        onClick={() => openCanvasEditor(img)}
                                        style={{ flex: 1, padding: '5px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                                    >
                                        ✏️ 주석 편집
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* 카드 그리드 내 추가 영역 */}
                    {canEdit && images.length < 20 && (
                        <div style={{
                            border: '2px dashed #cbd5e1',
                            borderRadius: '12px',
                            height: '210px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            position: 'relative',
                            cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '24px', marginBottom: '8px' }}>➕</span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>사진 추가하기</span>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileChange}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── 업로드 로딩 진행바 ── */}
            {loading && (
                <div style={{ margin: '10px 0', padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
                        <span>📤 서버로 안전하게 업로드 진행 중...</span>
                        <span>{uploadProgress.all || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress.all || 0}%`, height: '100%', background: '#3b82f6', transition: 'width 0.1s' }} />
                    </div>
                </div>
            )}

            {/* ── 5초 내 소프트 삭제 실행취소 토스트 바 ── */}
            {showUndoToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '12px',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <span>이 사진과 주석 내용이 모두 삭제되었습니다.</span>
                    <button 
                        type="button" 
                        onClick={handleUndoDelete}
                        style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ↩️ 실행취소 (5초)
                    </button>
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
                        background: '#fff',
                        width: '90%',
                        maxWidth: '850px',
                        borderRadius: '14px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* 모달 헤더 */}
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

                        {/* 모달 바디 */}
                        <div style={{ flex: 1, padding: '20px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                            {/* 모바일 화면 감지 경고 안내 */}
                            {isMobile ? (
                                <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#b91c1c', maxWidth: '400px', margin: '40px auto' }}>
                                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📱</span>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700' }}>모바일 브라우저 감지</h4>
                                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.6' }}>
                                        모바일/터치 환경에서는 드로잉 캔버스 편집 정밀도가 떨어지므로, 주석 그리기 기능은 PC 환경에서 이용해주세요. (캡션 입력 및 사진 추가는 모바일에서도 정상 가능합니다.)
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* 캔버스 주석 그리기 툴바 */}
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

                                    {/* 캔버스 렌더링 영역 */}
                                    <div style={{ border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                                        <canvas ref={canvasRef} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={handleCloseEditor} style={{ padding: '8px 16px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#64748b' }}>
                                취소
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSaveCanvas} 
                                disabled={isMobile || !canEdit}
                                style={{ 
                                    padding: '8px 20px', fontSize: '12px', 
                                    background: '#10b981', color: '#fff', 
                                    border: 'none', borderRadius: '6px', 
                                    cursor: (isMobile || !canEdit) ? 'not-allowed' : 'pointer', 
                                    fontWeight: 'bold',
                                    opacity: (isMobile || !canEdit) ? 0.6 : 1
                                }}
                            >
                                💾 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagingMethodTab;
