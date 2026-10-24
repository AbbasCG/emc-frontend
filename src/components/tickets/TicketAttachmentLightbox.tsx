import { Fragment, useEffect, useRef, useState } from 'react';
import { Download, ImageOff, X } from 'lucide-react';

/**
 * "PNG · 340 KB · 12 يناير 2026" with each part isolated as its own bidi run.
 * Joined into one string, the Latin size ("340 KB") reorders to "KB 340" inside
 * an RTL line.
 */
export function AttachmentMetaLine({ parts, className = '' }: { parts: string[]; className?: string }) {
  const visible = parts.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 ${className}`}>
      {visible.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <bdi>{part}</bdi>
        </Fragment>
      ))}
    </p>
  );
}

interface TicketAttachmentLightboxProps {
  /** Temporary object URL owned by the caller; never a storage URL. */
  src: string;
  fileName: string;
  /** e.g. ["PNG", "340 KB", "12 يناير 2026"] */
  meta?: string[];
  downloading?: boolean;
  onDownload: () => void;
  onClose: () => void;
}

/**
 * Full-size view of an already-fetched attachment image.
 *
 * It renders the caller's object URL, so it makes no request of its own and the
 * file never leaves the authenticated path. Esc, the backdrop and the close
 * button all dismiss; focus moves in on open and back to the opener on close.
 */
export function TicketAttachmentLightbox({
  src,
  fileName,
  meta,
  downloading = false,
  onDownload,
  onClose,
}: TicketAttachmentLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      dir="rtl"
      className="fixed inset-0 z-[70] flex flex-col bg-navy/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" title={fileName}>
            {fileName}
          </p>
          {meta && <AttachmentMetaLine parts={meta} className="text-[11px] text-white/70" />}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloading ? 'جارٍ التنزيل…' : 'تنزيل'}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {broken ? (
          <div
            className="flex flex-col items-center gap-2 text-white/80"
            onClick={(event) => event.stopPropagation()}
          >
            <ImageOff className="h-10 w-10" aria-hidden="true" />
            <span className="text-sm">تعذر عرض الصورة</span>
          </div>
        ) : (
          <img
            src={src}
            alt={fileName}
            onError={() => setBroken(true)}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-xl bg-white/5 object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
