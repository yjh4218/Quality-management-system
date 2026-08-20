package com.example.ims.repository;

import com.example.ims.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByRoleKey(String roleKey);
    boolean existsByRoleKey(String roleKey);
}
