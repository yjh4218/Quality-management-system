package com.example.ims.repository;

import com.example.ims.entity.*;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class DocumentRequirementSpecification {

    public static Specification<DocumentRequirement> filterBy(
            String search,
            String manufacturer,
            String status,
            String scope
    ) {
        return (Root<DocumentRequirement> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. search 필터 (품목명, 품목코드 검색)
            if (search != null && !search.trim().isEmpty()) {
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(productJoin.get("productName")), pattern),
                        cb.like(cb.lower(productJoin.get("itemCode")), pattern)
                ));
            }

            // 2. 제조사 필터
            if (manufacturer != null && !manufacturer.trim().isEmpty()) {
                // 품목의 제조사 또는 제조사 자체 ID 조인 매핑
                Join<DocumentRequirement, Product> productJoin = root.join("product", JoinType.LEFT);
                Join<Product, Manufacturer> prodMfgJoin = productJoin.join("manufacturerInfo", JoinType.LEFT);
                Join<DocumentRequirement, Manufacturer> mfgJoin = root.join("manufacturer", JoinType.LEFT);
                
                String mfgPattern = "%" + manufacturer.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(prodMfgJoin.get("name")), mfgPattern),
                        cb.like(cb.lower(mfgJoin.get("name")), mfgPattern)
                ));
            }

            // 3. 상태 필터 (PENDING, REQUESTED, FULFILLED, OVERDUE)
            if (status != null && !status.trim().isEmpty()) {
                try {
                    DocumentStatus statusEnum = DocumentStatus.valueOf(status.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                } catch (IllegalArgumentException e) {
                    // Invalid enum value, skip or apply fail predicate
                }
            }

            // 4. 적용 단위 Scope 필터 (PRODUCT, MANUFACTURER)
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
