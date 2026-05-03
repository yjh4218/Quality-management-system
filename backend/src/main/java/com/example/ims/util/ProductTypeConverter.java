package com.example.ims.util;

import com.example.ims.entity.ProductType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * [QMS Master] Safe Enum Converter for ProductType
 * Prevents 500 errors when DB contain legacy or corrupted enum names.
 */
@Converter(autoApply = true)
@Slf4j
public class ProductTypeConverter implements AttributeConverter<ProductType, String> {

    @Override
    public String convertToDatabaseColumn(ProductType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public ProductType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return ProductType.ETC;
        }

        try {
            return ProductType.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            log.warn(">>>> [LEGACY DATA FOUND] Invalid ProductType in DB: '{}'. Mapping to ETC.", dbData);
            return ProductType.ETC;
        }
    }
}
