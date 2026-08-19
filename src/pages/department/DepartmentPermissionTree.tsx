import React, { useEffect, useState } from 'react';
import apiClient from '../../api/axios';
import { Shield, ShieldOff, Check, X, Users, ChevronRight, Lock } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PermissionNode {
  id: number;
  parent_id: number | null;
  node_type: string;
  key: string;
  label_ar: string;
  label_en: string | null;
  permission_name: string | null;
  has_permission: boolean;
  can_delegate: boolean;
  assignment_state?: 'inherited' | 'granted' | 'denied' | 'none';
  is_system: boolean;
}

export default function DepartmentPermissionTree() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [tree, setTree] = useState<PermissionNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/api/department/employees');
      if (response.data.success) {
        setEmployees(response.data.employees);
      }
    } catch (err: any) {
      setError('فشل في جلب قائمة الموظفين');
    }
  };

  const fetchTree = async (employee: Employee) => {
    setIsLoading(true);
    setSelectedEmployee(employee);
    try {
      const response = await apiClient.get(`/api/department/employees/${employee.id}/permission-tree`);
      if (response.data.success) {
        setTree(response.data.tree);
      }
    } catch (err: any) {
      setError('فشل في جلب شجرة الصلاحيات للموظف');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = async (node: PermissionNode) => {
    if (!node.can_delegate || !selectedEmployee || node.is_system) return;

    const action = node.has_permission ? 'revoke' : 'grant';
    const oldHasPermission = node.has_permission;
    const oldState = node.assignment_state;
    
    // Optimistic UI update
    setTree(prev => prev.map(n => n.id === node.id ? { 
      ...n, 
      has_permission: !oldHasPermission,
      assignment_state: oldHasPermission ? 'denied' : 'granted'
    } : n));

    try {
      await apiClient.post(`/api/department/employees/${selectedEmployee.id}/permissions/${action}`, {
        permission_name: node.permission_name
      });
    } catch (err: any) {
      // Revert on error
      setTree(prev => prev.map(n => n.id === node.id ? { 
        ...n, 
        has_permission: oldHasPermission,
        assignment_state: oldState
      } : n));
      setError(err.response?.data?.message || 'حدث خطأ أثناء تعديل الصلاحية');
    }
  };

  const getButtonStyles = (node: PermissionNode) => {
    if (node.is_system) {
      return {
        className: 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed',
        icon: <ShieldOff className="w-4 h-4" />,
        text: 'مقفلة للنظام'
      };
    }

    if (!node.can_delegate) {
      return {
        className: 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed',
        icon: <Lock className="w-4 h-4" />,
        text: 'ممنوعة/خارج النطاق'
      };
    }

    if (node.assignment_state === 'inherited') {
      return {
        className: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
        icon: <Check className="w-4 h-4" />,
        text: 'موروثة (سحب)'
      };
    }

    if (node.has_permission) {
      return {
        className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
        icon: <Check className="w-4 h-4" />,
        text: 'ممنوحة من المدير'
      };
    }

    return {
      className: 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50',
      icon: <ChevronRight className="w-4 h-4" />,
      text: 'قابلة للتفويض (منح)'
    };
  };

  const renderNode = (node: PermissionNode) => {
    const btnStyle = getButtonStyles(node);

    return (
      <div key={node.id} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          {node.node_type === 'section' ? <Shield className="w-5 h-5 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div>
            <p className={`text-sm ${node.node_type === 'section' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
              {node.label_ar}
            </p>
            {node.is_system && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full mt-1 inline-block">صلاحية نظام مقفلة</span>}
          </div>
        </div>
        
        {node.permission_name && (
          <button
            onClick={() => togglePermission(node)}
            disabled={!node.can_delegate || node.is_system}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${btnStyle.className}`}
          >
            {btnStyle.icon}
            {btnStyle.text}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-readex">إدارة تفويض الصلاحيات</h1>
        <p className="text-gray-600 mt-2">قم بمنح أو سحب الصلاحيات من موظفي الإدارات التابعة لك.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center">
          <p>{error}</p>
          <button onClick={() => setError(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employees List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              الموظفون التابعون
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {employees.length === 0 ? (
              <div className="p-6 text-center text-gray-500">لا يوجد موظفين في نطاقك.</div>
            ) : (
              employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => fetchTree(emp)}
                  className={`w-full text-right p-4 transition-colors hover:bg-gray-50 flex flex-col gap-1 ${selectedEmployee?.id === emp.id ? 'bg-indigo-50/50 border-r-4 border-indigo-500' : ''}`}
                >
                  <span className="font-medium text-gray-900">{emp.name}</span>
                  <span className="text-xs text-gray-500">{emp.email} • {emp.role}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Permission Tree */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedEmployee ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 gap-4">
              <Shield className="w-12 h-12 opacity-20" />
              <p>اختر موظفاً لاستعراض شجرة الصلاحيات الخاصة به</p>
            </div>
          ) : isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-gray-900">صلاحيات: {selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-500">يمكنك تعديل الصلاحيات المفوضة لك فقط.</p>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {/* Render sections and their children recursively or linearly since they are ordered */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {tree.map(node => renderNode(node))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
