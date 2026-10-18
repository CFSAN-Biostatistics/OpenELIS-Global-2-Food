package org.openelisglobal.analyzer.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import org.openelisglobal.config.HttpClientConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Shared HTTP client for OpenELIS-to-Bridge calls.
 *
 * <p>
 * Certificate mode uses the OpenELIS key material and truststore configured
 * through HttpClientConfig. Server certificate trust and hostname verification
 * remain enabled, and Basic authentication is omitted.
 *
 * <p>
 * Legacy mode preserves Basic authentication and the existing trust-all
 * certificate configuration for unpaired Bridges.
 */
@Component
public class BridgeHttpClient {

    private static final Logger logger = LoggerFactory.getLogger(BridgeHttpClient.class);
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient;
    private final String username;
    private final String password;
    private final boolean basicAuthentication;

    @Autowired
    public BridgeHttpClient(
            @Value("${analyzer.bridge.username:}") String username,
            @Value("${analyzer.bridge.password:}") String password,
            @Value("${analyzer.bridge.client-certificate-enabled:false}") boolean clientCertificateEnabled,
            HttpClientConfig tlsConfig) throws Exception {
        this.httpClient = clientCertificateEnabled
                ? HttpClient.newBuilder()
                        .connectTimeout(CONNECT_TIMEOUT)
                        .sslContext(tlsConfig.sslContext())
                        .build()
                : buildTrustAllClient();
        this.username = username;
        this.password = password;
        this.basicAuthentication = !clientCertificateEnabled;
    }

    /**
     * Preserves compatibility with existing callers and Basic-authentication tests.
     */
    public BridgeHttpClient(String username, String password) {
        this.httpClient = buildTrustAllClient();
        this.username = username;
        this.password = password;
        this.basicAuthentication = true;
    }

    private static HttpClient buildTrustAllClient() {
        try {
            javax.net.ssl.SSLContext sslContext = javax.net.ssl.SSLContext.getInstance("TLS");
            sslContext.init(null, new javax.net.ssl.TrustManager[] {
                    new javax.net.ssl.X509TrustManager() {
                        @Override
                        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                            return new java.security.cert.X509Certificate[0];
                        }

                        @Override
                        public void checkClientTrusted(
                                java.security.cert.X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public void checkServerTrusted(
                                java.security.cert.X509Certificate[] chain, String authType) {
                        }
                    }
            }, new java.security.SecureRandom());

            return HttpClient.newBuilder()
                    .connectTimeout(CONNECT_TIMEOUT)
                    .sslContext(sslContext)
                    .build();
        } catch (Exception e) {
            logger.warn(
                    "Bridge SSL context init failed; using default HttpClient "
                            + "(self-signed bridge calls will fail PKIX): {}",
                    e.getMessage());
            return HttpClient.newBuilder()
                    .connectTimeout(CONNECT_TIMEOUT)
                    .build();
        }
    }

    /** Status and body of a Bridge call. Callers interpret the response. */
    public static final class BridgeResponse {
        public final int status;
        public final String body;

        public BridgeResponse(int status, String body) {
            this.status = status;
            this.body = body;
        }

        public boolean isSuccess() {
            return status >= 200 && status < 300;
        }
    }

    public BridgeResponse get(String url, Duration readTimeout) throws IOException {
        return send("GET", url, null, readTimeout);
    }

    public BridgeResponse post(String url, String jsonBody, Duration readTimeout) throws IOException {
        return send("POST", url, jsonBody, readTimeout);
    }

    public BridgeResponse put(String url, String jsonBody, Duration readTimeout) throws IOException {
        return send("PUT", url, jsonBody, readTimeout);
    }

    public BridgeResponse delete(String url, Duration readTimeout) throws IOException {
        return send("DELETE", url, null, readTimeout);
    }

    /**
     * Sends a request and returns its HTTP status and body, including non-2xx
     * responses. Transport failures propagate as IOException.
     */
    public BridgeResponse send(
            String method, String url, String jsonBody, Duration readTimeout) throws IOException {
        URI uri = URI.create(url);
        if (!basicAuthentication && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException(
                    "Certificate-authenticated Bridge requests require HTTPS");
        }

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(readTimeout);

        HttpRequest.BodyPublisher publisher;
        if (jsonBody == null) {
            publisher = HttpRequest.BodyPublishers.noBody();
        } else {
            publisher = HttpRequest.BodyPublishers.ofString(jsonBody);
            builder.header("Content-Type", "application/json");
        }

        if (basicAuthentication) {
            builder.header("Authorization", authorizationHeader());
        }

        builder.method(method, publisher);

        try {
            HttpResponse<String> response = httpClient.send(
                    builder.build(), HttpResponse.BodyHandlers.ofString());
            return new BridgeResponse(
                    response.statusCode(),
                    response.body() != null ? response.body() : "");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException(method + " " + url + " interrupted", e);
        }
    }

    private String authorizationHeader() {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Analyzer Bridge username must be configured");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException(
                    "Analyzer Bridge password must be configured");
        }

        String credentials = username + ":" + password;
        return "Basic " + Base64.getEncoder().encodeToString(
                credentials.getBytes(StandardCharsets.UTF_8));
    }
}