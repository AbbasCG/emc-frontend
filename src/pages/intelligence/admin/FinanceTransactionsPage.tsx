import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { FinancialTransaction } from '@/types/intelligence'
import { deriveTransactionStats } from '@/components/finance/transactions/deriveStats'
import { filterTransactionsClient, paginateRows } from '@/components/finance/transactions/filterRows'
import { PAGE_SIZE, type TrendRangeKey } from '@/components/finance/transactions/constants'
import { useTransactionFilters, useTransactions } from '@/components/finance/transactions/hooks'
import { exportTransactionsCsv } from '@/components/finance/transactions/exportTransactions'
import TransactionsHeader from '@/components/finance/transactions/TransactionsHeader'
import TransactionStats from '@/components/finance/transactions/TransactionStats'
import TransactionTrendChart from '@/components/finance/transactions/TransactionTrendChart'
import TransactionFilters from '@/components/finance/transactions/TransactionFilters'
import TransactionsTable from '@/components/finance/transactions/TransactionsTable'
import MobileTransactionCard from '@/components/finance/transactions/MobileTransactionCard'
import TransactionsPagination from '@/components/finance/transactions/TransactionsPagination'
import TransactionsEmptyState from '@/components/finance/transactions/TransactionsEmptyState'
import { TransactionsErrorState, TransactionsForbiddenState } from '@/components/finance/transactions/TransactionsStates'
import { TransactionsSkeleton } from '@/components/finance/transactions/TransactionsSkeleton'
import TransactionDetailDrawer from '@/components/finance/transactions/TransactionDetailDrawer'

export default function FinanceTransactionsPage() {
  const { filters, filtersWithDebouncedSearch, patchFilters, resetFilters, hasActiveFilters } =
    useTransactionFilters()
  const { rows, loading, refreshing, error, forbidden, lastSync, reload } = useTransactions({
    from: filters.from,
    to: filters.to,
    status: filters.status,
    type: filters.type,
  })

  const [trendRange, setTrendRange] = useState<TrendRangeKey>('30d')
  const [selected, setSelected] = useState<FinancialTransaction | null>(null)
  const reduce = useReducedMotion()

  const filtered = useMemo(
    () => filterTransactionsClient(rows, filtersWithDebouncedSearch),
    [rows, filtersWithDebouncedSearch],
  )

  const stats = useMemo(() => (loading ? null : deriveTransactionStats(filtered)), [filtered, loading])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const pageRows = useMemo(() => paginateRows(filtered, page, PAGE_SIZE), [filtered, page])

  function handleExport() {
    exportTransactionsCsv(filtered, `emc-transactions-${filters.from}_${filters.to}`)
  }

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <TransactionsSkeleton />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <TransactionsHeader
          onExport={handleExport}
          onRefresh={() => void reload()}
          refreshing={refreshing}
          lastSync={lastSync}
          exportDisabled
        />
        <div className="mt-8">
          <TransactionsForbiddenState />
        </div>
      </div>
    )
  }

  if (error && rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
        <TransactionsHeader
          onExport={handleExport}
          onRefresh={() => void reload()}
          refreshing={refreshing}
          lastSync={lastSync}
          exportDisabled
        />
        <div className="mt-8">
          <TransactionsErrorState message={error} onRetry={() => void reload()} />
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
        <TransactionsHeader
          onExport={handleExport}
          onRefresh={() => void reload()}
          refreshing={refreshing}
          lastSync={lastSync}
          exportDisabled={filtered.length === 0}
        />

        <TransactionStats stats={stats} loading={loading || refreshing} />

        <TransactionTrendChart rows={filtered} rangeKey={trendRange} onRangeChange={setTrendRange} />

        <TransactionFilters
          filters={filters}
          onPatch={patchFilters}
          onReset={resetFilters}
          resultCount={filtered.length}
          hasActiveFilters={hasActiveFilters}
        />

        <section className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.1)]">
          {filtered.length === 0 ? (
            <TransactionsEmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
          ) : (
            <>
              <TransactionsTable rows={pageRows} onView={setSelected} />
              <div className="space-y-3 p-4 md:hidden">
                {pageRows.map((row) => (
                  <MobileTransactionCard key={row.id} row={row} onView={setSelected} />
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

      <TransactionDetailDrawer tx={selected} onClose={() => setSelected(null)} />
    </motion.div>
  )
}
