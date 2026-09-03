package com.daeho.customer.controller;

import com.daeho.customer.service.AccountRecoveryException;
import com.daeho.customer.service.RegistrationGrantException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CustomerApiExceptionHandler {
  @ExceptionHandler(AccountRecoveryException.class)
  ResponseEntity<Map<String, String>> accountRecovery(AccountRecoveryException error) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", error.code(), "message", "Account recovery is invalid or expired"));
  }

  @ExceptionHandler(RegistrationGrantException.class)
  ResponseEntity<Map<String, String>> registrationGrant(RegistrationGrantException error) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", error.code(), "message", error.getMessage()));
  }
}
