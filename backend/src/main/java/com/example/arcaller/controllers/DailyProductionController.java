package com.example.arcaller.controllers;

import com.example.arcaller.models.DailyProduction;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.DailyProductionRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/daily-production")
@CrossOrigin(origins = "*")
public class DailyProductionController {

    private final DailyProductionRepository dailyProductionRepository;
    private final UserRepository userRepository;

    public DailyProductionController(DailyProductionRepository dailyProductionRepository, UserRepository userRepository) {
        this.dailyProductionRepository = dailyProductionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<DailyProduction> getRecentProduction(@RequestParam(defaultValue = "7") int days) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
        LocalDate start = LocalDate.now().minusDays(days);
        return dailyProductionRepository.findByUserAndDateBetweenOrderByDateDesc(user, start, LocalDate.now());
    }

    @PostMapping
    public DailyProduction saveProduction(@RequestBody DailyProduction production) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
        production.setUser(user);
        if (production.getDate() == null) production.setDate(LocalDate.now());
        return dailyProductionRepository.save(production);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduction(@PathVariable UUID id, @RequestBody DailyProduction updated) {
        DailyProduction existing = dailyProductionRepository.findById(id).orElseThrow();
        
        // Check 7-day window
        if (existing.getDate().isBefore(LocalDate.now().minusDays(7))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Entries older than 7 days cannot be edited."));
        }

        existing.setAppealsCompleted(updated.getAppealsCompleted());
        existing.setAppealsSent(updated.getAppealsSent());
        existing.setAmountCollected(updated.getAmountCollected());
        existing.setNotes(updated.getNotes());
        
        return ResponseEntity.ok(dailyProductionRepository.save(existing));
    }
}
