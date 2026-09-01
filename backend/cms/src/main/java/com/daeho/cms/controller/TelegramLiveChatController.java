package com.daeho.cms.controller;

import com.daeho.cms.service.TelegramLiveChatCredentialService;
import com.daeho.cms.service.TelegramLiveChatService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TelegramLiveChatController {
  private final TelegramLiveChatCredentialService credentials;
  private final TelegramLiveChatService liveChat;

  public TelegramLiveChatController(
      TelegramLiveChatCredentialService credentials,
      TelegramLiveChatService liveChat
  ) {
    this.credentials = credentials;
    this.liveChat = liveChat;
  }

  @GetMapping("/api/cms/live-chat")
  public Map<String, Object> publicSettings() {
    return credentials.publicView();
  }

  @PostMapping("/api/telegram/live-chat/webhook")
  public Map<String, Object> webhook(
      @RequestBody Map<String, Object> update,
      @RequestHeader(name = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret
  ) {
    return Map.of("status", liveChat.handleWebhook(update, secret).status());
  }
}
