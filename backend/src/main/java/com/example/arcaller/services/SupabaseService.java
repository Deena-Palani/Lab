package com.example.arcaller.services;

import com.example.arcaller.config.SupabaseProperties;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class SupabaseService {

    private final RestTemplate restTemplate;
    private final SupabaseProperties supabaseProperties;

    public SupabaseService(RestTemplate restTemplate, SupabaseProperties supabaseProperties) {
        this.restTemplate = restTemplate;
        this.supabaseProperties = supabaseProperties;
    }

    /**
     * Record a login event for the given username.
     * This will insert a row into a Supabase table named "login_logs".
     * The table should have at least two columns: "username" (text) and "login_time" (timestamp).
     */
    public void recordLogin(String username) {
        String url = supabaseProperties.getUrl() + "/login_logs"; // Adjust table name if needed

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Supabase requires the apikey in the header (service_role key for server‑side ops)
        headers.set("apikey", supabaseProperties.getApiKey());
        headers.set("Authorization", "Bearer " + supabaseProperties.getApiKey());
        // Optional: ask Supabase to return the inserted row
        headers.set("Prefer", "return=representation");

        Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("login_time", Instant.now().toString());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.exchange(url, HttpMethod.POST, request, String.class);
    }

    /**
     * Generic method to upsert data into a given Supabase table.
     * "data" should be a map representing the JSON payload.
     */
    public void upsert(String tableName, Map<String, Object> data) {
        String url = supabaseProperties.getUrl() + "/" + tableName;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", supabaseProperties.getApiKey());
        headers.set("Authorization", "Bearer " + supabaseProperties.getApiKey());
        headers.set("Prefer", "resolution=merge-duplicates,return=representation");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(data, headers);
        restTemplate.exchange(url, HttpMethod.POST, request, String.class);
    }
}
