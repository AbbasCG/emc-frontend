import AppBadge from './AppBadge'

type AppSectionHeaderProps = {
  title: string
  description?: string
  step?: number
  totalSteps?: number
}

export default function AppSectionHeader({ title, description, step, totalSteps }: AppSectionHeaderProps) {
  return (
    <div className="mb-8 text-right">
      {step && totalSteps && <AppBadge label={`الخطوة ${step} من ${totalSteps}`} variant="secondary" />}
      <h2 className="mt-3 text-2xl font-black text-deepBlue sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-base font-medium leading-8 text-slate-600">{description}</p>}
      <div className="mt-4 h-1 w-20 rounded-full bg-[#b9872f]" />
    </div>
  )
}
