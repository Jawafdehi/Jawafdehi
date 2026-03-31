import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query';

describe('Property 16: Dehydrated state round-trip produces equivalent state', () => {
  it('dehydrate → JSON → parse → hydrate → dehydrate produces equivalent state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1 }),
        async (queryKeys) => {
          const qc = new QueryClient();
          // Populate cache with arbitrary data
          queryKeys.forEach((key, i) => {
            qc.setQueryData([key], { value: i });
          });

          const original = dehydrate(qc);
          const json = JSON.stringify(original);
          const parsed = JSON.parse(json);

          const qc2 = new QueryClient();
          hydrate(qc2, parsed);
          const roundTripped = dehydrate(qc2);

          // Compare semantic content: strip dehydratedAt timestamps since they are
          // set at dehydration time and will differ between calls, but the actual
          // query data, keys, and state must be preserved through the round-trip.
          const normalize = (state: ReturnType<typeof dehydrate>) => ({
            mutations: state.mutations,
            queries: state.queries.map(({ dehydratedAt: _ts, ...rest }) => rest),
          });

          expect(normalize(roundTripped)).toEqual(normalize(original));
        }
      ),
      { numRuns: 100 }
    );
  });
});
