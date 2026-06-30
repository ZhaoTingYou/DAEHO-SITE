package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import java.io.IOException;
import java.net.URI;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class S3MediaObjectStorage implements MediaObjectStorage {
  private final CmsProperties properties;
  private S3Client client;

  public S3MediaObjectStorage(CmsProperties properties) {
    this.properties = properties;
  }

  @Override
  public boolean exists(String key) {
    try {
      client().headObject(HeadObjectRequest.builder()
          .bucket(requiredBucket())
          .key(key)
          .build());
      return true;
    } catch (NoSuchKeyException exception) {
      return false;
    } catch (S3Exception exception) {
      if (exception.statusCode() == 404) {
        return false;
      }
      throw exception;
    }
  }

  @Override
  public void putPublicObject(String key, MultipartFile file) throws IOException {
    client().putObject(
        PutObjectRequest.builder()
            .bucket(requiredBucket())
            .key(key)
            .contentType(file.getContentType())
            .contentLength(file.getSize())
            .acl(ObjectCannedACL.PUBLIC_READ)
            .build(),
        RequestBody.fromInputStream(file.getInputStream(), file.getSize())
    );
  }

  @Override
  public void deleteObject(String key) {
    client().deleteObject(DeleteObjectRequest.builder()
        .bucket(requiredBucket())
        .key(key)
        .build());
  }

  private S3Client client() {
    if (client == null) {
      client = createClient();
    }
    return client;
  }

  private S3Client createClient() {
    var accessKey = text(properties.s3AccessKeyId());
    var secretKey = text(properties.s3SecretAccessKey());
    if (accessKey.isBlank() || secretKey.isBlank()) {
      throw new IllegalStateException("CMS_S3_ACCESS_KEY_ID and CMS_S3_SECRET_ACCESS_KEY are required when CMS_STORAGE_PROVIDER=s3.");
    }

    var builder = S3Client.builder()
        .region(Region.of(properties.normalizedS3Region()))
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));

    var endpoint = text(properties.s3Endpoint());
    if (!endpoint.isBlank()) {
      builder.endpointOverride(URI.create(endpoint));
    }

    return builder.build();
  }

  private String requiredBucket() {
    var bucket = text(properties.s3Bucket());
    if (bucket.isBlank()) {
      throw new IllegalStateException("CMS_S3_BUCKET is required when CMS_STORAGE_PROVIDER=s3.");
    }
    return bucket;
  }

  private String text(String value) {
    return value == null ? "" : value.trim();
  }
}
