package com.example.arcaller.repositories;

import com.example.arcaller.models.Appeal;
import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppealRepository extends JpaRepository<Appeal, UUID> {
    List<Appeal> findBySender(User sender);
    List<Appeal> findByReceiver(User receiver);
    java.util.Optional<Appeal> findByFinNumberIgnoreCase(String finNumber);
}
