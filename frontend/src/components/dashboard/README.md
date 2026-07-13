# 📈 QMS 분석 대시보드 개발 표준 가이드

본 가이드는 QMS(품질관리시스템) 내 대시보드를 신규 개발하거나 수정할 때 적용해야 하는 레이아웃 구조와 공용 템플릿 컴포넌트 표준을 정의합니다.

> [!IMPORTANT]
> **디자인 헌법: 인라인 스타일 배경색/폰트크기 지정 금지**
> 모든 분석 대시보드는 임의로 배경색, 제목 서체 크기, 패딩 등을 인라인으로 개별 선언해서는 안 되며, 반드시 아래의 **공용 대시보드 컴포넌트 4종**만을 사용해 조립하여 작성해야 합니다. 이를 통해 전체 대시보드의 시각적 정렬(Background: `#f1f5f9`, Title: `24px/800`, Subtitle: `#64748b/14px`)을 상시 유지합니다.

---

## 🛠️ 공용 대시보드 컴포넌트 4종 안내

### 1. `AnalyticsDashboardShell`
- **역할**: 대시보드의 바깥 컨테이너 프레임과 상단 표준 헤더를 구성합니다.
- **주요 특징**: 헤더 우측의 액션 버튼 그룹에 `flex-wrap: wrap`을 적용하여 1280px 미만 해상도에서도 버튼 텍스트가 깨지지 않고 자연스럽게 다음 줄로 내려갑니다.
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
- **주요 특징**:
  - `data.length < emptyThreshold`인 경우, 빈 그래프를 그리지 않고 `"표시할 데이터가 충분하지 않습니다 (최소 {emptyThreshold}건 필요)"` 문구를 대신 렌더링하여 UX 안정성을 돕습니다.
  - Pie/Donut 타입일 때 범례(`<Legend />`)를 필수로 포함하고, 범례와 라벨에 국가명 및 비율(예: `"한국 45%"`)이 한눈에 표기되도록 nameKey 기반 커스텀 포맷 함수를 바인딩합니다.
- **Props**:
  - `title`: 차트 제목
  - `type`: `'bar' | 'line' | 'pie' | 'donut'`
  - `data`: Recharts 바인딩 데이터 배열
  - `dataKey`: 차트 Y축/비율 수치 키
  - `nameKey`: 차트 X축/범례 라벨 키
  - `emptyThreshold`: (선택) 빈 상태 노출 임계값 (기본값: `3`)

---

## 📝 템플릿 사용 예시 코드

새로운 대시보드를 생성할 때 아래 코드 스니펫을 drop-in 구조로 복사하여 수정하십시오:

```jsx
import React, { useState } from 'react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
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
        </AnalyticsDashboardShell>
    );
};

export default SampleDashboardPage;
```
