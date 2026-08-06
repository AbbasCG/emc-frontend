import { ChevronDown, ChevronLeft, Folder } from 'lucide-react'
import { useState } from 'react'
import type { DocumentFolder } from '@/types/platform'

type Props = {
  folders: DocumentFolder[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function buildTree(folders: DocumentFolder[]): DocumentFolder[] {
  const byParent = new Map<string | null, DocumentFolder[]>()
  for (const f of folders) {
    const k = f.parent_id
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(f)
  }
  return byParent.get(null) ?? []
}

function Children({
  parentId,
  map,
  depth,
  selectedId,
  onSelect,
}: {
  parentId: string
  map: Map<string | null, DocumentFolder[]>
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const children = map.get(parentId) ?? []
  const [open, setOpen] = useState(true)
  if (!children.length) return null
  return (
    <ul className={depth ? 'mr-3 border-r border-slate-100 pr-2' : ''}>
      <li className="py-0.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black text-slate-400 hover:bg-slate-50"
        >
          {open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          مجلدات فرعية
        </button>
      </li>
      {open &&
        children.map((c) => (
          <li key={c.id} className="py-0.5">
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={[
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition',
                selectedId === c.id ? 'bg-deepBlue text-white shadow-md' : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              <Folder size={16} className={selectedId === c.id ? 'text-customOrange' : 'text-customBlue'} />
              {c.name}
            </button>
            <Children parentId={c.id} map={map} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          </li>
        ))}
    </ul>
  )
}

export default function FolderTree({ folders, selectedId, onSelect }: Props) {
  const map = new Map<string | null, DocumentFolder[]>()
  for (const f of folders) {
    const k = f.parent_id
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(f)
  }
  const roots = buildTree(folders)

  return (
    <nav className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" aria-label="المجلدات">
      <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">المجلدات</p>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={[
          'mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition',
          selectedId === null ? 'bg-customBlue text-white shadow-md' : 'text-slate-600 hover:bg-slate-50',
        ].join(' ')}
      >
        <Folder size={18} />
        كل الملفات
      </button>
      <ul className="space-y-1">
        {roots.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r.id)}
              className={[
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition',
                selectedId === r.id ? 'bg-deepBlue text-white shadow-md' : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              <Folder size={16} className={selectedId === r.id ? 'text-customOrange' : 'text-customBlue'} />
              {r.name}
            </button>
            <Children parentId={r.id} map={map} depth={1} selectedId={selectedId} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
