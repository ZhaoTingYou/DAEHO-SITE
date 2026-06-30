package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.repository.CmsRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

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
    var service = service(repository, new MemoryMediaObjectStorage());
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

  @Test
  void storeWritesToObjectStorageWhenS3ProviderIsEnabled() throws Exception {
    var repository = mock(CmsRepository.class);
    when(repository.createMedia(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var objectStorage = new MemoryMediaObjectStorage();
    var service = s3Service(repository, objectStorage);
    var file = new MockMultipartFile(
        "file",
        "Hero Ring.PNG",
        "image/png",
        new byte[] {1, 2, 3}
    );

    var item = service.store(file, "Hero Ring.PNG", "ko alt", "en alt");

    assertEquals("hero-ring.png", item.get("filename"));
    assertEquals("hero-ring.png", item.get("path"));
    assertEquals("https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com/hero-ring.png", item.get("url"));
    assertEquals("s3", item.get("storageProvider"));
    assertEquals("hero-ring.png", item.get("storageKey"));
    assertArrayEquals(new byte[] {1, 2, 3}, objectStorage.objects.get("hero-ring.png"));
    assertFalse(Files.exists(uploadDir.resolve("hero-ring.png")));
  }

  @Test
  void storeCreatesAUniqueObjectKeyWhenPreferredS3FilenameAlreadyExists() throws Exception {
    var repository = mock(CmsRepository.class);
    when(repository.createMedia(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var objectStorage = new MemoryMediaObjectStorage();
    objectStorage.objects.put("hero.png", new byte[] {9, 9, 9});
    var service = s3Service(repository, objectStorage);
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
    assertArrayEquals(new byte[] {9, 9, 9}, objectStorage.objects.get("hero.png"));
    assertArrayEquals(new byte[] {1, 2, 3}, objectStorage.objects.get(filename));
  }

  @Test
  void deletesObjectStorageMedia() throws Exception {
    var objectStorage = new MemoryMediaObjectStorage();
    objectStorage.objects.put("old.png", new byte[] {1, 2, 3});
    var service = service(null, objectStorage);

    service.deleteStoredFile(Map.of(
        "storageProvider", "s3",
        "storageKey", "old.png"
    ));

    assertFalse(objectStorage.objects.containsKey("old.png"));
  }

  private MediaStorageService service() {
    return service(null);
  }

  private MediaStorageService service(CmsRepository repository) {
    return service(repository, new MemoryMediaObjectStorage());
  }

  private MediaStorageService service(CmsRepository repository, MediaObjectStorage objectStorage) {
    return new MediaStorageService(new CmsProperties(
        "secret-key",
        "",
        "",
        false,
        uploadDir,
        "/uploads",
        "",
        "local",
        "",
        "",
        "",
        "",
        "",
        ""
    ), repository, objectStorage);
  }

  private MediaStorageService s3Service(CmsRepository repository, MediaObjectStorage objectStorage) {
    return new MediaStorageService(new CmsProperties(
        "secret-key",
        "",
        "",
        false,
        uploadDir,
        "/uploads",
        "",
        "s3",
        "daeho-prod-media",
        "ap-northeast-2",
        "",
        "https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com",
        "test-access-key",
        "test-secret-key"
    ), repository, objectStorage);
  }

  private static class MemoryMediaObjectStorage implements MediaObjectStorage {
    private final Map<String, byte[]> objects = new HashMap<>();

    @Override
    public boolean exists(String key) {
      return objects.containsKey(key);
    }

    @Override
    public void putPublicObject(String key, MultipartFile file) throws IOException {
      objects.put(key, file.getBytes());
    }

    @Override
    public void deleteObject(String key) {
      objects.remove(key);
    }
  }
}
