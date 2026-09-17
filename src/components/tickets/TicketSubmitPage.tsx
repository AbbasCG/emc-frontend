import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ticketService } from '@/services/ticketService';
import { useAuth } from '@/contexts/AuthContext';
import type { Department, TicketCategory, TicketPriority } from '@/types/ticket';
import {
  AlertCircle,
  UploadCloud,
  FileText,
  Send,
  Sparkles,
  X,
  Ticket as TicketIcon,
  RefreshCw,
} from 'lucide-react';
import toast from '@/lib/toast';
import {
  ACCEPT_ATTRIBUTE,
  addFiles,
  formatBytes,
  pastedImageName,
  releasePreviews,
  REJECTION_MESSAGE_AR,
  type RejectionReason,
  type TicketAttachment,
} from '@/utils/ticketAttachments';

const PRIORITY_OPTIONS = [
  { id: 'LOW',      label: 'منخفضة',         dot: 'bg-slate-400' },
  { id: 'MEDIUM',   label: 'متوسطة',         dot: 'bg-blue-500' },
  { id: 'HIGH',     label: 'عالية',           dot: 'bg-amber-500' },
  { id: 'CRITICAL', label: 'حرجة / طارئة',   dot: 'bg-rose-600' },
];

const TicketSubmitPage: React.FC = () => {
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  const [category, setCategory]         = useState<TicketCategory>('OLD_ISSUE');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [priority, setPriority]         = useState<TicketPriority>('MEDIUM');
  const [attachments, setAttachments]   = useState<TicketAttachment[]>([]);

  // Derived from session — never ask the logged-in user to type their own name
  const submitterName  = user?.name  ?? '';
  const submitterEmail = user?.email ?? '';

  useEffect(() => {
    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const meta = await ticketService.getMeta();
        console.log('Ticket API Meta Response:', meta);
        const depts = meta?.departments || [];
        setDepartments(depts);
        if (depts.length > 0) {
          const tech = depts.find(
            (d) => d.slug === 'tech-support' || d?.name_ar?.includes('التقنية')
          );
          setDepartmentId(String(tech ? tech.id : depts[0].id));
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        toast.error('تعذّر تحميل بيانات الإدارات');
      } finally {
        setMetaLoading(false);
      }
    };
    fetchMeta();
  }, []);

  /**
   * THE one place attachments enter the form.
   *
   * The picker, drag-drop and clipboard paste all funnel through here, so a
   * single validation rule and a single preview-URL lifecycle covers every
   * path - there is deliberately no second upload implementation.
   */
  const acceptFiles = useCallback(
    (incoming: File[], nameFor?: (file: File, index: number) => string | undefined) => {
      if (incoming.length === 0) return 0;

      const { accepted, rejected } = addFiles(incoming, nameFor);

      if (accepted.length > 0) {
        setAttachments((prev) => [...prev, ...accepted]);
      }

      // One toast per distinct reason, so pasting a video and an oversized
      // image explains both without stacking a toast per file.
      new Set<RejectionReason>(rejected).forEach((reason) => {
        toast.error(REJECTION_MESSAGE_AR[reason]);
      });

      return accepted.length;
    },
    [],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    acceptFiles(Array.from(e.target.files));
    // Let the same file be picked again after removal.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    acceptFiles(Array.from(e.dataTransfer.files));
  };

  /**
   * Clipboard image paste.
   *
   * Bound to the FORM, not the dropzone: a paste event is delivered to the
   * focused element, and the dropzone is a plain div with no tabIndex whose
   * only child input is hidden - so a handler there can never fire for the way
   * people actually paste a screenshot. One handler at the form also means a
   * single paste cannot be counted twice by a nested handler.
   *
   * Non-image pastes return BEFORE preventDefault(), so ordinary text paste is
   * completely untouched.
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLFormElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (imageFiles.length === 0) return;

    e.preventDefault();

    const added = acceptFiles(imageFiles, pastedImageName);

    if (added > 0) {
      toast.success(
        added === 1
          ? 'تم لصق الصورة وإضافتها للمرفقات'
          : `تم لصق ${added} صور وإضافتها للمرفقات`
      );
    }
  };

  /** Removing an attachment must release its preview URL, or the file leaks. */
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const going = prev.filter((a) => a.id === id);
      releasePreviews(going);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setCategory('OLD_ISSUE');
    setAttachments((prev) => {
      releasePreviews(prev);
      return [];
    });
  };

  // Release every outstanding preview URL when the page goes away. A ref keeps
  // the effect from re-running (and revoking live URLs) on every change.
  const attachmentsRef = useRef<TicketAttachment[]>([]);
  attachmentsRef.current = attachments;
  useEffect(() => () => releasePreviews(attachmentsRef.current), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !departmentId) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('ticket_category', category);
      formData.append('priority', priority);
      formData.append('department_id', departmentId);
      formData.append('created_by_name', submitterName || 'مستخدم');
      if (submitterEmail) formData.append('created_by_email', submitterEmail);
      attachments.forEach(({ file }) => formData.append('attachments[]', file));

      const res = await ticketService.createTicket(formData);
      if (res.success && res.data) {
        toast.success(`تم إرسال بلاغك بنجاح. رقم التذكرة: #${res.data.id}`);
        handleReset();
      } else {
        toast.error(res.message || 'حدث خطأ أثناء حفظ التذكرة');
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const status = axiosErr.response?.status;

      if (status === 422) {
        // Validation: surface the first field message, which is already a safe
        // Arabic string from the server - never a stack trace or SQL text.
        const first = Object.values(axiosErr.response?.data?.errors ?? {})[0]?.[0];
        toast.error(first || 'تعذر رفع المرفق. تحقق من نوع الملف وحجمه.');
      } else if (status === 413) {
        toast.error('حجم الملف يتجاوز الحد المسموح.');
      } else if (status === undefined) {
        toast.error('تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.');
      } else {
        toast.error('حدث خطأ أثناء حفظ التذكرة. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>منظومة التذاكر الموحدة — EMC Tickets</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">إدخال بلاغ أو مقترح جديد</h1>
              <p className="mt-2 text-slate-300 text-sm max-w-xl leading-relaxed">
                دوّن مشكلتك الفنية أو مقترحك التطويري ووجّهه للإدارة المختصة. ستتولى قيادة إدارة التقنية مراجعته واعتماد إحالته.
              </p>
              {user && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-200 bg-white/10 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span>مُقدَّم باسم: <strong>{user.name}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {metaLoading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-semibold">جاري تحميل بيانات الإدارات...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} onPaste={handlePaste} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-8">

            {/* ── Ticket Type ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">
                نوع الطلب <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: 'OLD_ISSUE' as TicketCategory,
                    icon: <AlertCircle className="w-6 h-6" />,
                    title: 'مشكلة قائمة / قديمة',
                    desc: 'بلاغ عن عطل فني، خلل برمجي، أو مشكلة تشغيلية سابقة.',
                    active: 'border-amber-500 bg-amber-50/40',
                    iconBg: 'bg-amber-500 text-white',
                    iconIdle: 'bg-slate-100 text-amber-600',
                  },
                  {
                    id: 'NEW_SUGGESTION' as TicketCategory,
                    icon: <Sparkles className="w-6 h-6" />,
                    title: 'مقترح جديد / تطويري',
                    desc: 'فكرة لتحسين تجربة المستخدم أو إضافة ميزة برمجية جديدة.',
                    active: 'border-emerald-500 bg-emerald-50/40',
                    iconBg: 'bg-emerald-500 text-white',
                    iconIdle: 'bg-slate-100 text-emerald-600',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-right transition ${
                      category === opt.id ? opt.active + ' shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-3 rounded-xl shrink-0 ${category === opt.id ? opt.iconBg : opt.iconIdle}`}>
                      {opt.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{opt.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Target Department ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                الإدارة المستهدفة <span className="text-rose-500">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                required
              >
                <option value="">-- اختر الإدارة للتوجيه المباشر --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name_ar} {dept.name ? `(${dept.name})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <TicketIcon className="w-3 h-3" />
                ستُدرَج التذكرة بحالة <strong>معلقة</strong> حتى يعتمدها مدير الإدارة التقنية.
              </p>
            </div>

            {/* ── Priority ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-3">مستوى الأهمية</label>
              <div className="flex flex-wrap gap-3">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as TicketPriority)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      priority === p.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Title ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                عنوان المشكلة / المقترح <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تعذر رفع المرفقات في صفحة طلب الورك شوب"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
            </div>

            {/* ── Description ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                الشرح والتفاصيل الدقيقة <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح المشكلة بالتفصيل والخطوات المؤدية لظهورها أو الأثر المرجو من المقترح الجديد..."
                className="w-full rounded-xl border border-slate-300 p-4 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-y"
                required
              />
            </div>

            {/* ── File Upload ── */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                مرفقات توضيحية (صور / فيديو / مستندات)
              </label>
              <div
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center transition cursor-pointer bg-slate-50/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('ticket-media-input')?.click()}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  className="hidden"
                  id="ticket-media-input"
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">اضغط أو اسحب وأفلت الملفات هنا</span>
                  <span className="text-xs text-slate-400">JPG, PNG, WEBP, PDF — حتى 50 ميجابايت لكل ملف</span>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      {att.isImage && att.previewUrl ? (
                        <img
                          src={att.previewUrl}
                          alt={att.file.name}
                          loading="lazy"
                          className="h-28 w-full bg-slate-50 object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center bg-slate-50">
                          <FileText className="h-9 w-9 text-amber-500" />
                        </div>
                      )}

                      <div className="p-2 text-right">
                        <p className="truncate text-[11px] font-semibold text-slate-800" title={att.file.name}>
                          {att.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatBytes(att.file.size)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        aria-label={`إزالة ${att.file.name}`}
                        className="absolute top-1.5 left-1.5 rounded-lg bg-white/90 p-1 text-rose-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-bold transition"
              >
                <RefreshCw className="w-4 h-4" />
                مسح الحقول / إلغاء
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري إرسال التذكرة...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال التذكرة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TicketSubmitPage;
