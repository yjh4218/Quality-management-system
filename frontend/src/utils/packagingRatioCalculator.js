/**
 * 6개국(한국, 중국, 대만, 유럽, 미국, 일본) 화장품 포장공간비율 계산 유틸리티
 * - 순수 함수로 작성되어 프론트엔드 및 단위 테스트에서 독립적으로 실행 가능
 */

/**
 * 1차 용기 개별 부피 계산 (mm³)
 * @param {Object} container - { shape, width, depth, height, diameter, capacity_ml }
 * @returns {number} 부피 (mm³)
 */
export const calculateSingleContainerVolume = (container) => {
    if (!container) return 0;

    const { shape, width, depth, height, diameter, capacity_ml } = container;

    // 1. 원기둥 형태 또는 직경/높이가 주어진 경우
    if (shape === 'cylinder' || (!shape && diameter && height)) {
        const d = parseFloat(diameter) || 0;
        const h = parseFloat(height) || 0;
        if (d > 0 && h > 0) {
            const r = d / 2;
            return Math.PI * Math.pow(r, 2) * h;
        }
    }

    // 2. 직육면체 형태 또는 가로/세로/높이가 주어진 경우
    if (shape === 'rect' || (!shape && width && depth && height)) {
        const w = parseFloat(width) || 0;
        const dep = parseFloat(depth) || 0;
        const h = parseFloat(height) || 0;
        if (w > 0 && dep > 0 && h > 0) {
            return w * dep * h;
        }
    }

    // 3. 직접 입력된 체적 또는 용량 기반 fallback
    const ml = parseFloat(capacity_ml) || 0;
    if (ml > 0) {
        // 외형 치수가 명시되지 않았을 때, 화장품 용기 자체 두께 및 캡/숄더를 감안한 외형 체적 추정치(1.25배)
        return ml * 1000 * 1.25;
    }

    return 0;
};

/**
 * 1차 용기 배열 전체의 총 부피 계산 (mm³)
 * @param {Array} containers - [{ ...container, quantity }]
 * @returns {number} 총 부피 (mm³)
 */
export const calculateTotalContainersVolume = (containers) => {
    if (!Array.isArray(containers) || containers.length === 0) return 0;

    return containers.reduce((sum, c) => {
        const singleVol = calculateSingleContainerVolume(c);
        const qty = parseInt(c.quantity, 10) || 1;
        return sum + (singleVol * qty);
    }, 0);
};

/**
 * 2차 단상자 외형 부피 계산 (mm³)
 * @param {Object} box - { width, depth, height } (mm)
 * @returns {number} 단상자 외형 부피 (mm³)
 */
export const calculateBoxVolume = (box) => {
    if (!box) return 0;
    const w = parseFloat(box.width) || 0;
    const d = parseFloat(box.depth) || 0;
    const h = parseFloat(box.height) || 0;
    return w * d * h;
};

/**
 * 한국 기준 합격치 역산 권장 치수 생성
 */
export const shrinkBoxToFit = ({ secondaryBox, totalContentVolume, targetRatio = 10.0 }) => {
    const w = parseFloat(secondaryBox?.width) || 0;
    const d = parseFloat(secondaryBox?.depth) || 0;
    const h = parseFloat(secondaryBox?.height) || 0;
    if (w <= 0 || d <= 0 || h <= 0 || totalContentVolume <= 0) return null;

    const targetOuterVolume = totalContentVolume / (1 - targetRatio / 100);
    const origVolume = w * d * h;
    if (origVolume <= targetOuterVolume) return null;

    const scale = Math.cbrt(targetOuterVolume / origVolume);
    return {
        recommendedWidth: Math.floor(w * scale),
        recommendedLength: Math.floor(d * scale),
        recommendedHeight: Math.floor(h * scale),
        targetOuterVolume
    };
};

/**
 * 6개국 포장공간비율 종합 계산기
 * 
 * @param {Object} params
 * @param {Object} params.secondaryBox - { width, depth, height } (mm)
 * @param {Array} params.primaryContainers - [{ id, name, shape, width, depth, height, diameter, capacity_ml, quantity }]
 * @param {string} params.productCategory - 'CLEANSING'(15%) | 'GENERAL'(10%) | 'SET'(25%)
 * @param {number} params.chinaKValue - 기본 9.0
 * @param {boolean} params.isElectricDeviceIncluded - 전동기구 동봉 여부 (중국 K * 1.5)
 * @param {number} params.taiwanCValue - 기본 3.1 (단일재질 3.1, 복합재질 2.7)
 * @param {number} params.packagingLayers - 포장 횟수/층수 (기본 2차)
 * @returns {Array} 6개국 결과 객체 배열
 */
export const calculateAllCountrySpaceRatios = ({
    secondaryBox,
    primaryContainers = [],
    productCategory = 'GENERAL',
    chinaKValue = 9.0,
    isElectricDeviceIncluded = false,
    taiwanCValue = 3.1,
    packagingLayers = 2
}) => {
    const boxVolume = calculateBoxVolume(secondaryBox);
    const totalContentVolume = calculateTotalContainersVolume(primaryContainers);
    const containerCount = primaryContainers.reduce((sum, c) => sum + (parseInt(c.quantity, 10) || 1), 0);
    const isSetProduct = productCategory === 'SET' || containerCount > 1;

    const isZeroInput = boxVolume <= 0 || totalContentVolume <= 0;

    // 기본 공간비율 공식 (공통): (boxVolume - totalContentVolume) / boxVolume * 100
    const basicRatio = !isZeroInput ? ((boxVolume - totalContentVolume) / boxVolume) * 100 : 0;
    const roundedBasicRatio = Math.round(basicRatio * 10) / 10;

    const results = [];

    // ==========================================
    // 1. 🇰🇷 한국 (Korea) - 법적 강제
    // ==========================================
    let koreaLimit = 10.0;
    if (productCategory === 'CLEANSING') koreaLimit = 15.0;
    else if (isSetProduct) koreaLimit = 25.0;

    const isKoreaPass = !isZeroInput && roundedBasicRatio <= koreaLimit;
    const koreaFlags = [];
    if (packagingLayers > 2) {
        koreaFlags.push('⚠️ 포장횟수 2차 초과 (법령 위반 주의)');
    }
    if (isZeroInput) {
        koreaFlags.push('⚠️ 단상자 치수 또는 내용량 미입력');
    }

    results.push({
        countryCode: 'KR',
        countryName: '대한민국',
        flag: '🇰🇷',
        ratio: isZeroInput ? null : roundedBasicRatio,
        limit: koreaLimit,
        unit: '%',
        status: isZeroInput ? 'WAITING_INPUT' : (isKoreaPass ? 'PASS' : 'FAIL'),
        badgeType: isZeroInput ? 'WAITING_INPUT' : 'LEGAL_DECISION',
        title: isZeroInput ? '치수 미입력' : (isKoreaPass ? '적합' : '부적합 (기준 초과)'),
        summary: isZeroInput 
            ? `단상자 규격(가로×세로×높이)과 내용량을 입력하세요 (기준: ${koreaLimit}% 이하)`
            : `한국 포장공간비율 ${roundedBasicRatio.toFixed(1)}% (기준: ${koreaLimit}% 이하)`,
        lawName: '「제품의 포장재질·포장방법에 관한 기준 등에 관한 규칙」(환경부)',
        detailDescription: isZeroInput
            ? '제품 본체 체적정보(가로/세로/높이)와 용량(mL)이 입력되면 대한민국 환경부 고시 기준에 따라 즉시 적합/부적합을 자동 판정합니다.'
            : (isKoreaPass 
                ? `법적 상한선인 ${koreaLimit}% 이하를 만족하여 유통에 적합합니다.`
                : `법적 상한선(${koreaLimit}%)을 ${(roundedBasicRatio - koreaLimit).toFixed(1)}%p 초과하였습니다. 단상자 축소가 권장됩니다.`),
        flags: koreaFlags,
        isLegalForce: true,
        recommendedSpec: (!isZeroInput && !isKoreaPass) ? shrinkBoxToFit({ secondaryBox, totalContentVolume, targetRatio: koreaLimit }) : null
    });

    // ==========================================
    // 2. 🇨🇳 중국 (China) - 법적 강제
    // ==========================================
    const effectiveK = isElectricDeviceIncluded ? (chinaKValue * 1.5) : chinaKValue;
    // 중국 공식: [boxVolume - (1 + K) * totalContentVolume] / boxVolume * 100
    const chinaRatio = (!isZeroInput && boxVolume > 0)
        ? ((boxVolume - (1 + effectiveK) * totalContentVolume) / boxVolume) * 100 
        : 0;
    const roundedChinaRatio = Math.round(chinaRatio * 10) / 10;

    const chinaFlags = [];
    if (packagingLayers > 4) {
        chinaFlags.push('⚠️ 포장 층수 4층 초과 (GB 23350 규격 위반)');
    }
    if (isZeroInput) {
        chinaFlags.push('⚠️ 단상자 치수 또는 내용량 미입력');
    }

    results.push({
        countryCode: 'CN',
        countryName: '중국',
        flag: '🇨🇳',
        ratio: isZeroInput ? null : roundedChinaRatio,
        kValue: effectiveK,
        unit: '%',
        status: isZeroInput ? 'WAITING_INPUT' : 'OFFICIAL_CALC',
        badgeType: isZeroInput ? 'WAITING_INPUT' : 'OFFICIAL_VALUE',
        title: isZeroInput ? '치수 미입력' : `공극률 ${roundedChinaRatio.toFixed(1)}%`,
        summary: isZeroInput
            ? `단상자 규격과 내용량을 입력하세요 (적용 K값: ${effectiveK.toFixed(1)})`
            : `GB 23350 공식 공극률: ${roundedChinaRatio.toFixed(1)}% (적용 K값: ${effectiveK.toFixed(1)})`,
        lawName: 'GB 23350-2021 「限制商品过度包装要求 食品和化妆品」(2024 수정단)',
        detailDescription: isZeroInput
            ? `제품 본체 치수와 용량 입력 시 GB 23350-2021(2024 수정단) K=${effectiveK.toFixed(1)} 계수 공식 공극률이 자동 산출됩니다.`
            : `화장품 K=${effectiveK.toFixed(1)} 계수를 적용한 국가표준 공식 산출치입니다. 포장 층수는 4층 이하여야 합니다.`,
        flags: chinaFlags,
        isLegalForce: true
    });

    // ==========================================
    // 3. 🇹🇼 대만 (Taiwan) - 법적 강제 (기획세트 대상)
    // ==========================================
    // 대만 공식: PVR = boxVolume / npv (npv = Σ(n * l * w * h * C))
    // 단품일 경우 해당 없음 (N/A)
    if (!isSetProduct && containerCount <= 1) {
        results.push({
            countryCode: 'TW',
            countryName: '대만',
            flag: '🇹🇼',
            ratio: null,
            status: 'NOT_APPLICABLE',
            badgeType: 'NOT_APPLICABLE',
            title: '해당없음',
            summary: '대만 과도포장 규정은 화장품 기획/선물세트(禮盒) 전용입니다.',
            lawName: '대만 자원회수재이용법 「과도포장제한 공고(限制產品過度包裝)」',
            detailDescription: '단품 화장품은 대만 과도포장 규제 대상에서 제외됩니다. (선물세트 구성 시 자동 산출)',
            flags: ['단품 화장품 규제 제외'],
            isLegalForce: true
        });
    } else {
        // 세트 제품 대만 PVR 계산
        let npv = 0;
        primaryContainers.forEach(c => {
            const qty = parseInt(c.quantity, 10) || 1;
            let l = 0, w = 0, h = 0;
            if (c.shape === 'rect') {
                l = Math.ceil(parseFloat(c.depth) || 0);
                w = Math.ceil(parseFloat(c.width) || 0);
                h = Math.ceil(parseFloat(c.height) || 0);
            } else if (c.shape === 'cylinder') {
                const d = Math.ceil(parseFloat(c.diameter) || 0);
                l = d;
                w = d;
                h = Math.ceil(parseFloat(c.height) || 0);
            } else {
                const ml = parseFloat(c.capacity_ml) || 50;
                const side = Math.ceil(Math.cbrt(ml * 1000));
                l = side; w = side; h = side;
            }
            npv += (qty * l * w * h * taiwanCValue);
        });

        const pvr = (!isZeroInput && npv > 0) ? (boxVolume / npv) : 0;
        const roundedPvr = Math.round(pvr * 100) / 100;
        const isTaiwanPass = !isZeroInput && roundedPvr <= 1.0;
        const taiwanFlags = [];
        if (packagingLayers > 2) {
            taiwanFlags.push('⚠️ 포장 층수 2층 초과 (대만 세트 규격 위반)');
        }
        if (isZeroInput) {
            taiwanFlags.push('⚠️ 단상자 치수 또는 내용량 미입력');
        }

        results.push({
            countryCode: 'TW',
            countryName: '대만',
            flag: '🇹🇼',
            ratio: isZeroInput ? null : roundedPvr,
            limit: 1.0,
            unit: ' (PVR)',
            status: isZeroInput ? 'WAITING_INPUT' : (isTaiwanPass ? 'PASS' : 'FAIL'),
            badgeType: isZeroInput ? 'WAITING_INPUT' : 'LEGAL_DECISION',
            title: isZeroInput ? '치수 미입력' : (isTaiwanPass ? '적합' : '부적합 (기준 초과)'),
            summary: isZeroInput
                ? `단상자 규격과 구성품 용량을 입력하세요 (기준: 1.00 이하, C=${taiwanCValue})`
                : `포장체적비치(PVR): ${roundedPvr.toFixed(2)} (기준: 1.00 이하, C=${taiwanCValue})`,
            lawName: '대만 자원회수재이용법 「과도포장제한 공고(限制產品過度包裝)」',
            detailDescription: isZeroInput
                ? '기획세트 단상자 규격과 구성품 용량을 입력하면 대만 PVR 법적 적합 여부를 자동 판정합니다.'
                : (isTaiwanPass 
                    ? '기획세트 포장체적비치가 1.0 이하로 대만 수출에 적합합니다.' 
                    : '기획세트 포장체적비치(1.0)를 초과하였습니다. 단상자 축소 또는 구성품 재질 배치가 필요합니다.'),
            flags: taiwanFlags,
            isLegalForce: true
        });
    }

    // ==========================================
    // 4. 🇪🇺 유럽 (EU) - 수송/이커머스 포장 대상 (참고용)
    // ==========================================
    results.push({
        countryCode: 'EU',
        countryName: '유럽 (EU)',
        flag: '🇪🇺',
        ratio: isZeroInput ? null : roundedBasicRatio,
        unit: '%',
        status: isZeroInput ? 'WAITING_INPUT' : 'REFER_ONLY',
        badgeType: 'REFERENCE_ONLY',
        title: isZeroInput ? '미입력' : '참고용',
        summary: isZeroInput
            ? '단상자 규격 및 내용량을 입력하세요 (개별 화장품 법적 기준 아님)'
            : `공간비율 산출치: ${roundedBasicRatio.toFixed(1)}% (개별 화장품 법적 기준 아님)`,
        lawName: 'EU PPWR (Regulation (EU) 2025/40) Article 24',
        detailDescription: '⚠️ PPWR의 공극률 규제(40%~50% 이하)는 개별 화장품의 1차 용기+2차 단상자가 아니라 "수송포장·그룹포장·이커머스 포장"에 적용되는 규정입니다. 본 결과는 참고용이며 법적 판정 기준이 아닙니다.',
        flags: ['개별 단상자 법적 규제 비해당', '수송/이커머스 포장 시에만 40~50% 규제 적용'],
        isLegalForce: false
    });

    // ==========================================
    // 5. 🇺🇸 미국 (US) - 소비자 소송 리스크 (수치만 표시)
    // ==========================================
    results.push({
        countryCode: 'US',
        countryName: '미국',
        flag: '🇺🇸',
        ratio: isZeroInput ? null : roundedBasicRatio,
        unit: '%',
        status: isZeroInput ? 'WAITING_INPUT' : 'INFO_ONLY',
        badgeType: 'NO_BADGE',
        title: isZeroInput ? '미입력' : `${roundedBasicRatio.toFixed(1)}%`,
        summary: isZeroInput
            ? '단상자 규격 및 내용량을 입력하세요 (법적 수치 기준 없음)'
            : `공간비율 산출치: ${roundedBasicRatio.toFixed(1)}% (법적 수치 기준 없음)`,
        lawName: '21 CFR 100.100 / California B&P §12606 (Slack-Fill)',
        detailDescription: '미국은 연방법상 고정된 상한 % 기준이 없습니다. 다만, 과도한 여유공간은 Nonfunctional Slack-Fill 관련 소비자 집단소송(캘리포니아 주법 등) 리스크가 될 수 있어 참고용으로 표시합니다.',
        flags: ['법적 숫자 상한 없음', 'Slack-Fill 소비자 소송 주의'],
        isLegalForce: false
    });

    // ==========================================
    // 6. 🇯🇵 일본 (Japan) - 자율 규약 (수치만 표시)
    // ==========================================
    results.push({
        countryCode: 'JP',
        countryName: '일본',
        flag: '🇯🇵',
        ratio: isZeroInput ? null : roundedBasicRatio,
        unit: '%',
        status: isZeroInput ? 'WAITING_INPUT' : 'INFO_ONLY',
        badgeType: 'NO_BADGE',
        title: isZeroInput ? '미입력' : `${roundedBasicRatio.toFixed(1)}%`,
        summary: isZeroInput
            ? '단상자 규격 및 내용량을 입력하세요 (법적 수치 기준 없음)'
            : `공간비율 산출치: ${roundedBasicRatio.toFixed(1)}% (법적 수치 기준 없음)`,
        lawName: '용기포장리사이클법 / 일본화장품공업연합회 적정포장규칙',
        detailDescription: '일본의 용기포장리사이클법은 재활용 의무(회수·재상품화) 중심 법률로 개별 상품의 공간비율 수치 규제 조항이 없습니다. 본 수치는 업계 자율규약 참고치입니다.',
        flags: ['법적 숫자 상한 없음', '재활용 의무 준수 중심'],
        isLegalForce: false
    });

    return results;
};

/**
 * 단상자 축소 시뮬레이션 제안 옵션 생성
 */
export const generateOptimizationSuggestions = ({ secondaryBox, primaryContainers, productCategory, isCleansingProduct }) => {
    const w = parseFloat(secondaryBox.width) || 0;
    const d = parseFloat(secondaryBox.depth) || 0;
    const h = parseFloat(secondaryBox.height) || 0;
    const totalContentVol = calculateTotalContainersVolume(primaryContainers);

    if (w <= 0 || d <= 0 || h <= 0 || totalContentVol <= 0) return [];

    let targetLimit = 10.0;
    if (productCategory === 'CLEANSING' || isCleansingProduct) targetLimit = 15.0;
    else if (productCategory === 'SET' || primaryContainers.length > 1) targetLimit = 25.0;

    const createSim = (wMod, dMod, hMod, label, icon) => {
        const newW = Math.round(w * wMod);
        const newD = Math.round(d * dMod);
        const newH = Math.round(h * hMod);
        const newVol = newW * newD * newH;
        const origVol = w * d * h;
        const reduction = origVol > 0 ? ((origVol - newVol) / origVol) * 100 : 0;
        const newRatio = newVol > 0 ? ((newVol - totalContentVol) / newVol) * 100 : 0;

        return {
            label,
            icon,
            dims: `${newW} × ${newD} × ${newH} mm`,
            reduction: reduction.toFixed(1),
            newRatio: Math.round(newRatio * 10) / 10,
            passesKorea: newRatio <= targetLimit,
            newW,
            newD,
            newH
        };
    };

    return [
        createSim(0.9, 1.0, 1.0, '가로 10% 축소', '↔️'),
        createSim(1.0, 0.9, 1.0, '세로 10% 축소', '↕️'),
        createSim(1.0, 1.0, 0.9, '높이 10% 축소', '↑↓'),
        createSim(0.95, 0.95, 0.95, '전체 5% 균일 축소', '📦')
    ];
};
