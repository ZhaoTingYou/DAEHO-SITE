package com.daeho.customer.controller;

import com.daeho.customer.service.RegistrationGrantException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CustomerApiExceptionHandler {
  @ExceptionHandler(RegistrationGrantException.class)
  ResponseEntity<Map<String, String>> registrationGrant(RegistrationGrantException error) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "invalid_registration_grant", "message", error.getMessage()));
  }
}
