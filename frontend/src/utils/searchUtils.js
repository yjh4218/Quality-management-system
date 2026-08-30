/**
 * QMS 전역 다중 키워드 AND 검색 및 분류 필터링 유틸리티 모듈
 * 
 * 1. 쉼표(,) 및 공백(\s+)을 기준으로 다중 토큰을 분리합니다.
 * 2. 모든 토큰이 대상 데이터에 포함(AND)되어야 일치(Match)로 판정합니다.
 *    예: "어성초, 250" 입력 시 -> ['어성초', '250'] -> "어성초 촉촉 토너 250ml" 매칭 성공
 *    예: "스포이드 18 NBR" 입력 시 -> ['스포이드', '18', 'nbr'] -> "18파이 NBR 고무 스포이드 캡" 매칭 성공
 */

/**
 * 검색 쿼리를 쉼표 및 공백 기준으로 정제된 소문자 토큰 배열로 분리합니다.
 * @param {string|any} query 
 * @returns {string[]} 토큰 배열 (예: ['어성초', '250'])
 */
export const splitSearchTokens = (query) => {
    if (query === null || query === undefined) return [];
    const str = String(query).trim().toLowerCase();
    if (!str) return [];
    
    // 쉼표(,) 및 공백(\s+)으로 분리 후 빈 문자열 제거
    return str
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
};

/**
 * 단일 문자열 내에 검색어의 모든 토큰이 포함되어 있는지 검사합니다 (AND 조건).
 * @param {string|number|any} target 
 * @param {string|any} query 
 * @returns {boolean}
 */
export const matchesAllTokens = (target, query) => {
    const tokens = splitSearchTokens(query);
    if (tokens.length === 0) return true;
    if (target === null || target === undefined) return false;

    const targetStr = String(target).toLowerCase();
    return tokens.every(token => targetStr.includes(token));
};

/**
 * 복수 필드(배열 또는 객체 값들)의 전체 합본 문자열에서 검색어의 모든 토큰이 포함되어 있는지 검사합니다 (AND 조건).
 * @param {Array|Object} fieldsOrValues - 대상 문자열/숫자 배열 또는 객체
 * @param {string|any} query - 검색어
 * @returns {boolean}
 */
export const matchesMultiFieldTokens = (fieldsOrValues, query) => {
    const tokens = splitSearchTokens(query);
    if (tokens.length === 0) return true;
    if (!fieldsOrValues) return false;

    let combinedStr = '';
    if (Array.isArray(fieldsOrValues)) {
        combinedStr = fieldsOrValues
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v === 'object' ? JSON.stringify(v) : String(v))
            .join(' ')
            .toLowerCase();
    } else if (typeof fieldsOrValues === 'object') {
        combinedStr = Object.values(fieldsOrValues)
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v === 'object' ? JSON.stringify(v) : String(v))
            .join(' ')
            .toLowerCase();
    } else {
        combinedStr = String(fieldsOrValues).toLowerCase();
    }

    return tokens.every(token => combinedStr.includes(token));
};

/**
 * 6대 분류 등 개별 항목 필터 객체(criteriaMap)를 기준으로 아이템의 모든 필터 조건을 검사합니다.
 * @param {Object} item - 검사 대상 데이터 객체
 * @param {Object} criteriaMap - 필드별 검색어 맵 (예: { bomCode: 'MAT', type: '캡·펌프', weight: '8.5' })
 * @param {Object} customFieldExtractors - 필드별 커스텀 값 추출 함수 맵 (선택)
 * @returns {boolean}
 */
export const matchesClassifiedCriteria = (item, criteriaMap = {}, customFieldExtractors = {}) => {
    if (!item || typeof item !== 'object') return false;
    if (!criteriaMap || typeof criteriaMap !== 'object') return true;

    for (const [key, queryVal] of Object.entries(criteriaMap)) {
        if (queryVal === null || queryVal === undefined) continue;
        const queryStr = String(queryVal).trim();
        if (!queryStr) continue;

        let targetValue = '';
        if (customFieldExtractors && typeof customFieldExtractors[key] === 'function') {
            targetValue = customFieldExtractors[key](item);
        } else {
            targetValue = item[key];
        }

        // 드롭다운 등 완전 일치(Exact Match)가 필요한 경우를 제외하고는 기본 다중 토큰 AND 매칭 적용
        if (!matchesAllTokens(targetValue, queryStr)) {
            return false;
        }
    }

    return true;
};
