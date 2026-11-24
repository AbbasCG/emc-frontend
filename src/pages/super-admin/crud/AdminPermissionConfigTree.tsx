import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import apiClient from '../../../api/axios';
import { Shield, ShieldOff, Check, X, Users, ChevronRight, Settings2, UserSearch } from 'lucide-react';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { PermissionHoldersPanel } from '@/components/access-control/PermissionHoldersPanel';
import { permissionNoteAr } from '@/utils/permissionLabels';

interface Role {
  id: number;
  name: string;
  display_name: string;
}

interface PermissionNode {
  id: number;
  parent_id: number | null;
  node_type: string;
  key: string;
  label_ar: string;
  label_en: string | null;
  permission_name: string | null;
  is_delegatable: boolean;
  is_system: boolean;
}

export default function AdminPermissionConfigTree() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [tree, setTree] = useState<PermissionNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdersFor, setHoldersFor] = useState<PermissionNode | null>(null);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/admin/permissions/roles');
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch {
      setError('فشل في جلب قائمة الأدوار');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever its inputs change
    void fetchRoles();
  }, []);

  const fetchTree = async (role: Role) => {
    setIsLoading(true);
    setSelectedRole(role);
    try {
      const response = await apiClient.get(`/admin/permissions/roles/${role.name}/delegatable`);
      if (response.data.success) {
        setTree(response.data.tree);
      }
    } catch {
      setError('فشل في جلب إعدادات التفويض للدور');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDelegatable = async (node: PermissionNode) => {
    if (!selectedRole || node.is_system || !node.permission_name) return;

    const newValue = !node.is_delegatable;
    
    // Optimistic UI update
    setTree(prev => prev.map(n => n.id === node.id ? { ...n, is_delegatable: newValue } : n));

    try {
      await apiClient.post(`/admin/permissions/roles/${selectedRole.name}/delegatable/toggle`, {
        permission_name: node.permission_name,
        is_delegatable: newValue
      });
    } catch {
      // Revert on error
      setTree(prev => prev.map(n => n.id === node.id ? { ...n, is_delegatable: !newValue } : n));
      setError('حدث خطأ أثناء تعديل إعدادات التفويض');
    }
  };

  const renderNode = (node: PermissionNode) => {
    return (
      <div key={node.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          {node.node_type === 'section' ? <Shield className="w-5 h-5 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div>
            <p className={`text-sm ${node.node_type === 'section' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
              {node.label_ar}
            </p>
            {node.is_system && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">صلاحية نظام مقفلة</span>}
            {permissionNoteAr(node.permission_name ?? '') ? <p data-testid="permission-note" className="mt-1 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-amber-800">{permissionNoteAr(node.permission_name ?? '')}</p> : null}
          </div>
        </div>
        
        {node.permission_name && (
          <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setHoldersFor(node)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <UserSearch className="h-4 w-4" aria-hidden />
            من يملك هذه الصلاحية
          </button>
          <button
            onClick={() => toggleDelegatable(node)}
            disabled={node.is_system}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              node.is_system
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : node.is_delegatable 
                  ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {node.is_delegatable ? <Check className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            {node.is_delegatable ? 'قابل للتفويض' : 'غير قابل للتفويض'}
          </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-readex flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-purple-600" />
          إعدادات تفويض الصلاحيات
        </h1>
        <p className="text-gray-600 mt-2">حدد الصلاحيات التي يمكن لكل دور (مثل مدير الإدارة) تفويضها للموظفين التابعين له.</p>
        <div role="note" data-testid="delegation-page-purpose" className="mt-4 rounded-xl border border-purple-100 bg-purple-50/60 p-4 text-sm leading-relaxed text-gray-700">
          <p className="font-semibold text-gray-900">ما وظيفة هذه الصفحة؟</p>
          <p className="mt-1">
            هذه الصفحة تحدد فقط ما يحق لقائد الإدارة أن يفوّضه لأعضاء إدارته (شجرة التفويض). وهي لا تمنح صلاحية لأي شخص.
          </p>
          <p className="mt-1">
            لمنح الصلاحية لشخص بعينه:{' '}
            <Link to="/dashboard/super-admin/access-control?tab=users" className="font-bold text-purple-700 underline underline-offset-2">
              إدارة الوصول والصلاحيات ← المستخدمون ← صلاحيات الإجراءات
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center">
          <p>{error}</p>
          <button onClick={() => setError(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              الأدوار
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {roles.length === 0 ? (
              <div className="p-6 text-center text-gray-500">جاري تحميل الأدوار...</div>
            ) : (
              roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => fetchTree(role)}
                  className={`w-full text-right p-4 transition-colors hover:bg-gray-50 flex flex-col gap-1 ${selectedRole?.id === role.id ? 'bg-purple-50/50 border-r-4 border-purple-500' : ''}`}
                >
                  <span className="font-medium text-gray-900">{role.display_name}</span>
                  <span className="text-xs text-gray-500">{role.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Permission Tree */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedRole ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 gap-4">
              <Shield className="w-12 h-12 opacity-20" />
              <p>اختر دوراً لتحديد الصلاحيات القابلة للتفويض</p>
            </div>
          ) : isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-gray-900">إعدادات التفويض لـ: {selectedRole.display_name}</h2>
                  <p className="text-sm text-gray-500">حدد ما يمكن لـ "{selectedRole.display_name}" منحه للآخرين.</p>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {tree.map(node => renderNode(node))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CenteredModal
        open={holdersFor != null}
        onClose={() => setHoldersFor(null)}
        title="من يملك هذه الصلاحية"
        subtitle={holdersFor?.label_ar}
        size="lg"
      >
        {holdersFor?.permission_name ? <PermissionHoldersPanel permissionKey={holdersFor.permission_name} /> : null}
      </CenteredModal>
    </div>
  );
}
