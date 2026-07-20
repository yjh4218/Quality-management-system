# 📈 QMS 분석 대시보드 개발 표준 가이드

본 가이드는 QMS(품질관리시스템) 내 대시보드를 신규 개발하거나 수정할 때 적용해야 하는 레이아웃 구조와 공용 템플릿 컴포넌트 표준을 정의합니다.

> [!IMPORTANT]
> **디자인 헌법: 인라인 스타일 배경색/폰트크기 지정 금지**
> 모든 분석 대시보드는 임의로 배경색, 제목 서체 크기, 패딩 등을 인라인으로 개별 선언해서는 안 되며, 반드시 아래의 **공용 대시보드 컴포넌트 5종**만을 사용해 조립하여 작성해야 합니다. 이를 통해 전체 대시보드의 시각적 정렬(Background: `#f1f5f9`, Title: `24px/800`, Subtitle: `#64748b/14px`)을 상시 유지합니다.

---

## 🛠️ 공용 대시보드 컴포넌트 5종 안내

### 1. `AnalyticsDashboardShell`
- **역할**: 대시보드의 바깥 컨테이너 프레임과 상단 표준 헤더를 구성합니다.
- **Props**:
  - `icon`: 헤더 제목 좌측에 표시할 이모지 (예: `'🚨'`, `'📦'`)
  - `title`: 대시보드 타이틀
  - `subtitle`: 타이틀 하단 현황 및 요약 설명 텍스트
  - `backTo`: (선택) 이전 화면 탭 ID
  - `backLabel`: (선택) 이전 이동 버튼 텍스트
  - `onDownloadReport`: (선택) 엑셀/리포트 다운로드 콜백 함수
  - `children`: 하단에 배치할 필터, 요약 카드 및 콘텐츠 영역

### 2. `DashboardFilterBar`
- **역할**: 검색 및 조건 필터들을 uniform한 간격으로 정렬 배치합니다.
- **Props**:
  - `fields`: 필터 항목 배열
    - `label`: 필터 라벨
    - `type`: `'date' | 'text' | 'select'`
    - `value`: 현재 바인딩 값
    - `onChange`: 변경 이벤트 핸들러
  - `onSearch`: 조회/검색 클릭 콜백
  - `onReset`: 초기화 클릭 콜백

### 3. `SummaryCardRow`
- **역할**: 상단의 요약 수치 카드 리스트를 감쌉니다.
- **Props**:
  - `cards`: 수치 카드 속성 배열
    - `icon`: 아이콘 이모지
    - `label`: 카드의 설명
    - `value`: 숫자/수치 데이터
    - `valueColor`: (선택) 강조할 텍스트 색상

### 4. `ChartCard`
- **역할**: Recharts 라이브러리를 감싸며, 데이터가 부족한 경우 깔끔한 경고 메시지를 보여주는 공용 래퍼입니다.
- **Props**:
  - `title`: 차트 제목
  - `type`: `'bar' | 'line' | 'pie' | 'donut'`
  - `data`: Recharts 바인딩 데이터 배열
  - `dataKey`: 차트 Y축/비율 수치 키
  - `nameKey`: 차트 X축/범례 라벨 키
  - `emptyThreshold`: (선택) 빈 상태 노출 임계값 (기본값: `3`)

### 5. `DashboardDataTable`
- **역할**: 대시보드 하단의 데이터 테이블을 표현하는 공용 컴포넌트입니다.
- **주요 특징**:
  - `ag-theme-quartz` 테마를 적용하여 세련되고 모던한 시각적 효과를 부여합니다.
  - 내부적으로 페이징 기능 및 이전/다음 버튼, 페이지 사이즈 셀렉터를 포함하고 있어 복잡한 페이징 코드를 공용화합니다.
  - `rowHeight={54}` 고정 및 개별 헤더 필터 비활성화를 기본 규격으로 내장합니다.
- **Props**:
  - `title`: 그리드 영역 제목 (예: `"📋 클레임 조회 결과 목록"`)
  - `rowData`: 그리드 행 데이터 배열
  - `columnDefs`: 그리드 열 설정 배열
  - `onRowDoubleClick`: 행 더블 클릭 콜백 함수
  - `pageSizeOptions`: (선택) 페이지당 표시 개수 목록 (기본값: `[10, 20, 50, 100]`)
  - `defaultPageSize`: (선택) 초기 페이지 사이즈 (기본값: `20`)

---

## 🎨 공용 상태 셀 렌더러

### `StatusBadgeRenderer`
- **역할**: AG Grid의 `cellRenderer`로 동작하며 등급, 상태, 판정 결과를 세련된 pill 배지로 표현합니다.
- **Props**:
  - `value`: 셀에 해당하는 현재 데이터 값
- **폴백**: 규칙에 일치하는 키워드가 없더라도 누락되거나 숨겨지지 않도록 기본 회색 뱃지로 안전하게 폴백합니다.

---

## 📝 템플릿 사용 예시 코드

새로운 대시보드를 생성하거나 마이그레이션할 때 아래 코드 스니펫을 drop-in 구조로 활용하십시오:

```jsx
import React, { useState, useMemo } from 'react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';

const SampleDashboardPage = ({ user, onNavigate }) => {
    const [filterText, setFilterText] = useState('');
    
    const filterFields = [
        { label: '조회명', type: 'text', value: filterText, onChange: (e) => setFilterText(e.target.value) }
    ];
    
    const summaryCards = [
        { icon: '📊', label: '전체 지표', value: 124 },
        { icon: '⚠️', label: '대기 건수', value: 3, valueColor: '#ef4444' }
    ];

    const chartData = [
        { category: 'A팀', count: 45 },
        { category: 'B팀', count: 32 },
        { category: 'C팀', count: 18 }
    ];

    const gridData = [
        { id: 1, name: '품목 A', status: '접수', date: '2026-07-16' },
        { id: 2, name: '품목 B', status: '완료', date: '2026-07-15' }
    ];

    const columnDefs = useMemo(() => [
        { field: 'id', headerName: 'ID', width: 80, cellClass: 'text-center' },
        { field: 'name', headerName: '품목명', flex: 1, cellClass: 'text-left' },
        { 
            field: 'status', 
            headerName: '상태', 
            width: 120, 
            cellClass: 'text-center',
            cellRenderer: (params) => <StatusBadgeRenderer value={params.value} />
        },
        { field: 'date', headerName: '날짜', width: 130, cellClass: 'text-center' }
    ], []);

    return (
        <AnalyticsDashboardShell
            icon="📊"
            title="표준 분석 대시보드"
            subtitle="QMS 템플릿을 준수한 표준 대시보드 예시 화면입니다."
            onDownloadReport={() => alert('엑셀 파일 준비 중')}
        >
            {/* 1. 필터 바 */}
            <DashboardFilterBar 
                fields={filterFields} 
                onSearch={() => console.log('검색 실행')} 
                onReset={() => setFilterText('')} 
            />

            {/* 2. 요약 카드 행 */}
            <SummaryCardRow cards={summaryCards} />

            {/* 3. 콘텐츠 영역 (차트 2열 배치) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
                <ChartCard 
                    title="부서별 데이터 현황" 
                    type="bar" 
                    data={chartData} 
                    dataKey="count" 
                    nameKey="category" 
                />
                <ChartCard 
                    title="점유율 비율" 
                    type="pie" 
                    data={chartData} 
                    dataKey="count" 
                    nameKey="category" 
                />
            </div>

            {/* 4. 공용 데이터 테이블 영역 */}
            <DashboardDataTable
                title="📋 샘플 상세 조회 내역"
                rowData={gridData}
                columnDefs={columnDefs}
                defaultPageSize={10}
            />
        </AnalyticsDashboardShell>
    );
};

export default SampleDashboardPage;
```
