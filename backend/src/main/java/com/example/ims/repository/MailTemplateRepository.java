package com.example.ims.repository;

import com.example.ims.entity.MailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MailTemplateRepository extends JpaRepository<MailTemplate, Long> {
    List<MailTemplate> findByDeletedFalseOrderByUpdatedAtDesc();
    List<MailTemplate> findByCategoryAndDeletedFalseAndActiveTrue(String category);
    Optional<MailTemplate> findByTemplateCodeAndDeletedFalse(String templateCode);
}
