import React, { useState, useEffect } from 'react';
import { checkProductSpaceRatio } from '../api';

/**
 * 6개국 포장공간비율 자동 검증 모달 컴포넌트
 */
const ProductSpaceRatioCheckModal = ({ product, onClose, onGoToEdit }) => {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);
    const [expandedCountry, setExpandedCountry] = useState(null);

    // 국기 이모지 매핑
    const flagMap = {
        'KOREA': '🇰🇷',
        'CHINA': '🇨🇳',
        'TAIWAN': '🇹🇼',
        'JAPAN': '🇯🇵',
        'EU': '🇪🇺',
        'US': '🇺🇸'
    };

    // 6개국 기본 리스트 (로딩용 스켈레톤 상태 정의)
    const initialCountries = ['KOREA', 'CHINA', 'TAIWAN', 'JAPAN', 'EU', 'US'];

    useEffect(() => {
        if (!product) return;

        // 제품체적이 없는 경우 즉시 계산 차단
        if (!product.contentVolumeMl || product.contentVolumeMl <= 0) {
            setError('volume_missing');
            setLoading(false);
            return;
        }

        const runCheck = async () => {
            try {
                const res = await checkProductSpaceRatio(product.id);
                setResults(res.data || []);
            } catch (err) {
                console.error("Failed to run space ratio check", err);
                setError('server_error');
            } finally {
                setLoading(false);
            }
        };

        runCheck();
    }, [product]);

    // 판정에 따른 정렬 우선순위 스코어 반환
    const getSortScore = (status) => {
        switch (status) {
            case 'FAIL': return 0;              // 부적합 최우선 (빨강)
            case 'REFER': return 1;             // 참고용/주의 (노랑/회색)
            case 'CALC_IMPOSSIBLE': return 2;   // 계산 불가 (회색)
            case 'PASS': return 3;              // 합격 (초록)
            case 'NOT_APPLICABLE': return 4;    // 해당 없음
            default: return 5;
        }
    };

    // 결과 정렬 처리
    const sortedResults = [...results].sort((a, b) => {
        return getSortScore(a.status) - getSortScore(b.status);
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PASS':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">합격</span>;
            case 'FAIL':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">부적합</span>;
            case 'REFER':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">참고용</span>;
            case 'NOT_APPLICABLE':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">해당 없음</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">계산 불가</span>;
        }
    };

    // 제품체적 미입력 시 안내 화면
    if (error === 'volume_missing') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100">
                    <div className="text-center">
                        <span className="text-4xl">⚠️</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-4">제품체적 미입력</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            포장공간비율 계산을 진행하려면 제품체적(mL) 정보가 필수로 등록되어 있어야 합니다.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    onGoToEdit(product);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium shadow-sm"
                            >
                                입력하러 가기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div 
                className="bg-gray-50 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                {/* 헤더 */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">
                            🌍 6개국 포장공간비율 자동검증
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            품목명: <span className="font-semibold text-gray-700">{product?.productName}</span> ({product?.itemCode})
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-semibold p-1 leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* 바디 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        /* 스켈레톤 로더 */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {initialCountries.map((country, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="h-5 w-20 bg-gray-200 rounded"></div>
                                        <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <div className="h-6 w-24 bg-gray-200 rounded mt-1"></div>
                                    <div className="h-4 w-full bg-gray-150 rounded mt-2"></div>
                                </div>
                            ))}
                        </div>
                    ) : error === 'server_error' ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                            <span className="text-3xl">🚫</span>
                            <p className="text-sm font-semibold text-gray-700 mt-2">일시적으로 계산을 진행할 수 없습니다.</p>
                            <p className="text-xs text-gray-400 mt-1">네트워크 환경을 점검하고 잠시 후 다시 시도해 주세요.</p>
                        </div>
                    ) : (
                        /* 실제 정렬된 결과 카드 목록 */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedResults.map((res, idx) => {
                                const isFail = res.status === 'FAIL';
                                const isExpanded = expandedCountry === res.country;

                                return (
                                    <div 
                                        key={idx}
                                        className={`bg-white rounded-xl transition-all duration-200 shadow-sm flex flex-col ${
                                            isFail ? 'border-2 border-red-500' : 'border border-gray-200'
                                        }`}
                                    >
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-lg">{flagMap[res.country] || '🌐'}</span>
                                                    <span className="font-bold text-sm text-gray-800">{res.countryName}</span>
                                                </div>
                                                {getStatusBadge(res.status)}
                                            </div>

                                            <div className="mt-3 flex items-baseline gap-1">
                                                <span className="text-xs text-gray-400">포장비율:</span>
                                                <span className="text-lg font-extrabold text-blue-600">
                                                    {res.ratioString}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-gray-400 mt-2 line-clamp-1">
                                                출처: {res.source}
                                            </p>
                                        </div>

                                        {/* 자세히 보기 아코디언 */}
                                        <div className="border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                                            <button 
                                                onClick={() => setExpandedCountry(isExpanded ? null : res.country)}
                                                className="w-full px-4 py-2 text-left text-[11px] font-semibold text-gray-500 hover:text-gray-700 flex justify-between items-center transition-colors"
                                            >
                                                <span>📋 세부 계산 공식 및 근거</span>
                                                <span>{isExpanded ? '▲ 접기' : '▼ 펼치기'}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-1 space-y-2 text-xs text-gray-600 border-t border-gray-100 bg-white">
                                                    <div>
                                                        <span className="font-semibold text-gray-700">적용 공식:</span>
                                                        <code className="block bg-gray-50 p-1.5 rounded text-[11px] font-mono mt-1 text-blue-800">
                                                            {res.formula}
                                                        </code>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="font-semibold text-gray-700">상세 계산 이력:</span>
                                                        <ul className="list-disc pl-4 space-y-1 text-gray-500 text-[11px]">
                                                            {res.details && res.details.map((d, i) => (
                                                                <li key={i}>{d}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 푸터 면책 조항 및 닫기 */}
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-3">
                    <p className="text-[10px] text-gray-400 text-center md:text-left leading-relaxed max-w-lg">
                        ⚠️ **면책조항**: 본 자동 계산 결과는 사내 참고용이며, 공식 시험 기관의 성적서와 다를 수 있으므로 통관 및 제품 유통 시 최종 확인을 거치시기 바랍니다.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-5 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-900 transition-colors shadow-sm"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductSpaceRatioCheckModal;
