package com.daeho.cms.service;

import com.daeho.cms.config.CmsProperties;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceEmailSender {
  private final CmsProperties properties;
  private final Environment environment;
  private final ObjectProvider<JavaMailSender> mailSender;

  public WorkspaceEmailSender(
      CmsProperties properties,
      Environment environment,
      ObjectProvider<JavaMailSender> mailSender
  ) {
    this.properties = properties;
    this.environment = environment;
    this.mailSender = mailSender;
  }

  public DeliveryResult send(Map<String, Object> job) {
    if (!configured()) {
      return DeliveryResult.failed("Google Workspace SMTP Relay is not configured.");
    }
    try {
      var sender = mailSender.getObject();
      var message = sender.createMimeMessage();
      var helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(text(properties.smtpFrom()));
      helper.setTo(text(job.get("recipient")));
      helper.setSubject(text(job.get("subject")));
      helper.setText(text(job.get("renderedBody")), renderHtml(text(job.get("renderedBody"))));
      sender.send(message);
      return DeliveryResult.sent(messageId(message));
    } catch (Exception error) {
      return DeliveryResult.failed(error.getMessage() == null ? "Unknown email error." : error.getMessage());
    }
  }

  public boolean configured() {
    return !text(properties.smtpFrom()).isBlank()
        && !text(environment.getProperty("spring.mail.host")).isBlank();
  }

  private String renderHtml(String body) {
    return """
        <!doctype html>
        <html>
          <body style="margin:0;background:#f5f5f3;padding:24px;color:#101827;font-family:Arial,'Noto Sans KR',sans-serif">
            <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;padding:32px">
              <div style="margin-bottom:24px;font-family:Georgia,serif;font-size:24px;letter-spacing:.18em">DAEHO</div>
              <div style="font-size:15px;line-height:1.8;white-space:pre-wrap">%s</div>
            </div>
          </body>
        </html>
        """.formatted(escapeHtml(body));
  }

  private String escapeHtml(String value) {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#039;");
  }

  private String messageId(MimeMessage message) {
    try {
      var id = message.getMessageID();
      return id == null ? "" : id;
    } catch (Exception ignored) {
      return "";
    }
  }

  private String text(Object value) {
    return value == null ? "" : value.toString().trim();
  }

  public record DeliveryResult(boolean success, String providerMessageId, String errorMessage) {
    public static DeliveryResult sent(String providerMessageId) {
      return new DeliveryResult(true, providerMessageId == null ? "" : providerMessageId, "");
    }

    public static DeliveryResult failed(String errorMessage) {
      return new DeliveryResult(false, "", errorMessage == null ? "Unknown email error." : errorMessage);
    }
  }
}
