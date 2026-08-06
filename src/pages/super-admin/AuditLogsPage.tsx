import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import AuditLogDetailDrawer from '@/components/super-admin/audit-logs/AuditLogDetailDrawer'
import AuditLogsHeader, { AuditLogsFilters } from '@/components/super-admin/audit-logs/AuditLogsHeader'
import AuditLogsPagination from '@/components/super-admin/audit-logs/AuditLogsPagination'
import AuditLogsStats from '@/components/super-admin/audit-logs/AuditLogsStats'
import AuditLogsTimeline from '@/components/super-admin/audit-logs/AuditLogsTimeline'
import { AuditLogsEmptyState, AuditLogsErrorState, AuditLogsSkeleton } from '@/components/super-admin/audit-logs/AuditLogsStates'
import { AUDIT_LOGS_PER_PAGE_KEY } from '@/components/super-admin/audit-logs/constants'
import { AuditLogsExportMenu, useAuditLogsExport } from '@/components/super-admin/audit-logs/exportAuditLogs'
import { buildApiQuery, useAuditLogFilters, useAuditLogsData } from '@/components/super-admin/audit-logs/hooks'
import { formatEnglishCount } from '@/utils/formatEnglishNumber'

export default function SuperAdminAuditLogsPage() {
  const { filters, debouncedSearch, patchFilters, resetFilters, hasActiveFilters } = useAuditLogFilters()
  const apiQuery = useMemo(() => buildApiQuery(filters, debouncedSearch), [filters, debouncedSearch])

  const {
    entries, stats, total, page, perPage, lastPage, from, to,
    loading, refreshing, error, reload,
  } = useAuditLogsData(apiQuery)

  const { exporting, menuOpen, setMenuOpen, exportAs } = useAuditLogsExport(apiQuery)
  const [drawerEntry, setDrawerEntry] = useState<AdminAuditLogEntry | null>(null)

  const handlePerPageChange = (n: number) => {
    try { localStorage.setItem(AUDIT_LOGS_PER_PAGE_KEY, String(n)) } catch { /* ignore */ }
    patchFilters({ per_page: n, page: 1 })
  }

  const showSkeleton = loading && entries.length === 0

  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC]">
      <AuditLogsHeader
        loading={loading || refreshing}
        onRefresh={() => void reload()}
        onExport={() => setMenuOpen(true)}
        exporting={exporting}
      />

      <div className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <AuditLogsStats stats={stats} />
        </motion.div>

        <AuditLogsFilters
          filters={filters}
          onPatch={patchFilters}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-bold text-muted-500">
            {loading || refreshing ? (
              <span className="flex items-center gap-2 text-muted-400">
                <Loader2 size={13} className="animate-spin" />
                جارٍ التحميل...
              </span>
            ) : (
              <>
                <span className="font-black text-ink-500">{formatEnglishCount(total)}</span> سجل
                {total > 0 && (
                  <span className="mr-2 text-muted-400">
                    (عرض {formatEnglishCount(from ?? 0)}–{formatEnglishCount(to ?? 0)})
                  </span>
                )}
              </>
            )}
          </p>
          {(stats.most_active_user || stats.most_common_action) && (
            <p className="hidden text-[11px] font-semibold text-muted-400 lg:block">
              {stats.most_active_user && <>الأكثر نشاطاً: {stats.most_active_user}</>}
              {stats.most_common_action && <> · الإجراء الأكثر: {stats.most_common_action}</>}
            </p>
          )}
        </div>

        {error && <AuditLogsErrorState message={error} onRetry={() => void reload()} />}
        {showSkeleton && <AuditLogsSkeleton />}
        {!loading && !error && entries.length === 0 && (
          <AuditLogsEmptyState hasActiveFilters={hasActiveFilters} onReset={resetFilters} />
        )}
        {!showSkeleton && !error && entries.length > 0 && (
          <AuditLogsTimeline entries={entries} onOpenDetail={setDrawerEntry} />
        )}
      </div>

      <AuditLogsPagination
        page={page}
        lastPage={lastPage}
        perPage={perPage}
        total={total}
        from={from}
        to={to}
        onPageChange={(p) => patchFilters({ page: p })}
        onPerPageChange={handlePerPageChange}
      />

      <AuditLogDetailDrawer entry={drawerEntry} onClose={() => setDrawerEntry(null)} />

      <AuditLogsExportMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onExport={(format) => void exportAs(format)}
        exporting={exporting}
      />
    </div>
  )
}
