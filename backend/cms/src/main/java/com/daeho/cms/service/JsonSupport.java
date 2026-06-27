package com.daeho.cms.service;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.postgresql.util.PGobject;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Component
public class JsonSupport {
  private final JsonMapper mapper = new JsonMapper();

  public String stringify(Object value) {
    try {
      return mapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JacksonException error) {
      throw new IllegalArgumentException("Unable to serialize JSON value.", error);
    }
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> objectOrEmpty(String value) {
    if (value == null || value.isBlank()) {
      return Map.of();
    }
    try {
      var parsed = mapper.readValue(value, Map.class);
      return parsed instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    } catch (JacksonException error) {
      return Map.of();
    }
  }

  @SuppressWarnings("unchecked")
  public List<Object> arrayOrEmpty(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    try {
      var parsed = mapper.readValue(value, List.class);
      return parsed instanceof List<?> list ? (List<Object>) list : List.of();
    } catch (JacksonException error) {
      return List.of();
    }
  }

  public Object scalarJson(String value, Object fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    try {
      return mapper.readValue(value, Object.class);
    } catch (JacksonException error) {
      return fallback;
    }
  }

  public PGobject jsonb(Object value) {
    try {
      var object = new PGobject();
      object.setType("jsonb");
      object.setValue(stringify(value));
      return object;
    } catch (SQLException error) {
      throw new IllegalArgumentException("Unable to create jsonb value.", error);
    }
  }

  public PGobject jsonbFromExportValue(Object value, Object fallback) {
    if (value instanceof String stringValue) {
      return jsonb(scalarJson(stringValue, fallback));
    }
    return jsonb(value == null ? fallback : value);
  }

  public String exportJsonString(String value, Object fallback) {
    return stringify(scalarJson(value, fallback));
  }
}
