package com.example.ims.repository;

import com.example.ims.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, String> {

    Optional<StoredFile> findByFilePath(String filePath);

    @Query("SELECT COALESCE(SUM(s.fileSize), 0) FROM StoredFile s")
    Long getTotalStorageSize();
}
