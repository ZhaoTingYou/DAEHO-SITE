package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.repository.CmsRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaStorageService {
  public static final long MAX_IMAGE_UPLOAD_BYTES = 20L * 1024L * 1024L;
  private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp"
  );
  private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".gif", ".jpeg", ".jpg", ".png", ".webp");

  private final CmsProperties properties;
  private final CmsRepository repository;
  private final MediaObjectStorage objectStorage;

  public MediaStorageService(CmsProperties properties, CmsRepository repository, MediaObjectStorage objectStorage) {
    this.properties = properties;
    this.repository = repository;
    this.objectStorage = objectStorage;
  }

  public String uploadError(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      return "A file field is required.";
    }
    if (file.getSize() > MAX_IMAGE_UPLOAD_BYTES) {
      return "Image file is too large.";
    }
    if (!ALLOWED_MIME_TYPES.contains(file.getContentType())) {
      return "Unsupported image MIME type.";
    }
    if (!ALLOWED_EXTENSIONS.contains(extension(file.getOriginalFilename()))) {
      return "Unsupported image extension.";
    }
    return "";
  }

  public Map<String, Object> store(
      MultipartFile file,
      String preferredFilename,
      String altKo,
      String altEn
  ) throws IOException {
    var filename = publicFilename(file.getOriginalFilename(), preferredFilename);
    if (properties.usesS3Storage()) {
      return storeInObjectStorage(file, filename, altKo, altEn);
    }

    var uploadRoot = properties.uploadDir().toAbsolutePath().normalize();
    Files.createDirectories(uploadRoot);
    filename = uniqueFilename(uploadRoot, filename);
    var target = uploadRoot.resolve(filename).normalize();
    if (!target.startsWith(uploadRoot)) {
      throw new IOException("Invalid upload filename.");
    }
    file.transferTo(target);

    return repository.createMedia(Map.of(
        "filename", filename,
        "path", "uploads/" + filename,
        "url", properties.normalizedUploadBaseUrl() + "/" + filename,
        "mimeType", file.getContentType() == null ? "" : file.getContentType(),
        "sizeBytes", file.getSize(),
        "altKo", text(altKo),
        "altEn", text(altEn),
        "storageProvider", "local",
        "storageKey", filename
    ));
  }

  public void deleteStoredFile(Map<String, Object> media) throws IOException {
    var storageProvider = text(media.get("storageProvider"));
    if ("s3".equalsIgnoreCase(storageProvider)) {
      var storageKey = text(media.get("storageKey"));
      if (!storageKey.isBlank()) {
        objectStorage.deleteObject(storageKey);
      }
      return;
    }

    if (!"local".equals(storageProvider)) {
      return;
    }

    var storageKey = text(media.get("storageKey"));
    if (storageKey.isBlank()) {
      return;
    }

    var uploadRoot = properties.uploadDir().toAbsolutePath().normalize();
    var target = uploadRoot.resolve(storageKey).normalize();
    if (!target.startsWith(uploadRoot)) {
      throw new IOException("Invalid upload storage key.");
    }

    Files.deleteIfExists(target);
  }

  private Map<String, Object> storeInObjectStorage(
      MultipartFile file,
      String filename,
      String altKo,
      String altEn
  ) throws IOException {
    filename = uniqueObjectKey(filename);
    objectStorage.putPublicObject(filename, file);

    return repository.createMedia(Map.of(
        "filename", filename,
        "path", filename,
        "url", properties.normalizedS3PublicBaseUrl() + "/" + filename,
        "mimeType", file.getContentType() == null ? "" : file.getContentType(),
        "sizeBytes", file.getSize(),
        "altKo", text(altKo),
        "altEn", text(altEn),
        "storageProvider", "s3",
        "storageKey", filename
    ));
  }

  private String publicFilename(String originalName, String preferredFilename) {
    var original = text(originalName).isBlank() ? "asset" : originalName;
    var originalExtension = extension(original);
    var preferred = text(preferredFilename);
    var sourceName = preferred.isBlank() ? original : preferred;
    var sourceExtension = extension(sourceName);
    var baseName = sourceName.substring(0, sourceName.length() - sourceExtension.length())
        .toLowerCase()
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-|-$", "");
    if (baseName.length() > 60) {
      baseName = baseName.substring(0, 60).replaceAll("-$", "");
    }
    if (!preferred.isBlank() && !baseName.isBlank()) {
      return baseName + originalExtension;
    }
    return (baseName.isBlank() ? "asset" : baseName) + "-" + UUID.randomUUID().toString().substring(0, 8) + originalExtension;
  }

  private String uniqueFilename(Path uploadRoot, String filename) {
    if (!Files.exists(uploadRoot.resolve(filename).normalize())) {
      return filename;
    }

    var extension = extension(filename);
    var baseName = filename.substring(0, filename.length() - extension.length()).replaceAll("-$", "");

    for (var index = 0; index < 10; index++) {
      var candidate = baseName + "-" + UUID.randomUUID().toString().substring(0, 8) + extension;
      if (!Files.exists(uploadRoot.resolve(candidate).normalize())) {
        return candidate;
      }
    }

    return baseName + "-" + UUID.randomUUID() + extension;
  }

  private String uniqueObjectKey(String filename) throws IOException {
    if (!objectStorage.exists(filename)) {
      return filename;
    }

    var extension = extension(filename);
    var baseName = filename.substring(0, filename.length() - extension.length()).replaceAll("-$", "");

    for (var index = 0; index < 10; index++) {
      var candidate = baseName + "-" + UUID.randomUUID().toString().substring(0, 8) + extension;
      if (!objectStorage.exists(candidate)) {
        return candidate;
      }
    }

    return baseName + "-" + UUID.randomUUID() + extension;
  }

  private String extension(String filename) {
    var value = text(filename).toLowerCase();
    var index = value.lastIndexOf('.');
    return index >= 0 ? value.substring(index) : "";
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
