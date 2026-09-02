package com.daeho.customer.config;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomerFlywayConfig {
  @Bean
  ApplicationRunner customerFlywayMigrationRunner(
      DataSource dataSource,
      @Value("${spring.flyway.default-schema:customer_account}") String schema,
      @Value("${spring.flyway.table:customer_flyway_schema_history}") String table) {
    return args -> Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .createSchemas(true)
        .defaultSchema(schema)
        .schemas(schema)
        .table(table)
        .load()
        .migrate();
  }
}
