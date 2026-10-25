/**
 * QMS 시스템 각 화면별 사용자 가이드 콘텐츠 저장소 (39개 전체 화면 완비)
 * 
 * [규칙]
 * 1. 키값은 App.jsx의 PAGE_INFO 및 currentPage 상태값과 정확히 1:1 일치해야 함.
 * 2. title: 화면 제목
 * 3. sections: 가이드 내용 (subtitle, content, keyPoints)
 */
export const pageGuides = {
    dashboard: {
        title: "📊 시스템 대시보드 가이드",
        sections: [
            {
                subtitle: "위젯 기반 요약 정보",
                content: "오늘의 주요 품질 현황 및 업무 알림을 한눈에 파악할 수 있는 통합 대시보드입니다. 관리자가 설정한 권한별 템플릿 레이아웃에 맞춰 개인화된 위젯이 제공됩니다."
            },
            {
                subtitle: "인입 내역 확인 및 빠른 이동 (Deep Link)",
                content: "클레임 미처리, 신규 생산감리 접수, 입고 대기 내역 등을 클릭하면 해당 전용 관리 화면으로 즉시 이동하여 신속하게 업무를 처리할 수 있습니다."
            }
        ]
    },
    notifications: {
        title: "🔔 수신 알림 확인 가이드",
        sections: [
            {
                subtitle: "실시간 업무 변경 알림 수신",
                content: "클레임 접수 및 상태 변경, 생산감리 검토 요청, 사용자 가입 승인 등 시스템 내에서 나에게 할당되거나 확인해야 할 모든 알림 이력을 실시간으로 확인합니다."
            },
            {
                subtitle: "다중 키워드 검색 및 일괄 읽음 처리",
                content: "전체/미확인/확인완료 탭 필터와 함께 쉼표(,) 및 띄어쓰기 기반 다중 단어 AND 검색을 지원하며, 한 번의 클릭으로 모든 알림을 확인 완료 처리할 수 있습니다."
            }
        ]
    },
    users: {
        title: "👥 사용자 승인 및 권한 관리 가이드",
        sections: [
            {
                subtitle: "신규 가입 계정 검토 및 승인",
                content: "신규 가입 신청한 사용자의 소속(본사/협력사/제조사)과 부서, 연락처를 확인하고 계정 활성화(승인) 또는 차단을 제어합니다."
            },
            {
                subtitle: "역할(Role) 할당 및 시스템 접근 통제",
                content: "관리자(ROLE_ADMIN), 품질팀(ROLE_QUALITY), 제조사(ROLE_MANUFACTURER) 등 정밀한 접근 제어(RBAC) 역할을 부여하여 보안을 유지합니다."
            }
        ]
    },
    logs: {
        title: "📜 시스템 변경 이력 (Audit Trail) 가이드",
        sections: [
            {
                subtitle: "전사 데이터 변경 추적성 확보",
                content: "제품 마스터, 포장 사양, 클레임, 제조사 등 주요 엔티티의 생성, 수정, 삭제(Soft Delete) 작업 이력을 시간대별로 완벽히 기록합니다."
            },
            {
                subtitle: "변경 전/후 데이터 비교",
                content: "어떤 사용자가 언제 어느 항목의 데이터를 어떻게 변경했는지 상세 변경 JSON을 대조하여 감사 추적성을 제공합니다."
            }
        ]
    },
    roles: {
        title: "🔐 권한 및 레이아웃 관리 가이드",
        sections: [
            {
                subtitle: "역할별 메뉴 접근 권한 매트릭스",
                content: "각 역할별로 시스템 내 39개 메뉴에 대한 조회(VIEW), 생성/수정(EDIT), 삭제(DELETE) 권한을 세부적으로 부여하고 제어합니다."
            },
            {
                subtitle: "대시보드 레이아웃 템플릿 매핑",
                content: "해당 권한을 가진 사용자가 로그인했을 때 기본으로 노출될 맞춤형 대시보드 템플릿을 연결합니다."
            }
        ]
    },
    guideManagement: {
        title: "📖 사용자 가이드 마스터 관리 가이드",
        sections: [
            {
                subtitle: "화면별 도움말 콘텐츠 중앙 관리",
                content: "시스템 내 39개 전체 화면의 도움말 제목과 섹션별 설명을 관리자가 직접 편집하고 업데이트할 수 있습니다."
            },
            {
                subtitle: "배포 시드 및 실시간 반영",
                content: "작성된 가이드는 DB에 저장되어 각 화면의 [💡 사용 가이드] 팝업에 실시간으로 반영되며, 신규 배포 시 자동으로 안전하게 초기화/동기화됩니다."
            }
        ]
    },
    dashboardMgmt: {
        title: "🎨 대시보드 템플릿 제작/관리 가이드",
        sections: [
            {
                subtitle: "부서/역할별 대시보드 틀 구성",
                content: "경영진용, 품질관리팀용, 제조사용 등 업무 목적에 맞는 대시보드 템플릿을 신규 생성하고 관리합니다."
            },
            {
                subtitle: "10종 이상의 위젯 자유 조합",
                content: "클레임 현황, 생산감리 타임라인, 입고 품질 합격률 등 다양한 시각화 위젯을 체크박스로 손쉽게 조합하여 템플릿을 구성합니다."
            }
        ]
    },
    trashBin: {
        title: "🗑️ 데이터 복구 (휴지통) 가이드",
        sections: [
            {
                subtitle: "소프트 삭제(Soft Delete) 데이터 안전 보관",
                content: "실수로 삭제된 제품, BOM 부자재, 클레임, 제조사 등의 데이터를 영구 삭제하지 않고 안전하게 임시 보관합니다."
            },
            {
                subtitle: "원클릭 복원 및 완전 삭제",
                content: "데이터 복구 버튼을 눌러 즉시 원래 상태로 원상 복구하거나, 불필요한 데이터를 선별하여 영구 파기할 수 있습니다."
            }
        ]
    },
    brands: {
        title: "🏷️ 브랜드 마스터 관리 가이드",
        sections: [
            {
                subtitle: "사내 운영 브랜드 체계화",
                content: "아누아(ANUA) 등 사내에서 기획 및 유통하는 모든 브랜드 코드와 브랜드명을 등록하고 관리합니다."
            },
            {
                subtitle: "품목 및 클레임 통계 연계",
                content: "등록된 브랜드 정보는 제품코드 마스터 생성 및 브랜드별 품질 통계 분석의 핵심 기준 데이터로 활용됩니다."
            }
        ]
    },
    manufacturers: {
        title: "🏭 제조사 정보 관리 가이드",
        sections: [
            {
                subtitle: "협력 제조사 마스터 정보 관리",
                content: "제조사명, 사업자번호, 대표자, 품질/영업 담당자 연락처, 주소 및 시설 구분을 체계적으로 관리합니다."
            },
            {
                subtitle: "제조사 계정 초대 및 포털 연동",
                content: "제조사별 전용 포털 계정 발급 및 보안 초대 토큰을 생성하여 감리 사진 제출 및 서류 등록을 지원합니다."
            }
        ]
    },
    salesChannels: {
        title: "🌐 유통 채널 마스터 관리 가이드",
        sections: [
            {
                subtitle: "국내/글로벌 유통 채널 관리",
                content: "올리브영, 아마존, 큐텐, 라쿠텐, 코스트코 등 제품이 납품되는 국내외 유통 채널별 코드를 관리합니다."
            },
            {
                subtitle: "채널별 포장/라벨 규격 매핑",
                content: "각 유통 채널에서 요구하는 바코드 표기법, 소비기한 날짜 포맷(YYYY-MM-DD 등), 아웃박스 테이핑/라벨 부착 규칙을 표준화합니다."
            }
        ]
    },
    channelNoteConfig: {
        title: "⚙️ 유통 채널 포장 특이사항 설정 가이드",
        sections: [
            {
                subtitle: "채널별 특수 포장 요구조건 템플릿",
                content: "아마존 FBA 바코드 라벨, 올리브영 전용 스티커, 코스트코 팔레트 적재 제한 등 채널별 포장 특이사항 항목을 마스터로 사전 정의합니다."
            },
            {
                subtitle: "포장사양서 자동 불러오기",
                content: "제품별 포장사양서 작성 시 채널을 선택하면 사전에 등록된 특이사항 템플릿이 자동으로 로드되어 누락을 방지합니다."
            }
        ]
    },
    products: {
        title: "📦 제품코드 마스터 관리 가이드",
        sections: [
            {
                subtitle: "완제품 표준 정보 및 규격 통합 관리",
                content: "품목코드, 한글/영문 제품명, 브랜드, 규격(단상자/인박스/아웃박스), 바코드 정보를 종합 관리합니다."
            },
            {
                subtitle: "3D 포장 시뮬레이션 및 포장사양서 연동",
                content: "제품 상세 Drawer에서 3D 포장 시뮬레이션을 통해 인박스 POP 마주보기, 아웃박스 입수, 팔레트 적재를 시뮬레이션하고 포장사양서 도면을 확정합니다."
            }
        ]
    },
    bomMaster: {
        title: "📏 BOM 마스터 관리 가이드",
        sections: [
            {
                subtitle: "부자재(용기/캡/펌프/단상자 등) 표준화",
                content: "완제품에 투입되는 모든 1차/2차 부자재의 BOM 코드, 유형, 세부유형, 중량/규격, 재질, 제조사 정보를 관리합니다."
            },
            {
                subtitle: "6대 항목 상호작용 및 다중 키워드 AND 검색",
                content: "BOM코드, 유형, 부자재명, 중량, 재질, 제조사 등 6개 필터 바를 활용해 쉼표(,) 및 띄어쓰기 다중 단어로 신속하고 정확하게 부자재를 검색합니다."
            }
        ]
    },
    bomCategories: {
        title: "⚙️ BOM 유형 및 세부분류 설정 가이드",
        sections: [
            {
                subtitle: "부자재 대분류/중분류 카테고리 정의",
                content: "용기류, 캡·펌프류, 단상자류, 라벨류, 완충재류 등 부자재의 표준 유형 체계를 등록하고 정렬 순서를 지정합니다."
            },
            {
                subtitle: "BOM 마스터 및 포장사양서 표준화",
                content: "여기서 정의된 유형 체계는 BOM 등록 및 포장사양서 부자재 구성 목록의 표준 선택 드롭다운으로 자동 연동됩니다."
            }
        ]
    },
    packagingTemplates: {
        title: "📋 포장공정 템플릿 관리 가이드",
        sections: [
            {
                subtitle: "제품 형태별 표준 포장 프로세스 템플릿",
                content: "토너/앰플형, 크림 단지형, 마스크팩형, 튜브형 등 용기 형태별 표준 포장 공정 및 검사 기준을 템플릿으로 사전 구축합니다."
            },
            {
                subtitle: "신제품 포장사양서 신속 작성",
                content: "신제품 개발 시 적합한 공정 템플릿을 원클릭으로 불러와 포장 구성품 및 작업 표준을 즉시 완성할 수 있습니다."
            }
        ]
    },
    spaceRatioCalculator: {
        title: "📐 포장공간비율 법령 계산기 가이드",
        sections: [
            {
                subtitle: "자원의 절약과 재활용 촉진 법령 준수",
                content: "환경부 고시 기준에 따라 화장품 품목 유형별 법적 포장공간비율(10%~25% 이하) 및 포장횟수(1차~2차) 적합성을 실시간 계산합니다."
            },
            {
                subtitle: "용기/단상자 체적 자동 비교 및 판정",
                content: "제품의 실제 치수와 받침판, 완충재 규격을 입력하여 즉시 [적합/부적합] 여부와 여유 공간을 판정합니다."
            }
        ]
    },
    outboxCalculator: {
        title: "📦 아웃박스 규격 및 입수 계산기 가이드",
        sections: [
            {
                subtitle: "최적 아웃박스 규격 역산출",
                content: "단상자 크기와 희망 입수량(예: 24개, 48개)을 입력하면 물류 및 적재에 가장 효율적인 골판지 아웃박스 치수를 자동 계산합니다."
            },
            {
                subtitle: "공간 충진율 및 여유율 분석",
                content: "박스 내부 공차 및 여유 공간을 시각적으로 확인하여 과대포장 및 파손 위험을 사전에 방지합니다."
            }
        ]
    },
    quality: {
        title: "📦 입고 품질 및 COA 관리 가이드",
        sections: [
            {
                subtitle: "완제품 물류센터 입고 검사",
                content: "생산 완료 후 물류센터로 입고되는 제품의 LOT별 성적서(COA), 외관, 수량, 바코드 인쇄 상태를 검사하여 합격/불합격을 판정합니다."
            },
            {
                subtitle: "COA 성적서 파일 업로드 및 관리",
                content: "제조사에서 발행한 원본 시험성적서 PDF/이미지를 LOT별로 영구 아카이빙하여 품질 보증 체계를 유지합니다."
            }
        ]
    },
    releaseRecord: {
        title: "📄 시장출하 기록 관리 가이드",
        sections: [
            {
                subtitle: "화장품법 시장출하 규정 준수",
                content: "제조판매업자로서 제품을 국내외 유통 시장에 출하하기 전 필수 확인 사항(제조번호, 사용기한, 시험검사 결과 등)을 최종 기록합니다."
            },
            {
                subtitle: "출하 승인 및 추적성 확보",
                content: "출하 적합 판정을 받은 제품 LOT만 유통 채널로 출고되도록 승인 이력을 전산 관리합니다."
            }
        ]
    },
    qualityPhotoAudit: {
        title: "📸 신제품 생산감리 관리 가이드",
        sections: [
            {
                subtitle: "생산 라인 현장 사진 실시간 검토",
                content: "제조사 현장에서 초도 생산 시 촬영한 충진, 캡핑, 단상자 포장, LOT 마킹, 봉함 테이프 사진을 실시간으로 확인합니다."
            },
            {
                subtitle: "품질팀 검토 및 승인/반려 워크플로우",
                content: "제출된 감리 데이터를 품질팀이 검토하여 적합 시 [승인], 이상 발견 시 보완 요청 [반려]를 처리하며 알림 메일을 자동 발송합니다."
            }
        ]
    },
    productionAuditDashboard: {
        title: "📊 생산감리 현황 대시보드 가이드",
        sections: [
            {
                subtitle: "전사 신제품 생산감리 진행 현황",
                content: "월별/브랜드별 감리 요청 건수, 승인율, 반려율, 제조사별 적기 제출률을 차트와 지표로 한눈에 모니터링합니다."
            },
            {
                subtitle: "지연 감리 조기 경보",
                content: "생산 예정일 대비 감리 등록이 지연된 제조사 품목을 선별하여 즉시 대처할 수 있도록 지원합니다."
            }
        ]
    },
    claims: {
        title: "🔍 고객 클레임 접수 및 원인 분석 가이드",
        sections: [
            {
                subtitle: "고객 및 채널 불량 클레임 접수",
                content: "소비자 또는 유통 채널에서 인입된 이물, 누액, 파손, 펌프 불량 등 클레임 내역을 사진과 함께 등록합니다."
            },
            {
                subtitle: "제조사 귀책 판정 및 소명 관리",
                content: "클레임 품목의 LOT 번호를 기반으로 제조사를 자동 매핑하고, 제조사 소명서 접수 및 개선대책(CAPA)을 추적합니다."
            }
        ]
    },
    claimDashboard: {
        title: "📈 고객 클레임 분석 대시보드 가이드",
        sections: [
            {
                subtitle: "클레임 발생 추이 및 주요 불량 유형 분석",
                content: "월별 클레임 발생 건수, 불량 유형별 비중(파레토 차트), 브랜드별 클레임 점유율을 종합 시각화합니다."
            },
            {
                subtitle: "개선 효과 측정",
                content: "품질 개선 대책 적용 전/후의 클레임 감소율을 정량적으로 평가합니다."
            }
        ]
    },
    lotPpmDashboard: {
        title: "📉 LOT PPM 분석 & 근본원인 가이드",
        sections: [
            {
                subtitle: "LOT 생산량 대비 불량률(PPM) 정밀 산출",
                content: "각 LOT별 총 생산 수량 대비 클레임 발생 수량을 백만분율(PPM)로 환산하여 객관적인 품질 수준을 계량화합니다."
            },
            {
                subtitle: "5-Why 및 근본원인(Root Cause) 분류",
                content: "원자재 불량, 작업자 숙련도, 설비 오작동 등 근본 원인별 통계를 제공하여 재발 방지 대책을 수립합니다."
            }
        ]
    },
    qualityDashboard: {
        title: "📊 입고 품질 검사 대시보드 가이드",
        sections: [
            {
                subtitle: "물류센터 입고 합격률 및 불량 현황",
                content: "기간별 입고 검사 건수, 초품 합격률, 주요 불합격 사유(라벨 오기, 외관 찌그러짐 등)를 종합 모니터링합니다."
            },
            {
                subtitle: "제조사별 입고 품질 등급 비교",
                content: "협력 제조사별 입고 불량률을 비교 분석하여 우수 제조사 평가의 기초 자료로 활용합니다."
            }
        ]
    },
    productDashboard: {
        title: "📊 제품코드 마스터 대시보드 가이드",
        sections: [
            {
                subtitle: "전사 품목 마스터 현황 요약",
                content: "브랜드별 활성 품목 수, 포장사양서 확정률, 체적 치수 입력 완료율 등 마스터 데이터의 무결성 현황을 모니터링합니다."
            },
            {
                subtitle: "미확정 사양서 조기 식별",
                content: "3D 도면 또는 포장사양이 미확정된 품목들을 선별하여 담당자에게 신속한 등록을 유도합니다."
            }
        ]
    },
    manufacturerAuditItems: {
        title: "📋 제조사 Audit 점검항목 관리 가이드",
        sections: [
            {
                subtitle: "CGMP / ISO 22716 기반 표준 점검표 구성",
                content: "제조 시설, 위생 관리, 원자재 보관, 품질 시험, 공정 관리 등 5대 대분류별 세부 점검 항목과 배점을 관리합니다."
            },
            {
                subtitle: "평가 항목 수정 및 가중치 설정",
                content: "사내 품질 정책 변경에 따라 점검 문항을 유연하게 추가/수정하고 필수 불합격 항목(Critical Point)을 지정합니다."
            }
        ]
    },
    manufacturerAudits: {
        title: "📝 제조사 현장 Audit 관리 가이드",
        sections: [
            {
                subtitle: "제조사 정기/수시 품질 감사 수행",
                content: "실제 제조사 공장을 방문하여 점검 항목별 평가 점수와 현장 확인 사진, 지적 사항(CAR)을 등록합니다."
            },
            {
                subtitle: "종합 등급(A/B/C/D) 자동 판정 및 보고서 생성",
                content: "취득 점수에 따라 우수(A), 양호(B), 보완(C), 부적합(D) 등급을 자동 판정하고 공문용 평가 성적서를 출력합니다."
            }
        ]
    },
    manufacturerAuditDashboard: {
        title: "📊 제조사 Audit 종합 대시보드 가이드",
        sections: [
            {
                subtitle: "전체 협력사 품질 역량 맵",
                content: "협력 제조사들의 평균 Audit 점수 분포, 등급별 비율, 항목별 취약 부문을 레이더 차트로 시각화합니다."
            },
            {
                subtitle: "감사 주기 및 차기 일정 관리",
                content: "제조사별 등급에 따른 차기 정기 감사 도래일을 추적하여 누락 없는 감사를 지원합니다."
            }
        ]
    },
    manufacturerCategories: {
        title: "📂 제조사 구분 관리 가이드",
        sections: [
            {
                subtitle: "제조사 업종 및 생산 품목별 카테고리화",
                content: "OEM/ODM 완제품 제조사, 용기 전문 제조사, 펌프/부자재 제조사, 단상자 인쇄사 등 협력사 유형을 체계화합니다."
            },
            {
                subtitle: "공지사항 및 권한 타겟팅 연계",
                content: "전체공지 등록 시 특정 제조사 카테고리만 지정하여 맞춤형 공문 및 메일을 발송할 수 있습니다."
            }
        ]
    },
    accessLogs: {
        title: "🕒 사용자 접근 로그 가이드",
        sections: [
            {
                subtitle: "시스템 로그인 및 접속 보안 감사",
                content: "모든 사용자의 로그인 시각, 접속 IP, 브라우저 정보, 로그인 성공/실패 이력을 실시간 모니터링합니다."
            },
            {
                subtitle: "비정상 접근 탐지",
                content: "반복적인 비밀번호 오류 및 비인가 IP 접속 시도를 추적하여 계정 탈취 위험을 방지합니다."
            }
        ]
    },
    bugReports: {
        title: "🐞 시스템 버그 리포트 관리 가이드",
        sections: [
            {
                subtitle: "사용자 불편사항 및 시스템 오류 자동 수집",
                content: "사용자가 겪은 오류 내용, 발생 화면, 에러 스택, 스크린샷이 첨부된 버그 리포트를 접수하고 상태(접수/처리중/완료)를 관리합니다."
            },
            {
                subtitle: "무장애 시스템 운영",
                content: "치명적 프론트엔드/백엔드 예외를 개발팀이 신속히 인지하고 패치할 수 있는 Audit 기반을 제공합니다."
            }
        ]
    },
    ingredientCompliance: {
        title: "🧪 화장품 전성분 안전성 검토 가이드",
        sections: [
            {
                subtitle: "6,000건 이상의 화장품 규제 성분 DB 연동",
                content: "식약처 고시 배합금지 성분, 배합한도 성분, 사용상 주의사항 성분 데이터를 기반으로 제품 전성분을 실시간 검토합니다."
            },
            {
                subtitle: "전성분 텍스트 자동 파싱 및 위험 경고",
                content: "제품 전성분 목록을 붙여넣으면 유해 성분 및 한도 초과 위험을 자동으로 분석하여 규제 리스크를 제로화합니다."
            }
        ]
    },
    mailTemplates: {
        title: "📧 제조사 전달 메일 템플릿 관리 가이드",
        sections: [
            {
                subtitle: "업무별 표준 이메일 양식 관리",
                content: "클레임 소명 요청, 생산감리 승인/반려 안내, Audit 결과 통보 등 상황별 이메일 제목과 본문 서식을 관리합니다."
            },
            {
                subtitle: "동적 치환 변수 지원",
                content: "#{제조사명}, #{제품명}, #{클레임번호} 등 동적 변수를 사용하여 클릭 한 번으로 개인화된 공문 메일을 발송합니다."
            }
        ]
    },
    announcements: {
        title: "📢 전사 전체공지 및 분류 관리 가이드",
        sections: [
            {
                subtitle: "사내 및 제조사 타겟 공지사항 전파",
                content: "품질 지침 개정, 법령 변경, 시스템 점검 안내 등을 전체 또는 특정 제조사 그룹을 지정하여 게시합니다."
            },
            {
                subtitle: "공지 카테고리 스타일 및 대량 메일 발송",
                content: "긴급, 중요, 일반 등 카테고리별 글자 색상과 굵기를 지정하고, 공지 등록과 동시에 대상자들에게 알림 이메일을 일괄 발송합니다."
            }
        ]
    },
    manufacturerGuide: {
        title: "🤝 제조사 협업 포털 가이드",
        sections: [
            {
                subtitle: "제조사 전용 업무 안내 포털",
                content: "협력 제조사가 시스템에 접속하여 생산감리 사진을 업로드하고 필수 품질 서류를 제출하는 표준 절차를 안내합니다."
            },
            {
                subtitle: "원활한 품질 소통 체계",
                content: "제조사 담당자가 자주 묻는 질문과 규정 양식을 제공하여 소통 오류를 최소화합니다."
            }
        ]
    },
    documentRequests: {
        title: "📋 필수 품질서류 관리 가이드",
        sections: [
            {
                subtitle: "제조사별 정기 필수 품질 서류 수집",
                content: "사업자등록증, CGMP 적합판정서, ISO 인증서, 책임판매업 등록증, 시험성적서 등 필수 서류의 제출 현황을 관리합니다."
            },
            {
                subtitle: "만료일 추적 및 자동 갱신 알림",
                content: "서류의 유효기간 만료 30일/15일 전에 제조사에 갱신 요청 알림을 자동으로 발송하여 서류 단절을 방지합니다."
            }
        ]
    },
    documentTypeConfig: {
        title: "⚙️ 추가 품질서류 항목 설정 가이드",
        sections: [
            {
                subtitle: "수집 서류 카테고리 및 주기 설정",
                content: "환경 인증서, 비건 인증서, 할랄 인증서 등 제품군 및 제조사 특성에 따라 추가로 요구되는 서류 항목을 정의합니다."
            },
            {
                subtitle: "갱신 주기(연간/반기/수시) 표준화",
                content: "각 서류별 유효기간 검증 규칙과 필수 제출 여부를 사내 규정에 맞게 유연하게 설정합니다."
            }
        ]
    },
    medicalDevices: {
        title: "🩺 의료기기 품목 마스터 및 UDI 관리 가이드",
        sections: [
            {
                subtitle: "의료기기 품목 분류 및 등급 체계",
                content: "의료기기법 및 ISO 13485에 따라 1등급(신고), 2등급(인증), 3~4등급(허가)으로 구분 관리하며, 품목허가번호와 사용목적/적응증을 체계적으로 등록합니다."
            },
            {
                subtitle: "고유기기식별코드(UDI) 및 멸균/SW 관리",
                content: "기기식별자(UDI-DI)와 생산식별자(UDI-PI: LOT/유효기한/일련번호) 체계를 준수하고, 멸균 방식 및 SaMD/SiMD 소프트웨어 버전을 추적 관리합니다."
            }
        ]
    },
    sopManual: {
        title: "📖 표준 품질경영 매뉴얼 (SOP) 가이드",
        sections: [
            {
                subtitle: "ISO 13485 & ISO 22716 표준 업무 절차서 통합",
                content: "화장품 우수제조기준(ISO 22716)과 의료기기 품질경영시스템(ISO 13485)에 따른 표준 운영 절차서(SOP) 전문을 분야별로 열람하고 최신 개정 이력을 확인합니다."
            },
            {
                subtitle: "부서별 업무 지침 및 양식 연계",
                content: "품질보증, 생산관리, 시험검사, 변경관리, 부적합 및 시정조치(CAPA)에 대한 표준 지침을 전자화하여 즉시 검색하고 실무에 적용할 수 있습니다."
            }
        ]
    },
    regulatoryGuide: {
        title: "⚖️ 규제 표준 및 인허가 가이드",
        sections: [
            {
                subtitle: "국내외 규제 요건 비교 및 해설",
                content: "대한민국 식약처(MFDS), 미국 FDA, 유럽 MDR 등 글로벌 주요 규제 기관의 인허가 및 사후관리 요건을 상세히 안내합니다."
            },
            {
                subtitle: "품질책임자 및 관리자 법정 의무",
                content: "화장품 책임판매관리자 및 의료기기 품질책임자의 법정 직무 범위와 안전관리 조치 의무사항을 일목요연하게 제공합니다."
            }
        ]
    },
    controlledDocuments: {
        title: "📂 통제문서 및 개정관리(DMS) 가이드",
        sections: [
            {
                subtitle: "통제문서 라이프사이클 및 개정 추적성",
                content: "ISO 13485 §4.2.4 및 ISO 22716 §17에 부합하도록 초안(DRAFT) 작성부터 검토, 결재 승인, 배포(EFFECTIVE), 구버전 개정대체(SUPERSEDED), 폐기(OBSOLETE)까지 전 수명주기를 완벽히 추적합니다."
            },
            {
                subtitle: "문서화 계층 체계 및 표준 서식",
                content: "Level 1(품질매뉴얼), Level 2(SOP/DHF/DMR), Level 3(작업지침서/VR), Level 4(양식/서식/대외규격) 4단계 문서 체계로 품질 문서를 분류하고 변경 사유와 이력을 체계적으로 관리합니다."
            }
        ]
    },
    trainingManagement: {
        title: "🎓 교육훈련 및 자격관리(Training & Competence) 가이드",
        sections: [
            {
                subtitle: "인적자원 역량 및 교육훈련 체계 (ISO 13485 §6.2 / ISO 22716 §3)",
                content: "품질에 영향을 미치는 모든 인원에 대해 필요한 역량을 결정하고, 표준 교육과정(GMP, 의료기기, 품질일반, 보안, 안전)을 주기적으로 이수하도록 계획 및 실행합니다."
            },
            {
                subtitle: "교육 이수 평가 및 유효성/효과성 평가",
                content: "필기시험, 실기평가, 보고서 평가 등 표준화된 평가 방식으로 합격 여부(Passing Score)를 자동 판정하며, 교육 실시 후 현업 적용 효과성(EFFECTIVE, NEEDS_RETRAINING)을 책임자가 평가하여 교육의 유효성을 입증합니다."
            },
            {
                subtitle: "법정 및 사내 품질 전문 직무 자격 매트릭스 (Competence Matrix)",
                content: "화장품 책임판매관리자, 의료기기 품질책임자, ISO 내부심사원, 출하승인권자 등 필수 전문 자격의 취득·부여·유효기한 및 갱신 현황을 체계적으로 추적하고 만료 도래 시 사전에 알림을 제공합니다."
            }
        ]
    },
    riskManagement: {
        title: "⚠️ 위험관리 (ISO 14971:2019) 프로세스 가이드",
        sections: [
            {
                subtitle: "위해요인 3계층 모델 (Hazard - Hazardous Situation - Harm)",
                content: "ISO 14971:2019 및 ISO 13485:2016 §7.1 규정에 따라 의료기기 설계, 제조공정, 사용자 인터페이스(사용적합성 IEC 62366-1) 전반에 존재하는 잠재적 위해요인을 식별하고 노출 상황과 최종 초래되는 신체적 상해/건강 피해를 3단계 계층 구조로 구조화하여 분석합니다."
            },
            {
                subtitle: "위험 통제 조치 우선순위 및 5x5 FMEA 매트릭스 (Risk Control Hierarchy)",
                content: "위험 점수(심각도 S1~S5 × 발생확률 P1~P5)를 5x5 매트릭스로 평가하여 1~4점(수용가능 ACCEPTABLE), 5~9점(실행가능최저 ALARP), 10~25점(수용불가 UNACCEPTABLE)으로 분류합니다. 통제 조치는 1순위: 설계적 본질안전, 2순위: 기기/공정보호수단, 3순위: 안전정보 라벨링 순서로 강구합니다."
            },
            {
                subtitle: "잔여위험 평가 및 종합 이익-위험 분석 (Benefit-Risk Analysis)",
                content: "통제 조치 적용 후 잔여 심각도와 잔여 발생확률을 재평가하여 모든 위험이 허용 기준 이하로 저감되었는지 검증하고, 불가피하게 ALARP 영역에 잔류하는 위험에 대해 환자에게 제공되는 임상적/의료적 유효성과 이익-위험을 종합 평가하여 승인합니다."
            }
        ]
    },
    designControls: {
        title: "📐 ISO 13485 / 21 CFR 820 설계개발 및 DHF 통제 가이드",
        sections: [
            {
                subtitle: "설계개발 6단계 라이프사이클 (Design Phase)",
                content: "ISO 13485:2016 §7.3에 따라 1. 계획수립(Planning) -> 2. 설계입력(Input) -> 3. 설계출력(Output) -> 4. 설계검증(Verification) -> 5. 설계유효성확인(Validation) -> 6. 설계이관(Transfer)의 전 과정을 단계별 공식 심의(Design Review) 및 Stage-Gate 승인을 거쳐 전이합니다."
            },
            {
                subtitle: "설계이력파일 (Design History File - DHF) 구성 및 불변 보존",
                content: "21 CFR 820.30(j)에 부합하도록 프로젝트별 승인된 설계계획서에 따라 개발되었음을 입증하는 모든 산출물(도면, 회로도, BOM, 검증성적서, 유효성평가서, 심의록, 변경이력)을 DHF로 통합 인덱싱하여 편철하고 임의 훼손 없이 영구 보존합니다."
            },
            {
                subtitle: "요구사항 추적성 매트릭스 (Requirements Traceability Matrix - RTM)",
                content: "사용자 및 규제 요구사항(설계입력 DI)이 어떤 설계출력(DO)으로 구현되었고, 어떤 시험검증(DV) 및 임상/사용성 유효성확인(VAL)을 거쳤으며, ISO 14971 위해요인(Hazard)과 어떻게 통제 연계되었는지 전 구간 5단 양방향 역추적성을 보장합니다."
            }
        ]
    },
    changeControl: {
        title: "🔄 ISO 13485 / ISO 22716 통합 변경관리(Change Control) 표준 가이드",
        sections: [
            {
                subtitle: "변경관리 8단계 표준 수명주기 (Change Lifecycle)",
                content: "ISO 13485:2016 §7.3.9 및 ISO 22716:2007 §11 규정에 따라 1. 변경요청(DRAFT) -> 2. 제출(SUBMITTED) -> 3. 영향평가(IMPACT_ASSESSING) -> 4. CCB 심의(CCB_REVIEW) -> 5. 승인(APPROVED) -> 6. 실행(IN_PROGRESS) -> 7. 효과성 검증(EFFECTIVENESS_CHECK) -> 8. 최종 종결(CLOSED)의 엄격한 변경 통제 라이프사이클을 준수합니다."
            },
            {
                subtitle: "다차원 변경 영향평가 (Change Impact Assessment)",
                content: "원자재, 제품 사양, 제조 공정, 설비, 소프트웨어 등 변경 발생 시 인허가/규제 영향(식약처/FDA/CE 변경신고), 제품 품질/안전, 공정 밸리데이션(IQ/OQ/PQ), 위험관리(ISO 14971 RMF 재평가), 통제문서(DMS 개정), 설계이력파일(DHF)에 미치는 파급 효과를 다각도로 평가합니다."
            },
            {
                subtitle: "변경관리위원회(CCB) 및 효과성 확인 (Effectiveness Review)",
                content: "품질, 생산, 연구, 규제 부서장이 참여하는 CCB의 승인을 득해야 변경이 발효되며, 변경 실행 완료 후 규정된 기간(30/60/90일 또는 초도 3배치) 동안 불량률, 재현성, 품질 안정성을 모니터링하여 변경의 효과성을 공식 검증한 후 종결합니다."
            }
        ]
    },
    supplierManagement: {
        title: "🏭 ISO 13485 / ISO 22716 공급업체·위탁제조 관리(Supplier Management) 표준 가이드",
        sections: [
            {
                subtitle: "공급업체 승인 및 적격성 평가 (Approved Supplier List - ASL)",
                content: "ISO 13485:2016 §7.4.1 및 ISO 22716:2007 §12에 의거, 품질에 직접 영향을 미치는 원자재, 포장재, 위탁제조, 시험검사 및 멸균 서비스 공급업체는 사전 적격성 심사를 거쳐 승인(APPROVED)된 공급업체 목록(ASL)에 등재된 업체만을 거래 대상으로 엄격히 통제합니다."
            },
            {
                subtitle: "정기 공급업체 성과 재평가 (Supplier Performance Evaluation)",
                content: "품질(수입검사 합격률/불량률, 40점), 납기(정시납품률, 25점), 규제/서류 적합성(COA/성적서 적시성, 20점), 서비스/협력(15점)의 4개 영역 100점 만점으로 정기 평가를 실시하며, 평가 결과에 따라 A(우수), B(양호), C(주의/조건부), D(부적격) 등급을 차등 부여하고 C/D 등급 업체는 CAPA 시정조치 또는 거래 정지를 집행합니다."
            },
            {
                subtitle: "품질협약서(QAA) 체결 및 법정 보존 기한 준수",
                content: "위탁제조 및 주요 공급업체와 변경 사전통보 의무(변경 30일/60일 전 통지), 현장 실사권 보장, 결함 발생 시 책임 소재를 명시한 품질보증협약(QAA)을 의무 체결하며, ISO 13485 제품 수명종료 후 5년 / ISO 22716 화장품 유통기한 후 3년 원칙에 따른 보존 기한을 엄격히 추적 관리합니다."
            }
        ]
    },
    traceabilityManagement: {
        title: "🌐 ISO 13485 / ISO 22716 외부연계 및 양방향 추적성(Traceability) 표준 가이드",
        sections: [
            {
                subtitle: "식별 및 양방향 추적성 (Identification & Bidirectional Traceability)",
                content: "ISO 13485:2016 §7.5.8 및 ISO 22716:2007 §8.3에 의거, 원자재 및 포장재 입고 시 부여된 고유 LOT 번호부터 벌크 조제, 충진포장 완제품, 최종 유통 출하까지 전공정에 걸쳐 정방향(Forward: 원자재 ➔ 완제품 ➔ 출하처) 및 역방향(Backward: 완제품/클레임 ➔ 벌크 ➔ 원자재/공급사) 양방향 계층 구조 추적성을 100% 보증합니다."
            },
            {
                subtitle: "외부 시스템(ERP/WMS) 연동 및 수기 대사 (System Reconciliation - DEC-02)",
                content: "ERP(전사자원관리), WMS(물류창고) 시스템과의 인터페이스를 통해 입고, 조제, 충진, 출하 데이터를 연동하며, 시스템 간 수량 및 상태 불일치(Discrepancy)가 발생할 경우 품질 책임자의 검토 및 수기 대사(Manual Reconciliation) 승인 워크플로우를 거쳐 데이터 무결성을 유지합니다."
            },
            {
                subtitle: "GS1 UDI 바코드 및 식별 체계 (Medical Device & Cosmetics UDI)",
                content: "21 CFR 820.65 / 820.120 규격에 부합하는 GS1-128 및 DataMatrix UDI 표준 코드 [(01)GTIN, (10)LOT번호, (17)유효기한, (21)일련번호]를 자동 생성하고 인쇄 이력(Print Count)을 실시간 추적하여 위변조 및 중복 사용을 방지합니다."
            }
        ]
    },
    ncrManagement: {
        title: "⚠️ ISO 13485 / ISO 22716 부적합품 관리 및 출하승인 통제 표준 가이드",
        sections: [
            {
                subtitle: "식별, 문서화 및 즉각 물리적 격리 (Identification & Quarantine)",
                content: "ISO 13485:2016 §8.3 및 ISO 22716:2007 §8.4에 의거, 원자재 입고검사, 제조공정, 완제품 검사 및 보관 중 규격 기준을 벗어난 부적합품이 발견된 즉시 품목, LOT, 수량을 식별하고 식별 라벨을 부착하여 지정된 격리 보관소(Quarantine Area)로 이동시킴으로써 오용 및 무단 출하를 원천 차단합니다."
            },
            {
                subtitle: "다차원 원인조사 및 처리(Disposition) 승인 권한",
                content: "5-Why 및 어골도 기법으로 근본 원인을 규명하고 폐기(Scrap), 공급사 반품(Return), 재작업(Rework), 특채/양보(Concession) 등 처리 방안을 심의합니다. 특채 판정 시 안전성 및 유효성에 영향이 없음을 증명하는 타당성 사유서 작성이 법적으로 의무화되며, 재작업 판정 시 승인된 SOP 작업지침과 재검사 기준에 따라 품질부서 승인 하에 실행됩니다."
            },
            {
                subtitle: "시정조치(CAPA) 연계 및 출하 승인 게이트 (Market Release Gate)",
                content: "치명(Critical) 부적합 또는 주요(Major) 부적합이 반복되는 경우 시정 및 예방조치(CAPA) 발행이 의무화되며, 해결되지 않은 부적합 보고서(NCR)가 존재하는 LOT는 최종 출하 승인(MARKET_RELEASE)이 시스템적으로 자동 차단(Lock/Hold)되어 미검사/부적합 제품의 시장 유통을 방지합니다."
            }
        ]
    },
    complaintSafetyManagement: {
        title: "🛡️ ISO 13485 / ISO 22716 고객 불만 및 시판 후 이상사례 평가 표준 가이드",
        sections: [
            {
                subtitle: "LOT 미상 접수 보장 및 고객 불만 전수 수집 (D-9 해소 / ISO 13485 §8.2.2)",
                content: "소비자가 포장재를 분실하였거나 튜브 끝단 번호가 마모되어 LOT 번호를 확인할 수 없는 경우에도 불만 접수가 누락되지 않도록 'LOT 번호 미상' 접수를 전면 허용하며, 구매 영수증 및 판매 채널 역추적을 통해 잠재적 위험 로트를 탐색합니다."
            },
            {
                subtitle: "의학적 인과관계 평가 (WHO-UMC / 식약처 6단계 표준)",
                content: "인입된 유해사례에 대해 사용 시점과 증상 발현 간의 시간적 선후관계, 기저 질환, 대체 원인 배제 여부를 평가하여 확실(Certain), 가능성 높음(Probable), 가능함(Possible), 관련성 적음(Unlikely), 조건부(Conditional), 평가불가(Unassessable) 6단계로 판정하고 의학적 소견을 기록합니다."
            },
            {
                subtitle: "규제기관 신속보고 (화장품 15일 이내 / 21 CFR 820.198 MDR) 및 CAPA 연계",
                content: "사망, 장애, 입원 등 중대한 유해사례 발생 시 인지일로부터 15일 이내 식약처에 신속보고를 완료해야 하며, 원인 규명 및 재발 방지를 위한 시정 및 예방조치(CAPA)를 즉시 개시합니다. 21 CFR 820.198(b)에 따라 조사를 실시하지 않는 경우 명확한 법적 정당화 사유를 문서화해야 합니다."
            }
        ]
    },
    capaManagement: {
        title: "🛡️ ISO 13485 / ISO 22716 / 21 CFR 820.100 시정 및 예방조치 (CAPA) 표준 업무 가이드",
        sections: [
            {
                subtitle: "5대 품질 소스 통합 발의 및 임시 봉쇄조치 (Source Integration & Containment)",
                content: "고객 불만 및 이상사례(15단계), 부적합품 보고서 NCR(14단계), 변경관리(11단계), 공급업체 감사(12단계), 내부심사 및 공정 일탈 등 5대 소스로부터 CAPA를 연계 발의합니다. 발의 즉시 해당 제품/LOT의 격리(HOLD), 출하 중단 및 유통 재고 확인 등 임시 봉쇄조치를 신속히 취하여 위험 확산을 방지합니다."
            },
            {
                subtitle: "5-Why & Fishbone 다차원 근본원인 규명 (Root Cause Analysis)",
                content: "단순한 증상 처치에 그치지 않고, 5-Why 질문 기법과 6M(Man, Machine, Material, Method, Measurement, Environment) 특성요인도(Fishbone)를 활용하여 오류가 발생할 수밖에 없었던 프로세스 및 시스템적 근본 원인을 과학적으로 도출합니다."
            },
            {
                subtitle: "시정조치(재발 방지)와 예방조치(수평 전개)의 체계적 실행",
                content: "직접적인 부적합 원인을 제거하는 시정조치(Corrective Action)뿐 아니라, 유사 설비, 동일 배합비 품목 및 타 생산 라인으로 확장 적용하는 수평전개 예방조치(Preventive Action) 과제를 편성하고, 담당자 및 명확한 목표일자를 지정하여 이행을 추적합니다."
            },
            {
                subtitle: "사후 객관적 데이터 기반 효과성 검증 (Effectiveness Review) 및 종결 가드",
                content: "조치 완료 후 일정 기간(예: 30일/60일 또는 후속 N개 제조배치) 동안 실제 재발 여부, 불량률 추이, 통계적 지표를 모니터링하여 객관적 증거를 기반으로 효과성(EFFECTIVE)을 판정합니다. 모든 조치과제가 완료되고 효과성이 입증되기 전에는 최종 종결이 시스템적으로 엄격히 통제됩니다."
            }
        ]
    },
    vigilanceRecall: {
        title: "🚨 ISO 13485 / 21 CFR 803 / EU MDR 규제보고(Vigilance) 및 제품 회수(Recall) 관리 가이드",
        sections: [
            {
                subtitle: "국가별 이상사례 법정 기한 자동 산정 (Statutory Vigilance Reporting)",
                content: "식약처 사망/생명위협(7일 이내), 식약처 중대 유해사례(15일 이내), 식약처 통상 부작용(30일 이내), 미국 FDA 5-Day/30-Day MDR, 유럽 EU MDR 즉시(2일)/사망(10일)/중대사고(15일) 등 국가별 법정 보고 기한을 인지일(Awareness Date) 기준으로 실시간 자동 계산하고 D-Day 알림을 제공합니다."
            },
            {
                subtitle: "제품 회수(Product Recall) 등급 분류 및 신속 공표",
                content: "완제품의 위해도에 따라 1등급(사망·영구적 장애 위험), 2등급(일시적·가역적 손상), 3등급(경미한 위반)으로 구분하여 회수계획서를 작성하고, 식약처 및 관련 규제당국에 신속히 보고한 후 거래처 및 소비자 대상 회수 공표를 진행합니다."
            },
            {
                subtitle: "출고 수량 100% 대사(Quantity Reconciliation) 및 종결 가드",
                content: "21 CFR Part 7 및 의료기기법 제34조에 따라, 대상 LOT의 총 출고량(Shipped)은 [회수 수량 + 격리 수량 + 폐기 수량 + 미회수/소진 수량]의 합계와 100% 일치해야 합니다. 오차가 발생할 경우 최종 회수 종결이 시스템적으로 자동 차단(Lock)됩니다."
            },
            {
                subtitle: "시정조치(CAPA) 연계 및 안전성 모니터링",
                content: "중대 이상사례 및 제품 회수 발생 시 즉시 원인규명 및 재발방지를 위한 CAPA(16단계)가 필수 연계되며, 제품 회수 완료 후에도 후속 로트의 유통 안전성을 지속 모니터링합니다."
            }
        ]
    },
    facilityManagement: {
        title: "🛠️ ISO 13485 / ISO 22716 / 21 CFR 820 시설·설비, 교정 및 청정환경 관리 가이드",
        sections: [
            {
                subtitle: "장비/계측기/설비 마스터 원장 관리 (Equipment Master)",
                content: "제조설비, 시험/계측장비, 유틸리티 및 보관설비의 고유 관리코드(EQ-), 모델명, 시리얼, 설치장소, 관리부서, 중요도(중점/일반/보조)를 원장으로 관리하고 가동 상태를 실시간 추적합니다."
            },
            {
                subtitle: "국가표준 소급성 교정 주기 관리 및 불합격 가드 (Calibration Controls)",
                content: "국가공인(KOLAS) 등 공인기관 성적서 번호 및 성적서 파일을 등록하며, 교정 주기(6/12/24개월)에 따른 차기 예정일을 자동 산출합니다. 특히 교정 판정이 불합격(FAIL)인 경우 해당 장비는 즉시 [사용 중지] 상태로 강제 전환되며, 과거 생산/시험 로트에 대한 소급 품질 영향평가가 의무화됩니다."
            },
            {
                subtitle: "예방보전(PM) 스케줄 및 고장 수리 이력 추적 (Maintenance & Repairs)",
                content: "정기 예방보전(PM) 계획에 따른 소모품 교체, 설비 다운타임(Downtime), 비용을 기록하며, PM 완료 시 차기 예정일이 자동 갱신됩니다. 수리/점검 중인 설비는 작업 완료 시까지 가동 상태가 제한됩니다."
            },
            {
                subtitle: "청정실(Cleanroom) 및 작업환경 온·습도·차압·미립자 모니터링 (Environmental Monitoring)",
                content: "Grade C/D 청정실, 원료 칭량실, 포장실, 보관소의 온도(℃), 습도(%), 차압(Pa), 부유 미립자(0.5μm/5.0μm), 미생물 낙하균(CFU)을 실시간 기록합니다. 기준 이탈(OOS) 발생 시 즉시 조치과제(환기율 상향, 공조 점검 등)가 요구됩니다."
            }
        ]
    },
    internalAudit: {
        title: "📋 ISO 13485 / ISO 22716 / ISO 19011 내부심사·자체점검 및 경영검토 가이드",
        sections: [
            {
                subtitle: "내부심사 프로그램 수립 및 심사원 독립성 원칙 (Auditor Independence)",
                content: "ISO 13485:2016 §8.2.4 및 ISO 19011에 따라 연간 심사 프로그램을 수립하고 정기/수시 심사를 운영합니다. 심사의 객관성과 공정성을 확보하기 위해 심사원은 자신의 소속 부서나 직접 수행하는 업무를 심사할 수 없으며, 독립된 적격 심사원이 지정되어야 합니다."
            },
            {
                subtitle: "현장 체크리스트(Checklist) 및 객관적 사실 기반 판정",
                content: "규격 조항별 체크포인트에 따라 문서 검토, 현장 실사, 작업자 인터뷰, 샘플링 검사를 수행하고 확인된 증빙과 관찰 사실을 기록하여 적합(CONFORMING), 부적합(NON_CONFORMING), 해당없음(N/A)을 엄격히 판정합니다."
            },
            {
                subtitle: "지적사항(Finding) 분류 및 중대/주요 부적합 CAPA 연계 가드",
                content: "발견된 부적합은 중대(Critical), 주요(Major), 경미(Minor), 권고(Observation)로 분류되며, 중대 또는 주요 부적합의 경우 원인 분석 및 재발 방지를 위한 시정 및 예방조치(16단계 CAPA) 연계 및 조치 완료 검증 없이는 종결(CLOSED)할 수 없도록 시스템적으로 가드가 작동합니다."
            },
            {
                subtitle: "최고경영자 주관 경영검토 (Management Review - 12대 입력 & 3대 출력)",
                content: "ISO 13485 §5.6 및 21 CFR 820.20(c)에 따라 최고경영자가 참석하는 공식 경영검토 회의를 주관합니다. 내부/외부 심사결과, 고객불만, 공정/제품 적합성, CAPA 상태 등 12대 필수 입력요소를 평가하고, QMS 개선, 제품 개선, 필요 자원(인력/설비/예산) 배분의 3대 출력을 공식 의결하여 회의록으로 관리합니다."
            }
        ]
    },
    officialRecords: {
        title: "📜 공식 원본 및 21 CFR Part 11 전자서명 정책 가이드",
        sections: [
            {
                subtitle: "의사결정대장 DEC-01 준수: 하이브리드 & 전자기록 공식 원본 체계",
                content: "DEC-01 정책에 의거하여 기본적으로 eQMS 내의 암호화된 전자기록과 21 CFR Part 11 전자서명을 법적 공식 원본으로 관리하되, 규제기관 실사 및 감사 제출 시 서명 매니페스트 블록이 포함된 인쇄본에 서명자가 수기 날인/서명하여 보관하는 하이브리드(Hybrid) 보존 체계를 공식 지원합니다."
            },
            {
                subtitle: "21 CFR Part 11 §11.50 서명 매니페스트 및 §11.70 결합성 보장",
                content: "모든 전자서명은 서명자 성명, 서명 일시(타임스탬프), 서명 의미(작성자/검토자/승인자/품질책임자 인가), 서명 사유가 인쇄물과 화면에 명확히 표기되어야 하며, 대상 레코드와 SHA-256 무결성 해시로 암호학적으로 결합되어 위조, 분리, 무단 전용이 불가능합니다."
            },
            {
                subtitle: "21 CFR Part 11 §11.200 서명 시 비밀번호 2차 재인증 (대리 서명 방지)",
                content: "로그인된 세션 상태라 하더라도 전자서명(승인, 인가, 검토)을 수행할 때는 반드시 계정 비밀번호를 재입력하도록 강제합니다. 서버 사이드에서 실시간 BCrypt 일치 여부를 검증하여 본인이 아닌 대리 서명을 원천 차단합니다."
            },
            {
                subtitle: "21 CFR Part 11 자가평가 매트릭스 및 법정보존 기한 관리",
                content: "FDA 21 CFR Part 11의 15대 핵심 조항(시스템 검증, 사본 생성, 감사추적, 접근통제, 서명 제어 등)에 대한 eQMS 기능 정합성을 자가평가하고 증빙을 관리하며, 품질기록 카테고리별(출하승인서, CAPA, 제조기록서 등) 법정 보존 연한(5년~10년/영구) 및 폐기 심의 절차를 체계적으로 통제합니다."
            }
        ]
    },
    csvValidation: {
        title: "🛡️ GAMP 5 / 21 CFR Part 11 컴퓨터화 시스템 밸리데이션(CSV) & Go-Live 가이드",
        sections: [
            {
                subtitle: "GAMP 5 V-모델 수명주기 및 카테고리 4/5 밸리데이션 전략 (Validation Lifecycle)",
                content: "GAMP 5 (Good Automated Manufacturing Practice 5) V-모델에 따라 사용자 요구사항 규격(URS), 기능 및 설계 규격(FS/DS), 적격성평가(IQ/OQ/PQ), 종합 보고서(VSR)로 이어지는 수명주기 전 단계를 검증합니다. 설정 가능 소프트웨어(Category 4) 및 자체 개발 품질 로직(Category 5)의 복합 시스템 특성에 맞춘 리스크 기반 밸리데이션을 수행합니다."
            },
            {
                subtitle: "IQ / OQ / PQ 적격성평가 실행 및 URS 추적성 매트릭스 (Qualification Protocols)",
                content: "설치 적격성(IQ: 서버/DB/보안필터/스토리지), 운전 적격성(OQ: 21 CFR Part 11 전자서명 재인증, 출하승인 게이트, CAPA 가드 등 6대 핵심 비즈니스 통제), 성능 적격성(PQ: 100 동시 사용자 부하, 1만건 그리드 렌더링, 세션 복원성) 시험을 수행하며 각 항목은 URS 요구사항과 100% 추적 연계(Traceability)됩니다."
            },
            {
                subtitle: "결함(Defect) 심각도 분류 및 잔여 리스크 수용 통제 (Defect & Risk Management)",
                content: "시험 중 발견된 결함은 치명적(Critical), 중대(Major), 경미(Minor)로 분류되며, 미해결된 Critical/Major 결함이 존재하는 경우 시스템적인 Go-Live 차단 가드가 발동합니다. 경미한 결함이나 환경적 차이에 대해서는 품질보증부서(QA)의 공식 심의를 거쳐 잔여 리스크 수용(ACCEPTED_RISK) 정당화 사유를 문서화해야 합니다."
            },
            {
                subtitle: "최종 Go-Live 운영 승인 헌장 및 3자 필수 전자서명 가드 (Go-Live Release Charter)",
                content: "모든 IQ/OQ/PQ 프로토콜의 적합(PASS) 판정과 결함 조치 완료 후, 시스템 관리자(System Owner), 품질관리 책임자(QA Lead), 최고경영자(Executive Sponsor) 3인의 필수 전자서명이 결합된 운영 승인 헌장(Go-Live Charter)을 발행하여 시스템을 정식 가동(OPERATIONAL) 상태로 공식 인가합니다."
            }
        ]
    }
};




