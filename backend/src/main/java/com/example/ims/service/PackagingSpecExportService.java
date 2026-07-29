package com.example.ims.service;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.PackagingSpecComponent;
import com.example.ims.entity.PackagingSpecRevision;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.PackagingSpecComponentRepository;
import com.example.ims.repository.PackagingSpecRevisionRepository;
import com.example.ims.repository.ProductRepository;
import com.itextpdf.text.Document;
import com.itextpdf.text.Font;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.stream.Collectors;
import java.util.List;

/**
 * Service to generate Excel and PDF exports for Packaging Specifications.
 */
@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
@Transactional(readOnly = true)
public class PackagingSpecExportService {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final PackagingSpecRevisionRepository revisionRepository;
    private final PackagingSpecComponentRepository componentRepository;
    private final com.example.ims.repository.ChannelPackagingRuleRepository channelPackagingRuleRepository;
    private final com.example.ims.repository.PackagingMethodImageRepository methodImageRepository;

    /**
     * Generates a comprehensive and professional Excel export for the given product's packaging specs.
     * Dynamic generation without external template dependency.
     * @param productId Product ID
     * @return byte array containing the Excel file bytes
     * @throws Exception if an error occurs during generation
     */
    public byte[] generateExcel(Long productId) throws Exception {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        specs.sort((a,b) -> {
            int vA = a.getVersion() == null ? 0 : a.getVersion();
            int vB = b.getVersion() == null ? 0 : b.getVersion();
            return Integer.compare(vB, vA); // descending
        });

        Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        
        // --- 스타일 정의 ---
        org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
        titleFont.setFontName("맑은 고딕");
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setBold(true);
        titleFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        titleStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

        org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
        headerFont.setFontName("맑은 고딕");
        headerFont.setFontHeightInPoints((short) 10);
        headerFont.setBold(true);
        headerFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(headerStyle);

        org.apache.poi.ss.usermodel.CellStyle subHeaderStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font subHeaderFont = workbook.createFont();
        subHeaderFont.setFontName("맑은 고딕");
        subHeaderFont.setFontHeightInPoints((short) 10);
        subHeaderFont.setBold(true);
        subHeaderStyle.setFont(subHeaderFont);
        subHeaderStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
        subHeaderStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        subHeaderStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        subHeaderStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(subHeaderStyle);

        org.apache.poi.ss.usermodel.CellStyle labelStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font labelFont = workbook.createFont();
        labelFont.setFontName("맑은 고딕");
        labelFont.setFontHeightInPoints((short) 10);
        labelFont.setBold(true);
        labelStyle.setFont(labelFont);
        labelStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_TURQUOISE.getIndex());
        labelStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        labelStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        labelStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(labelStyle);

        org.apache.poi.ss.usermodel.CellStyle dataStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font dataFont = workbook.createFont();
        dataFont.setFontName("맑은 고딕");
        dataFont.setFontHeightInPoints((short) 10);
        dataStyle.setFont(dataFont);
        dataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        dataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(dataStyle);

        org.apache.poi.ss.usermodel.CellStyle centerDataStyle = workbook.createCellStyle();
        centerDataStyle.setFont(dataFont);
        centerDataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        centerDataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(centerDataStyle);

        org.apache.poi.ss.usermodel.CellStyle wrapDataStyle = workbook.createCellStyle();
        wrapDataStyle.setFont(dataFont);
        wrapDataStyle.setWrapText(true);
        wrapDataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        wrapDataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.TOP);
        setBorders(wrapDataStyle);

        try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet0 = workbook.createSheet("포장사양서");

            // 타이틀 행 (Row 0 ~ 1)
            Row titleRow = sheet0.createRow(0);
            titleRow.setHeightInPoints(35);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("📦 제품 포장 사양서 (Packaging Specification)");
            titleCell.setCellStyle(titleStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 1, 0, 7));

            // 기본 데이터 준비
            String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
            String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
            String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
            String englishProductNameWithSpecs = (product.getEnglishProductName() != null ? product.getEnglishProductName() : "") + capacityInfo;
            String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                ? product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(Collectors.joining(", "))
                : "미지정";

            PackagingSpecification spec = specs.isEmpty() ? PackagingSpecification.builder().product(product).build() : specs.get(0);

            // [1. 제품 기본 정보 카드] (Row 3 ~ 8)
            createSectionHeader(sheet0, 3, "1. 제품 및 기본 정보", headerStyle, 7);

            addRow(sheet0, 4, labelStyle, dataStyle, "품목코드", product.getItemCode(), "브랜드명", product.getBrand() != null ? product.getBrand().getName() : "-", "유통채널", channelNames, "버전", "v" + (spec.getVersion() != null ? spec.getVersion() : 1));
            addRow(sheet0, 5, labelStyle, dataStyle, "제품명(국문)", productNameWithSpecs, "제품명(영문)", englishProductNameWithSpecs, "제조사", product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-", "제품구분", product.getProductType() != null ? product.getProductType().toString() : "-");
            addRow(sheet0, 6, labelStyle, dataStyle, "사용기한", (product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "-"), "개봉후기한", (product.getOpenedShelfLifeMonths() != null ? "개봉 후 " + product.getOpenedShelfLifeMonths() + "개월" : "-"), "바코드", (spec.getBarcode() != null ? spec.getBarcode() : "-"), "랩 넘버", (spec.getLabNumber() != null ? spec.getLabNumber() : "-"));
            addRow(sheet0, 7, labelStyle, dataStyle, "기획 담당", (spec.getPlannerName() != null ? spec.getPlannerName() : "-"), "디자인 담당", (spec.getDesignerName() != null ? spec.getDesignerName() : "-"), "품질관리 담당", (spec.getQcName() != null ? spec.getQcName() : "-"), "바코드 담당자", (spec.getBarcodeManager() != null ? spec.getBarcodeManager() : "-"));

            // [2. 개정 내역 테이블] (Row 9~)
            createSectionHeader(sheet0, 9, "2. 개정 이력 (Revision History)", headerStyle, 7);
            Row revHeader = sheet0.createRow(10);
            revHeader.setHeightInPoints(22);
            createCell(revHeader, 0, "No.", subHeaderStyle);
            createCell(revHeader, 1, "개정 내용", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 1, 4));
            createCell(revHeader, 5, "개정일", subHeaderStyle);
            createCell(revHeader, 6, "개정자", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 6, 7));

            List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(spec.getId());
            int currentRow = 11;
            if (revisions.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 개정이력이 없습니다.", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                createCell(r, 5, "-", centerDataStyle);
                createCell(r, 6, "-", centerDataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                currentRow++;
            } else {
                for (PackagingSpecRevision rev : revisions) {
                    Row r = sheet0.createRow(currentRow);
                    createCell(r, 0, String.valueOf(rev.getRevisionNo()), centerDataStyle);
                    createCell(r, 1, rev.getContent() != null ? rev.getContent() : "-", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                    createCell(r, 5, rev.getRevisionDate() != null ? rev.getRevisionDate().toString() : "-", centerDataStyle);
                    createCell(r, 6, rev.getRevisionAuthor() != null ? rev.getRevisionAuthor() : "-", centerDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                    currentRow++;
                }
            }

            // [3. 구성품 리스트 BOM]
            currentRow++;
            createSectionHeader(sheet0, currentRow, "3. 제품 구성품 리스트 (BOM Components)", headerStyle, 7);
            currentRow++;
            Row compHeader = sheet0.createRow(currentRow);
            compHeader.setHeightInPoints(22);
            createCell(compHeader, 0, "구성품명", subHeaderStyle);
            createCell(compHeader, 1, "재질 및 세부사양", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
            createCell(compHeader, 3, "규격 및 사이즈", subHeaderStyle);
            createCell(compHeader, 4, "입수량", subHeaderStyle);
            createCell(compHeader, 5, "공급업체", subHeaderStyle);
            createCell(compHeader, 6, "비고", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
            currentRow++;

            List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
            if (components.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 구성품이 없습니다.", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
                createCell(r, 3, "-", centerDataStyle);
                createCell(r, 4, "1", centerDataStyle);
                createCell(r, 5, "-", centerDataStyle);
                createCell(r, 6, "-", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                currentRow++;
            } else {
                for (PackagingSpecComponent comp : components) {
                    Row r = sheet0.createRow(currentRow);
                    createCell(r, 0, comp.getComponentName() != null ? comp.getComponentName() : "-", centerDataStyle);
                    createCell(r, 1, comp.getSpecDetails() != null ? comp.getSpecDetails() : "-", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
                    createCell(r, 3, comp.getSizeDimension() != null ? comp.getSizeDimension() : "-", centerDataStyle);
                    createCell(r, 4, comp.getQuantity() != null ? String.valueOf(comp.getQuantity()) : "1", centerDataStyle);
                    createCell(r, 5, comp.getSupplier() != null ? comp.getSupplier() : "-", centerDataStyle);
                    createCell(r, 6, comp.getRemarks() != null ? comp.getRemarks() : "-", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                    currentRow++;
                }
            }

            // [4. 아웃박스 & 착인 기준 및 포장방법 서술]
            currentRow++;
            createSectionHeader(sheet0, currentRow, "4. 아웃박스 & 착인 기준 및 포장방법", headerStyle, 7);
            currentRow++;
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "제품 착인 - 표기방법", spec.getMarkingMethod() != null ? spec.getMarkingMethod() : "-", "제품 착인 - 표기기준", spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "-", "포장방법 타입", "서술형 지침", "-", "-");

            Row methodRow = sheet0.createRow(currentRow);
            methodRow.setHeightInPoints(80);
            createCell(methodRow, 0, "포장방법 (서술)", labelStyle);
            createCell(methodRow, 1, spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "등록된 포장방법 설명이 없습니다.", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));
            currentRow++;

            // [5. 적재 사양 및 중량/높이 검증]
            currentRow++;
            createSectionHeader(sheet0, currentRow, "5. 체적/적재 사양 및 검증 기준 (Volume & Loading Spec)", headerStyle, 7);
            currentRow++;
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "인박스 구분", spec.getInboxType() != null ? spec.getInboxType() : "인박스", "인박스 입수량", spec.getInboxQty() != null ? spec.getInboxQty() + " ea" : "-", "인박스 규격", spec.getInboxSize() != null ? spec.getInboxSize() : "-", "인박스 재질", spec.getInboxMaterial() != null ? spec.getInboxMaterial() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "아웃박스 구분", spec.getOutboxType() != null ? spec.getOutboxType() : "아웃박스", "아웃박스 입수량", spec.getOutboxQty() != null ? spec.getOutboxQty() + " ea" : "-", "아웃박스 규격", spec.getOutboxSize() != null ? spec.getOutboxSize() : "-", "아웃박스 재질", spec.getOutboxMaterial() != null ? spec.getOutboxMaterial() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "팔레트 종류", spec.getPalletTypeStr() != null ? spec.getPalletTypeStr() : "-", "적재 방법", spec.getPalletStackingMethod() != null ? spec.getPalletStackingMethod() : "-", "팔레트 규격", spec.getPalletSize() != null ? spec.getPalletSize() : "-", "높이 제한", spec.getPalletHeightLimit() != null ? spec.getPalletHeightLimit() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "1아웃박스 중량 [제한12kg]", (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "-"), "1팔레트 중량 [제한630kg]", (spec.getOnePalletWeight() != null ? spec.getOnePalletWeight() + " kg" : "-"), "1팔레트 높이 [제한1500mm]", (spec.getOnePalletHeight() != null ? spec.getOnePalletHeight() + " mm" : "-"), "검증 상태", "정상 규격");

            // [6. 특이사항 및 주의사항]
            currentRow++;
            createSectionHeader(sheet0, currentRow, "6. 사양서 특이사항 (Remarks)", headerStyle, 7);
            currentRow++;
            Row remRow = sheet0.createRow(currentRow);
            remRow.setHeightInPoints(80);
            createCell(remRow, 0, "특이사항", labelStyle);
            createCell(remRow, 1, spec.getRemarks() != null ? spec.getRemarks() : "등록된 특이사항이 없습니다.", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));

            // 열 너비 자동 조정
            sheet0.setColumnWidth(0, 5000);
            sheet0.setColumnWidth(1, 8000);
            sheet0.setColumnWidth(2, 5000);
            sheet0.setColumnWidth(3, 8000);
            sheet0.setColumnWidth(4, 5000);
            sheet0.setColumnWidth(5, 8000);
            sheet0.setColumnWidth(6, 5000);
            sheet0.setColumnWidth(7, 8000);

            // --- Sheet 1: 현품표_아웃박스 ---
            Sheet sheet1 = workbook.createSheet("현품표_아웃박스");
            createSectionHeader(sheet1, 0, "[ 아 웃 박 스 현 품 표 ]", headerStyle, 3);
            addRow(sheet1, 1, labelStyle, dataStyle, "품목코드", product.getItemCode(), "입수량", (spec.getOutboxQty() != null ? spec.getOutboxQty() + " EA" : "-"));
            addRow(sheet1, 2, labelStyle, dataStyle, "제품명", productNameWithSpecs, "박스 중량", (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "-"));
            addRow(sheet1, 3, labelStyle, dataStyle, "영문명", englishProductNameWithSpecs, "박스 규격", (spec.getOutboxSize() != null ? spec.getOutboxSize() : "-"));
            addRow(sheet1, 4, labelStyle, dataStyle, "제조사", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "바코드", (spec.getBarcode() != null ? spec.getBarcode() : "-"));
            sheet1.setColumnWidth(0, 4000); sheet1.setColumnWidth(1, 10000); sheet1.setColumnWidth(2, 4000); sheet1.setColumnWidth(3, 10000);

            // --- Sheet 2: 현품표_팔레트 ---
            Sheet sheet2 = workbook.createSheet("현품표_팔레트");
            createSectionHeader(sheet2, 0, "[ 팔 레 트 현 품 표 ]", headerStyle, 3);
            addRow(sheet2, 1, labelStyle, dataStyle, "품목코드", product.getItemCode(), "적재수량", (product.getPalletInfo() != null && product.getPalletInfo().getPalletQuantity() != null ? product.getPalletInfo().getPalletQuantity() + " EA" : "-"));
            addRow(sheet2, 2, labelStyle, dataStyle, "제품명", productNameWithSpecs, "팔레트중량", (spec.getOnePalletWeight() != null ? spec.getOnePalletWeight() + " kg" : "-"));
            addRow(sheet2, 3, labelStyle, dataStyle, "제조사", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "팔레트높이", (spec.getOnePalletHeight() != null ? spec.getOnePalletHeight() + " mm" : "-"));
            sheet2.setColumnWidth(0, 4000); sheet2.setColumnWidth(1, 10000); sheet2.setColumnWidth(2, 4000); sheet2.setColumnWidth(3, 10000);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, org.apache.poi.ss.usermodel.CellStyle style, int maxCol) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(24);
        createCell(row, 0, title, style);
        for (int i = 1; i <= maxCol; i++) {
            createCell(row, i, "", style);
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx, rowIdx, 0, maxCol));
    }

    private void addRow(Sheet sheet, int rowIdx, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, String l1, String v1, String l2, String v2, String l3, String v3, String l4, String v4) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(20);
        createCell(row, 0, l1, labelStyle);
        createCell(row, 1, v1, dataStyle);
        createCell(row, 2, l2, labelStyle);
        createCell(row, 3, v2, dataStyle);
        createCell(row, 4, l3, labelStyle);
        createCell(row, 5, v3, dataStyle);
        createCell(row, 6, l4, labelStyle);
        createCell(row, 7, v4, dataStyle);
    }

    private void addRow(Sheet sheet, int rowIdx, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, String l1, String v1, String l2, String v2) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(20);
        createCell(row, 0, l1, labelStyle);
        createCell(row, 1, v1, dataStyle);
        createCell(row, 2, l2, labelStyle);
        createCell(row, 3, v2, dataStyle);
    }

    private void createCell(Row row, int colIdx, String value, org.apache.poi.ss.usermodel.CellStyle style) {
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(colIdx);
        cell.setCellValue(value != null ? value : "");
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private void setBorders(org.apache.poi.ss.usermodel.CellStyle style) {
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setTopBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
    }

    private void setCellValue(Sheet sheet, int rowIndex, int colIndex, String value) {
        Row row = sheet.getRow(rowIndex);
        if (row == null) {
            row = sheet.createRow(rowIndex);
        }
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(colIndex);
        if (cell == null) {
            cell = row.createCell(colIndex);
        }
        cell.setCellValue(value);
    }

    private Integer parseIntSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private Double parseDoubleSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Double.parseDouble(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    /**
     * Generates a simple PDF export for the given product's packaging specs.
     * @param productId Product ID
     * @return byte array containing the PDF file bytes
     * @throws Exception if an error occurs during generation
     */
    public byte[] generatePdf(Long productId) throws Exception {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        specs.sort((a,b) -> {
            int vA = a.getVersion() == null ? 0 : a.getVersion();
            int vB = b.getVersion() == null ? 0 : b.getVersion();
            return Integer.compare(vA, vB); // ascending for PDF history log
        });

        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // Font configuration
        BaseFont baseFont;
        try {
            baseFont = BaseFont.createFont("c:/windows/fonts/malgun.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception e) {
            baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        }

        Font titleFont = new Font(baseFont, 18, Font.BOLD);
        Font sectionFont = new Font(baseFont, 12, Font.BOLD);
        Font normalFont = new Font(baseFont, 9, Font.NORMAL);

        // 제품 특징 반영
        String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
        String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
        String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
        String englishProductNameWithSpecs = (product.getEnglishProductName() != null ? product.getEnglishProductName() : "") + capacityInfo;

        document.add(new Paragraph("포장사양서 (Packaging Specification Report)", titleFont));
        document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

        // 1. 기본 정보 (Product Details)
        document.add(new Paragraph("[기본 정보 / Product Info]", sectionFont));
        document.add(new Paragraph("브랜드명 (Brand): " + (product.getBrand() != null ? product.getBrand().getName() : "-"), normalFont));
        document.add(new Paragraph("품명(국문) (Product Name): " + productNameWithSpecs, normalFont));
        document.add(new Paragraph("품명(영문) (English Name): " + englishProductNameWithSpecs, normalFont));
        document.add(new Paragraph("품목코드 (Item Code): " + product.getItemCode(), normalFont));
        document.add(new Paragraph("제조사 (Manufacturer): " + (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), normalFont));
        document.add(new Paragraph("사용기한 (Shelf Life): " + (product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "-"), normalFont));
        if (product.getOpenedShelfLifeMonths() != null) {
            document.add(new Paragraph("개봉 후 사용기한 (After Opening): 개봉 후 " + product.getOpenedShelfLifeMonths() + "개월", normalFont));
        }
        document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

        if (!specs.isEmpty()) {
            PackagingSpecification spec = specs.get(0); // Use latest or first spec

            // 2. 포장 사양서 상세 정보
            document.add(new Paragraph("[포장사양 상세 / Packaging Spec Details]", sectionFont));
            document.add(new Paragraph("버전 (Version): v" + (spec.getVersion() != null ? spec.getVersion() : 1) + 
                (spec.getRevisionNotes() != null ? " (" + spec.getRevisionNotes() + ")" : ""), normalFont));
            document.add(new Paragraph("바코드 (Barcode): " + (spec.getBarcode() != null ? spec.getBarcode() : "-"), normalFont));
            document.add(new Paragraph("랩 넘버 (Lab Number): " + (spec.getLabNumber() != null ? spec.getLabNumber() : "-"), normalFont));
            document.add(new Paragraph("기획 담당: " + (spec.getPlannerName() != null ? spec.getPlannerName() : "-") + 
                " | 디자인 담당: " + (spec.getDesignerName() != null ? spec.getDesignerName() : "-") + 
                " | 품질관리 담당: " + (spec.getQcName() != null ? spec.getQcName() : "-"), normalFont));
            document.add(new Paragraph("바코드 담당자: " + (spec.getBarcodeManager() != null ? spec.getBarcodeManager() : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 3. 구성품 리스트 (BOM)
            document.add(new Paragraph("[구성품 리스트 / Components BOM]", sectionFont));
            List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
            if (components.isEmpty()) {
                document.add(new Paragraph("등록된 구성품이 없습니다.", normalFont));
            } else {
                for (int i = 0; i < components.size(); i++) {
                    PackagingSpecComponent comp = components.get(i);
                    document.add(new Paragraph(String.format(" - %s (%s) | 규격: %s | 수량: %s | 업체: %s | 비고: %s",
                        comp.getComponentName(),
                        comp.getSpecDetails() != null ? comp.getSpecDetails() : "-",
                        comp.getSizeDimension() != null ? comp.getSizeDimension() : "-",
                        comp.getQuantity() != null ? String.valueOf(comp.getQuantity()) : "1",
                        comp.getSupplier() != null ? comp.getSupplier() : "-",
                        comp.getRemarks() != null ? comp.getRemarks() : "-"
                    ), normalFont));
                }
            }
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 4. 포장방법 사진 및 3줄 캡션 상세 (PDF 내 직접 포함)
            document.add(new Paragraph("[포장방법 사진 및 캡션 / Packaging Method Images]", sectionFont));
            List<com.example.ims.entity.PackagingMethodImage> methodImages = methodImageRepository.findActiveBySpecId(spec.getId());
            if (methodImages == null || methodImages.isEmpty()) {
                document.add(new Paragraph("등록된 포장방법 사진이 없습니다.", normalFont));
            } else {
                for (int i = 0; i < methodImages.size(); i++) {
                    com.example.ims.entity.PackagingMethodImage imgEntity = methodImages.get(i);
                    document.add(new Paragraph(String.format("NO %d. %s", (i + 1), 
                        imgEntity.getCaptionText() != null ? imgEntity.getCaptionText() : ""), normalFont));
                    
                    if (imgEntity.getImageUrl() != null && !imgEntity.getImageUrl().isEmpty()) {
                        try {
                            String localPath = imgEntity.getImageUrl().replace("/uploads/", "uploads/");
                            java.io.File imgFile = new java.io.File(localPath);
                            if (imgFile.exists()) {
                                com.itextpdf.text.Image pdfImg = com.itextpdf.text.Image.getInstance(imgFile.getAbsolutePath());
                                pdfImg.scaleToFit(400f, 250f);
                                pdfImg.setAlignment(com.itextpdf.text.Element.ALIGN_LEFT);
                                pdfImg.setSpacingAfter(10f);
                                document.add(pdfImg);
                            }
                        } catch (Exception e) {
                            // Image rendering error logging
                        }
                    }
                }
            }
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 5. 아웃박스 & 착인 기준 및 포장방법 (서술)
            document.add(new Paragraph("[아웃박스 및 착인기준 / Marking & Packaging Method]", sectionFont));
            document.add(new Paragraph("표기 방법: " + (spec.getMarkingMethod() != null ? spec.getMarkingMethod() : "-"), normalFont));
            document.add(new Paragraph("표기 기준: " + (spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "-"), normalFont));
            document.add(new Paragraph("포장방법 (서술):\n" + (spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 5. 적재사항 및 검증 (Loading Specifications & Verification)
            document.add(new Paragraph("[적재 사양 및 검증 / Loading Specs & Verification]", sectionFont));
            document.add(new Paragraph("인박스 구분: " + (spec.getInboxType() != null ? spec.getInboxType() : "-") + 
                " | 입수량: " + (spec.getInboxQty() != null ? spec.getInboxQty() + " ea" : "-") + 
                " | 사이즈: " + (spec.getInboxSize() != null ? spec.getInboxSize() : "-") +
                " | 재질: " + (spec.getInboxMaterial() != null ? spec.getInboxMaterial() : "-"), normalFont));

            document.add(new Paragraph("아웃박스 구분: " + (spec.getOutboxType() != null ? spec.getOutboxType() : "-") + 
                " | 입수량: " + (spec.getOutboxQty() != null ? spec.getOutboxQty() + " ea" : "-") + 
                " | 사이즈: " + (spec.getOutboxSize() != null ? spec.getOutboxSize() : "-") +
                " | 재질: " + (spec.getOutboxMaterial() != null ? spec.getOutboxMaterial() : "-"), normalFont));

            document.add(new Paragraph("팔레트 종류: " + (spec.getPalletTypeStr() != null ? spec.getPalletTypeStr() : "-") + 
                " | 적재방법: " + (spec.getPalletStackingMethod() != null ? spec.getPalletStackingMethod() : "-") + 
                " | 사이즈: " + (spec.getPalletSize() != null ? spec.getPalletSize() : "-"), normalFont));

            document.add(new Paragraph("1 아웃박스 중량: " + (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "-") + 
                " | 1 팔레트 중량: " + (spec.getOnePalletWeight() != null ? spec.getOnePalletWeight() + " kg" : "-") + 
                " | 1 팔레트 높이: " + (spec.getOnePalletHeight() != null ? spec.getOnePalletHeight() + " mm" : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 6. 특이사항
            document.add(new Paragraph("[특이사항 / Remarks]", sectionFont));
            document.add(new Paragraph(spec.getRemarks() != null ? spec.getRemarks() : "-", normalFont));
        } else {
            document.add(new Paragraph("등록된 포장 사양서 내용이 없습니다.", normalFont));
        }

        document.close();
        return out.toByteArray();
    }
}
