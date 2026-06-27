package com.deaho.cms.service;

import com.deaho.cms.config.CmsProperties;
import com.deaho.cms.repository.CmsRepository;
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
  public static final long MAX_IMAGE_UPLOAD_BYTES = 10L * 1024L * 1024L;
  private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp"
  );
  private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".gif", ".jpeg", ".jpg", ".png", ".webp");

  private final CmsProperties properties;
  private final CmsRepository repository;

  public MediaStorageService(CmsProperties properties, CmsRepository repository) {
    this.properties = properties;
    this.repository = repository;
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
    var uploadRoot = properties.uploadDir().toAbsolutePath().normalize();
    Files.createDirectories(uploadRoot);
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
    if (!"local".equals(text(media.get("storageProvider")))) {
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

  private String extension(String filename) {
    var value = text(filename).toLowerCase();
    var index = value.lastIndexOf('.');
    return index >= 0 ? value.substring(index) : "";
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }
}
