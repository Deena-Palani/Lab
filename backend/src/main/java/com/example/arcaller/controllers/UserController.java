package com.example.arcaller.controllers;

import com.example.arcaller.models.User;
import com.example.arcaller.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Password policy: min 8 chars, at least 1 number, at least 1 special character
    private boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasNumber = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = password.chars().anyMatch(c -> !Character.isLetterOrDigit(c));
        return hasNumber && hasSpecial;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /** Public registration — account is created but requires admin (Deena) approval before login. */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Username is required."));
        }

        if (!isValidPassword(password)) {
            return ResponseEntity.badRequest().body(
                Map.of("message",
                    "Password must be at least 8 characters long, contain at least one number, and at least one special character (e.g. @, #, !)."));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            User existingUser = userRepository.findByUsername(username).get();
            if (!existingUser.isApproved()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of("message", "A registration request for '" + username + "' is already under review. " +
                                     "Please wait for administrative authorization. Duplicate requests are not required."));
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("message", "This username is already registered and active. Please proceed to login."));
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("ROLE_USER");
        user.setApproved(false); // Requires Deena (admin) approval

        userRepository.save(user);
        return ResponseEntity.ok(
            Map.of("message",
                "Your registration request has been submitted successfully. Your account is currently pending administrative review. Once approved by the system administrator (Deena), you will be able to access the GMS Portal. Please allow some time for processing."));
    }

    /** Admin: list all users pending approval */
    @GetMapping("/pending")
    public ResponseEntity<List<User>> getPendingUsers() {
        return ResponseEntity.ok(userRepository.findByApprovedFalse());
    }

    /** Admin: approve a user by username */
    @PostMapping("/approve/{username}")
    public ResponseEntity<?> approveUser(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        user.setApproved(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User '" + username + "' has been approved successfully."));
    }

    /** Admin: list all approved users */
    @GetMapping("/approved")
    public ResponseEntity<List<User>> getApprovedUsers() {
        return ResponseEntity.ok(userRepository.findByApprovedTrue());
    }

    /** Admin: count active users (active in last 5 mins) */
    @GetMapping("/active-count")
    public ResponseEntity<Map<String, Long>> getActiveCount() {
        java.time.LocalDateTime threshold = java.time.LocalDateTime.now().minusMinutes(5);
        long count = userRepository.countByLastActiveAfter(threshold);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /** Admin: reject/delete a user by username */
    @DeleteMapping("/{username}")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        userRepository.delete(userOpt.get());
        return ResponseEntity.ok(Map.of("message", "User '" + username + "' has been removed from the organization."));
    }

    /** Admin: reject/delete a pending user */
    @DeleteMapping("/reject/{username}")
    public ResponseEntity<?> rejectUser(@PathVariable String username) {
        return deleteUser(username);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        return registerUser(request);
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> updatePassword(java.security.Principal principal, @RequestBody Map<String, String> request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
        String username = principal.getName();
        String oldPassword = request.get("oldPassword");
        String newPassword = request.get("newPassword");

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        User user = userOpt.get();

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Incorrect current password"));
        }

        if (!isValidPassword(newPassword)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters long, contain at least one number, and at least one special character."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
