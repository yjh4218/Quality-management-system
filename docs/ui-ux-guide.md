# 🎨 QMS UI/UX 표준 가이드 (ui-ux-guide.md)

**목적**: 모든 화면이 통일된 구조와 UX 패턴을 유지하여 사용자가 어느 메뉴에서도 친숙하게 사용할 수 있도록 표준을 정의한다.  
**원칙**: "사용자는 학습 없이 사용할 수 있어야 한다."  
**기준 화면**: [제품 마스터 수정] Drawer/Modal이 모든 상세 화면의 디자인 표준.

---

## 1. 화면 유형별 구조 정의

### 1-1. 목록 조회 화면 (List Screen)

모든 목록 화면은 다음 3-영역 구조를 따른다.

```
┌─────────────────────────────────────────────────────┐
│  [PAGE HEADER]                                       │
│  화면명 (한국어)          [💡 도움말]  [+ 신규등록]   │
├─────────────────────────────────────────────────────┤
│  [SEARCH AREA] ─ 회색 배경 박스                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 검색항목1  │ │ 검색항목2  │ │ 검색항목3  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                              [초기화]  [🔍 조회]     │
├─────────────────────────────────────────────────────┤
│  [GRID AREA] ─ AG Grid                              │
│  전체 N건                      [Excel 다운로드]       │
│  ┌────────────────────────────────────────────────┐ │
│  │  컬럼1  │  컬럼2  │  컬럼3  │  컬럼4  │ 액션  │ │
│  │  데이터  │  데이터  │  데이터  │  데이터  │ [수정] │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 검색 영역 규칙

- 검색 항목은 **좌측 정렬**, 최대 **한 행에 3~4개**
- **[초기화] 버튼**: 항상 [조회] 버튼 왼쪽에 위치, outline 스타일
- **[조회] 버튼**: 항상 **우측 끝 고정**, Primary 색상 (파란색), 🔍 아이콘 포함
- Enter 키 입력 시 조회 실행
- 날짜 범위 검색: 시작일 ~ 종료일 형태 (기본값: 당월 1일 ~ 오늘)

```jsx
// 검색 버튼 배치 표준 예시
<div className="flex justify-end gap-2 mt-3">
  <Button variant="outline" onClick={handleReset}>초기화</Button>
  <Button onClick={handleSearch}>
    <Search className="w-4 h-4 mr-1" /> 조회
  </Button>
</div>
```

#### 그리드(AG Grid) 규칙

- 기본 정렬: **날짜(최신순) → 코드 → 명칭** 순
- 행 클릭: 상세 팝업(Drawer/Modal) 오픈
- 페이지네이션: 기본 50건/페이지
- 컬럼 헤더: 한국어 사용
- 숫자 컬럼: 우측 정렬 (`type: 'numericColumn'`)
- 날짜 컬럼: `YYYY-MM-DD` 형식

---

### 1-2. 상세/등록 팝업 화면 (Drawer / Modal)

#### Drawer (우측 슬라이드) - 상세 수정용

```
┌────────────────────────────────────────────────────────┐
│                              ╔══════════════════════╗  │
│   [목록 화면 (흐림 처리)]     ║  [팝업 제목]       ✕ ║  │
│                              ║─────────────────────║  │
│                              ║  [섹션 그룹 1]       ║  │
│                              ║  라벨  [입력필드]    ║  │
│                              ║  라벨  [입력필드]    ║  │
│                              ║─────────────────────║  │
│                              ║  [섹션 그룹 2]       ║  │
│                              ║  라벨  [입력필드]    ║  │
│                              ║─────────────────────║  │
│                              ║  [하단 고정]         ║  │
│                              ║  [취소]    [저장]    ║  │
│                              ╚══════════════════════╝  │
└────────────────────────────────────────────────────────┘
```

- **너비**: `max-w-xl` (512px) ~ `max-w-2xl` (672px) 사이
- 복잡한 양식(필드 10개 이상): `max-w-2xl`
- 단순 수정(필드 5개 이하): `max-w-xl`

#### Modal (중앙 팝업) - 확인/간단 입력용

- **크기**: `sm` (384px) / `md` (512px) / `lg` (768px)
- 삭제 확인, 상태 변경 등 단순 확인: `sm`
- 단계별 워크플로 입력: `lg`

#### 공통 팝업 규칙

```jsx
// 팝업 하단 버튼 배치 - 항상 이 순서
<div className="flex justify-end gap-2 pt-4 border-t">
  <Button variant="outline" onClick={onClose}>취소</Button>
  <Button onClick={handleSave} disabled={isLoading}>
    {isLoading ? <Spinner /> : '저장'}
  </Button>
</div>
```

- [취소] 항상 왼쪽, [저장/확인] 항상 오른쪽
- 저장 중 버튼 비활성화 + 로딩 스피너 표시
- ESC 키로 팝업 닫기 지원

---

## 2. 공통 UX 패턴

### 2-1. 비동기 처리 표준

모든 API 호출에는 Loading + Toast 적용이 **필수**.

```jsx
// 표준 비동기 처리 패턴
const handleSave = async () => {
  setIsLoading(true);
  try {
    await api.post('/endpoint', formData);
    toast.success('저장되었습니다.');  // 성공 토스트
    onClose();
    onRefresh();
  } catch (error) {
    // 서버 에러 메시지 우선, 없으면 기본 메시지
    const msg = error.response?.data?.message || '저장 중 오류가 발생했습니다.';
    toast.error(msg);  // 실패 토스트
  } finally {
    setIsLoading(false);
  }
};
```

#### Toast 메시지 기준

| 상황 | 유형 | 메시지 형식 |
|------|------|-----------|
| 저장 성공 | `success` | "저장되었습니다." |
| 삭제 성공 | `success` | "{항목명}이(가) 삭제되었습니다." |
| 유효성 오류 | `warning` | "{필드명}을(를) 입력해 주세요." |
| API 오류 | `error` | 서버 메시지 또는 "처리 중 오류가 발생했습니다." |

### 2-2. 로딩 스피너

```jsx
// 전체 화면 로딩 (초기 데이터 로드)
if (isLoading) return (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
  </div>
);

// 버튼 내 로딩 (액션 처리 중)
<Button disabled={isLoading}>
  {isLoading
    ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />처리 중...</>
    : '저장'}
</Button>
```

### 2-3. 삭제 확인 Dialog

```jsx
// 삭제는 반드시 확인 Dialog 후 실행
const handleDelete = () => {
  if (!confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  // 삭제 실행
};
// → 실제 구현 시 커스텀 ConfirmDialog 컴포넌트 사용 (window.confirm 사용 금지)
```

---

## 3. 컴포넌트 규칙

### 3-1. 입력 필드 라벨

```jsx
// 필수 필드: 라벨 오른쪽에 빨간 * 표시
<label className="text-sm font-medium text-gray-700">
  거래처명 <span className="text-red-500">*</span>
</label>

// 선택 필드: * 없음
<label className="text-sm font-medium text-gray-700">
  비고
</label>
```

### 3-2. 폼 레이아웃 (팝업 내부)

```jsx
// 2컬럼 그리드 레이아웃 표준
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1">
    <label>필드명 <span className="text-red-500">*</span></label>
    <Input value={...} onChange={...} />
  </div>
  <div className="space-y-1">
    <label>필드명</label>
    <Select>...</Select>
  </div>
</div>

// 전체 너비 필드 (비고, 설명 등)
<div className="col-span-2 space-y-1">
  <label>비고</label>
  <Textarea rows={3} />
</div>
```

### 3-3. 상태 배지(Badge)

```jsx
// 상태값에 따른 배지 색상 표준
const STATUS_BADGE = {
  '진행중': 'bg-blue-100 text-blue-800',
  '완료':   'bg-green-100 text-green-800',
  '보류':   'bg-yellow-100 text-yellow-800',
  '취소':   'bg-red-100 text-red-800',
  '대기':   'bg-gray-100 text-gray-800',
};

<span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
  {status}
</span>
```

### 3-4. 도움말 버튼 (💡)

```jsx
// 모든 페이지 헤더에 필수 적용
<div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-bold">부적합 관리</h1>
  <div className="flex gap-2">
    <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
      💡 도움말
    </Button>
    <Button onClick={() => setRegisterOpen(true)}>
      + 신규등록
    </Button>
  </div>
</div>
```

---

## 4. 컬러 시스템 및 타이포그래피

### 4-1. 주요 색상 (Tailwind 기준)

| 용도 | 클래스 | 비고 |
|------|--------|------|
| Primary (주요 액션) | `bg-blue-600 hover:bg-blue-700` | 조회, 저장 버튼 |
| Danger (위험 액션) | `bg-red-600 hover:bg-red-700` | 삭제 버튼 |
| Secondary (보조) | `border border-gray-300` | 취소, 초기화 버튼 |
| Page Background | `bg-gray-50` | 전체 배경 |
| Card/Panel | `bg-white` | 카드, 팝업 배경 |
| Border | `border-gray-200` | 구분선 |

### 4-2. 타이포그래피

| 요소 | 클래스 |
|------|--------|
| 페이지 제목 | `text-xl font-bold text-gray-900` |
| 섹션 제목 | `text-sm font-semibold text-gray-700` |
| 라벨 | `text-sm font-medium text-gray-600` |
| 본문 | `text-sm text-gray-800` |
| 보조 텍스트 | `text-xs text-gray-500` |

---

## 5. React 개발 표준

### 5-1. 컴포넌트 파일 구조

```
frontend/src/
├── pages/           # 페이지 단위 컴포넌트 (라우팅)
│   └── ClaimPage.jsx
├── components/      # 재사용 공통 컴포넌트
│   ├── common/      # 버튼, 입력, 배지 등 원자 컴포넌트
│   └── layout/      # 레이아웃 컴포넌트
├── hooks/           # 커스텀 훅
│   └── useClaimList.js
├── services/        # API 호출 함수
│   └── claimService.js
├── utils/           # 유틸리티 함수
└── constants/       # 상수 정의
    └── pageGuides.js  # 도움말 콘텐츠
```

### 5-2. API 호출 표준 (axios 인스턴스)

```jsx
// services/api.js - 공통 axios 인스턴스
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// JWT 자동 첨부
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 시 로그인 페이지 이동
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 5-3. 커스텀 훅 패턴 (useXxxList)

```jsx
// hooks/useClaimList.js 예시 구조
const useClaimList = () => {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ startDate: '', endDate: '', status: '' });

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/claims', { params: searchParams });
      setList(data);
    } catch (e) {
      toast.error('목록 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  return { list, isLoading, searchParams, setSearchParams, fetchList };
};
```

### 5-4. AG Grid 표준 설정

```jsx
// 공통 Grid 기본 옵션
const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: false,      // 컬럼 필터는 비활성화 (검색창으로 통일)
  minWidth: 80,
};

const gridOptions = {
  rowHeight: 40,
  headerHeight: 44,
  pagination: true,
  paginationPageSize: 50,
  onRowClicked: (e) => handleRowClick(e.data),  // 행 클릭 → 상세 팝업
  suppressCellFocus: true,
};
```

---

## 6. 반응형 규칙

- **최소 지원 해상도**: 1280px (내부 관리 시스템 특성상 데스크탑 위주)
- 팝업: 모바일에서는 `w-full h-full` 풀스크린으로 전환
- 검색 영역: 모바일에서 `grid-cols-1` (단일 열)로 전환

---

## 7. 금지 사항 (Anti-patterns)

| 금지 | 이유 |
|------|------|
| `window.alert()` / `window.confirm()` 직접 사용 | 커스텀 Dialog 컴포넌트 사용 |
| 인라인 스타일 (`style={{}}`) 남용 | Tailwind 클래스로 대체 |
| API 호출을 컴포넌트 내 직접 작성 | 반드시 `services/` 레이어 분리 |
| 상태 관리 없는 폼 | `useState` 또는 `react-hook-form` 사용 |
| Loading/Toast 없는 비동기 처리 | UX 표준 위반 |
