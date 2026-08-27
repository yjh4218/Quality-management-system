package com.example.ims.repository;

import com.example.ims.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findByUsernameOrderByCreatedAtDesc(String username);
    List<AccessLog> findAllByOrderByCreatedAtDesc();
    List<AccessLog> findTop200ByOrderByCreatedAtDesc();
    Page<AccessLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
