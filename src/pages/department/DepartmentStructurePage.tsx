import { useEffect, useState } from 'react';
import apiClient from '../../api/axios';
import {
  FolderTree,
  Users,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  Building2,
  UserPlus,
  Layers,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Leader {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Member {
  team_member_id?: number;
  user_id: number;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  role_title?: string;
  status?: string;
  section_id?: number | null;
}

interface Section {
  id: number;
  name: string;
  description?: string;
  status: string;
  sort_order: number;
  leader?: Leader | null;
  members: Member[];
  member_count: number;
}

interface Department {
  id: number;
  name: string;
  description?: string;
  leader?: Leader | null;
}

interface DepartmentOption {
  id: number;
  name: string;
}

export default function DepartmentStructurePage() {
  const [department, setDepartment] = useState<Department | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [unassignedMembers, setUnassignedMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'list'>('chart');

  // Modal States
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [sectionLeaderId, setSectionLeaderId] = useState<number | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningMember, setAssigningMember] = useState<Member | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const [roleTitle, setRoleTitle] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStructure();
  }, [selectedDeptId]);

  const fetchStructure = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = selectedDeptId ? `/department/structure?department_id=${selectedDeptId}` : '/department/structure';
      const res = await apiClient.get(url);
      if (res.data.success) {
        setDepartment(res.data.department);
        setSections(res.data.sections || []);
        setUnassignedMembers(res.data.unassigned_members || []);
        setAllMembers(res.data.all_members || []);
        setDepartments(res.data.departments || []);
        if (res.data.department && !selectedDeptId) {
          setSelectedDeptId(res.data.department.id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء جلب الهيكلة الإدارية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionName('');
    setSectionDesc('');
    setSectionLeaderId(null);
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: Section) => {
    setEditingSection(sec);
    setSectionName(sec.name);
    setSectionDesc(sec.description || '');
    setSectionLeaderId(sec.leader?.id || null);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim() || !department) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingSection) {
        await apiClient.put(`/department/sections/${editingSection.id}`, {
          name: sectionName,
          description: sectionDesc,
          leader_id: sectionLeaderId
        });
        setSuccessMsg('تم تحديث التقسيم الإداري بنجاح');
      } else {
        await apiClient.post('/department/sections', {
          department_id: department.id,
          name: sectionName,
          description: sectionDesc,
          leader_id: sectionLeaderId
        });
        setSuccessMsg('تم إنشاء التقسيم الإداري بنجاح');
      }
      setIsSectionModalOpen(false);
      fetchStructure();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ التقسيم الإداري');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async (secId: number) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا التقسيم الإداري؟ سيتم إلغاء تسكين الأعضاء المقترنين به بدون حذفهم.')) {
      return;
    }

    try {
      await apiClient.delete(`/department/sections/${secId}`);
      setSuccessMsg('تم حذف التقسيم بنجاح');
      fetchStructure();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل في حذف التقسيم');
    }
  };

  const handleOpenAssignModal = (member: Member, currentSecId?: number | null) => {
    setAssigningMember(member);
    setTargetSectionId(currentSecId ?? member.section_id ?? null);
    setRoleTitle(member.role_title || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveMemberAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningMember || !department) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/department/members/assign-section', {
        user_id: assigningMember.user_id,
        department_id: department.id,
        section_id: targetSectionId,
        role_title: roleTitle
      });
      setSuccessMsg('تم تحديث تسكين وتأطير العضو بنجاح');
      setIsAssignModalOpen(false);
      fetchStructure();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل في تحديث تسكين العضو');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 dir-rtl font-readex">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                هيكلة وتأطير الإدارة
              </span>
              {departments.length > 1 && (
                <select
                  value={selectedDeptId || ''}
                  onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                  className="bg-white/10 text-white text-xs border border-white/20 rounded-lg px-3 py-1 focus:outline-none focus:bg-white/20"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} className="text-gray-900">
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {department ? department.name : 'الهيكلة الإدارية'}
            </h1>
            <p className="text-emerald-100/80 text-sm mt-1 max-w-2xl">
              قم بإنشاء الأقسام الفرعية والوحدات التنظيمية، وتسكين أعضاء فريك وتحديد المسمى التنظيمي لكل فرد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenCreateSection}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة تقسيم إداري
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {department && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Building2 className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs text-emerald-200">الأقسام الفرعية</p>
                <p className="text-lg font-bold">{sections.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Users className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <p className="text-xs text-emerald-200">إجمالي الأعضاء</p>
                <p className="text-lg font-bold">{allMembers.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <UserCheck className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <p className="text-xs text-emerald-200">المسكّنون بالتقسيمات</p>
                <p className="text-lg font-bold">{allMembers.length - unassignedMembers.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs text-emerald-200">بانتظار التسكين</p>
                <p className="text-lg font-bold">{unassignedMembers.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl flex justify-between items-center border border-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl flex justify-between items-center border border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-5 h-5 text-emerald-400 hover:text-emerald-600" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 space-x-reverse space-x-4">
        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-3 px-4 font-medium text-sm transition-all relative ${
            activeTab === 'chart'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            <span>خارطة الهيكلة والتنظيم</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">
              {sections.length}
            </span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-4 font-medium text-sm transition-all relative ${
            activeTab === 'list'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>قائمة تسكين الأعضاء</span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {allMembers.length}
            </span>
          </div>
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">جاري تحميل الهيكلة الإدارية...</p>
        </div>
      ) : activeTab === 'chart' ? (
        /* TAB 1: ORG CHART CARDS */
        <div className="space-y-8">
          {/* Department Leader Card */}
          {department?.leader && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
                  {department.leader.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-medium">
                      مدير الإدارة
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{department.leader.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{department.leader.email}</p>
                </div>
              </div>

              <div className="text-xs text-emerald-800 bg-emerald-100/60 px-3 py-1.5 rounded-xl border border-emerald-200">
                القائد التنفيذي للإدارة
              </div>
            </div>
          )}

          {/* Sub-divisions Grid */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                التقسيمات والإقسام الفرعية ({sections.length})
              </h2>
              <button
                onClick={handleOpenCreateSection}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة قسم فرعي
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300">
                <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700">لم يتم إضافة تقسيمات إدارية فرعية بعد</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  يمكنك إضافة تقسيمات فرعية (مثل: وحدات، أفرع، أقسام) وتوزيع الموظفين عليها بمسمياتهم.
                </p>
                <button
                  onClick={handleOpenCreateSection}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء أول قسم فرعي
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Section Header */}
                      <div className="p-5 border-b border-gray-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            <h3 className="font-bold text-gray-900 text-base">{sec.name}</h3>
                          </div>
                          {sec.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sec.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditSection(sec)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="تعديل التقسيم"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="حذف التقسيم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Section Leader Badge */}
                      {sec.leader ? (
                        <div className="px-5 py-2.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-medium">مشرف القسم:</span>
                          <span className="font-semibold text-emerald-950">{sec.leader.name}</span>
                        </div>
                      ) : (
                        <div className="px-5 py-2 text-xs text-gray-400 border-b border-gray-50 italic">
                          لم يتم تحديد مشرف لهذا القسم
                        </div>
                      )}

                      {/* Section Members List */}
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                          <span>أعضاء القسم ({sec.members.length})</span>
                        </div>

                        {sec.members.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-2 text-center">لا يوجد أعضاء مقترنون بهذا القسم حالياً.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {sec.members.map((m) => (
                              <div
                                key={m.user_id}
                                className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                                    {m.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{m.name}</p>
                                    <p className="text-[10px] text-teal-700 font-medium">{m.role_title}</p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenAssignModal(m, sec.id)}
                                  className="text-gray-400 hover:text-emerald-700 p-1"
                                  title="تعديل المسمى / النقل"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setAssigningMember(null);
                          setTargetSectionId(sec.id);
                          setRoleTitle('عضو قسم');
                          setIsAssignModalOpen(true);
                        }}
                        className="w-full text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 py-2 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        تسكين عضو في هذا القسم
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Members Section */}
          {unassignedMembers.length > 0 && (
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900 text-base">
                    أعضاء بانتظار التسكين الهيكلي ({unassignedMembers.length})
                  </h3>
                </div>
                <p className="text-xs text-amber-700">هؤلاء الأعضاء يتبعون للإدارة ولكن لم يتم إسناد قسم فرعي لهم بعد.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {unassignedMembers.map((m) => (
                  <div
                    key={m.user_id}
                    className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-sm flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAssignModal(m, null)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      تسكين
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: MEMBERS ROSTER & ASSIGNMENT TABLE */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-900 text-base">جدول تسكين وتوزيع الأعضاء</h2>
              <p className="text-xs text-gray-500 mt-0.5">استعراض كافة منتسبي الإدارة وتحديث أقسامهم ومسمياتهم.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase">
                <tr>
                  <th className="p-4 font-semibold">العضو</th>
                  <th className="p-4 font-semibold">البريد الإلكتروني</th>
                  <th className="p-4 font-semibold">القسم الفرعي الحالي</th>
                  <th className="p-4 font-semibold">المسمى التنظيمي</th>
                  <th className="p-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allMembers.map((m) => {
                  const assignedSec = sections.find((s) => s.id === m.section_id);
                  return (
                    <tr key={m.user_id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-semibold text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {m.name.charAt(0)}
                        </div>
                        <span>{m.name}</span>
                      </td>
                      <td className="p-4 text-gray-600">{m.email}</td>
                      <td className="p-4">
                        {assignedSec ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                            {assignedSec.name}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">غير مسكّن</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-800">{m.role_title || '—'}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenAssignModal(m, m.section_id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          تعديل التسكين
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SECTION MODAL */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl dir-rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSection ? 'تعديل التقسيم الإداري' : 'إضافة تقسيم إداري جديد'}
              </h3>
              <button onClick={() => setIsSectionModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">اسم القسم الفرعي / التقسيم *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وحدة البرمجة، قسم الدعم الفني، شعبة التخطيط"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">الوصف أو المهام الأساسية</label>
                <textarea
                  rows={3}
                  placeholder="وصف مختصر لمسؤوليات هذا التقسيم..."
                  value={sectionDesc}
                  onChange={(e) => setSectionDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">مشرف التقسيم (اختياري)</label>
                <select
                  value={sectionLeaderId || ''}
                  onChange={(e) => setSectionLeaderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">بدون مشرف خاص</option>
                  {allMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التقسيم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MEMBER MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl dir-rtl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">تسكين وتأطير عضو بالإدارة</h3>
              <button onClick={() => setIsAssignModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">اختر العضو *</label>
                <select
                  disabled={Boolean(assigningMember)}
                  value={assigningMember?.user_id || ''}
                  onChange={(e) => {
                    const found = allMembers.find((m) => m.user_id === Number(e.target.value));
                    if (found) setAssigningMember(found);
                  }}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">اختر عضواً...</option>
                  {allMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">القسم الفرعي / التقسيم المستهدف</label>
                <select
                  value={targetSectionId || ''}
                  onChange={(e) => setTargetSectionId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">غير مسكّن بقسم فرعي معين</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">المسمى التنظيمي الوظيفي داخل التقسيم</label>
                <input
                  type="text"
                  placeholder="مثال: مشرف مسار، مصمم جرافيك، عضو فريق الدعم، محرر"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !assigningMember}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التسكين...' : 'حفظ التسكين والمسمى'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
