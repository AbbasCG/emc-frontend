import { useState } from 'react'
import type { FormEvent } from 'react'
import type { OpsComment } from '@/types/operations'

export default function CommentThread({
  comments,
  onAdd,
  disabled,
}: {
  comments: OpsComment[]
  onAdd: (text: string) => Promise<void>
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await onAdd(text.trim())
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-right">
      <h4 className="text-xs font-black uppercase tracking-wide text-slate-400">المناقشات</h4>
      <ul className="max-h-52 space-y-3 overflow-y-auto">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <p className="text-[11px] font-black text-customBlue">{c.author_name}</p>
            <p className="mt-1 text-sm font-medium text-deepBlue/85">{c.body}</p>
            <p className="mt-1 text-[10px] text-slate-400">{c.created_at}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={text}
          disabled={disabled || busy}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="أضف تعليقاً..."
          className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
        />
        <button
          type="submit"
          disabled={disabled || busy}
          className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          إرسال
        </button>
      </form>
    </div>
  )
}
