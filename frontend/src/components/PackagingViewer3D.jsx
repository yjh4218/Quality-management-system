import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

/**
 * 3D 포장 및 팔레트 적재 뷰어 (PackagingViewer3D)
 * Three.js 기반 인박스/아웃박스 입수 및 팔레트 적재 실시간 3D 렌더러
 */
const parseViewConfig = (cfg) => {
  if (!cfg) return null;
  if (typeof cfg === 'object') {
    if (typeof cfg.theta === 'number' && typeof cfg.phi === 'number') {
      return {
        theta: Number(cfg.theta),
        phi: Number(cfg.phi),
        dist: typeof cfg.dist === 'number' ? Number(cfg.dist) : 3.8,
        lookY: typeof cfg.lookY === 'number' ? Number(cfg.lookY) : 0.3
      };
    }
  }
  if (typeof cfg === 'string') {
    try {
      const parsed = JSON.parse(cfg);
      if (parsed && typeof parsed.theta === 'number' && typeof parsed.phi === 'number') {
        return {
          theta: Number(parsed.theta),
          phi: Number(parsed.phi),
          dist: typeof parsed.dist === 'number' ? Number(parsed.dist) : 3.8,
          lookY: typeof parsed.lookY === 'number' ? Number(parsed.lookY) : 0.3
        };
      }
    } catch (e) {}
  }
  return null;
};

const PackagingViewer3D = forwardRef(function PackagingViewer3D({
  mode = 'pallet-cross', // 'inbox' | 'outbox' | 'pallet-cross' | 'pallet-normal'
  unitBox = { w: 70, d: 40, h: 140 }, // 단상자 치수 (mm)
  inbox = null, // { w, d, h } 인박스 치수 (mm)
  outbox = { w: 300, d: 200, h: 150 }, // 아웃박스 치수 (mm)
  arrangement = { cols: 4, rows: 5, layers: 2 }, // 열x행x단 (단상자 또는 인박스 입수)
  inboxArrangement = { cols: 2, rows: 5, layers: 1 }, // 인박스 내부 단상자 배열
  useInbox = false, // 인박스 사용 여부
  hasPop = false, // 단상자 POP 적용 여부
  popHeight = 15, // POP 높이 mm (기본 15mm)
  useAirCap = false, // 비닐에어캡(뽁뽁이) 완충재 사용 여부
  useCornerPost = false, // 팔레트 코너 각대 적용 여부
  palletConfig = { w: 1100, d: 1100, pattern: null, stacks: 8 },
  savedViewConfig = null,
  onViewChange = null,
  onCapture = null,
  height = 380,
  style = {}
}, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    animFrame: null,
    theta: 0.65,
    phi: 0.40,
    dist: 3.8,
    tgtTheta: 0.65,
    tgtPhi: 0.40,
    tgtDist: 3.8,
    lookY: 0.3,
    tgtLookY: 0.3,
    isDragging: false,
    lx: 0,
    ly: 0,
    touchDist: null,
    hasCustomAngle: false,
    currentMode: mode
  });

  // ── Sync Saved View Config / Mode Changes ──
  useEffect(() => {
    const s = stateRef.current;
    const parsed = parseViewConfig(savedViewConfig);
    if (parsed) {
      s.tgtTheta = parsed.theta;
      s.tgtPhi = parsed.phi;
      s.tgtDist = parsed.dist;
      s.tgtLookY = parsed.lookY;
      s.hasCustomAngle = true;
    } else if (s.currentMode !== mode) {
      s.hasCustomAngle = false;
    }
    s.currentMode = mode;
  }, [mode, savedViewConfig]);

  const [isCapturing, setIsCapturing] = useState(false);

  // ── Procedural Eco Green Air Pillow Texture Generator (실제 현장 에어쿠션 100% 동일 구현) ──
  const airPillowTextureRef = useRef(null);
  const getEcoAirPillowTexture = () => {
    if (airPillowTextureRef.current) return airPillowTextureRef.current;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // 1. Semi-translucent lime-green vinyl base with plastic sheen gradient (사진 실물 색상)
      const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
      bgGrad.addColorStop(0, 'rgba(187, 247, 208, 0.88)'); // #bbf7d0
      bgGrad.addColorStop(0.5, 'rgba(134, 239, 172, 0.78)'); // #86efac
      bgGrad.addColorStop(1, 'rgba(74, 222, 128, 0.82)'); // #4ade80
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 512, 512);

      // 2. Heat-sealed perimeter border lines (실링 테두리)
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.75)';
      ctx.lineWidth = 14;
      ctx.strokeRect(12, 12, 488, 488);

      // Dotted crimping lines on top/bottom seal
      ctx.fillStyle = 'rgba(21, 128, 61, 0.70)';
      for (let x = 20; x < 490; x += 16) {
        ctx.fillRect(x, 14, 8, 10);
        ctx.fillRect(x, 488, 8, 10);
      }

      // 3. Realistic Green Branding / Eco-Leaf / AirSpeed print
      ctx.fillStyle = 'rgba(21, 128, 61, 0.85)';
      ctx.textAlign = 'center';

      // Oval branding seal
      ctx.beginPath();
      ctx.ellipse(256, 210, 110, 48, -0.05, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(21, 128, 61, 0.85)';
      ctx.stroke();

      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('AIRSPEED', 256, 218);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('ECO AIR CUSHION', 256, 246);

      // Recycling symbol & leaf
      ctx.font = '22px sans-serif';
      ctx.fillText('♳ 100% RECYCLABLE', 256, 310);

      // Elegant wave curve (as seen in photo)
      ctx.beginPath();
      ctx.moveTo(80, 360);
      ctx.bezierCurveTo(180, 320, 320, 400, 430, 350);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(22, 163, 74, 0.65)';
      ctx.stroke();

      // 4. Diagonal plastic reflection / specular sheen
      const sheenGrad = ctx.createLinearGradient(0, 0, 512, 512);
      sheenGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.40)');
      sheenGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.50)');
      sheenGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, 512, 512);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      airPillowTextureRef.current = tex;
      return tex;
    } catch (e) {
      return null;
    }
  };

  // ── Helper: 3D Box Mesh ──
  const makeBox = (scene, w, d, h, color, x, y, z, roughness = 0.50, metalness = 0.02, opacity = 1.0) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      transparent: opacity < 1.0,
      opacity
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geo, 15);
    const lmat = new THREE.LineBasicMaterial({
      color: opacity < 1.0 ? 0xffffff : 0x78350F,
      transparent: true,
      opacity: opacity < 1.0 ? 0.85 : 0.35
    });
    mesh.add(new THREE.LineSegments(edges, lmat));
    return mesh;
  };

  // ── Helper: Unit Box with POP Flap (1순위: 벽 마주보기, 2순위: 제품끼리 마주보기) ──
  const makeUnitBoxWithPop = (scene, uw, ud, uh, color, px, py, pz, rowIdx, totalRows, hasPopFlag, popHVal, sc, forceWallFacing = null) => {
    const mesh = makeBox(scene, uw, ud, uh, color, px, py, pz, 0.50, 0.02);
    if (hasPopFlag) {
      const popThickness = Math.max(ud * 0.09, 0.003);
      const popH = Math.max((popHVal || 15) * sc, 0.012); // POP 기본 15mm
      
      let isFacingRear;
      if (forceWallFacing !== null) {
        isFacingRear = forceWallFacing;
      } else if (totalRows === 1) {
        isFacingRear = false;
      } else if (totalRows === 2) {
        isFacingRear = (rowIdx === 1);
      } else {
        if (rowIdx === 0) {
          isFacingRear = false;
        } else if (rowIdx === totalRows - 1) {
          isFacingRear = true;
        } else {
          isFacingRear = (rowIdx % 2 === 1);
        }
      }

      const popZ = isFacingRear ? (pz + ud - popThickness) : pz;
      const popColor = 0xFF2D55; // 선명한 비비드 로즈 마젠타 POP 헤더
      const popGeo = new THREE.BoxGeometry(uw * 0.96, popH, popThickness);
      const popMat = new THREE.MeshStandardMaterial({
        color: popColor,
        roughness: 0.35,
        metalness: 0.1
      });
      const popMesh = new THREE.Mesh(popGeo, popMat);
      popMesh.position.set(px + uw / 2, py + uh + popH / 2, popZ + popThickness / 2);
      popMesh.castShadow = true;
      popMesh.receiveShadow = true;
      scene.add(popMesh);

      const eGeo = new THREE.EdgesGeometry(popGeo, 10);
      popMesh.add(new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 })));
    }
    return mesh;
  };

  // ── Helper: 3D Puffed Air Pillow Mesh (실제 현장 사진 2와 동일한 볼록한 베개 형태) ──
  const makeSingleAirPillow = (scene, pw, pd, ph, px, py, pz, rotY = 0) => {
    // 16x4x16 서브디비전 박스에 버텍스 변위 적용하여 부풀어오른 입체 에어필로우 형상화
    const geo = new THREE.BoxGeometry(pw, ph, pd, 16, 4, 16);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      // 0 ~ 1 정규화 좌표
      const nx = (vx / (pw / 2) + 1) / 2;
      const nz = (vz / (pd / 2) + 1) / 2;

      // 사인 곡선 기반 부풀림(Dome Curvature)
      const dome = Math.sin(Math.max(0, Math.min(1, nx)) * Math.PI) * Math.sin(Math.max(0, Math.min(1, nz)) * Math.PI);
      const bulgeFactor = Math.pow(dome, 0.65);

      if (vy > 0) {
        pos.setY(i, vy + bulgeFactor * (ph * 0.95));
      } else {
        pos.setY(i, vy - bulgeFactor * (ph * 0.20));
      }
    }
    geo.computeVertexNormals();

    const tex = getEcoAirPillowTexture();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x86EFAC, // 친환경 라이트 라임 그린 (실물 사진 일치)
      map: tex || undefined,
      transparent: true,
      opacity: 0.78,
      roughness: 0.08,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px + pw / 2, py + ph / 2, pz + pd / 2);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 테두리 실링선 라인
    const seamEdges = new THREE.EdgesGeometry(geo, 22);
    mesh.add(new THREE.LineSegments(seamEdges, new THREE.LineBasicMaterial({ color: 0x16A34A, transparent: true, opacity: 0.88 })));

    // 상단 팽창 반사광 리지 (Shiny Highlight)
    const ridgeGeo = new THREE.BoxGeometry(pw * 0.80, ph * 0.06, pd * 0.80);
    const ridgeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35 });
    const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridgeMesh.position.set(0, ph * 0.85, 0);
    mesh.add(ridgeMesh);

    scene.add(mesh);
    return mesh;
  };

  // ── Helper: Realistic Air Cushion Array (단상자 cols x rows 격자와 1:1로 완벽히 일치하는 개별 에어필로우) ──
  const makeAirCapBuffer = (scene, padW, padD, padH, px, py, pz, isPopVoid = false, cols = 1, rows = 1) => {
    const group = new THREE.Group();

    // 단상자 가로(열) 및 세로(행) 배치 규격에 맞춰 1:1로 정확히 분할
    const nCols = Math.max(cols || 1, 1);
    const nRows = Math.max(rows || 1, 1);

    const cellW = padW / nCols;
    const cellD = padD / nRows;
    const pillowGap = 0.008; // 에어필로우 간 경계 분리 유격
    const pillowW = Math.max(cellW - pillowGap, 0.012);
    const pillowD = Math.max(cellD - pillowGap, 0.012);
    const pillowH = Math.max(padH * 1.05, 0.022); // 푹신하고 볼록한 두께감

    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const cx = px + c * cellW + (cellW - pillowW) / 2;
        const cz = pz + r * cellD + (cellD - pillowD) / 2;
        const rot = (c + r) % 2 === 1 ? 0.01 : -0.01; // 자연스러운 미세 안착
        makeSingleAirPillow(scene, pillowW, pillowD, pillowH, cx, py, cz, rot);
      }
    }

    return group;
  };

  // ── Helper: Pallet Corner Posts (실제 적재 박스타워 4모서리 절대좌표 정밀 밀착 피팅 + Z-Fighting 방지) ──
  const makeCornerPostsAndStraps = (scene, boundMinX, boundMaxX, boundMinZ, boundMaxZ, totalHeight, baseY, sc) => {
    const stackWidth = boundMaxX - boundMinX;
    const stackDepth = boundMaxZ - boundMinZ;
    const angleWidth = Math.min(0.080, Math.max(0.030, Math.min(stackWidth, stackDepth) * 0.22)); // 적재 박스에 비례한 L-flange 너비
    const angleThickness = 0.010; // 10mm board thickness
    const postH = totalHeight;
    const postColor = 0xF59E0B; // Vibrant safety gold kraft
    const eps = 0.0015; // 1.5mm outward offset to eliminate Z-fighting completely

    const W = angleWidth;
    const T = angleThickness;

    const pMat = new THREE.MeshStandardMaterial({
      color: postColor,
      roughness: 0.45,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xEA580C, // Safety Orange
      roughness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -3.0,
      polygonOffsetUnits: -5.0
    });

    const capH = 0.035;

    // 4 Corner configurations (Front-Left, Front-Right, Rear-Right, Rear-Left)
    const corners = [
      // 1. Front-Left (FL: x = boundMinX, z = boundMinZ)
      {
        fx: { x: boundMinX + W / 2 - T / 2, y: baseY + postH / 2, z: boundMinZ - T / 2 - eps, w: W + T, h: postH, d: T },
        fz: { x: boundMinX - T / 2 - eps, y: baseY + postH / 2, z: boundMinZ + W / 2 - T / 2, w: T, h: postH, d: W + T },
        cap1: { x: boundMinX + W / 2 - T / 2, y: baseY + postH - capH / 2, z: boundMinZ - T / 2 - eps, w: W + T + 0.004, h: capH, d: T + 0.004 },
        cap2: { x: boundMinX - T / 2 - eps, y: baseY + postH - capH / 2, z: boundMinZ + W / 2 - T / 2, w: T + 0.004, h: capH, d: W + T + 0.004 }
      },
      // 2. Front-Right (FR: x = boundMaxX, z = boundMinZ)
      {
        fx: { x: boundMaxX - W / 2 + T / 2, y: baseY + postH / 2, z: boundMinZ - T / 2 - eps, w: W + T, h: postH, d: T },
        fz: { x: boundMaxX + T / 2 + eps, y: baseY + postH / 2, z: boundMinZ + W / 2 - T / 2, w: T, h: postH, d: W + T },
        cap1: { x: boundMaxX - W / 2 + T / 2, y: baseY + postH - capH / 2, z: boundMinZ - T / 2 - eps, w: W + T + 0.004, h: capH, d: T + 0.004 },
        cap2: { x: boundMaxX + T / 2 + eps, y: baseY + postH - capH / 2, z: boundMinZ + W / 2 - T / 2, w: T + 0.004, h: capH, d: W + T + 0.004 }
      },
      // 3. Rear-Right (BR: x = boundMaxX, z = boundMaxZ)
      {
        fx: { x: boundMaxX - W / 2 + T / 2, y: baseY + postH / 2, z: boundMaxZ + T / 2 + eps, w: W + T, h: postH, d: T },
        fz: { x: boundMaxX + T / 2 + eps, y: baseY + postH / 2, z: boundMaxZ - W / 2 + T / 2, w: T, h: postH, d: W + T },
        cap1: { x: boundMaxX - W / 2 + T / 2, y: baseY + postH - capH / 2, z: boundMaxZ + T / 2 + eps, w: W + T + 0.004, h: capH, d: T + 0.004 },
        cap2: { x: boundMaxX + T / 2 + eps, y: baseY + postH - capH / 2, z: boundMaxZ - W / 2 + T / 2, w: T + 0.004, h: capH, d: W + T + 0.004 }
      },
      // 4. Rear-Left (BL: x = boundMinX, z = boundMaxZ)
      {
        fx: { x: boundMinX + W / 2 - T / 2, y: baseY + postH / 2, z: boundMaxZ + T / 2 + eps, w: W + T, h: postH, d: T },
        fz: { x: boundMinX - T / 2 - eps, y: baseY + postH / 2, z: boundMaxZ - W / 2 + T / 2, w: T, h: postH, d: W + T },
        cap1: { x: boundMinX + W / 2 - T / 2, y: baseY + postH - capH / 2, z: boundMaxZ + T / 2 + eps, w: W + T + 0.004, h: capH, d: T + 0.004 },
        cap2: { x: boundMinX - T / 2 - eps, y: baseY + postH - capH / 2, z: boundMaxZ - W / 2 + T / 2, w: T + 0.004, h: capH, d: W + T + 0.004 }
      }
    ];

    corners.forEach(c => {
      // Flange X
      const geoX = new THREE.BoxGeometry(c.fx.w, c.fx.h, c.fx.d);
      const meshX = new THREE.Mesh(geoX, pMat);
      meshX.position.set(c.fx.x, c.fx.y, c.fx.z);
      meshX.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoX), new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 })));
      scene.add(meshX);

      // Flange Z
      const geoZ = new THREE.BoxGeometry(c.fz.w, c.fz.h, c.fz.d);
      const meshZ = new THREE.Mesh(geoZ, pMat);
      meshZ.position.set(c.fz.x, c.fz.y, c.fz.z);
      meshZ.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoZ), new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 })));
      scene.add(meshZ);

      // Top Safety Cap
      const capGeo1 = new THREE.BoxGeometry(c.cap1.w, c.cap1.h, c.cap1.d);
      const capMesh1 = new THREE.Mesh(capGeo1, capMat);
      capMesh1.position.set(c.cap1.x, c.cap1.y, c.cap1.z);
      scene.add(capMesh1);

      const capGeo2 = new THREE.BoxGeometry(c.cap2.w, c.cap2.h, c.cap2.d);
      const capMesh2 = new THREE.Mesh(capGeo2, capMat);
      capMesh2.position.set(c.cap2.x, c.cap2.y, c.cap2.z);
      scene.add(capMesh2);
    });
  };

  // ── Helper: Wood Pallet Mesh (표준 150mm 목재 팔레트 + 사방 35mm 오버행 데크로 시인성 극대화) ──
  const makePalletMesh = (scene, pw, pd, sc, baseY) => {
    // 적재 박스보다 사방 35mm씩 넉넉한 데크 오버행 부여 (가려짐 방지)
    const palW = (pw + 70) * sc;
    const palD = (pd + 70) * sc;
    const pH = 0.150; // 표준 팔레트 150mm 높이
    const topPlankH = 0.032; // 32mm 상판 데크
    const blockH = 0.086; // 86mm 지지목 블록 (지게차 4방향 포크홀)
    const botPlankH = 0.032; // 32mm 하판 데크

    const woodColors = [0xD97706, 0xC47228, 0xB45309]; // 따뜻하고 선명한 내추럴 파인 우드
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x78350F, transparent: true, opacity: 0.75 });

    // 1. Top Deck Planks (상판 목재 판자 7개)
    const nPlanks = 7;
    const spacing = palW / nPlanks;
    for (let i = 0; i < nPlanks; i++) {
      const plankW = spacing * 0.88;
      const geo = new THREE.BoxGeometry(plankW, topPlankH, palD);
      const mat = new THREE.MeshStandardMaterial({ color: woodColors[i % 3], roughness: 0.80, metalness: 0.02 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(-palW / 2 + spacing * (i + 0.5), baseY + pH - topPlankH / 2, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat));
      scene.add(m);
    }

    // 2. 9 Solid Spacer Blocks (3x3 지지목 블록 - 4방향 지게차 포크홀 형성)
    const bW = palW * 0.16;
    const bD = palD * 0.16;
    const xOffsets = [-palW * 0.40, 0, palW * 0.40];
    const zOffsets = [-palD * 0.40, 0, palD * 0.40];

    xOffsets.forEach(bx => {
      zOffsets.forEach(bz => {
        const geo = new THREE.BoxGeometry(bW, blockH, bD);
        const mat = new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.85, metalness: 0 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(bx, baseY + botPlankH + blockH / 2, bz);
        m.castShadow = true;
        m.receiveShadow = true;
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), edgeMat));
        scene.add(m);
      });
    });

    // 3. Bottom Runner Planks (하판 스키드 판자 3개)
    xOffsets.forEach(bx => {
      const geo = new THREE.BoxGeometry(bW * 1.05, botPlankH, palD);
      const mat = new THREE.MeshStandardMaterial({ color: 0xB45309, roughness: 0.85, metalness: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(bx, baseY + botPlankH / 2, 0);
      m.receiveShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat));
      scene.add(m);
    });

    return baseY + pH;
  };

  // ── Helper: Get 3D Box Positions for Selected Pallet Pattern ──
  const getPalletPatternPositions = (pattern, pw, pd, sc) => {
    if (pattern && Array.isArray(pattern.positions) && pattern.positions.length > 0) {
      const maxX = pattern.positions.reduce((m, p) => Math.max(m, p[0] + p[2]), 0);
      const maxZ = pattern.positions.reduce((m, p) => Math.max(m, p[1] + p[3]), 0);
      const totalW = (maxX || pw) * sc;
      const totalD = (maxZ || pd) * sc;
      const offsetX = -totalW / 2;
      const offsetZ = -totalD / 2;
      return pattern.positions.map(([bx, bz, bw, bd]) => ({
        x: offsetX + bx * sc,
        z: offsetZ + bz * sc,
        w: bw * sc,
        d: bd * sc
      }));
    }

    // 기본 8방 격자 폴백
    const cols = 4;
    const rows = 2;
    const cellW = (pw * 0.96 / cols) * sc;
    const cellD = (pd * 0.96 / rows) * sc;
    const offsetX = -(cols * cellW) / 2;
    const offsetZ = -(rows * cellD) / 2;
    const fallbackPositions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        fallbackPositions.push({
          x: offsetX + c * cellW,
          z: offsetZ + r * cellD,
          w: cellW,
          d: cellD
        });
      }
    }
    return fallbackPositions;
  };

  // ── Helper: Interlocking (Cross Stacking) Transformation for Odd Layers ──
  const getInterlockedBox = (bx, bz, bw, bd, patternCategory, palWSc, palDSc) => {
    // 1. 핀휠 패턴인 경우 (또는 기본 핀휠): 좌우 반전(Mirroring X)으로 시계방향 ↔ 반시계방향 핀휠로 반전되어 완벽한 90도 교차 결속 형성
    if (!patternCategory || patternCategory === 'pinwheel') {
      const cx = bx + bw / 2;
      const cz = bz + bd / 2;
      const ncx = -cx; // X축 거울 대칭 반전
      const ncz = cz;
      return {
        x: ncx - bw / 2,
        z: ncz - bd / 2,
        w: bw,
        d: bd
      };
    }

    // 2. 격자(Grid) / 벽돌(Brick) / 혼합(Mix) 패턴인 경우: 90도 중심 회전
    const cx = bx + bw / 2;
    const cz = bz + bd / 2;
    const ncx = -cz;
    const ncz = cx;
    const nbw = bd;
    const nbd = bw;
    return {
      x: ncx - nbw / 2,
      z: ncz - nbd / 2,
      w: nbw,
      d: nbd
    };
  };

  const stretchToFit = (positions, pw, pd) => {
    if (!positions || !positions.length) return [];
    const maxX = positions.reduce((m, p) => Math.max(m, p[0] + p[2]), 0);
    const maxZ = positions.reduce((m, p) => Math.max(m, p[1] + p[3]), 0);
    if (!maxX || !maxZ) return positions;
    const sx = pw / maxX, sz = pd / maxZ;
    return positions.map(([px, py, bw, bd]) => [px * sx, py * sz, bw * sx, bd * sz]);
  };

  // ── Build Scene Contents ──
  const buildScene = useCallback(() => {
    const s = stateRef.current;
    if (!s.scene) return;

    // Clear previous meshes except lights & ground
    while (s.scene.children.length > 7) {
      const obj = s.scene.children[7];
      s.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    // 화사하고 밝은 크라프트 박스 색상 팔레트
    const brightKraftPalette = [
      [0xE6AA68, 0xD4924A], // 황금빛 크라프트 A / B
      [0xF3BE82, 0xC47E33], // 베이지 크라프트 / 브라운
      [0xE2A562, 0xCC883E]  // 내추럴 크라프트
    ];

    if (mode === 'inbox') {
      // ── Inbox 3D Mode ──
      const ibw = (inbox?.w || unitBox.w * arrangement.cols + 16) || 120;
      const ibd = (inbox?.d || unitBox.d * arrangement.rows + 16) || 120;
      const ibh = (inbox?.h || unitBox.h * arrangement.layers + 16) || 150;
      const cols = arrangement.cols || 1;
      const rows = arrangement.rows || 1;
      const layers = arrangement.layers || 1;

      const sc = Math.min(0.014, 3.8 / Math.max(ibw, ibd));
      const bw = ibw * sc, bd = ibd * sc, bh = ibh * sc;

      // Outer container (Inbox frame)
      const oGeo = new THREE.BoxGeometry(bw, bh, bd);
      const oMat = new THREE.MeshStandardMaterial({
        color: 0x7C3AED,
        transparent: true,
        opacity: 0.12,
        roughness: 0.4,
        metalness: 0.15,
        depthWrite: false
      });
      const oMesh = new THREE.Mesh(oGeo, oMat);
      oMesh.position.set(0, bh / 2, 0);
      s.scene.add(oMesh);
      oMesh.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(oGeo, 5),
        new THREE.LineBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.95 })
      ));

      const vGapW = Math.min(16 * sc, bw * 0.15);
      const vGapD = Math.min(16 * sc, bd * 0.15);
      const vGapH = Math.min(16 * sc, bh * 0.15);
      const uwsc = (bw - vGapW) / cols;
      const udsc = (bd - vGapD) / rows;
      const uhsc = (bh - vGapH) / layers;
      const px0 = -bw / 2 + vGapW / 2;
      const pz0 = -bd / 2 + vGapD / 2;
      const py0 = vGapH / 2;

      for (let lz = 0; lz < layers; lz++) {
        for (let ry = 0; ry < rows; ry++) {
          for (let cx = 0; cx < cols; cx++) {
            const [colA, colB] = brightKraftPalette[lz % brightKraftPalette.length];
            const col = (cx + ry) % 2 === 0 ? colA : colB;
            const gap3d = 0.01;
            makeUnitBoxWithPop(
              s.scene,
              uwsc - gap3d, udsc - gap3d, uhsc - gap3d * 0.5,
              col,
              px0 + cx * uwsc, py0 + lz * uhsc, pz0 + ry * udsc,
              ry,
              rows,
              hasPop,
              popHeight,
              sc
            );
          }
        }
      }

      // Air Cushion: 상단 완충 에어필로우 쿠션(단상자 cols x rows와 1:1 일치)으로 POP 상단 빈 공간 완벽 충진
      if (useAirCap) {
        const popH = Math.max((popHeight || 15) * sc, 0.012);
        const padW = bw - vGapW;
        const padD = bd - vGapD;
        const padH = hasPop ? popH : 0.024;
        const padY = py0 + layers * uhsc;
        makeAirCapBuffer(s.scene, padW, padD, padH, px0, padY, pz0, hasPop, cols, rows);
      }

      const popH = Math.max((popHeight || 15) * sc, 0.012);
      const totalHeight = bh + (hasPop ? popH : (useAirCap ? (hasPop ? popH : 0.024) : 0));
      const maxDim = Math.max(bw, bd, totalHeight);
      const defaultDist = Math.max(maxDim * 2.2, 1.8);
      const defaultLookY = totalHeight * 0.50;
      const defaultPhi = 0.95; // 약 35° 아이소메트릭 앙각으로 전면/측면 입체감과 상단 배열을 균형 있게 노출
      const defaultTheta = 0.68;
      if (!s.hasCustomAngle) {
        s.tgtDist = defaultDist;
        s.tgtLookY = defaultLookY;
        s.tgtPhi = defaultPhi;
        s.tgtTheta = defaultTheta;
      }

    } else if (mode === 'outbox') {
      // ── Outbox 3D Mode ──
      const obw = outbox?.w || 300;
      const obd = outbox?.d || 200;
      const obh = outbox?.h || 150;
      const cols = arrangement.cols || 1;
      const rows = arrangement.rows || 1;
      const layers = arrangement.layers || 1;

      const sc = Math.min(0.014, 4.0 / Math.max(obw, obd));
      const bw = obw * sc, bd = obd * sc, bh = obh * sc;

      // Outer Box (Clean Blue Frame)
      const oGeo = new THREE.BoxGeometry(bw, bh, bd);
      const oMat = new THREE.MeshStandardMaterial({
        color: 0x2563EB,
        transparent: true,
        opacity: 0.08,
        roughness: 0.35,
        metalness: 0.15,
        depthWrite: false
      });
      const oMesh = new THREE.Mesh(oGeo, oMat);
      oMesh.position.set(0, bh / 2, 0);
      s.scene.add(oMesh);
      oMesh.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(oGeo, 5),
        new THREE.LineBasicMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.95 })
      ));

      const vGapW = Math.min(26 * sc, bw * 0.18);
      const vGapD = Math.min(26 * sc, bd * 0.18);
      const vGapH = Math.min(26 * sc, bh * 0.18);
      const cellW = (bw - vGapW) / cols;
      const cellD = (bd - vGapD) / rows;
      const cellH = (bh - vGapH) / layers;
      const px0 = -bw / 2 + vGapW / 2;
      const pz0 = -bd / 2 + vGapD / 2;
      const py0 = vGapH / 2;

      if (useInbox) {
        // ── Case A: Outbox containing distinct solid Inboxes (인박스 실물 골판지 박스 형태 렌더링) ──
        let inboxIndex = 1;
        const totalInboxes = cols * rows * layers;

        for (let lz = 0; lz < layers; lz++) {
          for (let ry = 0; ry < rows; ry++) {
            for (let cx = 0; cx < cols; cx++) {
              const ibX = px0 + cx * cellW;
              const ibY = py0 + lz * cellH;
              const ibZ = pz0 + ry * cellD;
              const gapIb = 0.014;
              const ibW = cellW - gapIb;
              const ibH = cellH - gapIb * 0.5;
              const ibD = cellD - gapIb;

              // 1. Solid Kraft Corrugated Inbox Box Body (실물 골판지 인박스 형태)
              const ibColor = (cx + ry + lz) % 2 === 0 ? 0xE6AA68 : 0xD4924A;
              const ibMesh = makeBox(s.scene, ibW, ibD, ibH, ibColor, ibX, ibY, ibZ, 0.65, 0.02, 0.95);

              // 2. Center Top Sealing Tape Line (골판지 박스 상단 중앙 테이핑)
              const tapeW = ibW * 0.96;
              const tapeD = Math.min(ibD * 0.16, 0.024);
              const tapeH = 0.002;
              const tapeGeo = new THREE.BoxGeometry(tapeW, tapeH, tapeD);
              const tapeMat = new THREE.MeshStandardMaterial({ color: 0xB45309, roughness: 0.25, metalness: 0.1 });
              const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
              tapeMesh.position.set(ibX + ibW / 2, ibY + ibH + tapeH / 2, ibZ + ibD / 2);
              s.scene.add(tapeMesh);

              // 3. Clear Side Shipping / Barcode Label (측면 현품표 스티커)
              const lblW = ibW * 0.45;
              const lblH = ibH * 0.40;
              const lblThick = 0.002;
              const lblGeo = new THREE.BoxGeometry(lblW, lblH, lblThick);
              const lblMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3, metalness: 0.05 });
              const lblMesh = new THREE.Mesh(lblGeo, lblMat);
              lblMesh.position.set(ibX + ibW * 0.70, ibY + ibH * 0.50, ibZ + ibD + lblThick / 2);
              s.scene.add(lblMesh);

              // 4. White Clean Grid/Edge Outline on each inbox for crisp contrast
              const ibEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(ibW, ibH, ibD), 12);
              const ibEdgeMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.90 });
              ibMesh.add(new THREE.LineSegments(ibEdgeGeo, ibEdgeMat));

              // 5. Distinct Number Badge on Inbox (NO.1, NO.2 ...)
              const badgeCanvas = document.createElement('canvas');
              badgeCanvas.width = 128;
              badgeCanvas.height = 64;
              const bCtx = badgeCanvas.getContext('2d');
              bCtx.fillStyle = '#7C3AED'; // Vivid Purple Badge
              bCtx.fillRect(0, 0, 128, 64);
              bCtx.fillStyle = '#FFFFFF';
              bCtx.font = 'bold 32px sans-serif';
              bCtx.textAlign = 'center';
              bCtx.textBaseline = 'middle';
              bCtx.fillText(`IN-${inboxIndex}`, 64, 32);
              const bTex = new THREE.CanvasTexture(badgeCanvas);
              const bMat = new THREE.MeshBasicMaterial({ map: bTex, transparent: true });
              const bGeo = new THREE.PlaneGeometry(ibW * 0.38, ibH * 0.22);
              const bMesh = new THREE.Mesh(bGeo, bMat);
              bMesh.position.set(ibX + ibW * 0.28, ibY + ibH * 0.65, ibZ + ibD + 0.003);
              s.scene.add(bMesh);

              inboxIndex++;
            }
          }
        }

        // Air Cap Cushion: 인박스 적재 상단 빈 공간 완충재 투입 (사진 실물과 100% 동일)
        if (useAirCap) {
          const padW = bw - vGapW;
          const padD = bd - vGapD;
          const padH = 0.028;
          const padY = py0 + layers * cellH;
          makeAirCapBuffer(s.scene, padW, padD, padH, px0, padY, pz0, false, cols, rows);
        }

      } else {
        // ── Case B: Direct Unit Box Packing into Outbox (단상자 아웃박스 직접 수납) ──
        for (let lz = 0; lz < layers; lz++) {
          for (let ry = 0; ry < rows; ry++) {
            for (let cx = 0; cx < cols; cx++) {
              const [colA, colB] = brightKraftPalette[lz % brightKraftPalette.length];
              const col = (cx + ry) % 2 === 0 ? colA : colB;
              const gap3d = 0.01;
              makeUnitBoxWithPop(
                s.scene,
                cellW - gap3d, cellD - gap3d, cellH - gap3d * 0.5,
                col,
                px0 + cx * cellW, py0 + lz * cellH, pz0 + ry * cellD,
                ry,
                rows,
                hasPop,
                popHeight,
                sc
              );
            }
          }
        }

        // Air Cap Cushion: 단상자 cols x rows 격자와 1:1로 일치하는 개별 에어쿠션 완충재 충진
        if (useAirCap) {
          const popH = Math.max((popHeight || 15) * sc, 0.012);
          const padW = bw - vGapW;
          const padD = bd - vGapD;
          const padH = hasPop ? popH : 0.024;
          const padY = py0 + layers * cellH;
          makeAirCapBuffer(s.scene, padW, padD, padH, px0, padY, pz0, hasPop, cols, rows);
        }
      }

      const popH = Math.max((popHeight || 15) * sc, 0.012);
      const totalHeight = bh + (hasPop ? popH : (useAirCap ? 0.024 : 0));
      const maxDim = Math.max(bw, bd, totalHeight);
      const defaultDist = Math.max(maxDim * 2.2, 1.8);
      const defaultLookY = totalHeight * 0.50;
      const defaultPhi = 0.95; // 약 35° 아이소메트릭 앙각으로 전면/측면 입체감과 상단 배열을 균형 있게 노출
      const defaultTheta = 0.68;
      if (!s.hasCustomAngle) {
        s.tgtDist = defaultDist;
        s.tgtLookY = defaultLookY;
        s.tgtPhi = defaultPhi;
        s.tgtTheta = defaultTheta;
      }

    } else {
      // ── Pallet 3D Mode (pallet-cross / pallet-normal) ──
      const isCross = mode === 'pallet-cross';
      const pw = palletConfig?.w || 1100;
      const pd = palletConfig?.d || 1100;
      const stacks = Math.min(palletConfig?.stacks || 8, 20);
      const sc = 0.004;

      const baseY = makePalletMesh(s.scene, pw, pd, sc, 0);
      const obh = (outbox?.h || 150) * sc;

      // Positions from pattern
      const tierPositions = getPalletPatternPositions(palletConfig?.pattern, pw, pd, sc);

      for (let layer = 0; layer < stacks; layer++) {
        const layerY = baseY + layer * obh;
        const [colA, colB] = brightKraftPalette[layer % brightKraftPalette.length];
        const isOddLayer = layer % 2 === 1;

        tierPositions.forEach((box, bIdx) => {
          let bx = box.x;
          let bz = box.z;
          let bw = box.w;
          let bd = box.d;

          if (isCross && isOddLayer) {
            // 홀수단 교차 적재 (Interlocking Stacking: 핀휠은 좌우반전, 격자는 90도 회전)
            const interlocked = getInterlockedBox(bx, bz, bw, bd, palletConfig?.pattern?.category, pw * sc, pd * sc);
            bx = interlocked.x;
            bz = interlocked.z;
            bw = interlocked.w;
            bd = interlocked.d;
          }

          const col = (bIdx + layer) % 2 === 0 ? colA : colB;
          const boxMesh = makeBox(s.scene, bw - 0.006, bd - 0.006, obh - 0.003, col, bx, layerY, bz, 0.60, 0.02, 0.98);

          // Top tape line on outboxes
          const tapeW = bw * 0.95;
          const tapeD = Math.min(bd * 0.15, 0.025);
          const tapeGeo = new THREE.BoxGeometry(tapeW, 0.002, tapeD);
          const tapeMat = new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.3 });
          const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
          tapeMesh.position.set(bx + bw / 2, layerY + obh + 0.001, bz + bd / 2);
          s.scene.add(tapeMesh);
        });
      }

      // Pallet Corner Posts (코너 각대: 실제 적재 박스타워 4모서리에 오렌지/옐로우 보호대 밀착 장착)
      if (useCornerPost) {
        let boundMinX = Infinity, boundMaxX = -Infinity;
        let boundMinZ = Infinity, boundMaxZ = -Infinity;

        tierPositions.forEach((box) => {
          boundMinX = Math.min(boundMinX, box.x);
          boundMaxX = Math.max(boundMaxX, box.x + box.w);
          boundMinZ = Math.min(boundMinZ, box.z);
          boundMaxZ = Math.max(boundMaxZ, box.z + box.d);

          if (isCross) {
            const interlocked = getInterlockedBox(box.x, box.z, box.w, box.d, palletConfig?.pattern?.category, pw * sc, pd * sc);
            boundMinX = Math.min(boundMinX, interlocked.x);
            boundMaxX = Math.max(boundMaxX, interlocked.x + interlocked.w);
            boundMinZ = Math.min(boundMinZ, interlocked.z);
            boundMaxZ = Math.max(boundMaxZ, interlocked.z + interlocked.d);
          }
        });

        if (!isFinite(boundMinX)) {
          boundMinX = -pw * sc / 2;
          boundMaxX = pw * sc / 2;
          boundMinZ = -pd * sc / 2;
          boundMaxZ = pd * sc / 2;
        }

        const totalHeight = stacks * obh;
        makeCornerPostsAndStraps(s.scene, boundMinX, boundMaxX, boundMinZ, boundMaxZ, totalHeight, baseY, sc);
      }

      const totalH = baseY + stacks * obh;
      const maxDim = Math.max(pw * sc, pd * sc, totalH);
      const defaultDist = Math.max(maxDim * 2.2, 3.2);
      const defaultLookY = totalH * 0.50;
      const defaultPhi = 0.98;
      const defaultTheta = 0.65;
      if (!s.hasCustomAngle) {
        s.tgtDist = defaultDist;
        s.tgtLookY = defaultLookY;
        s.tgtPhi = defaultPhi;
        s.tgtTheta = defaultTheta;
      }
    }
  }, [mode, inbox, outbox, unitBox, arrangement, palletConfig, useInbox, hasPop, popHeight, useAirCap, useCornerPost]);

  // ── Render Loop ──
  const renderLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.renderer || !s.scene || !s.camera) return;

    // Smooth lerp to target angles
    s.theta += (s.tgtTheta - s.theta) * 0.15;
    s.phi += (s.tgtPhi - s.phi) * 0.15;
    s.dist += (s.tgtDist - s.dist) * 0.15;
    s.lookY += (s.tgtLookY - s.lookY) * 0.15;

    const x = s.dist * Math.sin(s.phi) * Math.cos(s.theta);
    const y = s.dist * Math.cos(s.phi);
    const z = s.dist * Math.sin(s.phi) * Math.sin(s.theta);

    s.camera.position.set(x, Math.max(y, 0.08), z);
    s.camera.lookAt(0, s.lookY, 0);

    s.renderer.render(s.scene, s.camera);

    // Schedule next frame for continuous interactive 3D navigation
    s.animFrame = requestAnimationFrame(renderLoop);
  }, []);

  // ── Smart Auto-Crop for 3D Snapshot ──
  const cropCanvasContent = (sourceCanvas) => {
    if (!sourceCanvas) return null;
    try {
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      if (!w || !h) return sourceCanvas.toDataURL('image/png');

      // Create a 2D canvas to inspect rendered pixels
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(sourceCanvas, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, maxX = 0, minY = h, maxY = 0;
      let found = false;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Pure white (255,255,255) or near-white / transparent background
          const isBg = a < 20 || (r >= 240 && g >= 240 && b >= 240);
          if (!isBg) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!found || (maxX - minX < 20) || (maxY - minY < 20)) {
        return sourceCanvas.toDataURL('image/png');
      }

      // 8% proportional padding around model bounding box + 12px safe margin to prevent top clipping
      const padX = Math.round((maxX - minX) * 0.08) + 12;
      const padY = Math.round((maxY - minY) * 0.08) + 12;

      const actualMinX = Math.max(0, minX - padX);
      const actualMaxX = Math.min(w - 1, maxX + padX);
      const actualMinY = Math.max(0, minY - padY);
      const actualMaxY = Math.min(h - 1, maxY + padY);

      const cropX = actualMinX;
      const cropY = actualMinY;
      const cropW = actualMaxX - actualMinX + 1;
      const cropH = actualMaxY - actualMinY + 1;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const cCtx = croppedCanvas.getContext('2d');
      cCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      return croppedCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Auto-crop fallback to original canvas dataUrl', e);
      return sourceCanvas.toDataURL('image/png');
    }
  };

  // ── Canvas Snapshot with Ground/Grid Temporarily Hidden ──
  const performSnapshotCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    setIsCapturing(true);
    const s = stateRef.current;
    let dataUrl = null;
    if (s.renderer && s.scene && s.camera) {
      const prevGroundVis = s.ground ? s.ground.visible : true;
      const prevGridVis = s.grid ? s.grid.visible : true;
      if (s.ground) s.ground.visible = false;
      if (s.grid) s.grid.visible = false;

      s.renderer.render(s.scene, s.camera);
      dataUrl = cropCanvasContent(canvas);

      if (s.ground) s.ground.visible = prevGroundVis;
      if (s.grid) s.grid.visible = prevGridVis;
      s.renderer.render(s.scene, s.camera);

      if (onCapture && dataUrl) {
        onCapture(dataUrl, mode);
      }
    }
    setTimeout(() => setIsCapturing(false), 300);
    return dataUrl;
  };

  const handleCapture = () => {
    performSnapshotCapture();
  };

  const handleResetView = () => {
    const s = stateRef.current;
    s.hasCustomAngle = false;
    if (mode === 'inbox') {
      const ibw = (inbox?.w || unitBox.w * arrangement.cols + 16) || 120;
      const ibd = (inbox?.d || unitBox.d * arrangement.rows + 16) || 120;
      const ibh = (inbox?.h || unitBox.h * arrangement.layers + 16) || 150;
      const sc = Math.min(0.014, 3.8 / Math.max(ibw, ibd));
      const bw = ibw * sc, bd = ibd * sc, bh = ibh * sc;
      const popH = Math.max((popHeight || 15) * sc, 0.012);
      const totalHeight = bh + (hasPop ? popH : (useAirCap ? (hasPop ? popH : 0.024) : 0));
      const maxDim = Math.max(bw, bd, totalHeight);
      s.tgtDist = Math.max(maxDim * 2.2, 1.8);
      s.tgtLookY = totalHeight * 0.50;
      s.tgtPhi = 0.95;
      s.tgtTheta = 0.68;
    } else if (mode === 'outbox') {
      const obw = outbox?.w || 300;
      const obd = outbox?.d || 200;
      const obh = outbox?.h || 150;
      const sc = Math.min(0.014, 4.0 / Math.max(obw, obd));
      const bw = obw * sc, bd = obd * sc, bh = obh * sc;
      const popH = Math.max((popHeight || 15) * sc, 0.012);
      const totalHeight = bh + (hasPop ? popH : (useAirCap ? 0.024 : 0));
      const maxDim = Math.max(bw, bd, totalHeight);
      s.tgtDist = Math.max(maxDim * 2.2, 1.8);
      s.tgtLookY = totalHeight * 0.50;
      s.tgtPhi = 0.95;
      s.tgtTheta = 0.68;
    } else {
      const pw = palletConfig?.w || 1100;
      const pd = palletConfig?.d || 1100;
      const stacks = Math.min(palletConfig?.stacks || 8, 20);
      const sc = 0.004;
      const obh = (outbox?.h || 150) * sc;
      const baseY = 0.144;
      const totalH = baseY + stacks * obh;
      const maxDim = Math.max(pw * sc, pd * sc, totalH);
      s.tgtDist = Math.max(maxDim * 2.2, 3.2);
      s.tgtLookY = totalH * 0.50;
      s.tgtPhi = 0.98;
      s.tgtTheta = 0.65;
    }
    if (onViewChange) {
      onViewChange(null);
    }
  };

  const handleZoomIn = () => {
    const s = stateRef.current;
    s.tgtDist = Math.max(0.6, s.tgtDist * 0.82);
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  const handleZoomOut = () => {
    const s = stateRef.current;
    s.tgtDist = Math.min(80, s.tgtDist * 1.25);
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  const handleRotateLeft = () => {
    const s = stateRef.current;
    s.tgtTheta += Math.PI / 6; // 30도 좌회전
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  const handleRotateRight = () => {
    const s = stateRef.current;
    s.tgtTheta -= Math.PI / 6; // 30도 우회전
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  const handlePitchUp = () => {
    const s = stateRef.current;
    s.tgtPhi = Math.max(0.08, s.tgtPhi - 0.15);
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  const handlePitchDown = () => {
    const s = stateRef.current;
    s.tgtPhi = Math.min(Math.PI / 2, s.tgtPhi + 0.15);
    s.hasCustomAngle = true;
    if (onViewChange) {
      onViewChange({ theta: s.tgtTheta, phi: s.tgtPhi, dist: s.tgtDist, lookY: s.tgtLookY });
    }
  };

  useImperativeHandle(ref, () => ({
    capture: performSnapshotCapture,
    resetView: handleResetView,
    getViewConfig: () => {
      const s = stateRef.current;
      return {
        theta: s.tgtTheta,
        phi: s.tgtPhi,
        dist: s.tgtDist,
        lookY: s.tgtLookY
      };
    }
  }), [mode, onCapture, inbox, outbox, unitBox, arrangement, palletConfig, onViewChange]);

  // ── Init Three.js ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth || 480;
    const H = height;
    const pr = window.devicePixelRatio || 1;

    canvas.width = W * pr;
    canvas.height = H * pr;
    canvas.style.width = '100%';
    canvas.style.height = `${H}px`;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF); // Pure studio white

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 200);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Bright, crystal-clear studio look

    // 5-Point Studio Bright Lighting
    const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xE2E8F0, 1.45);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xFFFFFF, 1.65);
    sun.position.set(8, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xFFFBEB, 1.10);
    fill.position.set(-8, 12, -6);
    scene.add(fill);

    const topLight = new THREE.DirectionalLight(0xFFFFFF, 0.80);
    topLight.position.set(0, 20, 0);
    scene.add(topLight);

    const underBounce = new THREE.DirectionalLight(0xF8FAFC, 0.50);
    underBounce.position.set(0, -6, 0);
    scene.add(underBounce);

    // Ground Plane & Clean Grid
    const gGeo = new THREE.PlaneGeometry(30, 30);
    const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(20, 40, 0xCBD5E1, 0xF1F5F9);
    grid.position.y = 0.001;
    scene.add(grid);

    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.ground = ground;
    stateRef.current.grid = grid;

    buildScene();
    renderLoop();

    // Mouse & Touch Controls
    const onMouseDown = (e) => {
      stateRef.current.isDragging = true;
      stateRef.current.lx = e.clientX;
      stateRef.current.ly = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onMouseUp = () => {
      stateRef.current.isDragging = false;
      canvas.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
      if (!stateRef.current.isDragging) return;
      const dx = (e.clientX - stateRef.current.lx) * 0.008;
      const dy = (e.clientY - stateRef.current.ly) * 0.008;
      stateRef.current.tgtTheta -= dx;
      stateRef.current.tgtPhi = Math.max(0.05, Math.min(Math.PI / 2, stateRef.current.tgtPhi + dy));
      stateRef.current.lx = e.clientX;
      stateRef.current.ly = e.clientY;
      stateRef.current.hasCustomAngle = true;
      if (onViewChange) {
        onViewChange({
          theta: stateRef.current.tgtTheta,
          phi: stateRef.current.tgtPhi,
          dist: stateRef.current.tgtDist,
          lookY: stateRef.current.tgtLookY
        });
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      stateRef.current.tgtDist = Math.max(0.4, Math.min(80, stateRef.current.tgtDist + e.deltaY * 0.004));
      stateRef.current.hasCustomAngle = true;
      if (onViewChange) {
        onViewChange({
          theta: stateRef.current.tgtTheta,
          phi: stateRef.current.tgtPhi,
          dist: stateRef.current.tgtDist,
          lookY: stateRef.current.tgtLookY
        });
      }
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        stateRef.current.isDragging = true;
        stateRef.current.lx = e.touches[0].clientX;
        stateRef.current.ly = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        stateRef.current.touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && stateRef.current.isDragging) {
        const dx = (e.touches[0].clientX - stateRef.current.lx) * 0.008;
        const dy = (e.touches[0].clientY - stateRef.current.ly) * 0.008;
        stateRef.current.tgtTheta -= dx;
        stateRef.current.tgtPhi = Math.max(0.05, Math.min(Math.PI / 2, stateRef.current.tgtPhi + dy));
        stateRef.current.lx = e.touches[0].clientX;
        stateRef.current.ly = e.touches[0].clientY;
        stateRef.current.hasCustomAngle = true;
        if (onViewChange) {
          onViewChange({
            theta: stateRef.current.tgtTheta,
            phi: stateRef.current.tgtPhi,
            dist: stateRef.current.tgtDist,
            lookY: stateRef.current.tgtLookY
          });
        }
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (stateRef.current.touchDist) {
          stateRef.current.tgtDist = Math.max(0.4, Math.min(80, stateRef.current.tgtDist - (d - stateRef.current.touchDist) * 0.01));
          stateRef.current.hasCustomAngle = true;
          if (onViewChange) {
            onViewChange({
              theta: stateRef.current.tgtTheta,
              phi: stateRef.current.tgtPhi,
              dist: stateRef.current.tgtDist,
              lookY: stateRef.current.tgtLookY
            });
          }
        }
        stateRef.current.touchDist = d;
      }
    };

    const onTouchEnd = () => {
      stateRef.current.isDragging = false;
      stateRef.current.touchDist = null;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    // Resize Observer
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && stateRef.current.renderer && stateRef.current.camera) {
          stateRef.current.camera.aspect = width / height;
          stateRef.current.camera.updateProjectionMatrix();
          stateRef.current.renderer.setSize(width, height);
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(stateRef.current.animFrame);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      if (renderer) renderer.dispose();
    };
  }, [height, buildScene, renderLoop]);

  // Re-build scene when props change
  useEffect(() => {
    buildScene();
  }, [buildScene]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        background: '#F8FAFC',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab'
        }}
      />

      {/* Floating Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '4px',
          zIndex: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}
      >
        {/* Navigation Controls Group */}
        <div style={{
          display: 'flex',
          gap: '2px',
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(4px)',
          padding: '2px 4px',
          borderRadius: '6px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <button
            type="button"
            onClick={handleZoomIn}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="확대 (Zoom In)"
          >
            🔍+
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="축소 (Zoom Out)"
          >
            🔍-
          </button>
          <button
            type="button"
            onClick={handleRotateLeft}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="좌회전 (Rotate Left 30°)"
          >
            ↶ 30°
          </button>
          <button
            type="button"
            onClick={handleRotateRight}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="우회전 (Rotate Right 30°)"
          >
            ↷ 30°
          </button>
          <button
            type="button"
            onClick={handlePitchUp}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 5px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="탑뷰로 기울이기 (Tilt Up)"
          >
            ⬆️
          </button>
          <button
            type="button"
            onClick={handlePitchDown}
            style={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '3px 5px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer'
            }}
            title="사이드뷰로 기울이기 (Tilt Down)"
          >
            ⬇️
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetView}
          style={{
            background: 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          title="시점 초기화"
        >
          🔄 초기화
        </button>

        {onCapture && (
          <button
            type="button"
            onClick={handleCapture}
            disabled={isCapturing}
            style={{
              background: '#2563EB',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#FFFFFF',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.3)',
              opacity: isCapturing ? 0.6 : 1
            }}
          >
            📸 3D 스냅샷 저장
          </button>
        )}
      </div>

      {/* Guide Note */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '10px',
          fontSize: '11px',
          color: '#64748B',
          pointerEvents: 'none',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}
      >
        🖱️ 마우스 드래그로 360° 회전 · 휠로 확대/축소
      </div>
    </div>
  );
});

export default PackagingViewer3D;
