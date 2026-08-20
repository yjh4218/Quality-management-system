package com.example.ims.repository;

import com.example.ims.entity.ChannelSpecialNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChannelSpecialNoteRepository extends JpaRepository<ChannelSpecialNote, Long> {
    List<ChannelSpecialNote> findByChannelId(Long channelId);
    Optional<ChannelSpecialNote> findByChannelIdAndCategoryId(Long channelId, Long categoryId);
    void deleteByChannelId(Long channelId);
}
