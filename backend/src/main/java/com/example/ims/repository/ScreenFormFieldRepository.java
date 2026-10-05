package com.example.ims.repository;

import com.example.ims.entity.ScreenFormField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenFormFieldRepository extends JpaRepository<ScreenFormField, Long> {
    List<ScreenFormField> findBySubPageIdOrderByDisplayOrderAsc(Long subPageId);
}
