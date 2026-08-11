package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import com.daeho.cms.repository.CmsRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CmsSnapshotServiceTest {
  private final CmsSnapshotService snapshots = new CmsSnapshotService(
      mock(CmsRepository.class),
      new RequestValidation()
  );

  @Test
  void acceptsLegacyV10SnapshotWithoutInquiryStatusCatalog() {
    assertDoesNotThrow(() -> snapshots.validate(snapshotWithout("cms_inquiry_statuses")));
  }

  @Test
  void stillRequiresLegacyCoreTables() {
    assertThrows(
        IllegalArgumentException.class,
        () -> snapshots.validate(snapshotWithout("cms_inquiries"))
    );
  }

  private Map<String, Object> snapshotWithout(String omittedTable) {
    var tables = new LinkedHashMap<String, Object>();
    for (var table : CmsRepository.EXPORT_TABLES) {
      if (!table.equals(omittedTable)) {
        tables.put(table, List.of());
      }
    }
    return Map.of("schemaVersion", 1, "tables", tables);
  }
}
