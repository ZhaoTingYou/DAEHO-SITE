package com.daeho.customer.controller;

import com.daeho.customer.security.InternalApiKey;
import com.daeho.customer.service.AccountRecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AccountRecoveryController {
  private final AccountRecoveryService recovery;
  private final InternalApiKey internalApiKey;

  public AccountRecoveryController(AccountRecoveryService recovery, InternalApiKey internalApiKey) {
    this.recovery = recovery;
    this.internalApiKey = internalApiKey;
  }

  @PostMapping("/v1/recovery/username/start")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public AccountRecoveryService.RecoveryStartResult startUsername(
      HttpServletRequest servletRequest,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @RequestBody AccountRecoveryService.UsernameRecoveryRequest request) {
    return recovery.startUsernameRecovery(request, clientIp(servletRequest), idempotencyKey);
  }

  @PostMapping("/v1/recovery/password/start")
  @ResponseStatus(HttpStatus.CREATED)
  public AccountRecoveryService.RecoveryStartResult startPassword(
      HttpServletRequest servletRequest,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @RequestBody AccountRecoveryService.PasswordRecoveryRequest request) {
    return recovery.startPasswordRecovery(request, clientIp(servletRequest), idempotencyKey);
  }

  @PostMapping("/v1/recovery/password/{id}/complete")
  public AccountRecoveryService.IssuedRecoveryGrant completePassword(
      @PathVariable UUID id,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @RequestBody CodeRequest request) {
    return recovery.completePasswordRecovery(id, request.code(), idempotencyKey);
  }

  @PostMapping("/v1/internal/recovery-grants/reserve")
  public AccountRecoveryService.PasswordRecoveryReservation reservePasswordReset(
      HttpServletRequest servletRequest, @RequestBody ResetOperationRequest request) {
    internalApiKey.require(servletRequest);
    return recovery.reservePasswordRecovery(
        request.recoveryGrant(), request.loginName(), request.operationKey());
  }

  @PostMapping("/v1/internal/recovery-grants/finalize")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void finalizePasswordReset(
      HttpServletRequest servletRequest, @RequestBody ResetOperationRequest request) {
    internalApiKey.require(servletRequest);
    recovery.completePasswordReset(
        request.recoveryGrant(), request.loginName(), request.operationKey());
  }

  @PostMapping("/v1/internal/recovery-grants/invalidate-sessions")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void invalidatePasswordResetSessions(
      HttpServletRequest servletRequest, @RequestBody ResetOperationRequest request) {
    internalApiKey.require(servletRequest);
    recovery.invalidatePasswordRecoverySessions(
        request.recoveryGrant(), request.loginName(), request.operationKey());
  }

  @PostMapping("/v1/internal/recovery-grants/release")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void releasePasswordReset(
      HttpServletRequest servletRequest, @RequestBody ResetOperationRequest request) {
    internalApiKey.require(servletRequest);
    recovery.releasePasswordReset(
        request.recoveryGrant(), request.loginName(), request.operationKey());
  }

  private String clientIp(HttpServletRequest request) {
    var forwarded = request.getHeader("x-forwarded-for");
    return forwarded == null ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
  }

  public record CodeRequest(String code) {}

  public record ResetOperationRequest(
      String recoveryGrant, String loginName, String operationKey) {}
}
