// QMS 상태 배지 색상 표준 및 확장 맵핑 정의
export const STATUS_BADGE = {
  // 최우선 순위 판정 결과
  '적합': 'bg-green-100 text-green-800 border border-green-200',
  '부적합': 'bg-red-100 text-red-800 border border-red-200',
  '반려': 'bg-red-100 text-red-800 border border-red-200',
  '반품': 'bg-red-100 text-red-800 border border-red-200',
  '검사 완료': 'bg-green-100 text-green-800 border border-green-200',

  // 표준 5단계 상태
  '0단계 (접수 대기)': 'bg-gray-100 text-gray-800 border border-gray-200',
  '검사 대기': 'bg-gray-100 text-gray-800 border border-gray-200',
  '1단계 (원인 분석)': 'bg-blue-100 text-blue-800 border border-blue-200',
  '검사 중': 'bg-blue-100 text-blue-800 border border-blue-200',
  '2단계 (대책 수립)': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  '대책 재요청': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  '3단계 (대책 적용)': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  '4단계 (효과 검증)': 'bg-purple-100 text-purple-800 border border-purple-200',
  '5단계 (종결)': 'bg-green-100 text-green-800 border border-green-200',
  '품질 검사 필요': 'bg-blue-100 text-blue-800 border border-blue-200',

  // 기본 기타 상태 폴백
  '대기': 'bg-gray-100 text-gray-800 border border-gray-200',
  '진행중': 'bg-blue-100 text-blue-800 border border-blue-200',
  '완료': 'bg-green-100 text-green-800 border border-green-200',
  '보류': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  '취소': 'bg-red-100 text-red-800 border border-red-200',
};

/**
 * 주어진 상태값에 가장 알맞은 배지 스타일 클래스를 반환합니다.
 * 부분 일치 매핑 및 최우선 순위 매핑 규칙을 적용합니다.
 */
export const getStatusBadgeClass = (status) => {
  if (!status) return STATUS_BADGE['대기'];
  const trimmed = status.trim();

  // 최우선 판정 결과 매핑
  if (trimmed.includes('부적합') || trimmed.includes('반려') || trimmed.includes('반품')) {
    return STATUS_BADGE['부적합'];
  }
  if (trimmed.includes('적합') || trimmed.includes('완료') || trimmed.includes('종결')) {
    return STATUS_BADGE['완료'];
  }

  // 정확한 매핑 존재 시 반환
  if (STATUS_BADGE[trimmed]) {
    return STATUS_BADGE[trimmed];
  }

  // 부분 일치 매핑 처리
  if (trimmed.includes('0단계') || trimmed.includes('대기')) return STATUS_BADGE['0단계 (접수 대기)'];
  if (trimmed.includes('1단계') || trimmed.includes('분석') || trimmed.includes('검사 중')) return STATUS_BADGE['1단계 (원인 분석)'];
  if (trimmed.includes('2단계') || trimmed.includes('대책 수립')) return STATUS_BADGE['2단계 (대책 수립)'];
  if (trimmed.includes('3단계') || trimmed.includes('대책 적용') || trimmed.includes('적용')) return STATUS_BADGE['3단계 (대책 적용)'];
  if (trimmed.includes('4단계') || trimmed.includes('효과 검증') || trimmed.includes('검증')) return STATUS_BADGE['4단계 (효과 검증)'];
  if (trimmed.includes('5단계') || trimmed.includes('종결') || trimmed.includes('완료')) return STATUS_BADGE['5단계 (종결)'];

  return STATUS_BADGE['대기'];
};
