package com.example.ims.service;

import com.example.ims.dto.ProductIngredientDto;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelParsingService {

    public List<ProductIngredientDto> parseIngredientExcel(MultipartFile file) throws Exception {
        List<ProductIngredientDto> ingredientsList = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            
            // Assume first row is header, second row is note. Start from row 2.
            for (int i = 2; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                ProductIngredientDto dto = new ProductIngredientDto();
                
                dto.setKorName(getCellValueAsString(row.getCell(0)));
                dto.setEngName(getCellValueAsString(row.getCell(1)));
                String percentStr = getCellValueAsString(row.getCell(2));
                String ppmStr = "";
                String ppbStr = "";

                // Auto conversion if percent is provided
                if (percentStr != null && !percentStr.trim().isEmpty()) {
                    try {
                        BigDecimal percentVal = new BigDecimal(percentStr.trim());
                        // Format to 2 decimal places
                        dto.setContentPercent(percentVal.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
                        
                        BigDecimal ppmVal = percentVal.multiply(new BigDecimal("10000"));
                        BigDecimal ppbVal = percentVal.multiply(new BigDecimal("10000000"));
                        
                        ppmStr = ppmVal.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
                        ppbStr = ppbVal.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
                    } catch (Exception ignored) {
                        dto.setContentPercent(percentStr);
                    }
                } else {
                    dto.setContentPercent(percentStr);
                }

                dto.setContentPpm(ppmStr);
                dto.setContentPpb(ppbStr);
                dto.setInciName(getCellValueAsString(row.getCell(3)));
                dto.setAllergenMark(getCellValueAsString(row.getCell(4)));
                dto.setLimitClass(getCellValueAsString(row.getCell(5)));

                // Skip if both korName and engName are empty (empty row)
                if ((dto.getKorName() == null || dto.getKorName().trim().isEmpty()) &&
                    (dto.getEngName() == null || dto.getEngName().trim().isEmpty())) {
                    continue;
                }

                ingredientsList.add(dto);
            }
        }
        
        return ingredientsList;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    // Prevent scientific notation
                    long longVal = (long) cell.getNumericCellValue();
                    if (cell.getNumericCellValue() == longVal) {
                        return String.valueOf(longVal);
                    }
                    return String.valueOf(cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return "";
        }
    }
}
