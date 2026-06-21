package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PackagingSpecRevisionRepository extends JpaRepository<PackagingSpecRevision, Long> {
    List<PackagingSpecRevision> findBySpecId(Long specId);
    void deleteBySpecId(Long specId);
}
