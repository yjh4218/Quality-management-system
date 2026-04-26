package com.example.ims.repository;

import com.example.ims.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByUsername(String username);

        List<User> findByEnabledFalse();

        @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
                        "(:name IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
                        "(:companyName IS NULL OR LOWER(u.companyName) LIKE LOWER(CONCAT('%', :companyName, '%'))) AND " +
                        "(:department IS NULL OR LOWER(u.department) LIKE LOWER(CONCAT('%', :department, '%'))) AND " +
                        "(:role IS NULL OR u.role = :role)")
        List<User> searchUsers(
                        @org.springframework.data.repository.query.Param("name") String name,
                        @org.springframework.data.repository.query.Param("companyName") String companyName,
                        @org.springframework.data.repository.query.Param("department") String department,
                        @org.springframework.data.repository.query.Param("role") String role);
}
