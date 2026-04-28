import PageHeader from '../components/PageHeader'

export default function Dashboard() {
  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="لوحة التحكم"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'لوحة التحكم' },
        ]}
      />
    </main>
  )
}
