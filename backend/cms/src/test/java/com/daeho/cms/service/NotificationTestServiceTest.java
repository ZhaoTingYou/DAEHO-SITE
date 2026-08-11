package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.daeho.cms.config.NotificationProperties;
import com.daeho.cms.repository.NotificationRepository;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class NotificationTestServiceTest {
  @Test
  void persistsKakaoVerificationOnlyAfterTheCmsTestIsAccepted() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(template());
    when(kakao.verificationFingerprint(
        "customer_in_progress_kakao_ko",
        "1",
        "KA01TP000001",
        "basic",
        "",
        template().get("body").toString()
    )).thenReturn("fingerprint-1");
    when(kakao.send(anyMap())).thenReturn(SolapiKakaoClient.SendResult.accepted("message-1"));
    when(kakao.getDeliveryStatus("message-1")).thenReturn(SolapiKakaoClient.DeliveryStatus.sent());

    var result = service(repository, kakao).send(
        "kakao",
        "01012345678",
        "customer_in_progress_kakao_ko"
    );

    assertEquals(true, result.get("success"));
    verify(repository).markKakaoTemplateVerified("customer_in_progress_kakao_ko", "fingerprint-1");
    verify(kakao).getDeliveryStatus("message-1");
  }

  @Test
  void failedKakaoTestDoesNotPersistVerification() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(template());
    when(kakao.send(anyMap())).thenReturn(SolapiKakaoClient.SendResult.failed("rejected"));

    service(repository, kakao).send("kakao", "01012345678", "customer_in_progress_kakao_ko");

    verify(repository, never()).markKakaoTemplateVerified(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.anyString()
    );
  }

  @Test
  void kakaoTestRendersTheHighlightedTitleFromTheSameTemplateVariables() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    var template = Map.<String, Object>of(
        "channel", "kakao",
        "locale", "ko",
        "inquiryStatus", "in_progress",
        "version", 1,
        "subject", "{{name}}님의 문의 {{inquiry_id}}",
        "body", "{{name}}님, 문의 {{inquiry_id}} 처리 중입니다.",
        "providerTemplateCode", "KA01TP000001",
        "kakaoTemplateType", "highlight",
        "approvalStatus", "approved"
    );
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(template);
    var sentJob = new java.util.concurrent.atomic.AtomicReference<Map<String, Object>>();
    when(kakao.send(anyMap())).thenAnswer(invocation -> {
      sentJob.set(new java.util.LinkedHashMap<>(invocation.getArgument(0)));
      return SolapiKakaoClient.SendResult.failed("expected test stop");
    });

    service(repository, kakao).send(
        "kakao",
        "01012345678",
        "customer_in_progress_kakao_ko"
    );

    assertEquals("highlight", sentJob.get().get("kakaoTemplateType"));
    assertEquals("DAEHO TEST님의 문의 TEST-INQUIRY", sentJob.get().get("subject"));
  }

  @Test
  void kakaoTestAndVerificationAreSerializedWithRestoreAndTemplateChanges() throws Exception {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    var dataSource = mock(DataSource.class);
    var connection = mock(Connection.class);
    var lock = mock(PreparedStatement.class);
    var unlock = mock(PreparedStatement.class);
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(template());
    when(kakao.verificationFingerprint(
        "customer_in_progress_kakao_ko",
        "1",
        "KA01TP000001",
        "basic",
        "",
        template().get("body").toString()
    )).thenReturn("fingerprint-1");
    when(kakao.send(anyMap())).thenReturn(SolapiKakaoClient.SendResult.accepted("message-1"));
    when(kakao.getDeliveryStatus("message-1")).thenReturn(SolapiKakaoClient.DeliveryStatus.sent());
    when(dataSource.getConnection()).thenReturn(connection);
    when(connection.prepareStatement("SELECT pg_advisory_lock(?)")).thenReturn(lock);
    when(connection.prepareStatement("SELECT pg_advisory_unlock(?)")).thenReturn(unlock);

    service(repository, kakao, dataSource).send(
        "kakao",
        "01012345678",
        "customer_in_progress_kakao_ko"
    );

    var ordered = inOrder(connection, kakao, repository);
    ordered.verify(connection).prepareStatement("SELECT pg_advisory_lock(?)");
    ordered.verify(kakao).send(anyMap());
    ordered.verify(repository).markKakaoTemplateVerified(
        "customer_in_progress_kakao_ko",
        "fingerprint-1"
    );
    ordered.verify(connection).prepareStatement("SELECT pg_advisory_unlock(?)");
  }

  @Test
  void requiresCurrentFinalDeliveryVerificationForAllThreeKoreanTemplates() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    when(kakao.configured()).thenReturn(true);
    var service = service(repository, kakao);
    var contacted = template("contacted", "KA01TP-C", 2);
    var progress = template("in_progress", "KA01TP-P", 3);
    var done = template("done", "KA01TP-D", 4);
    when(repository.getActiveTemplate("customer_contacted_kakao_ko")).thenReturn(contacted);
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(progress);
    when(repository.getActiveTemplate("customer_done_kakao_ko")).thenReturn(done);
    when(kakao.verificationFingerprint("customer_contacted_kakao_ko", "2", "KA01TP-C", "basic", "", contacted.get("body").toString()))
        .thenReturn("fingerprint-c");
    when(kakao.verificationFingerprint("customer_in_progress_kakao_ko", "3", "KA01TP-P", "basic", "", progress.get("body").toString()))
        .thenReturn("fingerprint-p");
    when(kakao.verificationFingerprint("customer_done_kakao_ko", "4", "KA01TP-D", "basic", "", done.get("body").toString()))
        .thenReturn("fingerprint-d");
    when(repository.kakaoTemplateVerified("customer_contacted_kakao_ko", "fingerprint-c")).thenReturn(true);
    when(repository.kakaoTemplateVerified("customer_in_progress_kakao_ko", "fingerprint-p")).thenReturn(true);
    when(repository.kakaoTemplateVerified("customer_done_kakao_ko", "fingerprint-d")).thenReturn(false);

    assertEquals(false, service.kakaoVerified());
  }

  @Test
  void reportsKakaoVerifiedOnlyWhenAllThreeCurrentTemplatesWereDelivered() {
    var repository = mock(NotificationRepository.class);
    var kakao = mock(SolapiKakaoClient.class);
    when(kakao.configured()).thenReturn(true);
    var contacted = template("contacted", "KA01TP-C", 2);
    var progress = template("in_progress", "KA01TP-P", 3);
    var done = template("done", "KA01TP-D", 4);
    when(repository.getActiveTemplate("customer_contacted_kakao_ko")).thenReturn(contacted);
    when(repository.getActiveTemplate("customer_in_progress_kakao_ko")).thenReturn(progress);
    when(repository.getActiveTemplate("customer_done_kakao_ko")).thenReturn(done);
    when(kakao.verificationFingerprint("customer_contacted_kakao_ko", "2", "KA01TP-C", "basic", "", contacted.get("body").toString()))
        .thenReturn("fingerprint-c");
    when(kakao.verificationFingerprint("customer_in_progress_kakao_ko", "3", "KA01TP-P", "basic", "", progress.get("body").toString()))
        .thenReturn("fingerprint-p");
    when(kakao.verificationFingerprint("customer_done_kakao_ko", "4", "KA01TP-D", "basic", "", done.get("body").toString()))
        .thenReturn("fingerprint-d");
    when(repository.kakaoTemplateVerified("customer_contacted_kakao_ko", "fingerprint-c")).thenReturn(true);
    when(repository.kakaoTemplateVerified("customer_in_progress_kakao_ko", "fingerprint-p")).thenReturn(true);
    when(repository.kakaoTemplateVerified("customer_done_kakao_ko", "fingerprint-d")).thenReturn(true);

    assertEquals(true, service(repository, kakao).kakaoVerified());
  }

  private NotificationTestService service(NotificationRepository repository, SolapiKakaoClient kakao) {
    return service(repository, kakao, null);
  }

  private NotificationTestService service(
      NotificationRepository repository,
      SolapiKakaoClient kakao,
      DataSource dataSource
  ) {
    var properties = new NotificationProperties(true, 1000, "", "", "", "", "");
    return new NotificationTestService(
        repository,
        mock(WorkspaceEmailSender.class),
        kakao,
        new NotificationTemplateRenderer(properties),
        dataSource
    );
  }

  private Map<String, Object> template() {
    return template("in_progress", "KA01TP000001", 1);
  }

  private Map<String, Object> template(String status, String providerCode, int version) {
    return Map.of(
        "channel", "kakao",
        "locale", "ko",
        "inquiryStatus", status,
        "version", version,
        "subject", "",
        "body", "{{name}}님, 문의 {{inquiry_id}} 처리 중입니다.",
        "providerTemplateCode", providerCode,
        "kakaoTemplateType", "basic",
        "approvalStatus", "approved"
    );
  }
}
