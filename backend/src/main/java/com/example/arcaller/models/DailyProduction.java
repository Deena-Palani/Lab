package com.example.arcaller.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_production")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DailyProduction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDate date;
    private int appealsCompleted;
    private int appealsSent;
    private Double amountCollected;
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Explicit Getters and Setters for reliability
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public int getAppealsCompleted() { return appealsCompleted; }
    public void setAppealsCompleted(int appealsCompleted) { this.appealsCompleted = appealsCompleted; }
    public int getAppealsSent() { return appealsSent; }
    public void setAppealsSent(int appealsSent) { this.appealsSent = appealsSent; }
    public Double getAmountCollected() { return amountCollected; }
    public void setAmountCollected(Double amountCollected) { this.amountCollected = amountCollected; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
