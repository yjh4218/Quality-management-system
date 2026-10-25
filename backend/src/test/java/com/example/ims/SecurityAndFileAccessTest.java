package com.example.ims;

import com.example.ims.controller.FileServingController;
import com.example.ims.service.FileStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * 03단계: 파일 보안 및 비인가 접근 제어 검증 (D-1, D-2)
 */
@ExtendWith(MockitoExtension.class)
class SecurityAndFileAccessTest {

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private FileServingController fileServingController;

    private Resource mockResource;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        mockResource = new ByteArrayResource("test-content".getBytes()) {
            @Override
            public String getFilename() {
                return "test.pdf";
            }

            @Override
            public long contentLength() {
                return 12L;
            }

            @Override
            public long lastModified() {
                return 1000L;
            }

            @Override
            public boolean exists() {
                return true;
            }
        };
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("[해결검증 D-2] 비인가 익명 사용자가 기밀 품질 문서(PDF) 접근 시 401 UNAUTHORIZED 차단")
    void testAnonymousAccessToSensitivePdf_Blocked() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/uploads/coa/inspection_report.pdf");

        ResponseEntity<Resource> response = fileServingController.serveUploadFile(request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("[해결검증 D-2] 비인가 익명 사용자가 클레임 보고서(claims/) 접근 시 401 UNAUTHORIZED 차단")
    void testAnonymousAccessToClaimsFolder_Blocked() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/uploads/claims/evidence_2026.xlsx");

        ResponseEntity<Resource> response = fileServingController.serveUploadFile(request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("[해결검증 D-2] 인증된 내부 사용자가 기밀 품질 문서 요청 시 정상 200 OK 서빙")
    void testAuthenticatedAccessToSensitivePdf_Allowed() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "quality_manager", "password", List.of(new SimpleGrantedAuthority("ROLE_QUALITY")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(fileStorageService.loadResourceOrRestore(anyString())).thenReturn(mockResource);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/uploads/coa/inspection_report.pdf");

        ResponseEntity<Resource> response = fileServingController.serveUploadFile(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("[해결검증 DEC-09] 일반 제품 이미지 등 비기밀 미디어는 익명 조회 허용 (HF 배포 무영향 보장)")
    void testPublicImageMedia_AllowedForAnonymous() {
        Resource imageResource = new ByteArrayResource(new byte[]{1, 2, 3}) {
            @Override
            public String getFilename() {
                return "product_bottle.png";
            }

            @Override
            public long contentLength() {
                return 3L;
            }

            @Override
            public long lastModified() {
                return 1000L;
            }

            @Override
            public boolean exists() {
                return true;
            }
        };
        when(fileStorageService.loadResourceOrRestore(anyString())).thenReturn(imageResource);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/uploads/products/product_bottle.png");

        ResponseEntity<Resource> response = fileServingController.serveUploadFile(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
