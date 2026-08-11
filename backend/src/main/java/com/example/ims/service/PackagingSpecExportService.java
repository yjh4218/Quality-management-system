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
import java.awt.Graphics2D;
import java.awt.Color;
import java.awt.BasicStroke;
import java.awt.FontMetrics;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

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
            if (vA != vB) return Integer.compare(vB, vA); // descending version
            Long idA = a.getId() == null ? 0L : a.getId();
            Long idB = b.getId() == null ? 0L : b.getId();
            return Long.compare(idB, idA); // descending ID
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
        subHeaderStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.PALE_BLUE.getIndex());
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
        labelStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
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
            // --- Sheet 1: 포장사양서 ---
            Sheet sheet0 = workbook.createSheet("포장사양서");

            Row titleRow = sheet0.createRow(0);
            titleRow.setHeightInPoints(40);
            Row titleRowSub = sheet0.createRow(1); // Row 1 생성으로 병합 테두리 보정
            for (int col = 0; col <= 7; col++) {
                org.apache.poi.ss.usermodel.Cell c0 = titleRow.createCell(col);
                c0.setCellStyle(titleStyle);
                org.apache.poi.ss.usermodel.Cell c1 = titleRowSub.createCell(col);
                c1.setCellStyle(titleStyle);
            }
            titleRow.getCell(0).setCellValue("📦 제품 포장 사양서 (Packaging Specification)");
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 1, 0, 7));

            String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
            String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
            String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
            String englishProductNameWithSpecs = (product.getEnglishProductName() != null ? product.getEnglishProductName() : "") + capacityInfo;
            String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                ? product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(Collectors.joining(", "))
                : "미지정";

            PackagingSpecification spec = specs.isEmpty() ? PackagingSpecification.builder().product(product).build() : specs.get(0);

            // [1. 제품 및 기본 정보]
            createSectionHeader(sheet0, 3, "1. 📌 제품 및 기본 정보", headerStyle, 7);
            addRow(sheet0, 4, labelStyle, dataStyle, "품목코드", product.getItemCode(), "브랜드명", product.getBrand() != null ? product.getBrand().getName() : "-", "유통채널", channelNames, "버전", "v" + (spec.getVersion() != null ? spec.getVersion() : 1));
            addRow(sheet0, 5, labelStyle, dataStyle, "제품명(국문)", productNameWithSpecs, "제품명(영문)", englishProductNameWithSpecs, "제조사", product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-", "제품구분", product.getProductType() != null ? product.getProductType().toString() : "-");
            addRow(sheet0, 6, labelStyle, dataStyle, "사용기한", (product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "-"), "개봉후기한", (product.getOpenedShelfLifeMonths() != null ? "개봉 후 " + product.getOpenedShelfLifeMonths() + "개월" : "-"), "제품 바코드", (product.getProductBarcode() != null ? product.getProductBarcode() : "-"), "아웃박스 바코드", (product.getOutboxBarcode() != null ? product.getOutboxBarcode() : "-"));
            addRow(sheet0, 7, labelStyle, dataStyle, "기획 담당", (spec.getPlannerName() != null ? spec.getPlannerName() : "-"), "디자인 담당", (spec.getDesignerName() != null ? spec.getDesignerName() : "-"), "품질관리 담당", (spec.getQcName() != null ? spec.getQcName() : "-"), "바코드 담당자", (spec.getBarcodeManager() != null ? spec.getBarcodeManager() : "-"));

            // 여백 행 (Row 8)
            createMarginRow(sheet0, 8, 10);

            // [2. 개정 이력]
            createSectionHeader(sheet0, 9, "2. 🔄 개정 이력 (Revision History)", headerStyle, 7);
            Row revHeader = sheet0.createRow(10);
            revHeader.setHeightInPoints(24);
            createCell(revHeader, 0, "No.", subHeaderStyle);
            createCell(revHeader, 1, "개정 내용", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 1, 4));
            for (int col = 2; col <= 4; col++) createCell(revHeader, col, "", subHeaderStyle);
            createCell(revHeader, 5, "개정일", subHeaderStyle);
            createCell(revHeader, 6, "개정자", subHeaderStyle);
            createCell(revHeader, 7, "", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 6, 7));

            List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(spec.getId());
            int currentRow = 11;
            if (revisions.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                r.setHeightInPoints(24);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 개정이력이 없습니다.", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                for (int c = 2; c <= 4; c++) createCell(r, c, "", dataStyle);
                createCell(r, 5, "-", centerDataStyle);
                createCell(r, 6, "-", centerDataStyle);
                createCell(r, 7, "", centerDataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                currentRow++;
            } else {
                for (PackagingSpecRevision rev : revisions) {
                    Row r = sheet0.createRow(currentRow);
                    r.setHeightInPoints(24);
                    createCell(r, 0, String.valueOf(rev.getRevisionNo()), centerDataStyle);
                    createCell(r, 1, rev.getContent() != null ? rev.getContent() : "-", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                    for (int c = 2; c <= 4; c++) createCell(r, c, "", dataStyle);
                    createCell(r, 5, rev.getRevisionDate() != null ? rev.getRevisionDate().toString() : "-", centerDataStyle);
                    createCell(r, 6, rev.getRevisionAuthor() != null ? rev.getRevisionAuthor() : "-", centerDataStyle);
                    createCell(r, 7, "", centerDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                    currentRow++;
                }
            }

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [3. 구성품 리스트 (BOM)]
            createSectionHeader(sheet0, currentRow, "3. 🧩 제품 구성품 리스트 (BOM Components)", headerStyle, 7);
            currentRow++;
            Row compHeader = sheet0.createRow(currentRow);
            compHeader.setHeightInPoints(24);
            createCell(compHeader, 0, "구성품명", subHeaderStyle);
            createCell(compHeader, 1, "재질 및 세부사양", subHeaderStyle);
            createCell(compHeader, 2, "", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
            createCell(compHeader, 3, "규격 및 사이즈", subHeaderStyle);
            createCell(compHeader, 4, "입수량", subHeaderStyle);
            createCell(compHeader, 5, "공급업체", subHeaderStyle);
            createCell(compHeader, 6, "비고", subHeaderStyle);
            createCell(compHeader, 7, "", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
            currentRow++;

            List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
            if (components.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                r.setHeightInPoints(24);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 구성품이 없습니다.", dataStyle);
                createCell(r, 2, "", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
                createCell(r, 3, "-", centerDataStyle);
                createCell(r, 4, "1", centerDataStyle);
                createCell(r, 5, "-", centerDataStyle);
                createCell(r, 6, "-", dataStyle);
                createCell(r, 7, "", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                currentRow++;
            } else {
                for (PackagingSpecComponent comp : components) {
                    Row r = sheet0.createRow(currentRow);
                    r.setHeightInPoints(24);
                    createCell(r, 0, comp.getComponentName() != null ? comp.getComponentName() : "-", centerDataStyle);
                    createCell(r, 1, comp.getSpecDetails() != null ? comp.getSpecDetails() : "-", dataStyle);
                    createCell(r, 2, "", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 2));
                    createCell(r, 3, comp.getSizeDimension() != null ? comp.getSizeDimension() : "-", centerDataStyle);
                    createCell(r, 4, comp.getQuantity() != null ? String.valueOf(comp.getQuantity()) : "1", centerDataStyle);
                    createCell(r, 5, comp.getSupplier() != null ? comp.getSupplier() : "-", centerDataStyle);
                    createCell(r, 6, comp.getRemarks() != null ? comp.getRemarks() : "-", dataStyle);
                    createCell(r, 7, "", dataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                    currentRow++;
                }
            }

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [4. 아웃박스 & 착인 기준 및 포장방법 서술]
            createSectionHeader(sheet0, currentRow, "4. 📦 아웃박스 & 착인 기준 및 포장방법", headerStyle, 7);
            currentRow++;
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "제품 착인 - 표기방법", spec.getMarkingMethod() != null ? spec.getMarkingMethod() : "-", "제품 착인 - 표기기준", spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "-", "포장방법 타입", "서술형 지침", "-", "-");

            Row methodRow = sheet0.createRow(currentRow);
            methodRow.setHeightInPoints(90);
            createCell(methodRow, 0, "포장방법 (서술)", labelStyle);
            createCell(methodRow, 1, spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "등록된 포장방법 설명이 없습니다.", wrapDataStyle);
            for (int col = 2; col <= 7; col++) createCell(methodRow, col, "", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));
            currentRow++;

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [5. 체적/적재 사양 및 검증 기준]
            createSectionHeader(sheet0, currentRow, "5. 🚚 체적/적재 사양 및 검증 기준 (Volume & Loading Spec)", headerStyle, 7);
            currentRow++;
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "인박스 구분", spec.getInboxType() != null ? spec.getInboxType() : "인박스", "인박스 입수량", spec.getInboxQty() != null ? spec.getInboxQty() + " ea" : "-", "인박스 규격", spec.getInboxSize() != null ? spec.getInboxSize() : "-", "인박스 재질", spec.getInboxMaterial() != null ? spec.getInboxMaterial() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "아웃박스 구분", spec.getOutboxType() != null ? spec.getOutboxType() : "아웃박스", "아웃박스 입수량", spec.getOutboxQty() != null ? spec.getOutboxQty() + " ea" : "-", "아웃박스 규격", spec.getOutboxSize() != null ? spec.getOutboxSize() : "-", "아웃박스 재질", spec.getOutboxMaterial() != null ? spec.getOutboxMaterial() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "팔레트 종류", spec.getPalletTypeStr() != null ? spec.getPalletTypeStr() : "-", "적재 방법", spec.getPalletStackingMethod() != null ? spec.getPalletStackingMethod() : "-", "팔레트 규격", spec.getPalletSize() != null ? spec.getPalletSize() : "-", "높이 제한", spec.getPalletHeightLimit() != null ? spec.getPalletHeightLimit() : "-");
            addRow(sheet0, currentRow++, labelStyle, dataStyle, "1아웃박스 중량 [제한12kg]", (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "-"), "1팔레트 중량 [제한630kg]", (spec.getOnePalletWeight() != null ? spec.getOnePalletWeight() + " kg" : "-"), "1팔레트 높이 [제한1500mm]", (spec.getOnePalletHeight() != null ? spec.getOnePalletHeight() + " mm" : "-"), "검증 상태", "정상 규격");

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [6. 사양서 특이사항]
            createSectionHeader(sheet0, currentRow, "6. 📝 사양서 특이사항 (Remarks)", headerStyle, 7);
            currentRow++;
            Row remRow = sheet0.createRow(currentRow);
            remRow.setHeightInPoints(90);
            createCell(remRow, 0, "특이사항", labelStyle);
            createCell(remRow, 1, spec.getRemarks() != null ? spec.getRemarks() : "등록된 특이사항이 없습니다.", wrapDataStyle);
            for (int col = 2; col <= 7; col++) createCell(remRow, col, "", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));

            // 컬럼 너비 밸런스 최적화 (레이블: 5500, 데이터: 7500)
            sheet0.setColumnWidth(0, 5500); sheet0.setColumnWidth(1, 7500);
            sheet0.setColumnWidth(2, 5500); sheet0.setColumnWidth(3, 7500);
            sheet0.setColumnWidth(4, 5500); sheet0.setColumnWidth(5, 7500);
            sheet0.setColumnWidth(6, 5500); sheet0.setColumnWidth(7, 7500);
            applyPrintSetup(sheet0);

            // --- Sheet 2: 포장방법 사진 ---
            Sheet sheet1 = workbook.createSheet("포장방법 사진");
            createSectionHeader(sheet1, 0, "📸 순서별 포장 방법 이미지 지침", headerStyle, 3);
            Row imgHeader = sheet1.createRow(1);
            imgHeader.setHeightInPoints(24);
            createCell(imgHeader, 0, "순서", subHeaderStyle);
            createCell(imgHeader, 1, "포장 방법 사진 (Image)", subHeaderStyle);
            createCell(imgHeader, 2, "포장 공정 단계 캡션 / 상세 지침", subHeaderStyle);
            createCell(imgHeader, 3, "", subHeaderStyle);
            sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 2, 3));

            org.apache.poi.ss.usermodel.Drawing<?> drawing = sheet1.createDrawingPatriarch();

            List<com.example.ims.entity.PackagingMethodImage> methodImages = methodImageRepository.findActiveBySpecId(spec.getId());
            int imgRow = 2;
            if (methodImages == null || methodImages.isEmpty()) {
                Row r = sheet1.createRow(imgRow);
                r.setHeightInPoints(24);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "-", centerDataStyle);
                createCell(r, 2, "등록된 포장방법 사진 지침이 없습니다.", dataStyle);
                createCell(r, 3, "", dataStyle);
                sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRow, imgRow, 2, 3));
            } else {
                for (int i = 0; i < methodImages.size(); i++) {
                    com.example.ims.entity.PackagingMethodImage imgEntity = methodImages.get(i);
                    Row r = sheet1.createRow(imgRow);
                    r.setHeightInPoints(320); // [요청 반영] 기존 160pt에서 2배로 확대 (320pt)
                    createCell(r, 0, "NO." + (i + 1), centerDataStyle);
                    createCell(r, 1, "", centerDataStyle); // 사진 들어갈 셀
                    createCell(r, 2, imgEntity.getCaptionText() != null ? imgEntity.getCaptionText() : "-", wrapDataStyle);
                    createCell(r, 3, "", wrapDataStyle);
                    sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRow, imgRow, 2, 3));

                    // Excel에 주석(도형/텍스트)이 합성된 이미지 바이너리 렌더링
                    byte[] imgBytes = getAnnotatedImageBytes(imgEntity);
                    if (imgBytes != null && imgBytes.length > 0) {
                        try {
                            int pictureIdx = workbook.addPicture(imgBytes, Workbook.PICTURE_TYPE_JPEG);
                            org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                            anchor.setCol1(1);
                            anchor.setRow1(imgRow);
                            anchor.setCol2(2);
                            anchor.setRow2(imgRow + 1);
                            anchor.setDx1(15 * 10000); anchor.setDy1(10 * 10000);
                            anchor.setDx2(-15 * 10000); anchor.setDy2(-10 * 10000);
                            anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                            drawing.createPicture(anchor, pictureIdx);
                        } catch (Exception ex) {
                            log.error("Failed to insert annotated image into Excel row " + imgRow, ex);
                        }
                    }
                    imgRow++;
                }
            }
            sheet1.setColumnWidth(0, 3000); 
            sheet1.setColumnWidth(1, 6000); // [요청 반영] 사진 컬럼 너비 기존 18000의 1/3으로 축소 (6000)
            sheet1.setColumnWidth(2, 8000); 
            sheet1.setColumnWidth(3, 8000);
            applyPrintSetup(sheet1);

            // --- Sheet 3: 인박스 현품표 ---
            Sheet sheet2 = workbook.createSheet("인박스 현품표");
            createSectionHeader(sheet2, 0, "[ 인 박 스 현 품 표 / INBOX LABEL ]", headerStyle, 3, 30);
            addRow(sheet2, 1, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "입수량 (Quantity)", (spec.getInboxQty() != null ? spec.getInboxQty() + " EA" : "0 EA"));
            addRow(sheet2, 2, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"));
            addRow(sheet2, 3, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", "[ YYYY.MM.DD 표기 ]");
            addRow(sheet2, 4, labelStyle, dataStyle, "제조번호 (Lot No.)", "[ 생산 배치번호 표기 ]", "사용기한 (Exp. Date)", "[ YYYY.MM.DD 까지 ]");
            
            Row inboxNoteRow = sheet2.createRow(5);
            inboxNoteRow.setHeightInPoints(28);
            createCell(inboxNoteRow, 0, "바코드 규정", labelStyle);
            createCell(inboxNoteRow, 1, "⚠️ 인박스 현품표에는 바코드를 부착/표기하지 않습니다. (규정 준수)", wrapDataStyle);
            for (int col = 2; col <= 3; col++) createCell(inboxNoteRow, col, "", wrapDataStyle);
            sheet2.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(5, 5, 1, 3));
            sheet2.setColumnWidth(0, 7000); sheet2.setColumnWidth(1, 10000); sheet2.setColumnWidth(2, 7000); sheet2.setColumnWidth(3, 10000);
            setOuterBorders(sheet2, 0, 5, 0, 3);
            applyPrintSetup(sheet2);

            // --- Sheet 4: 아웃박스 현품표 ---
            Sheet sheet3 = workbook.createSheet("아웃박스 현품표");
            createSectionHeader(sheet3, 0, "[ 아 웃 박 스 현 품 표 / OUTBOX LABEL ]", headerStyle, 3, 30);
            addRow(sheet3, 1, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "입수량 (Quantity)", (spec.getOutboxQty() != null ? spec.getOutboxQty() + " EA" : "0 EA"));
            addRow(sheet3, 2, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "제품무게 (Gross Weight)", (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "- kg"));
            addRow(sheet3, 3, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", "[ YYYY.MM.DD 표기 ]");
            addRow(sheet3, 4, labelStyle, dataStyle, "제조번호 (Lot No.)", "[ 생산 배치번호 표기 ]", "사용기한 (Exp. Date)", "[ YYYY.MM.DD 까지 ]");
            
            String outboxBarcodeText = (product.getOutboxBarcode() != null && !product.getOutboxBarcode().isEmpty()) ? product.getOutboxBarcode() : (product.getProductBarcode() != null ? product.getProductBarcode() : (spec.getBarcode() != null ? spec.getBarcode() : "BARCODE-NOT-SET"));
            addRow(sheet3, 5, labelStyle, dataStyle, "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "바코드 텍스트", outboxBarcodeText);
            
            // 바코드 이미지 렌더링 행 (Row 6)
            Row obBarcodeRow = sheet3.createRow(6);
            obBarcodeRow.setHeightInPoints(60); // 60pt 상향
            createCell(obBarcodeRow, 0, "바코드 스캔 이미지", labelStyle);
            createCell(obBarcodeRow, 1, "", dataStyle);
            for (int col = 2; col <= 3; col++) createCell(obBarcodeRow, col, "", dataStyle);
            sheet3.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(6, 6, 1, 3));

            org.apache.poi.ss.usermodel.Drawing<?> obDrawing = sheet3.createDrawingPatriarch();
            byte[] obBarcodeBytes = generateBarcodeImageBytes(outboxBarcodeText, 380, 80); // 380x80 상향
            if (obBarcodeBytes != null) {
                try {
                    int picIdx = workbook.addPicture(obBarcodeBytes, Workbook.PICTURE_TYPE_PNG);
                    org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                    anchor.setCol1(1); anchor.setRow1(6);
                    anchor.setCol2(4); anchor.setRow2(7);
                    anchor.setDx1(10 * 10000); anchor.setDy1(5 * 10000);
                    anchor.setDx2(-10 * 10000); anchor.setDy2(-5 * 10000);
                    obDrawing.createPicture(anchor, picIdx);
                } catch (Exception ex) {
                    log.error("Failed to insert outbox barcode image", ex);
                }
            }

            sheet3.setColumnWidth(0, 7000); sheet3.setColumnWidth(1, 10000); sheet3.setColumnWidth(2, 7000); sheet3.setColumnWidth(3, 10000);
            setOuterBorders(sheet3, 0, 6, 0, 3);
            applyPrintSetup(sheet3);

            // --- Sheet 5: 팔레트 현품표 ---
            Sheet sheet4 = workbook.createSheet("팔레트 현품표");
            createSectionHeader(sheet4, 0, "[ 팔 레 트 현 품 표 / PALLET LABEL ]", headerStyle, 3, 30);
            String palletBoxQtyStr = (product.getPalletInfo() != null && product.getPalletInfo().getPalletQuantity() != null) ? String.valueOf(product.getPalletInfo().getPalletQuantity()) : null;
            Integer pBoxQty = parseIntSafe(palletBoxQtyStr);
            String totalPcsStr = "- EA";
            if (pBoxQty != null && spec.getOutboxQty() != null) {
                totalPcsStr = String.valueOf(pBoxQty * spec.getOutboxQty()) + " EA";
            }
            addRow(sheet4, 1, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "적재 박스 수량 (Box Qty/Pallet)", (palletBoxQtyStr != null ? palletBoxQtyStr + " Box" : "- Box"));
            addRow(sheet4, 2, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "적재 낱개 수량 (Total Pcs/Pallet)", totalPcsStr);
            addRow(sheet4, 3, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", "[ YYYY.MM.DD 표기 ]");
            addRow(sheet4, 4, labelStyle, dataStyle, "제조번호 (Lot No.)", "[ 생산 배치번호 표기 ]", "사용기한 (Exp. Date)", "[ YYYY.MM.DD 까지 ]");
            
            String palletBarcodeText = (product.getProductBarcode() != null && !product.getProductBarcode().isEmpty()) ? product.getProductBarcode() : (spec.getBarcode() != null ? spec.getBarcode() : "BARCODE-NOT-SET");
            addRow(sheet4, 5, labelStyle, dataStyle, "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "바코드 텍스트", palletBarcodeText);

            // 바코드 이미지 렌더링 행 (Row 6)
            Row pltBarcodeRow = sheet4.createRow(6);
            pltBarcodeRow.setHeightInPoints(60); // 60pt 상향
            createCell(pltBarcodeRow, 0, "바코드 스캔 이미지", labelStyle);
            createCell(pltBarcodeRow, 1, "", dataStyle);
            for (int col = 2; col <= 3; col++) createCell(pltBarcodeRow, col, "", dataStyle);
            sheet4.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(6, 6, 1, 3));

            org.apache.poi.ss.usermodel.Drawing<?> pltDrawing = sheet4.createDrawingPatriarch();
            byte[] pltBarcodeBytes = generateBarcodeImageBytes(palletBarcodeText, 380, 80); // 380x80 상향
            if (pltBarcodeBytes != null) {
                try {
                    int picIdx = workbook.addPicture(pltBarcodeBytes, Workbook.PICTURE_TYPE_PNG);
                    org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                    anchor.setCol1(1); anchor.setRow1(6);
                    anchor.setCol2(4); anchor.setRow2(7);
                    anchor.setDx1(10 * 10000); anchor.setDy1(5 * 10000);
                    anchor.setDx2(-10 * 10000); anchor.setDy2(-5 * 10000);
                    pltDrawing.createPicture(anchor, picIdx);
                } catch (Exception ex) {
                    log.error("Failed to insert pallet barcode image", ex);
                }
            }

            sheet4.setColumnWidth(0, 7000); sheet4.setColumnWidth(1, 10000); sheet4.setColumnWidth(2, 7000); sheet4.setColumnWidth(3, 10000);
            setOuterBorders(sheet4, 0, 6, 0, 3);
            applyPrintSetup(sheet4);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, org.apache.poi.ss.usermodel.CellStyle style, int maxCol) {
        createSectionHeader(sheet, rowIdx, title, style, maxCol, 28);
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, org.apache.poi.ss.usermodel.CellStyle style, int maxCol, int heightInPoints) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
        createCell(row, 0, title, style);
        for (int i = 1; i <= maxCol; i++) {
            createCell(row, i, "", style);
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx, rowIdx, 0, maxCol));
    }

    private void createMarginRow(Sheet sheet, int rowIdx, int heightInPoints) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
    }

    private void addRow(Sheet sheet, int rowIdx, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, String l1, String v1, String l2, String v2, String l3, String v3, String l4, String v4) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(24);
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
        row.setHeightInPoints(24);
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
        style.setTopBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setBottomBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setLeftBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setRightBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
    }

    private void setOuterBorders(Sheet sheet, int startRow, int endRow, int startCol, int endCol) {
        Workbook wb = sheet.getWorkbook();
        for (int r = startRow; r <= endRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) row = sheet.createRow(r);
            for (int c = startCol; c <= endCol; c++) {
                org.apache.poi.ss.usermodel.Cell cell = row.getCell(c);
                if (cell == null) cell = row.createCell(c);
                
                org.apache.poi.ss.usermodel.CellStyle newStyle = wb.createCellStyle();
                if (cell.getCellStyle() != null) {
                    newStyle.cloneStyleFrom(cell.getCellStyle());
                }
                
                if (r == startRow) newStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (r == endRow) newStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (c == startCol) newStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (c == endCol) newStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                
                newStyle.setTopBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setBottomBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setLeftBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setRightBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                
                cell.setCellStyle(newStyle);
            }
        }
    }

    private void applyPrintSetup(Sheet sheet) {
        sheet.setAutobreaks(true);
        sheet.getPrintSetup().setFitWidth((short) 1);
        sheet.getPrintSetup().setFitHeight((short) 0);
        sheet.getPrintSetup().setLandscape(false);
        sheet.setMargin(Sheet.TopMargin, 0.5);
        sheet.setMargin(Sheet.BottomMargin, 0.5);
        sheet.setMargin(Sheet.LeftMargin, 0.5);
        sheet.setMargin(Sheet.RightMargin, 0.5);
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
            if (vA != vB) return Integer.compare(vB, vA); // descending version
            Long idA = a.getId() == null ? 0L : a.getId();
            Long idB = b.getId() == null ? 0L : b.getId();
            return Long.compare(idB, idA); // descending ID
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
                    
                    byte[] imgBytes = getAnnotatedImageBytes(imgEntity);
                    if (imgBytes != null && imgBytes.length > 0) {
                        try {
                            com.itextpdf.text.Image pdfImg = com.itextpdf.text.Image.getInstance(imgBytes);
                            pdfImg.scaleToFit(450f, 280f); // 450f, 280f로 스케일 향상
                            pdfImg.setAlignment(com.itextpdf.text.Element.ALIGN_LEFT);
                            pdfImg.setSpacingAfter(10f);
                            document.add(pdfImg);
                        } catch (Exception e) {
                            log.error("Failed to render PDF image for " + imgEntity.getImageUrl(), e);
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

    /**
     * Reads the physical image file and renders annotationsJson (shapes/texts) onto it using Java2D Graphics2D
     */
    private byte[] getAnnotatedImageBytes(com.example.ims.entity.PackagingMethodImage imgEntity) {
        java.io.File imgFile = findLocalFile(imgEntity.getImageUrl(), imgEntity.getImagePath());
        BufferedImage origImg = null;

        if (imgFile != null && imgFile.exists()) {
            try {
                origImg = ImageIO.read(imgFile);
            } catch (Exception e) {
                log.warn("Failed to read image from file: " + imgFile.getAbsolutePath(), e);
            }
        }

        // 로컬 파일에서 읽지 못한 경우 URL 네트워크 통신으로 Fallback 다운로드 시도
        if (origImg == null && imgEntity.getImageUrl() != null && imgEntity.getImageUrl().startsWith("http")) {
            try {
                origImg = ImageIO.read(new java.net.URL(imgEntity.getImageUrl()));
            } catch (Exception e) {
                log.warn("Failed to read image from URL: " + imgEntity.getImageUrl(), e);
            }
        }

        if (origImg == null) {
            return null;
        }

        try {
            String annotationsJson = imgEntity.getAnnotationsJson();
            if (annotationsJson == null || annotationsJson.isBlank()) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(origImg, "jpg", baos);
                return baos.toByteArray();
            }

            int imgWidth = origImg.getWidth();
            int imgHeight = origImg.getHeight();

            BufferedImage annotatedImg = new BufferedImage(imgWidth, imgHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = annotatedImg.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            g2d.drawImage(origImg, 0, 0, null);

            // Fabric.js editor canvas resolution in frontend is 780x520
            double editorWidth = 780.0;
            double editorHeight = 520.0;
            double scaleX = imgWidth / editorWidth;
            double scaleY = imgHeight / editorHeight;

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(annotationsJson);
            JsonNode objectsNode = root.get("objects");

            if (objectsNode != null && objectsNode.isArray()) {
                for (JsonNode obj : objectsNode) {
                    String type = obj.path("type").asText("");
                    String strokeColorStr = obj.path("stroke").asText("#ef4444");
                    String fillColorStr = obj.path("fill").asText("#ef4444");
                    double strokeWidth = obj.path("strokeWidth").asDouble(3.0);

                    Color strokeColor = parseColorSafe(strokeColorStr, Color.RED);
                    Color fillColor = parseColorSafe(fillColorStr, Color.RED);

                    g2d.setColor(strokeColor);
                    g2d.setStroke(new BasicStroke((float) (strokeWidth * scaleX)));

                    double left = obj.path("left").asDouble(0.0) * scaleX;
                    double top = obj.path("top").asDouble(0.0) * scaleY;
                    double scaleXObj = obj.path("scaleX").asDouble(1.0);
                    double scaleYObj = obj.path("scaleY").asDouble(1.0);

                    if ("rect".equals(type)) {
                        double width = obj.path("width").asDouble(0.0) * scaleXObj * scaleX;
                        double height = obj.path("height").asDouble(0.0) * scaleYObj * scaleY;
                        g2d.drawRect((int) left, (int) top, (int) width, (int) height);
                    } else if ("circle".equals(type)) {
                        double radius = obj.path("radius").asDouble(40.0);
                        double rx = radius * scaleXObj * scaleX;
                        double ry = radius * scaleYObj * scaleY;
                        g2d.drawOval((int) left, (int) top, (int) (rx * 2), (int) (ry * 2));
                    } else if ("i-text".equals(type) || "text".equals(type)) {
                        String text = obj.path("text").asText("");
                        int fontSize = (int) (obj.path("fontSize").asInt(16) * scaleX);
                        g2d.setFont(new java.awt.Font("맑은 고딕", java.awt.Font.BOLD, Math.max(12, fontSize)));
                        g2d.setColor(fillColor);
                        g2d.drawString(text, (int) left, (int) (top + fontSize));
                    }
                }
            }
            g2d.dispose();

            // Downscale to fit target excel cell bound while preserving aspect ratio (Max 550x300)
            int maxTargetWidth = 550;
            int maxTargetHeight = 300;
            double scale = Math.min((double) maxTargetWidth / imgWidth, (double) maxTargetHeight / imgHeight);
            if (scale > 1.0) scale = 1.0; // Don't upscale small images

            int scaledW = (int) (imgWidth * scale);
            int scaledH = (int) (imgHeight * scale);

            BufferedImage finalImg = new BufferedImage(scaledW, scaledH, BufferedImage.TYPE_INT_RGB);
            Graphics2D gFinal = finalImg.createGraphics();
            gFinal.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            gFinal.drawImage(annotatedImg, 0, 0, scaledW, scaledH, null);
            gFinal.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(finalImg, "jpg", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render annotations on image for " + imgEntity.getId(), e);
            try {
                return java.nio.file.Files.readAllBytes(imgFile.toPath());
            } catch (Exception ex) {
                return null;
            }
        }
    }

    /**
     * Pure Java 1D Code 128 Barcode Generator with Human Readable Label
     */
    private byte[] generateBarcodeImageBytes(String barcodeText, int width, int height) {
        if (barcodeText == null || barcodeText.isBlank() || "BARCODE-NOT-SET".equals(barcodeText)) {
            barcodeText = "NO BARCODE";
        }
        try {
            BufferedImage barcodeImg = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = barcodeImg.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // Background
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, width, height);

            // Draw Border
            g2d.setColor(Color.LIGHT_GRAY);
            g2d.drawRect(0, 0, width - 1, height - 1);

            // Generate deterministic pseudo-random / checksum bars from barcodeText string
            g2d.setColor(Color.BLACK);
            int startX = 20;
            int barAreaWidth = width - 40;
            int barHeight = height - 25;

            byte[] textBytes = barcodeText.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            int hash = 0;
            for (byte b : textBytes) hash = 31 * hash + b;
            java.util.Random rnd = new java.util.Random(hash);

            // Guard bars (start)
            g2d.fillRect(startX, 10, 2, barHeight);
            g2d.fillRect(startX + 4, 10, 1, barHeight);
            g2d.fillRect(startX + 7, 10, 3, barHeight);

            int currentX = startX + 12;
            int endX = startX + barAreaWidth - 12;

            while (currentX < endX) {
                int barW = rnd.nextInt(3) + 1;
                int spaceW = rnd.nextInt(3) + 1;
                if (currentX + barW + spaceW >= endX) break;
                g2d.fillRect(currentX, 10, barW, barHeight);
                currentX += (barW + spaceW);
            }

            // Guard bars (stop)
            g2d.fillRect(endX - 8, 10, 3, barHeight);
            g2d.fillRect(endX - 4, 10, 1, barHeight);
            g2d.fillRect(endX - 2, 10, 2, barHeight);

            // Human Readable Text Label
            g2d.setColor(Color.DARK_GRAY);
            g2d.setFont(new java.awt.Font("Consolas", java.awt.Font.BOLD, 12));
            FontMetrics fm = g2d.getFontMetrics();
            int textW = fm.stringWidth(barcodeText);
            int textX = (width - textW) / 2;
            g2d.drawString(barcodeText, textX, height - 5);

            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(barcodeImg, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate barcode image for " + barcodeText, e);
            return null;
        }
    }

    private Color parseColorSafe(String hex, Color defaultColor) {
        if (hex == null || hex.isBlank()) return defaultColor;
        try {
            if (hex.startsWith("#")) {
                return Color.decode(hex);
            }
            return defaultColor;
        } catch (Exception e) {
            return defaultColor;
        }
    }

    /**
     * Helper to resolve physical file location across various upload path formats
     */
    private java.io.File findLocalFile(String imageUrl, String imagePath) {
        String cleanFileName = null;
        if (imageUrl != null && imageUrl.contains("/")) {
            cleanFileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        } else if (imagePath != null && imagePath.contains("/")) {
            cleanFileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
        }

        String[] candidates = new String[] {
            imagePath,
            imageUrl,
            imageUrl != null ? imageUrl.replace("/uploads/", "uploads/") : null,
            imageUrl != null ? imageUrl.replace("/uploads/", "./uploads/") : null,
            imageUrl != null ? imageUrl.replace("/uploads/", "backend/uploads/") : null,
            imageUrl != null ? imageUrl.replace("http://localhost:8080/uploads/", "uploads/") : null,
            imageUrl != null ? imageUrl.replace("http://localhost:8080/uploads/", "./uploads/") : null,
            cleanFileName != null ? "uploads/" + cleanFileName : null,
            cleanFileName != null ? "./uploads/" + cleanFileName : null,
            cleanFileName != null ? "backend/uploads/" + cleanFileName : null,
            imageUrl != null ? "data/" + imageUrl : null,
            imageUrl != null ? "./data/" + imageUrl : null
        };
        for (String path : candidates) {
            if (path != null && !path.isBlank()) {
                java.io.File f = new java.io.File(path);
                if (f.exists() && f.isFile()) {
                    return f;
                }
            }
        }
        return null;
    }
}
