import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ManualPayment } from '@/types/intelligence'
import { deriveManualPaymentStats } from '@/components/finance/manual-payments/deriveStats'
import { filterManualPaymentsClient, paginateRows } from '@/components/finance/manual-payments/filterRows'
import { PAGE_SIZE } from '@/components/finance/manual-payments/constants'
import {
  useFinanceAccountsList,
  useManualPaymentFilters,
  useManualPayments,
} from '@/components/finance/manual-payments/hooks'
import { exportManualPaymentsCsv } from '@/components/finance/manual-payments/exportManualPayments'
import ManualPaymentsHeader from '@/components/finance/manual-payments/ManualPaymentsHeader'
import ManualPaymentStats from '@/components/finance/manual-payments/ManualPaymentStats'
import ManualPaymentFilters from '@/components/finance/manual-payments/ManualPaymentFilters'
import ManualPaymentsTable, { MobileManualPaymentCard } from '@/components/finance/manual-payments/ManualPaymentsTable'
import TransactionsPagination from '@/components/finance/transactions/TransactionsPagination'
import ManualPaymentsEmptyState from '@/components/finance/manual-payments/ManualPaymentsEmptyState'
import {
  ManualPaymentsErrorState,
  ManualPaymentsForbiddenState,
  ManualPaymentsSkeleton,
} from '@/components/finance/manual-payments/ManualPaymentsStates'
import ManualPaymentDetailDrawer from '@/components/finance/manual-payments/ManualPaymentDetailDrawer'
import CreateManualPaymentDrawer from '@/components/finance/manual-payments/CreateManualPaymentDrawer'

export default function FinanceManualPaymentsPage() {
  const { filters, filtersWithDebouncedSearch, patchFilters, resetFilters, hasActiveFilters } =
    useManualPaymentFilters()
  const accounts = useFinanceAccountsList()
  const { rows, loading, refreshing, error, forbidden, lastSync, reload } = useManualPayments({
    from: filters.from,
    to: filters.to,
    status: filters.status,
    paymentMethod: filters.paymentMethod,
    accountId: filters.accountId,
    search: filtersWithDebouncedSearch.search,
  })

  const [selected, setSelected] = useState<ManualPayment | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const reduce = useReducedMotion()

  const filtered = useMemo(
    () => filterManualPaymentsClient(rows, filtersWithDebouncedSearch),
    [rows, filtersWithDebouncedSearch],
  )

  const stats = useMemo(() => (loading ? null : deriveManualPaymentStats(filtered)), [filtered, loading])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const pageRows = useMemo(() => paginateRows(filtered, page, PAGE_SIZE), [filtered, page])

  function handleExport() {
    exportManualPaymentsCsv(filtered, `emc-manual-payments-${filters.from}_${filters.to}`)
  }

  function handleView(row: ManualPayment) {
    setSelected(row)
  }

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <ManualPaymentsSkeleton />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <ManualPaymentsHeader
          totalCount={0}
          onRefresh={() => void reload()}
          onCreate={() => setShowCreate(true)}
          refreshing={refreshing}
          lastSync={lastSync}
        />
        <div className="mx-auto mt-8 max-w-7xl">
          <ManualPaymentsForbiddenState />
        </div>
      </div>
    )
  }

  if (error && rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <ManualPaymentsHeader
          totalCount={0}
          onRefresh={() => void reload()}
          onCreate={() => setShowCreate(true)}
          refreshing={refreshing}
          lastSync={lastSync}
        />
        <div className="mx-auto mt-8 max-w-7xl">
          <ManualPaymentsErrorState message={error} onRetry={() => void reload()} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
      className="min-h-screen bg-[#F6F8FB] px-4 pb-16 pt-6 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <ManualPaymentsHeader
          totalCount={filtered.length}
          onRefresh={() => void reload()}
          onCreate={() => setShowCreate(true)}
          refreshing={refreshing}
          lastSync={lastSync}
        />

        <ManualPaymentStats stats={stats} loading={loading || refreshing} />

        <ManualPaymentFilters
          filters={filters}
          accounts={accounts}
          onPatch={patchFilters}
          onReset={resetFilters}
          onExport={handleExport}
          resultCount={filtered.length}
          hasActiveFilters={hasActiveFilters}
          exportDisabled={filtered.length === 0}
        />

        <section className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.1)]">
          {filtered.length === 0 ? (
            <ManualPaymentsEmptyState
              hasFilters={hasActiveFilters}
              onReset={resetFilters}
              onCreate={() => setShowCreate(true)}
            />
          ) : (
            <>
              <ManualPaymentsTable rows={pageRows} onView={handleView} />
              <div className="space-y-3 p-4 md:hidden">
                {pageRows.map((row) => (
                  <MobileManualPaymentCard key={row.id} payment={row} onView={handleView} />
                ))}
              </div>
              <TransactionsPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPageChange={(p) => patchFilters({ page: p })}
              />
            </>
          )}
        </section>
      </div>

      <ManualPaymentDetailDrawer
        paymentId={selected?.id ?? null}
        initial={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => void reload()}
      />

      <CreateManualPaymentDrawer
        open={showCreate}
        accounts={accounts}
        onClose={() => setShowCreate(false)}
        onCreated={() => void reload()}
      />
    </motion.div>
  )
}
