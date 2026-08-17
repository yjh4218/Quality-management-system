import React, { useState, useMemo, useEffect, useRef } from 'react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import NumericFormattedInput from './components/common/NumericFormattedInput';
import PackagingViewer3D from './components/PackagingViewer3D';
import {
  check4Pin,
  check8Pin,
  checkNPin,
  check6,
  check8Grid,
  checkNGrid,
  checkBrick,
  checkGuillotine,
  getPIValues
} from './utils/packingCalculator';
import { toast } from 'react-toastify';

// ── 기본 규격 한도 프리셋 ──
const DEFAULT_LIMITS_LIST = [
  {
    id: 'standard',
    name: '일반 (W460 / D600 / H400 mm)',
    wMax: 460,
    dMax: 600,
    hMax: 400,
    maxWeight: 12.0,
    me: 130,
    isDefault: true,
    desc: '국내 일반 물류 및 표준 수출 규격 (가로≤460mm, 세로≤600mm, 높이≤400mm, 12kg)'
  },
  {
    id: 'oyus',
    name: '올리브영 / 미국향 (W300 / D460 / H380 mm)',
    wMax: 300,
    dMax: 460,
    hMax: 380,
    maxWeight: 12.0,
    me: 130,
    isDefault: true,
    desc: '올리브영 및 미국 주요 유통사 입고 규격 (가로≤300mm, 세로≤460mm, 높이≤380mm, 12kg)'
  },
  {
    id: 'coupang',
    name: '쿠팡 로켓 / 풀필먼트 (W400 / D500 / H400 mm)',
    wMax: 400,
    dMax: 500,
    hMax: 400,
    maxWeight: 15.0,
    me: 140,
    isDefault: true,
    desc: '쿠팡 밀크런 및 로켓 물류센터 입고 규격 (가로≤400mm, 세로≤500mm, 높이≤400mm, 15kg)'
  },
  {
    id: 'eu',
    name: '유럽 수출 규격 (W400 / D600 / H350 mm)',
    wMax: 400,
    dMax: 600,
    hMax: 350,
    maxWeight: 12.0,
    me: 130,
    isDefault: true,
    desc: '유럽 팔레트(1,200×800mm) 최적화 적재 규격 (가로≤400mm, 세로≤600mm, 높이≤350mm, 12kg)'
  }
];

const DEFAULT_INBOX_LIMITS = {
  wMax: 300,
  dMax: 300,
  hMax: 400,
  maxWeight: 5.0
};

const DEFAULT_GAPS = {
  outbox: { w: 26, d: 26, h: 26 },
  inbox: { w: 17, d: 17, h: 17 }
};

// ── 패턴 대분류 및 세부 방수 정의 ──
const PATTERN_CATEGORIES = [
  {
    id: 'pinwheel',
    name: '🎡 핀휠 (Pinwheel)',
    subKeys: [
      { id: '4pin', label: '4방 핀휠', count: 4 },
      { id: '8pin', label: '8방 핀휠 (표준 📌)', count: 8, isDefault: true },
      { id: '12pin', label: '12방 핀휠', count: 12 },
      { id: '16pin', label: '16방 핀휠', count: 16 },
      { id: '20pin', label: '20방 핀휠', count: 20 },
      { id: '24pin', label: '24방 핀휠', count: 24 }
    ]
  },
  {
    id: 'grid',
    name: '⊞ 격자형 (Grid)',
    subKeys: [
      { id: '6grid', label: '6방 격자', count: 6 },
      { id: '8grid', label: '8방 격자', count: 8 },
      { id: '12grid', label: '12방 격자', count: 12 },
      { id: '16grid', label: '16방 격자', count: 16 },
      { id: '20grid', label: '20방 격자', count: 20 },
      { id: '24grid', label: '24방 격자', count: 24 }
    ]
  },
  {
    id: 'brick',
    name: '🧱 벽돌형 (Brick)',
    subKeys: [
      { id: 'brick', label: '벽돌형 엇갈림 배치', count: null }
    ]
  },
  {
    id: 'mix',
    name: '🔀 혼합 (Mix / 길로틴)',
    subKeys: [
      { id: 'mix', label: '혼합 최적 분할배치', count: null }
    ]
  }
];

/**
 * 2D SVG 배치도 렌더러 (QMS 블루 테마)
 */
const Pallet2DTopView = ({ pattern, palletW = 1100, palletD = 1100 }) => {
  if (!pattern || !pattern.positions || !pattern.positions.length) {
    return (
      <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '11px', color: '#94a3b8' }}>
        배치도 정보 없음
      </div>
    );
  }

  const svgSize = 220;
  const padding = 10;
  const scale = (svgSize - padding * 2) / Math.max(palletW, palletD);
  const palDrawW = palletW * scale;
  const palDrawD = palletD * scale;

  const minX = Math.min(...pattern.positions.map(p => p[0]));
  const minZ = Math.min(...pattern.positions.map(p => p[1]));
  const maxX = Math.max(...pattern.positions.map(p => p[0] + p[2]));
  const maxZ = Math.max(...pattern.positions.map(p => p[1] + p[3]));
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const offsetX = (palletW - spanX) / 2 * scale;
  const offsetY = (palletD - spanZ) / 2 * scale;

  return (
    <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '10px', display: 'inline-block', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px', textAlign: 'center' }}>
        📐 1단 평면 배치도
      </div>
      <svg width={svgSize} height={svgSize} style={{ background: '#f8fafc', borderRadius: '6px' }}>
        {/* 팔레트 베이스 테두리 */}
        <rect
          x={padding}
          y={padding}
          width={palDrawW}
          height={palDrawD}
          fill="#f1f5f9"
          stroke="#2563eb"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        {/* 아웃박스 박스들 (QMS 블루 테마) */}
        {pattern.positions.map((pos, idx) => {
          const [bx, by, bw, bd] = pos;
          const x = padding + offsetX + (bx - minX) * scale;
          const y = padding + offsetY + (by - minZ) * scale;
          const w = bw * scale;
          const h = bd * scale;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.5"
                rx="2"
                opacity="0.92"
              />
              <text
                x={x + w / 2}
                y={y + h / 2 + 4}
                textAnchor="middle"
                fontSize={Math.max(9, Math.min(13, w / 3))}
                fontWeight="800"
                fill="#ffffff"
              >
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', marginTop: '6px', fontWeight: 600 }}>
        점유: <strong>{pattern.maxX?.toLocaleString()} × {pattern.maxY?.toLocaleString()} mm</strong>
      </div>
    </div>
  );
};

/**
 * 📦 QMS 엔터프라이즈 아웃박스 규격 및 팔레트 적재 계산기
 */
const OutboxSpecCalculatorPage = ({ user, onNavigate }) => {
  const resultRef = useRef(null);

  // ── 상단 탭 ('calc' | 'settings') ──
  const [activeMainTab, setActiveMainTab] = useState('calc');

  // ── 설정 저장소 (localStorage) ──
  const [limitsList, setLimitsList] = useState(() => {
    try {
      const saved = localStorage.getItem('outbox_calc_limits_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LIMITS_LIST;
  });

  const [inboxLimits, setInboxLimits] = useState(() => {
    try {
      const saved = localStorage.getItem('outbox_calc_inbox_limits');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_INBOX_LIMITS;
  });

  const [defaultGaps, setDefaultGaps] = useState(() => {
    try {
      const saved = localStorage.getItem('outbox_calc_gaps');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_GAPS;
  });

  // ── 1. 단상자 정보 (Card 1) ──
  const [unitBox, setUnitBox] = useState({
    w: 70.5,
    d: 40.5,
    h: 141,
    weight: 100 // g
  });

  const [hasPop, setHasPop] = useState(false);
  const [popHeight, setPopHeight] = useState(15);
  const [useCustomH, setUseCustomH] = useState(false);
  const [customHVal, setCustomHVal] = useState(141);

  // 아웃박스 높이 입수 (단상자 몇 단: 1~15)
  const [outboxLayers, setOutboxLayers] = useState(1);
  const [customOutboxLayers, setCustomOutboxLayers] = useState('');

  // 채널 선택 & 아웃박스 여유공간
  const [selectedLimitId, setSelectedLimitId] = useState('standard');
  const [outboxGap, setOutboxGap] = useState({ w: 26, d: 26, h: 26 });

  // POP 적용 시 단수 1단 강제 고정
  useEffect(() => {
    if (hasPop) {
      setOutboxLayers(1);
      setCustomOutboxLayers('');
    }
  }, [hasPop]);

  // ── 2. 인박스 (INNER BOX) 설정 (Card 2) ──
  const [useInbox, setUseInbox] = useState(false);
  const [inboxQtyFixed, setInboxQtyFixed] = useState('');
  const [inboxMaxInOb, setInboxMaxInOb] = useState(6);
  const [inboxGap, setInboxGap] = useState({ w: 17, d: 17, h: 17 });
  const [inboxLayers, setInboxLayers] = useState(1);
  const [customInboxLayers, setCustomInboxLayers] = useState('');

  // ── 3. 팔레트 규격 (Card 3) ──
  const [palletPreset, setPalletPreset] = useState('kr'); // 'kr' | 'global' | 'eu'
  const [palletSpec, setPalletSpec] = useState({ w: 1100, d: 1100 });
  const [palletMaxHeightLimit, setPalletMaxHeightLimit] = useState(1500); // 1500, 1050, custom
  const [customPalletHeight, setCustomPalletHeight] = useState('');

  // ── 4. 산출 실행 상태 ──
  const [isCalculated, setIsCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);

  // ── 5. 결과 화면 상태 ──
  const [activeCategoryTab, setActiveCategoryTab] = useState('pinwheel');
  const [activeSubPatternKey, setActiveSubPatternKey] = useState('8pin');
  const [selectedProposalIdx, setSelectedProposalIdx] = useState(0);
  const [isAlternativeProposal, setIsAlternativeProposal] = useState(false);
  const [viewerMode, setViewerMode] = useState('pallet-cross');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // 현재 선택된 활성 한도
  const activeLimit = useMemo(() => {
    const found = limitsList.find(l => l.id === selectedLimitId);
    return found || limitsList[0] || DEFAULT_LIMITS_LIST[0];
  }, [selectedLimitId, limitsList]);

  // 실효 높이 (단상자 높이 + POP)
  const effHeight = useMemo(() => {
    const baseH = useCustomH ? (Number(customHVal) || unitBox.h) : unitBox.h;
    const popH = hasPop ? (Number(popHeight) || 15) : 0;
    return baseH + popH;
  }, [unitBox.h, useCustomH, customHVal, hasPop, popHeight]);

  // 실효 아웃박스 단수
  const effectiveOutboxLayers = useMemo(() => {
    if (hasPop) return 1;
    if (customOutboxLayers && Number(customOutboxLayers) > 0) {
      return Math.min(15, Math.max(1, Number(customOutboxLayers)));
    }
    return outboxLayers;
  }, [hasPop, outboxLayers, customOutboxLayers]);

  // 실효 인박스 단수
  const effectiveInboxLayers = useMemo(() => {
    if (customInboxLayers && Number(customInboxLayers) > 0) {
      return Math.min(15, Math.max(1, Number(customInboxLayers)));
    }
    return inboxLayers;
  }, [inboxLayers, customInboxLayers]);

  // 팔레트 프리셋 변경
  const handleSelectPallet = (type) => {
    setPalletPreset(type);
    if (type === 'kr') setPalletSpec({ w: 1100, d: 1100 });
    else if (type === 'global') setPalletSpec({ w: 1200, d: 1000 });
    else if (type === 'eu') setPalletSpec({ w: 1200, d: 800 });
  };

  // 대분류 탭 전환
  const handleCategoryChange = (catId) => {
    setActiveCategoryTab(catId);
    const cat = PATTERN_CATEGORIES.find(c => c.id === catId);
    if (cat && cat.subKeys.length > 0) {
      const defaultSub = cat.subKeys.find(s => s.isDefault) || cat.subKeys[0];
      setActiveSubPatternKey(defaultSub.id);
    }
    setSelectedProposalIdx(0);
    setIsAlternativeProposal(false);
  };

  // ── 메인 계산 알고리즘 실행 ──
  const handleCalculate = () => {
    const { w: uw, d: ud, weight: uwt } = unitBox;
    const effH = effHeight;
    const gapW = Number(outboxGap.w) || 26;
    const gapD = Number(outboxGap.d) || 26;
    const gapH = Number(outboxGap.h) || 26;
    const az = effectiveOutboxLayers;
    const lim = activeLimit;
    const palW = palletSpec.w;
    const palD = palletSpec.d;

    if (!uw || !ud || !effH || !uwt) {
      toast.error('단상자 정보(가로/세로/높이/무게)를 모두 입력해주세요.');
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      try {
        const checkers = {
          '4pin': (bw, bd) => check4Pin(bw, bd, palW, palD),
          '8pin': (bw, bd) => check8Pin(bw, bd, palW, palD),
          '12pin': (bw, bd) => checkNPin(bw, bd, 12, palW, palD),
          '16pin': (bw, bd) => checkNPin(bw, bd, 16, palW, palD),
          '20pin': (bw, bd) => checkNPin(bw, bd, 20, palW, palD),
          '24pin': (bw, bd) => checkNPin(bw, bd, 24, palW, palD),
          '6grid': (bw, bd) => check6(bw, bd, palW, palD),
          '8grid': (bw, bd) => check8Grid(bw, bd, palW, palD),
          '12grid': (bw, bd) => checkNGrid(bw, bd, 12, palW, palD),
          '16grid': (bw, bd) => checkNGrid(bw, bd, 16, palW, palD),
          '20grid': (bw, bd) => checkNGrid(bw, bd, 20, palW, palD),
          '24grid': (bw, bd) => checkNGrid(bw, bd, 24, palW, palD),
          'brick': (bw, bd) => checkBrick(bw, bd, palW, palD),
          'mix': (bw, bd) => checkGuillotine(bw, bd, palW, palD)
        };

        const allKeys = Object.keys(checkers);
        const B = {};
        allKeys.forEach(k => {
          B[k] = { standardProposals: {}, alternativeProposals: {} };
        });

        if (useInbox) {
          // 인박스 모드 계산
          const ibGapW = Number(inboxGap.w) || 17;
          const ibGapD = Number(inboxGap.d) || 17;
          const ibGapH = Number(inboxGap.h) || 17;
          const maxIbInOb = Number(inboxMaxInOb) || 6;
          const minIbInOb = 2;
          const ibFixedQty = Number(inboxQtyFixed) || 0;
          const selIbL = effectiveInboxLayers;

          const candidates = [];
          if (ibFixedQty > 0) {
            if (ibFixedQty % selIbL === 0) {
              const planar = ibFixedQty / selIbL;
              for (let r = 1; r <= planar; r++) {
                if (planar % r !== 0) continue;
                const c = planar / r;
                for (const [w, d, rot] of [[uw, ud, false], [ud, uw, true]]) {
                  const ibw = Math.round(c * w + ibGapW);
                  const ibd = Math.round(r * d + ibGapD);
                  if (ibw <= inboxLimits.wMax && ibd <= inboxLimits.dMax) {
                    const ibH = Math.round(selIbL * effH + ibGapH);
                    candidates.push({
                      ibw, ibd, cols: c, rows: r, rot, l: selIbL,
                      ibQtyPer: ibFixedQty, ibH,
                      pairs: ibw === ibd ? [[ibw, ibd]] : [[ibw, ibd], [ibd, ibw]]
                    });
                  }
                }
              }
            }
          } else {
            for (let r = 1; r <= 8; r++) {
              for (let c = 1; c <= 8; c++) {
                for (const [w, d, rot] of [[uw, ud, false], [ud, uw, true]]) {
                  const ibw = Math.round(c * w + ibGapW);
                  const ibd = Math.round(r * d + ibGapD);
                  if (ibw <= inboxLimits.wMax && ibd <= inboxLimits.dMax) {
                    const ibH = Math.round(selIbL * effH + ibGapH);
                    if (ibH + gapH <= lim.hMax) {
                      candidates.push({
                        ibw, ibd, cols: c, rows: r, rot, l: selIbL,
                        ibQtyPer: c * r * selIbL, ibH,
                        pairs: ibw === ibd ? [[ibw, ibd]] : [[ibw, ibd], [ibd, ibw]]
                      });
                    }
                  }
                }
              }
            }
          }

          candidates.forEach(cand => {
            const { ibw, ibd, cols: ibCols, rows: ibRows, rot: ibRot, l: ibL, ibQtyPer, pairs, ibH } = cand;
            const curH = Math.round(ibH + gapH);
            const ibCfg = `${ibCols}열×${ibRows}행×${ibL}단${ibRot ? '(90°)' : ''}`;

            pairs.forEach(([dw, dd]) => {
              for (let colsInOb = 1; colsInOb <= 6; colsInOb++) {
                for (let rowsInOb = 1; rowsInOb <= 6; rowsInOb++) {
                  const cnt = colsInOb * rowsInOb;
                  if (cnt < minIbInOb || cnt > maxIbInOb) continue;
                  const totalQty = cnt * ibQtyPer;
                  const totalWeightKg = (totalQty * uwt) / 1000;
                  if (totalWeightKg > lim.maxWeight) continue;

                  const obw = Math.round(colsInOb * dw + gapW);
                  const obd = Math.round(rowsInOb * dd + gapD);
                  if (obw < lim.me || obw > lim.wMax || obd < lim.me || obd > lim.dMax || curH > lim.hMax) continue;

                  const area = obw * obd;

                  Object.entries(checkers).forEach(([k, fn]) => {
                    const pat = fn(obw, obd);
                    if (!pat) return;
                    const pq = pat.count * totalQty;
                    const bktKey = totalQty % 5 === 0 ? 'standardProposals' : 'alternativeProposals';
                    const propKey = `${totalQty}_${obw}_${obd}_${k}`;
                    const cur = B[k][bktKey][propKey];

                    if (!cur || pq > cur.pq || (pq === cur.pq && area < cur.area)) {
                      B[k][bktKey][propKey] = {
                        qty: totalQty,
                        bw: obw,
                        bd: obd,
                        bh: curH,
                        cfg: `${colsInOb}열×${rowsInOb}행`,
                        pat,
                        pq,
                        wt: Number(totalWeightKg.toFixed(2)),
                        area,
                        isInbox: true,
                        ibQtyPer,
                        ibCfg,
                        ibw,
                        ibd,
                        ibH,
                        ibInOb: cnt
                      };
                    }
                  });
                }
              }
            });
          });
        } else {
          // 일반 모드 계산
          const curH = Math.round(az * effH + gapH);

          for (let cols = 1; cols <= 12; cols++) {
            for (let rows = 1; rows <= 12; rows++) {
              const qty = cols * rows * az;
              const totalWeightKg = (qty * uwt) / 1000;
              if (totalWeightKg > lim.maxWeight) continue;

              for (const [w, d, rot] of [[uw, ud, ''], [ud, uw, '(90°)' ]]) {
                const obw = Math.round(cols * w + gapW);
                const obd = Math.round(rows * d + gapD);
                if (obw < lim.me || obw > lim.wMax || obd < lim.me || obd > lim.dMax || curH > lim.hMax) continue;

                const area = obw * obd;
                const cfg = `${cols}열×${rows}행×${az}단${rot}`;

                Object.entries(checkers).forEach(([k, fn]) => {
                  const pat = fn(obw, obd);
                  if (!pat) return;
                  const pq = pat.count * qty;
                  const bktKey = qty % 5 === 0 ? 'standardProposals' : 'alternativeProposals';
                  const propKey = `${qty}_${obw}_${obd}_${k}`;
                  const cur = B[k][bktKey][propKey];

                  if (!cur || pq > cur.pq || (pq === cur.pq && area < cur.area)) {
                    B[k][bktKey][propKey] = {
                      qty,
                      bw: obw,
                      bd: obd,
                      bh: curH,
                      cfg,
                      pat,
                      pq,
                      wt: Number(totalWeightKg.toFixed(2)),
                      area,
                      isInbox: false
                    };
                  }
                });
              }
            }
          }
        }

        const formattedResults = {};
        const sortFn = obj => Object.values(obj).sort((a, b) => b.pq - a.pq || b.qty - a.qty || a.area - b.area);

        allKeys.forEach(k => {
          const sList = sortFn(B[k].standardProposals).slice(0, 5);
          const aList = sortFn(B[k].alternativeProposals).slice(0, 5);
          formattedResults[k] = {
            standard: sList,
            alternatives: aList,
            best: sList[0] || aList[0] || null
          };
        });

        setCalculationResults(formattedResults);
        setIsCalculated(true);
        setActiveCategoryTab('pinwheel');
        setActiveSubPatternKey('8pin');
        setSelectedProposalIdx(0);
        setIsAlternativeProposal(false);

        toast.success('🎉 아웃박스 최적 규격 및 팔레트 적재 패턴 산출이 완료되었습니다!');

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);

      } catch (err) {
        console.error(err);
        toast.error('계산 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setIsCalculating(false);
      }
    }, 100);
  };

  // 현재 활성화된 데이터
  const activePatternData = useMemo(() => {
    if (!calculationResults || !calculationResults[activeSubPatternKey]) return null;
    return calculationResults[activeSubPatternKey];
  }, [calculationResults, activeSubPatternKey]);

  const activeProposal = useMemo(() => {
    if (!activePatternData) return null;
    const list = isAlternativeProposal ? activePatternData.alternatives : activePatternData.standard;
    return list[selectedProposalIdx] || list[0] || activePatternData.best || null;
  }, [activePatternData, isAlternativeProposal, selectedProposalIdx]);

  // 3D 뷰어 연동
  const viewerOutbox = useMemo(() => {
    if (!activeProposal) return null;
    return {
      w: activeProposal.bw,
      d: activeProposal.bd,
      h: activeProposal.bh,
      totalUnits: activeProposal.qty,
      totalWeight: activeProposal.wt * 1000
    };
  }, [activeProposal]);

  const viewerInbox = useMemo(() => {
    if (!activeProposal || !activeProposal.isInbox) return null;
    return {
      w: activeProposal.ibw,
      d: activeProposal.ibd,
      h: activeProposal.ibH,
      qty: activeProposal.ibQtyPer,
      totalWeight: Math.round((activeProposal.ibQtyPer * unitBox.weight) + 120),
      isFit: true
    };
  }, [activeProposal, unitBox.weight]);

  const viewerPalletConfig = useMemo(() => {
    if (!activeProposal || !activeProposal.pat) return null;
    const stacks = Math.max(1, Math.floor(palletMaxHeightLimit / (activeProposal.bh + 10)));
    return {
      w: palletSpec.w,
      d: palletSpec.d,
      stacks,
      pattern: {
        id: activeProposal.pat.id || activeSubPatternKey,
        positions: activeProposal.pat.positions
      }
    };
  }, [activeProposal, palletSpec, palletMaxHeightLimit, activeSubPatternKey]);

  // 클립보드 복사
  const handleCopySummary = () => {
    if (!activeProposal) return;
    const pv = getPIValues(palletSpec.w, palletSpec.d);
    const isOptimal = activeProposal.pat.fp <= pv.pi;
    const text = `[📦 QMS 아웃박스 및 팔레트 적재 사양서]
- 단상자 치수: ${unitBox.w} × ${unitBox.d} × ${unitBox.h} mm (${unitBox.weight}g) / POP: ${hasPop ? `${popHeight}mm` : 'OFF'}
- 적용 채널: ${activeLimit.name} (${activeLimit.wMax}×${activeLimit.dMax}×${activeLimit.hMax}mm, ${activeLimit.maxWeight}kg)
- 여유공간: 아웃박스(${outboxGap.w}/${outboxGap.d}/${outboxGap.h}mm)${useInbox ? ` / 인박스(${inboxGap.w}/${inboxGap.d}/${inboxGap.h}mm)` : ''}
- 아웃박스 외형: ${activeProposal.bw} × ${activeProposal.bd} × ${activeProposal.bh} mm
- 아웃박스 입수: ${activeProposal.isInbox ? `인박스 ${activeProposal.ibInOb}개입 (${activeProposal.ibQtyPer}개/인박스 = 총 ${activeProposal.qty}개)` : `${activeProposal.qty}개 (${activeProposal.cfg})`}
- 적재 방식: ${activeProposal.pat.name} (1단 ${activeProposal.pat.count}박스 / 1단 제품 수 ${activeProposal.pq}개)
- 팔레트 PI 판정: ${activeProposal.pat.fp}mm -> ${isOptimal ? '🟢 최적 적재 (PI 1,060mm 이내)' : '🟡 주의'}
- 아웃박스 중량: ${activeProposal.wt}kg (한도 ${activeLimit.maxWeight}kg 이내)`;

    navigator.clipboard.writeText(text).then(() => {
      toast.success('📋 사양 요약이 클립보드에 복사되었습니다.');
    });
  };

  // ── QMS ERP 디자인 시스템 스타일 토큰 ──
  const qmsCardStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '5px'
  };

  const inputStyle = {
    width: '100%',
    height: '36px',
    padding: '0 10px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    background: '#f8fafc',
    border: '1.5px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const currentCategory = useMemo(() => {
    return PATTERN_CATEGORIES.find(c => c.id === activeCategoryTab) || PATTERN_CATEGORIES[0];
  }, [activeCategoryTab]);

  return (
    <AnalyticsDashboardShell title="📦 아웃박스 규격 및 팔레트 적재 계산기">
      <div style={{ width: '100%', height: 'calc(100vh - 80px)', overflowY: 'auto', padding: '16px 24px 90px', boxSizing: 'border-box', background: '#f8fafc', fontFamily: '"Inter", "Outfit", system-ui, sans-serif' }}>

        {/* 상단 탭 네비게이션 (QMS 네이비 블루) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveMainTab('calc')}
              style={{
                padding: '8px 22px',
                fontSize: '14px',
                fontWeight: activeMainTab === 'calc' ? 800 : 600,
                color: activeMainTab === 'calc' ? '#ffffff' : '#475569',
                background: activeMainTab === 'calc' ? '#1e40af' : '#ffffff',
                border: activeMainTab === 'calc' ? 'none' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeMainTab === 'calc' ? '0 2px 6px rgba(30, 64, 175, 0.25)' : 'none'
              }}
            >
              <span>🧮</span>
              <span>규격 및 적재 계산</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('settings')}
              style={{
                padding: '8px 22px',
                fontSize: '14px',
                fontWeight: activeMainTab === 'settings' ? 800 : 600,
                color: activeMainTab === 'settings' ? '#ffffff' : '#475569',
                background: activeMainTab === 'settings' ? '#0f172a' : '#ffffff',
                border: activeMainTab === 'settings' ? 'none' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚙️</span>
              <span>규격 한도 및 설정 관리</span>
              <span style={{ fontSize: '11px', background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                {limitsList.length}개 규정
              </span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: 🧮 규격 및 적재 계산 (QMS 네이비 ERP 스타일)
           ══════════════════════════════════════════════════════════════ */}
        {activeMainTab === 'calc' && (
          <div>

            {/* ── 상단 2-Column 파라미터 입력 영역 (공간 낭비 제로 & 글자 짤림 방지) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>

              {/* ── 좌측 패널: 1. 단상자 정보 ── */}
              <div style={qmsCardStyle}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>📦</span> 1. 단상자 (단품) 치수 및 아웃박스 기본 설정
                </div>

                {/* 4열 치수 및 무게 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>가로 (W mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={unitBox.w || ''}
                      onChange={e => setUnitBox(p => ({ ...p, w: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                      placeholder="70.5"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>세로 (D mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={unitBox.d || ''}
                      onChange={e => setUnitBox(p => ({ ...p, d: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                      placeholder="40.5"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>높이 (H mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={unitBox.h || ''}
                      onChange={e => setUnitBox(p => ({ ...p, h: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                      placeholder="141"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>제품 무게 (g)</label>
                    <input
                      type="number"
                      step="1"
                      value={unitBox.weight || ''}
                      onChange={e => setUnitBox(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle}
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* 토글 스위치들 */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#1e293b', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={hasPop}
                      onChange={e => setHasPop(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#1e40af' }}
                    />
                    <span>POP 적용 (15mm 돌출 · 1단 고정)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#1e293b', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={useCustomH}
                      onChange={e => setUseCustomH(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#1e40af' }}
                    />
                    <span>적재 높이 직접 지정 (눕힘 포장)</span>
                  </label>

                  {useCustomH && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        value={customHVal}
                        onChange={e => setCustomHVal(Number(e.target.value) || 0)}
                        style={{ width: '70px', height: '32px', padding: '0 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>mm</span>
                    </div>
                  )}
                </div>

                {/* 아웃박스 높이 단수 세그먼트 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>아웃박스 높이 적재 단수</span>
                    {hasPop && (
                      <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 'bold', background: '#ffe4e6', padding: '2px 8px', borderRadius: '4px' }}>
                        🏷️ POP 적용으로 1단 자동 고정
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map(hz => {
                      const isSel = effectiveOutboxLayers === hz && !customOutboxLayers;
                      const isDisabled = hasPop && hz !== 1;
                      return (
                        <button
                          key={hz}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setOutboxLayers(hz);
                            setCustomOutboxLayers('');
                          }}
                          style={{
                            flex: 1,
                            minWidth: '40px',
                            height: '34px',
                            fontSize: '13px',
                            fontWeight: isSel ? 800 : 600,
                            background: isSel ? '#1e40af' : (isDisabled ? '#f1f5f9' : '#ffffff'),
                            color: isSel ? '#ffffff' : (isDisabled ? '#94a3b8' : '#334155'),
                            border: isSel ? '1.5px solid #1e40af' : '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {hz}단
                        </button>
                      );
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 6px', height: '34px', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>직접</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        placeholder="단수"
                        disabled={hasPop}
                        value={customOutboxLayers}
                        onChange={e => setCustomOutboxLayers(e.target.value)}
                        style={{ width: '42px', height: '26px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: '#fff', outline: 'none' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>단</span>
                    </div>
                  </div>
                </div>

                {/* 채널 & 아웃박스 여유공간 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '10px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={labelStyle}>채널 (규격 한도)</label>
                    <select
                      value={selectedLimitId}
                      onChange={e => setSelectedLimitId(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {limitsList.map(lim => (
                        <option key={lim.id} value={lim.id}>{lim.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>아웃박스 여유공간 (W / D / H mm)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <input
                        type="number"
                        value={outboxGap.w}
                        onChange={e => setOutboxGap(p => ({ ...p, w: Number(e.target.value) || 0 }))}
                        style={{ ...inputStyle, textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                      />
                      <input
                        type="number"
                        value={outboxGap.d}
                        onChange={e => setOutboxGap(p => ({ ...p, d: Number(e.target.value) || 0 }))}
                        style={{ ...inputStyle, textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                      />
                      <input
                        type="number"
                        value={outboxGap.h}
                        onChange={e => setOutboxGap(p => ({ ...p, h: Number(e.target.value) || 0 }))}
                        style={{ ...inputStyle, textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 우측 패널: 2. 인박스 & 3. 팔레트 규격 ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* 2. 인박스 (INNER BOX) */}
                <div style={{ ...qmsCardStyle, borderLeft: useInbox ? '4px solid #1e40af' : '1px solid #e2e8f0', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e293b', fontWeight: 800 }}>
                      <input
                        type="checkbox"
                        checked={useInbox}
                        onChange={e => setUseInbox(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#1e40af' }}
                      />
                      <span>📥 2. 인박스 (Inner Box) 사용</span>
                    </label>
                  </div>

                  {useInbox ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px' }}>인박스당 단상자 입수</label>
                          <input
                            type="text"
                            placeholder="비워두면 자동 제안"
                            value={inboxQtyFixed}
                            onChange={e => setInboxQtyFixed(e.target.value)}
                            style={{ ...inputStyle, height: '32px', background: '#fff' }}
                          />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px' }}>최대 인박스 수 (기본 6개)</label>
                          <input
                            type="number"
                            value={inboxMaxInOb}
                            onChange={e => setInboxMaxInOb(Number(e.target.value) || 6)}
                            style={{ ...inputStyle, height: '32px', background: '#fff' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px', alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px' }}>인박스 단수</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3].map(l => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setInboxLayers(l)}
                                style={{
                                  flex: 1,
                                  minWidth: '30px',
                                  height: '32px',
                                  fontSize: '11px',
                                  fontWeight: inboxLayers === l ? 800 : 600,
                                  background: inboxLayers === l ? '#1e40af' : '#fff',
                                  color: inboxLayers === l ? '#fff' : '#334155',
                                  border: inboxLayers === l ? '1.5px solid #1e40af' : '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                {l}단
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label style={{ ...labelStyle, fontSize: '11px' }}>여유공간 (W / D / H mm)</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                            <input
                              type="number"
                              value={inboxGap.w}
                              onChange={e => setInboxGap(p => ({ ...p, w: Number(e.target.value) || 0 }))}
                              style={{ ...inputStyle, height: '32px', background: '#fff', textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                            />
                            <input
                              type="number"
                              value={inboxGap.d}
                              onChange={e => setInboxGap(p => ({ ...p, d: Number(e.target.value) || 0 }))}
                              style={{ ...inputStyle, height: '32px', background: '#fff', textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                            />
                            <input
                              type="number"
                              value={inboxGap.h}
                              onChange={e => setInboxGap(p => ({ ...p, h: Number(e.target.value) || 0 }))}
                              style={{ ...inputStyle, height: '32px', background: '#fff', textAlign: 'center', padding: '0 4px', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      단상자를 아웃박스에 직접 적재합니다.
                    </div>
                  )}
                </div>

                {/* 3. 팔레트 규격 & 적재 높이 */}
                <div style={{ ...qmsCardStyle, padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>
                    🪵 3. 팔레트 규격 & 총 적재 높이
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    {/* 팔레트 선택 */}
                    <div>
                      <label style={labelStyle}>팔레트 규격</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { id: 'kr', label: '1,100×1,100' },
                          { id: 'global', label: '1,200×1,000' },
                          { id: 'eu', label: '1,200×800' }
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPallet(p.id)}
                            style={{
                              flex: 1,
                              minWidth: '68px',
                              height: '34px',
                              padding: '0 2px',
                              fontSize: '11px',
                              fontWeight: palletPreset === p.id ? 800 : 600,
                              background: palletPreset === p.id ? '#1e40af' : '#ffffff',
                              color: palletPreset === p.id ? '#ffffff' : '#334155',
                              border: palletPreset === p.id ? '1.5px solid #1e40af' : '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontWeight: 700 }}>
                        PI 허용한도: {getPIValues(palletSpec.w, palletSpec.d).pi.toLocaleString()} mm
                      </div>
                    </div>

                    {/* 총 적재 높이 */}
                    <div>
                      <label style={labelStyle}>총 적재 높이 한도</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1500, 1050].map(hLim => (
                          <button
                            key={hLim}
                            type="button"
                            onClick={() => {
                              setPalletMaxHeightLimit(hLim);
                              setCustomPalletHeight('');
                            }}
                            style={{
                              flex: 1,
                              minWidth: '55px',
                              height: '34px',
                              fontSize: '11px',
                              fontWeight: palletMaxHeightLimit === hLim && !customPalletHeight ? 800 : 600,
                              background: palletMaxHeightLimit === hLim && !customPalletHeight ? '#0f172a' : '#ffffff',
                              color: palletMaxHeightLimit === hLim && !customPalletHeight ? '#ffffff' : '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {hLim.toLocaleString()}mm
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                        순수 박스: {palletMaxHeightLimit.toLocaleString()}mm 이내
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* ── 🚀 QMS 엔터프라이즈 산출 실행 버튼 (Navy Blue Gradient) ── */}
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                disabled={isCalculating}
                onClick={handleCalculate}
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isCalculating ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)',
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize: '18px' }}>⠶</span>
                <span>{isCalculating ? '최적 규격 및 적재 계산 중...' : '아웃박스 규격 및 팔레트 적재 산출'}</span>
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                섹션 4: 팔레트 적재 방식별 산출 결과 (Result Section)
               ══════════════════════════════════════════════════════════════ */}
            {isCalculated && (
              <div ref={resultRef} style={{ animation: 'fadeIn 0.25s ease-in-out' }}>

                {/* 결과 헤더 배너 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    📊 팔레트 적재 방식별 최적 산출 결과
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsGuideOpen(!isGuideOpen)}
                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {isGuideOpen ? '▲ 치수 가이드 닫기' : '▼ 치수 가이드 보기'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(30,64,175,0.2)' }}
                    >
                      📋 사양 요약 복사
                    </button>
                  </div>
                </div>

                {/* 치수 가이드 아코디언 */}
                {isGuideOpen && (
                  <div style={{ ...qmsCardStyle, padding: '12px 16px', marginBottom: '14px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.6 }}>
                      • <strong>가로 W · WIDTH</strong>: 박스를 정면에서 봤을 때 좌우 길이 | <strong>세로 D · DEPTH</strong>: 앞뒤 길이 | <strong>높이 H · HEIGHT</strong>: 위아래 길이<br />
                      💡 방향이 헷갈려도 괜찮습니다. 어느 방향으로 입력해도 자동 회전 최적화됩니다.
                    </div>
                  </div>
                )}

                {/* ── 1st Level: 적재 방식 대분류 탭 (핀휠, 격자형, 벽돌형, 혼합) ── */}
                <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #1e40af', marginBottom: '10px' }}>
                  {PATTERN_CATEGORIES.map(cat => {
                    const isSel = activeCategoryTab === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        style={{
                          padding: '10px 20px',
                          fontSize: '13px',
                          fontWeight: isSel ? 800 : 600,
                          background: isSel ? '#1e40af' : '#ffffff',
                          color: isSel ? '#ffffff' : '#475569',
                          border: isSel ? 'none' : '1px solid #cbd5e1',
                          borderBottom: 'none',
                          borderRadius: '8px 8px 0 0',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>

                {/* ── 2nd Level: 세부 방수 선택 서브 탭 (4방, 8방, 12방, 16방, 24방 등) ── */}
                <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginRight: '4px' }}>
                    세부 방수 구성:
                  </span>
                  {currentCategory.subKeys.map(sub => {
                    const isSel = activeSubPatternKey === sub.id;
                    const patResult = calculationResults?.[sub.id];
                    const hasResult = Boolean(patResult?.best);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        disabled={!hasResult}
                        onClick={() => {
                          setActiveSubPatternKey(sub.id);
                          setSelectedProposalIdx(0);
                          setIsAlternativeProposal(false);
                        }}
                        style={{
                          padding: '5px 14px',
                          fontSize: '12px',
                          fontWeight: isSel ? 800 : 600,
                          background: isSel ? '#2563eb' : (hasResult ? '#ffffff' : '#e2e8f0'),
                          color: isSel ? '#ffffff' : (hasResult ? '#1e293b' : '#94a3b8'),
                          border: isSel ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          borderRadius: '20px',
                          cursor: hasResult ? 'pointer' : 'not-allowed',
                          boxShadow: isSel ? '0 2px 4px rgba(37,99,235,0.25)' : 'none'
                        }}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>

                {/* ── 3대 핵심 지표 카드 (QMS ERP 스타일) ── */}
                {activeProposal && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', borderLeft: '4px solid #2563eb' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>최적 입수량</div>
                      <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                        {activeProposal.qty.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>개</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>{activeProposal.cfg}</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', borderLeft: '4px solid #1e40af' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>팔레트 1단 박스</div>
                      <div style={{ fontSize: '19px', fontWeight: 800, color: '#1e40af', margin: '4px 0 2px' }}>
                        {activeProposal.pat.count.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>박스</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{activeProposal.pat.name}</div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', borderLeft: '4px solid #059669' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>팔레트 1단 제품 수</div>
                      <div style={{ fontSize: '19px', fontWeight: 800, color: '#059669', margin: '4px 0 2px' }}>
                        {activeProposal.pq.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>개</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{activeProposal.wt} kg / 박스</div>
                    </div>
                  </div>
                )}

                {/* ── 안별 제안 탭 (1안~5안 | 대안 1~5안) ── */}
                {activePatternData && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {activePatternData.standard.map((prop, idx) => {
                      const isSel = !isAlternativeProposal && selectedProposalIdx === idx;
                      return (
                        <button
                          key={'std_' + idx}
                          type="button"
                          onClick={() => {
                            setIsAlternativeProposal(false);
                            setSelectedProposalIdx(idx);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: isSel ? 800 : 600,
                            background: isSel ? '#1e40af' : '#ffffff',
                            color: isSel ? '#ffffff' : '#334155',
                            border: isSel ? '1.5px solid #1e40af' : '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          {idx + 1}안 ({prop.qty.toLocaleString()}개)
                        </button>
                      );
                    })}

                    {activePatternData.alternatives.length > 0 && (
                      <>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        {activePatternData.alternatives.map((prop, idx) => {
                          const isSel = isAlternativeProposal && selectedProposalIdx === idx;
                          return (
                            <button
                              key={'alt_' + idx}
                              type="button"
                              onClick={() => {
                                setIsAlternativeProposal(true);
                                setSelectedProposalIdx(idx);
                              }}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: isSel ? 800 : 600,
                                background: isSel ? '#d97706' : '#ffffff',
                                color: isSel ? '#ffffff' : '#b45309',
                                border: isSel ? '1.5px solid #d97706' : '1px solid #fde68a',
                                cursor: 'pointer'
                              }}
                            >
                              대안{idx + 1} ({prop.qty.toLocaleString()}개) ⚠️
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* ── 상세 사양 표 & 2D/3D 시뮬레이션 그리드 (2-Column) ── */}
                {activeProposal && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start' }}>

                    {/* 좌측: 상세 사양 테이블 & 2D 배치도 */}
                    <div style={{ ...qmsCardStyle, padding: '0', overflow: 'hidden' }}>
                      {isAlternativeProposal && (
                        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '8px 16px', fontSize: '12px', color: '#92400e', fontWeight: 'bold' }}>
                          ⚠️ 비 5/10단위 대안 — {activeProposal.qty}개 / 1단 {activeProposal.pq}개
                        </div>
                      )}

                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569', width: '38%' }}>아웃박스 W × D × H</td>
                            <td style={{ padding: '9px 16px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                              {activeProposal.bw.toLocaleString()} × {activeProposal.bd.toLocaleString()} × {activeProposal.bh.toLocaleString()} mm
                            </td>
                          </tr>

                          {activeProposal.isInbox && (
                            <>
                              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                <td style={{ padding: '9px 16px', fontWeight: 600, color: '#1e40af' }}>인박스 규격 (W×D×H)</td>
                                <td style={{ padding: '9px 16px', fontWeight: 700, color: '#1e40af', textAlign: 'right' }}>
                                  {activeProposal.ibw.toLocaleString()} × {activeProposal.ibd.toLocaleString()} × {activeProposal.ibH.toLocaleString()} mm
                                  <span style={{ marginLeft: '6px', fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>적합</span>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                <td style={{ padding: '9px 16px', fontWeight: 600, color: '#1e40af' }}>인박스당 입수 / 배열</td>
                                <td style={{ padding: '9px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                                  {activeProposal.ibQtyPer.toLocaleString()}개 ({activeProposal.ibCfg})
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                <td style={{ padding: '9px 16px', fontWeight: 600, color: '#1e40af' }}>아웃박스당 인박스 수</td>
                                <td style={{ padding: '9px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                                  {activeProposal.ibInOb.toLocaleString()}개 ({activeProposal.cfg})
                                </td>
                              </tr>
                            </>
                          )}

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>아웃박스 총 입수</td>
                            <td style={{ padding: '9px 16px', fontWeight: 800, color: '#2563eb', textAlign: 'right' }}>
                              {activeProposal.qty.toLocaleString()} 개입
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>적재 패턴</td>
                            <td style={{ padding: '9px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                              {activeProposal.pat.name}
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>팔레트 1단 아웃박스</td>
                            <td style={{ padding: '9px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                              {activeProposal.pat.count.toLocaleString()} 박스
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>팔레트 1단 제품 수</td>
                            <td style={{ padding: '9px 16px', fontWeight: 800, color: '#059669', textAlign: 'right' }}>
                              {activeProposal.pq.toLocaleString()} 개
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>
                              팔레트 최대 길이 (fp)
                            </td>
                            <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                              <strong style={{ color: '#0f172a' }}>{activeProposal.pat.fp.toLocaleString()} mm</strong>
                              <span style={{
                                marginLeft: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: activeProposal.pat.fp <= getPIValues(palletSpec.w, palletSpec.d).pi ? '#dcfce7' : '#fee2e2',
                                color: activeProposal.pat.fp <= getPIValues(palletSpec.w, palletSpec.d).pi ? '#15803d' : '#b91c1c'
                              }}>
                                {activeProposal.pat.fp <= getPIValues(palletSpec.w, palletSpec.d).pi ? '🟢 적합' : '🟡 주의'}
                              </span>
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>아웃박스 중량</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                              <strong>{activeProposal.wt} kg</strong>
                              <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                                ✓ 적합 (≤{activeLimit.maxWeight}kg)
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td style={{ padding: '9px 16px', fontWeight: 600, color: '#475569' }}>
                              규격 한도 검증
                            </td>
                            <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                                ✓ W≤{activeLimit.wMax} / D≤{activeLimit.dMax} / H≤{activeLimit.hMax}mm 적합
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 2D 1단 평면 배치도 */}
                      <div style={{ padding: '14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
                        <Pallet2DTopView pattern={activeProposal.pat} palletW={palletSpec.w} palletD={palletSpec.d} />
                      </div>
                    </div>

                    {/* 우측: 3D 시뮬레이터 (QMS 테마) */}
                    <div style={{ ...qmsCardStyle, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          🎮 3D 적재 시뮬레이터
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 'pallet-cross', label: '🏗️ 교차 적재' },
                            { id: 'pallet-normal', label: '🏗️ 일반 적재' },
                            { id: 'outbox', label: '📦 아웃박스' },
                            ...(useInbox ? [{ id: 'inbox', label: '📥 인박스' }] : [])
                          ].map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setViewerMode(m.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: viewerMode === m.id ? 800 : 500,
                                background: viewerMode === m.id ? '#1e40af' : '#ffffff',
                                color: viewerMode === m.id ? '#ffffff' : '#475569',
                                border: viewerMode === m.id ? '1px solid #1e40af' : '1px solid #cbd5e1',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <PackagingViewer3D
                          mode={viewerMode}
                          unitBox={unitBox}
                          inbox={viewerInbox}
                          outbox={viewerOutbox}
                          arrangement={{ cols: 4, rows: 2, layers: 1 }}
                          inboxArrangement={{ cols: 3, rows: 2, layers: 1 }}
                          useInbox={useInbox}
                          hasPop={hasPop}
                          popHeight={popHeight}
                          useAirCap={false}
                          palletConfig={viewerPalletConfig}
                          height={420}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                        💡 마우스 드래그: 360° 회전 · 마우스 휠: 줌인/줌아웃
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: ⚙️ 규격 한도 및 설정 관리
           ══════════════════════════════════════════════════════════════ */}
        {activeMainTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={qmsCardStyle}>
              <strong style={{ fontSize: '14px', color: '#1e3a8a', display: 'block', marginBottom: '12px' }}>
                📦 아웃박스 채널별 규격 한도 관리
              </strong>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>규격명</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>최대 치수 (W×D×H mm)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>최대 중량</th>
                  </tr>
                </thead>
                <tbody>
                  {limitsList.map(lim => (
                    <tr key={lim.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{lim.name}</td>
                      <td style={{ padding: '8px 10px', color: '#2563eb', fontWeight: 600 }}>{lim.wMax} × {lim.dMax} × {lim.hMax} mm</td>
                      <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 600 }}>{lim.maxWeight} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={qmsCardStyle}>
              <strong style={{ fontSize: '14px', color: '#1e3a8a', display: 'block', marginBottom: '12px' }}>
                📐 글로벌 기본 여유공간 (Clearances)
              </strong>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                • <strong>아웃박스 기본 여유공간</strong>: 가로 26mm, 세로 26mm, 높이 26mm<br />
                • <strong>인박스 기본 여유공간</strong>: 가로 17mm, 세로 17mm, 높이 17mm<br />
                • <strong>인박스 최대 허용 치수</strong>: 300 × 300 mm 이내
              </div>
            </div>
          </div>
        )}

      </div>
    </AnalyticsDashboardShell>
  );
};

export default OutboxSpecCalculatorPage;
