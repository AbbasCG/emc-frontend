import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Clock, Video, CheckCircle, XCircle, AlertCircle, FileText, Settings, BookOpen } from 'lucide-react';
import { EmcButton } from '@/components/ui';
import { instituteApi } from '@/api/instituteApi';

/** Row of GET /institute/teacher/classes → data.classes */
interface TeacherClassSummary {
  id: number;
  name: string;
  level: string;
  time: string;
  students: number;
}

/** class_group of GET /institute/teacher/classes/:id */
interface TeacherClassGroup {
  name: string;
  level: string;
}

/** students[] of GET /institute/teacher/classes/:id */
interface TeacherClassStudent {
  id: number;
  name: string;
}

type AttendanceStatus = 'pending' | 'present' | 'absent' | 'late';

interface RosterStudent extends TeacherClassStudent {
  status: AttendanceStatus;
}

export default function InstituteTeacherDashboard() {
  const [activeClass, setActiveClass] = useState<number | null>(null);

  const [upcomingClasses, setUpcomingClasses] = useState<TeacherClassSummary[]>([]);
  const [classStudents, setClassStudents] = useState<RosterStudent[]>([]);
  const [activeClassGroup, setActiveClassGroup] = useState<TeacherClassGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await instituteApi.getTeacherClasses();
        if (controller.signal.aborted) return;
        setUpcomingClasses((res.data.classes || []) as TeacherClassSummary[]);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (import.meta.env.DEV) console.error(err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const handleManageClass = async (classId: number) => {
    setActiveClass(classId);
    try {
      const res = await instituteApi.getClassDetails(classId);
      setActiveClassGroup(res.data.class_group as TeacherClassGroup);
      // Initialize status for attendance UI
      const studentsWithStatus: RosterStudent[] = (res.data.students as TeacherClassStudent[]).map((s) => ({ ...s, status: 'pending' }));
      setClassStudents(studentsWithStatus);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const updateStudentStatus = (id: number, status: AttendanceStatus) => {
    setClassStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleSubmitAttendance = async () => {
    try {
      await instituteApi.submitAttendance(activeClass as number, {
        students: classStudents.map(s => ({ id: s.id, status: s.status }))
      });
      alert('Attendance submitted successfully!');
    } catch {
      alert('Failed to submit attendance');
    }
  };

  const renderClassroomView = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => setActiveClass(null)} className="text-gray-500 hover:text-gray-900 transition-colors">
          &larr; Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-gray-900 border-l pl-4 border-gray-300">
          {activeClassGroup ? `${activeClassGroup.name} (${activeClassGroup.level})` : 'Loading...'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Actions & Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-900 mb-4">Class Actions</h3>
            <EmcButton className="w-full h-14 text-lg mb-3 shadow-lg shadow-primary-600/20">
              <Video className="w-5 h-5 mr-2" /> Start Live Meeting
            </EmcButton>
            <EmcButton variant="outline" className="w-full h-12">
              <FileText className="w-4 h-4 mr-2" /> Upload Materials
            </EmcButton>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-center text-blue-900 font-bold mb-2">
              <AlertCircle className="w-5 h-5 mr-2" /> Note for Teacher
            </div>
            <p className="text-blue-800 text-sm leading-relaxed">
              Ensure to cover the difference between simple past and present perfect. 2 students are newly promoted to this level.
            </p>
          </div>
        </div>

        {/* Right Column: Attendance */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
          <div className="p-6 border-b flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Attendance Roster</h3>
              <p className="text-gray-500 text-sm">Mark attendance before the class ends.</p>
            </div>
            <div className="text-sm font-medium px-3 py-1 bg-white border rounded-lg shadow-sm">
              <span className="text-green-600 font-bold">{classStudents.filter(s => s.status === 'present').length}</span> / {classStudents.length} Present
            </div>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-gray-500 text-sm bg-white">
                  <th className="px-6 py-4 font-medium">Student Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <span>{student.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {student.status === 'present' && <span className="text-green-600 flex items-center text-sm font-medium"><CheckCircle className="w-4 h-4 mr-1"/> Present</span>}
                      {student.status === 'absent' && <span className="text-rose-600 flex items-center text-sm font-medium"><XCircle className="w-4 h-4 mr-1"/> Absent</span>}
                      {student.status === 'late' && <span className="text-amber-600 flex items-center text-sm font-medium"><Clock className="w-4 h-4 mr-1"/> Late</span>}
                      {student.status === 'pending' && <span className="text-gray-400 text-sm font-medium">Pending...</span>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => updateStudentStatus(student.id, 'present')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Mark Present">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStudentStatus(student.id, 'late')} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Mark Late">
                        <Clock className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStudentStatus(student.id, 'absent')} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors" title="Mark Absent">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end">
            <EmcButton onClick={handleSubmitAttendance}>Submit Attendance</EmcButton>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r flex flex-col hidden md:flex sticky top-0 h-screen text-slate-300">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-amber-900/50">
              ET
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Teacher Portal</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium bg-amber-500 text-white shadow-md">
            <Calendar className="w-5 h-5" />
            <span>My Schedule</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium hover:bg-slate-800 hover:text-white transition-all">
            <Users className="w-5 h-5" />
            <span>Students</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium hover:bg-slate-800 hover:text-white transition-all">
            <BookOpen className="w-5 h-5" />
            <span>Materials Library</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white border-b px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, Teacher!
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here is your schedule for today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <EmcButton variant="outline" className="hidden sm:flex">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </EmcButton>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeClass ? renderClassroomView() : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-amber-500" /> Upcoming Classes Today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                  <div className="col-span-2 text-center py-12 text-gray-500">Loading your schedule...</div>
                ) : upcomingClasses.length === 0 ? (
                  <div className="col-span-2 text-center py-12 bg-white rounded-2xl border">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Classes Scheduled</h3>
                    <p className="text-gray-500">You don't have any classes assigned yet.</p>
                  </div>
                ) : (
                  upcomingClasses.map((cls) => (
                    <div key={cls.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                            {cls.level}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900 mt-3">{cls.name}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border text-gray-600 font-bold group-hover:scale-110 transition-transform text-xs">
                          {cls.time.split(' ')[0]}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-gray-500 text-sm mb-6 space-x-4">
                        <div className="flex items-center"><Users className="w-4 h-4 mr-1"/> {cls.students} Students</div>
                        <div className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {cls.time}</div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <EmcButton onClick={() => handleManageClass(cls.id)} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                          Manage Class
                        </EmcButton>
                        <EmcButton variant="outline" className="flex-none px-4 text-primary-600 border-primary-200 hover:bg-primary-50">
                          <Video className="w-5 h-5" />
                        </EmcButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
