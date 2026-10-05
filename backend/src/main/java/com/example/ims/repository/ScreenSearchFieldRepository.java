package com.example.ims.repository;

import com.example.ims.entity.ScreenSearchField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ScreenSearchFieldRepository extends JpaRepository<ScreenSearchField, Long> {
    List<ScreenSearchField> findByScreenIdOrderByDisplayOrderAsc(Long screenId);

    @Modifying
    @Transactional
    void deleteByScreenId(Long screenId);
}
