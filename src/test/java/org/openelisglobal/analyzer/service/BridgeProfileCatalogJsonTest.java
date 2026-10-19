package org.openelisglobal.analyzer.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;

public class BridgeProfileCatalogJsonTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    public void acceptsCatalogWithEmptyIssues() throws Exception {
        String json = """
                {
                  "schemaVersion": "1.0",
                  "catalogFingerprint": "test-fingerprint",
                  "profiles": [],
                  "issues": []
                }
                """;

        BridgeProfileCatalog catalog =
                mapper.readValue(json, BridgeProfileCatalog.class);

        assertEquals("1.0", catalog.schemaVersion());
        assertTrue(catalog.profiles().isEmpty());
        assertTrue(catalog.issues().isEmpty());
    }

    @Test
    public void acceptsOlderCatalogWithoutIssues() throws Exception {
        String json = """
                {
                  "schemaVersion": "1.0",
                  "catalogFingerprint": "test-fingerprint",
                  "profiles": []
                }
                """;

        BridgeProfileCatalog catalog =
                mapper.readValue(json, BridgeProfileCatalog.class);

        assertEquals("1.0", catalog.schemaVersion());
        assertTrue(catalog.issues().isEmpty());
    }
}