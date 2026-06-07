import { Toaster } from 'react-hot-toast'

/**
 * Global toast host — mount once inside BrowserRouter.
 * Uses react-hot-toast with EMC branding and RTL support.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration: 5000,
        style: {
          fontFamily: 'inherit',
          direction: 'rtl',
          textAlign: 'right',
          borderRadius: '14px',
          border: '1px solid rgba(34,51,74,0.08)',
          boxShadow: '0 8px 32px rgba(34,51,74,0.12)',
          padding: '12px 16px',
          color: '#22334A',
          background: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          maxWidth: '420px',
          lineHeight: '1.6',
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          duration: 6000,
        },
        loading: {
          iconTheme: { primary: '#2691C2', secondary: '#ffffff' },
          duration: Infinity,
        },
      }}
    />
  )
}
