package com.daeho.cms.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class CustomerLinkAuthTest {
  private final CustomerLinkAuth auth = new CustomerLinkAuth("test-customer-service-key-with-entropy");

  @Test
  void acceptsCustomerLinkOnlyWithTheInternalServiceKey() {
    var request = new MockHttpServletRequest();
    request.addHeader("x-customer-service-key", "test-customer-service-key-with-entropy");
    request.addHeader("x-customer-id", "11111111-1111-1111-1111-111111111111");

    assertEquals("11111111-1111-1111-1111-111111111111", auth.customerId(request));
  }

  @Test
  void rejectsSpoofedCustomerHeaders() {
    var request = new MockHttpServletRequest();
    request.addHeader("x-customer-id", "11111111-1111-1111-1111-111111111111");

    var error = assertThrows(ResponseStatusException.class, () -> auth.customerId(request));
    assertEquals(401, error.getStatusCode().value());
  }

  @Test
  void continuesToAllowAnUnlinkedLegacyInquiry() {
    assertEquals("", auth.customerId(new MockHttpServletRequest()));
  }
}
