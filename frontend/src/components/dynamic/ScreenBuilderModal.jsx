import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    createDynamicScreen, 
    updateDynamicScreen,
    fetchDynamicSearchCatalogs, 
    fetchDynamicMasterDataSources, 
    fetchDynamicMenusTree 
} from '../../api';
import { toast } from 'react-toastify';
import { reportGlobalError } from '../../utils/globalErrorListener';

const STEP_LABELS = [
    { step: 1, title: '기본 정보', icon: '⚙️' },
    { step: 2, title: '그리드 컬럼 설정', icon: '📊' },
    { step: 3, title: '검색 필드 & 메뉴 배치', icon: '🧭' }
];

// 비개발자를 위한 도메인별 원클릭 추천 템플릿 프리셋
const DOMAIN_PRESETS = [
    {
        key: 'PRODUCT',
        label: '📦 제품/상품 관리 셋',
        description: '제품코드, 제품명, 브랜드, 제조사, 상태, 등록일',
        defaultTitle: '제품 및 상품 현황 관리',
        codePrefix: 'SCR_PROD',
        apiEndpoint: '/api/products',
        targetTable: 'product',
        defaultDescription: '사내 제품 및 상품 기준정보를 실시간으로 조회하고 관리하는 동적 화면입니다.',
        keywords: ['제품', '상품', '품목', 'SKU', 'PROD', 'PRODUCT', '아이템'],
        columns: [
            { fieldKey: 'productCode', label: '제품코드', fieldType: 'TEXT', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'productName', label: '제품명', fieldType: 'TEXT', width: 240, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'brand', label: '브랜드', fieldType: 'RELATION', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false, relationSourceKey: 'BRAND' },
            { fieldKey: 'manufacturer', label: '제조사', fieldType: 'RELATION', width: 150, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false, relationSourceKey: 'MANUFACTURER' },
            { fieldKey: 'status', label: '상태', fieldType: 'BADGE', width: 120, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '등록일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    },
    {
        key: 'CLAIM',
        label: '⚠️ 품질 클레임 분석 셋',
        description: '클레임번호, 제품명, 유형, 불량수량, 비용, 상태, 접수일',
        defaultTitle: '품질 클레임 현황 분석',
        codePrefix: 'SCR_CLAIM',
        apiEndpoint: '/api/claims',
        targetTable: 'claim',
        defaultDescription: '고객 및 유통 채널별 품질 클레임 접수 및 처리 현황을 분석하는 동적 화면입니다.',
        keywords: ['클레임', '불량', '품질', '반품', 'CLAIM', 'DEFECT', '하자', 'VOC'],
        columns: [
            { fieldKey: 'claimNumber', label: '클레임번호', fieldType: 'TEXT', width: 170, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'productName', label: '제품명', fieldType: 'TEXT', width: 220, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'claimType', label: '클레임유형', fieldType: 'SELECT', width: 140, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'occurrenceQty', label: '불량수량', fieldType: 'NUMBER', width: 110, sortable: true, editable: false, isMeasure: true, isDimension: false, aggregationType: 'SUM', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'claimCost', label: '불량비용(원)', fieldType: 'NUMBER', width: 130, sortable: true, editable: false, isMeasure: true, isDimension: false, aggregationType: 'SUM', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'status', label: '처리상태', fieldType: 'BADGE', width: 120, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '접수일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    },
    {
        key: 'COMPANY',
        label: '🏢 협력사/제조사 관리 셋',
        description: '업체코드, 업체명, 대표자, 연락처, 상태, 등록일',
        defaultTitle: '협력 제조사 관리',
        codePrefix: 'SCR_MFR',
        apiEndpoint: '/api/manufacturers',
        targetTable: 'manufacturer',
        defaultDescription: '원부자재 및 완제품 협력 제조사의 기본정보를 조회하고 관리하는 동적 화면입니다.',
        keywords: ['제조사', '협력사', '업체', '공장', 'MANUFACTURER', 'COMPANY', '거래처'],
        columns: [
            { fieldKey: 'companyCode', label: '업체코드', fieldType: 'TEXT', width: 130, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'companyName', label: '업체명', fieldType: 'TEXT', width: 220, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'ceoName', label: '대표자명', fieldType: 'TEXT', width: 120, sortable: true, editable: false, isMeasure: false, isDimension: false, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'contactPhone', label: '연락처', fieldType: 'TEXT', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: false, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'status', label: '운영상태', fieldType: 'BADGE', width: 120, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '등록일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    },
    {
        key: 'BRAND',
        label: '🏷️ 브랜드 기준정보 셋',
        description: '브랜드코드, 브랜드명, 영문명, 상태, 등록일',
        defaultTitle: '운영 브랜드 기준정보 관리',
        codePrefix: 'SCR_BRAND',
        apiEndpoint: '/api/brands',
        targetTable: 'brand',
        defaultDescription: '사내 브랜드 기준정보 및 운영 상태를 조회하고 관리하는 동적 화면입니다.',
        keywords: ['브랜드', 'BRAND', '상표'],
        columns: [
            { fieldKey: 'brandCode', label: '브랜드코드', fieldType: 'TEXT', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'brandName', label: '브랜드명', fieldType: 'TEXT', width: 220, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'status', label: '운영상태', fieldType: 'BADGE', width: 120, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '등록일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    },
    {
        key: 'NOTICE',
        label: '📢 공지사항/게시판 셋',
        description: '번호, 공지제목, 중요여부, 작성자, 등록일',
        defaultTitle: '사내 공지사항 관리',
        codePrefix: 'SCR_NOTICE',
        apiEndpoint: '/api/announcements',
        targetTable: 'announcement',
        defaultDescription: '전사 공지사항 및 팝업 안내 내역을 조회하고 관리하는 동적 화면입니다.',
        keywords: ['공지', '공지사항', '알림', '게시판', 'NOTICE', 'ANNOUNCEMENT'],
        columns: [
            { fieldKey: 'id', label: '번호', fieldType: 'NUMBER', width: 90, sortable: true, editable: false, isMeasure: false, isDimension: false, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'title', label: '공지 제목', fieldType: 'TEXT', width: 280, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'isImportant', label: '중요공지', fieldType: 'BADGE', width: 110, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'author', label: '작성자', fieldType: 'TEXT', width: 130, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '게시일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    },
    {
        key: 'COMMON',
        label: '📋 일반 데이터 기본 셋',
        description: '번호, 제목, 카테고리, 수량, 상태, 일자',
        defaultTitle: '신규 데이터 관리',
        codePrefix: 'SCR_DATA',
        apiEndpoint: '/api/',
        targetTable: '',
        defaultDescription: '동적 데이터를 실시간으로 조회하고 관리하는 동적 화면입니다.',
        keywords: ['데이터', '관리', 'DATA', '조회', '테스트'],
        columns: [
            { fieldKey: 'id', label: 'ID (식별자)', fieldType: 'NUMBER', width: 90, sortable: true, editable: false, isMeasure: false, isDimension: false, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'name', label: '제목 / 명칭', fieldType: 'TEXT', width: 240, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'category', label: '카테고리', fieldType: 'SELECT', width: 130, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'quantity', label: '수량', fieldType: 'NUMBER', width: 110, sortable: true, editable: false, isMeasure: true, isDimension: false, aggregationType: 'SUM', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'status', label: '상태', fieldType: 'BADGE', width: 120, sortable: true, editable: true, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: false, isExcludedFromDashboard: false },
            { fieldKey: 'createdAt', label: '등록일자', fieldType: 'DATE', width: 140, sortable: true, editable: false, isMeasure: false, isDimension: true, aggregationType: '', isPrimaryDate: true, isExcludedFromDashboard: false }
        ]
    }
];

// 비개발자를 위한 추천 필드 자동완성 목록 (드롭다운 하나로 필드키/표시명/타입/너비 자동입력)
const QUICK_FIELD_TEMPLATES = [
    { label: '📦 제품명 (productName)', fieldKey: 'productName', fieldLabel: '제품명', fieldType: 'TEXT', width: 220, isDimension: true, isMeasure: false },
    { label: '🏷️ 제품코드 (productCode)', fieldKey: 'productCode', fieldLabel: '제품코드', fieldType: 'TEXT', width: 130, isDimension: true, isMeasure: false },
    { label: '🔗 브랜드 (brand)', fieldKey: 'brand', fieldLabel: '브랜드', fieldType: 'RELATION', width: 140, isDimension: true, isMeasure: false, relationSourceKey: 'BRAND' },
    { label: '🏭 제조사 (manufacturer)', fieldKey: 'manufacturer', fieldLabel: '제조사', fieldType: 'RELATION', width: 150, isDimension: true, isMeasure: false, relationSourceKey: 'MANUFACTURER' },
    { label: '⚠️ 클레임번호 (claimNumber)', fieldKey: 'claimNumber', fieldLabel: '클레임번호', fieldType: 'TEXT', width: 160, isDimension: true, isMeasure: false },
    { label: '🚨 불량수량 (occurrenceQty)', fieldKey: 'occurrenceQty', fieldLabel: '불량수량', fieldType: 'NUMBER', width: 110, isMeasure: true, isDimension: false, aggregationType: 'SUM' },
    { label: '💰 불량비용 (claimCost)', fieldKey: 'claimCost', fieldLabel: '불량비용(원)', fieldType: 'NUMBER', width: 130, isMeasure: true, isDimension: false, aggregationType: 'SUM' },
    { label: '🔢 수량 (quantity)', fieldKey: 'quantity', fieldLabel: '수량', fieldType: 'NUMBER', width: 100, isMeasure: true, isDimension: false, aggregationType: 'SUM' },
    { label: '💵 금액 / 단가 (price)', fieldKey: 'price', fieldLabel: '금액', fieldType: 'NUMBER', width: 120, isMeasure: true, isDimension: false, aggregationType: 'SUM' },
    { label: '🚦 상태 뱃지 (status)', fieldKey: 'status', fieldLabel: '상태', fieldType: 'BADGE', width: 120, isDimension: true, isMeasure: false, editable: true },
    { label: '📂 분류 / 유형 (category)', fieldKey: 'category', fieldLabel: '카테고리', fieldType: 'SELECT', width: 130, isDimension: true, isMeasure: false },
    { label: '📅 등록일자 (createdAt)', fieldKey: 'createdAt', fieldLabel: '등록일자', fieldType: 'DATE', width: 140, isDimension: true, isMeasure: false, isPrimaryDate: true },
    { label: '👤 담당자 (manager)', fieldKey: 'manager', fieldLabel: '담당자', fieldType: 'TEXT', width: 120, isDimension: true, isMeasure: false },
    { label: '📝 비고 / 설명 (description)', fieldKey: 'description', fieldLabel: '비고', fieldType: 'TEXT', width: 220, isDimension: false, isMeasure: false }
];

const PRESET_COLUMNS = DOMAIN_PRESETS[3].columns;

// 기준정보 마스터 및 기존 데이터 컬럼 여부 판별 (제품코드, 제품명, 브랜드명, 제조사, 클레임번호 등 수정/삭제 불가 정책)
export const isMasterColumn = (col) => {
    if (!col) return false;
    const k = (col.fieldKey || '').trim().toLowerCase();
    const l = (col.label || '').trim().toLowerCase().replace(/\s+/g, '');

    // 1. 시스템 기본 식별자 및 일시
    if (['id', 'createdat', 'updatedat'].includes(k)) return true;
    if (l === 'id' || l === 'id(식별자)' || l === '등록일자' || l === '수정일자' || l === '게시일자') return true;

    // 2. 제품코드 (품목코드)
    if (['productcode', 'itemcode', 'item_code', 'product_code'].includes(k)) return true;
    if (l.includes('제품코드') || l.includes('품목코드')) return true;

    // 3. 제품명 (품목명)
    if (['productname', 'itemname', 'item_name', 'product_name'].includes(k)) return true;
    if (l.includes('제품명') || l.includes('품목명')) return true;

    // 4. 브랜드명
    if (['brand', 'brandcode', 'brandname', 'brand_code', 'brand_name'].includes(k)) return true;
    if (l.includes('브랜드')) return true;

    // 5. 제조사 / 협력사
    if (['manufacturer', 'companyname', 'company_name', 'vendorname', 'vendor', 'companycode'].includes(k)) return true;
    if (l.includes('제조사') || l.includes('업체명') || l.includes('협력사') || l.includes('업체코드')) return true;

    // 6. 클레임번호 / 접수번호
    if (['claimnumber', 'claimno', 'claim_number', 'claim_no', 'receiptno'].includes(k)) return true;
    if (l.includes('클레임번호') || l.includes('접수번호')) return true;

    // 7. 기준정보 연동(RELATION) 또는 relationSourceId가 지정된 컬럼
    if (col.relationSourceId != null || col.fieldType === 'RELATION') return true;

    return false;
};

// 고유 화면 코드 자동 생성 헬퍼 (예: SCR_PROD_261004_A1B2)
const generateRandomScreenCode = (prefix = 'SCR') => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}_${yy}${mm}${dd}_${randomHex}`;
};

// 화면명으로부터 추천 도메인 지능형 매칭 헬퍼
const inferDomainFromTitle = (title) => {
    if (!title || typeof title !== 'string') return null;
    const upper = title.toUpperCase();
    for (const preset of DOMAIN_PRESETS) {
        if (!preset.keywords) continue;
        for (const kw of preset.keywords) {
            if (upper.includes(kw.toUpperCase())) {
                return preset;
            }
        }
    }
    return null;
};

const FIELD_TYPES = [
    { value: 'TEXT', label: '텍스트 (TEXT)' },
    { value: 'NUMBER', label: '숫자 (NUMBER)' },
    { value: 'DATE', label: '일자/시간 (DATE)' },
    { value: 'BADGE', label: '상태 뱃지 (BADGE)' },
    { value: 'SELECT', label: '선택 박스 (SELECT)' },
    { value: 'RELATION', label: '기준정보 연동 (RELATION)' },
    { value: 'TAG', label: '태그 (TAG)' }
];

const ScreenBuilderModal = ({ isOpen, onClose, onSuccess, mode = 'create', screenMeta = null }) => {
    const isEditMode = mode === 'edit';
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Step 1: 기본 정보
    const [selectedDomainKey, setSelectedDomainKey] = useState('');
    const [screenCode, setScreenCode] = useState('');
    const [screenName, setScreenName] = useState('');
    const [screenType, setScreenType] = useState('GRID');
    const [apiEndpoint, setApiEndpoint] = useState('/api/');
    const [targetTable, setTargetTable] = useState('');
    const [description, setDescription] = useState('');
    const [enableRowSelection, setEnableRowSelection] = useState(false);
    const [rowSelectionMode, setRowSelectionMode] = useState('MULTI');

    // Step 2: 컬럼 목록
    const [columns, setColumns] = useState([
        {
            fieldKey: 'id',
            label: 'ID',
            fieldType: 'NUMBER',
            relationSourceId: null,
            width: 100,
            sortable: true,
            editable: false,
            isMeasure: false,
            isDimension: false,
            aggregationType: '',
            isPrimaryDate: false,
            isExcludedFromDashboard: false
        }
    ]);

    // Step 3: 검색필드 & 메뉴
    const [searchCatalogs, setSearchCatalogs] = useState([]);
    const [selectedCatalogIds, setSelectedCatalogIds] = useState([]);
    const [masterDataSources, setMasterDataSources] = useState([]);
    const [menuTree, setMenuTree] = useState([]);
    const [parentMenuId, setParentMenuId] = useState('');
    const [menuIcon, setMenuIcon] = useState('📄');
    const [menuOrder, setMenuOrder] = useState(99);

    // 편집 모드 시 기존 화면 메타데이터 자동 바인딩
    useEffect(() => {
        if (!isOpen) return;

        if (isEditMode && screenMeta) {
            const scr = screenMeta.screen || {};
            setScreenCode(scr.screenCode || '');
            setScreenName(scr.screenName || '');
            setScreenType(scr.screenType || 'GRID');
            setApiEndpoint(scr.apiEndpoint || '/api/');
            setTargetTable(scr.targetTable || '');
            setDescription(scr.description || '');
            setEnableRowSelection(scr.enableRowSelection || false);
            setRowSelectionMode(scr.rowSelectionMode || 'MULTI');

            if (screenMeta.gridColumns && screenMeta.gridColumns.length > 0) {
                setColumns(screenMeta.gridColumns.map(c => ({
                    fieldKey: c.fieldKey || '',
                    label: c.label || '',
                    fieldType: c.fieldType || 'TEXT',
                    relationSourceId: c.relationSource?.id || null,
                    width: c.width || 150,
                    sortable: c.sortable !== undefined ? c.sortable : true,
                    editable: !!c.editable,
                    isMeasure: !!c.isMeasure,
                    isDimension: !!c.isDimension,
                    aggregationType: c.aggregationType || '',
                    isPrimaryDate: !!c.isPrimaryDate,
                    isExcludedFromDashboard: !!c.isExcludedFromDashboard
                })));
            }

            if (screenMeta.searchFields && screenMeta.searchFields.length > 0) {
                const catIds = screenMeta.searchFields
                    .map(sf => sf.catalogId || sf.id)
                    .filter(Boolean);
                setSelectedCatalogIds(catIds);
            }

            if (screenMeta.menu) {
                setParentMenuId(screenMeta.menu.parentId ? String(screenMeta.menu.parentId) : '');
                setMenuIcon(screenMeta.menu.icon || '📋');
                setMenuOrder(screenMeta.menu.menuOrder !== undefined ? screenMeta.menu.menuOrder : 99);
            }
        } else if (!isEditMode) {
            // 신규 생성 모드 기본 초기화
            setCurrentStep(1);
            setScreenCode('');
            setScreenName('');
            setScreenType('GRID');
            setApiEndpoint('/api/');
            setTargetTable('');
            setDescription('');
            setEnableRowSelection(false);
            setRowSelectionMode('MULTI');
            setColumns([
                {
                    fieldKey: 'id',
                    label: 'ID',
                    fieldType: 'NUMBER',
                    relationSourceId: null,
                    width: 100,
                    sortable: true,
                    editable: false,
                    isMeasure: false,
                    isDimension: false,
                    aggregationType: '',
                    isPrimaryDate: false,
                    isExcludedFromDashboard: false
                }
            ]);
            setSelectedCatalogIds([]);
            setParentMenuId('');
            setMenuIcon('📄');
            setMenuOrder(99);
        }
    }, [isOpen, isEditMode, screenMeta]);

    // 마스터 메타데이터 로드
    useEffect(() => {
        if (!isOpen) return;

        const loadMetadata = async () => {
            try {
                const [catRes, dsRes, menuRes] = await Promise.all([
                    fetchDynamicSearchCatalogs().catch(() => ({ data: [] })),
                    fetchDynamicMasterDataSources().catch(() => ({ data: [] })),
                    fetchDynamicMenusTree().catch(() => ({ data: [] }))
                ]);
                setSearchCatalogs(catRes.data || []);
                setMasterDataSources(dsRes.data || []);
                setMenuTree(menuRes.data || []);
            } catch (err) {
                console.error('[SCREEN BUILDER] Failed to load metadata', err);
                reportGlobalError(err?.message || '동적 빌더 메타데이터 로드 실패', err?.stack, 'ScreenBuilderModal:loadMetadata', 'METADATA');
            }
        };

        loadMetadata();
    }, [isOpen]);

    // 계층형 상위 메뉴 목록 평탄화 (대메뉴 및 하위메뉴 트리 포맷)
    const flatMenuOptions = useMemo(() => {
        const options = [];
        const traverse = (items, depth = 0) => {
            if (!Array.isArray(items)) return;
            items.forEach(item => {
                const prefix = depth > 0 ? `${'　'.repeat(depth)}└ ` : '';
                options.push({
                    id: item.id,
                    name: item.menuName,
                    icon: item.icon || (depth === 0 ? '📁' : '📄'),
                    label: `${prefix}${item.icon || (depth === 0 ? '📁' : '📄')} ${item.menuName}`
                });
                if (item.children && item.children.length > 0) {
                    traverse(item.children, depth + 1);
                }
            });
        };
        traverse(menuTree, 0);
        return options;
    }, [menuTree]);

    if (!isOpen) return null;

    // Step 1: 도메인 원클릭 프리셋 선택 시 모든 기본정보 및 컬럼 자동 세팅
    const handleSelectDomainPreset = (presetKey) => {
        const found = DOMAIN_PRESETS.find(p => p.key === presetKey);
        if (!found) return;

        setSelectedDomainKey(presetKey);
        setScreenName(found.defaultTitle || found.label);
        setScreenCode(generateRandomScreenCode(found.codePrefix || 'SCR'));
        setApiEndpoint(found.apiEndpoint || '/api/');
        setTargetTable(found.targetTable || '');
        setDescription(found.defaultDescription || `${found.label} 조회를 위한 동적 관리 화면입니다.`);

        // Step 2 컬럼 목록도 즉시 세팅
        if (found.columns && found.columns.length > 0) {
            const newCols = found.columns.map(c => {
                let relId = null;
                if (c.relationSourceKey && masterDataSources.length > 0) {
                    const ds = masterDataSources.find(d => d.sourceKey?.toUpperCase() === c.relationSourceKey);
                    if (ds) relId = ds.id;
                }
                return {
                    ...c,
                    relationSourceId: relId
                };
            });
            setColumns(newCols);
        }

        toast.success(`[${found.label}] 기본 정보와 추천 컬럼이 자동으로 세팅되었습니다!`);
    };

    // Step 1: 화면명 입력 시 지능형 도메인 추론 및 API, 테이블, 코드 자동 기재
    const handleScreenNameChange = (val) => {
        setScreenName(val);
        if (!val.trim()) return;

        const matched = inferDomainFromTitle(val);
        const isAutoCode = !screenCode || screenCode.startsWith('SCR_');
        const isAutoApi = !apiEndpoint || apiEndpoint === '/api/' || ['/api/products', '/api/claims', '/api/manufacturers', '/api/brands', '/api/announcements'].includes(apiEndpoint);
        const isAutoTable = !targetTable || ['product', 'claim', 'manufacturer', 'brand', 'announcement', 'general_data'].includes(targetTable);

        if (matched) {
            setSelectedDomainKey(matched.key);
            if (isAutoCode) {
                setScreenCode(generateRandomScreenCode(matched.codePrefix || 'SCR'));
            }
            if (isAutoApi) {
                setApiEndpoint(matched.apiEndpoint);
            }
            if (isAutoTable) {
                setTargetTable(matched.targetTable);
            }
            if (!description || description.endsWith('동적 화면입니다.')) {
                setDescription(matched.defaultDescription || `${val} 데이터를 실시간으로 조회하고 관리하는 동적 화면입니다.`);
            }
            // 아직 기본 컬럼(1개)만 설정되어 있는 경우 해당 도메인의 추천 컬럼 셋 자동 세팅
            if (columns.length <= 1 && matched.columns && matched.columns.length > 0) {
                const newCols = matched.columns.map(c => {
                    let relId = null;
                    if (c.relationSourceKey && masterDataSources.length > 0) {
                        const ds = masterDataSources.find(d => d.sourceKey?.toUpperCase() === c.relationSourceKey);
                        if (ds) relId = ds.id;
                    }
                    return { ...c, relationSourceId: relId };
                });
                setColumns(newCols);
            }
        } else {
            if (isAutoCode && (!screenCode || screenCode.length < 5)) {
                setScreenCode(generateRandomScreenCode('SCR_PAGE'));
            }
            if (!description) {
                setDescription(`${val} 데이터를 실시간으로 조회하고 관리하는 동적 화면입니다.`);
            }
        }
    };

    // Step 1: API Endpoint 변경 시 대상 테이블명 및 화면 코드 접두사 자동 연동
    const handleApiEndpointChange = (endpoint) => {
        setApiEndpoint(endpoint);
        let table = '';
        let prefix = 'SCR_PAGE';

        if (endpoint.includes('/products')) {
            table = 'product';
            prefix = 'SCR_PROD';
        } else if (endpoint.includes('/claims')) {
            table = 'claim';
            prefix = 'SCR_CLAIM';
        } else if (endpoint.includes('/manufacturers')) {
            table = 'manufacturer';
            prefix = 'SCR_MFR';
        } else if (endpoint.includes('/brands')) {
            table = 'brand';
            prefix = 'SCR_BRAND';
        } else if (endpoint.includes('/announcements')) {
            table = 'announcement';
            prefix = 'SCR_NOTICE';
        }

        if (table) {
            setTargetTable(table);
            if (!screenCode || screenCode.startsWith('SCR_')) {
                setScreenCode(generateRandomScreenCode(prefix));
            }
        }
    };

    // 화면 코드 재발급
    const handleRegenerateCode = () => {
        const matched = inferDomainFromTitle(screenName);
        const prefix = matched?.codePrefix || (targetTable ? `SCR_${targetTable.toUpperCase()}` : 'SCR_PAGE');
        const newCode = generateRandomScreenCode(prefix);
        setScreenCode(newCode);
        toast.info(`화면 코드가 [${newCode}]로 자동 생성되었습니다.`);
    };

    // 컬럼 추가
    const handleAddColumn = () => {
        setColumns(prev => [
            ...prev,
            {
                fieldKey: '',
                label: '',
                fieldType: 'TEXT',
                relationSourceId: null,
                width: 150,
                sortable: true,
                editable: false,
                isMeasure: false,
                isDimension: false,
                aggregationType: '',
                isPrimaryDate: false,
                isExcludedFromDashboard: false
            }
        ]);
    };

    // 중복된 시스템 필드 키(영문) 실시간 감지 (오류 원천 방지)
    const duplicateFieldKeys = useMemo(() => {
        const counts = {};
        columns.forEach(c => {
            const k = (c.fieldKey || '').trim().toLowerCase();
            if (k) counts[k] = (counts[k] || 0) + 1;
        });
        return new Set(Object.keys(counts).filter(k => counts[k] > 1));
    }, [columns]);

    // 도메인별 추천 컬럼 셋 원클릭 적용
    const handleApplyDomainPreset = (presetKey) => {
        const found = DOMAIN_PRESETS.find(p => p.key === presetKey);
        if (!found) return;

        setSelectedDomainKey(presetKey);
        if (!screenName.trim() || screenName.startsWith('새 화면') || screenName.endsWith('관리')) {
            setScreenName(found.defaultTitle);
        }
        if (!targetTable.trim()) {
            setTargetTable(found.targetTable);
        }
        if (!apiEndpoint.trim() || apiEndpoint === '/api/') {
            setApiEndpoint(found.apiEndpoint);
        }
        if (!description.trim()) {
            setDescription(found.defaultDescription);
        }
        if (!screenCode || screenCode.startsWith('SCR_')) {
            setScreenCode(generateRandomScreenCode(found.codePrefix));
        }

        const newCols = found.columns.map(c => {
            let relId = null;
            if (c.relationSourceKey && masterDataSources.length > 0) {
                const ds = masterDataSources.find(d => d.sourceKey?.toUpperCase() === c.relationSourceKey);
                if (ds) relId = ds.id;
            }
            return {
                ...c,
                relationSourceId: relId
            };
        });

        setColumns(newCols);
        toast.success(`[${found.label}] 템플릿 컬럼 ${newCols.length}개가 적용되었습니다!`);
    };

    // 개별 컬럼 행에서 추천 필드 선택 시 자동완성 (중복 키 방지 자동 넘버링)
    const handleQuickFieldSelect = (index, templateFieldKey) => {
        if (!templateFieldKey) return;
        const template = QUICK_FIELD_TEMPLATES.find(t => t.fieldKey === templateFieldKey);
        if (!template) return;

        let relId = null;
        if (template.relationSourceKey && masterDataSources.length > 0) {
            const ds = masterDataSources.find(d => d.sourceKey?.toUpperCase() === template.relationSourceKey);
            if (ds) relId = ds.id;
        }

        setColumns(prev => {
            const next = [...prev];

            // 시스템 필드 키 중복 방지: 이미 존재하는 키면 _2, _3 등으로 자동 고유화
            let uniqueKey = template.fieldKey;
            const otherKeys = prev.filter((_, i) => i !== index).map(c => (c.fieldKey || '').trim().toLowerCase());
            if (otherKeys.includes(uniqueKey.toLowerCase())) {
                let count = 2;
                while (otherKeys.includes(`${template.fieldKey}_${count}`.toLowerCase())) {
                    count++;
                }
                uniqueKey = `${template.fieldKey}_${count}`;
            }

            next[index] = {
                ...next[index],
                fieldKey: uniqueKey,
                label: template.fieldLabel,
                fieldType: template.fieldType,
                width: template.width,
                isDimension: template.isDimension ?? false,
                isMeasure: template.isMeasure ?? false,
                aggregationType: template.aggregationType || '',
                isPrimaryDate: template.isPrimaryDate ?? false,
                relationSourceId: relId !== null ? relId : next[index].relationSourceId
            };
            return next;
        });
        toast.info(`[${template.fieldLabel}] 필드 속성이 자동으로 입력되었습니다.`);
    };

    // 프리셋 컬럼 적용
    const handleApplyPresets = () => {
        handleApplyDomainPreset('COMMON');
    };

    // 컬럼 필드값 변경 (한글명은 한글만, 영문명은 영문만, 기준정보 마스터 컬럼 수정 잠금)
    const handleColumnChange = (index, field, value) => {
        setColumns(prev => {
            const next = [...prev];
            const targetCol = next[index];

            // 제품코드, 제품명, 브랜드명, 제조사, 클레임번호 등 기준정보 컬럼의 한글명/영문명 수정 잠금
            if (isMasterColumn(targetCol) && (field === 'label' || field === 'fieldKey')) {
                toast.warning('제품코드, 제품명, 브랜드명, 제조사, 클레임번호 등 기존 데이터 연동 컬럼의 명칭은 수정할 수 없습니다.');
                return prev;
            }

            let cleanValue = value;
            if (field === 'label') {
                // 한글명: 한글(자모/완성형), 숫자, 공백, 기본 부호만 허용 (영문 알파벳 원천 차단)
                cleanValue = typeof value === 'string' ? value.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣0-9\s()_\-/[\]]/g, '') : value;
            } else if (field === 'fieldKey') {
                // 영문명: 영문 대소문자, 숫자, 밑줄(_)만 허용 (한글/특수문자/공백 원천 차단)
                cleanValue = typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_]/g, '') : value;
            }

            next[index] = { ...targetCol, [field]: cleanValue };
            return next;
        });
    };

    // 컬럼 삭제 (기준정보 마스터 컬럼 삭제 방지)
    const handleRemoveColumn = (index) => {
        if (columns.length <= 1) {
            toast.warning('최소 1개 이상의 컬럼이 유지되어야 합니다.');
            return;
        }
        const targetCol = columns[index];
        if (isMasterColumn(targetCol)) {
            toast.warning(`[${targetCol.label || targetCol.fieldKey}] 컬럼은 기존 DB 기준정보 연동 필수 컬럼이므로 삭제할 수 없습니다.`);
            return;
        }
        setColumns(prev => prev.filter((_, idx) => idx !== index));
    };

    // 검색 카탈로그 체크 토글
    const handleToggleCatalog = (id) => {
        setSelectedCatalogIds(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    // Step 이동 검증
    const handleNext = () => {
        if (currentStep === 1) {
            if (!screenName.trim()) {
                toast.warning('화면명을 입력해주세요.');
                return;
            }
            let finalCode = screenCode.trim();
            if (!finalCode) {
                const matched = inferDomainFromTitle(screenName);
                const prefix = matched?.codePrefix || (targetTable ? `SCR_${targetTable.toUpperCase()}` : 'SCR_PAGE');
                finalCode = generateRandomScreenCode(prefix);
                setScreenCode(finalCode);
                toast.info(`화면 코드가 [${finalCode}]로 자동 기재되었습니다.`);
            }
            if (!apiEndpoint.trim() || apiEndpoint === '/api/') {
                const matched = inferDomainFromTitle(screenName);
                setApiEndpoint(matched?.apiEndpoint || '/api/products');
            }
            if (!targetTable.trim()) {
                const matched = inferDomainFromTitle(screenName);
                setTargetTable(matched?.targetTable || 'product');
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            // 컬럼 유효성 검사 및 영문 필드키 중복 검증
            const keyMap = {};
            const duplicates = [];

            for (let i = 0; i < columns.length; i++) {
                const c = columns[i];
                const trimmedKey = (c.fieldKey || '').trim();
                const trimmedLabel = (c.label || '').trim();

                if (!trimmedKey) {
                    toast.warning(`${i + 1}번째 컬럼의 시스템 필드 키(영문)를 입력해주세요.`);
                    return;
                }
                if (!trimmedLabel) {
                    toast.warning(`${i + 1}번째 컬럼의 표시명(한글)을 입력해주세요.`);
                    return;
                }

                const lowerKey = trimmedKey.toLowerCase();
                if (keyMap[lowerKey]) {
                    duplicates.push(trimmedKey);
                }
                keyMap[lowerKey] = true;
            }

            if (duplicates.length > 0) {
                toast.error(`중복된 시스템 필드 키(영문)가 존재합니다: [${[...new Set(duplicates)].join(', ')}]. 시스템 필드 키는 고유해야 합니다.`);
                return;
            }

            setCurrentStep(3);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // 최종 화면 생성 제출 (즉시 생성 및 커스텀 파라미터 override 지원)
    const handleSubmit = async (overrideParams = {}) => {
        try {
            setSubmitting(true);

            const finalScreenCode = (overrideParams.screenCode || screenCode || '').trim();
            const finalScreenName = (overrideParams.screenName || screenName || '').trim();
            const finalEndpoint = (overrideParams.apiEndpoint || apiEndpoint || '/api/products').trim();
            const finalTable = (overrideParams.targetTable || targetTable || 'product').trim();
            const finalDesc = (overrideParams.description || description || '').trim();

            if (!finalScreenCode) {
                toast.warning('화면 코드를 입력해주세요.');
                return;
            }
            if (!finalScreenName) {
                toast.warning('화면명을 입력해주세요.');
                return;
            }

            // 컬럼 목록 확정 (전달된 컬럼이 없거나 비어있으면 도메인 추천 컬럼 자동 채택)
            let colsToSubmit = overrideParams.columns || columns;
            if (!colsToSubmit || colsToSubmit.length === 0 || (colsToSubmit.length === 1 && !colsToSubmit[0].fieldKey.trim())) {
                const matched = inferDomainFromTitle(finalScreenName) || DOMAIN_PRESETS[0];
                colsToSubmit = matched.columns;
            }

            // 시스템 필드 키(영문) 유효성 및 중복 검사
            const submitKeyMap = {};
            const submitDuplicates = [];
            for (let i = 0; i < colsToSubmit.length; i++) {
                const k = (colsToSubmit[i].fieldKey || '').trim().toLowerCase();
                if (!k) {
                    toast.warning(`${i + 1}번째 컬럼의 시스템 필드 키(영문)를 입력해주세요.`);
                    setSubmitting(false);
                    return;
                }
                if (submitKeyMap[k]) {
                    submitDuplicates.push(colsToSubmit[i].fieldKey.trim());
                }
                submitKeyMap[k] = true;
            }
            if (submitDuplicates.length > 0) {
                toast.error(`중복된 시스템 필드 키(영문)가 존재합니다: [${[...new Set(submitDuplicates)].join(', ')}]. 시스템 필드 키는 고유해야 합니다.`);
                setSubmitting(false);
                return;
            }

            const payload = {
                screenCode: finalScreenCode,
                screenName: finalScreenName,
                screenType: overrideParams.screenType || screenType,
                apiEndpoint: finalEndpoint,
                targetTable: finalTable,
                description: finalDesc,
                enableRowSelection: overrideParams.enableRowSelection !== undefined ? overrideParams.enableRowSelection : enableRowSelection,
                rowSelectionMode: overrideParams.rowSelectionMode || rowSelectionMode,
                parentMenuId: parentMenuId ? Number(parentMenuId) : null,
                menuIcon: menuIcon.trim() || '📄',
                menuOrder: Number(menuOrder) || 99,
                columns: colsToSubmit.map((c, idx) => ({
                    fieldKey: c.fieldKey.trim(),
                    label: c.label.trim(),
                    fieldType: c.fieldType,
                    relationSourceId: c.relationSourceId ? Number(c.relationSourceId) : null,
                    width: Number(c.width) || 150,
                    sortable: !!c.sortable,
                    editable: !!c.editable,
                    displayOrder: idx + 1,
                    isMeasure: !!c.isMeasure,
                    isDimension: !!c.isDimension,
                    aggregationType: c.aggregationType || null,
                    isPrimaryDate: !!c.isPrimaryDate,
                    isExcludedFromDashboard: !!c.isExcludedFromDashboard
                })),
                searchFieldCatalogIds: selectedCatalogIds
            };

            if (isEditMode) {
                const screenId = screenMeta?.screen?.id;
                if (!screenId) {
                    toast.error('수정 대상 화면 ID를 확인할 수 없습니다.');
                    return;
                }

                const updatePayload = {
                    screenName: finalScreenName,
                    screenType: overrideParams.screenType || screenType,
                    description: finalDesc,
                    apiEndpoint: finalEndpoint,
                    enableRowSelection: overrideParams.enableRowSelection !== undefined ? overrideParams.enableRowSelection : enableRowSelection,
                    rowSelectionMode: overrideParams.rowSelectionMode || rowSelectionMode,
                    parentMenuId: parentMenuId ? Number(parentMenuId) : null,
                    menuIcon: menuIcon.trim() || '📄',
                    menuOrder: Number(menuOrder) || 99,
                    columns: colsToSubmit.map((c, idx) => ({
                        fieldKey: c.fieldKey.trim(),
                        label: c.label.trim(),
                        fieldType: c.fieldType,
                        relationSourceId: c.relationSourceId ? Number(c.relationSourceId) : null,
                        width: Number(c.width) || 150,
                        sortable: !!c.sortable,
                        editable: !!c.editable,
                        displayOrder: idx + 1,
                        isMeasure: !!c.isMeasure,
                        isDimension: !!c.isDimension,
                        aggregationType: c.aggregationType || null,
                        isPrimaryDate: !!c.isPrimaryDate,
                        isExcludedFromDashboard: !!c.isExcludedFromDashboard
                    })),
                    searchFieldCatalogIds: selectedCatalogIds
                };

                const res = await updateDynamicScreen(screenId, updatePayload);
                toast.success(`[${finalScreenName}] 화면 구성이 성공적으로 수정되었습니다!`);

                window.dispatchEvent(new CustomEvent('qms_menu_updated'));
                window.dispatchEvent(new CustomEvent('dynamic-menu-updated', { detail: res.data }));

                if (onSuccess) {
                    onSuccess(res.data);
                }
                onClose();
                return;
            }

            const res = await createDynamicScreen(payload);
            toast.success(`새 화면 [${finalScreenName}]이(가) 성공적으로 생성되었습니다!`);

            window.dispatchEvent(new CustomEvent('qms_menu_updated'));

            if (onSuccess) {
                onSuccess(res.data);
            }
            onClose();
        } catch (err) {
            console.error('[SCREEN BUILDER] Failed to save screen', err);
            const msg = err.response?.data?.message || err.message || (isEditMode ? '화면 수정에 실패했습니다.' : '화면 생성에 실패했습니다.');
            reportGlobalError(msg, err?.stack, `ScreenBuilderModal:handleSubmit:${finalScreenCode}`, 'API_COMMUNICATION');
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const modalElement = (
        <div 
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                backdropFilter: 'blur(4px)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                style={{
                    width: '1200px',
                    maxWidth: '96vw',
                    height: '88vh',
                    maxHeight: '900px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. 모달 헤더 (QMS 표준 클린 화이트 & 딥 네이비) */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{isEditMode ? '⚙️' : '✨'}</span>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                                {isEditMode ? `동적 화면 편집기 (Screen Editor) - ${screenName || '화면 수정'}` : '관리자 동적 화면 빌더 (New Screen Builder)'}
                            </h2>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isEditMode ? '#eff6ff' : '#ecfdf5',
                                color: isEditMode ? '#1e40af' : '#065f46',
                                border: isEditMode ? '1px solid #bfdbfe' : '1px solid #a7f3d0',
                                fontSize: '11px',
                                fontWeight: '700'
                            }}>
                                {isEditMode ? 'EDIT MODE' : 'ADMIN ONLY'}
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            {isEditMode 
                                ? '화면유형, 화면명, 설명과 그리드 컬럼 설정, 상단 검색 필터 및 메뉴 배치를 수정합니다.' 
                                : '코드 수정 없이 마우스 클릭만으로 새 관리 화면, 그리드 컬럼, 대시보드 규칙 및 메뉴를 즉시 생성합니다.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 2. 스텝 인디케이터 (세그먼트 타임라인 스타일) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    gap: '16px'
                }}>
                    {STEP_LABELS.map((s, idx) => {
                        const isActive = currentStep === s.step;
                        const isDone = currentStep > s.step;
                        return (
                            <React.Fragment key={s.step}>
                                <div 
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: isActive ? '#003366' : (isDone ? '#059669' : '#94a3b8'),
                                        fontWeight: isActive ? '700' : '600',
                                        fontSize: '13px'
                                    }}
                                >
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: isActive ? '#003366' : (isDone ? '#10b981' : '#e2e8f0'),
                                        color: (isActive || isDone) ? '#ffffff' : '#64748b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}>
                                        {isDone ? '✓' : s.step}
                                    </span>
                                    <span>{s.icon} {s.title}</span>
                                </div>
                                {idx < STEP_LABELS.length - 1 && (
                                    <div style={{
                                        flex: 1,
                                        height: '2px',
                                        backgroundColor: isDone ? '#10b981' : '#e2e8f0'
                                    }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 3. 모달 바디 (스크롤 영역) */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
                    {/* STEP 1: 기본 정보 */}
                    {currentStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 편집 모드 전용 상단 안내 배너 */}
                            {isEditMode && (
                                <div style={{
                                    padding: '14px 18px',
                                    background: '#eff6ff',
                                    borderRadius: '10px',
                                    border: '1px solid #bfdbfe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <span style={{ fontSize: '20px' }}>ℹ️</span>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>
                                            기본 정보 수정 가이드
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                                            [기본 정보]에서는 <strong>화면유형, 화면명, 화면설명</strong>만 수정할 수 있습니다. 시스템 고유 식별자(화면 코드, API Endpoint, 대상 테이블)는 기존 데이터 무결성 보호를 위해 수정이 제한됩니다.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 신규 생성 모드 시 상단 원클릭 스마트 자동 완성 템플릿 바 */}
                            {!isEditMode && (
                                <div style={{
                                    padding: '16px 20px',
                                    background: '#f0f9ff',
                                    borderRadius: '12px',
                                    border: '1px solid #bae6fd',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '16px' }}>⚡</span>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1' }}>
                                                원클릭 스마트 자동 완성 (비개발자 관리자 맞춤)
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                                            클릭 한 번으로 화면명, 코드, API, 테이블명, 설명, 컬럼이 모두 자동 기재됩니다.
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {DOMAIN_PRESETS.slice(0, 5).map(preset => {
                                            const isSelected = selectedDomainKey === preset.key;
                                            return (
                                                <button
                                                    key={preset.key}
                                                    type="button"
                                                    onClick={() => handleSelectDomainPreset(preset.key)}
                                                    style={{
                                                        padding: '9px 12px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                                        background: isSelected ? '#e0f2fe' : '#ffffff',
                                                        color: '#1e293b',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '3px',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) e.currentTarget.style.borderColor = '#38bdf8';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1';
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                                                            {preset.label}
                                                        </span>
                                                        {isSelected && <span style={{ fontSize: '11px', color: '#0284c7' }}>✓</span>}
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {preset.apiEndpoint}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 1열: 화면명 & 화면 코드 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                            화면명 (Title) <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        {!isEditMode && (
                                            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                                                💡 단어 입력 시 API/테이블 자동 매칭
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="예: 실시간 제품 현황 관리, 품질 클레임 접수 내역"
                                        value={screenName}
                                        onChange={(e) => {
                                            if (isEditMode) {
                                                setScreenName(e.target.value);
                                            } else {
                                                handleScreenNameChange(e.target.value);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                        {isEditMode 
                                            ? '화면 상단 및 메뉴에 표시될 공식 화면명을 수정합니다.' 
                                            : '\'제품\', \'클레임\', \'제조사\', \'브랜드\', \'공지\' 등을 입력하면 하위 정보가 실시간 자동 기재됩니다.'}
                                    </span>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                화면 코드 <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <span style={{
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: isEditMode ? '#fee2e2' : '#f1f5f9',
                                                color: isEditMode ? '#991b1b' : '#475569',
                                                fontSize: '10px',
                                                fontWeight: '700'
                                            }}>
                                                {isEditMode ? '수정 불가' : '자동 생성됨'}
                                            </span>
                                        </div>
                                        {!isEditMode && (
                                            <button
                                                type="button"
                                                onClick={handleRegenerateCode}
                                                style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #cbd5e1',
                                                    background: '#f8fafc',
                                                    fontSize: '11px',
                                                    color: '#2563eb',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                ⚡ 코드 재발급
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="예: SCR_PROD_261004_A1B2"
                                        value={screenCode}
                                        disabled={isEditMode}
                                        onChange={(e) => setScreenCode(e.target.value.toUpperCase())}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box',
                                            fontWeight: '600',
                                            color: isEditMode ? '#64748b' : '#0f172a',
                                            backgroundColor: isEditMode ? '#f1f5f9' : '#f8fafc',
                                            cursor: isEditMode ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                        {isEditMode 
                                            ? '시스템 고유 식별자 (화면 생성 후에는 변경할 수 없습니다)' 
                                            : '시스템 내부 고유 식별자 (자동 채움 및 수정 가능)'}
                                    </span>
                                </div>
                            </div>

                            {/* 2열: 데이터 조회 API Endpoint & 대상 테이블명 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                            데이터 조회 API Endpoint
                                        </label>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: isEditMode ? '#fee2e2' : '#ecfdf5',
                                            color: isEditMode ? '#991b1b' : '#059669',
                                            fontSize: '10px',
                                            fontWeight: '700'
                                        }}>
                                            {isEditMode ? '수정 불가' : '자동 연동'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="예: /api/products 또는 /api/claims"
                                        value={apiEndpoint}
                                        disabled={isEditMode}
                                        onChange={(e) => handleApiEndpointChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box',
                                            color: isEditMode ? '#64748b' : '#0f172a',
                                            backgroundColor: isEditMode ? '#f1f5f9' : '#ffffff',
                                            cursor: isEditMode ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    {/* 빠른 선택 추천 칩 (신규 모드 전용) */}
                                    {!isEditMode && (
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            {[
                                                { label: '/api/products', name: '제품' },
                                                { label: '/api/claims', name: '클레임' },
                                                { label: '/api/manufacturers', name: '제조사' },
                                                { label: '/api/brands', name: '브랜드' },
                                                { label: '/api/announcements', name: '공지' }
                                            ].map(chip => (
                                                <button
                                                    key={chip.label}
                                                    type="button"
                                                    onClick={() => handleApiEndpointChange(chip.label)}
                                                    style={{
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        border: apiEndpoint === chip.label ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                                        background: apiEndpoint === chip.label ? '#eff6ff' : '#f8fafc',
                                                        color: apiEndpoint === chip.label ? '#1d4ed8' : '#64748b',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {chip.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {isEditMode && (
                                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                            기존 연동된 백엔드 API 엔드포인트입니다 (수정 불가).
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                            대상 테이블명 (Target Table)
                                        </label>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: isEditMode ? '#fee2e2' : '#ecfdf5',
                                            color: isEditMode ? '#991b1b' : '#059669',
                                            fontSize: '10px',
                                            fontWeight: '700'
                                        }}>
                                            {isEditMode ? '수정 불가' : '자동 연동'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="예: product, claim, manufacturer"
                                        value={targetTable}
                                        disabled={isEditMode}
                                        onChange={(e) => setTargetTable(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box',
                                            color: isEditMode ? '#64748b' : '#0f172a',
                                            backgroundColor: isEditMode ? '#f1f5f9' : '#ffffff',
                                            cursor: isEditMode ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                        {isEditMode 
                                            ? '기존 연동된 데이터베이스 테이블명입니다 (수정 불가).' 
                                            : 'API 및 화면명에 맞춰 DB 테이블명이 자동 입력됩니다 (수정 가능).'}
                                    </span>
                                </div>
                            </div>

                            {/* 3열: 화면 유형 & 행 선택 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                            화면 유형
                                        </label>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            background: '#ecfdf5',
                                            color: '#059669',
                                            fontSize: '10px',
                                            fontWeight: '700'
                                        }}>
                                            수정 가능
                                        </span>
                                    </div>
                                    <select
                                        value={screenType}
                                        onChange={(e) => setScreenType(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            boxSizing: 'border-box',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="GRID">Notion형 데이터 그리드 (GRID)</option>
                                        <option value="DASHBOARD">규칙 기반 대시보드 (DASHBOARD)</option>
                                    </select>
                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                        데이터 목록 그리드 뷰 또는 KPI 차트 대시보드 뷰를 선택합니다.
                                    </span>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                            행 선택 (Selection)
                                        </label>
                                        {isEditMode && (
                                            <span style={{
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: '#fee2e2',
                                                color: '#991b1b',
                                                fontSize: '10px',
                                                fontWeight: '700'
                                            }}>
                                                수정 불가
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '40px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: isEditMode ? 'not-allowed' : 'pointer', fontWeight: '600', color: isEditMode ? '#64748b' : '#1e293b' }}>
                                            <input
                                                type="checkbox"
                                                checked={enableRowSelection}
                                                disabled={isEditMode}
                                                onChange={(e) => setEnableRowSelection(e.target.checked)}
                                                style={{ width: '16px', height: '16px', cursor: isEditMode ? 'not-allowed' : 'pointer' }}
                                            />
                                            체크박스 활성화
                                        </label>
                                        {enableRowSelection && (
                                            <select
                                                value={rowSelectionMode}
                                                disabled={isEditMode}
                                                onChange={(e) => setRowSelectionMode(e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '12px',
                                                    background: isEditMode ? '#f1f5f9' : '#ffffff',
                                                    cursor: isEditMode ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <option value="MULTI">다중 선택 (MULTI)</option>
                                                <option value="SINGLE">단일 선택 (SINGLE)</option>
                                            </select>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                                        {isEditMode 
                                            ? '화면 생성 시 설정된 행 선택 모드가 유지됩니다.' 
                                            : '그리드 행 일괄 선택 및 작업(삭제, 일괄 수정 등) 활성화 여부'}
                                    </span>
                                </div>
                            </div>

                            {/* 4열: 화면 설명 */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                        화면 설명
                                    </label>
                                    <span style={{
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: '#ecfdf5',
                                        color: '#059669',
                                        fontSize: '10px',
                                        fontWeight: '700'
                                    }}>
                                        수정 가능
                                    </span>
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="화면의 목적과 관리 대상 데이터를 간략하게 입력하세요."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    {isEditMode 
                                        ? '화면 상단 및 관리 센터에 표시될 상세 설명을 자유롭게 수정할 수 있습니다.' 
                                        : '💡 화면명 입력 시 기본 안내 문구가 자동 제안되며 자유롭게 수정 가능합니다.'}
                                </span>
                            </div>

                            {/* 하단 친절한 안내 가이드 */}
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '16px' }}>💡</span>
                                <span style={{ fontSize: '12px', color: '#475569' }}>
                                    <strong>관리 팁:</strong> 도메인별 추천 세트를 선택하면 표준 컬럼 및 조회 API 엔드포인트가 한 번에 자동 세팅됩니다.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: 그리드 컬럼 설정 */}
                    {currentStep === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 도메인별 추천 컬럼 셋 바로적용 바 */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '8px',
                                background: '#f8fafc',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {DOMAIN_PRESETS.map(preset => {
                                    const isSelected = selectedDomainKey === preset.key;
                                    return (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => handleApplyDomainPreset(preset.key)}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                                background: isSelected ? '#eff6ff' : '#ffffff',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '3px',
                                                boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#1e40af' : '#1e293b' }}>
                                                {preset.label}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {preset.description}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 상단 툴바: 컬럼 카운트 및 직접 추가 버튼 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>그리드 컬럼 목록 ({columns.length}개)</span>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                                        💡 각 행의 [⚡ 추천 필드]를 선택하면 항목이 자동으로 채워집니다.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddColumn}
                                    style={{
                                        padding: '7px 14px',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <span>➕</span>
                                    <span>컬럼 직접 추가</span>
                                </button>
                            </div>

                            {/* 기준정보 보호 및 컬럼 입력 가이드 배너 */}
                            <div style={{
                                padding: '9px 16px',
                                marginBottom: '4px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '12px',
                                color: '#334155'
                            }}>
                                <span style={{ fontSize: '16px' }}>🔒</span>
                                <div style={{ flex: 1, lineHeight: 1.5 }}>
                                    <strong style={{ color: '#0f172a' }}>컬럼 규칙 및 기준정보 보호 정책:</strong>{' '}
                                    제품코드, 제품명, 브랜드명, 제조사, 클레임번호 등 기존 데이터 연동 컬럼은 시스템 무결성을 위해 한글명 및 영문명 수정과 삭제가 제한됩니다(🔒).
                                    신규 컬럼 등록 시 <strong style={{ color: '#0369a1' }}>표시명은 한글만</strong>, <strong style={{ color: '#166534' }}>시스템 필드 키는 영문만</strong> 입력하실 수 있으며, 모든 영문 키는 고유해야 합니다.
                                </div>
                            </div>

                            {/* 컬럼 설정 테이블 (와이드 레이아웃) */}
                            <div style={{
                                maxHeight: 'calc(88vh - 360px)',
                                minHeight: '260px',
                                overflowY: 'auto',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc', color: '#475569', position: 'sticky', top: 0, zIndex: 2 }}>
                                        <tr>
                                            <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', width: '40px', textAlign: 'center' }}>No</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '180px' }}>⚡ 추천 필드 선택 (자동입력)</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '160px' }}>컬럼 표시명 (한글)</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '150px' }}>시스템 필드 키 (영문)</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '130px' }}>데이터 타입</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '70px' }}>너비(px)</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '130px' }}>기준정보 마스터</th>
                                            <th style={{ padding: '10px 10px', borderBottom: '1px solid #e2e8f0', width: '130px', textAlign: 'center' }}>대시보드 지표</th>
                                            <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', width: '45px', textAlign: 'center' }}>삭제</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {columns.map((col, idx) => {
                                            const isMaster = isMasterColumn(col);
                                            const trimmedKey = (col.fieldKey || '').trim().toLowerCase();
                                            const isDup = trimmedKey !== '' && duplicateFieldKeys.has(trimmedKey);

                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isMaster ? '#fcfdfd' : (idx % 2 === 0 ? '#ffffff' : '#fafafa') }}>
                                                    <td style={{ padding: '8px', color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>
                                                        {idx + 1}
                                                    </td>

                                                    {/* 1. 추천 필드 퀵 선택 드롭다운 */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <select
                                                            onChange={(e) => handleQuickFieldSelect(idx, e.target.value)}
                                                            defaultValue=""
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #93c5fd',
                                                                background: '#eff6ff',
                                                                color: '#1e40af',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="">⚡ 추천 필드 선택...</option>
                                                            {QUICK_FIELD_TEMPLATES.map(t => (
                                                                <option key={t.fieldKey} value={t.fieldKey}>{t.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* 2. 컬럼 표시명 (한글) */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="text"
                                                                placeholder={isMaster ? '기준정보 (수정불가)' : '한글만 입력 (예: 상태)'}
                                                                value={col.label}
                                                                disabled={isMaster}
                                                                readOnly={isMaster}
                                                                onChange={(e) => handleColumnChange(idx, 'label', e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: isMaster ? '6px 8px 6px 24px' : '6px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #cbd5e1',
                                                                    fontSize: '12px',
                                                                    boxSizing: 'border-box',
                                                                    background: isMaster ? '#f1f5f9' : '#ffffff',
                                                                    color: isMaster ? '#64748b' : '#0f172a',
                                                                    fontWeight: isMaster ? '700' : 'normal',
                                                                    cursor: isMaster ? 'not-allowed' : 'text'
                                                                }}
                                                                title={isMaster ? '기준정보 컬럼의 표시명은 수정할 수 없습니다.' : '한글만 입력 가능합니다.'}
                                                            />
                                                            {isMaster && (
                                                                <span 
                                                                    style={{ 
                                                                        position: 'absolute', 
                                                                        left: '6px', 
                                                                        top: '50%', 
                                                                        transform: 'translateY(-50%)', 
                                                                        fontSize: '12px',
                                                                        color: '#64748b' 
                                                                    }}
                                                                    title="기준정보 (수정불가)"
                                                                >
                                                                    🔒
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* 3. 시스템 필드 키 (영문) */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div>
                                                            <input
                                                                type="text"
                                                                placeholder={isMaster ? '기준정보 (수정불가)' : '영문만 입력 (예: status)'}
                                                                value={col.fieldKey}
                                                                disabled={isMaster}
                                                                readOnly={isMaster}
                                                                onChange={(e) => handleColumnChange(idx, 'fieldKey', e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 8px',
                                                                    borderRadius: '6px',
                                                                    border: isDup ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                                                    fontSize: '12px',
                                                                    fontFamily: 'monospace',
                                                                    boxSizing: 'border-box',
                                                                    background: isMaster ? '#f1f5f9' : (isDup ? '#fef2f2' : '#ffffff'),
                                                                    color: isMaster ? '#64748b' : (isDup ? '#b91c1c' : '#0f172a'),
                                                                    fontWeight: (isMaster || isDup) ? '700' : 'normal',
                                                                    cursor: isMaster ? 'not-allowed' : 'text'
                                                                }}
                                                                title={isMaster ? '기준정보 컬럼의 시스템 필드 키는 수정할 수 없습니다.' : (isDup ? '중복된 시스템 필드 키입니다.' : '영문 대소문자, 숫자, 밑줄만 입력 가능합니다.')}
                                                            />
                                                            {isDup && (
                                                                <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px', fontWeight: 'bold' }}>
                                                                    ⚠️ 중복된 영문 키입니다.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* 4. 데이터 타입 */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <select
                                                            value={col.fieldType}
                                                            disabled={isMaster}
                                                            onChange={(e) => handleColumnChange(idx, 'fieldType', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                fontSize: '12px',
                                                                background: isMaster ? '#f1f5f9' : '#ffffff',
                                                                color: isMaster ? '#64748b' : '#0f172a',
                                                                cursor: isMaster ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            {FIELD_TYPES.map(ft => (
                                                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* 5. 너비 */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <input
                                                            type="number"
                                                            value={col.width}
                                                            onChange={(e) => handleColumnChange(idx, 'width', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px 6px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                fontSize: '12px',
                                                                textAlign: 'center',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        />
                                                    </td>

                                                    {/* 6. 마스터 연동 */}
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <select
                                                            value={col.relationSourceId || ''}
                                                            disabled={isMaster && col.relationSourceId != null}
                                                            onChange={(e) => handleColumnChange(idx, 'relationSourceId', e.target.value || null)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                fontSize: '11px',
                                                                background: (isMaster && col.relationSourceId != null) ? '#f1f5f9' : '#ffffff',
                                                                color: (isMaster && col.relationSourceId != null) ? '#64748b' : '#0f172a',
                                                                cursor: (isMaster && col.relationSourceId != null) ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            <option value="">(연동 없음)</option>
                                                            {masterDataSources.map(ds => (
                                                                <option key={ds.id} value={ds.id}>{ds.sourceKey}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* 7. 대시보드 지표 (측정 / 차원 가로 정렬 & 꺾임 방지) */}
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                                            <label title="수치 합계/평균 차트 지표" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: col.isMeasure ? '700' : 'normal', color: col.isMeasure ? '#2563eb' : '#475569' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={col.isMeasure}
                                                                    onChange={(e) => handleColumnChange(idx, 'isMeasure', e.target.checked)}
                                                                />
                                                                <span>측정</span>
                                                            </label>
                                                            <label title="그룹/분류 기준 차트 지표" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: col.isDimension ? '700' : 'normal', color: col.isDimension ? '#059669' : '#475569' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={col.isDimension}
                                                                    onChange={(e) => handleColumnChange(idx, 'isDimension', e.target.checked)}
                                                                />
                                                                <span>차원</span>
                                                            </label>
                                                        </div>
                                                    </td>

                                                    {/* 8. 삭제 */}
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveColumn(idx)}
                                                            disabled={isMaster}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: isMaster ? '#cbd5e1' : '#ef4444',
                                                                cursor: isMaster ? 'not-allowed' : 'pointer',
                                                                fontSize: '15px',
                                                                opacity: isMaster ? 0.35 : 1
                                                            }}
                                                            title={isMaster ? '기준정보 연동 컬럼은 삭제할 수 없습니다.' : '컬럼 삭제'}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: 검색 & 메뉴 배치 */}
                    {currentStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 검색 필드 카탈로그 선택 */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                    🔍 상단 동적 검색 필터 선택 (Search Filters)
                                </label>
                                <div style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '10px',
                                    background: '#f8fafc'
                                }}>
                                    {searchCatalogs.length === 0 ? (
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 검색 필터 카탈로그가 없습니다.</div>
                                    ) : (
                                        searchCatalogs.map(cat => (
                                            <label
                                                key={cat.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '12px',
                                                    background: '#ffffff',
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e2e8f0',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCatalogIds.includes(cat.id)}
                                                    onChange={() => handleToggleCatalog(cat.id)}
                                                />
                                                <span style={{ fontWeight: '600' }}>{cat.label}</span>
                                                <span style={{ fontSize: '10px', color: '#64748b' }}>({cat.componentKey})</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 사이드바 메뉴 배치 */}
                            <div style={{
                                borderTop: '1px solid #e2e8f0',
                                paddingTop: '16px'
                            }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
                                    🧭 사이드바 메뉴 등록 설정 (Navigation Menu)
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                                            상위 메뉴 (Parent)
                                        </span>
                                        <select
                                            value={parentMenuId}
                                            onChange={(e) => setParentMenuId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '12px',
                                                background: '#ffffff'
                                            }}
                                        >
                                            <option value="">(최상위 메뉴로 생성)</option>
                                            {flatMenuOptions.map(opt => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                                            메뉴 아이콘 (Emoji)
                                        </span>
                                        <input
                                            type="text"
                                            value={menuIcon}
                                            onChange={(e) => setMenuIcon(e.target.value)}
                                            placeholder="예: 📦, ⚡, 📋"
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '12px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <span style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                                            표시 순서 (Order)
                                        </span>
                                        <input
                                            type="number"
                                            value={menuOrder}
                                            onChange={(e) => setMenuOrder(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '12px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. 모달 푸터 (액션 버튼) */}
                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {!isEditMode && currentStep === 1 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!screenName.trim()) {
                                        toast.warning('화면명을 입력해주세요.');
                                        return;
                                    }
                                    const matched = inferDomainFromTitle(screenName);
                                    const prefix = matched?.codePrefix || (targetTable ? `SCR_${targetTable.toUpperCase()}` : 'SCR_PAGE');
                                    const finalCode = screenCode.trim() || generateRandomScreenCode(prefix);
                                    const finalApi = (apiEndpoint && apiEndpoint !== '/api/') ? apiEndpoint : (matched?.apiEndpoint || '/api/products');
                                    const finalTable = targetTable.trim() || (matched?.targetTable || 'product');
                                    const finalDesc = description.trim() || (matched?.defaultDescription || `${screenName} 조회를 위한 동적 화면입니다.`);

                                    let finalCols = columns;
                                    if (columns.length <= 1 && matched?.columns) {
                                        finalCols = matched.columns;
                                    }

                                    handleSubmit({
                                        screenCode: finalCode,
                                        screenName: screenName.trim(),
                                        apiEndpoint: finalApi,
                                        targetTable: finalTable,
                                        description: finalDesc,
                                        columns: finalCols
                                    });
                                }}
                                disabled={submitting}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #10b981',
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                title="2단계(컬럼), 3단계(검색)를 거치지 않고 추천 기본 설정으로 화면을 즉시 생성합니다."
                            >
                                <span>⚡</span>
                                <span>기본값으로 즉시 생성</span>
                            </button>
                        )}

                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={submitting}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#1e293b',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                ◀ 이전
                            </button>
                        )}

                        {currentStep < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                다음 ▶
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSubmit()}
                                disabled={submitting}
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: submitting ? '#94a3b8' : (isEditMode ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'linear-gradient(135deg, #003366 0%, #1e40af 100%)'),
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '800',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {submitting 
                                    ? (isEditMode ? '저장 중...' : '생성 중...') 
                                    : (isEditMode ? '💾 화면 수정사항 저장' : '🚀 화면 생성 완료')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalElement, document.body);
};

export default ScreenBuilderModal;
