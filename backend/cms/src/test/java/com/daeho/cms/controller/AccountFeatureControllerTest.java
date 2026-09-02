package com.daeho.cms.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.error.ApiExceptionHandler;
import com.daeho.cms.repository.AccountFeatureRepository;
import com.daeho.cms.security.AdminAuth;
import java.nio.file.Path;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AccountFeatureControllerTest {
  private static final String ADMIN_KEY = "test-admin-key";

  private AccountFeatureRepository repository;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    repository = mock(AccountFeatureRepository.class);
    var auth = new AdminAuth(new CmsProperties(
        ADMIN_KEY, "", "", false, Path.of("."), "/uploads", "", "", "local",
        "", "", "", "", "", ""
    ));
    mvc = MockMvcBuilders.standaloneSetup(new AccountFeatureController(auth, repository))
        .setControllerAdvice(new ApiExceptionHandler())
        .build();
  }

  @Test
  void exposesTheRuntimeAccountFlagsWithoutAdminCredentials() throws Exception {
    when(repository.get()).thenReturn(new AccountFeatureRepository.Settings(
        false, false, "", Instant.parse("2026-09-02T08:00:00Z")
    ));

    mvc.perform(get("/api/cms/account-features"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.customerAccountsEnabled").value(false))
        .andExpect(jsonPath("$.inquiryAccountRequired").value(false))
        .andExpect(jsonPath("$.updatedBy").doesNotExist());
  }

  @Test
  void letsAnAuthenticatedCmsOwnerUpdateBothFlagsAndRecordsTheActor() throws Exception {
    when(repository.update(true, false, "owner-1")).thenReturn(
        new AccountFeatureRepository.Settings(
            true, false, "owner-1", Instant.parse("2026-09-02T08:01:00Z")
        )
    );

    mvc.perform(put("/api/admin/account-features")
            .header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", "owner-1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"customerAccountsEnabled":true,"inquiryAccountRequired":false}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.customerAccountsEnabled").value(true))
        .andExpect(jsonPath("$.inquiryAccountRequired").value(false))
        .andExpect(jsonPath("$.updatedBy").value("owner-1"));

    verify(repository).update(true, false, "owner-1");
  }

  @Test
  void rejectsMandatoryInquiryLoginWhenCustomerAccountsAreOff() throws Exception {
    mvc.perform(put("/api/admin/account-features")
            .header("x-admin-api-key", ADMIN_KEY)
            .header("x-admin-user-id", "owner-1")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"customerAccountsEnabled":false,"inquiryAccountRequired":true}
                """))
        .andExpect(status().isBadRequest());

    verify(repository, never()).update(false, true, "owner-1");
  }

  @Test
  void protectsTheCmsManagementEndpoint() throws Exception {
    mvc.perform(get("/api/admin/account-features"))
        .andExpect(status().isUnauthorized());
  }
}
