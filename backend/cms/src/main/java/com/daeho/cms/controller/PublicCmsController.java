package com.daeho.cms.controller;

import com.daeho.cms.repository.CmsRepository;
import com.daeho.cms.service.RequestValidation;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/cms")
public class PublicCmsController {
  private final CmsRepository repository;
  private final RequestValidation validation;

  public PublicCmsController(CmsRepository repository, RequestValidation validation) {
    this.repository = repository;
    this.validation = validation;
  }

  @GetMapping("/pages/{pageKey}")
  public Map<String, Object> page(@PathVariable String pageKey, @RequestParam(defaultValue = "ko") String locale) {
    var resolvedLocale = validation.localeOrDefault(locale);
    var page = repository.getPage(pageKey);
    if (page == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page not found");
    }
    var content = validation.objectValue(page.get("content"));
    var seo = validation.objectValue(page.get("seo"));
    return Map.of(
        "pageKey", page.get("pageKey"),
        "section", page.get("section"),
        "locale", resolvedLocale,
        "content", content.getOrDefault(resolvedLocale, Map.of()),
        "seo", seo.getOrDefault(resolvedLocale, Map.of()),
        "updatedAt", page.get("updatedAt")
    );
  }

  @GetMapping("/news")
  public Map<String, Object> news(@RequestParam(defaultValue = "ko") String locale) {
    var resolvedLocale = validation.localeOrDefault(locale);
    return Map.of("locale", resolvedLocale, "items", repository.listPublicNews(resolvedLocale));
  }

  @GetMapping("/news/{slug}")
  public Map<String, Object> newsItem(@PathVariable String slug, @RequestParam(defaultValue = "ko") String locale) {
    var resolvedLocale = validation.localeOrDefault(locale);
    var item = repository.getPublicNews(slug, resolvedLocale);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found");
    }
    return Map.of("locale", resolvedLocale, "item", item);
  }

  @GetMapping("/collections")
  public Map<String, Object> collections(@RequestParam(defaultValue = "ko") String locale) {
    var resolvedLocale = validation.localeOrDefault(locale);
    return Map.of("locale", resolvedLocale, "items", repository.listPublicCollections(resolvedLocale));
  }

  @GetMapping("/collections/{slug}")
  public Map<String, Object> collectionItem(@PathVariable String slug, @RequestParam(defaultValue = "ko") String locale) {
    var resolvedLocale = validation.localeOrDefault(locale);
    var item = repository.getPublicCollection(slug, resolvedLocale);
    if (item == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection item not found");
    }
    return Map.of("locale", resolvedLocale, "item", item);
  }
}
