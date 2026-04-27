package com.example.arcaller.controllers;

import com.example.arcaller.models.User;
import com.example.arcaller.repositories.UserRepository;
import com.example.arcaller.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final com.example.arcaller.services.SupabaseService supabaseService;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          UserRepository userRepository,
                          com.example.arcaller.services.SupabaseService supabaseService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.supabaseService = supabaseService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");

        // First check if user exists and is pending approval (before attempting auth)
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isPresent() && !userOpt.get().isApproved()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                Map.of("message",
                    "Your account is currently under administrative review. " +
                    "Access to the GMS Portal requires approval from the system administrator (Deena). " +
                    "Please allow time for your credentials to be reviewed and authorized. " +
                    "You will be notified once your account has been activated.")
            );
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String canonicalUsername = user.getUsername();
                String role = user.getRole();
                String token = jwtUtil.generateToken(canonicalUsername, role);
                
                // Record login time in Supabase (non-blocking)
                try {
                    supabaseService.recordLogin(canonicalUsername);
                } catch (Exception e) {}
                
                return ResponseEntity.ok(Map.of("token", token, "role", role, "username", canonicalUsername));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password."));
            }
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid username or password. Please check your credentials and try again."));
        }
    }
}
