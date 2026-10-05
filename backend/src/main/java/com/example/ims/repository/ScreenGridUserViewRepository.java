package com.example.ims.repository;

import com.example.ims.entity.ScreenGridUserView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScreenGridUserViewRepository extends JpaRepository<ScreenGridUserView, Long> {
    List<ScreenGridUserView> findByScreenIdAndUserIdOrderByColumnOrderAsc(Long screenId, Long userId);
    Optional<ScreenGridUserView> findByScreenIdAndUserIdAndColumnId(Long screenId, Long userId, Long columnId);
    void deleteByScreenIdAndUserId(Long screenId, Long userId);

    @Modifying
    @Transactional
    void deleteByScreenId(Long screenId);
}
