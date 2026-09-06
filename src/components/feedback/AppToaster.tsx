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
      containerStyle={{ zIndex: 400 }}
      toastOptions={{
        duration: 5000,
        style: {
          fontFamily: 'inherit',
          direction: 'rtl',
          textAlign: 'right',
          borderRadius: '16px',
          border: '1px solid rgba(12,42,75,0.07)',
          boxShadow: '0 22px 50px -24px rgba(6,24,44,0.22), 0 2px 6px -1px rgba(6,24,44,0.05)',
          padding: '13px 18px',
          color: '#0C2A4B',
          background: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          maxWidth: '420px',
          lineHeight: '1.65',
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: '#ffffff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          duration: 6000,
        },
        loading: {
          iconTheme: { primary: '#0077B6', secondary: '#ffffff' },
          duration: Infinity,
        },
      }}
    />
  )
}
