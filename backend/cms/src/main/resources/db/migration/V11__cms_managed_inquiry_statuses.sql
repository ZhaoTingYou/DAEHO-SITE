CREATE TABLE IF NOT EXISTS cms_inquiry_statuses (
  code text PRIMARY KEY,
  label_ko text NOT NULL,
  label_en text NOT NULL DEFAULT '',
  label_zh text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'slate'
    CHECK (color IN ('slate', 'blue', 'amber', 'green', 'red', 'purple')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code ~ '^[a-z][a-z0-9_]{0,31}$'),
  CHECK (length(btrim(label_ko)) BETWEEN 1 AND 80),
  CHECK (length(label_en) <= 80),
  CHECK (length(label_zh) <= 80)
);

INSERT INTO cms_inquiry_statuses (
  code, label_ko, label_en, label_zh, color, sort_order, is_active, is_system
) VALUES
  ('new', '신규', 'New', '新提交', 'slate', 0, true, true),
  ('contacted', '연락 완료', 'Contacted', '已联系', 'blue', 10, true, true),
  ('in_progress', '진행 중', 'In progress', '处理中', 'amber', 20, true, true),
  ('done', '처리 완료', 'Completed', '已完成', 'green', 30, true, true),
  ('spam', '스팸', 'Spam', '垃圾信息', 'red', 40, true, true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE cms_inquiries
  DROP CONSTRAINT IF EXISTS cms_inquiries_status_check;

ALTER TABLE cms_inquiry_status_events
  DROP CONSTRAINT IF EXISTS cms_inquiry_status_events_previous_status_check,
  DROP CONSTRAINT IF EXISTS cms_inquiry_status_events_next_status_check;

ALTER TABLE cms_inquiries
  ADD CONSTRAINT fk_cms_inquiries_status
    FOREIGN KEY (status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE;

ALTER TABLE cms_inquiry_status_events
  ADD CONSTRAINT fk_cms_inquiry_status_events_previous
    FOREIGN KEY (previous_status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE,
  ADD CONSTRAINT fk_cms_inquiry_status_events_next
    FOREIGN KEY (next_status) REFERENCES cms_inquiry_statuses(code) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cms_inquiry_statuses_active_sort
  ON cms_inquiry_statuses (is_active, sort_order, code);
