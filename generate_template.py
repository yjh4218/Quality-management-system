import pandas as pd
import argparse
import os
import sys

def generate_template():
    """
    [QMS 유지보수 가이드]
    본 스크립트는 품질 관리 시스템에서 사용하는 '전성분 등록 템플릿' 엑셀 파일을 생성합니다.
    
    보안 및 유지보수 개선 사항:
    1. 하드코딩된 로컬 절대 경로를 제거하고 argparse를 통해 동적 경로 지정을 지원합니다.
    2. 디렉토리가 존재하지 않을 경우 자동으로 생성하는 로직을 포함합니다.
    3. 예외 처리를 통해 생성 실패 시 명확한 에러 메시지를 출력합니다.
    """
    parser = argparse.ArgumentParser(description="전성분 등록용 엑셀 템플릿 생성 도구")
    parser.add_argument(
        "--output", 
        default="./Ingredient_Template.xlsx",
        help="생성될 엑셀 파일의 저장 경로 (기본값: ./Ingredient_Template.xlsx)"
    )
    
    args = parser.parse_args()
    
    # 엑셀 시트 컬럼 정의
    columns = [
        "국문 전성분",
        "영문 전성분",
        "함량(%, ppm, ppb)",
        "INCI명",
        "알러젠 표시",
        "배합 한도 성분 분류"
    ]
    
    try:
        # 빈 데이터프레임 생성
        df = pd.DataFrame(columns=columns)
        
        # 출력 경로의 디렉토리 존재 여부 확인 및 생성
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # 엑셀 파일 저장
        df.to_excel(args.output, index=False)
        print(f"[성공] 엑셀 템플릿이 다음 경로에 생성되었습니다: {os.path.abspath(args.output)}")
        
    except Exception as e:
        print(f"[오류] 템플릿 생성 중 문제가 발생했습니다: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    generate_template()
