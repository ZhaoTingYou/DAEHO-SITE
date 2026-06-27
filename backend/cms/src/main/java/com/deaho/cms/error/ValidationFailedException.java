package com.deaho.cms.error;

import java.util.List;
import java.util.Map;

public class ValidationFailedException extends RuntimeException {
  private final List<Map<String, String>> issues;

  public ValidationFailedException(List<Map<String, String>> issues) {
    super("Validation failed");
    this.issues = issues;
  }

  public List<Map<String, String>> issues() {
    return issues;
  }
}
