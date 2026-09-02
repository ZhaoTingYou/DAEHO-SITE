package com.daeho.customer.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcCustomerRepositoryTest {
  @Test
  void rateLimitQueriesBindPostgresTimestampsWithAnExplicitJdbcType() {
    var jdbc = new RecordingJdbcTemplate();
    var repository = new JdbcCustomerRepository(jdbc);
    var cutoff = Instant.parse("2026-09-02T00:00:00Z");

    repository.countRecentForPhone("+821012345678", cutoff);
    assertThat(jdbc.arguments[1]).isInstanceOf(OffsetDateTime.class);

    repository.countRecentForIp("fingerprint", cutoff);
    assertThat(jdbc.arguments[1]).isInstanceOf(OffsetDateTime.class);
  }

  private static final class RecordingJdbcTemplate extends JdbcTemplate {
    private Object[] arguments;

    @Override
    public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
      arguments = args;
      return requiredType.cast(0L);
    }
  }
}
