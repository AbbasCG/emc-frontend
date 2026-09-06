import type { ReactNode } from 'react'

export type DataTableColumn<T extends object> = {
  key: string
  header: string
  width?: string
  render?: (row: T) => ReactNode
}

type DataTableProps<T extends object> = {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  keyExtractor?: (row: T) => string | number
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
        </td>
      ))}
    </tr>
  )
}

export default function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'لا توجد بيانات',
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-emc ring-1 ring-deepBlue/[0.03]">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-deepBlue/[0.07] bg-[#F6F8FB]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-deepBlue/50 font-latin"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-deepBlue/[0.05]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-14 text-center text-sm font-bold text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor ? keyExtractor(row) : i}
                  className="transition-colors duration-200 hover:bg-customBlue/[0.03]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4 font-semibold text-deepBlue">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
