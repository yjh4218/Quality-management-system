package com.example.ims.repository;

import com.example.ims.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findByUsernameOrderByCreatedAtDesc(String username);
    List<AccessLog> findAllByOrderByCreatedAtDesc();
}
