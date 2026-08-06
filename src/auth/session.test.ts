import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSessionValid, parseSessionJson, type Session } from './session';

describe('isSessionValid', () => {
  it('accepts future expiry', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    assert.equal(isSessionValid(s, 1_700_000_000), true);
  });

  it('rejects near-expiry within skew', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 1_700_000_030 };
    assert.equal(isSessionValid(s, 1_700_000_000), false);
  });
});

describe('parseSessionJson', () => {
  it('returns null for corrupt JSON', () => {
    assert.equal(parseSessionJson('{not json'), null);
  });

  it('parses a valid session payload', () => {
    const s: Session = { token: 't', email: 'a@b.c', expiresAt: 2_000_000_000 };
    assert.deepEqual(parseSessionJson(JSON.stringify(s)), s);
  });
});
