/**
 * 포장 및 적재 최적화 계산 엔진 (Packaging & Pallet Loading Calculator)
 * outbox_calculator_v3.html 알고리즘 기반 이식 및 확장
 */

export const LIMITS = {
  standard: { wMax: 460, dMax: 600, hMax: 400, me: 130 },
  oyus: { wMax: 300, dMax: 460, hMax: 380, me: 130 }
};

export const MAX_WT = 12000; // 최대 중량 (g = 12kg)
export const IB_MAX = 300;   // 인박스 최대 가로/세로 (mm)

/**
 * 팔레트 치수에 따른 PI(적재 허용 한계) 및 경고 한계 계산
 */
export function getPIValues(palW, palD) {
  const is1100 = palW === 1100 && palD === 1100;
  const is1200 = palW === 1200 && palD === 1000;
  const is1000 = palW === 1000 && palD === 1200;

  if (is1100) return { pi: 1060, warn: 1080, piL: 1060, warnL: 1080, piS: 1060, warnS: 1080 };
  if (is1200) return { pi: 1160, warn: 1180, piL: 1160, warnL: 1180, piS: 960, warnS: 980 };
  if (is1000) return { pi: 1160, warn: 1180, piL: 960, warnL: 980, piS: 1160, warnS: 1180 };

  const piL = palW - 40, warnL = palW - 20;
  const piS = palD - 40, warnS = palD - 20;
  return { pi: Math.max(piL, piS), warn: Math.max(warnL, warnS), piL, warnL, piS, warnS };
}

// ── 8방 핀휠 ──
export function check8Pin(bw, bd, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  const sw = Math.min(bw, bd), lg = Math.max(bw, bd);
  const fp = 2 * sw + lg;
  const maxXY = lg + 2 * sw;
  if (maxXY > palW || maxXY > palD) return null;
  if (maxXY > pv.warnL || maxXY > pv.warnS) return null;
  if (lg < 1.8 * sw) return null; // 기하학적 핀휠 공극 형성 조건
  const pos = [
    [0, 0, sw, lg], [sw, 0, sw, lg],
    [2 * sw, 0, lg, sw], [2 * sw, sw, lg, sw],
    [lg, 2 * sw, sw, lg], [lg + sw, 2 * sw, sw, lg],
    [0, lg, lg, sw], [0, lg + sw, lg, sw]
  ];
  const holeSize = Math.max(0, lg - 2 * sw);
  return {
    id: '8pin',
    type: 'pinwheel',
    name: '8방 핀휠 (중앙 공극형)',
    count: 8,
    fp,
    positions: pos,
    desc: `8방 핀휠: 2열×${sw} + ${lg} = ${fp}mm (중앙홀: ${holeSize}mm)`,
    maxX: maxXY,
    maxY: maxXY,
    isBrick: false
  };
}

// ── 4방 핀휠 ──
export function check4Pin(bw, bd, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  let best = null;
  for (const [w, d, rot] of [[bw, bd, ''], [bd, bw, '(90°)']]) {
    const sw = Math.min(w, d), lg = Math.max(w, d), fp = lg + sw;
    const maxXY = lg + sw;
    if (maxXY > palW || maxXY > palD) continue;
    if (maxXY > pv.warnL || maxXY > pv.warnS) continue;
    const pos = [[0, 0, sw, lg], [0, lg, lg, sw], [sw, 0, lg, sw], [lg, sw, sw, lg]];
    const e = {
      id: '4pin',
      type: 'pinwheel',
      name: `4방 핀휠${rot}`,
      count: 4,
      fp,
      positions: pos,
      desc: `4방 핀휠: ${sw}+${lg}=${fp}mm`,
      maxX: maxXY,
      maxY: maxXY,
      isBrick: false
    };
    if (!best || fp < best.fp) best = e;
  }
  return best;
}

// ── 격자 패턴 ──
export function checkGrid(bw, bd, cols, rows, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  const twWarn = palW >= palD ? pv.warnL : pv.warnS;
  const tdWarn = palW >= palD ? pv.warnS : pv.warnL;
  let best = null;
  for (const [w, d, rot] of [[bw, bd, ''], [bd, bw, '(90°)']]) {
    const tw = cols * w, td = rows * d;
    if (tw > palW || td > palD || tw > twWarn || td > tdWarn) continue;
    const fp = Math.max(tw, td);
    const pos = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pos.push([c * w, r * d, w, d]);
      }
    }
    const e = {
      id: `grid_${cols}x${rows}`,
      type: 'grid',
      name: `${cols * rows}방 격자 (${cols}×${rows})${rot}`,
      count: cols * rows,
      fp,
      positions: pos,
      desc: `격자 ${cols}×${rows}${rot}: ${tw}×${td}mm`,
      maxX: tw,
      maxY: td,
      isBrick: false
    };
    if (!best || fp < best.fp) best = e;
  }
  return best;
}

export function check8Grid(bw, bd, palW = 1100, palD = 1100) {
  const g1 = checkGrid(bw, bd, 4, 2, palW, palD);
  const g2 = checkGrid(bw, bd, 2, 4, palW, palD);
  if (!g1 && !g2) return null;
  if (!g1) return g2;
  if (!g2) return g1;
  return g1.fp <= g2.fp ? g1 : g2;
}

export function check6(bw, bd, palW = 1100, palD = 1100) {
  const g1 = checkGrid(bw, bd, 3, 2, palW, palD);
  const g2 = checkGrid(bw, bd, 2, 3, palW, palD);
  if (!g1 && !g2) return null;
  if (!g1) return g2;
  if (!g2) return g1;
  return g1.fp <= g2.fp ? g1 : g2;
}

export function build4FoldPinwheel(quadrantBoxes, QW, QD) {
  const positions = [];

  // Q1 (Top-Left): original
  quadrantBoxes.forEach(([bx, by, bw, bd]) => {
    positions.push([bx, by, bw, bd]);
  });

  // Q2 (Top-Right): 90° clockwise
  quadrantBoxes.forEach(([bx, by, bw, bd]) => {
    const x2 = QW + (QD - by - bd);
    const y2 = bx;
    positions.push([x2, y2, bd, bw]);
  });

  // Q3 (Bottom-Right): 180°
  quadrantBoxes.forEach(([bx, by, bw, bd]) => {
    const x3 = QD + (QW - bx - bw);
    const y3 = QW + (QD - by - bd);
    positions.push([x3, y3, bw, bd]);
  });

  // Q4 (Bottom-Left): 270° clockwise
  quadrantBoxes.forEach(([bx, by, bw, bd]) => {
    const x4 = by;
    const y4 = QD + (QW - bx - bw);
    positions.push([x4, y4, bd, bw]);
  });

  return positions;
}

export function checkNPin(bw, bd, n, palW = 1100, palD = 1100) {
  if (n % 4 !== 0) return null;
  const pv = getPIValues(palW, palD);
  const k = n / 4; // 사분면당 박스 수
  const sw = Math.min(bw, bd), lg = Math.max(bw, bd);
  const twWarn = palW >= palD ? pv.warnL : pv.warnS;
  const tdWarn = palW >= palD ? pv.warnS : pv.warnL;

  let best = null;

  // k = vCount (수직) + hCount (수평) 밀착 복합 블록 탐색
  for (let vCount = 0; vCount <= k; vCount++) {
    const hCount = k - vCount;
    if (vCount === 0 && hCount === 0) continue;

    let qBoxes = [], QW = 0, QD = 0;
    if (hCount === 0) {
      // 순수 수직 vCount개 병렬
      for (let i = 0; i < vCount; i++) qBoxes.push([i * sw, 0, sw, lg]);
      QW = vCount * sw;
      QD = lg;
    } else if (vCount === 0) {
      // 순수 수평 hCount개 병렬
      for (let i = 0; i < hCount; i++) qBoxes.push([0, i * sw, lg, sw]);
      QW = lg;
      QD = hCount * sw;
    } else {
      // 복합 핀휠 (vCount 수직 + hCount 수평 밀착 블록)
      for (let i = 0; i < vCount; i++) qBoxes.push([i * sw, 0, sw, lg]);
      for (let i = 0; i < hCount; i++) qBoxes.push([0, lg + i * sw, vCount * sw, sw]);
      QW = vCount * sw;
      QD = lg + hCount * sw;
    }

    const totalSpan = QW + QD;
    if (totalSpan > palW || totalSpan > palD || totalSpan > twWarn || totalSpan > tdWarn) continue;

    const holeSize = Math.abs(QD - QW);
    // 중앙 공극이 팔레트의 50%를 초과하는 비정상적인 우물형 제외
    if (holeSize > totalSpan * 0.50) continue;

    const pos = build4FoldPinwheel(qBoxes, QW, QD);
    const candidate = {
      id: `${n}pin`,
      type: 'pinwheel',
      name: `${n}방 핀휠 (밀착 결속형)`,
      count: n,
      fp: totalSpan,
      positions: pos,
      desc: `${n}방 핀휠 (${vCount}수직+${hCount}수평): ${totalSpan}mm (중앙홀: ${holeSize}mm)`,
      maxX: totalSpan,
      maxY: totalSpan,
      isBrick: false,
      holeSize
    };

    if (!best || candidate.holeSize < best.holeSize || (candidate.holeSize === best.holeSize && candidate.fp > best.fp)) {
      best = candidate;
    }
  }

  return best;
}

export function checkNGrid(bw, bd, n, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  const twWarn = palW >= palD ? pv.warnL : pv.warnS;
  const tdWarn = palW >= palD ? pv.warnS : pv.warnL;
  let best = null;
  for (const [w, d, rot] of [[bw, bd, ''], [bd, bw, '(90°)']]) {
    for (let cols = 1; cols <= n; cols++) {
      if (n % cols !== 0) continue;
      const rows = n / cols;
      const tw = cols * w, td = rows * d;
      if (tw > palW || td > palD || tw > twWarn || td > tdWarn) continue;
      const fp = Math.max(tw, td);
      const pos = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pos.push([c * w, r * d, w, d]);
      const e = {
        id: `${n}grid_${cols}x${rows}`,
        type: 'grid',
        name: `${n}방 격자 (${cols}×${rows})${rot}`,
        count: n,
        fp,
        positions: pos,
        desc: `격자 ${cols}×${rows}${rot}: ${tw}×${td}mm`,
        maxX: tw,
        maxY: td,
        isBrick: false
      };
      if (!best || fp < best.fp) best = e;
    }
  }
  return best;
}

export function checkNBest(bw, bd, n, palW = 1100, palD = 1100) {
  const g = checkNGrid(bw, bd, n, palW, palD);
  const p = checkNPin(bw, bd, n, palW, palD);
  if (!g && !p) return null;
  if (!g) return p;
  if (!p) return g;
  return p.fp <= g.fp ? p : g;
}

export function check12(bw, bd, palW = 1100, palD = 1100) { return checkNBest(bw, bd, 12, palW, palD); }
export function check16(bw, bd, palW = 1100, palD = 1100) { return checkNBest(bw, bd, 16, palW, palD); }
export function check20(bw, bd, palW = 1100, palD = 1100) { return checkNBest(bw, bd, 20, palW, palD); }
export function check24(bw, bd, palW = 1100, palD = 1100) { return checkNBest(bw, bd, 24, palW, palD); }

// ── 벽돌형 (Brick) ──
export function checkBrick(bw, bd, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  let bestCount = 0, bestInfo = null;
  for (const [ew, ed, ow, od, rot] of [[bw, bd, bd, bw, ''], [bd, bw, bw, bd, '(90°)']]) {
    let y = 0, total = 0, rows_info = [], row = 0;
    while (true) {
      const rh = row % 2 === 0 ? ed : od;
      if (y + rh > palD) break;
      const rw = row % 2 === 0 ? ew : ow;
      const cols = Math.floor(palW / rw);
      if (cols === 0) break;
      const boxes = [];
      for (let c = 0; c < cols; c++) boxes.push([c * rw, y, rw, rh]);
      total += cols;
      rows_info.push(boxes);
      y += rh; row++;
    }
    if (total > bestCount) {
      bestCount = total;
      const allPos = rows_info.flat();
      const maxX = Math.max(...allPos.map(p => p[0] + p[2]));
      const maxY = Math.max(...allPos.map(p => p[1] + p[3]));
      const fp = Math.max(maxX, maxY);
      const twWarn = palW >= palD ? pv.warnL : pv.warnS;
      const tdWarn = palW >= palD ? pv.warnS : pv.warnL;
      if (maxX <= palW && maxY <= palD && maxX <= twWarn && maxY <= tdWarn) {
        bestInfo = {
          id: 'brick',
          type: 'brick',
          name: `벽돌형${rot}`,
          count: total,
          fp,
          positions: allPos,
          desc: `벽돌형 엇갈림${rot}: ${total}개 (${maxX}×${maxY}mm)`,
          maxX,
          maxY,
          isBrick: true
        };
      }
    }
  }
  return bestInfo;
}

// ── 혼합 길로틴 (Guillotine) ──
export function checkGuillotine(bw, bd, palW = 1100, palD = 1100) {
  const pv = getPIValues(palW, palD);
  const twWarn = palW >= palD ? pv.warnL : pv.warnS;
  const tdWarn = palW >= palD ? pv.warnS : pv.warnL;
  let best = null;
  const variants = [[bw, bd], [bd, bw]];

  function tryLayout(positions, usedW, usedD, count, desc) {
    if (!count || usedW > palW || usedD > palD || usedW > twWarn || usedD > tdWarn) return;
    const fp = Math.max(usedW, usedD);
    if (!best || count > best.count || (count === best.count && fp < best.fp)) {
      best = {
        id: 'mix',
        type: 'mix',
        name: `혼합 (${desc})`,
        count,
        fp,
        positions: [...positions],
        desc: `혼합배치: ${count}개 (${usedW}×${usedD}mm)`,
        maxX: usedW,
        maxY: usedD,
        isBrick: false
      };
    }
  }

  // 수평 분할
  for (const [w1, h1] of variants) {
    const cols1 = Math.floor(palW / w1);
    if (!cols1) continue;
    const maxRows1 = Math.floor(palD / h1);
    for (let rows1 = 0; rows1 <= maxRows1; rows1++) {
      const sy = rows1 * h1;
      const n1 = cols1 * rows1;
      for (const [w2, h2] of variants) {
        const cols2 = Math.floor(palW / w2);
        if (!cols2) continue;
        const rows2 = Math.floor((palD - sy) / h2);
        const n2 = cols2 * rows2;
        if (!n1 && !n2) continue;
        const usedW = Math.max(cols1 * w1, cols2 * w2);
        const usedD = rows1 * h1 + rows2 * h2;
        if (!usedW || !usedD) continue;
        const pos = [];
        for (let r = 0; r < rows1; r++) for (let c = 0; c < cols1; c++) pos.push([c * w1, r * h1, w1, h1]);
        for (let r = 0; r < rows2; r++) for (let c = 0; c < cols2; c++) pos.push([c * w2, sy + r * h2, w2, h2]);
        tryLayout(pos, usedW, usedD, n1 + n2, `${cols1}×${rows1}+${cols2}×${rows2}`);
      }
    }
  }

  // 수직 분할
  for (const [w1, h1] of variants) {
    const rows1 = Math.floor(palD / h1);
    if (!rows1) continue;
    const maxCols1 = Math.floor(palW / w1);
    for (let cols1 = 0; cols1 <= maxCols1; cols1++) {
      const sx = cols1 * w1;
      const n1 = cols1 * rows1;
      const remX = palW - sx;
      for (const [w2, h2] of variants) {
        if (!remX || w2 > remX) continue;
        const cols2 = Math.floor(remX / w2);
        const rows2 = Math.floor(palD / h2);
        const n2 = cols2 * rows2;
        if (!n1 && !n2) continue;
        const usedW = sx + cols2 * w2;
        const usedD = Math.max(rows1 * h1, rows2 * h2);
        if (!usedW || !usedD) continue;
        const pos = [];
        for (let r = 0; r < rows1; r++) for (let c = 0; c < cols1; c++) pos.push([c * w1, r * h1, w1, h1]);
        for (let r = 0; r < rows2; r++) for (let c = 0; c < cols2; c++) pos.push([sx + c * w2, r * h2, w2, h2]);
        tryLayout(pos, usedW, usedD, n1 + n2, `L:${cols1}×${rows1}+${cols2}×${rows2}`);
      }
    }
  }

  return best;
}

/**
 * 모든 가능한 팔레트 적재 패턴 계산 및 적합도 판정
 */
export function calcAllPalletPatterns(bw, bd, palW = 1100, palD = 1100) {
  if (!bw || !bd || bw <= 0 || bd <= 0) return [];
  const pv = getPIValues(palW, palD);

  const patternGenerators = [
    { key: '4pin', fn: () => checkNPin(bw, bd, 4, palW, palD) || check4Pin(bw, bd, palW, palD), category: 'pinwheel', label: '4방 핀휠' },
    { key: '8pin', fn: () => checkNPin(bw, bd, 8, palW, palD) || check8Pin(bw, bd, palW, palD), category: 'pinwheel', label: '8방 핀휠' },
    { key: '12pin', fn: () => checkNPin(bw, bd, 12, palW, palD), category: 'pinwheel', label: '12방 핀휠' },
    { key: '16pin', fn: () => checkNPin(bw, bd, 16, palW, palD), category: 'pinwheel', label: '16방 핀휠' },
    { key: '20pin', fn: () => checkNPin(bw, bd, 20, palW, palD), category: 'pinwheel', label: '20방 핀휠' },
    { key: '24pin', fn: () => checkNPin(bw, bd, 24, palW, palD), category: 'pinwheel', label: '24방 핀휠' },
    { key: '6grid', fn: () => check6(bw, bd, palW, palD), category: 'grid', label: '6방 격자' },
    { key: '8grid', fn: () => check8Grid(bw, bd, palW, palD), category: 'grid', label: '8방 격자' },
    { key: '12grid', fn: () => checkNGrid(bw, bd, 12, palW, palD), category: 'grid', label: '12방 격자' },
    { key: '16grid', fn: () => checkNGrid(bw, bd, 16, palW, palD), category: 'grid', label: '16방 격자' },
    { key: 'brick', fn: () => checkBrick(bw, bd, palW, palD), category: 'brick', label: '벽돌형 (Brick)' },
    { key: 'mix', fn: () => checkGuillotine(bw, bd, palW, palD), category: 'mix', label: '혼합 (길로틴)' }
  ];

  const results = [];
  for (const gen of patternGenerators) {
    const pat = gen.fn();
    if (pat) {
      const ok = pat.fp <= pv.pi;
      const warn = !ok && pat.fp <= pv.warn;
      const status = ok ? 'ok' : warn ? 'warn' : 'ng';
      results.push({
        ...pat,
        category: gen.category,
        label: gen.label,
        status,
        statusLabel: ok ? '적합' : warn ? '경고(확인필요)' : '초과',
        piLimit: pv.pi,
        warnLimit: pv.warn
      });
    }
  }

  // count 많은 순, fp 적은 순 정렬
  return results.sort((a, b) => b.count - a.count || a.fp - b.fp);
}

/**
 * 주어진 입수량(qty)에 대해 가능한 모든 (열 × 행 × 단) 분해 목록 생성 및 컨테이너 적합성 사전 판정
 */
export function generateArrangementOptions(targetQty, maxLayers = 5, unitBox = null, containerBox = null) {
  if (!targetQty || targetQty <= 0) return [];
  const options = [];
  const seen = new Set();

  for (let l = 1; l <= maxLayers; l++) {
    if (targetQty % l !== 0) continue;
    const planar = targetQty / l;
    for (let r = 1; r <= planar; r++) {
      if (planar % r !== 0) continue;
      const c = planar / r;
      const key = `${c}x${r}x${l}`;
      if (!seen.has(key)) {
        seen.add(key);
        const opt = {
          cols: c,
          rows: r,
          layers: l,
          qty: targetQty,
          label: `${c}열 × ${r}행 × ${l}단 (${targetQty}개입)`
        };

        if (unitBox && containerBox && unitBox.w > 0 && containerBox.w > 0) {
          const val = validateArrangement(unitBox, containerBox, opt, { w: 0, d: 0, h: 0 });
          opt.status = val.status;
          opt.statusLabel = val.statusLabel;
          opt.fitsRotated = val.fitsRotated;
          opt.reason = val.reason;
        } else {
          opt.status = 'ok';
          opt.statusLabel = '적합';
        }

        options.push(opt);
      }
    }
  }

  // 정렬 기준: 1순위 적합(ok/warn), 2순위 단수 오름차순, 3순위 행/열 정방형에 가까운 순
  return options.sort((a, b) => {
    const scoreA = a.status === 'ok' ? 0 : (a.status === 'warn' ? 1 : 2);
    const scoreB = b.status === 'ok' ? 0 : (b.status === 'warn' ? 1 : 2);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.layers - b.layers || Math.abs(a.cols - a.rows) - Math.abs(b.cols - b.rows);
  });
}

/**
 * 단상자 크기와 아웃박스/인박스 크기 대비 사용자 지정 배열(cols × rows × layers)의 물리적 적합성 검증
 * 정방향 및 90도 회전 배치를 모두 자동 검사하여 판정
 */
export function validateArrangement(unitBox, containerBox, arrangement, gap = { w: 0, d: 0, h: 0 }) {
  if (!unitBox || !containerBox || !arrangement) {
    return { valid: false, status: 'ng', statusLabel: '초과', reason: '치수 또는 배열 정보가 누락되었습니다.' };
  }

  const { w: uw, d: ud, h: uh } = unitBox;
  const { w: cw, d: cd, h: ch } = containerBox;
  const { cols, rows, layers } = arrangement;

  if (!uw || !ud || !uh || !cw || !cd || !ch || !cols || !rows || !layers) {
    return { valid: false, status: 'ng', statusLabel: '초과', reason: '모든 수치(가로/세로/높이 및 열/행/단)는 0보다 커야 합니다.' };
  }

  const gW = gap.w || 0;
  const gD = gap.d || 0;
  const gH = gap.h || 0;

  // 방향 1: 정방향 (uw가 cols 방향, ud가 rows 방향)
  const needW1 = cols * uw + gW;
  const needD1 = rows * ud + gD;
  const needH1 = layers * uh + gH;
  const fits1 = needW1 <= cw && needD1 <= cd && needH1 <= ch;

  // 방향 2: 90도 수평 회전 (ud가 cols 방향, uw가 rows 방향)
  const needW2 = cols * ud + gW;
  const needD2 = rows * uw + gD;
  const needH2 = layers * uh + gH;
  const fits2 = needW2 <= cw && needD2 <= cd && needH2 <= ch;

  // 방향 3: 측면 눕힘 (uw가 cols 방향, uh가 rows 방향, ud가 layers 방향)
  const needW3 = cols * uw + gW;
  const needD3 = rows * uh + gD;
  const needH3 = layers * ud + gH;
  const fits3 = needW3 <= cw && needD3 <= cd && needH3 <= ch;

  // 방향 4: 측면 눕힘 90도 회전 (uh가 cols 방향, uw가 rows 방향, ud가 layers 방향)
  const needW4 = cols * uh + gW;
  const needD4 = rows * uw + gD;
  const needH4 = layers * ud + gH;
  const fits4 = needW4 <= cw && needD4 <= cd && needH4 <= ch;

  if (fits1 || fits2 || fits3 || fits4) {
    const selectedW = fits1 ? needW1 : (fits2 ? needW2 : (fits3 ? needW3 : needW4));
    const selectedD = fits1 ? needD1 : (fits2 ? needD2 : (fits3 ? needD3 : needD4));
    const selectedH = fits1 ? needH1 : (fits2 ? needH2 : (fits3 ? needH3 : needH4));

    return {
      valid: true,
      status: 'ok',
      statusLabel: '적합',
      fitsRotated: !fits1 && fits2,
      actualNeeded: { w: selectedW, d: selectedD, h: selectedH },
      reason: null
    };
  }

  // 약간의 공차(5% 또는 10mm 이내) 허용 시 경고 판정
  const minW = Math.min(needW1, needW2);
  const minD = Math.min(needD1, needD2);
  const minH = Math.min(needH1, needH2);

  const diffW = minW - cw;
  const diffD = minD - cd;
  const diffH = minH - ch;

  if (diffW <= 10 && diffD <= 10 && diffH <= 10 && (diffW > 0 || diffD > 0 || diffH > 0)) {
    return {
      valid: true,
      status: 'warn',
      statusLabel: '주의',
      fitsRotated: !fits1 && fits2,
      actualNeeded: { w: minW, d: minD, h: minH },
      reason: `내부 규격 경계: 가로/세로 여유공간 최소 (${Math.round(Math.max(0, diffW, diffD, diffH))}mm 차이)`
    };
  }

  // 불일치 시 구체적인 초과 치수 설명 생성
  const reasons = [];
  if (minW > cw) reasons.push(`가로 ${Math.round(minW - cw)}mm 초과 (필요 ${Math.round(minW)}mm > 박스 ${cw}mm)`);
  if (minD > cd) reasons.push(`세로 ${Math.round(minD - cd)}mm 초과 (필요 ${Math.round(minD)}mm > 박스 ${cd}mm)`);
  if (minH > ch) reasons.push(`높이 ${Math.round(minH - ch)}mm 초과 (필요 ${Math.round(minH)}mm > 박스 ${ch}mm)`);

  return {
    valid: false,
    status: 'ng',
    statusLabel: '초과',
    reason: `아웃박스 내부 규격 초과: ${reasons.join(', ')}`,
    actualNeeded: { w: minW, d: minD, h: minH }
  };
}

/**
 * 인박스 내 단상자 배열 검증
 */
export function validateInboxArrangement(unitBox, inbox, arrangement, gap = { w: 0, d: 0, h: 0 }) {
  return validateArrangement(unitBox, inbox, arrangement, gap);
}

