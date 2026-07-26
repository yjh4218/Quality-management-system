package com.example.ims.repository;

import com.example.ims.entity.ChannelNoteCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelNoteCategoryRepository extends JpaRepository<ChannelNoteCategory, Long> {
    List<ChannelNoteCategory> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<ChannelNoteCategory> findAllByOrderByDisplayOrderAsc();
    Optional<ChannelNoteCategory> findByCategoryKey(String categoryKey);
}
