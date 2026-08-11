-- SOLAPI uses three approved Korean templates. Provider IDs are entered through
-- the CMS after deployment so no account-specific value is committed to Git.
DELETE FROM cms_notification_templates
WHERE template_key IN (
  'customer_contacted_kakao_en',
  'customer_in_progress_kakao_en',
  'customer_done_kakao_en'
)
  AND provider_template_code = ''
  AND approval_status = 'draft'
  AND is_active = false;

INSERT INTO cms_notification_templates (
  id, template_key, channel, audience, event_type, inquiry_status, locale, version,
  subject, body, provider_template_code, approval_status, is_active
) VALUES
  (
    'template-customer-contacted-kakao-ko-v2', 'customer_contacted_kakao_ko', 'kakao', 'customer',
    'status_changed', 'contacted', 'ko', 2, '',
    E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 문의 담당자가 고객님께 연락드렸습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 연락 완료\n\n감사합니다.\n대호 브리아노',
    '', 'draft', false
  ),
  (
    'template-customer-progress-kakao-ko-v2', 'customer_in_progress_kakao_ko', 'kakao', 'customer',
    'status_changed', 'in_progress', 'ko', 2, '',
    E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 보내주신 문의를 현재 처리하고 있습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 진행 중\n\n처리가 완료되면 다시 안내드리겠습니다.\n\n감사합니다.\n대호 브리아노',
    '', 'draft', false
  ),
  (
    'template-customer-done-kakao-ko-v2', 'customer_done_kakao_ko', 'kakao', 'customer',
    'status_changed', 'done', 'ko', 2, '',
    E'[대호 브리아노 문의 상태 안내]\n\n{{name}}님, 보내주신 문의 처리가 완료되었습니다.\n\n문의 번호: {{inquiry_id}}\n현재 상태: 처리 완료\n\n추가 문의가 있으시면 대호 브리아노 카카오톡 채널로 연락해 주세요.\n\n감사합니다.\n대호 브리아노',
    '', 'draft', false
  )
ON CONFLICT (template_key, version) DO NOTHING;
