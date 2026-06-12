#!/usr/bin/env node
// Regression: substring auth tokens must not disqualify cache candidates.
import { isAuthRoute } from '../lib/auth-route.mjs';

const mustNotMatch = [
  '/home/settings',
  '/game',
  '/some/page',
  '/time/data',
  '/name/edit',
  '/frame/work',
  '/shopping-cart',
  '/welcome',
  '/theme/dark',
  '/income/report',
  '/vanode/meeting',
  '/home/settings?tab=profile',
];

const mustMatch = [
  '/auth/signin',
  '/me',
  '/account',
  '/login',
  '/dashboard',
  '/checkout',
  '/cart',
  '/api/auth/register',
  '/profile/settings',
  '/session',
  '/account/billing',
];

// Documented failure mode: alternation without a path-segment boundary.
const BUGGY_SUBSTRING_REGEX =
  /(login|logout|auth|account|dashboard|checkout|cart|profile|session|me)(?:\/|$)/i;

let failed = 0;

for (const route of mustNotMatch) {
  if (isAuthRoute(route)) {
    console.error('FALSE POSITIVE:', route);
    failed++;
  }
}

for (const route of mustMatch) {
  if (!isAuthRoute(route)) {
    console.error('FALSE NEGATIVE:', route);
    failed++;
  }
}

const buggyHits = mustNotMatch.filter((r) => BUGGY_SUBSTRING_REGEX.test(r));
if (buggyHits.length === 0) {
  console.error('Sanity check failed: buggy regex should reproduce known false positives');
  failed++;
} else {
  console.error(
    `Buggy substring regex would false-positive ${buggyHits.length} route(s): ${buggyHits.join(', ')}`,
  );
}

if (failed) {
  console.error(`FAILED ${failed} assertion(s)`);
  process.exit(1);
}

console.log('auth-route regression OK');
