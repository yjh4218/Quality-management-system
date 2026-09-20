import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getInboundLabelInfo } from '../api';
import { generateCode128Svg } from '../utils/barcodeGenerator';

// 라벨 규격 프리셋
const LABEL_PRESETS = [
    { id: 'standard', name: '표준 관리품 라벨 (80 x 50 mm)', width: 80, height: 50 },
    { id: 'small', name: '소형 검체 라벨 (50 x 30 mm)', width: 50, height: 30 },
    { id: 'large', name: '대형 보관 라벨 (100 x 60 mm)', width: 100, height: 60 },
    { id: 'custom', name: '사용자 직접 지정 (Custom)', width: 80, height: 50 }
];

export default function ControlSampleLabelModal({ isOpen, onClose, inboundId }) {
    const [loading, setLoading] = useState(false);
    
    // 라벨 출력 데이터
    const [labelData, setLabelData] = useState({
        itemCode: '',
        productName: '',
        channelName: '',
        versionInfo: 'V1',
        lotNumber: '',
        mfgDate: '',
        expirationDate: '',
        channels: []
    });

    // 인쇄 설정
    const [selectedPreset, setSelectedPreset] = useState('standard');
    const [widthMm, setWidthMm] = useState(80);
    const [heightMm, setHeightMm] = useState(50);
    const [printCopies, setPrintCopies] = useState(2); // 기본 2매
    const [isCustomPreset, setIsCustomPreset] = useState(false);

    const printContainerRef = useRef(null);

    useEffect(() => {
        if (isOpen && inboundId) {
            loadLabelData(inboundId);
        }
    }, [isOpen, inboundId]);

    const loadLabelData = async (id) => {
        setLoading(true);
        try {
            const res = await getInboundLabelInfo(id);
            if (res.data) {
                const d = res.data;
                setLabelData({
                    itemCode: d.itemCode || '',
                    productName: d.productName || '',
                    channelName: d.defaultChannel || (d.channels && d.channels[0]) || '올리브영',
                    versionInfo: d.versionInfo || 'V1',
                    lotNumber: d.lotNumber || '',
                    mfgDate: d.mfgDate || '',
                    expirationDate: d.expirationDate || '',
                    channels: d.channels || []
                });
            }
        } catch (err) {
            toast.error("라벨 정보를 불러오는 중 오류가 발생했습니다.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePresetChange = (presetId) => {
        setSelectedPreset(presetId);
        if (presetId === 'custom') {
            setIsCustomPreset(true);
        } else {
            setIsCustomPreset(false);
            const p = LABEL_PRESETS.find(item => item.id === presetId);
            if (p) {
                setWidthMm(p.width);
                setHeightMm(p.height);
            }
        }
    };

    const handlePrint = () => {
        // 인쇄 전용 스타일 태그 동적 삽입
        const printStyleId = 'label-print-dynamic-style';
        let styleEl = document.getElementById(printStyleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = printStyleId;
            document.head.appendChild(styleEl);
        }

        styleEl.innerHTML = `
            @media print {
                @page {
                    size: ${widthMm}mm ${heightMm}mm;
                    margin: 0mm !important;
                }
                body * {
                    visibility: hidden !important;
                }
                #control-sample-print-sheet, #control-sample-print-sheet * {
                    visibility: visible !important;
                }
                #control-sample-print-sheet {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: ${widthMm}mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                }
                .label-page-break {
                    width: ${widthMm}mm !important;
                    height: ${heightMm}mm !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                }
            }
        `;

        window.print();
    };

    if (!isOpen) return null;

    // 라벨 프리뷰 단일 요소 생성
    const renderLabelContent = (idx = 0) => (
        <div
            key={idx}
            className="label-page-break bg-white text-black border border-black p-2 flex flex-col justify-between select-none"
            style={{
                width: `${widthMm * 3.78}px`,
                height: `${heightMm * 3.78}px`,
                maxWidth: '100%',
                boxSizing: 'border-box'
            }}
        >
            {/* 상단 라벨 헤더 */}
            <div className="border-b-2 border-black pb-1 mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs tracking-tight bg-black text-white px-1.5 py-0.5 rounded-sm">
                        관리품
                    </span>
                    <span className="font-bold text-[11px] text-slate-800">
                        보관 검체 보관증
                    </span>
                </div>
                <div className="text-[10px] font-mono font-bold bg-slate-100 px-1 border border-slate-300">
                    QMS-{labelData.versionInfo || 'V1'}
                </div>
            </div>

            {/* 제품명 */}
            <div className="mb-1">
                <div className="text-[11px] font-bold truncate text-slate-950" title={labelData.productName}>
                    {labelData.productName || '제품명 미지정'}
                </div>
            </div>

            {/* 6대 필수 정보 그리드 테이블 */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] border border-black p-1 bg-slate-50/50">
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">품목코드:</span>
                    <span className="font-mono font-bold truncate">{labelData.itemCode || '-'}</span>
                </div>
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">채널명:</span>
                    <span className="font-bold text-indigo-900 truncate">{labelData.channelName || '전체'}</span>
                </div>
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">버전정보:</span>
                    <span className="font-bold text-rose-700">{labelData.versionInfo || 'V1'}</span>
                </div>
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">LOT 번호:</span>
                    <span className="font-mono font-bold truncate">{labelData.lotNumber || '-'}</span>
                </div>
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">제조일자:</span>
                    <span className="font-mono">{labelData.mfgDate || '-'}</span>
                </div>
                <div className="flex">
                    <span className="font-bold text-slate-700 w-14 shrink-0">사용기한:</span>
                    <span className="font-mono font-bold">{labelData.expirationDate || '-'}</span>
                </div>
            </div>

            {/* 하단 바코드 & 안내 */}
            <div className="mt-1 pt-1 border-t border-dashed border-slate-400 flex flex-col items-center">
                {generateCode128Svg(labelData.lotNumber || labelData.itemCode || 'QMS', {
                    height: Math.max(22, heightMm * 0.4),
                    barWidth: widthMm < 60 ? 1.0 : 1.3,
                    showText: true
                })}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                {/* 헤더 */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-indigo-500/20 rounded-lg text-xl border border-indigo-400/30">🏷️</span>
                        <div>
                            <h2 className="text-lg font-bold">관리품(보관 검체) 보관 라벨 프린트</h2>
                            <p className="text-xs text-slate-300">품목코드, 채널명, 버전, LOT, 제조일자, 사용기한 6대 필수 표기 및 바코드 인쇄</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* 본문 (설정 패널 + 실시간 프리뷰) */}
                <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
                    {/* 좌측: 라벨 정보 및 인쇄 규격 설정 */}
                    <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                            <span>⚙️</span>
                            <span>라벨 규격 및 인쇄 설정</span>
                        </h3>

                        {/* 규격 프리셋 선택 */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">라벨 규격 선택</label>
                            <select
                                value={selectedPreset}
                                onChange={(e) => handlePresetChange(e.target.value)}
                                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                                {LABEL_PRESETS.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 규격 직접 입력 (Custom일 때 활성화) */}
                        {isCustomPreset && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                <div>
                                    <label className="block text-[11px] font-semibold text-indigo-900 mb-1">가로 너비 (mm)</label>
                                    <input
                                        type="number"
                                        min="30"
                                        max="150"
                                        value={widthMm}
                                        onChange={(e) => setWidthMm(Number(e.target.value))}
                                        className="w-full text-xs px-2.5 py-1.5 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-indigo-900 mb-1">세로 높이 (mm)</label>
                                    <input
                                        type="number"
                                        min="20"
                                        max="150"
                                        value={heightMm}
                                        onChange={(e) => setHeightMm(Number(e.target.value))}
                                        className="w-full text-xs px-2.5 py-1.5 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 인쇄 매수 */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">인쇄 매수 (수량)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={printCopies}
                                    onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value || 1, 10)))}
                                    className="w-24 text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                />
                                <span className="text-xs text-slate-500">매 연속 출력</span>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 pt-2 flex items-center gap-1.5">
                            <span>📝</span>
                            <span>라벨 표기 항목 수정</span>
                        </h3>

                        {/* 채널명 & 버전 정보 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">채널명</label>
                                <input
                                    type="text"
                                    list="channel-options"
                                    value={labelData.channelName}
                                    onChange={(e) => setLabelData({ ...labelData, channelName: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="예: 올리브영"
                                />
                                <datalist id="channel-options">
                                    {labelData.channels.map((ch, idx) => (
                                        <option key={idx} value={ch} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">버전 정보</label>
                                <input
                                    type="text"
                                    value={labelData.versionInfo}
                                    onChange={(e) => setLabelData({ ...labelData, versionInfo: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-rose-600"
                                    placeholder="예: V2, V6"
                                />
                            </div>
                        </div>

                        {/* LOT 번호 & 제조일자 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">LOT 번호</label>
                                <input
                                    type="text"
                                    value={labelData.lotNumber}
                                    onChange={(e) => setLabelData({ ...labelData, lotNumber: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">제조일자</label>
                                <input
                                    type="date"
                                    value={labelData.mfgDate}
                                    onChange={(e) => setLabelData({ ...labelData, mfgDate: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                        </div>

                        {/* 사용기한 & 품목코드 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">사용기한</label>
                                <input
                                    type="date"
                                    value={labelData.expirationDate}
                                    onChange={(e) => setLabelData({ ...labelData, expirationDate: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">품목코드</label>
                                <input
                                    type="text"
                                    value={labelData.itemCode}
                                    onChange={(e) => setLabelData({ ...labelData, itemCode: e.target.value })}
                                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 우측: 실시간 WYSIWYG 프리뷰 */}
                    <div className="flex flex-col items-center justify-center bg-slate-200/60 p-6 rounded-xl border border-slate-300">
                        <div className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2">
                            <span>👁️</span>
                            <span>실시간 인쇄 라벨 프리뷰 ({widthMm}mm x {heightMm}mm)</span>
                        </div>

                        {loading ? (
                            <div className="w-64 h-40 bg-white rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-xs text-slate-400">데이터 로딩 중...</span>
                            </div>
                        ) : (
                            <div className="shadow-xl rounded-sm overflow-hidden ring-4 ring-slate-400/30">
                                {renderLabelContent(0)}
                            </div>
                        )}

                        <div className="text-[11px] text-slate-500 mt-4 text-center leading-relaxed">
                            💡 제브라/빅솔론 라벨 프린터(롤지) 및 일반 복합기에서 여백 없이 자동 맞춤 출력됩니다.
                        </div>
                    </div>
                </div>

                {/* 인쇄 전용 숨겨진 컨테이너 (printCopies 만큼 반복 렌더링) */}
                <div id="control-sample-print-sheet" className="hidden" ref={printContainerRef}>
                    {Array.from({ length: printCopies }).map((_, i) => renderLabelContent(i))}
                </div>

                {/* 모달 푸터 */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                        선택 규격: <b className="text-slate-800">{widthMm}mm × {heightMm}mm</b> | 출력 매수: <b className="text-indigo-600">{printCopies}매</b>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition text-xs"
                        >
                            취소
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={loading}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-lg shadow transition flex items-center gap-2 text-xs"
                        >
                            <span>🖨️</span>
                            <span>라벨 인쇄 ({printCopies}매)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
