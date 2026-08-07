import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Layers, Settings, Search, Filter, Plus, Edit2, Trash2, CheckCircle2, Zap, Clock, XCircle } from 'lucide-react';
import { EmcButton } from '@/components/ui';
import { instituteApi, type InstituteClass, type InstituteInstructor, type InstituteWaitlistEntry } from '@/api/instituteApi';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';

interface LevelCard {
  id: number;
  name: string;
  activeStudents: number;
  maxCapacity: number;
}

interface DistributionResult {
  assigned: number;
  failed: number;
  details: string;
}

export default function InstituteAdminDashboard() {
    const [activeTab, setActiveTab] = useState<'levels' | 'classes' | 'waitlist' | 'distribution'>('levels');
    const navigate = useNavigate();

  // Mock Data
  const [waitlist, setWaitlist] = useState<InstituteWaitlistEntry[]>([]);
  const [isWaitlistLoading, setIsWaitlistLoading] = useState(true);

  // Mount fetch (P1) — `isWaitlistLoading` starts true, so the effect does no
  // synchronous setState; every update happens after the await.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await instituteApi.getWaitlist();
        if (alive) setWaitlist(res.data.waitlist || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      } finally {
        if (alive) setIsWaitlistLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Manual refresh from event handlers — synchronous setState allowed outside effects.
  const fetchWaitlist = async () => {
    try {
      setIsWaitlistLoading(true);
      const res = await instituteApi.getWaitlist();
      setWaitlist(res.data.waitlist || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setIsWaitlistLoading(false);
    }
  };

  const [levels, setLevels] = useState<LevelCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddLevelModalOpen, setIsAddLevelModalOpen] = useState(false);
  const [newLevelData, setNewLevelData] = useState({ 
    name: '', 
    capacity: 50, 
    price: 35,
    pricing_options: [{ title: '1 Level', levels: 1, price: 35 }]
  });

  // Mount fetch (P1) — `isLoading` starts true; setStates run after the await.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await instituteApi.getLevels();
        // map backend data (title_en, capacity, class_groups_count)
        const mappedLevels = res.data.levels.map((l) => ({
          id: l.id,
          name: l.title_en,
          activeStudents: l.class_groups_count * 10, // mock student count for now
          maxCapacity: l.capacity || 50,
        }));
        if (alive) setLevels(mappedLevels);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
        toast.error('Failed to load levels');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Manual refresh from event handlers — synchronous setState allowed outside effects.
  const fetchLevels = async () => {
    try {
      setIsLoading(true);
      const res = await instituteApi.getLevels();
      // map backend data (title_en, capacity, class_groups_count)
      const mappedLevels = res.data.levels.map((l) => ({
        id: l.id,
        name: l.title_en,
        activeStudents: l.class_groups_count * 10, // mock student count for now
        maxCapacity: l.capacity || 50,
      }));
      setLevels(mappedLevels);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      toast.error('Failed to load levels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLevel = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this level?')) return;
    try {
      await instituteApi.deleteLevel(id);
      toast.success('Level deleted successfully');
      fetchLevels();
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      toast.error('Failed to delete level');
    }
  };

  const [classes, setClasses] = useState<InstituteClass[]>([]);
  const [, setInstructors] = useState<InstituteInstructor[]>([]);
  const [isClassesLoading, setIsClassesLoading] = useState(true);

  // Re-entering the classes tab shows the loader again — adjust state during
  // render when the tab changes (P2) instead of a synchronous setState in the effect.
  const [seenTab, setSeenTab] = useState(activeTab);
  if (seenTab !== activeTab) {
    setSeenTab(activeTab);
    if (activeTab === 'classes') setIsClassesLoading(true);
  }

  // Tab fetch (P1) — setStates run after the awaits.
  useEffect(() => {
    if (activeTab !== 'classes') return;
    let alive = true;
    void (async () => {
      try {
        const res = await instituteApi.getClasses();
        if (alive) setClasses(res.data.classes || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      } finally {
        if (alive) setIsClassesLoading(false);
      }
    })();
    void (async () => {
      try {
        const res = await instituteApi.getInstructors();
        if (alive) setInstructors(res.data.instructors || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      }
    })();
    return () => { alive = false; };
  }, [activeTab]);

  // Manual refresh from event handlers — synchronous setState allowed outside effects.
  const fetchClasses = async () => {
    try {
      setIsClassesLoading(true);
      const res = await instituteApi.getClasses();
      setClasses(res.data.classes || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setIsClassesLoading(false);
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await instituteApi.deleteClass(id);
      toast.success('Class deleted successfully');
      fetchClasses();
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      toast.error('Failed to delete class');
    }
  };



  const submitNewLevel = async () => {
    if (!newLevelData.name) {
      alert("Please enter a level name.");
      return;
    }
    
    try {
      await instituteApi.createLevel({
        title_en: newLevelData.name,
        price: newLevelData.price,
        capacity: newLevelData.capacity,
        pricing_options: newLevelData.pricing_options
      });
      setIsAddLevelModalOpen(false);
      setNewLevelData({ 
        name: '', 
        capacity: 50, 
        price: 35,
        pricing_options: [{ title: '1 Level', levels: 1, price: 35 }]
      });
      fetchLevels();
    } catch {
      alert("Failed to create level.");
    }
  };

  const addPricingOption = () => {
    setNewLevelData(prev => ({
      ...prev,
      pricing_options: [...prev.pricing_options, { title: `${prev.pricing_options.length + 1} Levels`, levels: prev.pricing_options.length + 1, price: 0 }]
    }));
  };

  const updatePricingOption = (index: number, field: 'title' | 'levels' | 'price', value: string | number) => {
    const updated = [...newLevelData.pricing_options];
    const opt = { ...updated[index] };
    if (field === 'title' && typeof value === 'string') opt.title = value;
    else if (field === 'levels' && typeof value === 'number') opt.levels = value;
    else if (field === 'price' && typeof value === 'number') opt.price = value;
    updated[index] = opt;
    // update base price if first option changes
    let basePrice = newLevelData.price;
    if (index === 0 && field === 'price' && typeof value === 'number') {
      basePrice = value;
    }
    setNewLevelData(prev => ({ ...prev, pricing_options: updated, price: basePrice }));
  };

  const removePricingOption = (index: number) => {
    setNewLevelData(prev => ({
      ...prev,
      pricing_options: prev.pricing_options.filter((_, i) => i !== index)
    }));
  };

  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);

  const handleSmartDistribution = async () => {
    setIsDistributing(true);
    setDistributionResult(null);
    try {
      const res = await instituteApi.runSmartDistribution();
      setDistributionResult({
        assigned: res.data.assigned_count || 0,
        failed: res.data.failed_count || 0,
        details: res.data.message || 'Auto-assignment completed successfully.'
      });
      // refresh waitlist
      fetchWaitlist();
    } catch {
      alert("Failed to run smart distribution algorithm.");
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r flex flex-col hidden md:flex sticky top-0 h-screen text-slate-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-900/50">
              EA
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Inst. Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('waitlist')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'waitlist' ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span>Waitlist</span>
          </button>
          <button 
            onClick={() => setActiveTab('levels')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'levels' ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Layers className="w-5 h-5" />
            <span>Levels & Bundles</span>
          </button>
          <button 
            onClick={() => setActiveTab('classes')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'classes' ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span>Classes</span>
          </button>
          <button 
            onClick={() => setActiveTab('distribution')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'distribution' ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Zap className="w-5 h-5" />
            <span>Smart Distribution</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white border-b px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'waitlist' && 'Student Waitlist'}
              {activeTab === 'levels' && 'Levels Management'}
              {activeTab === 'classes' && 'Classes Management'}
              {activeTab === 'distribution' && 'Smart Distribution Engine'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage the English Institute operations seamlessly.</p>
          </div>
          <div className="flex items-center space-x-4">
            <EmcButton variant="outline" className="hidden sm:flex">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </EmcButton>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          
          {/* WAITLIST TAB */}
          {activeTab === 'waitlist' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center bg-white border rounded-lg px-3 py-2 w-full sm:w-96 shadow-sm focus-within:ring-2 focus-within:ring-primary-500">
                  <Search className="w-5 h-5 text-gray-400 mr-2" />
                  <input type="text" placeholder="Search students..." className="bg-transparent border-none outline-none w-full text-sm" />
                </div>
                <EmcButton variant="outline" className="bg-white">
                  <Filter className="w-4 h-4 mr-2" /> Filter by Level
                </EmcButton>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-600 text-sm font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Assigned Level</th>
                      <th className="px-6 py-4">Preferred Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isWaitlistLoading ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading waitlist...</td></tr>
                    ) : waitlist.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No students in the waitlist.</td></tr>
                    ) : waitlist.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{student.name || 'Student User'}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                            {student.level || 'Pending Placement'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{student.preferredTime || 'Not Set'}</td>
                        <td className="px-6 py-4">
                          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 flex items-center w-fit">
                            <Clock className="w-3 h-3 mr-1" /> {student.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-primary-600 hover:text-primary-800 font-medium text-sm">Review</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* LEVELS TAB */}
          {activeTab === 'levels' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-end">
                <EmcButton onClick={() => navigate('/dashboard/admin/institute/levels/new')}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Level
                </EmcButton>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading levels...</div>
              ) : levels.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">No Levels Found</h3>
                  <p className="text-gray-500 mb-4">You haven't created any institute levels yet.</p>
                  <EmcButton onClick={() => navigate('/dashboard/admin/institute/levels/new')}>Create First Level</EmcButton>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {levels.map((level) => {
                  const usagePercent = Math.round((level.activeStudents / level.maxCapacity) * 100);
                  const isFull = usagePercent >= 100;
                  
                  return (
                    <div key={level.id} className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                      {isFull && <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">FULL</div>}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 border border-primary-100">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => navigate(`/dashboard/admin/institute/levels/${level.id}/edit`)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteLevel(level.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{level.name}</h3>
                      <p className="text-gray-500 text-sm mb-6">General English Course</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Capacity</span>
                          <span dir="ltr" className={`font-bold font-latin tracking-wide ${isFull ? 'text-rose-600' : 'text-gray-900'}`}>
                            {level.activeStudents} / {level.maxCapacity}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-primary-500'}`} 
                            style={{ width: `${Math.min(usagePercent, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </motion.div>
          )}

          {/* CLASSES TAB */}
          {activeTab === 'classes' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-end">
                <EmcButton onClick={() => navigate('/dashboard/admin/institute/classes/new')}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Class
                </EmcButton>
              </div>

              {isClassesLoading ? (
                <div className="text-center py-12 text-gray-500">Loading classes...</div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">No Classes Found</h3>
                  <p className="text-gray-500 mb-4">You haven't created any classes yet.</p>
                  <EmcButton onClick={() => navigate('/dashboard/admin/institute/classes/new')}>Create First Class</EmcButton>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-600 text-sm font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Class Name</th>
                        <th className="px-6 py-4">Instructor</th>
                        <th className="px-6 py-4">Levels Included</th>
                        <th className="px-6 py-4">Schedule</th>
                        <th className="px-6 py-4">Students</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classes.map((cls) => (
                        <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{cls.name}</td>
                          <td className="px-6 py-4 text-gray-600">{cls.instructor?.user?.name || 'Unassigned'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {cls.courses?.map((c) => (
                                <span key={c.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                  {c.title_en}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{cls.schedule_day}</div>
                            <div className="text-xs text-gray-500">{cls.schedule_time}</div>
                          </td>
                          <td className="px-6 py-4" dir="ltr">
                            <span className="font-bold font-latin text-gray-900">{cls.students_count || 0}</span>
                            <span className="text-gray-500 font-latin text-sm"> / {cls.capacity}</span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => navigate(`/dashboard/admin/institute/classes/${cls.id}/edit`)} className="text-gray-400 hover:text-primary-600">
                              <Edit2 className="w-4 h-4 inline" />
                            </button>
                            <button onClick={() => handleDeleteClass(cls.id)} className="text-gray-400 hover:text-rose-600">
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* SMART DISTRIBUTION TAB */}
          {activeTab === 'distribution' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
              
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 opacity-10">
                  <Zap className="w-96 h-96" />
                </div>
                
                <div className="relative z-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto border border-primary-400/30 backdrop-blur-sm">
                    <Zap className="w-10 h-10 text-primary-400" />
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-3">Smart Distribution Engine</h2>
                    <p className="text-slate-300 text-lg max-w-lg mx-auto leading-relaxed">
                      Automatically assign students from the waitlist to the optimal classes based on their level, preferred time slot, and class capacities.
                    </p>
                  </div>

                  <div className="pt-6">
                    <EmcButton 
                      size="lg" 
                      className={`h-16 px-10 text-lg font-bold rounded-xl shadow-lg shadow-primary-600/30 w-full sm:w-auto ${isDistributing ? 'animate-pulse' : ''}`}
                      onClick={handleSmartDistribution}
                      disabled={isDistributing}
                    >
                      {isDistributing ? 'Processing...' : 'Run Auto-Assignment'}
                    </EmcButton>
                  </div>
                </div>
              </div>

              {distributionResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border rounded-2xl shadow-sm p-8"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Distribution Complete</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <span className="block text-green-800 text-sm font-semibold mb-1">Successfully Assigned</span>
                      <span className="text-3xl font-black text-green-600">{distributionResult.assigned}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <span className="block text-rose-800 text-sm font-semibold mb-1">Unassigned (Capacity/Schedule Issue)</span>
                      <span className="text-3xl font-black text-rose-600">{distributionResult.failed}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border">
                    <strong>Log Details:</strong> <br />
                    {distributionResult.details}
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

        </div>
      </main>

      {/* Add Level Modal */}
      {isAddLevelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-2xl shadow-xl border w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Create New Level</h3>
              <p className="text-gray-500 text-sm mt-1">Configure the new English Institute level.</p>
            </div>
            
            <div className="p-6 space-y-4 bg-gray-50">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level Name</label>
                <input 
                  type="text" 
                  value={newLevelData.name}
                  onChange={(e) => setNewLevelData({...newLevelData, name: e.target.value})}
                  placeholder="e.g. A1 Beginner"
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                  <input 
                    type="number" 
                    value={newLevelData.capacity}
                    onChange={(e) => setNewLevelData({...newLevelData, capacity: parseInt(e.target.value) || 0})}
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Pricing Packages</label>
                  <button onClick={addPricingOption} className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded">
                    + Add Option
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newLevelData.pricing_options.map((opt, index) => (
                    <div key={index} className="flex space-x-2 items-center bg-white p-2 rounded-lg border">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={opt.title}
                          onChange={(e) => updatePricingOption(index, 'title', e.target.value)}
                          placeholder="Title (e.g. 2 Levels)"
                          className="w-full text-sm h-9 px-2 border border-gray-200 rounded focus:border-primary-500 outline-none"
                        />
                      </div>
                      <div className="w-20">
                        <input 
                          type="number" 
                          value={opt.levels}
                          onChange={(e) => updatePricingOption(index, 'levels', parseInt(e.target.value))}
                          placeholder="Levels"
                          className="w-full text-sm h-9 px-2 border border-gray-200 rounded focus:border-primary-500 outline-none"
                        />
                      </div>
                      <div className="w-24">
                        <input 
                          type="number" 
                          value={opt.price}
                          onChange={(e) => updatePricingOption(index, 'price', parseInt(e.target.value))}
                          placeholder="Price €"
                          className="w-full text-sm h-9 px-2 border border-gray-200 rounded focus:border-primary-500 outline-none"
                        />
                      </div>
                      <button onClick={() => removePricingOption(index)} className="text-rose-500 p-1 hover:bg-rose-50 rounded">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex space-x-3 bg-white">
              <EmcButton variant="outline" className="flex-1" onClick={() => setIsAddLevelModalOpen(false)}>
                Cancel
              </EmcButton>
              <EmcButton className="flex-1" onClick={submitNewLevel}>
                Create Level
              </EmcButton>
            </div>
          </motion.div>
        </div>
      )}


    </div>
  );
}
