package com.example.ims.service;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecComponentRepository;
import com.example.ims.repository.PackagingSpecRevisionRepository;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.PackagingMethodImageRepository;
import com.example.ims.repository.ChannelSpecialNoteRepository;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.Collections;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PackagingSpecExportServiceTest {

    @Mock
    private PackagingSpecificationRepository specRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PackagingSpecRevisionRepository revisionRepository;

    @Mock
    private PackagingSpecComponentRepository componentRepository;

    @Mock
    private PackagingMethodImageRepository methodImageRepository;

    @Mock
    private ChannelSpecialNoteRepository specialNoteRepository;

    @InjectMocks
    private PackagingSpecExportService exportService;

    @Test
    @DisplayName("포장사양서 엑셀 내보내기 시 3D 도면 및 5개 시트가 정상 생성되어야 한다")
    void testGenerateExcelWith3DDrawings() throws Exception {
        Long productId = 100L;
        Product product = Product.builder()
                .id(productId)
                .itemCode("PRD-2026-001")
                .productName("닥터지 레드 블레미쉬 클리어 수딩 크림 70ml")
                .englishProductName("Dr.G Red Blemish Clear Soothing Cream 70ml")
                .productBarcode("8809647291122")
                .outboxBarcode("18809647291129")
                .build();

        PackagingSpecification spec = PackagingSpecification.builder()
                .id(1L)
                .product(product)
                .version(1)
                .inboxUseYn("O")
                .inboxQty(10)
                .inboxSize("200x200x150")
                .inboxPackingPattern("2열×5행×1단 (10개입)")
                .outboxQty(40)
                .outboxSize("460x420x320")
                .outboxPackingPattern("2열×2행×1단 (인박스 4박스입, 총 40개)")
                .palletStackingPattern("8방 핀휠 교차적재")
                .palletTierCount(8)
                .popUseYn("O")
                .popHeight(15.0)
                .airCapUseYn("O")
                .cornerPostUseYn("O")
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(specRepository.findByProductId(productId)).thenReturn(Collections.singletonList(spec));

        byte[] excelBytes = exportService.generateExcel(productId);
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 1000);
        try {
            java.nio.file.Files.write(java.nio.file.Paths.get("test_spec_output.xlsx"), excelBytes);
        } catch (Exception ignored) {}

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            assertEquals(5, wb.getNumberOfSheets());
            Sheet sheet0 = wb.getSheet("포장사양서");
            assertNotNull(sheet0);
            assertEquals("📦 제품 포장 사양서 (Packaging Specification)", sheet0.getRow(0).getCell(0).getStringCellValue());

            // 1. Sheet 0 열 너비 검증
            assertEquals(4800, sheet0.getColumnWidth(0));
            assertEquals(10500, sheet0.getColumnWidth(1));
            assertEquals(8000, sheet0.getColumnWidth(2), "재질 및 세부사양 Col 2 너비는 8000이어야 함");
            assertEquals(10500, sheet0.getColumnWidth(3));

            // 2. Sheet 0 행 높이 및 텍스트 검증
            // Row 5: 국문/영문 제품명 행 (42pt)
            assertEquals(42.0f, sheet0.getRow(5).getHeightInPoints());
            assertEquals("닥터지 레드 블레미쉬 클리어 수딩 크림 70ml", sheet0.getRow(5).getCell(1).getStringCellValue());

            // 포장방법 셀 및 착인기준 3줄 행 탐색 및 검증
            boolean foundPackageImageSection = false;
            boolean foundMarkingRow = false;
            boolean foundMethodRow = false;
            boolean foundLayout3DRow = false;

            for (int r = 0; r <= sheet0.getLastRowNum(); r++) {
                org.apache.poi.ss.usermodel.Row row = sheet0.getRow(r);
                if (row == null) continue;
                org.apache.poi.ss.usermodel.Cell c0 = row.getCell(0);
                if (c0 != null) {
                    String val = c0.getStringCellValue();
                    if (val.contains("제품 및 패키지 실물 이미지")) {
                        foundPackageImageSection = true;
                    } else if (val.contains("용기 착인기준(3줄)")) {
                        foundMarkingRow = true;
                        assertTrue(row.getHeightInPoints() >= 60.0f, "3줄 착인기준 행 높이는 최소 60pt여야 함");
                    } else if (val.contains("포장방법 (서술)")) {
                        foundMethodRow = true;
                        assertTrue(row.getHeightInPoints() >= 80.0f, "포장방법 서술 행 높이는 최소 80pt여야 함");
                        org.apache.poi.ss.usermodel.Cell c1 = row.getCell(1);
                        assertNotNull(c1);
                        assertTrue(c1.getStringCellValue().contains("포장방법 사진 참조"), "포장방법에는 '포장방법 사진 참조'가 포함되어야 함");
                    } else if (val.contains("인박스 3D 입수 도면")) {
                        // 바로 다음 행이 3D 도면 이미지 행
                        org.apache.poi.ss.usermodel.Row imgRow = sheet0.getRow(r + 1);
                        assertNotNull(imgRow);
                        assertEquals(190.0f, imgRow.getHeightInPoints(), "3D 도면 이미지 행 높이는 190pt여야 함");
                        foundLayout3DRow = true;
                    }
                }
            }

            assertTrue(foundPackageImageSection, "3-1. 제품 및 패키지 실물 이미지 섹션이 존재해야 함");
            assertTrue(foundMarkingRow, "3줄 착인기준 행이 존재해야 함");
            assertTrue(foundMethodRow, "포장방법 서술 행이 존재해야 함");
            assertTrue(foundLayout3DRow, "3D 도면 행이 존재해야 함");

            // 3. Sheet 1 (포장방법 사진) 검증
            Sheet sheet1 = wb.getSheet("포장방법 사진");
            assertNotNull(sheet1);
            assertEquals(15000, sheet1.getColumnWidth(1));

            // 4. Sheet 2, 3, 4 (현품표) 검증
            Sheet sheet2 = wb.getSheet("인박스 현품표");
            assertNotNull(sheet2);
            assertEquals(6500, sheet2.getColumnWidth(0));
            assertEquals(11000, sheet2.getColumnWidth(1));
            assertEquals(70.0f, sheet2.getRow(5).getHeightInPoints(), "인박스 현품표 착인기준 행 높이는 70pt여야 함");

            Sheet sheet3 = wb.getSheet("아웃박스 현품표");
            assertNotNull(sheet3);
            assertEquals(70.0f, sheet3.getRow(6).getHeightInPoints(), "아웃박스 현품표 착인기준 행 높이는 70pt여야 함");

            Sheet sheet4 = wb.getSheet("팔레트 현품표");
            assertNotNull(sheet4);
            assertEquals("64 Box", sheet4.getRow(1).getCell(3).getStringCellValue());
            assertEquals("2560 EA", sheet4.getRow(2).getCell(3).getStringCellValue());
            assertEquals(70.0f, sheet4.getRow(6).getHeightInPoints(), "팔레트 현품표 착인기준 행 높이는 70pt여야 함");

            // 메모리 내 엑셀 바이트 검증 완료
        }
    }

    @Test
    @DisplayName("제품 이미지 관리의 다중 패키지 이미지가 사양서 시트 3-1 섹션에 정상 렌더링되어야 한다")
    void testGenerateExcelWithMultiPackageImages() throws Exception {
        Long productId = 200L;
        Product product = Product.builder()
                .id(productId)
                .itemCode("PRD-PKG-002")
                .productName("다중 패키지 크림 50ml")
                .englishProductName("Multi Package Cream 50ml")
                .imagePath("uploads/rep_package.png")
                .imagePaths(Arrays.asList("uploads/pkg1.png", "uploads/pkg2.png", "uploads/pkg3.png"))
                .build();

        PackagingSpecification spec = PackagingSpecification.builder()
                .id(2L)
                .product(product)
                .version(1)
                .inboxUseYn("O")
                .inboxQty(6)
                .outboxQty(36)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(specRepository.findByProductId(productId)).thenReturn(Collections.singletonList(spec));

        byte[] excelBytes = exportService.generateExcel(productId);
        assertNotNull(excelBytes);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet0 = wb.getSheet("포장사양서");
            assertNotNull(sheet0);

            boolean foundPackageImageHeader = false;
            boolean foundImageLabels = false;

            for (int r = 0; r <= sheet0.getLastRowNum(); r++) {
                org.apache.poi.ss.usermodel.Row row = sheet0.getRow(r);
                if (row == null) continue;
                org.apache.poi.ss.usermodel.Cell c0 = row.getCell(0);
                if (c0 != null) {
                    String val = c0.getStringCellValue();
                    if (val.contains("3-1. 🖼️ 제품 및 패키지 실물 이미지")) {
                        foundPackageImageHeader = true;
                    } else if (val.contains("📷 패키지 이미지 #1")) {
                        foundImageLabels = true;
                        // 다음 행은 이미지 행 (높이 180pt)
                        org.apache.poi.ss.usermodel.Row imgRow = sheet0.getRow(r + 1);
                        assertNotNull(imgRow);
                        assertEquals(180.0f, imgRow.getHeightInPoints(), "패키지 이미지 행 높이는 180pt여야 함");
                    }
                }
            }

            assertTrue(foundPackageImageHeader, "3-1 섹션 헤더가 존재해야 함");
            assertTrue(foundImageLabels, "패키지 이미지 라벨 및 180pt 행이 존재해야 함");

            // 워크북에 등록된 전체 이미지 리스트 검증 (3D 이미지 3개 + 바코드 2개 등 기본 포함)
            assertTrue(wb.getAllPictures().size() >= 4, "사양서 엑셀 내에 3D 및 바코드 이미지가 포함되어야 함");
        }
    }
}
