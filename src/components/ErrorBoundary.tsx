import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4"
      >
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100">
            <AlertTriangle size={44} className="text-red-400" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-black text-deepBlue">
            حدث خطأ غير متوقع
          </h1>

          <p className="mx-auto mt-4 max-w-sm leading-8 text-slate-500">
            عذراً، حدث خطأ في التطبيق. يمكنك إعادة تحميل الصفحة أو العودة إلى الرئيسية.
          </p>

          {/* Error detail (dev only) */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 overflow-auto rounded-xl bg-slate-900 p-4 text-right text-xs leading-6 text-red-300">
              {this.state.error.message}
            </pre>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="emc-focus-ring inline-flex items-center gap-2 rounded-xl bg-customBlue px-7 py-3.5 font-bold text-white shadow-md shadow-sky-200 transition-all hover:bg-[#1e7dab]"
            >
              <RefreshCw size={17} />
              إعادة تحميل الصفحة
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="emc-focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-bold text-deepBlue transition-colors hover:bg-sky-50 hover:text-customBlue"
            >
              <Home size={17} />
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }
}
