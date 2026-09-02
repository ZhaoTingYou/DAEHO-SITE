import assert from 'node:assert/strict';
import test from 'node:test';

import {resolveAccountFeatureSettings} from './account-feature-settings-core.mjs';

test('runtime account features require the infrastructure guard and valid CMS flags', () => {
  assert.deepEqual(resolveAccountFeatureSettings(false, {
    customerAccountsEnabled: true,
    inquiryAccountRequired: true
  }), {
    customerAccountsEnabled: false,
    inquiryAccountRequired: false
  });

  assert.deepEqual(resolveAccountFeatureSettings(true, {
    customerAccountsEnabled: true,
    inquiryAccountRequired: false
  }), {
    customerAccountsEnabled: true,
    inquiryAccountRequired: false
  });

  assert.deepEqual(resolveAccountFeatureSettings(true, {
    customerAccountsEnabled: false,
    inquiryAccountRequired: true
  }), {
    customerAccountsEnabled: false,
    inquiryAccountRequired: false
  });
});
