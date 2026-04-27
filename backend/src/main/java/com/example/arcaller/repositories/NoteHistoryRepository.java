package com.example.arcaller.repositories;

import com.example.arcaller.models.NoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NoteHistoryRepository extends JpaRepository<NoteHistory, UUID> {
    List<NoteHistory> findByCallerNoteIdOrderByCreatedAtDesc(UUID callerNoteId);
    int countByUsernameAndCreatedAtGreaterThanEqual(String username, java.time.LocalDateTime startOfDay);
}
