import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Save } from 'lucide-react';
import { EmcButton } from '@/components/ui';
import { instituteApi, type InstituteInstructor, type InstituteLevel } from '@/api/instituteApi';
import { useNavigate, useParams } from 'react-router';

export default function InstituteClassCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [levels, setLevels] = useState<InstituteLevel[]>([]);
  const [instructors, setInstructors] = useState<InstituteInstructor[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    instructor_id: '',
    capacity: 50,
    course_ids: [] as number[],
    schedule_day: '',
    schedule_time: ''
  });

  // Load fetch (P1) — async IIFEs inside the effect; every setState runs after an await.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [levelsRes, instRes] = await Promise.all([
          instituteApi.getLevels(),
          instituteApi.getInstructors()
        ]);
        if (!alive) return;
        setLevels(levelsRes.data.levels || []);
        setInstructors(instRes.data.instructors || []);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
        alert('Failed to load levels or instructors');
      }
    })();
    if (id) {
      void (async () => {
        try {
          const res = await instituteApi.getClass(id);
          if (!alive) return;
          const c = res.data.class;
          setFormData({
            name: c.name || '',
            instructor_id: c.instructor_id?.toString() || '',
            capacity: c.capacity || 50,
            course_ids: c.courses?.map((course) => course.id) || [],
            schedule_day: c.schedule_day || '',
            schedule_time: c.schedule_time || ''
          });
        } catch (err) {
          if (import.meta.env.DEV) console.error(err);
          alert('Failed to load class details');
        }
      })();
    }
    return () => { alive = false; };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setFormData({ ...formData, [name]: val });
  };

  const handleLevelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setFormData({ ...formData, course_ids: values });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.instructor_id || formData.course_ids.length === 0) {
      alert("Please fill in all required fields (Name, Instructor, Levels).");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (id) {
        await instituteApi.updateClass(id, formData);
        alert("Class Updated Successfully!");
      } else {
        await instituteApi.createClass(formData);
        alert("Class Created Successfully!");
      }
      navigate('/dashboard/admin/institute?tab=classes');
    } catch (err) {
      alert(id ? "Failed to update class." : "Failed to create class.");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/admin/institute?tab=classes')}
              className="p-2 bg-white border rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-2 text-primary-600" /> {id ? 'Edit Class' : 'Create New Class'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{id ? 'Update details for this class.' : 'Configure details, instructor, and schedule for the new class.'}</p>
            </div>
          </div>
          <EmcButton onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : id ? 'Update Class' : 'Save & Publish Class'}
          </EmcButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Class Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name <span className="text-rose-500">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  placeholder="e.g. Evening Class A"
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} required
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor <span className="text-rose-500">*</span></label>
                <select 
                  name="instructor_id"
                  value={formData.instructor_id}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Select an instructor...</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.user?.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Levels Included <span className="text-rose-500">*</span></label>
                <select 
                  multiple
                  value={formData.course_ids.map(String)}
                  onChange={handleLevelSelect}
                  required
                  className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.title_en}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple levels.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" name="schedule_day" value={formData.schedule_day} onChange={handleChange}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                <input type="time" name="schedule_time" value={formData.schedule_time} onChange={handleChange}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
              </div>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
