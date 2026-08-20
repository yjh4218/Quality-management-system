package com.example.ims.repository;

import com.example.ims.entity.ManufacturerInviteToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ManufacturerInviteTokenRepository extends JpaRepository<ManufacturerInviteToken, Long> {
    Optional<ManufacturerInviteToken> findByToken(String token);
}
