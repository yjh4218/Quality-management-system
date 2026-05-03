package com.example.ims.repository;

import com.example.ims.entity.SalesChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SalesChannelRepository extends JpaRepository<SalesChannel, Long> {
    Optional<SalesChannel> findByName(String name);
    boolean existsByName(String name);
}
