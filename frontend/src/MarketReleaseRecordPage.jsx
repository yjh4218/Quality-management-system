import React, { useState, useEffect, useRef } from 'react';
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
            const response = await api.get(`/quality/inbound/release-record?date=${releaseDate}`);
            setRecords(response.data || []);
        } catch (e) {
            alert("데이터를 불러오는데 실패했습니다.");
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

    // Pad records to minimum 27 rows
    const displayRecords = [...records];
    while(displayRecords.length < 27) {
        displayRecords.push({}); // empty row
    }

    return (
        <div className="card" style={{ backgroundColor: '#f4f6f8' }}>
            {/* Control Bar (hidden on print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>📄 시장출하 적부판정 기록</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>적부판정일 기준</label>
                        <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' }} />
                        <button onClick={fetchRecords} className="primary" style={{ padding: '8px 24px', whiteSpace: 'nowrap' }}>조회</button>
                    </div>
                </div>
                <button onClick={handlePrint} className="primary" style={{ padding: '8px 24px', backgroundColor: '#28a745', border: 'none', whiteSpace: 'nowrap' }}>🖨️ 양식 인쇄</button>
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
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.quantity ? r.quantity.toLocaleString() : ''}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.finalInspectionResult || ''}</td>
                                <td style={{ border: '1px solid #000', padding: '2px' }}>{r.qualityDecisionDate || ''}</td>
                                <td style={{ border: '1px solid #000', padding: '2px', wordBreak: 'break-all' }}>{r.testReportNumbers || ''}</td>
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
