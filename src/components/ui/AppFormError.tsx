import { AlertCircle } from 'lucide-react'

type AppFormErrorProps = {
  id?: string
  message: string | string[] | undefined
}

export default function AppFormError({ id, message }: AppFormErrorProps) {
  if (!message) return null

  const messages = Array.isArray(message) ? message : [message]

  return (
    <div id={id} className="flex items-start gap-2 text-right" role="alert">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
      <div>
        {messages.map((msg, index) => (
          <p key={`${msg}-${index}`} className="text-xs font-bold leading-5 text-red-700">
            {msg}
          </p>
        ))}
      </div>
    </div>
  )
}
