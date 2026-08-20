package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecBomItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PackagingSpecBomItemRepository extends JpaRepository<PackagingSpecBomItem, Long> {
    List<PackagingSpecBomItem> findByPackagingSpecId(Long packagingSpecId);
}
