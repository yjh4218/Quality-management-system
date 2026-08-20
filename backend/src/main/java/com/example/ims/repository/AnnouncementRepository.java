package com.example.ims.repository;

import com.example.ims.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * 전체공지사항(Announcement) Repository.
 * [정렬 규칙] 기본 정렬은 날짜(최신순) > 코드 > 명칭 순서를 준수합니다.
 */
public interface AnnouncementRepository extends JpaRepository<Announcement, Long>, JpaSpecificationExecutor<Announcement> {

    Optional<Announcement> findByAnnouncementNumber(String announcementNumber);

    List<Announcement> findByIsDeletedFalseOrderByCreatedAtDescAnnouncementNumberDesc();

    /**
     * PostgreSQL/H2 시퀀스 기반 전체공지 일련번호 채번
     */
    @Query(value = "SELECT nextval('announcement_number_seq')", nativeQuery = true)
    Long getNextAnnouncementSequence();

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Announcement a SET a.categoryId = null WHERE a.categoryId = :categoryId")
    void clearCategoryId(@org.springframework.data.repository.query.Param("categoryId") Long categoryId);
}
