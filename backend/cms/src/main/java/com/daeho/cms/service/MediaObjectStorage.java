package com.daeho.cms.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface MediaObjectStorage {
  boolean exists(String key) throws IOException;

  void putPublicObject(String key, MultipartFile file) throws IOException;

  void deleteObject(String key) throws IOException;
}
