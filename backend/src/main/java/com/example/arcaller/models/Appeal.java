package com.example.arcaller.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "appeals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Appeal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    private String claimId;
    private String finNumber;
    private String payer;
    private String dos;
    private String tflExpiry;
    private Double billedAmount;
    private String notes;
    private String ticketNumber;
    private String status; // PENDING, WORKING, SENT, COMPLETED, IN_PROCESS
    private String priority; // NORMAL, URGENT, CRITICAL

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_status_update")
    private LocalDateTime lastStatusUpdate = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_id")
    private User receiver;

    // Explicit Getters and Setters for reliability
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getClaimId() { return claimId; }
    public void setClaimId(String claimId) { this.claimId = claimId; }

    public String getFinNumber() { return finNumber; }
    public void setFinNumber(String finNumber) { this.finNumber = finNumber; }

    public String getPayer() { return payer; }
    public void setPayer(String payer) { this.payer = payer; }

    public String getDos() { return dos; }
    public void setDos(String dos) { this.dos = dos; }

    public String getTflExpiry() { return tflExpiry; }
    public void setTflExpiry(String tflExpiry) { this.tflExpiry = tflExpiry; }

    public Double getBilledAmount() { return billedAmount; }
    public void setBilledAmount(Double billedAmount) { this.billedAmount = billedAmount; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }

    public LocalDateTime getLastStatusUpdate() { return lastStatusUpdate; }
    public void setLastStatusUpdate(LocalDateTime lastStatusUpdate) { this.lastStatusUpdate = lastStatusUpdate; }

    // Helper methods for easy access in frontend
    public String getSenderUsername() {
        return sender != null ? sender.getUsername() : "Unknown";
    }

    public String getReceiverUsername() {
        return receiver != null ? receiver.getUsername() : "Unassigned";
    }
}
