package com.example.ims.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * [보안 S-2] XSS (Cross-Site Scripting) 방어 전용 새니타이저.
 * Jsoup 라이브러리를 활용하여 저장형 XSS 공격 코드를 사전에 제거합니다.
 */
public final class XssSanitizer {

    private static final Safelist RELAXED_SAFELIST = Safelist.relaxed()
            .addTags("span", "hr")
            .addAttributes(":all", "style", "class");

    private XssSanitizer() {
        // utility class
    }

    /**
     * 리치 텍스트 필드용 HTML 새니타이즈 (스크립트/iframe/이벤트핸들러 제거, 안전 태그 허용)
     */
    public static String sanitize(String html) {
        if (html == null || html.trim().isEmpty()) {
            return html;
        }
        return Jsoup.clean(html, RELAXED_SAFELIST);
    }

    /**
     * 순수 텍스트 필드용 태그 전면 제거 (어떠한 HTML 태그도 허용하지 않음)
     */
    public static String stripAll(String text) {
        if (text == null || text.trim().isEmpty()) {
            return text;
        }
        return Jsoup.clean(text, Safelist.none());
    }
}
