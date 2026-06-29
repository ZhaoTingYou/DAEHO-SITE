package com.daeho.cms.service;

import java.util.Optional;

public interface AdminPasswordStore {
  Optional<AdminPasswordRecord> findPasswordRecord();

  void savePasswordHash(String passwordHash);
}
