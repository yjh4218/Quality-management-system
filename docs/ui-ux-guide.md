# 🎨 QMS UI/UX 표준 가이드 (ui-ux-guide.md)

**목적**: 모든 화면이 통일된 구조와 UX 패턴을 유지하여 사용자가 어느 메뉴에서도 친숙하게 사용할 수 있도록 표준을 정의한다.  
**원칙**: "사용자는 학습 없이 사용할 수 있어야 한다."  
**기준 화면**: [제품 마스터 수정] Drawer/Modal이 모든 상세 화면의 디자인 표준.

> **문서 관계**: 이 문서는 `design-system.md`의 하위 규칙을 포함합니다.  
> **포함 규칙**: `form-input-system.md` (폼·팝업·검색 UI 기준) 내용이 통합되었습니다.  
> **참조 스킬**: `ui-ux-designer`, `ui-ux-pro-max`

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
<div className="flex justify-end gap-2 mt-3">
  <Button variant="outline" onClick={handleReset}>초기화</Button>
  <Button onClick={handleSearch}>
    <Search className="w-4 h-4 mr-1" /> 조회
  </Button>
</div>
```

#### 그리드(AG Grid) 규칙

- **행 높이 표준화 (rowHeight)**: 모든 목록 화면의 그리드는 **`rowHeight={54}` 속성을 필수 적용**하여 정보 밀도를 제품 마스터와 동일하게 일괄 통일한다. 인라인 하드코딩 속성값(`rowHeight=`)이 전역 스타일(`--ag-row-height: 54px`)을 덮어쓰지 않도록 주의한다.
- 기본 정렬: **날짜(최신순) → 코드 → 명칭** 순
- 행 클릭: 상세 팝업(Drawer/Modal) 오픈
- 페이지네이션: 기본 50건/페이지
- 컬럼 헤더: 한국어 사용
- 숫자 컬럼: 우측 정렬 (`type: 'numericColumn'`)
- 날짜 컬럼: `YYYY-MM-DD` 형식

---

### 1-2. 상세/등록 팝업 화면 (Drawer / Modal)

#### Drawer (우측 슬라이드) - 상세 수정용

- **너비**: `max-w-xl` (512px) ~ `max-w-2xl` (672px) 사이
- 복잡한 양식(필드 10개 이상): `max-w-2xl`
- 단순 수정(필드 5개 이하): `max-w-xl`

#### Modal (중앙 팝업) — 4단계 고정 사이즈 표준 ✨

"내용에 맞춰 줄어드는" 방식을 버리고, **용도별로 크기를 고정**합니다.

| 사이즈 | width | 용도 |
|---|---|---|
| `sm` | 420px | 확인/경고, 단일 값 입력 (예: 사유 입력, 삭제 확인) |
| `md` | 640px | 일반 등록/수정 폼 (필드 5~8개) |
| `lg` | 880px | 복잡한 등록 폼 (필드 다수, 2단 레이아웃) |
| `xl` | 1120px | 문서 미리보기, 상세 조회 + 이력 탭 |

```jsx
// shadcn Dialog 공통 wrapper
const DIALOG_SIZES = {
  sm: 'sm:max-w-[420px]',
  md: 'sm:max-w-[640px]',
  lg: 'sm:max-w-[880px]',
  xl: 'sm:max-w-[1120px]',
};
// <DialogContent className={DIALOG_SIZES[size]}>
```

- 팝업 내부 패딩: 항상 `p-6`
- 헤더(타이틀) / 본문 / 푸터(버튼) **3단 구조 고정** — 본문만 스크롤(`max-h-[70vh] overflow-y-auto`), 헤더·푸터 고정

#### 공통 팝업 규칙

```jsx
<div className="flex justify-end gap-2 pt-4 border-t">
  <Button variant="outline" onClick={onClose}>취소</Button>
  <Button onClick={handleSave} disabled={isLoading}>
    {isLoading ? <Spinner /> : '저장'}
  </Button>
</div>
```

- **[취소] 항상 왼쪽(outline), [저장] 항상 오른쪽(filled)** — 어느 팝업에서도 동일
- 저장 중 버튼 비활성화 + 로딩 스피너 표시
- ESC 키로 팝업 닫기 지원

---

## 2. 입력 필드 타입별 규칙 (Form Input System)

> `design-system.md` 하위 규칙. **모든 입력 폼, 팝업, 검색 UI**는 이 기준을 따릅니다.

### 2-1. 일반 텍스트 입력

```
라벨 (text-sm font-medium text-primary, 필수면 뒤에 * text-danger)
↓ 4px
입력창 (h-10, rounded-lg, border-[--qms-border], px-3)
↓ 4px (에러 시에만)
에러 메시지 (text-xs text-danger)
```

- placeholder는 "무엇을 넣어야 하는지"만, **예시값 금지**
  - ✅ "거래처명 입력" / ❌ "예: (주)삼성" (헷갈림 유발)

### 2-2. 검색창 (SearchInput)

- 전용 컴포넌트로 분리(`SearchInput`), 일반 텍스트와 시각적으로 구분
- 왼쪽에 돋보기 아이콘 고정, 오른쪽에 X(초기화) 아이콘 — 값 있을 때만 노출
- 목록 화면 상단에 위치 고정, 높이 `h-10`으로 옆 필터 드롭다운과 정렬

### 2-3. 날짜 입력

- **직접 타이핑 금지**, 항상 캘린더 피커 클릭 방식 (오타/형식 오류 원천 차단)
- 표시 형식 통일: `YYYY-MM-DD` (dayjs 포맷 유틸 하나로 통일)
- 기간 검색(시작~종료): 항상 나란히 배치, 사이에 `~` 텍스트로 연결
- 달력 아이콘 오른쪽 고정 배치

### 2-4. 비고/메모 (Textarea)

- 기본 3줄 높이(`rows={3}`), 자동 높이 확장(`resize-none` + auto-grow)
- 글자수 제한이 있으면 우측 하단에 `120/500` 카운터 표시
- 라벨에 "(선택)" 명시 — 필수 여부를 텍스트로도 표기

### 2-5. Select / 드롭다운

- 옵션 10개 이상: combobox(검색형), 미만: 일반 select
- 정해진 상태값(6-Step Workflow 등)은 select, 자유 입력 금지

### 2-6. 상태별 입력 필드 스타일

| 상태 | 스타일 |
|---|---|
| 기본 | `border-[--qms-border]` |
| Focus | `ring-2 ring-[--qms-primary]/20 border-[--qms-primary]` |
| 에러 | `border-[--qms-danger] ring-danger/20` + 하단 에러 메시지 |
| 비활성 | `bg-zinc-50 text-muted cursor-not-allowed` |
| 읽기전용(조회) | 배경 없이 텍스트만, 밑줄 없는 회색 박스 |

---

## 3. 폼 레이아웃 규칙

- **2열 그리드 기본** (`grid grid-cols-2 gap-x-6 gap-y-4`), 넓은 필드(비고, 주소 등)는 `col-span-2`
- 관련 필드는 그룹으로 묶고 그룹 사이 `border-t` + 여백으로 구분 (예: "기본정보" / "담당자정보" / "비고")
- **라벨은 항상 입력창 위쪽 고정** — 좌측 라벨 방식 금지 (반응형 깨짐, 정렬 어려움)
- 필수 필드(*)가 있는 폼 상단에 "* 표시는 필수 입력입니다" 한 줄 안내 고정

```jsx
// 필수 필드
<label className="text-sm font-medium text-gray-700">
  거래처명 <span className="text-red-500">*</span>
</label>

// 선택 필드: "(선택)" 텍스트 명시
<label className="text-sm font-medium text-gray-700">
  비고 <span className="text-gray-400 font-normal text-xs">(선택)</span>
</label>
```

```jsx
// 2컬럼 그리드 표준
<div className="grid grid-cols-2 gap-x-6 gap-y-4">
  <div className="space-y-1">
    <label>필드명 <span className="text-red-500">*</span></label>
    <Input value={...} onChange={...} />
  </div>
  <div className="space-y-1">
    <label>필드명</label>
    <Select>...</Select>
  </div>
</div>

// 전체 너비 필드
<div className="col-span-2 space-y-1">
  <label>비고 <span className="text-gray-400 text-xs">(선택)</span></label>
  <Textarea rows={3} />
</div>
```

---

## 4. 공통 UX 패턴

### 4-1. 비동기 처리 표준

모든 API 호출에는 Loading + Toast 적용이 **필수**.

```jsx
const handleSave = async () => {
  setIsLoading(true);
  try {
    await api.post('/endpoint', formData);
    toast.success('저장되었습니다.');
    onClose();
    onRefresh();
  } catch (error) {
    const msg = error.response?.data?.message || '저장 중 오류가 발생했습니다.';
    toast.error(msg);
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

### 4-2. 로딩 스피너

```jsx
// 전체 화면 로딩
if (isLoading) return (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
  </div>
);

// 버튼 내 로딩 — 반드시 버튼 비활성화 병행
<Button disabled={isLoading}>
  {isLoading
    ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />처리 중...</>
    : '저장'}
</Button>
```

### 4-3. 삭제 확인 Dialog

```jsx
// window.confirm 사용 금지 → 커스텀 ConfirmDialog 사용
openConfirmDialog({
  title: '삭제 확인',
  message: '정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  onConfirm: () => { /* 삭제 실행 */ },
});
```

---

## 5. 컴포넌트 규칙

### 5-1. 상태 배지(Badge)

```jsx
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

### 5-2. 도움말 버튼

```jsx
// 모든 페이지 헤더에 필수 적용
<div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-bold">부적합 관리</h1>
  <div className="flex gap-2">
    <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
      💡 도움말
    </Button>
    <Button onClick={() => setRegisterOpen(true)}>+ 신규등록</Button>
  </div>
</div>
```

### 5-3. 공통 컴포넌트 구축 순서 (신규 개발 시)

1. `FormInput` — 라벨 + 입력 + 에러 묶음
2. `SearchInput` — 돋보기/초기화 아이콘 포함 검색창
3. `DatePicker` — YYYY-MM-DD 강제 캘린더 방식
4. `TextareaField` — 글자수 카운터 포함 Textarea
5. `FormDialog(sm/md/lg/xl)` — 4단계 사이즈 Modal

---

## 6. 컬러 시스템 및 타이포그래피

### 6-1. 주요 색상 (Tailwind 기준)

| 용도 | 클래스 | 비고 |
|------|--------|------|
| Primary (주요 액션) | `bg-blue-600 hover:bg-blue-700` | 조회, 저장 버튼 |
| Danger (위험 액션) | `bg-red-600 hover:bg-red-700` | 삭제 버튼 |
| Secondary (보조) | `border border-gray-300` | 취소, 초기화 버튼 |
| Page Background | `bg-gray-50` | 전체 배경 |
| Card/Panel | `bg-white` | 카드, 팝업 배경 |
| Border | `border-gray-200` | 구분선 |

> ⚠️ **라이트 모드 주의**: 글래스/투명 요소는 `bg-white/80` 이상 불투명도 사용. `bg-white/10`은 너무 투명함.

### 6-2. 타이포그래피

| 요소 | 클래스 |
|------|--------|
| 페이지 제목 | `text-xl font-bold text-gray-900` |
| 섹션 제목 | `text-sm font-semibold text-gray-700` |
| 라벨 | `text-sm font-medium text-gray-600` |
| 본문 | `text-sm text-gray-800` |
| 보조 텍스트 | `text-xs text-gray-500` |

- 본문 `line-height`: 1.5~1.75 사용
- 1행 최대 65~75자 (가독성 기준)

---

## 7. React 개발 표준

### 7-1. 컴포넌트 파일 구조

```
frontend/src/
├── pages/           # 페이지 단위 컴포넌트 (라우팅)
├── components/
│   ├── common/      # 버튼, 입력, 배지 등 원자 컴포넌트
│   └── layout/      # 레이아웃 컴포넌트
├── hooks/           # 커스텀 훅 (useXxxList 패턴)
├── services/        # API 호출 함수 (axios 인스턴스)
├── utils/           # 유틸리티 함수
└── constants/       # 상수 정의 (pageGuides.js 등)
```

### 7-2. API 호출 표준 (axios 인스턴스)

```jsx
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
```

### 7-3. 커스텀 훅 패턴 (useXxxList)

```jsx
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

### 7-4. AG Grid 표준 설정

```jsx
const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: false,   // 컬럼 필터 비활성화 (검색창으로 통일)
  minWidth: 80,
};

const gridOptions = {
  rowHeight: 40,
  headerHeight: 44,
  pagination: true,
  paginationPageSize: 50,
  onRowClicked: (e) => handleRowClick(e.data),
  suppressCellFocus: true,
};
```

---

## 8. 접근성(Accessibility) 체크리스트

> **WCAG 2.1 AA 기준** (`ui-ux-designer` + `ui-ux-pro-max` 통합 반영)

### Priority 1 — CRITICAL
- [ ] 일반 텍스트 색상 대비 최소 **4.5:1** 이상
- [ ] 모든 인터랙티브 요소에 **포커스 링** 표시 (키보드 탐색)
- [ ] 의미 있는 이미지에 **alt 텍스트** 필수
- [ ] 아이콘 전용 버튼에 **aria-label** 부착
- [ ] Tab 키 이동 순서가 시각적 순서와 일치
- [ ] 모든 폼 입력에 `<label for>` 연결

### Priority 2 — HIGH
- [ ] 터치 타겟 최소 **44×44px**
- [ ] 비동기 처리 중 버튼 **비활성화** (더블 클릭 방지)
- [ ] 에러 메시지는 문제 발생 위치 **근처**에 표시
- [ ] 클릭 가능한 모든 요소에 `cursor-pointer`

### Priority 3 — MEDIUM
- [ ] `prefers-reduced-motion` 미디어 쿼리 적용
- [ ] 애니메이션 지속 시간: **150~300ms** (micro-interaction)
- [ ] `transform` / `opacity`만 사용 (width/height 변환 금지)
- [ ] 색상이 정보의 **유일한 표현 수단**이 되면 안 됨

---

## 9. Pre-Delivery 체크리스트

> UI 코드 완료 전 필수 확인 항목 (`ui-ux-pro-max` 기준)

### 시각 품질
- [ ] 이모지를 UI 아이콘으로 사용하지 않음 (SVG 아이콘: Heroicons/Lucide)
- [ ] 아이콘 세트 일관성 유지 (동일 라이브러리)
- [ ] hover 상태가 레이아웃 이동(Layout Shift)을 유발하지 않음
- [ ] 색상 변수 직접 사용 (`bg-primary`, `--qms-primary` 등)

### 인터랙션
- [ ] 클릭 가능한 모든 요소에 `cursor-pointer`
- [ ] hover 시 명확한 시각적 피드백 (색상, 그림자, 보더 등)
- [ ] 트랜지션: `transition-colors duration-200` (150~300ms)
- [ ] 키보드 포커스 상태 가시적

### 라이트/다크 모드
- [ ] 라이트 모드 텍스트 대비: 최소 `#475569` (slate-600) 이상
- [ ] 글래스/투명 요소: 라이트 모드에서 `bg-white/80` 이상
- [ ] 보더가 양쪽 모드에서 모두 보임 (라이트: `border-gray-200`)
- [ ] 두 모드 모두 확인 후 제출

### 레이아웃
- [ ] 고정 네비게이션 뒤에 콘텐츠 가림 없음
- [ ] 모바일에서 가로 스크롤 없음
- [ ] 반응형 375px / 768px / 1024px / 1440px 확인

---

## 10. 반응형 규칙

- **최소 지원 해상도**: 1280px (내부 관리 시스템, 데스크탑 위주)
- 팝업: 모바일에서는 `w-full h-full` 풀스크린으로 전환
- 검색 영역: 모바일에서 `grid-cols-1` (단일 열)로 전환
- 네비게이션 바: `top-4 left-4 right-4` 여백 확보 (콘텐츠 가림 방지)

---

## 11. 금지 사항 (Anti-patterns)

| 금지 | 이유 |
|------|------|
| `window.alert()` / `window.confirm()` 직접 사용 | 커스텀 Dialog 컴포넌트 사용 |
| 인라인 스타일 (`style={{}}`) 남용 | Tailwind 클래스로 대체 |
| API 호출을 컴포넌트 내 직접 작성 | 반드시 `services/` 레이어 분리 |
| 상태 관리 없는 폼 | `useState` 또는 `react-hook-form` 사용 |
| Loading/Toast 없는 비동기 처리 | UX 표준 위반 |
| 이모지를 UI 아이콘으로 사용 | SVG(Heroicons/Lucide) 사용 |
| 좌측 라벨 방식 폼 | 반응형 깨짐 → 항상 위쪽 라벨 |
| 날짜 직접 타이핑 허용 | 캘린더 피커 강제 사용 |
| placeholder에 예시값 입력 | 입력창이 채워진 것처럼 보임 |
| 팝업 크기를 콘텐츠에 맞춰 자유 변경 | 4단계(sm/md/lg/xl) 고정 사이즈 준수 |
| `width/height` 애니메이션 | `transform/opacity`만 사용 |
