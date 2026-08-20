package com.example.ims.repository;

import com.example.ims.entity.ChannelStickerImage;
import com.example.ims.entity.SalesChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChannelStickerImageRepository extends JpaRepository<ChannelStickerImage, Long> {
    Optional<ChannelStickerImage> findByChannel(SalesChannel channel);
}
