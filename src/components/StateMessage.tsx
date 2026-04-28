import { AlertCircle, Loader2 } from 'lucide-react'

type StateMessageProps = {
  type: 'error' | 'empty'
  title: string
  message: string
}

export default function StateMessage({ type, title, message }: StateMessageProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-10 text-center shadow-xl shadow-slate-200 ring-1 ring-slate-100">
      <div
        className={`mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full ${
          type === 'error' ? 'bg-orange-50 text-customOrange' : 'bg-sky-50 text-customBlue'
        }`}
      >
        {type === 'error' ? <AlertCircle size={30} /> : <Loader2 size={30} />}
      </div>
      <h2 className="text-2xl font-black text-deepBlue">{title}</h2>
      <p className="mt-3 leading-8 text-slate-600">{message}</p>
    </div>
  )
}
