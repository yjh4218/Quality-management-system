package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PackagingSpecComponentRepository extends JpaRepository<PackagingSpecComponent, Long> {
    List<PackagingSpecComponent> findBySpecId(Long specId);
    void deleteBySpecId(Long specId);
}
