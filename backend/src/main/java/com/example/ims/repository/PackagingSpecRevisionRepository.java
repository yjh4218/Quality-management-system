package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PackagingSpecRevisionRepository extends JpaRepository<PackagingSpecRevision, Long> {
    List<PackagingSpecRevision> findBySpecId(Long specId);
    void deleteBySpecId(Long specId);
}
