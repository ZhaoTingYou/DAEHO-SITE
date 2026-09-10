ALTER TABLE cms_telegram_live_chat_settings
  ADD COLUMN business_hours_start time NOT NULL DEFAULT TIME '09:00',
  ADD COLUMN business_hours_end time NOT NULL DEFAULT TIME '19:00',
  ADD CONSTRAINT cms_telegram_live_chat_business_hours_order
    CHECK (business_hours_start < business_hours_end);

