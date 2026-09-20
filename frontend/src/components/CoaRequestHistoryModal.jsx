import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCoaRequestHistory, sendCoaReminders } from '../api';

export default function CoaRequestHistoryModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [reminding, setReminding] = useState(false);
    const [summary, setSummary] = useState({
        totalRequested: 0,
        fulfilledCount: 0,
        pendingCount: 0,
        remindedCount: 0,
        fulfillmentRate: 0,
        avgLeadTimeHours: 0
    });
    const [logs, setLogs] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    // 필터 상태
    const [manufacturerFilter, setManufacturerFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            setSelectedIds([]);
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await getCoaRequestHistory({
                manufacturer: manufacturerFilter,
                status: statusFilter,
                startDate,
                endDate
            });
            if (res.data) {
                setSummary(res.data.summary || {});
                setLogs(res.data.logs || []);
            }
        } catch (err) {
            toast.error("성적서 요청 이력을 불러오는 중 오류가 발생했습니다.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAllPending = (e) => {
        if (e.target.checked) {
            const pendingIds = logs.filter(l => l.status !== 'FULFILLED').map(l => l.id);
            setSelectedIds(pendingIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSendReminders = async () => {
        if (selectedIds.length === 0) {
            toast.warning("리마인드를 발송할 대상을 먼저 선택해주세요.");
            return;
        }

        const confirm = window.confirm(`선택한 ${selectedIds.length}건에 대해 제조사 담당자에게 시험성적서 제출 리마인드 이메일을 발송하시겠습니까?`);
        if (!confirm) return;

        setReminding(true);
        const toastId = toast.loading("🔔 리마인드 이메일을 발송 중입니다...");
        try {
            const res = await sendCoaReminders(selectedIds);
            const { successCount, failureCount } = res.data;
            toast.update(toastId, {
                render: `성공적으로 ${successCount}건의 리마인드 메일을 발송했습니다.${failureCount > 0 ? ` (실패 ${failureCount}건)` : ''}`,
                type: "success",
                isLoading: false,
                autoClose: 3500
            });
            setSelectedIds([]);
            fetchHistory(); // 새로고침
        } catch (err) {
            toast.update(toastId, {
                render: "리마인드 메일 발송 중 오류가 발생했습니다.",
                type: "error",
                isLoading: false,
                autoClose: 3500
            });
            console.error(err);
        } finally {
            setReminding(false);
        }
    };

    const formatLeadTime = (log) => {
        if (log.status === 'FULFILLED') {
            if (log.leadTimeHours == null) return "회신완료";
            if (log.leadTimeHours < 24) {
                return `⚡ ${log.leadTimeHours}시간`;
            } else {
                const days = (log.leadTimeHours / 24).toFixed(1);
                return `⏱️ ${days}일 (${log.leadTimeHours}h)`;
            }
        } else {
            // 미회신 경과 시간 계산
            if (!log.requestedAt) return "미회신";
            const reqTime = new Date(log.requestedAt);
            const now = new Date();
            const elapsedHours = Math.max(0, Math.round((now - reqTime) / (1000 * 60 * 60)));
            if (elapsedHours < 24) {
                return `⏳ ${elapsedHours}시간째 미회신`;
            } else {
                const days = Math.floor(elapsedHours / 24);
                return `🚨 ${days}일째 미회신`;
            }
        }
    };

    if (!isOpen) return null;

    const pendingLogsCount = logs.filter(l => l.status !== 'FULFILLED').length;
    const isAllPendingSelected = pendingLogsCount > 0 && selectedIds.length === pendingLogsCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* 헤더 */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-indigo-500/20 rounded-lg text-xl border border-indigo-400/30">📜</span>
                        <div>
                            <h2 className="text-lg font-bold">제조사 성적서(COA) 발송 이력 및 리드타임 추적</h2>
                            <p className="text-xs text-slate-300">제조사 성적서 요청 발송 내역, 회신 소요시간 모니터링 및 미회신 건 리마인드 발송</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* 상단 KPI 요약 카드 */}
                <div className="grid grid-cols-4 gap-4 p-5 bg-slate-50 border-b border-slate-200">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">총 성적서 요청</span>
                            <div className="text-2xl font-black text-slate-800 mt-1">{summary.totalRequested || 0}<span className="text-xs font-normal text-slate-500 ml-1">건</span></div>
                        </div>
                        <span className="text-3xl">📨</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/50">
                        <div>
                            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">회신 완료 (회신율)</span>
                            <div className="text-2xl font-black text-emerald-600 mt-1">
                                {summary.fulfilledCount || 0}
                                <span className="text-xs font-semibold text-emerald-500 ml-2">({summary.fulfillmentRate || 0}%)</span>
                            </div>
                        </div>
                        <span className="text-3xl">✅</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-amber-50/50">
                        <div>
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">미회신 지연 건수</span>
                            <div className="text-2xl font-black text-amber-700 mt-1">{summary.pendingCount || 0}<span className="text-xs font-normal text-amber-600 ml-1">건</span></div>
                        </div>
                        <span className="text-3xl">⏳</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-indigo-50/50">
                        <div>
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">평균 회신 리드타임</span>
                            <div className="text-2xl font-black text-indigo-700 mt-1">
                                {summary.avgLeadTimeHours ? (
                                    summary.avgLeadTimeHours < 24 
                                        ? `${summary.avgLeadTimeHours}시간` 
                                        : `${(summary.avgLeadTimeHours / 24).toFixed(1)}일`
                                ) : '-'}
                            </div>
                        </div>
                        <span className="text-3xl">⏱️</span>
                    </div>
                </div>

                {/* 필터 툴바 */}
                <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            type="text"
                            placeholder="제조사명 검색"
                            value={manufacturerFilter}
                            onChange={(e) => setManufacturerFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">상태 전체</option>
                            <option value="REQUESTED">요청됨 (미회신)</option>
                            <option value="REMINDED">리마인드됨 (재요청)</option>
                            <option value="FULFILLED">회신 완료</option>
                        </select>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400 text-xs">~</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={fetchHistory}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-medium flex items-center gap-1 shadow-sm"
                        >
                            🔍 조회
                        </button>
                    </div>

                    {/* 리마인드 발송 액션 버튼 */}
                    <button
                        onClick={handleSendReminders}
                        disabled={reminding || selectedIds.length === 0}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5 ${
                            selectedIds.length > 0 && !reminding
                                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white hover:opacity-90 ring-2 ring-red-300 animate-pulse'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                    >
                        <span>🔔</span>
                        <span>선택 건 리마인드 메일 발송 ({selectedIds.length}건)</span>
                    </button>
                </div>

                {/* 이력 테이블 */}
                <div className="flex-1 overflow-auto bg-white p-4">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-medium">이력을 불러오는 중입니다...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <span className="text-3xl">📭</span>
                            <span className="text-sm font-medium">조회된 성적서 발송 이력이 없습니다.</span>
                        </div>
                    ) : (
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 shadow-sm">
                                <tr>
                                    <th className="p-2.5 text-center w-10">
                                        <input
                                            type="checkbox"
                                            checked={isAllPendingSelected}
                                            onChange={handleSelectAllPending}
                                            title="미회신 건 전체 선택"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="p-2.5">요청일시</th>
                                    <th className="p-2.5">입고번호</th>
                                    <th className="p-2.5">품목코드</th>
                                    <th className="p-2.5">제품명</th>
                                    <th className="p-2.5">LOT 번호</th>
                                    <th className="p-2.5">제조사</th>
                                    <th className="p-2.5">수신 이메일</th>
                                    <th className="p-2.5 text-center">리마인드</th>
                                    <th className="p-2.5 text-center">회신 소요시간 / 상태</th>
                                    <th className="p-2.5 text-center">진행 상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => {
                                    const isPending = log.status !== 'FULFILLED';
                                    const isSelected = selectedIds.includes(log.id);

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}
                                        >
                                            <td className="p-2.5 text-center">
                                                {isPending ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(log.id)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300 text-[10px]">-</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-slate-600 whitespace-nowrap">
                                                {log.requestedAt ? log.requestedAt.replace('T', ' ').substring(0, 16) : '-'}
                                            </td>
                                            <td className="p-2.5 font-mono text-slate-700">{log.grnNumber || '-'}</td>
                                            <td className="p-2.5 font-mono font-semibold text-slate-800">{log.itemCode}</td>
                                            <td className="p-2.5 max-w-[180px] truncate text-slate-800" title={log.productName}>
                                                {log.productName}
                                            </td>
                                            <td className="p-2.5 font-mono text-slate-700">{log.lotNumber || '-'}</td>
                                            <td className="p-2.5 font-medium text-slate-700">{log.manufacturer}</td>
                                            <td className="p-2.5 text-slate-500 font-mono text-[11px] truncate max-w-[140px]" title={log.recipientEmail}>
                                                {log.recipientEmail || '-'}
                                            </td>
                                            <td className="p-2.5 text-center">
                                                {log.reminderCount > 0 ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        {log.reminderCount}회
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-center whitespace-nowrap font-medium">
                                                <span className={log.status === 'FULFILLED' ? 'text-emerald-700' : 'text-amber-700'}>
                                                    {formatLeadTime(log)}
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-center whitespace-nowrap">
                                                {log.status === 'FULFILLED' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        회신완료
                                                    </span>
                                                ) : log.status === 'REMINDED' ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        리마인드됨
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        요청됨
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 모달 푸터 */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div>
                        <span>미회신 항목을 체크박스로 선택하여 제조사 담당자에게 즉시 리마인드 이메일을 발송할 수 있습니다.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition shadow-sm"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
