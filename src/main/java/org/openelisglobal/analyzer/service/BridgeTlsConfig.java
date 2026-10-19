package org.openelisglobal.analyzer.service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.util.Arrays;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Dedicated client identity and server trust for OpenELIS-to-Bridge requests.
 */
@Component
public class BridgeTlsConfig {

    @Value("${analyzer.bridge.client-keystore:/etc/openelis-global/bridge-client/client.p12}")
    private String clientKeystore;

    @Value("${analyzer.bridge.client-password-file:/etc/openelis-global/bridge-client/client.password}")
    private String passwordFile;

    @Value("${analyzer.bridge.truststore:/etc/openelis-global/bridge-client/truststore.p12}")
    private String truststore;

    public SSLContext sslContext() throws Exception {
        char[] password = Files.readString(Path.of(passwordFile))
                .stripTrailing().toCharArray();

        try {
            KeyStore identity = loadStore(clientKeystore, password);
            boolean hasPrivateKey = false;

            var aliases = identity.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                if (identity.entryInstanceOf(alias, KeyStore.PrivateKeyEntry.class)) {
                    hasPrivateKey = true;
                    for (var certificate : identity.getCertificateChain(alias)) {
                        ((java.security.cert.X509Certificate) certificate)
                                .checkValidity();
                    }
                }
            }

            if (!hasPrivateKey) {
                throw new IllegalStateException(
                        "Bridge client keystore contains no private-key entry");
            }

            KeyManagerFactory keys = KeyManagerFactory.getInstance(
                    KeyManagerFactory.getDefaultAlgorithm());
            keys.init(identity, password);

            KeyStore trustedCertificates = loadStore(truststore, password);
            if (trustedCertificates.size() == 0) {
                throw new IllegalStateException("Bridge truststore is empty");
            }

            TrustManagerFactory trust = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm());
            trust.init(trustedCertificates);

            SSLContext context = SSLContext.getInstance("TLS");
            context.init(keys.getKeyManagers(), trust.getTrustManagers(), null);
            return context;
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    private static KeyStore loadStore(String path, char[] password)
            throws Exception {
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (InputStream input = Files.newInputStream(Path.of(path))) {
            store.load(input, password);
        }
        return store;
    }
}