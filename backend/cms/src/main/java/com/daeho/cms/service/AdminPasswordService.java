package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ValidationFailedException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminPasswordService {
  private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
  private static final String FORMAT = "pbkdf2_sha256";
  private static final int ITERATIONS = 310_000;
  private static final int HASH_BITS = 256;
  private static final int SALT_BYTES = 16;
  private static final int MIN_PASSWORD_LENGTH = 12;
  private static final int MAX_PASSWORD_LENGTH = 128;
  private static final String BOOTSTRAP_VERSION = "bootstrap";

  private final AdminPasswordStore store;
  private final CmsProperties properties;
  private final SecureRandom random = new SecureRandom();

  public AdminPasswordService(AdminPasswordStore store, CmsProperties properties) {
    this.store = store;
    this.properties = properties;
  }

  public AdminPasswordStatus status() {
    return store.findPasswordRecord()
        .map(record -> new AdminPasswordStatus(true, record.updatedAt().toString()))
        .orElseGet(() -> new AdminPasswordStatus(false, BOOTSTRAP_VERSION));
  }

  public AdminPasswordVerification verify(String password) {
    var record = store.findPasswordRecord();
    if (record.isPresent()) {
      return new AdminPasswordVerification(
          verifyHash(password, record.get().passwordHash()),
          true,
          record.get().updatedAt().toString()
      );
    }

    return new AdminPasswordVerification(
        constantTimeEquals(normalizePassword(password), bootstrapPassword()),
        false,
        BOOTSTRAP_VERSION
    );
  }

  public AdminPasswordStatus changePassword(String currentPassword, String newPassword) {
    if (!verify(currentPassword).valid()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect.");
    }

    validateNewPassword(currentPassword, newPassword);
    store.savePasswordHash(hashPassword(newPassword));
    return status();
  }

  private void validateNewPassword(String currentPassword, String newPassword) {
    var normalizedNewPassword = normalizePassword(newPassword);
    var issues = new ArrayList<Map<String, String>>();

    if (!normalizedNewPassword.equals(newPassword == null ? "" : newPassword)) {
      issues.add(issue("newPassword", "Do not use leading or trailing spaces."));
    }
    if (normalizedNewPassword.length() < MIN_PASSWORD_LENGTH) {
      issues.add(issue("newPassword", "Use at least 12 characters."));
    }
    if (normalizedNewPassword.length() > MAX_PASSWORD_LENGTH) {
      issues.add(issue("newPassword", "Use at most 128 characters."));
    }
    if (!hasLowercase(normalizedNewPassword)) {
      issues.add(issue("newPassword", "Include a lowercase letter."));
    }
    if (!hasUppercase(normalizedNewPassword)) {
      issues.add(issue("newPassword", "Include an uppercase letter."));
    }
    if (!hasDigit(normalizedNewPassword)) {
      issues.add(issue("newPassword", "Include a number."));
    }
    if (!hasSymbol(normalizedNewPassword)) {
      issues.add(issue("newPassword", "Include a symbol."));
    }
    if (constantTimeEquals(normalizePassword(currentPassword), normalizedNewPassword)) {
      issues.add(issue("newPassword", "Use a different password."));
    }

    if (!issues.isEmpty()) {
      throw new ValidationFailedException(issues);
    }
  }

  private String hashPassword(String password) {
    var salt = new byte[SALT_BYTES];
    random.nextBytes(salt);
    var hash = pbkdf2(normalizePassword(password).toCharArray(), salt, ITERATIONS);
    return FORMAT + "$" + ITERATIONS + "$" + encode(salt) + "$" + encode(hash);
  }

  private boolean verifyHash(String password, String storedHash) {
    if (storedHash == null || storedHash.isBlank()) {
      return false;
    }

    var parts = storedHash.split("\\$");
    if (parts.length != 4 || !FORMAT.equals(parts[0])) {
      return false;
    }

    try {
      var iterations = Integer.parseInt(parts[1]);
      var salt = decode(parts[2]);
      var expectedHash = decode(parts[3]);
      var actualHash = pbkdf2(normalizePassword(password).toCharArray(), salt, iterations);
      return actualHash.length == expectedHash.length && MessageDigest.isEqual(actualHash, expectedHash);
    } catch (IllegalArgumentException error) {
      return false;
    }
  }

  private byte[] pbkdf2(char[] password, byte[] salt, int iterations) {
    try {
      var spec = new PBEKeySpec(password, salt, iterations, HASH_BITS);
      return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
    } catch (InvalidKeySpecException | java.security.NoSuchAlgorithmException error) {
      throw new IllegalStateException("Unable to hash admin password.", error);
    }
  }

  private String bootstrapPassword() {
    return properties.adminPassword() == null ? "" : properties.adminPassword();
  }

  private String normalizePassword(String password) {
    return password == null ? "" : password.trim();
  }

  private boolean constantTimeEquals(String value, String expected) {
    if (value == null || expected == null) {
      return false;
    }
    var valueBytes = value.getBytes(StandardCharsets.UTF_8);
    var expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
    return valueBytes.length == expectedBytes.length && MessageDigest.isEqual(valueBytes, expectedBytes);
  }

  private boolean hasLowercase(String value) {
    return value.codePoints().anyMatch(Character::isLowerCase);
  }

  private boolean hasUppercase(String value) {
    return value.codePoints().anyMatch(Character::isUpperCase);
  }

  private boolean hasDigit(String value) {
    return value.codePoints().anyMatch(Character::isDigit);
  }

  private boolean hasSymbol(String value) {
    return value.codePoints().anyMatch(ch -> !Character.isLetterOrDigit(ch));
  }

  private String encode(byte[] value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
  }

  private byte[] decode(String value) {
    return Base64.getUrlDecoder().decode(value);
  }

  private Map<String, String> issue(String path, String message) {
    return Map.of("path", path, "message", message);
  }

  public record AdminPasswordStatus(boolean configured, String version) {
  }

  public record AdminPasswordVerification(boolean valid, boolean configured, String version) {
  }
}
