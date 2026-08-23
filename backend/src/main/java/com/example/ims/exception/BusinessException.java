package com.example.ims.exception;

/**
 * 비즈니스 규칙 및 유효성 검증 실패 시 발생하는 표준 예외 클래스.
 * GlobalExceptionHandler를 통해 400 Bad Request 및 사용자 친화적인 메시지를 전달합니다.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
