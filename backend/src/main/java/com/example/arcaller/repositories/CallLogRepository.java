package com.example.arcaller.repositories;

import com.example.arcaller.models.CallLog;
import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CallLogRepository extends JpaRepository<CallLog, UUID> {
    List<CallLog> findByUserOrderByCallDateDesc(User user);
}
