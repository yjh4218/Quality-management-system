package com.example.ims.repository;

import com.example.ims.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
    Optional<Manufacturer> findByName(String name);

    // [휴지통] 삭제된 항목 조회
    java.util.List<Manufacturer> findByActiveFalseOrderByUpdatedAtDesc();
}
