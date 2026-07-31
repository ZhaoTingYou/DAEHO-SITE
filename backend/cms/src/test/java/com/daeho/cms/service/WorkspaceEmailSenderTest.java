package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.daeho.cms.config.CmsProperties;
import jakarta.mail.internet.MimeMessage;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mock.env.MockEnvironment;

class WorkspaceEmailSenderTest {
  @Test
  void sendsPlainTextAndHtmlAlternativesAsAMultipartEmail() throws Exception {
    var mailSender = new CapturingMailSender();
    var beans = new DefaultListableBeanFactory();
    beans.registerSingleton("mailSender", mailSender);
    var service = new WorkspaceEmailSender(
        properties(),
        new MockEnvironment().withProperty("spring.mail.host", "smtp.gmail.com"),
        beans.getBeanProvider(JavaMailSender.class)
    );

    var result = service.send(Map.of(
        "recipient", "inquiries@example.com",
        "subject", "DAEHO inquiry test",
        "renderedBody", "Plain text body"
    ));

    assertTrue(result.success(), result.errorMessage());
    assertNotNull(mailSender.sentMessage);
    assertTrue(mailSender.sentMessage.isMimeType("multipart/*"));
  }

  private CmsProperties properties() {
    return new CmsProperties(
        "admin-key",
        "",
        "dhofficial1988@gmail.com",
        false,
        Path.of("."),
        "/uploads",
        "admin-password",
        "local",
        "",
        "",
        "",
        "",
        "",
        ""
    );
  }

  private static final class CapturingMailSender extends JavaMailSenderImpl {
    private MimeMessage sentMessage;

    @Override
    public void send(MimeMessage mimeMessage) {
      try {
        mimeMessage.saveChanges();
        sentMessage = mimeMessage;
      } catch (Exception error) {
        throw new IllegalStateException(error);
      }
    }
  }
}
