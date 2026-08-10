package com.daeho.cms.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class FlywayMigrationConfig {
  @Bean
  ApplicationRunner flywayMigrationRunner(DataSource dataSource) {
    return new FlywayMigrationRunner(dataSource);
  }

  private record FlywayMigrationRunner(DataSource dataSource) implements ApplicationRunner, Ordered {
    @Override
    public void run(ApplicationArguments args) {
      Flyway.configure()
          .dataSource(dataSource)
          .locations("classpath:db/migration")
          .load()
          .migrate();
    }

    @Override
    public int getOrder() {
      return Ordered.HIGHEST_PRECEDENCE;
    }
  }
}
