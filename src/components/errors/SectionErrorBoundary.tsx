import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import EmcButton from '@/components/ui/EmcButton'

type Props = {
  children: ReactNode
  /** Optional title shown when this subtree crashes */
  title?: string
}

type State = { hasError: boolean }

/** Isolates failures so one bad widget doesn’t blank the whole dashboard. */
export default class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-100 bg-red-50/90 p-6 text-center shadow-sm"
        dir="rtl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white ring-1 ring-red-100">
          <AlertTriangle className="text-red-500" size={28} aria-hidden />
        </div>
        <p className="text-base font-black text-deepBlue">{this.props.title ?? 'تعذّر تحميل هذا القسم'}</p>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-slate-600">
          حدث خطأ في الواجهة. يمكنك إعادة المحاولة دون إعادة تحميل الصفحة بالكامل.
        </p>
        <EmcButton type="button" variant="secondary" className="mt-6" onClick={this.handleRetry}>
          إعادة المحاولة
        </EmcButton>
      </div>
    )
  }
}
