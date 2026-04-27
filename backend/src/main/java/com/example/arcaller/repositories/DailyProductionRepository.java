package com.example.arcaller.repositories;

import com.example.arcaller.models.DailyProduction;
import com.example.arcaller.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DailyProductionRepository extends JpaRepository<DailyProduction, UUID> {
    List<DailyProduction> findByUserOrderByDateDesc(User user);
    List<DailyProduction> findByUserAndDateBetweenOrderByDateDesc(User user, LocalDate start, LocalDate end);
}
