import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import Database from 'better-sqlite3';

import {cmsImportTables, importCmsSnapshot} from './import-core.mjs';
import {cmsTables} from '../../scripts/cms-tables.mjs';

const schema = readFileSync(new URL('../../database/cms-schema.sql', import.meta.url), 'utf8');

test('SQLite preview and backup tools preserve CMS-managed inquiry statuses', () => {
  const db = new Database(':memory:');
  db.exec(schema);

  assert.equal(db.prepare('select count(*) as count from cms_inquiry_statuses').get().count, 5);
  db.prepare(`
    insert into cms_inquiry_statuses (
      code, label_ko, label_en, label_zh, color, sort_order, is_active, is_system
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('waiting_for_customer', '고객 회신 대기', 'Waiting for customer', '等待客户回复', 'purple', 25, 1, 0);
  db.prepare(`
    insert into cms_inquiries (id, source, status, name, contact)
    values ('inquiry-custom', 'contact', 'waiting_for_customer', 'Tester', '01012345678')
  `).run();

  assert.equal(db.prepare("select status from cms_inquiries where id = 'inquiry-custom'").get().status, 'waiting_for_customer');
  assert.ok(cmsImportTables.indexOf('cms_inquiry_statuses') < cmsImportTables.indexOf('cms_inquiries'));
  assert.ok(cmsTables.indexOf('cms_inquiry_statuses') < cmsTables.indexOf('cms_inquiries'));

  importCmsSnapshot(db, {
    schemaVersion: 1,
    tables: {
      cms_pages: [],
      cms_news: [],
      cms_news_translations: [],
      cms_collections: [],
      cms_collection_translations: [],
      cms_media: [],
      cms_inquiry_statuses: statusRows(),
      cms_inquiries: [],
      cms_email_events: []
    }
  });

  assert.equal(db.prepare('select count(*) as count from cms_inquiry_statuses').get().count, 6);
  db.close();
});

function statusRows() {
  return [
    ['new', '신규', 'New', '新提交', 'slate', 0, 1, 1],
    ['contacted', '연락 완료', 'Contacted', '已联系', 'blue', 10, 1, 1],
    ['in_progress', '진행 중', 'In progress', '处理中', 'amber', 20, 1, 1],
    ['done', '처리 완료', 'Completed', '已完成', 'green', 30, 1, 1],
    ['spam', '스팸', 'Spam', '垃圾信息', 'red', 40, 1, 1],
    ['waiting_for_customer', '고객 회신 대기', 'Waiting for customer', '等待客户回复', 'purple', 25, 1, 0]
  ].map(([code, label_ko, label_en, label_zh, color, sort_order, is_active, is_system]) => ({
    code,
    label_ko,
    label_en,
    label_zh,
    color,
    sort_order,
    is_active,
    is_system
  }));
}
