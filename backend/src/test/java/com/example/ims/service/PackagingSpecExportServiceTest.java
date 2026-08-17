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

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            assertEquals(5, wb.getNumberOfSheets());
            Sheet sheet0 = wb.getSheet("포장사양서");
            assertNotNull(sheet0);
            assertEquals("📦 제품 포장 사양서 (Packaging Specification)", sheet0.getRow(0).getCell(0).getStringCellValue());
        }
    }
}
