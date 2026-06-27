package com.deaho.cms;

import com.deaho.cms.config.CmsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(CmsProperties.class)
public class CmsApplication {
  public static void main(String[] args) {
    SpringApplication.run(CmsApplication.class, args);
  }
}
