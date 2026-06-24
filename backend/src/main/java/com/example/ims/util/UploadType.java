package com.example.ims.util;

public enum UploadType {
    AUDIT_PHOTO("audit_photo"),               // 사진감리: [품목코드]_사진감리_[일시]_[UUID]
    TEST_REPORT("test_report"),               // 성적서: [품목코드]_LOT_[등록일]_[UUID]
    CLAIM_ATTACHMENT("claim"),                // 클레임 문서: claim_[클레임번호]_[일시]_[UUID]
    MANUFACTURER_DOC("mfr_doc"),              // 제조사 서류: [제조사명]_[서류분류]_[등록일]_[UUID]
    COA_FILE("coa"),                          // 원료 성적서(COA): coa_[품목코드]_[일시]_[UUID]
    GENERAL("upload");

    private final String folder;

    UploadType(String folder) {
        this.folder = folder;
    }

    public String getFolder() {
        return folder;
    }
}
