package com.example.arcaller.repositories;

import com.example.arcaller.models.TimeLog;
import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, UUID> {
    List<TimeLog> findByUserOrderByTimestampDesc(User user);
    List<TimeLog> findByUser(User user);
}
