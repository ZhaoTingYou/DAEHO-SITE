import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';

const REQUEST_TIMEOUT_MS = 15_000;
const QUIET_PERIOD_MS = 750;
const DEFAULT_UTM_SOURCE_PREFIX = 'daeho-traffic-verification';
const DEFAULT_UTM_MEDIUM = 'verification';
const DEFAULT_UTM_CAMPAIGN = 'traffic-analytics';
let verificationStage = 'initialization';

async function main() {
  const config = readConfig();
  const {chromium} = await loadPlaywright();
  const browser = await chromium.launch({headless: true});
  const checks = [];

  try {
    verificationStage = 'public analytics';
    await verifyPublicAnalytics(browser, config, checks);
    verificationStage = 'mobile layout';
    await verifyMobileLayout(browser, config, checks);
    verificationStage = 'CMS analytics report';
    await verifyCmsAnalytics(browser, config, checks);

    for (const check of checks) {
      console.log(`PASS: ${check}`);
    }
  } finally {
    await browser.close();
  }
}

function readConfig() {
  const baseUrl = requiredUrl('DAEHO_VERIFY_BASE_URL');
  const trafficUrl = new URL(process.env.DAEHO_VERIFY_TRAFFIC_URL?.trim() || '/en', baseUrl);
  const source = process.env.DAEHO_VERIFY_UTM_SOURCE?.trim() || `${DEFAULT_UTM_SOURCE_PREFIX}-${randomUUID()}`;

  trafficUrl.searchParams.set('utm_source', source);
  trafficUrl.searchParams.set('utm_medium', DEFAULT_UTM_MEDIUM);
  trafficUrl.searchParams.set('utm_campaign', DEFAULT_UTM_CAMPAIGN);

  const storageStatePath = process.env.DAEHO_VERIFY_ADMIN_STORAGE_STATE?.trim();
  if (storageStatePath && !existsSync(storageStatePath)) {
    throw new Error('DAEHO_VERIFY_ADMIN_STORAGE_STATE must point to an existing Playwright storage-state file.');
  }
  if (!storageStatePath && !process.env.DAEHO_VERIFY_ADMIN_PASSWORD?.trim()) {
    throw new Error('Set DAEHO_VERIFY_ADMIN_PASSWORD or DAEHO_VERIFY_ADMIN_STORAGE_STATE.');
  }

  return {
    baseUrl,
    trafficUrl,
    secondRouteUrl: new URL('/en/privacy', baseUrl),
    adminUrl: new URL(process.env.DAEHO_VERIFY_ADMIN_URL?.trim() || '/admin/analytics', baseUrl),
    source,
    storageStatePath,
    adminPassword: process.env.DAEHO_VERIFY_ADMIN_PASSWORD?.trim() || ''
  };
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('Playwright is required. Install it in the verification environment before running this script.');
  }
}

async function verifyPublicAnalytics(browser, config, checks) {
  const context = await browser.newContext({viewport: {width: 1440, height: 960}});
  await context.clearCookies();
  await context.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  const page = await context.newPage();
  const consoleErrors = collectConsoleErrors(page, {ignoreLocalImageOptimizerErrors: isLocalVerification(config.baseUrl)});
  const internalRequests = [];
  const gaTagRequests = [];

  page.on('request', (request) => {
    if (isInternalPageViewRequest(request)) {
      internalRequests.push(request);
    }
    if (isGoogleAnalyticsTagRequest(request)) {
      gaTagRequests.push(request);
    }
  });

  try {
    verificationStage = 'pre-consent assertions';
    await page.goto(config.trafficUrl.href, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(QUIET_PERIOD_MS);

    assert.equal(
      await page.locator('#daeho-google-analytics, script[src*="googletagmanager.com/gtag/js"]').count(),
      0,
      'GA tag must not be present before consent.'
    );
    assert.equal(gaTagRequests.length, 0, 'GA tag must not load before consent.');
    assert.equal(internalRequests.length, 0, 'Internal page views must not be sent before consent.');
    await assertNoAnalyticsCookies(context, 'before consent');
    checks.push('pre-consent page has no GA tag, analytics cookies, or internal page-view request');

    verificationStage = 'consent activation';
    const internalResponse = page.waitForResponse(isInternalPageViewResponse, {timeout: REQUEST_TIMEOUT_MS});
    const gaCollectRequest = page.waitForRequest(isGoogleAnalyticsCollectRequest, {timeout: REQUEST_TIMEOUT_MS});
    await page.getByRole('button', {name: /allow analytics|분석 허용/i}).click();
    const [recordResponse] = await Promise.all([internalResponse, gaCollectRequest]);
    assert.ok([200, 202].includes(recordResponse.status()), 'Initial internal page view must be accepted.');
    await page.waitForTimeout(QUIET_PERIOD_MS);

    assert.equal(internalRequests.length, 1, 'Accepting consent must send exactly one initial internal page view.');
    await waitForAnalyticsCookie(context);
    checks.push('consent sends one accepted internal page view, one GA collect request, and creates an analytics cookie');

    verificationStage = 'client-side route page view';
    const initialRequestCount = internalRequests.length;
    const secondInternalResponse = page.waitForResponse(isInternalPageViewResponse, {timeout: REQUEST_TIMEOUT_MS});
    const routeNavigation = page.waitForURL(config.secondRouteUrl.href, {timeout: REQUEST_TIMEOUT_MS});
    await page.getByRole('link', {name: /privacy policy|개인정보처리방침/i}).last().click();
    const [secondRecordResponse] = await Promise.all([secondInternalResponse, routeNavigation]);
    assert.ok([200, 202].includes(secondRecordResponse.status()), 'Second internal page view must be accepted.');
    await page.waitForTimeout(QUIET_PERIOD_MS);

    assert.equal(
      internalRequests.length - initialRequestCount,
      1,
      'Navigating to the second route must send exactly one additional internal page view.'
    );
    checks.push('second route adds exactly one internal page view');

    verificationStage = 'consent withdrawal';
    const requestCountBeforeWithdrawal = internalRequests.length;
    await page.getByRole('button', {name: /cookie settings|쿠키 설정/i}).click();
    await page.getByRole('button', {name: /^reject$|^거부$/i}).click();
    await page.waitForTimeout(QUIET_PERIOD_MS);

    verificationStage = 'withdrawal state cleanup';
    await assertNoAnalyticsCookies(context, 'after consent withdrawal');
    assert.equal(
      await page.evaluate(() => window.localStorage.getItem('daeho_internal_analytics_session_v1')),
      null,
      'Withdrawing consent must clear the internal analytics session.'
    );
    assert.equal(
      internalRequests.length,
      requestCountBeforeWithdrawal,
      'Withdrawing consent must not send another internal page view.'
    );

    verificationStage = 'post-withdrawal navigation';
    const withdrawnState = await context.storageState();
    await verifyPostWithdrawalNavigation(browser, config, withdrawnState);
    checks.push('withdrawing consent clears analytics state and stops GA and CMS collection');

    verificationStage = 'desktop horizontal overflow assertion';
    await assertNoHorizontalOverflow(page, 'desktop public page');
    verificationStage = 'desktop console assertion';
    assertNoConsoleErrors(consoleErrors, 'desktop public page');
    checks.push('desktop public page has no horizontal overflow or console errors');
  } finally {
    await context.close();
  }
}

async function verifyMobileLayout(browser, config, checks) {
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    viewport: {width: 390, height: 844},
    deviceScaleFactor: 3
  });
  const page = await context.newPage();
  const consoleErrors = collectConsoleErrors(page, {ignoreLocalImageOptimizerErrors: isLocalVerification(config.baseUrl)});

  try {
    await page.goto(new URL('/en', config.baseUrl).href, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(QUIET_PERIOD_MS);
    await assertNoHorizontalOverflow(page, 'mobile public page');
    assertNoConsoleErrors(consoleErrors, 'mobile public page');
    checks.push('mobile public page has no horizontal overflow or console errors');
  } finally {
    await context.close();
  }
}

async function verifyCmsAnalytics(browser, config, checks) {
  const context = await browser.newContext(
    config.storageStatePath ? {storageState: config.storageStatePath} : undefined
  );
  const page = await context.newPage();
  const consoleErrors = collectConsoleErrors(page);

  try {
    verificationStage = 'CMS analytics page load';
    await page.goto(config.adminUrl.href, {waitUntil: 'domcontentloaded'});
    if (new URL(page.url()).pathname.startsWith('/admin/login')) {
      verificationStage = 'CMS login';
      assert.ok(config.adminPassword, 'CMS login requires DAEHO_VERIFY_ADMIN_PASSWORD when no valid storage state is supplied.');
      await page.locator('input[name="password"]').fill(config.adminPassword);
      await Promise.all([
        page.waitForURL((url) => url.pathname === '/admin', {timeout: REQUEST_TIMEOUT_MS}),
        page.locator('form button').click()
      ]);
      assert.equal(new URL(page.url()).pathname, '/admin', 'CMS login must complete successfully.');
      verificationStage = 'CMS analytics page after login';
      await page.goto(config.adminUrl.href, {waitUntil: 'networkidle'});
    } else {
      await page.waitForLoadState('networkidle');
    }

    verificationStage = 'CMS analytics error state';
    const alertTexts = await page.getByRole('alert').allTextContents();
    assert.equal(
      alertTexts.filter((text) => text.trim()).length,
      0,
      'CMS analytics report must load without a visible error state.'
    );
    verificationStage = 'CMS analytics source tables';
    const matchingTables = page.locator('table').filter({hasText: config.source});
    assert.ok(await matchingTables.count() >= 2, 'The verification source must appear in both summary and recent visits.');
    verificationStage = 'CMS analytics console assertion';
    assertNoConsoleErrors(consoleErrors, 'CMS analytics page');
    checks.push('CMS summary and recent visits show the verification source without console errors');
  } finally {
    await context.close();
  }
}

function requiredUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

function isInternalPageViewRequest(request) {
  const url = new URL(request.url());
  return request.method() === 'POST' && url.pathname === '/api/cms/analytics/page-view';
}

function isInternalPageViewResponse(response) {
  return isInternalPageViewRequest(response.request());
}

function isGoogleAnalyticsTagRequest(request) {
  const url = new URL(request.url());
  return url.hostname.endsWith('googletagmanager.com') && url.pathname === '/gtag/js';
}

function isGoogleAnalyticsCollectRequest(request) {
  const url = new URL(request.url());
  return url.hostname.endsWith('google-analytics.com') && /\/g\/collect$/.test(url.pathname);
}

function isGoogleAnalyticsPageViewRequest(request) {
  if (!isGoogleAnalyticsCollectRequest(request)) {
    return false;
  }

  const url = new URL(request.url());
  return url.searchParams.get('en') === 'page_view'
    || new URLSearchParams(request.postData() ?? '').get('en') === 'page_view';
}

function collectConsoleErrors(page, {ignoreLocalImageOptimizerErrors = false} = {}) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location().url;
      if (
        ignoreLocalImageOptimizerErrors
        && message.text().startsWith('Failed to load resource:')
        && location
        && new URL(location).pathname === '/_next/image'
      ) {
        return;
      }
      errors.push(message);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error);
  });
  return errors;
}

function isLocalVerification(baseUrl) {
  return ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
}

async function assertNoHorizontalOverflow(page, label) {
  const {clientWidth, scrollWidth} = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert.ok(scrollWidth <= clientWidth + 1, `${label} must not have horizontal overflow.`);
}

function assertNoConsoleErrors(errors, label) {
  assert.equal(errors.length, 0, `${label} must not have console errors.`);
}

async function assertNoAnalyticsCookies(context, label) {
  const analyticsCookies = (await context.cookies()).filter((cookie) => /^_ga(?:_|$)/.test(cookie.name));
  assert.equal(analyticsCookies.length, 0, `Analytics cookies must not exist ${label}.`);
}

async function verifyPostWithdrawalNavigation(browser, config, storageState) {
  const context = await browser.newContext({
    storageState,
    viewport: {width: 1440, height: 960}
  });
  const page = await context.newPage();
  const internalRequests = [];
  const gaPageViewRequests = [];

  page.on('request', (request) => {
    if (isInternalPageViewRequest(request)) {
      internalRequests.push(request);
    }
    if (isGoogleAnalyticsPageViewRequest(request)) {
      gaPageViewRequests.push(request);
    }
  });

  try {
    await page.goto(new URL('/en/terms', config.baseUrl).href, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(QUIET_PERIOD_MS);
    verificationStage = 'post-withdrawal CMS assertion';
    assert.equal(internalRequests.length, 0, 'Withdrawing consent must stop further internal page views.');
    verificationStage = 'post-withdrawal GA assertion';
    assert.equal(gaPageViewRequests.length, 0, 'Withdrawing consent must stop further GA page views.');
    verificationStage = 'post-withdrawal cookie assertion';
    await assertNoAnalyticsCookies(context, 'on a page visited after consent withdrawal');
    verificationStage = 'post-withdrawal local storage assertion';
    assert.equal(
      await page.evaluate(() => window.localStorage.getItem('daeho_internal_analytics_session_v1')),
      null,
      'The internal analytics session must remain cleared after withdrawal.'
    );
  } finally {
    await context.close();
  }
}

async function waitForAnalyticsCookie(context) {
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const analyticsCookies = (await context.cookies()).filter((cookie) => /^_ga(?:_|$)/.test(cookie.name));
    if (analyticsCookies.length > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail('Analytics consent must create an analytics cookie before withdrawal is tested.');
}

main().catch(() => {
  console.error(`FAIL: Traffic analytics verification stopped during ${verificationStage}. No sensitive error details are reported.`);
  process.exitCode = 1;
});
