package com.example.ims.repository;

import com.example.ims.entity.ScreenSubPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenSubPageRepository extends JpaRepository<ScreenSubPage, Long> {
    List<ScreenSubPage> findByParentScreenId(Long parentScreenId);
}
