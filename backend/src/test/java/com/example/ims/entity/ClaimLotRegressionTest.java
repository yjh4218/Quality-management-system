package com.example.ims.entity;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * D-9 결함 (클레임 접수 시 LOT 번호 강제 필수 결함) 해소 및 회귀 검증 테스트
 * DEC-09: 기존 클레임 로직 100% 무변경 보존
 */
class ClaimLotRegressionTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("[D-9 해소] Claim 엔티티 생성 시 lotNumber가 null이어도 유효성 검사 통과")
    void claim_NullLotNumber_PassesValidation() {
        Claim claim = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("ITEM-001")
                .productName("테스트 화장품")
                .lotNumber(null) // D-9: null 전달
                .isLotUnknown(true)
                .manufacturer("테스트제조사")
                .occurrenceQty(1)
                .build();

        Set<ConstraintViolation<Claim>> violations = validator.validate(claim);

        // lotNumber 관련 위반 사항이 전혀 없어야 함
        boolean hasLotViolation = violations.stream()
                .anyMatch(v -> "lotNumber".equals(v.getPropertyPath().toString()));
        assertThat(hasLotViolation).isFalse();
    }

    @Test
    @DisplayName("[D-9 해소] Claim 엔티티 생성 시 lotNumber가 빈 문자열이어도 유효성 검사 통과")
    void claim_EmptyLotNumber_PassesValidation() {
        Claim claim = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("ITEM-002")
                .productName("테스트 앰플")
                .lotNumber("") // D-9: 빈 문자열 전달
                .isLotUnknown(true)
                .manufacturer("테스트제조사")
                .occurrenceQty(2)
                .build();

        Set<ConstraintViolation<Claim>> violations = validator.validate(claim);

        boolean hasLotViolation = violations.stream()
                .anyMatch(v -> "lotNumber".equals(v.getPropertyPath().toString()));
        assertThat(hasLotViolation).isFalse();
    }

    @Test
    @DisplayName("[DEC-09 보존] 기존 정상 lotNumber를 입력한 경우 정상 통과")
    void claim_ValidLotNumber_PassesValidation() {
        Claim claim = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("ITEM-003")
                .productName("수분 에센스")
                .lotNumber("24L09A")
                .isLotUnknown(false)
                .manufacturer("정상제조사")
                .occurrenceQty(5)
                .build();

        Set<ConstraintViolation<Claim>> violations = validator.validate(claim);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("[데이터 무결성] 품목코드, 제품명, 제조사 등 다른 필수 항목의 @NotBlank는 엄격히 유지")
    void claim_OtherMandatoryFields_Enforced() {
        Claim claim = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("") // 품목코드 누락!
                .productName("") // 제품명 누락!
                .lotNumber(null)
                .manufacturer("") // 제조사 누락!
                .build();

        Set<ConstraintViolation<Claim>> violations = validator.validate(claim);

        // itemCode, productName, manufacturer는 위반이어야 하지만, lotNumber는 위반이 아니어야 함
        assertThat(violations.stream().anyMatch(v -> "itemCode".equals(v.getPropertyPath().toString()))).isTrue();
        assertThat(violations.stream().anyMatch(v -> "productName".equals(v.getPropertyPath().toString()))).isTrue();
        assertThat(violations.stream().anyMatch(v -> "manufacturer".equals(v.getPropertyPath().toString()))).isTrue();
        assertThat(violations.stream().anyMatch(v -> "lotNumber".equals(v.getPropertyPath().toString()))).isFalse();
    }
}
