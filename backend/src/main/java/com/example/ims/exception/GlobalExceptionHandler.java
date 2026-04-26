package com.example.ims.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 전역 예외 처리기.
 * [보안] 운영 환경에서 내부 스택트레이스가 노출되지 않도록 제어하며,
 * 모든 500 에러에 대해 추적을 위한 Correlation-ID를 발급합니다.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * [Task 11] Bean Validation(@Valid) 실패 시 발생하는 예외 처리.
     * 필드별 상세 오류 메시지를 400 Bad Request와 함께 반환합니다.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    /**
     * 파일 업로드 용량 제한 초과 예외 처리.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        Map<String, String> body = new HashMap<>();
        body.put("error", "FileSizeLimitExceeded");
        body.put("message", "파일 용량이 너무 큽니다. 최대 10MB까지만 업로드 가능합니다.");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }

    /**
     * 잘못된 인자 전달 시 예외 처리 (400 Bad Request).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * 권한 부족(403) 예외 처리. (이 처리가 없으면 RuntimeException으로 매핑되어 400 에러를 반환함)
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied detected: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("error", "AccessDenied");
        response.put("message", "해당 작업을 수행할 권한이 없습니다.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    /**
     * 런타임 예외 처리.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex, WebRequest request) {
        log.warn("Runtime exception detected: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * [Task 7] 최상위 예외 처리 (500 Internal Server Error).
     * [보안] 스택트레이스를 사용자에게 노출하지 않고 UUID 기반의 Correlation-ID를 발급하여 로그 추적성을 확보합니다.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGlobalException(Exception ex, WebRequest request) {
        String correlationId = UUID.randomUUID().toString();
        
        // 운영 로그에만 상세 내용 기록 (스택트레이스 포함)
        log.error("[CORRELATION-ID: {}] Unhandled server error: {}", correlationId, ex.getMessage(), ex);

        Map<String, String> response = new HashMap<>();
        response.put("message", "시스템 내부 무결성 검사 중 오류가 발생했습니다. 증상이 지속되면 관리자에게 문의하세요.");
        response.put("correlationId", correlationId); // 사용자에게는 ID만 전달하여 문의 시 참조하게 함

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
