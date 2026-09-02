import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('./src/main/resources/db/migration/V3__customer_login_names.sql', import.meta.url),
  'utf8'
);
const repository = readFileSync(
  new URL('./src/main/java/com/daeho/customer/repository/JdbcCustomerRepository.java', import.meta.url),
  'utf8'
);

test('username migration preserves old and new Cognito subjects for rollback', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS customer_identities/);
  assert.match(migration, /INSERT INTO customer_identities[\s\S]*SELECT cognito_subject, customer_id/);
  assert.match(repository, /JOIN customer_identities i ON i\.customer_id = p\.customer_id/);
  assert.match(repository, /INSERT INTO customer_identities \(cognito_subject, customer_id\)/);
  const writes = repository.slice(repository.indexOf('CustomerProfile update(String subject'));
  assert.equal(
    [...writes.matchAll(/SELECT customer_id FROM customer_identities WHERE cognito_subject = \?/g)].length,
    3
  );
});

test('registration grants persist an exact Cognito signup binding', () => {
  for (const column of ['signup_user_pool_id', 'signup_client_id', 'signup_username']) {
    assert.match(migration, new RegExp(column));
  }
  assert.match(repository, /consumed_at IS NULL OR \([\s\S]*signup_user_pool_id = \?/);
});

test('legacy migration records the new verification and consent receipt', () => {
  const relink = repository.slice(repository.indexOf('relinkVerifiedPhone'));
  assert.match(relink, /INSERT INTO identity_verifications/);
  assert.match(relink, /INSERT INTO consent_receipts/);
  assert.match(relink, /account_identity_migrated/);
});
