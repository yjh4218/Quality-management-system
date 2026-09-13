# -*- coding: utf-8 -*-
"""
QMS 시스템 전체 화면별 상세 기능 정의 및 보고용 PPT 생성 스크립트
16:9 와이드스크린, 기업용 프리미엄 테마(Navy/Royal Blue), 39개 전 화면 완벽 수록
"""

import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Color Palette ──
COLOR_BG_DARK = RGBColor(15, 23, 42)       # #0F172A Deep Slate Navy
COLOR_BG_CARD = RGBColor(30, 41, 59)       # #1E293B Card Background (Dark)
COLOR_BG_LIGHT = RGBColor(248, 250, 252)   # #F8FAFC Soft Light
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_PRIMARY = RGBColor(37, 99, 235)      # #2563EB Royal Blue
COLOR_PRIMARY_LIGHT = RGBColor(239, 246, 255) # #EFF6FF
COLOR_INDIGO = RGBColor(79, 70, 229)       # #4F46E5 Indigo
COLOR_EMERALD = RGBColor(5, 150, 105)      # #059669 Emerald Green
COLOR_AMBER = RGBColor(217, 119, 6)        # #D97706 Amber Gold
COLOR_ROSE = RGBColor(225, 29, 72)         # #E11D48 Vivid Rose
COLOR_TEXT_MAIN = RGBColor(30, 41, 59)     # #1E293B Dark Text
COLOR_TEXT_MUTED = RGBColor(100, 116, 139) # #64748B Gray Text
COLOR_BORDER = RGBColor(226, 232, 240)     # #E2E8F0

FONT_NAME = "Malgun Gothic"

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]

    # ── Helper: Add Solid Background ──
    def set_slide_background(slide, color):
        bg_shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5)
        )
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = color
        bg_shape.line.fill.background()
        return bg_shape

    # ── Helper: Add Top Header Bar for Content Slides ──
    # ── Helper: Add Top Header Bar for Content Slides ──
    def add_content_header(slide, category_title, screen_title, page_key, roles):
        # Header Container Box
        header_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(0.35), Inches(12.333), Inches(0.85)
        )
        header_box.fill.solid()
        header_box.fill.fore_color.rgb = COLOR_WHITE
        header_box.line.color.rgb = COLOR_BORDER
        header_box.line.width = Pt(1)

        # Left Accent Color Pill
        accent_pill = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.68), Inches(0.48), Inches(0.1), Inches(0.58)
        )
        accent_pill.fill.solid()
        accent_pill.fill.fore_color.rgb = COLOR_PRIMARY
        accent_pill.line.fill.background()

        # Category Badge + Title
        tf = header_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.TOP
        tf.word_wrap = True
        tf.margin_left = Inches(0.38)
        tf.margin_top = Inches(0.08)

        p1 = tf.paragraphs[0]
        p1.text = f"{category_title}   |   화면 식별키: {page_key}"
        p1.font.name = FONT_NAME
        p1.font.size = Pt(9.5)
        p1.font.bold = True
        p1.font.color.rgb = COLOR_PRIMARY

        p2 = tf.add_paragraph()
        p2.text = screen_title
        p2.font.name = FONT_NAME
        p2.font.size = Pt(16.5)
        p2.font.bold = True
        p2.font.color.rgb = COLOR_TEXT_MAIN

        # Right Role Badge
        role_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(9.9), Inches(0.48), Inches(2.75), Inches(0.58)
        )
        role_box.fill.solid()
        role_box.fill.fore_color.rgb = COLOR_PRIMARY_LIGHT
        role_box.line.color.rgb = RGBColor(191, 219, 254)
        role_box.line.width = Pt(1)

        rtf = role_box.text_frame
        rtf.vertical_anchor = MSO_ANCHOR.MIDDLE
        rp = rtf.paragraphs[0]
        rp.alignment = PP_ALIGN.CENTER
        rp.text = f"접근 권한: {roles}"
        rp.font.name = FONT_NAME
        rp.font.size = Pt(9.5)
        rp.font.bold = True
        rp.font.color.rgb = COLOR_PRIMARY

    # ── Helper: Add Screen Detail Slide ──
    def add_screen_slide(category_title, screen_title, page_key, roles, purpose, features, workflow, input_output):
        slide = prs.slides.add_slide(blank_slide_layout)
        set_slide_background(slide, COLOR_BG_LIGHT)
        add_content_header(slide, category_title, screen_title, page_key, roles)

        # ── Left Card: Screen Visual & I/O Blueprint (Width 7.6 in - MAXIMIZED VIEW!) ──
        left_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.3), Inches(7.6), Inches(5.85)
        )
        left_card.fill.solid()
        left_card.fill.fore_color.rgb = COLOR_WHITE
        left_card.line.color.rgb = COLOR_BORDER
        left_card.line.width = Pt(1)

        ltf = left_card.text_frame
        ltf.word_wrap = True
        ltf.margin_left = Inches(0.2)
        ltf.margin_right = Inches(0.2)
        ltf.margin_top = Inches(0.12)

        # Left Header
        lp1 = ltf.paragraphs[0]
        lp1.text = "🖥️ 시스템 실제 화면 (High-Resolution View)"
        lp1.font.name = FONT_NAME
        lp1.font.size = Pt(11)
        lp1.font.bold = True
        lp1.font.color.rgb = COLOR_TEXT_MAIN

        # Check for screenshot image
        screenshot_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")
        img_path = os.path.join(screenshot_dir, f"{page_key}.png")
        
        if os.path.exists(img_path):
            # Frame border background around image
            img_border = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(1.68), Inches(7.3), Inches(4.14)
            )
            img_border.fill.solid()
            img_border.fill.fore_color.rgb = RGBColor(241, 245, 249)
            img_border.line.color.rgb = RGBColor(203, 213, 225)
            img_border.line.width = Pt(1)
            
            # Embed actual screenshot image (16:9 - 7.24 in x 4.08 in)
            slide.shapes.add_picture(
                img_path, Inches(0.68), Inches(1.71), Inches(7.24), Inches(4.08)
            )
        else:
            # Fallback Simulated UI Visual Frame
            ui_frame = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(1.68), Inches(7.3), Inches(4.14)
            )
            ui_frame.fill.solid()
            ui_frame.fill.fore_color.rgb = RGBColor(241, 245, 249)
            ui_frame.line.color.rgb = RGBColor(203, 213, 225)
            ui_frame.line.width = Pt(1)

            utf = ui_frame.text_frame
            utf.word_wrap = True
            utf.margin_left = Inches(0.3)
            utf.margin_right = Inches(0.3)
            utf.margin_top = Inches(0.4)

            up1 = utf.paragraphs[0]
            up1.text = f"📍 [UI 구성요소]: {screen_title}"
            up1.font.name = FONT_NAME
            up1.font.size = Pt(13)
            up1.font.bold = True
            up1.font.color.rgb = COLOR_PRIMARY

            up2 = utf.add_paragraph()
            up2.text = f"• 상단 컨트롤: 검색 필터바, 신규등록, 엑셀 다운로드, 일괄 동기화\n• 메인 뷰: 반응형 Ag-Grid 데이터 대장 / 시각화 차트 / 3D 뷰어\n• 사이드 서랍(Drawer): 상세 사양, 첨부파일, 변경이력, 결재 승인\n• 실시간 알림: 토스트 피드백, 자동 버그 리포팅, 이메일 연동"
            up2.font.name = FONT_NAME
            up2.font.size = Pt(11)
            up2.font.color.rgb = COLOR_TEXT_MAIN

        # I/O Summary Box below UI frame
        io_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(5.90), Inches(7.3), Inches(1.15)
        )
        io_box.fill.solid()
        io_box.fill.fore_color.rgb = COLOR_PRIMARY_LIGHT
        io_box.line.color.rgb = RGBColor(191, 219, 254)
        io_box.line.width = Pt(1)

        iotf = io_box.text_frame
        iotf.word_wrap = True
        iotf.margin_left = Inches(0.2)
        iotf.margin_right = Inches(0.2)
        iotf.margin_top = Inches(0.1)

        iop1 = iotf.paragraphs[0]
        iop1.text = "📥 데이터 입력 & 📤 산출 결과"
        iop1.font.name = FONT_NAME
        iop1.font.size = Pt(9.5)
        iop1.font.bold = True
        iop1.font.color.rgb = COLOR_PRIMARY

        iop2 = iotf.add_paragraph()
        iop2.text = input_output
        iop2.font.name = FONT_NAME
        iop2.font.size = Pt(8.5)
        iop2.font.color.rgb = COLOR_TEXT_MAIN

        # ── Right Card: Functional Specifications & Workflow (Width 4.58 in - GENEROUS SPACING!) ──
        right_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.25), Inches(1.3), Inches(4.58), Inches(5.85)
        )
        right_card.fill.solid()
        right_card.fill.fore_color.rgb = COLOR_WHITE
        right_card.line.color.rgb = COLOR_BORDER
        right_card.line.width = Pt(1)

        rtf = right_card.text_frame
        rtf.word_wrap = True
        rtf.margin_left = Inches(0.28)
        rtf.margin_right = Inches(0.28)
        rtf.margin_top = Inches(0.25)

        # 1. Purpose Section
        rp1 = rtf.paragraphs[0]
        rp1.text = "🎯 화면 목적 및 가치"
        rp1.font.name = FONT_NAME
        rp1.font.size = Pt(11.5)
        rp1.font.bold = True
        rp1.font.color.rgb = COLOR_INDIGO
        rp1.space_after = Pt(4)

        rp2 = rtf.add_paragraph()
        rp2.text = purpose
        rp2.font.name = FONT_NAME
        rp2.font.size = Pt(9.0)
        rp2.font.color.rgb = COLOR_TEXT_MAIN
        rp2.space_after = Pt(12)

        # 2. Key Features Section
        rp3 = rtf.add_paragraph()
        rp3.text = "⚡ 주요 핵심 기능"
        rp3.font.name = FONT_NAME
        rp3.font.size = Pt(11.5)
        rp3.font.bold = True
        rp3.font.color.rgb = COLOR_EMERALD
        rp3.space_after = Pt(5)

        for feat in features:
            fp = rtf.add_paragraph()
            fp.text = f"• {feat}"
            fp.font.name = FONT_NAME
            fp.font.size = Pt(8.8)
            fp.font.color.rgb = COLOR_TEXT_MAIN
            fp.space_after = Pt(5)

        # 3. Workflow Link Section
        rp4 = rtf.add_paragraph()
        rp4.text = "🔗 업무 연계 및 결재 흐름"
        rp4.font.name = FONT_NAME
        rp4.font.size = Pt(11.5)
        rp4.font.bold = True
        rp4.font.color.rgb = COLOR_AMBER
        rp4.space_before = Pt(8)
        rp4.space_after = Pt(4)

        rp5 = rtf.add_paragraph()
        rp5.text = workflow
        rp5.font.name = FONT_NAME
        rp5.font.size = Pt(8.8)
        rp5.font.color.rgb = COLOR_TEXT_MAIN

    # ── Helper: Section Title Slide ──
    def add_section_slide(section_num, section_title, sub_desc, screen_list):
        slide = prs.slides.add_slide(blank_slide_layout)
        set_slide_background(slide, COLOR_BG_DARK)

        # Center Card
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.0), Inches(10.933), Inches(5.5)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_BG_CARD
        card.line.color.rgb = RGBColor(51, 65, 85)
        card.line.width = Pt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.6)
        tf.margin_right = Inches(0.6)
        tf.margin_top = Inches(0.5)

        p1 = tf.paragraphs[0]
        p1.text = f"SECTION {section_num:02d}"
        p1.font.name = FONT_NAME
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(96, 165, 250)

        p2 = tf.add_paragraph()
        p2.text = section_title
        p2.font.name = FONT_NAME
        p2.font.size = Pt(26)
        p2.font.bold = True
        p2.font.color.rgb = COLOR_WHITE
        p2.space_after = Pt(8)

        p3 = tf.add_paragraph()
        p3.text = sub_desc
        p3.font.name = FONT_NAME
        p3.font.size = Pt(12)
        p3.font.color.rgb = RGBColor(148, 163, 184)
        p3.space_after = Pt(20)

        p4 = tf.add_paragraph()
        p4.text = "📋 포함 화면 목록:"
        p4.font.name = FONT_NAME
        p4.font.size = Pt(13)
        p4.font.bold = True
        p4.font.color.rgb = RGBColor(245, 158, 11)

        for sc in screen_list:
            sp = tf.add_paragraph()
            sp.text = f"   • {sc}"
            sp.font.name = FONT_NAME
            sp.font.size = Pt(11)
            sp.font.color.rgb = RGBColor(226, 232, 240)

    # =========================================================================
    # 1. SLIDE 1: Cover Slide
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide1, COLOR_BG_DARK)

    # Decorative background glows
    glow1 = slide1.shapes.add_shape(MSO_SHAPE.OVAL, Inches(1.0), Inches(0.5), Inches(4.5), Inches(4.5))
    glow1.fill.solid()
    glow1.fill.fore_color.rgb = RGBColor(30, 58, 138)
    glow1.line.fill.background()

    cover_card = slide1.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.333), Inches(5.1)
    )
    cover_card.fill.solid()
    cover_card.fill.fore_color.rgb = COLOR_BG_CARD
    cover_card.line.color.rgb = RGBColor(59, 130, 246)
    cover_card.line.width = Pt(2)

    ctf = cover_card.text_frame
    ctf.word_wrap = True
    ctf.margin_left = Inches(0.8)
    ctf.margin_top = Inches(0.6)

    cp0 = ctf.paragraphs[0]
    cp0.text = "THE FOUNDERS INC.  |  품질경영시스템"
    cp0.font.name = FONT_NAME
    cp0.font.size = Pt(13)
    cp0.font.bold = True
    cp0.font.color.rgb = RGBColor(96, 165, 250)

    cp1 = ctf.add_paragraph()
    cp1.text = "QMS 시스템 전체 화면별 기능정의서 및 운영 보고서"
    cp1.font.name = FONT_NAME
    cp1.font.size = Pt(28)
    cp1.font.bold = True
    cp1.font.color.rgb = COLOR_WHITE
    cp1.space_after = Pt(12)

    cp2 = ctf.add_paragraph()
    cp2.text = "품질 관리 · 3D 포장 사양 설계 · 신제품 생산감리 · 제조사 협업 · 전사 데이터 감사 거버넌스"
    cp2.font.name = FONT_NAME
    cp2.font.size = Pt(13)
    cp2.font.color.rgb = RGBColor(148, 163, 184)
    cp2.space_after = Pt(24)

    cp3 = ctf.add_paragraph()
    cp3.text = "• 보고 일자: 2026년 08월\n• 시스템 버전: QMS Enterprise v2.4 (39개 전체 화면 구축 완료)\n• 운영 환경: Firebase Spark (비용 제로 원칙) + PostgreSQL Supabase / Spring Boot & Vite React"
    cp3.font.name = FONT_NAME
    cp3.font.size = Pt(11)
    cp3.font.color.rgb = RGBColor(203, 213, 225)

    # =========================================================================
    # 2. SLIDE 2: QMS Executive Summary (전사 핵심 요약)
    # =========================================================================
    slide_exec = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide_exec, COLOR_BG_LIGHT)

    exec_title = slide_exec.shapes.add_textbox(Inches(0.6), Inches(0.4), Inches(12.133), Inches(0.7))
    etf = exec_title.text_frame
    ep1 = etf.paragraphs[0]
    ep1.text = "📋 QMS 시스템 전사 핵심 요약 (Executive Summary)"
    ep1.font.name = FONT_NAME
    ep1.font.size = Pt(20)
    ep1.font.bold = True
    ep1.font.color.rgb = COLOR_TEXT_MAIN

    # Vision Bar
    vision_box = slide_exec.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(1.15), Inches(12.133), Inches(0.65))
    vision_box.fill.solid()
    vision_box.fill.fore_color.rgb = COLOR_PRIMARY_LIGHT
    vision_box.line.color.rgb = RGBColor(191, 219, 254)
    vtf = vision_box.text_frame
    vp = vtf.paragraphs[0]
    vp.text = "🎯 핵심 비전: 제조-유통-브랜드사 품질 라이프사이클 전 과정 디지털화 및 완전한 데이터 무결성(Audit Trail) 확보"
    vp.font.name = FONT_NAME
    vp.font.size = Pt(11)
    vp.font.bold = True
    vp.font.color.rgb = COLOR_PRIMARY

    # 4 Major Domain Highlights
    exec_pillars = [
        ("📊 1. 전사 품질 통합 지표 통제", "• 6종 전문 대시보드 (클레임, 감리, 품질, Audit, PPM, 제품)\n• LOT 단위 PPM 불량률 추적 및 8D 근본원인 분석\n• 부서별 맞춤형 위젯 및 실시간 알림/딥링크", COLOR_PRIMARY),
        ("📐 2. 3D 포장 & 규제 엔지니어링", "• 단상자 POP 마주보기 / 골판지 아웃박스 / 팔레트 3D\n• 환경부 법정 포장공간비율(20% 이하) 실시간 자동 연산\n• 화장품 전성분 6,000종 글로벌 규제 DB 실시간 검토", COLOR_INDIGO),
        ("🤝 3. 협력 제조사 실시간 동기화", "• 제조사 전용 포털 & 모바일 사진 업로드 신제품 생산감리\n• COA(시험성적서) 자동 대조 및 출하판정 기록부\n• 품질 점검표 기반 Audit 등급 평가 및 서류 주기 관리", COLOR_EMERALD),
        ("🛡️ 4. 엔터프라이즈 거버넌스 & 제로코스트", "• Firebase Spark 무과금 플랜 최적화 (운영 비용 0원)\n• 소프트 딜리트(Soft Delete) & JSON 변경이력(Audit Log)\n• 세부 RBAC 권한 제어 및 실시간 자동 버그 리포팅", COLOR_AMBER)
    ]

    for idx, (title, desc, col) in enumerate(exec_pillars):
        x = Inches(0.6 + (idx % 2) * 6.2)
        y = Inches(1.95 + (idx // 2) * 2.25)
        card = slide_exec.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.9), Inches(2.1))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_WHITE
        card.line.color.rgb = COLOR_BORDER
        card.line.width = Pt(1)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.25)
        ctf.margin_top = Inches(0.18)

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_NAME
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = col
        p1.space_after = Pt(4)

        p2 = ctf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_NAME
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = COLOR_TEXT_MAIN

    # Bottom ROI Bar
    roi_box = slide_exec.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(6.55), Inches(12.133), Inches(0.6))
    roi_box.fill.solid()
    roi_box.fill.fore_color.rgb = COLOR_BG_DARK
    roi_box.line.fill.background()
    rtf = roi_box.text_frame
    rp = rtf.paragraphs[0]
    rp.text = "📈 정량적 기대 효과:  품질 이슈 처리 리드타임 70% 단축  |  법령/규제 위반 리스크 ZERO  |  협력사 협업 소통 비용 80% 절감"
    rp.font.name = FONT_NAME
    rp.font.size = Pt(10.5)
    rp.font.bold = True
    rp.font.color.rgb = COLOR_WHITE
    rp.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # 3. SLIDE 3: QMS System Architecture & 4 Pillars
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide2, COLOR_BG_LIGHT)
    
    # Overview Title
    ov_title = slide2.shapes.add_textbox(Inches(0.6), Inches(0.5), Inches(12.133), Inches(0.8))
    ov_tf = ov_title.text_frame
    ov_p1 = ov_tf.paragraphs[0]
    ov_p1.text = "🏛️ QMS 시스템 핵심 가치 및 4대 운영 원칙"
    ov_p1.font.name = FONT_NAME
    ov_p1.font.size = Pt(20)
    ov_p1.font.bold = True
    ov_p1.font.color.rgb = COLOR_TEXT_MAIN

    # 4 Pillar Cards
    pillars = [
        ("💰 비용 제로 정책 (Zero-Cost)", "Firebase Spark 플랜 및 Supabase 무료 티어 한도 내에서 최적화된 아키텍처로 운영 비용 0원 유지", COLOR_EMERALD),
        ("🛡️ 완전한 데이터 무결성 (Audit Trail)", "모든 주요 엔티티의 생성/수정/삭제 이력을 JSON으로 기록하며, 실수 삭제 방지 소프트 딜리트(Soft Delete) 적용", COLOR_PRIMARY),
        ("📐 3D 포장 엔지니어링 자동화", "단상자 POP 마주보기 플랩, 골판지 아웃박스 입수, 팔레트 교차 적재 및 환경부 법정 포장공간비율 실시간 연산", COLOR_INDIGO),
        ("🤝 협력 제조사 실시간 연결", "제조사별 전용 포털과 모바일 사진 업로드, 감리 승인/반려 알림 메일링으로 소통 시간 80% 단축", COLOR_AMBER)
    ]

    for idx, (title, desc, col) in enumerate(pillars):
        x = Inches(0.6 + (idx % 2) * 6.2)
        y = Inches(1.5 + (idx // 2) * 2.7)
        card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.9), Inches(2.4))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_WHITE
        card.line.color.rgb = COLOR_BORDER
        card.line.width = Pt(1)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.3)
        ctf.margin_top = Inches(0.3)

        p1 = ctf.paragraphs[0]
        p1.text = title
        p1.font.name = FONT_NAME
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = col

        p2 = ctf.add_paragraph()
        p2.text = desc
        p2.font.name = FONT_NAME
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = COLOR_TEXT_MAIN

    # =========================================================================
    # 3. SLIDE 3: 7 Functional Domains Map
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide3, COLOR_BG_LIGHT)

    map_title = slide3.shapes.add_textbox(Inches(0.6), Inches(0.5), Inches(12.133), Inches(0.8))
    mtf = map_title.text_frame
    mp1 = mtf.paragraphs[0]
    mp1.text = "🗺️ QMS 39개 화면 7대 기능 도메인 체계도"
    mp1.font.name = FONT_NAME
    mp1.font.size = Pt(20)
    mp1.font.bold = True
    mp1.font.color.rgb = COLOR_TEXT_MAIN

    domains = [
        ("1. 대시보드 & 모니터링 (6종)", "시스템 대시보드, 대시보드 관리, 클레임/품질/생산감리/제조사 Audit 대시보드"),
        ("2. 제품 & 포장 설계 (6종)", "제품코드 마스터, BOM 마스터(6대 분류 검색), BOM 유형 설정, 포장공정 템플릿, 포장공간비율 계산기, 아웃박스 계산기"),
        ("3. 품질 검사 & 규제 준수 (4종)", "입고 품질/COA 관리, 시장출하 기록, 신제품 생산감리, 화장품 전성분 6,000종 안전성 검토"),
        ("4. 협력 제조사 관리 (6종)", "제조사 정보, 제조사 구분, 제조사 점검항목, 제조사 현장 Audit, 필수 품질서류, 추가서류 설정"),
        ("5. 클레임 & CAPA 개선 (3종)", "클레임 조회/입력, 클레임 대시보드, LOT PPM 분석 & 근본원인"),
        ("6. 유통 채널 & 브랜드 (3종)", "유통 채널 관리, 유통 채널 포장 특이사항 항목 설정, 브랜드 마스터"),
        ("7. 시스템 거버넌스 (11종)", "사용자 승인, 권한 관리(RBAC), 시스템 변경이력, 접근로그, 버그 리포트, 메일 템플릿, 전체공지, 사용자 가이드 마스터, 휴지통, 알림목록, 협업가이드")
    ]

    for idx, (d_name, d_desc) in enumerate(domains):
        col_idx = idx % 2
        row_idx = idx // 2
        w = Inches(5.9)
        h = Inches(1.2)
        x = Inches(0.6 + col_idx * 6.2)
        y = Inches(1.4 + row_idx * 1.35)
        if idx == 6:
            w = Inches(12.133)
            x = Inches(0.6)

        d_box = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
        d_box.fill.solid()
        d_box.fill.fore_color.rgb = COLOR_WHITE
        d_box.line.color.rgb = COLOR_PRIMARY
        d_box.line.width = Pt(1)

        dtf = d_box.text_frame
        dtf.word_wrap = True
        dtf.margin_left = Inches(0.25)
        dtf.margin_top = Inches(0.15)

        dp1 = dtf.paragraphs[0]
        dp1.text = d_name
        dp1.font.name = FONT_NAME
        dp1.font.size = Pt(11.5)
        dp1.font.bold = True
        dp1.font.color.rgb = COLOR_PRIMARY

        dp2 = dtf.add_paragraph()
        dp2.text = d_desc
        dp2.font.name = FONT_NAME
        dp2.font.size = Pt(9.5)
        dp2.font.color.rgb = COLOR_TEXT_MAIN

    # =========================================================================
    # SECTION 1: 대시보드 및 통계 모니터링 (7 화면)
    # =========================================================================
    add_section_slide(
        1,
        "대시보드 및 통계 모니터링 영역",
        "경영진 및 부서별 맞춤형 KPI 지표와 실시간 품질 현황 시각화",
        [
            "시스템 대시보드 (dashboard)",
            "대시보드 템플릿 제작/관리 (dashboardMgmt)",
            "클레임 분석 대시보드 (claimDashboard)",
            "LOT PPM 분석 & 근본원인 (lotPpmDashboard)",
            "입고 품질 검사 대시보드 (qualityDashboard)",
            "신제품 생산감리 대시보드 (productionAuditDashboard)",
            "제조사 Audit 종합 대시보드 (manufacturerAuditDashboard)"
        ]
    )

    # 1. dashboard
    add_screen_slide(
        "📊 대시보드 & 모니터링",
        "시스템 대시보드 (dashboard)",
        "dashboard",
        "전체 (권한별 개인화)",
        "로그인한 사용자의 역할(Admin, Quality, Sales, Manufacturer)에 최적화된 위젯 레이아웃으로 실시간 품질 KPI와 업무 인입 현황을 요약 제공합니다.",
        [
            "10종 이상의 실시간 품질 위젯(클레임 미처리, 감리 대기, 신제품 현황 등) 표출",
            "알림 카드 클릭 시 해당 세부 업무 관리 화면으로 원클릭 딥링크(Deep-link) 이동",
            "역할별 대시보드 템플릿 자동 할당 및 사용자 편의 위젯 재배치 지원"
        ],
        "사용자 로그인 ➔ 역할(Role) 확인 ➔ 할당된 템플릿 위젯 로드 ➔ 각 업무 상세 화면으로 연결",
        "입력: 전사 실시간 트랜잭션 데이터\n출력: 맞춤형 차트, 미처리 업무 카운트, 빠른 실행 바로가기"
    )

    # 2. dashboardMgmt
    add_screen_slide(
        "🎨 대시보드 제작/관리",
        "대시보드 템플릿 관리 (dashboardMgmt)",
        "dashboardMgmt",
        "관리자 (ROLE_ADMIN)",
        "부서 및 직무별 업무 특성에 맞춘 대시보드 템플릿을 신규 생성하고 필요한 시각화 위젯들을 체크박스로 조합하여 표준 템플릿을 배포합니다.",
        [
            "위젯 풀(Widget Pool)에서 드래그/체크박스로 간편하게 템플릿 구성",
            "역할 관리(roles) 화면과 즉시 연동하여 신규 권한 생성 시 기본 템플릿 자동 지정",
            "부서별 요구에 맞춘 대시보드 템플릿 복제 및 수정 기능 제공"
        ],
        "관리자가 템플릿 생성 ➔ 권한 관리(roles)에서 역할과 매핑 ➔ 해당 사용자 로그인 시 적용",
        "입력: 템플릿명, 위젯 선택 목록 JSON\n출력: 등록된 대시보드 템플릿 마스터"
    )

    # 3. claimDashboard
    add_screen_slide(
        "📈 클레임 통계",
        "고객 클레임 대시보드 (claimDashboard)",
        "claimDashboard",
        "관리자, 품질팀, 영업팀",
        "고객 및 유통 채널에서 인입된 불량 클레임의 월별 추이, 브랜드별 점유율, 불량 유형별 파레토 분석을 시각화하여 품질 취약점을 조기 진단합니다.",
        [
            "기간/브랜드/제조사별 다차원 인터랙티브 필터링",
            "불량 유형(누액, 이물, 파손, 펌프불량 등) 파레토 차트 및 비중 분석",
            "개선 대책(CAPA) 적용 전/후 클레임 감소율 정량 비교"
        ],
        "클레임 대장(claims) 데이터 적재 ➔ 실시간 집계 ➔ 경영진 품질 보고 및 제조사 개선 요청",
        "입력: 클레임 접수 데이터, 제조사 매핑 정보\n출력: 월별 추이 차트, 불량 유형 파레토 맵, 제조사별 클레임 점유율"
    )

    # 4. lotPpmDashboard
    add_screen_slide(
        "📉 LOT 품질 지표",
        "LOT PPM 분석 & 근본원인 (lotPpmDashboard)",
        "lotPpmDashboard",
        "관리자, 품질팀",
        "생산 LOT별 총 입고 수량 대비 클레임 수량을 백만분율(PPM)로 정밀 환산하여 객관적인 품질 수준을 계량화하고 5-Why 근본원인을 분석합니다.",
        [
            "LOT 단위 생산 수량 대비 PPM 불량률 자동 산출 및 등급화",
            "원자재, 작업자, 설비, 환경 등 근본 원인(Root Cause)별 상관관계 분석",
            "고위험 불량 LOT 조기 경보 및 재고 격리(Quarantine) 연계"
        ],
        "입고품질 데이터 + 클레임 LOT 매칭 ➔ PPM 연산 ➔ 제조사 품질 평가 및 재발방지 대책",
        "입력: LOT별 총 입고량, 클레임 발생량, 근본원인 분류\n출력: LOT PPM 랭킹, 원인별 원형 차트"
    )

    # 5. qualityDashboard
    add_screen_slide(
        "📊 입고 검사 지표",
        "입고 품질 검사 대시보드 (qualityDashboard)",
        "qualityDashboard",
        "관리자, 품질팀, 영업팀",
        "물류센터에 입고되는 완제품의 초품 합격률, 불합격 사유 분포, 협력 제조사별 입고 품질 등급을 실시간으로 종합 분석합니다.",
        [
            "월별/분기별 총 입고 검사 건수 및 평균 합격률 트렌드 시각화",
            "라벨 오기, 외관 불량, 성적서(COA) 미비 등 주요 불합격 사유 랭킹",
            "제조사별 불량률 순위 및 정기 제조사 평가(Audit) 연동 지표 제공"
        ],
        "입고 품질 대장(quality) 데이터 연동 ➔ 실시간 합격률 집계 ➔ 물류 및 구매팀 공유",
        "입력: 입고 검사 결과, COA 판정 이력\n출력: 합격률 추이선, 사유별 막대 차트, 제조사별 불량률 맵"
    )

    # 6. productionAuditDashboard
    add_screen_slide(
        "📸 생산감리 현황",
        "신제품 생산감리 대시보드 (productionAuditDashboard)",
        "productionAuditDashboard",
        "관리자, 품질팀",
        "신제품 초도 생산 시 제조사 현장에서 등록되는 감리 사진 제출 현황, 품질팀 승인율 및 반려율, 지연 제조사를 한눈에 모니터링합니다.",
        [
            "월별 신제품 감리 진행 상태(제출대기/검토중/승인완료/반려) 파이프라인 시각화",
            "생산 예정일 대비 미제출 제조사 조기 경보(Alert) 시스템",
            "제조사별 감리 적기 제출률 및 초도 생산 품질 적합도 분석"
        ],
        "제조사 감리 사진 업로드 ➔ 품질팀 실시간 검토 ➔ 승인 완료 시 시장출하(release) 진행",
        "입력: 신제품 생산감리 진행 데이터\n출력: 감리 파이프라인 단계별 건수, 제조사별 적기율"
    )

    # 7. manufacturerAuditDashboard
    add_screen_slide(
        "🏭 제조사 평가 맵",
        "제조사 Audit 대시보드 (manufacturerAuditDashboard)",
        "manufacturerAuditDashboard",
        "관리자, 품질팀",
        "CGMP/ISO 22716 기준 협력 제조사 현장 실사 평가 점수와 등급(A/B/C/D) 분포, 5대 평가 영역별 역량 레이더 차트를 제공합니다.",
        [
            "협력 제조사별 종합 점수 분포 및 등급별 비율 도넛 차트",
            "제조시설, 위생관리, 품질시험 등 5대 대분류별 취약 부문 레이더 차트",
            "등급별 차기 정기 감사 도래일(1년/2년 주기) 알림 및 이력 추적"
        ],
        "제조사 현장 실사(manufacturerAudits) 완료 ➔ 등급 자동 산출 ➔ 협력사 재계약 기초자료",
        "입력: 제조사 실사 점수표, 지적사항 이력\n출력: 제조사 역량 레이더 맵, 차기 실사 일정표"
    )

    # =========================================================================
    # SECTION 2: 제품 및 포장 설계 영역 (6 화면)
    # =========================================================================
    add_section_slide(
        2,
        "제품 및 3D 포장 설계 영역",
        "완제품 표준 마스터, BOM 6대 분류 검색, 3D 시뮬레이션 및 포장 규격 연산",
        [
            "제품코드 마스터 관리 (products)",
            "BOM 마스터 관리 (bomMaster)",
            "BOM 유형 및 세부분류 설정 (bomCategories)",
            "포장공정 템플릿 관리 (packagingTemplates)",
            "포장공간비율 법령 계산기 (spaceRatioCalculator)",
            "아웃박스 규격 및 입수 계산기 (outboxCalculator)"
        ]
    )

    # 8. products
    add_screen_slide(
        "📦 품목 마스터",
        "제품코드 마스터 관리 (products)",
        "products",
        "관리자, 품질팀 (영업팀 조회)",
        "전사 완제품 품목코드, 규격 치수, 바코드, 유통 채널별 포장사양서를 통합 관리하며 3D 포장 시뮬레이션 및 초고해상도 사진 주석 편집기와 연동합니다.",
        [
            "단상자, 인박스, 아웃박스, 팔레트 치수 및 체적(가안/확정) 통합 관리",
            "3D 포장 시뮬레이터 연동: 인박스 POP 마주보기 플랩, 아웃박스 골판지 입수, 팔레트 교차 적재",
            "🎨 포장방법 사진 주석 초고해상도(UHD 3000px급) 무손실 렌더링 & 엑셀 1:1 고품질 무손실 삽입",
            "💾 엑셀/PDF 다운로드 전 자동 저장 확인 연계: 미저장 변경사항 선행 일괄 저장 후 안전 다운로드"
        ],
        "신제품 등록 ➔ BOM 부자재 매핑 ➔ 3D 포장 도면 및 주석 사진 확정 ➔ 엑셀/PDF 사양서 다운로드 및 입고 검사 기준",
        "입력: 제품 기본정보, 채널별 바코드, 3D 치수, 포장방법 주석 사진\n출력: 초고화질 확정 포장사양서, 3D 도면 스냅샷, 정식 엑셀/PDF"
    )

    # 9. bomMaster
    add_screen_slide(
        "📏 BOM 부자재",
        "BOM 마스터 관리 (bomMaster)",
        "bomMaster",
        "관리자, 품질팀",
        "완제품에 투입되는 모든 1차/2차 부자재(용기, 캡, 펌프, 단상자, 라벨 등)의 표준 규격과 재질, 제조사를 등록 관리합니다.",
        [
            "6대 분류 상호작용 필터 바: BOM코드, 유형 드롭다운, 부자재명, 중량, 재질, 제조사",
            "쉼표(,) 및 띄어쓰기 기반 다중 단어 동시 AND 검색 엔진 전면 적용",
            "포장사양서 작성 시 부자재 검색 팝업과 100% 동일한 고속 검색 엔진 연동"
        ],
        "부자재 신규 개발 ➔ BOM 마스터 등록 ➔ 제품코드 마스터 포장사양서 구성품에 투입",
        "입력: BOM 코드, 규격, 중량, 재질, 제조사명\n출력: 표준 부자재 데이터베이스, 검색 목록"
    )

    # 10. bomCategories
    add_screen_slide(
        "⚙️ BOM 카테고리",
        "BOM 유형 및 세부분류 설정 (bomCategories)",
        "bomCategories",
        "관리자 (ROLE_ADMIN)",
        "부자재의 대분류(용기, 캡, 단상자, 라벨, 완충재 등)와 세부유형 체계를 정의하고 표시 순서를 관리합니다.",
        [
            "부자재 유형 트리 구조 정의 및 활성화/비활성화 제어",
            "BOM 등록 및 포장사양서 부자재 드롭다운의 표준 데이터 소스 역할",
            "유형별 필수 입력 필드 및 단위(g, mm, ml) 규격화"
        ],
        "관리자가 유형 분류 체계 설정 ➔ BOM 마스터 및 제품 포장사양서 표준 옵션으로 자동 반영",
        "입력: 카테고리명, 코드, 정렬순서\n출력: 표준화된 부자재 분류 체계"
    )

    # 11. packagingTemplates
    add_screen_slide(
        "📋 포장공정 표준화",
        "포장공정 템플릿 관리 (packagingTemplates)",
        "packagingTemplates",
        "관리자, 품질팀",
        "토너/앰플형, 크림 단지형, 마스크팩형, 튜브형 등 제품 형태별 표준 포장 공정 및 부자재 조립 표준을 템플릿화합니다.",
        [
            "용기 형태별 표준 부자재 세트(용기+스포이드+단상자+봉함라벨) 사전 구성",
            "신제품 포장사양서 작성 시 원클릭 템플릿 로드로 작성 시간 90% 단축",
            "제조사별 공정 표준 차이 반영 및 버전 관리"
        ],
        "표준 포장공정 정의 ➔ 신제품 기획 시 템플릿 적용 ➔ 제조사 생산감리 검사 기준으로 사용",
        "입력: 공정명, 기본 부자재 목록, 작업 유의사항\n출력: 재사용 가능한 포장 템플릿"
    )

    # 12. spaceRatioCalculator
    add_screen_slide(
        "📐 환경부 법령 계산",
        "포장공간비율 법령 계산기 (spaceRatioCalculator)",
        "spaceRatioCalculator",
        "관리자, 품질팀, 제품기획팀",
        "환경부 고시 '제품의 포장재질 및 포장방법에 관한 기준'에 따른 화장품 법정 포장공간비율(10%~25% 이하) 적합성을 실시간 계산합니다.",
        [
            "화장품 품목 유형(단일제품, 세트제품, 향수 등)별 법적 기준치 자동 로드",
            "내용물 체적, 받침판, 완충재 규격 입력 시 실시간 [적합/부적합] 판정",
            "과대포장 사전 방지 및 환경부 검사 성적서 제출용 산출 근거 제공"
        ],
        "제품 및 단상자 치수 입력 ➔ 법정 공간비율 계산 ➔ 부적합 시 단상자 축소 설계 피드백",
        "입력: 용기 치수, 단상자 치수, 완충재 두께\n출력: 포장공간비율(%), 포장횟수, 적합 판정서"
    )

    # 13. outboxCalculator
    add_screen_slide(
        "📦 아웃박스 최적화",
        "아웃박스 규격 및 입수 계산기 (outboxCalculator)",
        "outboxCalculator",
        "관리자, 품질팀, 물류팀",
        "단상자 크기와 희망 입수량(예: 24개, 48개)을 입력하면 물류 및 적재 효율을 극대화하는 최적 골판지 아웃박스 치수를 역산출합니다.",
        [
            "가로x세로x높이 배열 조합별 최적 아웃박스 내측/외측 치수 자동 산출",
            "박스 내부 공차 및 완충재 여유 공간 시각화",
            "팔레트 적재 효율(적재율 %) 및 박스 중량 자동 연산"
        ],
        "단상자 치수 입력 ➔ 배열별 아웃박스 치수 계산 ➔ 최적 규격 선택 후 제품 마스터에 반영",
        "입력: 단상자 크기, 목표 입수 수량\n출력: 추천 아웃박스 규격(W×D×H), 체적 충진율"
    )

    # =========================================================================
    # SECTION 3: 품질 검사 및 법령 규제 안전성 (4 화면)
    # =========================================================================
    add_section_slide(
        3,
        "품질 검사 및 법령 규제 안전성",
        "물류 입고 검사, 시장출하 판정, 생산라인 감리 및 6천종 전성분 규제 검토",
        [
            "입고 품질 및 COA 관리 (quality)",
            "시장출하 기록 관리 (releaseRecord)",
            "신제품 생산감리 관리 (qualityPhotoAudit)",
            "화장품 전성분 안전성 검토 (ingredientCompliance)"
        ]
    )

    # 14. quality
    add_screen_slide(
        "📦 입고 품질 검사",
        "입고 품질 및 COA 관리 (quality)",
        "quality",
        "관리자, 품질팀",
        "생산 완료 후 물류센터에 입고되는 완제품의 LOT별 성적서(COA), 외관, 수량, 바코드 인쇄 상태를 검사하여 합격/불합격을 판정합니다.",
        [
            "LOT별 원본 시험성적서(COA) PDF 및 입고 사진 업로드/관리",
            "판정 결과(합격/조건부합격/불합격)에 따른 실시간 알림 및 재고 격리",
            "입고 검사 이력 영구 아카이빙 및 클레임 발생 시 역추적 연결"
        ],
        "제조사 제품 납품 ➔ 물류 입고 검사 및 COA 확인 ➔ 합격 시 시장 출하 승인",
        "입력: 입고일자, LOT번호, 검사 수량, COA 파일\n출력: 입고 합격증, 불합격 통지서"
    )

    # 15. releaseRecord
    add_screen_slide(
        "📄 시장출하 기록",
        "시장출하 기록 관리 (releaseRecord)",
        "releaseRecord",
        "관리자, 품질팀",
        "화장품법 시장출하 규정에 따라 완제품을 국내외 유통 시장에 출고하기 전 필수 확인 사항을 최종 점검하고 출하를 승인합니다.",
        [
            "제조번호(LOT), 사용기한, 시험검사 적합 여부 최종 검증",
            "출하 판정관(책임자) 서명 및 승인 일자 전산 관리",
            "식약처 정기 감사 대비 시장출하 판정서 일괄 엑셀 출력 지원"
        ],
        "입고 합격 제품 대상 ➔ 시장출하 최종 점검 ➔ 승인 완료 후 물류 출고 지시",
        "입력: 출하 대상 품목, LOT 목록, 점검 체크리스트\n출력: 공인 시장출하 판정 기록서"
    )

    # 16. qualityPhotoAudit
    add_screen_slide(
        "📸 생산감리 검토",
        "신제품 생산감리 관리 (qualityPhotoAudit)",
        "qualityPhotoAudit",
        "관리자, 품질팀, 협력 제조사",
        "제조사 현장에서 신제품 초도 생산 시 촬영한 충진, 캡핑, 단상자, 마킹 사진을 실시간으로 확인하고 승인/반려합니다.",
        [
            "제조사 전용 모바일/웹 사진 간편 업로드 인터페이스",
            "품질팀의 실시간 사진 검토, 지적사항 코멘트 및 승인/반려 원클릭 처리",
            "결과 확정 시 제조사 담당자에게 실시간 알림 및 자동 이메일 발송"
        ],
        "제조사 감리 사진 제출 ➔ 품질팀 실시간 검토/승인 ➔ 합격 시 본생산 진행",
        "입력: 생산 라인별 실물 사진, 제조사 의견\n출력: 감리 승인서, 보완 요청서"
    )

    # 17. ingredientCompliance
    add_screen_slide(
        "🧪 전성분 안전성",
        "화장품 전성분 안전성 검토 (ingredientCompliance)",
        "ingredientCompliance",
        "관리자, 품질팀, R&D 기획팀",
        "식약처 고시 6,000건 이상의 규제 성분 DB를 기반으로 제품 전성분의 배합한도 및 사용상 주의사항 적합성을 실시간 스캔합니다.",
        [
            "전성분 텍스트 복사/붙여넣기 시 성분명 자동 분리 및 규제 DB 매핑",
            "배합 금지 성분 및 한도 초과 위험 성분 하이라이트 경고",
            "국가별(한국, EU, 미국 등) 라벨 필수 표기 주의사항 문구 자동 추천"
        ],
        "제품 기획/처방전 접수 ➔ 전성분 안전성 스캔 ➔ 규제 리스크 제로 확인 후 용기 문안 확정",
        "입력: 제품 전성분 국문/영문 텍스트\n출력: 안전성 검토 성적서, 규제 주의 성분 리포트"
    )

    # =========================================================================
    # SECTION 4: 협력 제조사 관리 및 Audit 포털 (6 화면)
    # =========================================================================
    add_section_slide(
        4,
        "협력 제조사 관리 및 Audit 포털",
        "제조사 마스터, CGMP 현장 실사, 등급 판정 및 필수 품질서류 수집/갱신",
        [
            "제조사 정보 관리 (manufacturers)",
            "제조사 구분 관리 (manufacturerCategories)",
            "제조사 Audit 점검항목 관리 (manufacturerAuditItems)",
            "제조사 현장 Audit 관리 (manufacturerAudits)",
            "필수 품질서류 관리 (documentRequests)",
            "추가 품질서류 설정 (documentTypeConfig)"
        ]
    )

    # 18. manufacturers
    add_screen_slide(
        "🏭 제조사 마스터",
        "제조사 정보 관리 (manufacturers)",
        "manufacturers",
        "관리자, 품질팀",
        "OEM/ODM 협력 제조사의 기본 정보, 품질/영업 담당자 연락처, 공장 주소 및 전용 포털 접속 계정을 관리합니다.",
        [
            "제조사별 고유 코드, 사업자번호, 대표자, 공장 소재지 관리",
            "제조사 담당자 전용 보안 초대 링크 발급 및 계정 승인",
            "제조사별 납품 품목, 클레임 이력, Audit 평가 등급 통합 대시보드 뷰"
        ],
        "신규 제조사 계약 ➔ 제조사 마스터 등록 ➔ 계정 초대 ➔ 생산감리 및 서류 제출 포털 연동",
        "입력: 제조사 기본정보, 담당자 이메일/연락처\n출력: 제조사 프로필, 포털 접속 권한"
    )

    # 19. manufacturerCategories
    add_screen_slide(
        "📂 제조사 구분",
        "제조사 구분 관리 (manufacturerCategories)",
        "manufacturerCategories",
        "관리자 (ROLE_ADMIN)",
        "협력사를 완제품 OEM/ODM, 용기 제조사, 펌프 부자재사, 인쇄사 등으로 카테고리화하여 공문 및 서류 요구를 타겟팅합니다.",
        [
            "제조사 업종별 대분류 카테고리 등록 및 정렬",
            "공지사항(announcements) 등록 시 특정 제조사 그룹만 타겟 발송",
            "업종별 필수 수집 서류(CGMP, ISO 등) 차등 적용 기준 제공"
        ],
        "관리자가 구분 체계 설정 ➔ 제조사 등록 시 카테고리 지정 ➔ 맞춤형 공문 발송",
        "입력: 카테고리명, 설명, 순서\n출력: 협력사 분류 마스터"
    )

    # 20. manufacturerAuditItems
    add_screen_slide(
        "📋 Audit 점검표",
        "제조사 Audit 점검항목 관리 (manufacturerAuditItems)",
        "manufacturerAuditItems",
        "관리자, 품질팀",
        "CGMP 및 ISO 22716 국제 표준에 기반한 5대 영역별 현장 감사 체크리스트와 배점을 관리합니다.",
        [
            "제조시설, 위생관리, 원자재 보관, 품질시험, 공정관리 5대 분류별 세부 문항 관리",
            "사내 품질 정책에 따른 문항별 가중치 배점 및 필수 불합격 항목(Critical) 지정",
            "감사 체크리스트 버전 관리 및 개정 이력 보존"
        ],
        "점검 기준 개정 ➔ 점검표 마스터 등록 ➔ 실제 제조사 현장 Audit 시 평가표로 사용",
        "입력: 대분류, 세부 점검 문항, 배점(1~5점)\n출력: 표준화된 Audit 현장 점검표"
    )

    # 21. manufacturerAudits
    add_screen_slide(
        "📝 현장 Audit 평가",
        "제조사 현장 Audit 관리 (manufacturerAudits)",
        "manufacturerAudits",
        "관리자, 품질팀",
        "제조사 공장을 직접 방문하여 실시한 정기/수시 현장 감사 결과를 등록하고 종합 등급(A/B/C/D)을 자동 산정합니다.",
        [
            "문항별 취득 점수 입력 시 총점 및 등급(A/B/C/D) 자동 판정",
            "현장 확인 사진 첨부 및 시정조치 요구사항(CAR) 발행",
            "공식 제조사 평가 성적서 PDF 출력 및 제조사 피드백 전달"
        ],
        "현장 실사 수행 ➔ 평가 점수 입력 ➔ 종합 등급 확정 ➔ 제조사 시정조치 결과 접수",
        "입력: 실사일자, 심사원, 문항별 점수, 지적사항 사진\n출력: Audit 결과 성적서, CAR 공문"
    )

    # 22. documentRequests
    add_screen_slide(
        "📋 품질서류 관리",
        "필수 품질서류 관리 (documentRequests)",
        "documentRequests",
        "관리자, 품질팀, 협력 제조사",
        "사업자등록증, CGMP 적합판정서, ISO 인증서, 책임판매업 등록증 등 필수 품질 인증 서류의 수집 및 유효기간을 관리합니다.",
        [
            "제조사별 필수 서류 제출 현황 및 만료일 D-day 실시간 추적",
            "만료 30일/15일 전 제조사에 갱신 요청 자동 알림 및 이메일 발송",
            "제출된 PDF 서류 검토 및 승인/반려 이력 관리"
        ],
        "서류 등록 요청 ➔ 제조사 파일 업로드 ➔ 품질팀 검토 승인 ➔ 만료 시 자동 갱신 알림",
        "입력: 서류 파일(PDF/이미지), 유효기간\n출력: 유효 서류 아카이브, 만료 예정 알림"
    )

    # 23. documentTypeConfig
    add_screen_slide(
        "⚙️ 추가서류 설정",
        "추가 품질서류 설정 (documentTypeConfig)",
        "documentTypeConfig",
        "관리자, 품질팀",
        "환경 인증서, 비건 인증서, 할랄 인증서 등 제품군 및 제조사 특성에 따라 추가로 요구되는 서류 항목과 주기를 설정합니다.",
        [
            "서류 명칭, 설명, 갱신 주기(연간/반기/수시) 표준화",
            "특정 브랜드 또는 제품군에만 적용되는 맞춤형 서류 템플릿 지정",
            "필수 제출 여부 플래그 및 안내 가이드 문구 등록"
        ],
        "관리자가 추가 서류 규격 정의 ➔ 대상 품목/제조사 자동 지정 ➔ 필수 품질서류 대장에 반영",
        "입력: 서류명, 갱신주기, 안내사항\n출력: 확장 품질서류 템플릿"
    )

    # =========================================================================
    # SECTION 5: 고객 클레임 및 CAPA 개선 (3 화면)
    # =========================================================================
    add_section_slide(
        5,
        "고객 클레임 및 CAPA 개선 영역",
        "클레임 인입 접수, 제조사 귀책 소명, LOT 추적 및 재발방지 대책(CAPA)",
        [
            "클레임 조회/입력 (claims)",
            "클레임 분석 대시보드 (claimDashboard)",
            "LOT PPM 분석 & 근본원인 (lotPpmDashboard)"
        ]
    )

    # 24. claims
    add_screen_slide(
        "🔍 클레임 대장",
        "클레임 조회 및 입력 (claims)",
        "claims",
        "관리자, 품질팀, 영업팀 (제조사 소명)",
        "고객 또는 유통 채널에서 인입된 제품 불량 클레임을 접수하고, 사진 첨부 및 제조사 소명/원인 분석을 종합 관리합니다.",
        [
            "제품코드 및 LOT 번호 입력 시 제조사 및 생산일자 자동 연계 매핑",
            "불량 사진, 고객 접수 내용, 반품/교환 수량 전산 기록",
            "제조사 소명서 접수, 귀책(제조사/유통/고객) 판정 및 개선대책(CAPA) 추적"
        ],
        "고객 클레임 접수 ➔ 제조사 소명 요청 메일 발송 ➔ 제조사 개선대책 승인 ➔ 종결 처리",
        "입력: 클레임 유형, LOT번호, 불량 사진, 발생 수량\n출력: 클레임 관리 대장, 제조사 소명서"
    )

    # =========================================================================
    # SECTION 6: 유통 채널 및 브랜드 관리 (3 화면)
    # =========================================================================
    add_section_slide(
        6,
        "유통 채널 및 브랜드 관리 영역",
        "국내외 온/오프라인 유통 채널, 채널별 포장 특이사항 및 브랜드 체계화",
        [
            "유통 채널 관리 (salesChannels)",
            "유통 채널 포장 특이사항 설정 (channelNoteConfig)",
            "브랜드 마스터 관리 (brands)"
        ]
    )

    # 25. salesChannels
    add_screen_slide(
        "🌐 유통 채널",
        "유통 채널 마스터 관리 (salesChannels)",
        "salesChannels",
        "관리자, 품질팀, 영업팀",
        "올리브영, 아마존, 큐텐, 코스트코 등 제품이 납품되는 국내외 유통 채널별 코드와 표준 라벨링 포맷을 관리합니다.",
        [
            "채널별 바코드 규격(EAN-13, ITF-14) 및 사용기한 날짜 표기 형식(YYYY-MM-DD 등) 표준화",
            "아웃박스 봉함 테이프 종류, 라벨 부착 위치 등 채널 요구조건 매핑",
            "채널별 납품 품목 및 전용 포장사양서 자동 연계"
        ],
        "신규 유통 채널 계약 ➔ 채널 마스터 등록 ➔ 제품 포장사양서 작성 시 채널 규격 자동 적용",
        "입력: 채널명, 채널코드, 라벨 일자 표기법\n출력: 표준 유통 채널 데이터베이스"
    )

    # 26. channelNoteConfig
    add_screen_slide(
        "⚙️ 채널 포장 특이사항",
        "유통 채널 포장 특이사항 설정 (channelNoteConfig)",
        "channelNoteConfig",
        "관리자, 품질팀",
        "유통 채널별로 요구되는 까다로운 포장 가이드(아마존 FBA 라벨, 올리브영 전용 스티커 등) 항목을 마스터로 사전 정의합니다.",
        [
            "채널별 특이사항 카테고리 및 표준 가이드 텍스트/이미지 템플릿 관리",
            "포장사양서 작성 시 채널 선택 시 해당 특이사항이 자동으로 로드되어 작업 실수 방지",
            "채널 규정 개정 시 원클릭으로 전사 품목 사양서에 일괄 업데이트"
        ],
        "채널 특이사항 정의 ➔ 제품 포장사양서에 자동 불러오기 ➔ 생산감리 시 검사 기준으로 활용",
        "입력: 특이사항 카테고리, 표준 가이드 문구, 첨부 규정 파일\n출력: 채널별 포장 룰셋"
    )

    # 27. brands
    add_screen_slide(
        "🏷️ 브랜드 마스터",
        "브랜드 마스터 관리 (brands)",
        "brands",
        "관리자, 품질팀, 기획팀",
        "아누아(ANUA)를 비롯하여 사내에서 기획/유통하는 모든 브랜드 코드와 기본 프로필을 관리합니다.",
        [
            "브랜드 코드, 브랜드 국문/영문명, 브랜드 로고 이미지 관리",
            "제품코드 마스터 생성 시 표준 브랜드 드롭다운 연동",
            "브랜드별 품질 클레임 및 입고 검사 통계 집계의 핵심 기준 키로 활용"
        ],
        "브랜드 런칭 ➔ 브랜드 마스터 등록 ➔ 신제품 품목 코드 채번 및 사양서 관리",
        "입력: 브랜드명, 브랜드 코드, 브랜드 로고\n출력: 전사 표준 브랜드 목록"
    )

    # =========================================================================
    # SECTION 7: 시스템 보안, 거버넌스 및 운영 도구 (9 화면)
    # =========================================================================
    add_section_slide(
        7,
        "시스템 보안, 거버넌스 및 운영 도구",
        "사용자 승인, RBAC 권한, Audit Trail, 접근 로그, 버그 리포트 및 가이드 관리",
        [
            "사용자 승인 관리 (users)",
            "권한 관리 [RBAC] (roles)",
            "시스템 변경 이력 [Audit Trail] (logs)",
            "사용자 접근 로그 (accessLogs)",
            "버그 리포트 관리 (bugReports)",
            "제조사 전달 메일 템플릿 (mailTemplates)",
            "전체공지 관리 (announcements)",
            "사용자 가이드 마스터 관리 (guideManagement)",
            "데이터 복구 [휴지통] (trashBin)"
        ]
    )

    # 28. users
    add_screen_slide(
        "👥 사용자 승인",
        "사용자 승인 및 계정 관리 (users)",
        "users",
        "관리자 (ROLE_ADMIN)",
        "신규 회원가입 신청자의 소속(더파운더즈/제조사)과 부서를 검토하여 계정 활성화(승인) 및 권한을 부여합니다.",
        [
            "신규 가입 대기 계정 실시간 승인/반려/차단 제어",
            "사용자별 소속 제조사 매핑을 통한 데이터 접근 격리",
            "비밀번호 오류 잠금 해제 및 초기화 기능"
        ],
        "사용자 회원가입 ➔ 관리자 승인 검토 ➔ 역할(Role) 할당 ➔ 시스템 로그인 허용",
        "입력: 사용자 가입 신청서, 소속 정보\n출력: 승인된 시스템 계정 목록"
    )

    # 29. roles
    add_screen_slide(
        "🔐 역할 기반 권한 (RBAC)",
        "권한 및 레이아웃 관리 (roles)",
        "roles",
        "관리자 (ROLE_ADMIN)",
        "관리자, 품질팀, 영업팀, 제조사 등 각 역할별 39개 메뉴에 대한 조회/수정/삭제 권한 매트릭스를 정밀 제어합니다.",
        [
            "화면별 조회(READ), 생성/수정(WRITE), 삭제(DELETE) 권한 체크박스 매트릭스",
            "역할별 기본 대시보드 템플릿 매핑",
            "보안 감사 규정에 맞춘 최소 권한 부여 원칙 준수"
        ],
        "역할 정의 ➔ 화면별 접근 권한 설정 ➔ 대시보드 연결 ➔ 사용자에게 역할 할당",
        "입력: 역할명, 메뉴별 CRUD 권한 플래그\n출력: RBAC 보안 접근 제어 매트릭스"
    )

    # 30. logs
    add_screen_slide(
        "📜 시스템 감사 로그",
        "시스템 변경 이력 [Audit Trail] (logs)",
        "logs",
        "관리자, 품질팀",
        "제품 마스터, 포장사양, 클레임, 제조사 등 전사 데이터의 생성, 수정, 삭제 작업 이력을 시간대별로 완벽히 기록합니다.",
        [
            "작업 일시, 작업자 IP, 변경 대상 엔티티, 작업 유형(INSERT/UPDATE/DELETE) 기록",
            "변경 전(Before) / 변경 후(After) JSON 데이터 상세 대조 뷰",
            "위변조 방지 감사 추적성(Audit Trail) 확보"
        ],
        "시스템 내 모든 데이터 수정 시 ➔ 백엔드 AOP 자동 인터셉트 ➔ 감사 로그 DB 영구 적재",
        "입력: 데이터 트랜잭션 이벤트\n출력: 시간순 감사 로그 대장, 변경 전후 diff 뷰"
    )

    # 31. accessLogs
    add_screen_slide(
        "🕒 접속 보안 로그",
        "사용자 접근 로그 (accessLogs)",
        "accessLogs",
        "관리자 (ROLE_ADMIN)",
        "모든 사용자의 로그인 시각, 접속 IP, 브라우저 환경, 로그인 성공/실패 이력을 실시간 모니터링합니다.",
        [
            "실시간 로그인 및 로그아웃 이벤트 추적",
            "비정상 IP 및 다중 비밀번호 오류 시도 탐지",
            "개인정보보호법 및 ISMS 보안 감사 기준 충족"
        ],
        "사용자 로그인 시도 ➔ 접속 로그 기록 ➔ 이상 징후 발생 시 계정 자동 잠금",
        "입력: 로그인 요청 헤더, IP, 인증 결과\n출력: 접속 보안 통계 및 이상 접속 리포트"
    )

    # 32. bugReports
    add_screen_slide(
        "🐞 버그 리포트 관리",
        "시스템 버그 리포트 관리 (bugReports)",
        "bugReports",
        "관리자, 개발팀",
        "사용자가 겪은 오류나 시스템 예외가 발생했을 때 에러 스택, 스크린샷이 포함된 리포트를 자동으로 수집하여 관리합니다.",
        [
            "프론트엔드/백엔드 런타임 오류 자동 리포팅 연동",
            "버그 심각도(CRITICAL/HIGH/NORMAL) 및 처리 상태(접수/처리중/완료) 관리",
            "에러 스택 추적을 통한 신속한 무장애 유지보수 지원"
        ],
        "시스템 에러 발생 ➔ 사용자 또는 자동 리포트 전송 ➔ 개발팀 확인 및 즉시 패치",
        "입력: 에러 메시지, 브라우저 정보, 화면 스냅샷\n출력: 버그 추적 티켓 대장"
    )

    # 33. mailTemplates
    add_screen_slide(
        "📧 메일 템플릿",
        "제조사 전달 메일 관리 (mailTemplates)",
        "mailTemplates",
        "관리자, 품질팀",
        "클레임 소명 요청, 감리 승인/반려 안내, 서류 만료 통보 등 주요 대외 공문 이메일 양식을 표준화 관리합니다.",
        [
            "상황별 표준 이메일 제목 및 본문 HTML 서식 관리",
            "#{제조사명}, #{제품명}, #{클레임번호} 등 동적 변수 치환 지원",
            "메일 발송 이력 추적 및 수신 확인 연동"
        ],
        "품질 이벤트 발생(예: 감리 반려) ➔ 템플릿 로드 및 변수 치환 ➔ 제조사 자동 발송",
        "입력: 메일 카테고리, 본문 서식, 치환 태그\n출력: 규격화된 공식 발송 이메일"
    )

    # 34. announcements
    add_screen_slide(
        "📢 전체공지 관리",
        "전체공지 및 카테고리 관리 (announcements)",
        "announcements",
        "관리자, 품질팀",
        "사내 임직원 및 협력 제조사를 대상으로 품질 지침 개정, 법령 변경, 긴급 공지사항을 전파합니다.",
        [
            "공지 카테고리(긴급, 중요, 일반)별 스타일 및 뱃지 관리",
            "대상자 지정(전체 / 특정 제조사 그룹) 맞춤형 게시",
            "공지 등록 시 대상자 이메일 일괄 자동 발송 옵션 제공"
        ],
        "관리자가 공지 작성 ➔ 대상자 지정 및 게시 ➔ 시스템 팝업 및 이메일 동시 전파",
        "입력: 공지 제목, 본문, 첨부파일, 대상 그룹\n출력: 전사 공지 피드, 발송 이메일"
    )

    # 35. guideManagement
    add_screen_slide(
        "📖 사용자 가이드 마스터",
        "사용자 가이드 마스터 관리 (guideManagement)",
        "guideManagement",
        "관리자 (ROLE_ADMIN)",
        "시스템 내 39개 전체 화면의 도움말 제목과 세부 기능 설명을 중앙에서 편집하고 전 화면 헬프센터로 실시간 배포 동기화합니다.",
        [
            "39개 전체 화면별 사용자 가이드(제목, 세부 섹션, 설명) 실시간 편집 및 배포",
            "📖 전 화면 우상단 물음표(?) 클릭 시 실시간 가이드 서랍(HelpCenterDrawer) 연동",
            "⌨️ 전역 단축키(Ctrl+K) 커맨드 팔레트와 연동된 지능형 빠른 메뉴 및 도움말 검색",
            "표준 가이드 39종 일괄 동기화 버튼으로 신규 배포 시 안전한 DB 복원 보장"
        ],
        "관리자가 가이드 수정 ➔ DB 저장 ➔ 각 화면의 헬프센터 서랍 및 도움말 팝업에 실시간 반영",
        "입력: 페이지 키, 가이드 제목, 섹션별 설명 JSON\n출력: 실시간 사용자 도움말 콘텐츠 및 커맨드 검색"
    )

    # 36. trashBin
    add_screen_slide(
        "🗑️ 데이터 복구 센터",
        "데이터 복구 [휴지통] (trashBin)",
        "trashBin",
        "관리자 (ROLE_ADMIN)",
        "실수로 삭제된 제품, BOM 부자재, 클레임, 제조사 등의 데이터를 영구 삭제하지 않고 안전하게 보관 및 복원합니다.",
        [
            "소프트 삭제(is_deleted = true) 처리된 데이터 격리 보관",
            "삭제 일시 및 삭제자 정보 확인 후 원클릭 원상 복구(Restore)",
            "보관 기간 만료 데이터의 안전한 영구 파기(Hard Delete)"
        ],
        "화면에서 데이터 삭제 ➔ 소프트 딜리트 전환 ➔ 휴지통 보관 ➔ 필요 시 즉시 복구",
        "입력: 삭제 요청 이벤트\n출력: 복구 가능한 삭제 데이터 목록, 복원 트랜잭션"
    )

    # =========================================================================
    # CLOSING SLIDE: 종합 맺음말 및 기대 효과
    # =========================================================================
    slide_end = prs.slides.add_slide(blank_slide_layout)
    set_slide_background(slide_end, COLOR_BG_DARK)

    end_card = slide_end.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.2), Inches(10.333), Inches(5.1)
    )
    end_card.fill.solid()
    end_card.fill.fore_color.rgb = COLOR_BG_CARD
    end_card.line.color.rgb = RGBColor(59, 130, 246)
    end_card.line.width = Pt(2)

    etf = end_card.text_frame
    etf.word_wrap = True
    etf.margin_left = Inches(0.8)
    etf.margin_top = Inches(0.6)

    ep0 = etf.paragraphs[0]
    ep0.text = "THE FOUNDERS QMS ENTERPRISE"
    ep0.font.name = FONT_NAME
    ep0.font.size = Pt(13)
    ep0.font.bold = True
    ep0.font.color.rgb = RGBColor(96, 165, 250)

    ep1 = etf.add_paragraph()
    ep1.text = "QMS 도입 종합 기대 효과 및 향후 고도화 로드맵"
    ep1.font.name = FONT_NAME
    ep1.font.size = Pt(26)
    ep1.font.bold = True
    ep1.font.color.rgb = COLOR_WHITE
    ep1.space_after = Pt(14)

    ep2 = etf.add_paragraph()
    ep2.text = (
        "1. 업무 리드타임 75% 단축: 신제품 포장사양서 및 3D 도면 확정 프로세스 전산화로 기획-생산 소통 가속\n"
        "2. 품질 불량률 조기 감축: LOT 단위 PPM 지표 및 제조사 현장 Audit 체계화로 재발 방지 CAPA 확립\n"
        "3. 글로벌 규제 대응 리스크 제로: 6,000건 전성분 안전성 및 환경부 포장공간비율 법령 사전 검증\n"
        "4. 제로 코스트(Zero-Cost) 인프라: Firebase Spark & Supabase 무과금 한도 내 완벽한 엔터프라이즈 운영"
    )
    ep2.font.name = FONT_NAME
    ep2.font.size = Pt(11.5)
    ep2.font.color.rgb = RGBColor(226, 232, 240)
    ep2.space_after = Pt(18)

    ep3 = etf.add_paragraph()
    ep3.text = "감사합니다.  |  품질경영시스템 개발 및 운영팀"
    ep3.font.name = FONT_NAME
    ep3.font.size = Pt(13)
    ep3.font.bold = True
    ep3.font.color.rgb = COLOR_EMERALD

    output_path = os.path.abspath("./QMS_시스템_화면별_기능정의_보고서.pptx")
    fallback_path = os.path.abspath("./QMS_시스템_화면별_기능정의_보고서_최신.pptx")
    try:
        prs.save(output_path)
        print(f"Successfully generated PowerPoint report: {output_path} ({len(prs.slides)} slides) [SUCCESS]")
    except PermissionError:
        prs.save(fallback_path)
        print(f"[NOTICE] Original file was open/locked. Successfully saved to fallback file: {fallback_path} ({len(prs.slides)} slides) [SUCCESS]")

if __name__ == "__main__":
    create_presentation()
