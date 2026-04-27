package com.example.arcaller.controllers;

import com.example.arcaller.models.TimeLog;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.TimeLogRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/time")
@CrossOrigin(origins = "*")
public class TimeLogController {

    private final TimeLogRepository repository;
    private final UserRepository userRepository;

    public TimeLogController(TimeLogRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<TimeLog> getMyLogs() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        return repository.findByUser(user);
    }

    @PostMapping("/event")
    public TimeLog logEvent(@RequestBody TimeLog event) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        
        event.setUser(user);
        if (event.getTimestamp() == null) {
            event.setTimestamp(LocalDateTime.now());
        }
        return repository.save(event);
    }
}
