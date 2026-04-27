package com.example.arcaller.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @Column(unique = true)
    private String username;

    @NotNull
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;

    @NotNull
    private String role; // e.g., "ROLE_TL" or "ROLE_USER"

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean approved = false;

    private java.time.LocalDateTime lastActive;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isApproved() { return approved; }
    public void setApproved(boolean approved) { this.approved = approved; }

    public java.time.LocalDateTime getLastActive() { return lastActive; }
    public void setLastActive(java.time.LocalDateTime lastActive) { this.lastActive = lastActive; }

    public boolean isOnline() {
        if (lastActive == null) return false;
        return lastActive.isAfter(java.time.LocalDateTime.now().minusMinutes(5));
    }
}
