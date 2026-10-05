package com.example.ims.repository;

import com.example.ims.entity.MasterDataSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MasterDataSourceRepository extends JpaRepository<MasterDataSource, Long> {
    Optional<MasterDataSource> findBySourceKey(String sourceKey);
}
