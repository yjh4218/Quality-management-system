package com.example.ims.repository;

import com.example.ims.entity.*;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DocumentRequirementSpecification {

    public static Specification<DocumentRequirement> filterBy(
            String search,
            String manufacturer,
            String status,
            String scope,
            String startDate,
            String endDate,
            String itemCode,
            String productName,
            Long manufacturerId
    ) {
        return (Root<DocumentRequirement> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. 제조사 소속 FK 정밀 데이터 격리 (ROLE_MANUFACTURER 적용 시)
            if (manufacturerId != null) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                Join<Product, Manufacturer> prodMfgJoin = productJoin.join("manufacturerInfo", JoinType.LEFT);
                Join<DocumentRequirement, Manufacturer> mfgJoin = root.join("manufacturer", JoinType.LEFT);

                predicates.add(cb.or(
                        cb.equal(prodMfgJoin.get("id"), manufacturerId),
                        cb.equal(mfgJoin.get("id"), manufacturerId)
                ));
            }

            // 2. search 필터 (품목명, 품목코드 검색)
            if (search != null && !search.trim().isEmpty()) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(productJoin.get("productName")), pattern),
                        cb.like(cb.lower(productJoin.get("itemCode")), pattern)
                ));
            }

            // 3. 품목코드(itemCode) 정밀 필터
            if (itemCode != null && !itemCode.trim().isEmpty()) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                predicates.add(cb.like(cb.lower(productJoin.get("itemCode")), "%" + itemCode.trim().toLowerCase() + "%"));
            }

            // 4. 품목명(productName) 정밀 필터
            if (productName != null && !productName.trim().isEmpty()) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                predicates.add(cb.like(cb.lower(productJoin.get("productName")), "%" + productName.trim().toLowerCase() + "%"));
            }

            // 5. 제조사명 텍스트 검색 필터 (관리자용)
            if (manufacturer != null && !manufacturer.trim().isEmpty()) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                Join<Product, Manufacturer> prodMfgJoin = productJoin.join("manufacturerInfo", JoinType.LEFT);
                Join<DocumentRequirement, Manufacturer> mfgJoin = root.join("manufacturer", JoinType.LEFT);
                
                String mfgPattern = "%" + manufacturer.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(prodMfgJoin.get("name")), mfgPattern),
                        cb.like(cb.lower(mfgJoin.get("name")), mfgPattern)
                ));
            }

            // 6. 날짜 범위 필터 (nextDueDate 또는 createdAt 기준)
            if (startDate != null && !startDate.trim().isEmpty() && endDate != null && !endDate.trim().isEmpty()) {
                try {
                    LocalDate start = LocalDate.parse(startDate.trim());
                    LocalDate end = LocalDate.parse(endDate.trim());
                    predicates.add(cb.or(
                            cb.isNull(root.get("nextDueDate")),
                            cb.between(root.get("nextDueDate"), start, end)
                    ));
                } catch (Exception e) {
                    // ignore invalid date parse
                }
            }

            // 7. 상태 필터 (PENDING, REQUESTED, FULFILLED, OVERDUE)
            if (status != null && !status.trim().isEmpty()) {
                try {
                    DocumentStatus statusEnum = DocumentStatus.valueOf(status.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                } catch (IllegalArgumentException e) {
                    // Invalid enum value
                }
            }

            // 8. 적용 단위 Scope 필터 (PRODUCT, MANUFACTURER)
            if (scope != null && !scope.trim().isEmpty()) {
                if ("PRODUCT".equalsIgnoreCase(scope)) {
                    predicates.add(cb.isNotNull(root.get("productId")));
                } else if ("MANUFACTURER".equalsIgnoreCase(scope)) {
                    predicates.add(cb.isNotNull(root.get("manufacturerId")));
                }
            }

            // [성능 최적화] 페이징 카운트 쿼리 시 fetch join 방지
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("product", JoinType.LEFT);
                root.fetch("manufacturer", JoinType.LEFT);
                root.fetch("customDocumentType", JoinType.LEFT);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
