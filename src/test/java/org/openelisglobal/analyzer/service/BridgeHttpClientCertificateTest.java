package org.openelisglobal.analyzer.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;

import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsParameters;
import com.sun.net.httpserver.HttpsServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.time.Duration;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import javax.net.ssl.KeyManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManagerFactory;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

public class BridgeHttpClientCertificateTest {

    private static final char[] PASSWORD = "test-only-password".toCharArray();
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private static Path directory;
    private static KeyStore serverStore;
    private static KeyStore clientStore;

    private HttpsServer server;
    private String endpoint;

    private final AtomicReference<Certificate> presentedCertificate =
            new AtomicReference<>();
    private final AtomicReference<String> authorization =
            new AtomicReference<>();

    @BeforeClass
    public static void createIdentities() throws Exception {
        directory = Files.createTempDirectory("bridge-client-tls-test-");
        serverStore = generateIdentity("server");
        clientStore = generateIdentity("client");
    }

    @AfterClass
    public static void deleteIdentities() throws Exception {
        if (directory == null) {
            return;
        }
        try (Stream<Path> files = Files.walk(directory)) {
            for (Path path : files.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    @Before
    public void startServer() throws Exception {
        SSLContext serverContext = context(
                serverStore, clientStore.getCertificate("identity"));

        server = HttpsServer.create(
                new InetSocketAddress("127.0.0.1", 0), 0);

        server.setHttpsConfigurator(new HttpsConfigurator(serverContext) {
            @Override
            public void configure(HttpsParameters parameters) {
                SSLParameters sslParameters =
                        getSSLContext().getDefaultSSLParameters();
                sslParameters.setNeedClientAuth(true);
                parameters.setSSLParameters(sslParameters);
            }
        });

        server.createContext("/api/profiles", exchange -> {
            try {
                var httpsExchange =
                        (com.sun.net.httpserver.HttpsExchange) exchange;
                presentedCertificate.set(
                        httpsExchange.getSSLSession().getPeerCertificates()[0]);
                authorization.set(
                        exchange.getRequestHeaders().getFirst("Authorization"));

                byte[] body = "{}".getBytes(
                        java.nio.charset.StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            } finally {
                exchange.close();
            }
        });

        server.start();
        endpoint = "https://localhost:"
                + server.getAddress().getPort() + "/api/profiles";
    }

    @After
    public void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    public void presentsClientCertificateWithoutBasicAuthentication()
            throws Exception {
        BridgeHttpClient client = certificateClient(context(
                clientStore, serverStore.getCertificate("identity")));

        BridgeHttpClient.BridgeResponse response =
                client.get(endpoint, TIMEOUT);

        assertEquals(200, response.status);
        assertEquals("{}", response.body);
        assertEquals(
                clientStore.getCertificate("identity"),
                presentedCertificate.get());
        assertNull(authorization.get());
    }

    @Test
    public void rejectsServerHostnameMismatch() throws Exception {
        BridgeHttpClient client = certificateClient(context(
                clientStore, serverStore.getCertificate("identity")));

        // The server certificate contains DNS:localhost, but no IP SAN.
        String mismatchedEndpoint = endpoint.replace("localhost", "127.0.0.1");

        assertThrows(IOException.class,
                () -> client.get(mismatchedEndpoint, TIMEOUT));
        assertNull(presentedCertificate.get());
    }

    @Test
    public void rejectsUntrustedServerCertificate() throws Exception {
        // Trust the client's certificate instead of the server's certificate.
        BridgeHttpClient client = certificateClient(context(
                clientStore, clientStore.getCertificate("identity")));

        assertThrows(IOException.class,
                () -> client.get(endpoint, TIMEOUT));
        assertNull(presentedCertificate.get());
    }

    @Test
    public void cannotAuthenticateWithoutClientKeyMaterial() throws Exception {
        BridgeHttpClient client = certificateClient(context(
                null, serverStore.getCertificate("identity")));

        assertThrows(IOException.class,
                () -> client.get(endpoint, TIMEOUT));
        assertNull(presentedCertificate.get());
    }

    @Test
    public void certificateModeRejectsPlainHttp() throws Exception {
        BridgeHttpClient client = certificateClient(context(
                clientStore, serverStore.getCertificate("identity")));

        assertThrows(IllegalArgumentException.class,
                () -> client.get("http://localhost/api/profiles", TIMEOUT));
    }

    @Test
    public void certificateConfigurationFailureDoesNotFallBackToLegacyMode() {
        BridgeTlsConfig brokenConfig = new BridgeTlsConfig() {
            @Override
            public SSLContext sslContext() throws Exception {
                throw new IOException("Test keystore loading failure");
            }
        };

        assertThrows(IOException.class,
                () -> new BridgeHttpClient(
                        "bridge-user", "bridge-password", true, brokenConfig));
    }

    private static BridgeHttpClient certificateClient(SSLContext context)
            throws Exception {
        BridgeTlsConfig tlsConfig = new BridgeTlsConfig() {
            @Override
            public SSLContext sslContext() {
                return context;
            }
        };

        // Nonempty credentials prove that certificate mode omits Basic auth
        // even when password settings remain configured.
        return new BridgeHttpClient(
                "bridge-user", "bridge-password", true, tlsConfig);
    }

    private static SSLContext context(
            KeyStore identity, Certificate trustedCertificate) throws Exception {
        KeyManager[] keyManagers = new KeyManager[0];
        if (identity != null) {
            KeyManagerFactory factory = KeyManagerFactory.getInstance(
                    KeyManagerFactory.getDefaultAlgorithm());
            factory.init(identity, PASSWORD);
            keyManagers = factory.getKeyManagers();
        }

        KeyStore trustStore = KeyStore.getInstance("PKCS12");
        trustStore.load(null, PASSWORD);
        trustStore.setCertificateEntry("trusted-peer", trustedCertificate);

        TrustManagerFactory trustManagers = TrustManagerFactory.getInstance(
                TrustManagerFactory.getDefaultAlgorithm());
        trustManagers.init(trustStore);

        SSLContext context = SSLContext.getInstance("TLS");
        context.init(keyManagers, trustManagers.getTrustManagers(), null);
        return context;
    }

    private static KeyStore generateIdentity(String name) throws Exception {
        Path storePath = directory.resolve(name + ".p12");
        Path logPath = directory.resolve(name + "-keytool.log");
        Path keytool = Path.of(
                System.getProperty("java.home"), "bin", "keytool");

        Process process = new ProcessBuilder(
                keytool.toString(),
                "-genkeypair",
                "-alias", "identity",
                "-keyalg", "RSA",
                "-keysize", "2048",
                "-validity", "2",
                "-dname", "CN=" + name,
                "-ext", "SAN=dns:localhost",
                "-storetype", "PKCS12",
                "-keystore", storePath.toString(),
                "-storepass", new String(PASSWORD),
                "-keypass", new String(PASSWORD),
                "-noprompt")
                .redirectErrorStream(true)
                .redirectOutput(logPath.toFile())
                .start();

        if (!process.waitFor(30, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IOException("Test keytool timed out");
        }
        if (process.exitValue() != 0) {
            throw new IOException(
                    "Test keytool failed: " + Files.readString(logPath));
        }

        KeyStore store = KeyStore.getInstance("PKCS12");
        try (InputStream input = Files.newInputStream(storePath)) {
            store.load(input, PASSWORD);
        }
        return store;
    }
}