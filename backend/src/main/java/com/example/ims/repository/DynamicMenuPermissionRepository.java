package com.example.ims.repository;

import com.example.ims.entity.DynamicMenuPermission;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicMenuPermissionRepository extends JpaRepository<DynamicMenuPermission, Long> {
    Optional<DynamicMenuPermission> findByMenuIdAndRoleId(Long menuId, Long roleId);

    @EntityGraph(attributePaths = {"menu", "role"})
    List<DynamicMenuPermission> findByRoleId(Long roleId);

    @EntityGraph(attributePaths = {"menu", "role"})
    List<DynamicMenuPermission> findByMenuId(Long menuId);
}

