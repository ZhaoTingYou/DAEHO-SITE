package com.daeho.cms.config;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.daeho.cms.service.AdminPasswordHasher;
import com.daeho.cms.service.AdminPasswordStore;
import com.daeho.cms.service.AdminUserBootstrap;
import com.daeho.cms.service.AdminUserStore;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.core.Ordered;

class StartupRunnerOrderingTest {
  @Test
  void runsFlywayBeforeProvisioningTheOwner() {
    var migration = new FlywayMigrationConfig().flywayMigrationRunner(mock(DataSource.class));
    var ownerBootstrap = new AdminUserBootstrap(
        mock(AdminUserStore.class),
        mock(AdminPasswordStore.class),
        new AdminPasswordHasher(),
        new CmsProperties(
            "admin-key", "", "", false, Path.of("."), "/uploads", "Owner-Passw0rd!",
            "owner@example.com", "local", "", "", "", "", "", ""
        )
    );

    var orderedMigration = assertInstanceOf(Ordered.class, migration);
    var orderedBootstrap = assertInstanceOf(Ordered.class, ownerBootstrap);
    assertTrue(orderedMigration.getOrder() < orderedBootstrap.getOrder());
  }
}
