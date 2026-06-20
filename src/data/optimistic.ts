import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

// Shared optimistic-update pattern for a list-shaped query cache: snapshot →
// apply locally → call API → roll back on error → invalidate on settle
// (DATABASE_MIGRATION_NOTES §5.3). `optimistic` produces the next cached list.
export function useOptimisticListMutation<T, V>(
  key: QueryKey,
  mutationFn: (v: V) => Promise<unknown>,
  optimistic: (list: T[], v: V) => T[]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<T[]>(key);
      qc.setQueryData<T[]>(key, (old = []) => optimistic(old, v));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      const c = ctx as { prev?: T[] } | undefined;
      if (c?.prev) qc.setQueryData(key, c.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
