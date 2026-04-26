package com.example.ims.util;

import com.example.ims.entity.WmsInbound.OverallStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * [QMS Master] Safe Enum Converter for WmsInbound.OverallStatus
 * Prevents 500 errors when DB contains legacy or corrupted values.
 */
@Converter
@Slf4j
public class OverallStatusConverter implements AttributeConverter<OverallStatus, String> {

    @Override
    public String convertToDatabaseColumn(OverallStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public OverallStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return OverallStatus.STEP1_WAITING;
        }

        try {
            return OverallStatus.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            log.warn(">>>> [LEGACY DATA FOUND] Invalid OverallStatus in DB: '{}'. Mapping to STEP1_WAITING.", dbData);
            return OverallStatus.STEP1_WAITING;
        }
    }
}
