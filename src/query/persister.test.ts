import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from './queryClient';
import { asyncStoragePersister, PERSIST_MAX_AGE, QUERY_CACHE_KEY } from './persister';

describe('persister and queryClient configuration', () => {
  it('creates query client with 14-day gcTime and appropriate default options', () => {
    const client = createAppQueryClient();
    const defaultOptions = client.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(PERSIST_MAX_AGE);
    expect(defaultOptions.queries?.staleTime).toBe(60_000);
  });

  it('defines persistent cache key and persister', () => {
    expect(QUERY_CACHE_KEY).toBe('SPRINGA_REACT_QUERY_CACHE');
    expect(asyncStoragePersister).toBeDefined();
  });
});
