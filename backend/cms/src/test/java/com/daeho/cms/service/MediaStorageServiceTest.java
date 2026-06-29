package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.repository.CmsRepository;
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

  @Test
  void storeCreatesAUniqueUrlWhenPreferredFilenameAlreadyExists() throws Exception {
    var repository = mock(CmsRepository.class);
    when(repository.createMedia(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var service = service(repository);
    Files.createDirectories(uploadDir);
    var existing = uploadDir.resolve("hero.png");
    Files.write(existing, new byte[] {9, 9, 9});
    var file = new MockMultipartFile(
        "file",
        "hero.png",
        "image/png",
        new byte[] {1, 2, 3}
    );

    var item = service.store(file, "hero.png", "", "");
    var filename = item.get("filename").toString();

    assertNotEquals("hero.png", filename);
    assertTrue(filename.matches("hero-[a-z0-9]{8}\\.png"));
    assertTrue(Files.exists(uploadDir.resolve(filename)));
    assertArrayEquals(new byte[] {9, 9, 9}, Files.readAllBytes(existing));
  }

  private MediaStorageService service() {
    return service(null);
  }

  private MediaStorageService service(CmsRepository repository) {
    return new MediaStorageService(new CmsProperties(
        "secret-key",
        "",
        "",
        false,
        uploadDir,
        "/uploads",
        ""
    ), repository);
  }
}
