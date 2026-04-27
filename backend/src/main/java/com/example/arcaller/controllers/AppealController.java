package com.example.arcaller.controllers;

import com.example.arcaller.models.Appeal;
import com.example.arcaller.models.User;
import com.example.arcaller.repositories.AppealRepository;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/appeals")
@CrossOrigin(origins = "*")
public class AppealController {

    private final AppealRepository appealRepository;
    private final UserRepository userRepository;

    public AppealController(AppealRepository appealRepository, UserRepository userRepository) {
        this.appealRepository = appealRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/sent")
    public List<Appeal> getSentAppeals(@RequestParam(defaultValue = "date") String sortBy, @RequestParam(defaultValue = "desc") String order) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
        // Sorting logic can be added here or in repository. For now, using repo's default.
        return appealRepository.findBySender(user);
    }

    @GetMapping("/received")
    public List<Appeal> getReceivedAppeals(@RequestParam(defaultValue = "date") String sortBy, @RequestParam(defaultValue = "desc") String order) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
        return appealRepository.findByReceiver(user);
    }

    @GetMapping("/track")
    public ResponseEntity<?> getAppealByFin(@RequestParam String fin) {
        // Try as UUID first (for details modal)
        try {
            UUID id = UUID.fromString(fin);
            return appealRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            // Not a UUID, search by FIN string
            return appealRepository.findByFinNumberIgnoreCase(fin)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
    }

    @GetMapping("/all-debug")
    public List<Appeal> getAllAppealsDebug() {
        return appealRepository.findAll();
    }

    @GetMapping("/status/{finNumber}")
    public ResponseEntity<?> getAppealStatus(@PathVariable String finNumber) {
        return getAppealByFin(finNumber);
    }

    @PostMapping("/send-to/{receiverUsername}")
    public ResponseEntity<?> sendTo(@PathVariable String receiverUsername, @RequestBody Appeal appeal) {
        String senderUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        System.out.println("DEBUG: Sending appeal from " + senderUsername + " to " + receiverUsername);
        
        User sender = userRepository.findByUsernameIgnoreCase(senderUsername).orElseThrow();
        
        Optional<User> receiverOpt = userRepository.findByUsernameIgnoreCase(receiverUsername);
        if (receiverOpt.isEmpty()) {
            System.out.println("DEBUG: Receiver NOT FOUND: " + receiverUsername);
            return ResponseEntity.badRequest().body(Map.of("message", "Target user '" + receiverUsername + "' not found."));
        }
        
        User receiver = receiverOpt.get();
        System.out.println("DEBUG: Receiver FOUND: " + receiver.getUsername() + " (ID: " + receiver.getId() + ")");
        
        appeal.setSender(sender);
        appeal.setReceiver(receiver);
        if (appeal.getStatus() == null) appeal.setStatus("PENDING");
        
        Appeal saved = appealRepository.save(appeal);
        System.out.println("DEBUG: Appeal SAVED with ID: " + saved.getId());
        return ResponseEntity.ok(saved);
    }

    /**
     * Receiver (John) updates the status of an appeal
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Appeal appeal = appealRepository.findById(id).orElseThrow();
        
        // Security check: Only the receiver can update status
        if (!appeal.getReceiver().getUsername().equals(username)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the assigned user can update this appeal status."));
        }
        
        String newStatus = request.get("status");
        String ticket = request.get("ticketNumber");

        if ("COMPLETED".equals(newStatus) && (ticket == null || ticket.trim().isEmpty())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ticket number is mandatory for COMPLETED status."));
        }

        if (newStatus != null) {
            appeal.setStatus(newStatus);
            appeal.setLastStatusUpdate(java.time.LocalDateTime.now());
        }
        if (ticket != null) {
            appeal.setTicketNumber(ticket);
        }
        if (request.containsKey("notes")) {
            appeal.setNotes(request.get("notes"));
        }
        
        return ResponseEntity.ok(appealRepository.save(appeal));
    }

    /**
     * Sender updates the final outcome of an appeal (Paid/Denied/Review)
     */
    @PatchMapping("/{id}/outcome")
    public ResponseEntity<?> updateOutcome(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Appeal appeal = appealRepository.findById(id).orElseThrow();
        
        // Security check: Only the sender can update outcome
        if (!appeal.getSender().getUsername().equals(username)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the original sender can update the final outcome."));
        }
        
        if (request.containsKey("status")) {
            appeal.setStatus(request.get("status"));
        }
        
        return ResponseEntity.ok(appealRepository.save(appeal));
    }
}
