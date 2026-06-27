package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.CmsProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class MediaStorageServiceTest {
  @TempDir
  Path uploadDir;

  @Test
  void rejectsSvgUploads() {
    var service = service();
    var file = new MockMultipartFile(
        "file",
        "badge.svg",
        "image/svg+xml",
        "<svg />".getBytes()
    );

    assertFalse(service.uploadError(file).isBlank());
  }

  @Test
  void acceptsAllowedRasterUploads() {
    var service = service();
    var file = new MockMultipartFile(
        "file",
        "badge.png",
        "image/png",
        new byte[] {1, 2, 3}
    );

    assertTrue(service.uploadError(file).isBlank());
  }

  @Test
  void deletesLocalStoredFile() throws Exception {
    var service = service();
    Files.createDirectories(uploadDir);
    var target = uploadDir.resolve("old.png");
    Files.write(target, new byte[] {1, 2, 3});

    service.deleteStoredFile(Map.of(
        "storageProvider", "local",
        "storageKey", "old.png"
    ));

    assertFalse(Files.exists(target));
  }

  private MediaStorageService service() {
    return new MediaStorageService(new CmsProperties(
        "secret-key",
        "",
        "",
        false,
        uploadDir,
        "/uploads"
    ), null);
  }
}
