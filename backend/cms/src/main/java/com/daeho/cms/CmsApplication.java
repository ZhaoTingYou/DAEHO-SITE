package com.daeho.cms;

import com.daeho.cms.config.CmsProperties;
import com.daeho.cms.config.NotificationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({CmsProperties.class, NotificationProperties.class})
public class CmsApplication {
  public static void main(String[] args) {
    SpringApplication.run(CmsApplication.class, args);
  }
}
