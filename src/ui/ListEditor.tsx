type Col<T> = { key: keyof T & string; label: string; type?: "text" };

export default function ListEditor<T extends object>({ rows, cols, empty, onChange }: { rows: T[]; cols: Col<T>[]; empty: T; onChange: (r: T[]) => void }) {
  const edit = (i: number, k: keyof T, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      <table>
        <thead>
          <tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key}>
                  <input
                    type={c.type ?? "number"}
                    min={0}
                    value={String((r as Record<string, unknown>)[c.key] ?? "")}
                    onChange={(e) => edit(i, c.key, c.type === "text" ? e.target.value : Math.max(0, Number(e.target.value) || 0))}
                  />
                </td>
              ))}
              <td>
                <button className="btn" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn" style={{ marginTop: ".5rem" }} onClick={() => onChange([...rows, { ...empty }])}>+ Add</button>
    </div>
  );
}
