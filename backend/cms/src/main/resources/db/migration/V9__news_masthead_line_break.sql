UPDATE cms_pages
SET content_ko = CASE
  WHEN content_ko #>> '{__groups,main,masthead,title}' IN ('대호 제작 사례와 뉴스', 'NEWS')
    THEN jsonb_set(
      content_ko,
      '{__groups,main,masthead,title}',
      to_jsonb(E'대호 제작\n사례와 뉴스'::text),
      false
    )
  WHEN content_ko #>> '{masthead,title}' IN ('대호 제작 사례와 뉴스', 'NEWS')
    THEN jsonb_set(
      content_ko,
      '{masthead,title}',
      to_jsonb(E'대호 제작\n사례와 뉴스'::text),
      false
    )
  ELSE content_ko
END
WHERE page_key = 'news'
  AND (
    content_ko #>> '{__groups,main,masthead,title}' IN ('대호 제작 사례와 뉴스', 'NEWS')
    OR content_ko #>> '{masthead,title}' IN ('대호 제작 사례와 뉴스', 'NEWS')
  );
