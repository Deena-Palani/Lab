package com.example.arcaller.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final com.example.arcaller.repositories.UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, com.example.arcaller.repositories.UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        String token = null;
        String username = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(token);
            } catch (Exception e) {
                // Invalid token
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtUtil.validateToken(token)) {
                String role = jwtUtil.extractClaims(token).get("role", String.class);
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username, null, java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)));
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                
                final String finalUsername = username;
                // Update activity asynchronously to avoid blocking the request
                java.util.concurrent.CompletableFuture.runAsync(() -> {
                    try {
                        userRepository.findByUsername(finalUsername).ifPresent(u -> {
                            u.setLastActive(java.time.LocalDateTime.now());
                            userRepository.save(u);
                        });
                    } catch (Exception e) {
                        // Log and ignore DB errors for activity tracking to prevent request failure
                        System.err.println("Failed to update lastActive for user " + finalUsername + ": " + e.getMessage());
                    }
                });
            }
        }
        chain.doFilter(request, response);
    }
}
