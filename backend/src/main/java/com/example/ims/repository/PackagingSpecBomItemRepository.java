package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecBomItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PackagingSpecBomItemRepository extends JpaRepository<PackagingSpecBomItem, Long> {
    List<PackagingSpecBomItem> findByPackagingSpecId(Long packagingSpecId);
}
