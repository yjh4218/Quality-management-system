package com.example.ims.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * 페이지네이션 요청의 Max Size를 제한하여 대용량 쿼리로 인한 메모리 소진(OOM)을 방지하는 유틸리티
 */
public final class PageableUtils {
    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_PAGE_SIZE = 20;

    private PageableUtils() {}

    public static Pageable clamp(Pageable pageable) {
        if (pageable == null) {
            return PageRequest.of(0, DEFAULT_PAGE_SIZE);
        }
        if (pageable.getPageSize() > MAX_PAGE_SIZE) {
            return PageRequest.of(pageable.getPageNumber(), MAX_PAGE_SIZE, pageable.getSort());
        }
        return pageable;
    }

    public static Pageable of(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        return PageRequest.of(safePage, safeSize);
    }

    public static Pageable of(int page, int size, Sort sort) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        return PageRequest.of(safePage, safeSize, sort);
    }
}
