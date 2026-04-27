package com.example.arcaller.config;

public class SupabaseProperties {
    private final String url;
    private final String apiKey;

    public SupabaseProperties(String url, String apiKey) {
        this.url = url;
        this.apiKey = apiKey;
    }

    public String getUrl() {
        return url;
    }

    public String getApiKey() {
        return apiKey;
    }
}
