import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Video, Clock, Award, Bell, ChevronRight, FileText, Settings, LogOut, Headphones, Plus } from 'lucide-react';
import { EmcButton } from '@/components/ui';
import { instituteApi } from '@/api/instituteApi';

export default function InstituteDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await instituteApi.getStudentDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const student = {
    name: 'Student User', // could come from auth context
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              E
            </div>
            <span className="font-bold text-gray-900 text-lg">English Inst.</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-xl font-medium">
            <BookOpen className="w-5 h-5" />
            <span>My Classroom</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
            <Calendar className="w-5 h-5" />
            <span>Schedule</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
            <FileText className="w-5 h-5" />
            <span>Assignments</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
            <Award className="w-5 h-5" />
            <span>Certificates</span>
          </a>
        </nav>
        <div className="p-4 border-t space-y-2">
          <a href="#" className="flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-gray-900 transition-colors">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-2 text-rose-500 hover:text-rose-600 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {student.name}! 👋</h1>
            <p className="text-gray-500">Here's what's happening with your English learning today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold">
              {student.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
          
          {isLoading ? (
            <div className="text-center py-20 text-gray-500">Loading your dashboard...</div>
          ) : dashboardData?.status === 'not_enrolled' ? (
            <div className="space-y-6">
              <div className="bg-primary-50 rounded-2xl p-8 border border-primary-100 text-center">
                <BookOpen className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the English Institute!</h2>
                <p className="text-gray-600 max-w-lg mx-auto mb-6">
                  You are not enrolled in any classes yet. You can browse the available levels below or take our placement test to find the best fit for you.
                </p>
                <div className="flex justify-center space-x-4">
                  <EmcButton>
                    Take Placement Test
                  </EmcButton>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">Available Levels</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardData.available_levels?.map((level: any) => (
                  <div key={level.id} className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold border border-primary-100">
                        Level
                      </span>
                      <h4 className="text-xl font-bold text-gray-900 mt-3">{level.title}</h4>
                      <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                        {level.description || 'Master the English language at this level with comprehensive materials.'}
                      </p>
                    </div>
                    
                    <div className="mt-6 border-t pt-4">
                      {level.pricing_options ? (
                        <div className="space-y-2 mb-4">
                          <p className="text-sm font-semibold text-gray-700">Packages Available:</p>
                          {level.pricing_options.map((opt: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                              <span className="text-gray-700">{opt.title}</span>
                              <span className="font-bold text-primary-700">{opt.price} €</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className="text-2xl font-bold text-gray-900">{level.price} €</p>
                        </div>
                      )}
                      
                      <EmcButton className="w-full">
                        Enroll Now
                      </EmcButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : dashboardData?.status === 'waitlist' ? (
            <div className="bg-amber-50 rounded-2xl p-8 border border-amber-100 text-center">
              <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-amber-900 mb-2">You are on the Waitlist!</h2>
              <p className="text-amber-800 max-w-lg mx-auto mb-6">
                You have successfully registered for {dashboardData.current_level}. We are currently assigning you to the best fitting class schedule. You will be notified soon.
              </p>
              <EmcButton variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                Contact Support
              </EmcButton>
            </div>
          ) : (
            <>
              {/* Level & Progress Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="md:col-span-2 bg-gradient-to-br from-primary-900 to-primary-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Award className="w-48 h-48" />
                  </div>
                  <div className="relative z-10">
                    <span className="bg-primary-700/50 border border-primary-600 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                      Current Level
                    </span>
                    <h2 className="text-4xl font-extrabold mt-4 mb-2">{dashboardData.current_level}</h2>
                    <p className="text-primary-200 mb-8 max-w-md">
                      You are making great progress! Keep attending classes and completing assignments.
                    </p>
                    
                    <div>
                      <div className="flex justify-between text-sm font-medium text-primary-100 mb-2">
                        <span>Course Progress</span>
                        <span>{dashboardData.progress}%</span>
                      </div>
                      <div className="h-3 w-full bg-primary-950/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-400 rounded-full" 
                          style={{ width: `${dashboardData.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Next Class Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col"
                >
                  <div className="flex items-center space-x-2 text-rose-600 font-semibold mb-4 bg-rose-50 w-fit px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <span>Up Next</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{dashboardData.next_class.topic}</h3>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-5 h-5 mr-3 text-primary-500" />
                      <span>{dashboardData.next_class.date}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-5 h-5 mr-3 text-primary-500" />
                      <span>{dashboardData.next_class.time}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-xs font-bold text-gray-500">
                        {dashboardData.next_class.teacher.charAt(0)}
                      </div>
                      <span>{dashboardData.next_class.teacher}</span>
                    </div>
                  </div>

                  <EmcButton className="w-full h-12 text-md">
                    <Video className="w-5 h-5 mr-2" />
                    Join Class
                  </EmcButton>
                </motion.div>
              </div>

              {/* Bottom Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Assignments */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Recent Assignments</h3>
                    <a href="#" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'Grammar Quiz: Past Perfect', status: 'Pending', due: 'Tomorrow' },
                      { title: 'Writing: A Formal Email', status: 'Graded', score: '95/100' },
                      { title: 'Speaking Recording', status: 'Submitted', due: 'Waiting for review' },
                    ].map((task, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border hover:border-primary-200 hover:bg-primary-50/50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${task.status === 'Pending' ? 'bg-amber-100 text-amber-600' : task.status === 'Graded' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-500">
                              {task.status === 'Graded' ? <span className="text-green-600 font-medium">Score: {task.score}</span> : task.due}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Resources / Library */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Study Materials</h3>
                    <a href="#" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                      Library <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { title: 'Student Book PDF', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                      { title: 'Audio Tracks', icon: Headphones, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
                      { title: 'Extra Worksheets', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { title: 'Vocabulary List', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((item, i) => (
                      <button key={i} className={`${item.bg} p-4 rounded-xl border border-transparent hover:border-gray-200 transition-all text-left flex flex-col h-32 justify-between group`}>
                        <item.icon className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                        <span className="font-medium text-gray-900">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
