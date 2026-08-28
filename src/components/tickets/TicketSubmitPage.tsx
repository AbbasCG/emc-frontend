import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ticketService } from '@/services/ticketService';
import { useAuth } from '@/contexts/AuthContext';
import type { Department, TicketCategory, TicketPriority } from '@/types/ticket';
import {
  AlertCircle,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  Send,
  Sparkles,
  ArrowRight,
  X,
  Ticket as TicketIcon,
  RefreshCw,
} from 'lucide-react';
import toast from '@/lib/toast';

const PRIORITY_OPTIONS = [
  { id: 'LOW',      label: 'منخفضة',         dot: 'bg-slate-400' },
  { id: 'MEDIUM',   label: 'متوسطة',         dot: 'bg-blue-500' },
  { id: 'HIGH',     label: 'عالية',           dot: 'bg-amber-500' },
  { id: 'CRITICAL', label: 'حرجة / طارئة',   dot: 'bg-rose-600' },
];

const TicketSubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  const [category, setCategory]         = useState<TicketCategory>('OLD_ISSUE');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [priority, setPriority]         = useState<TicketPriority>('MEDIUM');
  const [files, setFiles]               = useState<File[]>([]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setCategory('OLD_ISSUE');
    setFiles([]);
  };

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
      files.forEach((file) => formData.append('attachments[]', file));

      const res = await ticketService.createTicket(formData);
      if (res.success && res.data) {
        toast.success(`تم إرسال بلاغك بنجاح. رقم التذكرة: #${res.data.id}`);
        handleReset();
      } else {
        toast.error(res.message || 'حدث خطأ أثناء حفظ التذكرة');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'تعذر إرسال التذكرة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const FileIcon = ({ file }: { file: File }) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-violet-500 shrink-0" />;
    return <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
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
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-8">

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
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="ticket-media-input"
                />
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">اضغط أو اسحب وأفلت الملفات هنا</span>
                  <span className="text-xs text-slate-400">JPG, PNG, MP4, MOV, PDF — حتى 50 ميجابايت لكل ملف</span>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileIcon file={file} />
                        <span className="truncate font-medium text-slate-800">{file.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition ml-1"
                      >
                        <X className="w-4 h-4" />
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
