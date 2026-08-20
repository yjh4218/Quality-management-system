package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PackagingSpecComponentRepository extends JpaRepository<PackagingSpecComponent, Long> {
    List<PackagingSpecComponent> findBySpecId(Long specId);
    void deleteBySpecId(Long specId);
}
