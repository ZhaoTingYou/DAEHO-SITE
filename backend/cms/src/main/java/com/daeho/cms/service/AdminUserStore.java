package com.daeho.cms.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AdminUserStore {
  Optional<AdminUserRecord> findByEmail(String email);

  Optional<AdminUserRecord> findById(String id);

  List<AdminUserRecord> listUsers();

  long countOwners();

  long countActiveOwners();

  void create(AdminUserRecord user);

  void updateLastLogin(String id, Instant loggedInAt);

  void updatePassword(String id, String passwordHash, boolean mustChangePassword);

  void updateStatus(String id, String status);

  void updateExpiration(String id, Instant expiresAt);
}
