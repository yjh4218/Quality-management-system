package com.example.ims.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

public interface SmsService {
    /**
     * 지정된 수신 번호로 6자리 본인확인 인증번호 SMS를 발송합니다.
     * @param toPhoneNumber 수신자 휴대폰 번호 (예: 010-1234-5678)
     * @param verificationCode 6자리 인증번호
     * @return 발송 성공 여부
     */
    boolean sendVerificationCode(String toPhoneNumber, String verificationCode);
}

@Slf4j
@Service
class DefaultSmsService implements SmsService {

    @Override
    public boolean sendVerificationCode(String toPhoneNumber, String verificationCode) {
        // [안내] 운영 환경에서는 Aligo/CoolSMS/Twilio 등 SMS 통신사 API를 호출할 수 있으며,
        // 현재 시스템에서는 안전한 시뮬레이션 및 로깅 처리를 통해 즉시 검증할 수 있도록 지원합니다.
        String cleanPhone = toPhoneNumber != null ? toPhoneNumber.replaceAll("[^0-9]", "") : "";
        log.info(">>>> [SMS-SERVICE] 본인인증 번호 발송 완료 | 수신번호: {} | 인증코드: [{}] (유효시간: 3분)", 
                toPhoneNumber, verificationCode);
        return true;
    }
}

