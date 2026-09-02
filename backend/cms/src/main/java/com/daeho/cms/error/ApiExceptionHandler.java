package com.daeho.cms.error;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import com.daeho.cms.service.TelegramLiveChatException;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ValidationFailedException.class)
  public ResponseEntity<Map<String, Object>> validation(ValidationFailedException error) {
    return ResponseEntity.badRequest().body(Map.of(
        "error", "Validation failed",
        "issues", error.issues()
    ));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> responseStatus(ResponseStatusException error) {
    var reason = error.getReason() == null ? error.getStatusCode().toString() : error.getReason();
    return ResponseEntity.status(error.getStatusCode()).body(Map.of("error", reason));
  }

  @ExceptionHandler(TelegramLiveChatException.class)
  public ResponseEntity<Map<String, String>> telegram(TelegramLiveChatException error) {
    var status = error.deliveryUncertain() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
    return ResponseEntity.status(status).body(Map.of(
        "error", "Live-chat upstream is temporarily unavailable."
    ));
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<Map<String, String>> missingParameter(MissingServletRequestParameterException error) {
    return ResponseEntity.badRequest().body(Map.of("error", message(error, "Missing request parameter.")));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> malformedJson(HttpMessageNotReadableException error) {
    return ResponseEntity.badRequest().body(Map.of(
        "error", "Invalid JSON request.",
        "issues", List.of(Map.of("path", "body", "message", "Expected valid JSON."))
    ));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> illegalArgument(IllegalArgumentException error) {
    return ResponseEntity.badRequest().body(Map.of("error", message(error, "Invalid request.")));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> generic(Exception error) {
    log.error("Unhandled CMS API error", error);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", message(error, "Internal server error.")));
  }

  private String message(Exception error, String fallback) {
    return error.getMessage() == null || error.getMessage().isBlank() ? fallback : error.getMessage();
  }
}
