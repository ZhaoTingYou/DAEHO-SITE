CREATE FUNCTION daeho_clean_technique_section(source jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  items jsonb := COALESCE(source #> '{records,items}', '[]'::jsonb);
  clean_items jsonb := '[]'::jsonb;
  item jsonb;
  item_index integer;
  target_count integer;
BEGIN
  IF jsonb_typeof(items) <> 'array' THEN
    items := '[]'::jsonb;
  END IF;

  target_count := GREATEST(3, jsonb_array_length(items));

  FOR item_index IN 0..(target_count - 1) LOOP
    item := COALESCE(items -> item_index, '{}'::jsonb);
    clean_items := clean_items || jsonb_build_array(
      jsonb_build_object(
        'id', COALESCE(
          NULLIF(item ->> 'id', ''),
          'technique-record-' || lpad((item_index + 1)::text, 2, '0')
        ),
        'image', COALESCE(item ->> 'image', ''),
        'title', COALESCE(item ->> 'title', ''),
        'body', COALESCE(item ->> 'body', '')
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'hero', COALESCE(source -> 'hero', '{}'::jsonb),
    'records', jsonb_build_object('items', clean_items)
  );
END;
$$;

UPDATE cms_pages
SET
  content_ko = CASE
    WHEN page_key = 'mastery-technique'
      AND content_ko #> '{__groups,main,records}' IS NOT NULL
      THEN jsonb_set(
        content_ko,
        '{__groups,main}',
        daeho_clean_technique_section(content_ko #> '{__groups,main}'),
        true
      )
    WHEN page_key = 'mastery-technique'
      AND content_ko -> 'records' IS NOT NULL
      THEN daeho_clean_technique_section(content_ko)
    WHEN page_key = 'specialtyPages'
      AND content_ko -> 'techniqueRecords' IS NOT NULL
      THEN jsonb_set(
        content_ko,
        '{techniqueRecords}',
        daeho_clean_technique_section(content_ko -> 'techniqueRecords'),
        true
      )
    ELSE content_ko
  END,
  content_en = CASE
    WHEN page_key = 'mastery-technique'
      AND content_en #> '{__groups,main,records}' IS NOT NULL
      THEN jsonb_set(
        content_en,
        '{__groups,main}',
        daeho_clean_technique_section(content_en #> '{__groups,main}'),
        true
      )
    WHEN page_key = 'mastery-technique'
      AND content_en -> 'records' IS NOT NULL
      THEN daeho_clean_technique_section(content_en)
    WHEN page_key = 'specialtyPages'
      AND content_en -> 'techniqueRecords' IS NOT NULL
      THEN jsonb_set(
        content_en,
        '{techniqueRecords}',
        daeho_clean_technique_section(content_en -> 'techniqueRecords'),
        true
      )
    ELSE content_en
  END
WHERE page_key IN ('mastery-technique', 'specialtyPages');

DROP FUNCTION daeho_clean_technique_section(jsonb);
