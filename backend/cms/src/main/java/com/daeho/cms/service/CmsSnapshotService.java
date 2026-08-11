package com.daeho.cms.service;

import com.daeho.cms.repository.CmsRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CmsSnapshotService {
  private static final Set<String> LEGACY_OPTIONAL_TABLES = Set.of("cms_inquiry_statuses");
  private final CmsRepository repository;
  private final RequestValidation validation;

  public CmsSnapshotService(CmsRepository repository, RequestValidation validation) {
    this.repository = repository;
    this.validation = validation;
  }

  public Map<String, Object> exportSnapshot() {
    return repository.exportSnapshot();
  }

  public List<Map<String, Object>> counts(Map<String, Object> snapshot) {
    validate(snapshot);
    return repository.exportCounts(snapshot);
  }

  public void replace(Map<String, Object> snapshot) {
    validate(snapshot);
    repository.replaceFromSnapshot(snapshot);
  }

  public void validate(Map<String, Object> snapshot) {
    if (snapshot == null) {
      throw new IllegalArgumentException("Invalid CMS import file: root value must be an object.");
    }
    if (validation.intValue(snapshot.get("schemaVersion"), -1) != 1) {
      throw new IllegalArgumentException("Unsupported CMS export schemaVersion: " + snapshot.get("schemaVersion"));
    }
    var tables = validation.objectValue(snapshot.get("tables"));
    if (tables.isEmpty()) {
      throw new IllegalArgumentException("Invalid CMS import file: tables must be an object.");
    }
    var unexpectedTables = tables.keySet().stream()
        .filter(table -> !CmsRepository.EXPORT_TABLES.contains(table))
        .toList();
    if (!unexpectedTables.isEmpty()) {
      throw new IllegalArgumentException("Invalid CMS import file: unexpected tables " + String.join(", ", unexpectedTables));
    }
    for (var table : CmsRepository.EXPORT_TABLES) {
      if (!tables.containsKey(table)) {
        if (LEGACY_OPTIONAL_TABLES.contains(table)) {
          continue;
        }
        throw new IllegalArgumentException("Invalid CMS import file: " + table + " must be an array.");
      }
      var rows = validation.arrayValue(tables.get(table));
      for (var index = 0; index < rows.size(); index += 1) {
        var row = rows.get(index);
        if (!(row instanceof Map<?, ?> map)) {
          throw new IllegalArgumentException("Invalid CMS import file: " + table + "[" + index + "] must be an object.");
        }
        for (var entry : map.entrySet()) {
          if (!isScalar(entry.getValue())) {
            throw new IllegalArgumentException("Invalid CMS import file: " + table + "[" + index + "]." + entry.getKey() + " is not a scalar value.");
          }
        }
      }
    }
  }

  private boolean isScalar(Object value) {
    return value == null || value instanceof String || value instanceof Number || value instanceof Boolean;
  }
}
