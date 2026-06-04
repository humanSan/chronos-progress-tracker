import React from 'react';
import { Plus, X } from 'lucide-react';
import { ColDef, ColKey, SortRule } from './types';

export const SortMenu: React.FC<{
  anchor: { right: number; top: number };
  sorts: SortRule[];
  allColumns: ColDef[];
  onChange: (sorts: SortRule[]) => void;
  onClose: () => void;
}> = ({ anchor, sorts, allColumns, onChange, onClose }) => {
  const addSort = () => {
    const defaultField = allColumns[0]?.key ?? 'title';
    onChange([
      ...sorts,
      { id: Date.now().toString(36), field: defaultField, direction: 'asc' },
    ]);
  };

  const update = (id: string, patch: Partial<SortRule>) =>
    onChange(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => onChange(sorts.filter((s) => s.id !== id));

  const selectCls =
    'bg-[#2a2a2a] border border-white/10 rounded px-1.5 h-7 text-[13px] text-white/80 focus:outline-none focus:border-[var(--accent2)] cursor-pointer';

  return (
    <>
      <div
        className="fixed inset-0 z-[65]"
        onMouseDown={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div
        style={{ position: 'fixed', right: anchor.right, top: anchor.top }}
        className="z-[66] w-[300px] rounded-lg border border-white/10 bg-[#1f1f1f] shadow-2xl p-2"
      >
        <div className="px-2 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Sort
        </div>

        {sorts.length === 0 ? (
          <p className="px-2 py-2.5 text-[13px] text-white/30 text-center">No sort applied</p>
        ) : (
          <div className="space-y-1.5 mb-1 px-0.5">
            {sorts.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                {/* Field */}
                <select
                  value={s.field}
                  onChange={(e) => update(s.id, { field: e.target.value as ColKey })}
                  className={`${selectCls} flex-1 min-w-0`}
                >
                  {allColumns.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>

                {/* Direction */}
                <select
                  value={s.direction}
                  onChange={(e) => update(s.id, { direction: e.target.value as 'asc' | 'desc' })}
                  className={`${selectCls} w-[110px] shrink-0`}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  title="Remove sort"
                  className="shrink-0 p-0.5 rounded text-white/35 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addSort}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 mt-0.5 rounded-md text-[13px] text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Plus size={13} />
          Add sort
        </button>
      </div>
    </>
  );
};
