package com.example.ims.repository;

import com.example.ims.entity.ManufacturerInviteToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ManufacturerInviteTokenRepository extends JpaRepository<ManufacturerInviteToken, Long> {
    Optional<ManufacturerInviteToken> findByToken(String token);
}
