package com.example.ims.repository;

import com.example.ims.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findByUsernameOrderByCreatedAtDesc(String username);
    List<AccessLog> findAllByOrderByCreatedAtDesc();
}
