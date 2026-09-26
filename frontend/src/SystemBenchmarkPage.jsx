import React, { useState, useEffect, useMemo } from 'react';
import api from './api';
import { toast } from 'react-toastify';

// 18대 핵심 시스템 API 테스트 대상 (조회 GET, 등록 POST, 수정 PUT, 삭제 DELETE)
const BENCHMARK_TARGETS = [
    // --- 1. 핵심 조회 (GET) ---
    {
        id: 'auth_me',
        domain: '인증/세션',
        name: '로그인 사용자 정보 & 권한 조회',
        method: 'GET',
        url: '/api/auth/me',
        type: 'READ',
        description: '인증 토큰 검증 및 권한(Role) 확인 (SWR 캐시)'
    },
    {
        id: 'dashboard_stats',
        domain: '통계/대시보드',
        name: '시스템 대시보드 종합 통계 집계',
        method: 'GET',
        url: '/api/dashboard/stats',
        type: 'READ',
        description: '제품, 클레임, 입고 현황 종합 집계'
    },
    {
        id: 'products_paged',
        domain: '제품 마스터',
        name: '제품 목록 50건 페이징 조회',
        method: 'GET',
        url: '/api/products?page=0&size=50',
        type: 'READ',
        description: 'EXISTS 서브쿼리 & 채널 조인 최적화'
    },
    {
        id: 'product_detail',
        domain: '제품 마스터',
        name: '제품 단건 상세 조회 (@EntityGraph)',
        method: 'GET',
        url: '/api/products/1',
        dynamicUrl: async () => {
            try {
                const res = await api.get('/api/products?page=0&size=1', { skipLoading: true });
                const first = res.data?.content?.[0] || res.data?.[0];
                return first?.id ? `/api/products/${first.id}` : '/api/products/1';
            } catch {
                return '/api/products/1';
            }
        },
        type: 'READ',
        description: '브랜드/제조사 지연로딩 방지 Eager 페칭'
    },
    {
        id: 'packaging_spec',
        domain: '포장사양서',
        name: '통합 포장사양서 전체 로드',
        method: 'GET',
        url: '/api/packaging-specs/product/1',
        dynamicUrl: async () => {
            try {
                const res = await api.get('/api/products?page=0&size=1', { skipLoading: true });
                const first = res.data?.content?.[0] || res.data?.[0];
                return first?.id ? `/api/packaging-specs/product/${first.id}` : '/api/packaging-specs/product/1';
            } catch {
                return '/api/packaging-specs/product/1';
            }
        },
        type: 'READ',
        description: '사양서 본문, 개정이력, 부자재 단일 호출'
    },
    {
        id: 'quality_inbound',
        domain: '품질/입고검사',
        name: '입고 검사 목록 전체 조회',
        method: 'GET',
        url: '/api/quality/inbound',
        type: 'READ',
        description: 'WMS 입고 내역 및 성적서(COA) 관리'
    },
    {
        id: 'production_audit_pending',
        domain: '품질/생산감리',
        name: '대기 중인 생산감리 목록',
        method: 'GET',
        url: '/api/production-audits/pending',
        type: 'READ',
        description: '제조사 LEFT JOIN FETCH N+1 해소 검증'
    },
    {
        id: 'claims_paged',
        domain: '클레임',
        name: '클레임 목록 50건 페이징',
        method: 'GET',
        url: '/api/claims/paged?page=0&size=50',
        type: 'READ',
        description: '클레임 그리드 조회 및 원인별 통계'
    },
    {
        id: 'sales_channels',
        domain: '기준정보',
        name: '유통채널 목록 (Spring Cache)',
        method: 'GET',
        url: '/api/admin/master-data/sales-channels',
        type: 'READ',
        description: 'Caffeine 인메모리 캐시 0ms 응답'
    },
    {
        id: 'bom_categories',
        domain: 'BOM 마스터',
        name: 'BOM 유형 분류 목록 (Spring Cache)',
        method: 'GET',
        url: '/api/admin/bom-categories/all',
        type: 'READ',
        description: '자재 분류 3계층 트리 캐싱 검증'
    },
    {
        id: 'audit_templates',
        domain: '제조사 평가',
        name: '제조사 평가 템플릿 목록',
        method: 'GET',
        url: '/api/audit-templates',
        type: 'READ',
        description: '@BatchSize(50) 및 @Cacheable 응답'
    },

    // --- 2. 감사 로그 쓰기 (POST) ---
    {
        id: 'access_log_write',
        domain: '감사로그',
        name: '화면 이동 감사 로그 저장 (POST)',
        method: 'POST',
        url: '/api/logs/access/page-move',
        payload: { pageName: '시스템 속도 측정 센터', pageUrl: 'systemBenchmark' },
        type: 'WRITE',
        description: '단건 쓰기(INSERT) 트랜잭션 응답 속도'
    },

    // --- 3. 공지사항 샌드박스 CUD 라이프사이클 ---
    {
        id: 'announcement_post',
        domain: '공지사항',
        name: '공지사항 신규 등록 (POST)',
        method: 'POST',
        url: '/api/announcements',
        payload: () => ({
            title: `[BENCHMARK] 속도 측정용 공지_${Date.now()}`,
            content: '성능 벤치마크 테스트 자동 생성 레코드입니다.',
            targetType: 'ALL'
        }),
        type: 'WRITE',
        description: '신규 게시물 등록 DB 트랜잭션 속도',
        onResponse: (res, ctx, cleanupQueue) => {
            if (res.data?.id) {
                ctx.announcementId = res.data.id;
                cleanupQueue.push({ type: 'announcement', id: res.data.id });
            }
        }
    },
    {
        id: 'announcement_put',
        domain: '공지사항',
        name: '공지사항 정보 수정 (PUT)',
        method: 'PUT',
        dynamicUrl: (ctx) => `/api/announcements/${ctx.announcementId || 0}`,
        payload: () => ({
            title: `[BENCHMARK] 속도 측정용 공지 (수정됨)_${Date.now()}`,
            content: '수정 트랜잭션 성능 측정 완료.',
            targetType: 'ALL'
        }),
        type: 'WRITE',
        description: '기존 데이터 변경 Dirty Checking 속도'
    },
    {
        id: 'announcement_delete',
        domain: '공지사항',
        name: '공지사항 소프트 삭제 (DELETE)',
        method: 'DELETE',
        dynamicUrl: (ctx) => `/api/announcements/${ctx.announcementId || 0}`,
        type: 'WRITE',
        description: 'Soft Delete 및 감사 이력 갱신 트랜잭션',
        onResponse: (res, ctx, cleanupQueue) => {
            const idx = cleanupQueue.findIndex(q => q.type === 'announcement' && q.id === ctx.announcementId);
            if (idx !== -1) cleanupQueue.splice(idx, 1);
        }
    },

    // --- 4. 제조사 마스터 샌드박스 CUD 라이프사이클 (Hard Delete 포함) ---
    {
        id: 'manufacturer_post',
        domain: '제조사 마스터',
        name: '제조사 신규 등록 (POST)',
        method: 'POST',
        url: '/api/manufacturers',
        payload: () => ({
            name: `[BENCHMARK] 제조사_${Date.now()}`,
            category: 'OEM',
            description: '속도 측정용 임시 제조사 마스터 데이터'
        }),
        type: 'WRITE',
        description: '마스터 엔티티 생성 트랜잭션 속도',
        onResponse: (res, ctx, cleanupQueue) => {
            if (res.data?.id) {
                ctx.manufacturerId = res.data.id;
                cleanupQueue.push({ type: 'manufacturer', id: res.data.id });
            }
        }
    },
    {
        id: 'manufacturer_put',
        domain: '제조사 마스터',
        name: '제조사 정보 수정 (PUT)',
        method: 'PUT',
        dynamicUrl: (ctx) => `/api/manufacturers/${ctx.manufacturerId || 0}`,
        payload: () => ({
            name: `[BENCHMARK] 제조사_수정됨_${Date.now()}`,
            category: 'OEM',
            description: '수정 트랜잭션 성능 측정 완료.'
        }),
        type: 'WRITE',
        description: '마스터 데이터 갱신 및 캐시 인밸리데이션'
    },
    {
        id: 'manufacturer_delete_hard',
        domain: '제조사 마스터',
        name: '제조사 영구 삭제 클린업 (DELETE)',
        method: 'DELETE',
        dynamicUrl: (ctx) => `/api/manufacturers/${ctx.manufacturerId || 0}/hard`,
        type: 'WRITE',
        description: '물리 삭제(Hard Delete)를 통한 DB 잔류 0% 보장',
        onResponse: (res, ctx, cleanupQueue) => {
            const idx = cleanupQueue.findIndex(q => q.type === 'manufacturer' && q.id === ctx.manufacturerId);
            if (idx !== -1) cleanupQueue.splice(idx, 1);
        }
    }
];

const diagnoseBottleneck = (duration, sizeKb, serverMs, type, method) => {
    if (duration <= 50) {
        return '⚡ 인메모리 캐시 & 인덱스 최적 (0ms급)';
    }
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (serverMs !== null && serverMs > 200) {
            return `⚠️ DB 쓰기 트랜잭션/락 대기 지연 (서버: ${serverMs}ms)`;
        }
        return `✍️ DB CUD 트랜잭션 정상 반영 (RTT: ${duration}ms, 서버: ${serverMs || '-'}ms)`;
    }
    if (sizeKb > 250 && duration > 120) {
        return `📦 페이로드 비대 (${sizeKb}KB - 필드/페이징 축소 권장)`;
    }
    if (serverMs !== null && serverMs > 150) {
        return `⚠️ 백엔드 DB 쿼리/N+1 지연 의심 (서버 처리: ${serverMs}ms)`;
    }
    if (serverMs !== null && duration - serverMs > 150) {
        return `🌐 해외 리전 물리적 네트워크 RTT 지연 (순수 네트워크: ${duration - serverMs}ms)`;
    }
    if (duration > 200) {
        return '🔴 지연 발생 (DB 인덱스 및 네트워크 병목 점검 필요)';
    }
    return '✅ 양호한 정상 응답 속도';
};

const emergencyCleanup = async (queue) => {
    for (const item of queue) {
        try {
            if (item.type === 'announcement' && item.id) {
                await api.delete(`/api/announcements/${item.id}`, { skipLoading: true, skipToast: true });
            } else if (item.type === 'manufacturer' && item.id) {
                await api.delete(`/api/manufacturers/${item.id}/hard`, { skipLoading: true, skipToast: true });
            }
        } catch (e) {
            console.debug('[Benchmark] Emergency cleanup item skipped or already cleaned:', item);
        }
    }
};

const SystemBenchmarkPage = () => {
    const [results, setResults] = useState([]);
    const [prevResults, setPrevResults] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('qms_benchmark_history') || '[]');
        } catch {
            return [];
        }
    });
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTestingId, setCurrentTestingId] = useState(null);
    const [filterGrade, setFilterGrade] = useState('ALL'); // ALL, OPTIMAL, GOOD, SLOW
    const [filterMethod, setFilterMethod] = useState('ALL'); // ALL, GET, POST, PUT, DELETE
    const [searchTerm, setSearchTerm] = useState('');
    const [bypassCache, setBypassCache] = useState(false);

    const prevMap = useMemo(() => {
        const map = {};
        prevResults.forEach(r => { map[r.id] = r.duration; });
        return map;
    }, [prevResults]);

    const runSingleTest = async (target, context = {}, cleanupQueue = []) => {
        const url = target.dynamicUrl ? await target.dynamicUrl(context) : target.url;
        const t0 = performance.now();
        let status = 0;
        let sizeKb = 0;
        let serverMs = null;

        try {
            let response;
            const payload = typeof target.payload === 'function' ? target.payload(context) : target.payload;

            if (target.method === 'POST') {
                response = await api.post(url, payload || {}, { skipLoading: true, skipToast: true });
            } else if (target.method === 'PUT') {
                response = await api.put(url, payload || {}, { skipLoading: true, skipToast: true });
            } else if (target.method === 'DELETE') {
                response = await api.delete(url, { skipLoading: true, skipToast: true });
            } else {
                const separator = url.includes('?') ? '&' : '?';
                const finalUrl = bypassCache ? `${url}${separator}_t=${Date.now()}` : url;
                response = await api.get(finalUrl, { skipLoading: true, skipToast: true, skipCache: bypassCache });
            }

            const t1 = performance.now();
            const totalDuration = Math.round(t1 - t0);
            status = response.status;

            if (target.onResponse) {
                target.onResponse(response, context, cleanupQueue);
            }

            try {
                const str = JSON.stringify(response.data || '');
                sizeKb = (str.length / 1024).toFixed(1);
            } catch {
                sizeKb = '0.0';
            }

            const headers = response.headers || {};
            const serverHeader = headers['x-response-time-millis'] || headers['X-Response-Time-Millis'];
            if (serverHeader) {
                serverMs = parseInt(serverHeader, 10);
            }

            const durationVal = Math.max(1, totalDuration);
            const numSize = parseFloat(sizeKb);

            return {
                ...target,
                actualUrl: url,
                duration: durationVal,
                serverMs,
                networkMs: serverMs !== null ? Math.max(0, durationVal - serverMs) : null,
                sizeKb: numSize,
                status,
                success: true,
                grade: durationVal <= 50 ? 'OPTIMAL' : durationVal <= 200 ? 'GOOD' : 'SLOW',
                diagnosis: diagnoseBottleneck(durationVal, numSize, serverMs, target.type, target.method),
                testedAt: new Date().toLocaleTimeString()
            };
        } catch (err) {
            const t1 = performance.now();
            const dur = Math.max(1, Math.round(t1 - t0));
            return {
                ...target,
                actualUrl: url,
                duration: dur,
                serverMs: null,
                networkMs: null,
                sizeKb: 0,
                status: err.response?.status || 500,
                success: false,
                errorMsg: err.response?.data?.message || err.message || 'Error',
                grade: 'ERROR',
                diagnosis: `❌ 통신 실패 (${err.response?.status || 'Network Error'})`,
                testedAt: new Date().toLocaleTimeString()
            };
        }
    };

    const runBenchmarkMode = async (mode = 'ALL') => {
        if (isRunning) return;
        setIsRunning(true);
        setProgress(0);

        if (results.length > 0) {
            setPrevResults(results);
            sessionStorage.setItem('qms_benchmark_history', JSON.stringify(results));
        }

        const targetsToRun = mode === 'GET' 
            ? BENCHMARK_TARGETS.filter(t => t.method === 'GET')
            : mode === 'CUD' 
                ? BENCHMARK_TARGETS.filter(t => t.method !== 'GET')
                : BENCHMARK_TARGETS;

        const context = {};
        const cleanupQueue = [];
        const newResultsMap = new Map(results.map(r => [r.id, r]));

        try {
            for (let i = 0; i < targetsToRun.length; i++) {
                const target = targetsToRun[i];
                setCurrentTestingId(target.id);
                const res = await runSingleTest(target, context, cleanupQueue);
                newResultsMap.set(target.id, res);
                setResults(Array.from(newResultsMap.values()));
                setProgress(Math.round(((i + 1) / targetsToRun.length) * 100));
            }
        } finally {
            if (cleanupQueue.length > 0) {
                await emergencyCleanup(cleanupQueue);
            }
            setCurrentTestingId(null);
            setIsRunning(false);
            const modeName = mode === 'GET' ? '조회(GET)' : mode === 'CUD' ? '등록/수정/삭제(CUD)' : '전체';
            toast.success(`⚡ [${modeName}] ${targetsToRun.length}개 API 속도 측정이 완료되었습니다!`);
        }
    };

    const retestItem = async (targetId) => {
        const target = BENCHMARK_TARGETS.find(t => t.id === targetId);
        if (!target) return;
        setCurrentTestingId(targetId);
        const context = {};
        const cleanupQueue = [];
        try {
            const res = await runSingleTest(target, context, cleanupQueue);
            setResults(prev => prev.map(item => item.id === targetId ? res : item));
            toast.info(`[${target.name}] 재측정 완료: ${res.duration}ms`);
        } finally {
            if (cleanupQueue.length > 0) {
                await emergencyCleanup(cleanupQueue);
            }
            setCurrentTestingId(null);
        }
    };

    // 통계 계산
    const stats = useMemo(() => {
        if (!results || results.length === 0) {
            return { avg: 0, fastest: null, slowest: null, optimalCount: 0, goodCount: 0, slowCount: 0 };
        }
        const valid = results.filter(r => r.success);
        if (valid.length === 0) {
            return { avg: 0, fastest: null, slowest: null, optimalCount: 0, goodCount: 0, slowCount: 0 };
        }
        const total = valid.reduce((acc, r) => acc + r.duration, 0);
        const sorted = [...valid].sort((a, b) => a.duration - b.duration);
        const optimal = valid.filter(r => r.grade === 'OPTIMAL').length;
        const good = valid.filter(r => r.grade === 'GOOD').length;
        const slow = valid.filter(r => r.grade === 'SLOW' || r.grade === 'ERROR').length;

        return {
            avg: Math.round(total / valid.length),
            fastest: sorted[0],
            slowest: sorted[sorted.length - 1],
            optimalCount: optimal,
            goodCount: good,
            slowCount: slow,
            count: valid.length
        };
    }, [results]);

    const filteredList = useMemo(() => {
        return results.filter(item => {
            const matchGrade = filterGrade === 'ALL' || item.grade === filterGrade;
            const matchMethod = filterMethod === 'ALL' || item.method === filterMethod;
            const matchSearch = !searchTerm ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.url.toLowerCase().includes(searchTerm.toLowerCase());
            return matchGrade && matchMethod && matchSearch;
        });
    }, [results, filterGrade, filterMethod, searchTerm]);

    const copyMarkdownTable = () => {
        if (results.length === 0) {
            toast.warn('복사할 측정 결과가 없습니다. 먼저 측정을 실행해주세요.');
            return;
        }
        let md = `| 도메인 | API 명칭 | 메서드 | 엔드포인트 | 응답 시간 | 서버 시간 | 크기 | 상태 | 병목 진단 |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        results.forEach(r => {
            md += `| ${r.domain} | ${r.name} | ${r.method} | \`${r.actualUrl || r.url}\` | **${r.duration}ms** | ${r.serverMs ? r.serverMs + 'ms' : '-'} | ${r.sizeKb}KB | ${r.grade} | ${r.diagnosis} |\n`;
        });
        navigator.clipboard.writeText(md);
        toast.success('📋 마크다운 테이블이 클립보드에 복사되었습니다.');
    };

    const downloadCsv = () => {
        if (results.length === 0) {
            toast.warn('다운로드할 결과가 없습니다.');
            return;
        }
        let csv = '\uFEFF도메인,API명칭,메서드,URL,응답시간(ms),서버시간(ms),데이터크기(KB),등급,진단결과\n';
        results.forEach(r => {
            csv += `"${r.domain}","${r.name}","${r.method}","${r.actualUrl || r.url}",${r.duration},${r.serverMs || ''},${r.sizeKb},"${r.grade}","${r.diagnosis}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `시스템속도측정_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('📥 CSV 다운로드가 완료되었습니다.');
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
            {/* 상단 헤더 */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '16px',
                padding: '28px 32px',
                color: '#fff',
                marginBottom: '24px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '28px' }}>⚡</span>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>시스템 속도 측정 및 병목 진단 센터</h1>
                            <span style={{
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '12px'
                            }}>
                                QMS PRO PERFORMANCE
                            </span>
                        </div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: 1.5 }}>
                            시스템 전 화면의 실제 조회(GET) 및 등록(POST)·수정(PUT)·삭제(DELETE) 왕복 응답시간(RTT)과 서버 시간을 정밀 측정하여
                            성능 개선 효과를 검증하고 병목 후보를 자동 진단합니다.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#cbd5e1',
                            fontSize: '13px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <input
                                type="checkbox"
                                checked={bypassCache}
                                onChange={e => setBypassCache(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            캐시 우회 (DB 원천 쿼리 강제)
                        </label>

                        <button
                            onClick={() => runBenchmarkMode('GET')}
                            disabled={isRunning}
                            style={{
                                backgroundColor: isRunning ? '#64748b' : '#0284c7',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            🔍 조회(GET) 측정
                        </button>

                        <button
                            onClick={() => runBenchmarkMode('CUD')}
                            disabled={isRunning}
                            style={{
                                backgroundColor: isRunning ? '#64748b' : '#059669',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            ✍️ CUD(등록/수정/삭제) 측정
                        </button>

                        <button
                            onClick={() => runBenchmarkMode('ALL')}
                            disabled={isRunning}
                            style={{
                                backgroundColor: isRunning ? '#64748b' : '#2563eb',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isRunning ? (
                                <>
                                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                    측정 진행 중 ({progress}%)
                                </>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    전체 속도 측정 시작
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 프로그레스 바 */}
                {isRunning && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                            <span>측정 진행 중...</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                backgroundColor: '#38bdf8',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                )}
            </div>

            {/* 4대 KPI 요약 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>⏱️ 평균 왕복 응답시간 (RTT)</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 800, color: stats.avg <= 50 ? '#10b981' : stats.avg <= 200 ? '#f59e0b' : '#ef4444' }}>
                            {stats.avg}
                        </span>
                        <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>ms</span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: stats.avg <= 50 ? '#d1fae5' : stats.avg <= 200 ? '#fef3c7' : '#fee2e2',
                            color: stats.avg <= 50 ? '#065f46' : stats.avg <= 200 ? '#92400e' : '#991b1b',
                            marginLeft: 'auto'
                        }}>
                            {stats.avg <= 50 ? '🟢 최적 (0ms급)' : stats.avg <= 200 ? '🟡 양호' : '🔴 점검 필요'}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        측정 대상 {results.length}개 API 기준
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>🚀 최고 속도 API</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>
                            {stats.fastest ? stats.fastest.duration : 0}
                        </span>
                        <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>ms</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stats.fastest ? `[${stats.fastest.domain}] ${stats.fastest.name}` : '측정 대기 중'}
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>⚠️ 최대 지연 / 병목 후보</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 800, color: (stats.slowest?.duration || 0) > 200 ? '#ef4444' : '#f59e0b' }}>
                            {stats.slowest ? stats.slowest.duration : 0}
                        </span>
                        <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>ms</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stats.slowest ? `[${stats.slowest.domain}] ${stats.slowest.name}` : '측정 대기 중'}
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>📊 속도 분포 현황</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>최적: {stats.optimalCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>양호: {stats.goodCount}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>지연: {stats.slowCount}</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                        기준: 최적(&lt;50ms) / 양호(50~200ms) / 지연(&gt;200ms)
                    </div>
                </div>
            </div>

            {/* 필터 및 액션 툴바 */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px 12px 0 0',
                padding: '16px 20px',
                border: '1px solid #e2e8f0',
                borderBottom: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* 등급 필터 */}
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
                        {[
                            { key: 'ALL', label: '전체 등급' },
                            { key: 'OPTIMAL', label: '🟢 최적 (<50ms)' },
                            { key: 'GOOD', label: '🟡 양호 (50~200ms)' },
                            { key: 'SLOW', label: '🔴 병목 주의 (>200ms)' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilterGrade(tab.key)}
                                style={{
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: filterGrade === tab.key ? 700 : 500,
                                    backgroundColor: filterGrade === tab.key ? '#fff' : 'transparent',
                                    color: filterGrade === tab.key ? '#1e293b' : '#64748b',
                                    cursor: 'pointer',
                                    boxShadow: filterGrade === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 메서드 필터 */}
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
                        {[
                            { key: 'ALL', label: '전체 메서드' },
                            { key: 'GET', label: 'GET (조회)' },
                            { key: 'POST', label: 'POST (등록)' },
                            { key: 'PUT', label: 'PUT (수정)' },
                            { key: 'DELETE', label: 'DELETE (삭제)' }
                        ].map(m => (
                            <button
                                key={m.key}
                                onClick={() => setFilterMethod(m.key)}
                                style={{
                                    border: 'none',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: filterMethod === m.key ? 700 : 500,
                                    backgroundColor: filterMethod === m.key ? '#fff' : 'transparent',
                                    color: filterMethod === m.key ? '#1e293b' : '#64748b',
                                    cursor: 'pointer',
                                    boxShadow: filterMethod === m.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder="🔍 API명 / 도메인 / URL 검색..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            minWidth: '200px',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={copyMarkdownTable}
                        style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        📋 마크다운 복사
                    </button>
                    <button
                        onClick={downloadCsv}
                        style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        📥 CSV 내보내기
                    </button>
                </div>
            </div>

            {/* 결과 테이블 */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0 0 12px 12px',
                border: '1px solid #e2e8f0',
                overflowX: 'auto',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                            <th style={{ padding: '12px 16px', width: '50px' }}>No</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>도메인</th>
                            <th style={{ padding: '12px 16px' }}>테스트 API 명칭</th>
                            <th style={{ padding: '12px 16px', width: '70px' }}>메서드</th>
                            <th style={{ padding: '12px 16px', width: '130px' }}>응답시간 (RTT)</th>
                            <th style={{ padding: '12px 16px', width: '90px' }}>서버 시간</th>
                            <th style={{ padding: '12px 16px', width: '90px' }}>페이로드</th>
                            <th style={{ padding: '12px 16px', width: '90px' }}>성능 등급</th>
                            <th style={{ padding: '12px 16px' }}>지능형 병목 진단 결과</th>
                            <th style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>재측정</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    {results.length === 0 ? (
                                        <div>
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
                                            <div style={{ fontWeight: 600, fontSize: '15px', color: '#475569' }}>
                                                상단의 [전체 속도 측정 시작] 버튼을 클릭하여 측정을 시작하세요.
                                            </div>
                                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                18개 핵심 도메인 API의 실제 네트워크(RTT), 서버 처리시간, CUD 트랜잭션 성능이 실시간 진단됩니다.
                                            </div>
                                        </div>
                                    ) : (
                                        '조건에 부합하는 측정 결과가 없습니다.'
                                    )}
                                </td>
                            </tr>
                        ) : (
                            filteredList.map((item, idx) => {
                                const isTestingThis = currentTestingId === item.id;
                                const prevDuration = prevMap[item.id];
                                const diff = prevDuration !== undefined ? item.duration - prevDuration : null;

                                return (
                                    <tr
                                        key={item.id}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            backgroundColor: isTestingThis ? '#f0fdf4' : 'transparent',
                                            transition: 'background-color 0.15s'
                                        }}
                                    >
                                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                backgroundColor: '#f1f5f9',
                                                color: '#475569',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600
                                            }}>
                                                {item.domain}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                                                {item.actualUrl || item.url}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                fontWeight: 700,
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: item.method === 'GET' ? '#e0f2fe' : item.method === 'POST' ? '#dcfce7' : item.method === 'PUT' ? '#fef3c7' : '#ffe4e6',
                                                color: item.method === 'GET' ? '#0369a1' : item.method === 'POST' ? '#15803d' : item.method === 'PUT' ? '#b45309' : '#be123c',
                                                border: `1px solid ${item.method === 'GET' ? '#bae6fd' : item.method === 'POST' ? '#bbf7d0' : item.method === 'PUT' ? '#fde68a' : '#fecdd3'}`
                                            }}>
                                                {item.method}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '15px',
                                                    fontWeight: 800,
                                                    color: item.duration <= 50 ? '#10b981' : item.duration <= 200 ? '#d97706' : '#ef4444'
                                                }}>
                                                    {item.duration}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>ms</span>

                                                {diff !== null && diff !== 0 && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        color: diff < 0 ? '#10b981' : '#ef4444',
                                                        marginLeft: '4px'
                                                    }}>
                                                        {diff < 0 ? `▼${Math.abs(diff)}ms` : `▲+${diff}ms`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                                            {item.serverMs !== null ? `${item.serverMs}ms` : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                                            {item.sizeKb} KB
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                backgroundColor:
                                                    item.grade === 'OPTIMAL' ? '#d1fae5' :
                                                    item.grade === 'GOOD' ? '#fef3c7' :
                                                    item.grade === 'SLOW' ? '#fee2e2' : '#fecaca',
                                                color:
                                                    item.grade === 'OPTIMAL' ? '#065f46' :
                                                    item.grade === 'GOOD' ? '#92400e' :
                                                    item.grade === 'SLOW' ? '#991b1b' : '#b91c1c'
                                            }}>
                                                {item.grade === 'OPTIMAL' ? '🟢 최적' :
                                                 item.grade === 'GOOD' ? '🟡 양호' :
                                                 item.grade === 'SLOW' ? '🔴 지연' : '❌ 오류'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#334155', fontSize: '12px' }}>
                                            {item.diagnosis}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => retestItem(item.id)}
                                                disabled={isRunning || isTestingThis}
                                                style={{
                                                    backgroundColor: '#f8fafc',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: '#475569',
                                                    cursor: (isRunning || isTestingThis) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isTestingThis ? '측정중' : '재측정'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* QMS 개발 마스터 헌법 가이드 */}
            <div style={{
                marginTop: '24px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '20px 24px',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📜</span> QMS 시스템 헌법 제8조: 전 화면 속도 최적화 기본 강제 원칙 (Performance-First)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                    <div>
                        <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>⚡ 조회 속도 극대화 (Read Performance)</div>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            <li><strong>N+1 쿼리 원천 차단</strong>: 연관 관계는 <code>@EntityGraph</code>, <code>LEFT JOIN FETCH</code>, <code>@BatchSize(50)</code> 필수 적용</li>
                            <li><strong>3계층 캐싱</strong>: 기준정보(채널, 템플릿, 카테고리)는 Spring Cache로 DB I/O 0회(0ms) 유지</li>
                            <li><strong>네트워크 중복 제거</strong>: 동일 GET 동시 호출 시 <code>inFlightGetRequests</code> 병합</li>
                        </ul>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>💾 저장 속도 & UX 극대화 (Write & UX)</div>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            <li><strong>일괄 배치 저장 (Batch API)</strong>: 루프 개별 호출을 금지하고 단일 Batch API(<code>saveAll</code>)로 1회 트랜잭션 통합</li>
                            <li><strong>스마트 변경 감지 (Dirty Checking)</strong>: 수정 항목이 없을 때 불필요한 저장 팝업 생략 및 즉시 처리</li>
                            <li><strong>비동기 백그라운드 I/O</strong>: 원격 DB 파일 백업, 외부 연동은 별도 스레드풀로 비동기 분리</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemBenchmarkPage;
