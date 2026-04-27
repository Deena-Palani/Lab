package com.example.arcaller.repositories;

import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    List<User> findByApprovedFalse();
    List<User> findByApprovedTrue();
    long countByLastActiveAfter(java.time.LocalDateTime threshold);
}
