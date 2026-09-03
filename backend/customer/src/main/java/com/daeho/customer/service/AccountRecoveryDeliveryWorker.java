package com.daeho.customer.service;

import com.daeho.customer.repository.AccountRecoveryStore;
import com.daeho.customer.repository.CustomerProfileStore;
import com.daeho.customer.sms.SmsDeliveryException;
import com.daeho.customer.sms.SmsSender;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import java.util.function.Supplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AccountRecoveryDeliveryWorker {
  private static final Logger log = LoggerFactory.getLogger(AccountRecoveryDeliveryWorker.class);
  private static final Duration DELIVERY_LEASE = Duration.ofMinutes(1);
  private final AccountRecoveryStore attempts;
  private final CustomerProfileStore profiles;
  private final SmsSender sender;
  private final Clock clock;
  private final byte[] hmacSecret;
  private final Supplier<String> codeSupplier;
  private final TransactionTemplate transactions;

  @Autowired
  public AccountRecoveryDeliveryWorker(
      AccountRecoveryStore attempts,
      CustomerProfileStore profiles,
      SmsSender sender,
      Clock clock,
      @Value("${customer.verification-hmac-secret:}") String hmacSecret,
      PlatformTransactionManager transactionManager) {
    this(attempts, profiles, sender, clock, hmacSecret, randomCodeSupplier(),
        new TransactionTemplate(transactionManager));
  }

  AccountRecoveryDeliveryWorker(
      AccountRecoveryStore attempts,
      CustomerProfileStore profiles,
      SmsSender sender,
      Clock clock,
      String hmacSecret,
      Supplier<String> codeSupplier) {
    this(attempts, profiles, sender, clock, hmacSecret, codeSupplier, null);
  }

  private AccountRecoveryDeliveryWorker(
      AccountRecoveryStore attempts,
      CustomerProfileStore profiles,
      SmsSender sender,
      Clock clock,
      String hmacSecret,
      Supplier<String> codeSupplier,
      TransactionTemplate transactions) {
    this.attempts = attempts;
    this.profiles = profiles;
    this.sender = sender;
    this.clock = clock;
    this.hmacSecret = hmacSecret.getBytes(StandardCharsets.UTF_8);
    this.codeSupplier = codeSupplier;
    this.transactions = transactions;
  }

  @Scheduled(
      fixedDelayString = "${customer.recovery-delivery-delay-ms:500}",
      initialDelayString = "${customer.recovery-delivery-initial-delay-ms:500}")
  public void deliverNext() {
    var prepared = inTransaction(this::claimNext);
    if (prepared == null) return;
    var attempt = prepared.delivery().attempt();
    try {
      var receipt = sender.send(
          prepared.delivery().phone(), message(attempt, prepared.code()));
      inTransaction(() -> attempts.markRecoverySent(
          attempt.id(), receipt.providerMessageId(), clock.instant()));
    } catch (SmsDeliveryException error) {
      inTransaction(() -> attempts.markRecoveryDeliveryUnknown(attempt.id(), clock.instant()));
      log.warn("Account recovery SMS delivery outcome is unknown for attempt {} purpose {} ({})",
          attempt.id(), attempt.purpose(), error.getClass().getSimpleName());
      return;
    } catch (RuntimeException error) {
      inTransaction(() -> attempts.markRecoveryDeliveryUnknown(attempt.id(), clock.instant()));
      log.warn("Account recovery SMS outcome is unknown for attempt {} purpose {} ({})",
          attempt.id(), attempt.purpose(), error.getClass().getSimpleName());
      return;
    }
    if ("username".equals(attempt.purpose())) {
      try {
        inTransaction(() -> profiles.recordAudit(
            attempt.customerId(), "username_recovery_sent", "account-recovery"));
      } catch (RuntimeException error) {
        log.warn("Account recovery audit failed for attempt {} purpose {} ({})",
            attempt.id(), attempt.purpose(), error.getClass().getSimpleName());
      }
    }
  }

  private PreparedDelivery claimNext() {
    var now = clock.instant();
    attempts.expireStaleRecoveryDeliveries(now);
    var delivery = attempts.findNextPendingRecovery(now);
    if (delivery == null) return null;
    var attempt = delivery.attempt();
    var code = "";
    if ("password".equals(attempt.purpose())) {
      code = codeSupplier.get();
      if (code == null || !code.matches("\\d{6}")) {
        throw new IllegalStateException("Recovery code generator returned an invalid value");
      }
      attempts.prepareRecoveryChallenge(
          attempt.id(), challengeHash(attempt.id().toString(), code), now);
    }
    attempts.markRecoverySending(attempt.id(), now.plus(DELIVERY_LEASE), now);
    return new PreparedDelivery(delivery, code);
  }

  private <T> T inTransaction(Supplier<T> work) {
    return transactions == null ? work.get() : transactions.execute(status -> work.get());
  }

  private void inTransaction(Runnable work) {
    inTransaction(() -> {
      work.run();
      return null;
    });
  }

  private String message(AccountRecoveryAttempt attempt, String code) {
    if ("username".equals(attempt.purpose())) {
      return "en".equals(attempt.locale())
          ? "[DAEHO] Your username is %s.".formatted(attempt.loginName())
          : "[DAEHO] 가입 아이디는 %s 입니다.".formatted(attempt.loginName());
    }
    return "en".equals(attempt.locale())
        ? "[DAEHO] Password reset code %s (valid 10 min)".formatted(code)
        : "[DAEHO] 비밀번호 재설정 인증번호 %s (10분간 유효)".formatted(code);
  }

  private String challengeHash(String id, String code) {
    try {
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(
          (id + ":" + code).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception error) {
      throw new IllegalStateException(error);
    }
  }

  private static Supplier<String> randomCodeSupplier() {
    var random = new SecureRandom();
    return () -> String.format("%06d", random.nextInt(1_000_000));
  }

  private record PreparedDelivery(AccountRecoveryDelivery delivery, String code) {}
}
