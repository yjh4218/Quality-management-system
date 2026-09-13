import os
import sys
import time
from playwright.sync_api import sync_playwright

ALL_PAGES = [
    # 1. 종합 모니터링 & 대시보드
    ("dashboard", "01_시스템_대시보드"),
    ("announcements", "02_전체공지_관리"),
    ("notifications", "03_수신_알림_확인"),
    
    # 2. 시스템 거버넌스 & 보안
    ("users", "04_사용자_승인_관리"),
    ("roles", "05_권한_관리_RBAC"),
    ("accessLogs", "06_사용자_접근_로그"),
    ("logs", "07_시스템_변경_이력_AuditTrail"),
    ("bugReports", "08_버그_리포트_관리"),
    ("guideManagement", "09_사용자_가이드_관리"),
    ("dashboardMgmt", "10_대시보드_제작_관리"),
    ("trashBin", "11_데이터_복구_휴지통"),
    ("mailTemplates", "12_제조사_전달_메일_관리"),
    ("notificationSettings", "13_알림_설정_관리"),
    
    # 3. 제품 & 원부자재 BOM
    ("products", "14_제품코드_마스터"),
    ("productDashboard", "15_제품코드_대시보드"),
    ("brands", "16_브랜드_마스터_관리"),
    ("salesChannels", "17_유통_채널_관리"),
    ("ingredientCompliance", "18_성분_안전성_검토"),
    ("bomMaster", "19_구성품_BOM_마스터_관리"),
    ("bomCategories", "20_BOM_유형_설정_관리"),
    
    # 4. 협력 제조사 관리
    ("manufacturers", "21_제조사_정보_관리"),
    ("manufacturerCategories", "22_제조사_구분_관리"),
    ("manufacturerGuide", "23_제조사_협업_가이드"),
    
    # 5. 제조사 Audit & 점검
    ("manufacturerAudits", "24_제조사_Audit_관리"),
    ("manufacturerAuditDashboard", "25_제조사_Audit_대시보드"),
    ("manufacturerAuditItems", "26_제조사_점검항목_관리"),
    
    # 6. 신제품 생산 감리
    ("qualityPhotoAudit", "27_신제품_생산감리"),
    ("productionAuditDashboard", "28_생산감리_대시보드"),
    
    # 7. 포장공정 & 박스 규격
    ("packagingTemplates", "29_포장공정_템플릿_관리"),
    ("spaceRatioCalculator", "30_포장공간비율_계산기"),
    ("outboxCalculator", "31_아웃박스_규격_계산기"),
    
    # 8. 입고 품질 & 출하 승인
    ("qualityDashboard", "32_입고_품질_검사_대시보드"),
    ("quality", "33_입고_품질_및_COA_관리"),
    ("releaseRecord", "34_시장출하_기록_관리"),
    ("documentRequests", "35_필수_품질서류_관리"),
    ("documentTypeConfig", "36_추가서류_설정"),
    ("channelNoteConfig", "37_유통채널_포장특이사항_설정"),
    
    # 9. 클레임 & 통계 분석
    ("claims", "38_클레임_조회_입력"),
    ("claimDashboard", "39_클레임_통계_대시보드"),
    ("lotPpmDashboard", "40_LOT_PPM_분석_대시보드")
]

def capture_screens():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"[INFO] Starting Screen Capture to {output_dir}...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        try:
            print("[INFO] Navigating to http://localhost:5173/ ...")
            page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
            
            # Check if login form is present
            if page.locator("input[placeholder='아이디를 입력하세요'], input[type='text']").count() > 0:
                print("[INFO] Logging in with admin / admin ...")
                # Try finding username and password input
                inputs = page.locator("input")
                inputs.nth(0).fill("admin")
                inputs.nth(1).fill("admin")
                
                # Click login button
                login_btn = page.locator("button[type='submit'], button:has-text('로그인')")
                login_btn.first.click()
                
                # Wait for navigation
                page.wait_for_timeout(2500)
            
            print("[INFO] Login successful or session restored. Ready to capture screens.")
            
            # Allow components and AG Grid styles to settle
            page.wait_for_timeout(1500)
            
            success_count = 0
            for idx, (page_key, file_prefix) in enumerate(ALL_PAGES, start=1):
                try:
                    # Trigger internal navigation
                    page.evaluate(f"""() => {{
                        if (window.__QMS_NAVIGATE__) {{
                            window.__QMS_NAVIGATE__('{page_key}');
                        }}
                    }}""")
                    
                    # Wait for tab content and tables to render
                    page.wait_for_timeout(1200)
                    
                    # Capture screenshot
                    file_path = os.path.join(output_dir, f"{page_key}.png")
                    page.screenshot(path=file_path, full_page=False)
                    print(f"[{idx}/{len(ALL_PAGES)}] Captured {page_key} -> {file_path}")
                    success_count += 1
                except Exception as ex:
                    print(f"[WARN] Failed capturing {page_key}: {ex}")
            
            print(f"[SUCCESS] Screen Capture Completed. Successfully captured {success_count}/{len(ALL_PAGES)} screens.")
            
        except Exception as e:
            print(f"[ERROR] Screen capture process failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_screens()
