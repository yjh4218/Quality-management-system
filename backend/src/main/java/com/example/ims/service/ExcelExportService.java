package com.example.ims.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.function.Function;

/**
 * [공통 부품] 데이터 리스트를 엑셀 파일(byte[])로 변환하는 범용 서비스입니다.
 * SXSSFWorkbook을 사용하여 대용량 데이터 처리 시 메모리 사용량을 최소화합니다.
 */
@Service
@Slf4j
public class ExcelExportService {

    /**
     * 데이터를 엑셀 바이너리로 변환합니다.
     * 
     * @param sheetName 시트 이름
     * @param headers 헤더 목록
     * @param data 데이터 리스트
     * @param rowMapper 각 객체를 엑셀 로우(Cell Array)로 매핑하는 함수
     * @return 엑셀 파일 바이트 배열
     * @throws IOException
     */
    public <T> byte[] exportToExcel(String sheetName, String[] headers, List<T> data, Function<T, Object[]> rowMapper) throws IOException {
        log.info("Generating Excel: sheet={}, rows={}", sheetName, data.size());
        
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) { // 100행마다 디스크 플러시 (메모리 절약)
            Sheet sheet = workbook.createSheet(sheetName);

            // 헤더 스타일 설정 (회색 배경 + 굵은 글씨)
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            // 테두리 스타일
            CellStyle contentStyle = workbook.createCellStyle();
            contentStyle.setBorderBottom(BorderStyle.THIN);
            contentStyle.setBorderTop(BorderStyle.THIN);
            contentStyle.setBorderLeft(BorderStyle.THIN);
            contentStyle.setBorderRight(BorderStyle.THIN);

            // 헤더 행 생성
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // 데이터 행 생성
            for (int i = 0; i < data.size(); i++) {
                Row row = sheet.createRow(i + 1);
                Object[] columnValues = rowMapper.apply(data.get(i));
                for (int j = 0; j < columnValues.length; j++) {
                    Cell cell = row.createCell(j);
                    cell.setCellStyle(contentStyle);
                    
                    Object val = columnValues[j];
                    if (val != null) {
                        if (val instanceof Number) {
                            cell.setCellValue(((Number) val).doubleValue());
                        } else if (val instanceof Boolean) {
                            cell.setCellValue((Boolean) val ? "\u25CB (YES)" : "\u2715 (NO)");
                        } else {
                            cell.setCellValue(val.toString());
                        }
                    }
                }
            }

            // [참고] SXSSF는 autoSizeColumn이 제한적이므로 기본 너비 설정 권장
            for (int i = 0; i < headers.length; i++) {
                sheet.setColumnWidth(i, 20 * 256); // 대략적인 너비
            }

            try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
                workbook.write(bos);
                workbook.dispose(); // 임시 파일 삭제
                return bos.toByteArray();
            }
        }
    }
}
