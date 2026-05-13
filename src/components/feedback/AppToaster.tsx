import { Toaster } from 'sonner'

/**
 * Global toast host — mount once inside `BrowserRouter`.
 * Arabic copy is passed at call sites (`toast.success('…')`).
 */
export default function AppToaster() {
  return (
    <Toaster
      dir="rtl"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'items-start gap-3 border border-slate-200/80 bg-white font-sans shadow-lg text-right',
          title: 'font-black text-deepBlue',
          description: 'font-medium text-slate-600',
          closeButton: 'left-auto right-2',
        },
      }}
    />
  )
}
