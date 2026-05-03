package com.example.ims.repository;

import com.example.ims.entity.ChannelStickerImage;
import com.example.ims.entity.SalesChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChannelStickerImageRepository extends JpaRepository<ChannelStickerImage, Long> {
    Optional<ChannelStickerImage> findByChannel(SalesChannel channel);
}
