import { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, ImageOff } from 'lucide-react';
import { downloadTicketAttachment, fetchTicketAttachmentBlob } from '@/api/ticketAttachmentsApi';
import { formatBytes } from '@/utils/ticketAttachments';
import type { TicketAttachment } from '@/types/ticket';
import toast from '@/lib/toast';

/**
 * One ticket attachment, previewed inline when it is an image.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THE IMAGE IS FETCHED RATHER THAN LINKED
 * ─────────────────────────────────────────────────────────────────────────
 * The attachment endpoint is private and behind auth:sanctum. Pointing an
 * <img src> or <a href> at it makes the BROWSER request the file, and a browser
 * navigation does not carry the `Authorization: Bearer` header the SPA's axios
 * client attaches - which is why opening the URL directly answered
 * "Unauthenticated". Fetching through the authenticated client and rendering
 * the bytes as a temporary object URL keeps the file private, keeps the
 * endpoint's authorization intact, and exposes no storage URL.
 *
 * The object URL is revoked on unmount and whenever the attachment changes;
 * an unrevoked one pins the whole image in memory for the life of the document.
 */
export function TicketAttachmentCard({ attachment }: { attachment: TicketAttachment }) {
  // mime_type is absent on rows created before it was recorded, so fall back to
  // the coarse file_type every row has always carried. Historical images stay
  // previewable with no backfill.
  const isImage = attachment.is_image ?? attachment.file_type === 'IMAGE';
  const fileName = attachment.file_name || 'مرفق';

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isImage) return;

    let alive = true;

    (async () => {
      try {
        const { objectUrl: url } = await fetchTicketAttachmentBlob(
          attachment.ticket_id,
          attachment.id,
        );

        if (!alive) {
          // Unmounted mid-flight: release immediately rather than leaking.
          URL.revokeObjectURL(url);
          return;
        }

        urlRef.current = url;
        setObjectUrl(url);
      } catch {
        // A failed thumbnail must not block the rest of the page, and the
        // download button below still works.
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [attachment.id, attachment.ticket_id, isImage]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTicketAttachment(attachment.ticket_id, attachment.id, fileName);
    } catch {
      toast.error('تعذر تنزيل المرفق. حاول مرة أخرى.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {isImage ? (
        failed ? (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
            <ImageOff className="h-7 w-7" aria-hidden="true" />
            <span className="text-[11px]">تعذر عرض الصورة</span>
          </div>
        ) : objectUrl ? (
          <a href={objectUrl} target="_blank" rel="noopener noreferrer" title="عرض بحجم أكبر">
            <img
              src={objectUrl}
              alt={fileName}
              loading="lazy"
              className="h-40 w-full bg-slate-50 object-cover transition hover:opacity-90"
            />
          </a>
        ) : (
          <div
            className="h-40 w-full animate-pulse bg-slate-100"
            role="status"
            aria-label="جارٍ تحميل الصورة"
          />
        )
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-slate-50">
          <FileText className="h-10 w-10 text-amber-500" aria-hidden="true" />
        </div>
      )}

      <div className="space-y-2 p-3 text-right">
        <div>
          <p className="truncate text-xs font-semibold text-slate-800" title={fileName}>
            {fileName}
          </p>
          {typeof attachment.file_size === 'number' && attachment.file_size > 0 && (
            <p className="text-[10px] text-slate-400">{formatBytes(attachment.file_size)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isImage && objectUrl && (
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              عرض
            </a>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {downloading ? 'جارٍ التنزيل…' : 'تنزيل'}
          </button>
        </div>
      </div>
    </div>
  );
}
