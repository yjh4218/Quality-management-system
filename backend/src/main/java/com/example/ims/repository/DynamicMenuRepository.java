package com.example.ims.repository;

import com.example.ims.entity.DynamicMenu;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicMenuRepository extends JpaRepository<DynamicMenu, Long> {
    Optional<DynamicMenu> findByMenuCode(String menuCode);

    @EntityGraph(attributePaths = {"parent", "screen"})
    List<DynamicMenu> findByParentIsNullAndIsActiveTrueOrderByMenuOrderAsc();

    @EntityGraph(attributePaths = {"parent", "screen"})
    List<DynamicMenu> findByParentIdAndIsActiveTrueOrderByMenuOrderAsc(Long parentId);

    @EntityGraph(attributePaths = {"parent", "screen"})
    List<DynamicMenu> findByIsActiveTrueOrderByMenuOrderAsc();

    @EntityGraph(attributePaths = {"parent", "screen"})
    Optional<DynamicMenu> findFirstByScreenId(Long screenId);

    @EntityGraph(attributePaths = {"parent", "screen"})
    List<DynamicMenu> findByScreenId(Long screenId);
}
