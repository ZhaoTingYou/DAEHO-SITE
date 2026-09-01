package com.daeho.cms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class TelegramLiveChatFlowTest {
  private final TelegramLiveChatFlow flow = new TelegramLiveChatFlow();

  @Test
  void registersNameContactAndContentBeforeOpeningAConversation() {
    var started = flow.decide(
        TelegramLiveChatFlow.Session.empty(),
        TelegramLiveChatFlow.Input.start("ko")
    );
    assertEquals("awaiting_consent", started.session().state());
    assertEquals(TelegramLiveChatFlow.Action.SHOW_CONSENT, started.action());

    var consented = flow.decide(started.session(), TelegramLiveChatFlow.Input.consent(true));
    assertEquals("awaiting_name", consented.session().state());
    assertEquals(TelegramLiveChatFlow.Action.ASK_NAME, consented.action());

    var named = flow.decide(consented.session(), TelegramLiveChatFlow.Input.text("홍길동"));
    assertEquals("awaiting_contact", named.session().state());
    assertEquals("홍길동", named.session().customerName());
    assertEquals(TelegramLiveChatFlow.Action.ASK_CONTACT, named.action());

    var contacted = flow.decide(named.session(), TelegramLiveChatFlow.Input.sharedPhone("01012345678"));
    assertEquals("awaiting_content", contacted.session().state());
    assertEquals("01012345678", contacted.session().customerContact());
    assertEquals(TelegramLiveChatFlow.Action.ASK_CONTENT, contacted.action());

    var registered = flow.decide(
        contacted.session(), TelegramLiveChatFlow.Input.text("반지 제작 상담을 받고 싶습니다.")
    );
    assertEquals("active", registered.session().state());
    assertEquals(TelegramLiveChatFlow.Action.OPEN_CONVERSATION, registered.action());
    assertTrue(registered.createInquiry());
  }

  @Test
  void acceptsAnEmailButKeepsInvalidContactInRegistration() {
    var awaitingContact = new TelegramLiveChatFlow.Session(
        "awaiting_contact",
        "en",
        "Alex Kim",
        ""
    );

    var invalid = flow.decide(awaitingContact, TelegramLiveChatFlow.Input.text("123"));
    assertEquals("awaiting_contact", invalid.session().state());
    assertEquals(TelegramLiveChatFlow.Action.INVALID_CONTACT, invalid.action());

    var contacted = flow.decide(
        awaitingContact,
        TelegramLiveChatFlow.Input.text("alex@example.com")
    );
    assertEquals("awaiting_content", contacted.session().state());
    assertEquals("alex@example.com", contacted.session().customerContact());
  }
}
