package com.example.ims.service;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

/**
 * Service to generate Excel and PDF exports for Packaging Specifications.
 */
@Service
@RequiredArgsConstructor
public class PackagingSpecExportService {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;

    /**
     * Generates a simple Excel export for the given product's packaging specs.
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

        Workbook workbook;
        InputStream is = getClass().getResourceAsStream("/templates/packaging_spec_template.xlsx");

        if (is != null) {
            workbook = WorkbookFactory.create(is);
        } else {
            // [Fallback] Template is missing (removed by user or not yet added). 
            // Create a blank workbook to ensure the export function still works.
            workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            workbook.createSheet("Packaging Specification");
        }

        try (workbook;
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.getSheetAt(0);

            setCellValue(sheet, 5, 4, product.getBrand() != null ? product.getBrand().getName() : "");
            setCellValue(sheet, 6, 4, product.getProductName());
            setCellValue(sheet, 7, 4, product.getEnglishProductName() != null ? product.getEnglishProductName() : "");
            setCellValue(sheet, 8, 4, product.getItemCode());
            setCellValue(sheet, 9, 4, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "");

            if (product.getShelfLifeMonths() != null) {
                setCellValue(sheet, 10, 4, "제조일로부터 " + product.getShelfLifeMonths() + "개월");
            }

            // Dynamic Placeholder Replacer
            for (Row r : sheet) {
                for (org.apache.poi.ss.usermodel.Cell c : r) {
                    if (c.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String v = c.getStringCellValue();
                        if (v != null) {
                            if (v.contains("개봉 후") && v.contains("개월") && product.getOpenedShelfLifeMonths() != null) {
                                c.setCellValue("개봉 후 " + product.getOpenedShelfLifeMonths() + "개월");
                            }
                            if (v.contains("AA00001") && product.getItemCode() != null) {
                                c.setCellValue(product.getItemCode());
                            }
                            if (v.contains("제품명 + 채널명 기재") && product.getProductName() != null) {
                                String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                                    ? " (" + product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(java.util.stream.Collectors.joining(", ")) + ")" 
                                    : "";
                                c.setCellValue(product.getProductName() + channelNames);
                            }
                            if (v.contains("영문 제품명 기재") && product.getEnglishProductName() != null) {
                                c.setCellValue(product.getEnglishProductName());
                            }
                        }
                    }
                }
            }

            if (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxQuantity() != null) {
                setCellValue(sheet, 70, 8, String.valueOf(product.getOutboxInfo().getOutboxQuantity()) + " 입");
            }

            if (product.getOutboxInfo() != null) {
                String outboxSize = String.format("%s * %s * %s (mm)", 
                    product.getOutboxInfo().getOutboxLength() != null ? product.getOutboxInfo().getOutboxLength() : "0",
                    product.getOutboxInfo().getOutboxWidth() != null ? product.getOutboxInfo().getOutboxWidth() : "0",
                    product.getOutboxInfo().getOutboxHeight() != null ? product.getOutboxInfo().getOutboxHeight() : "0"
                );
                setCellValue(sheet, 70, 11, outboxSize);
            }

            if (!specs.isEmpty()) {
                PackagingSpecification spec = specs.get(0);
                String methodText = spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "";
                String revNotes = spec.getRevisionNotes() != null ? " (" + spec.getRevisionNotes() + ")" : "";
                setCellValue(sheet, 94, 4, "[v" + (spec.getVersion() != null ? spec.getVersion() : 1) + revNotes + "]\n" + methodText);
            }

            workbook.write(out);
            return out.toByteArray();
        } finally {
            if (is != null) {
                is.close();
            }
        }
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
        document.add(new Paragraph("Packaging Specification Report"));
        document.add(new Paragraph("Product Name: " + product.getProductName() + " | Item Code: " + product.getItemCode()));
        
        String shelfLife = product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "N/A";
        String openedShelfLife = product.getOpenedShelfLifeMonths() != null ? "개봉 후 " + product.getOpenedShelfLifeMonths() + "개월" : "N/A";
        document.add(new Paragraph("Usage Period: " + shelfLife + " | After Opening: " + openedShelfLife));
        
        document.add(new Paragraph("--------------------------------------------------"));

        for (int i = 0; i < specs.size(); i++) {
            PackagingSpecification spec = specs.get(i);
            document.add(new Paragraph("Packaging Method v" + (spec.getVersion() != null ? spec.getVersion() : 1)));
            document.add(new Paragraph("Revision Notes: " + (spec.getRevisionNotes() != null ? spec.getRevisionNotes() : "N/A")));
            document.add(new Paragraph("Method Description: " + (spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "N/A")));
            if (spec.getPackagingMethodImage() != null && !spec.getPackagingMethodImage().isEmpty()) {
                document.add(new Paragraph("Image Reference (URL): " + spec.getPackagingMethodImage()));
            }
            document.add(new Paragraph("--------------------------------------------------"));
        }

        document.close();
        return out.toByteArray();
    }
}
