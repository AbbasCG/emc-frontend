import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowLeft, Image as ImageIcon, Save, Plus, XCircle } from 'lucide-react';
import { EmcButton } from '@/components/ui';
import { instituteApi } from '@/api/instituteApi';
import { useNavigate, useParams } from 'react-router';

export default function InstituteLevelCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    course_image: '',
    requirements: '',
    target_audience: '',
    language: 'English',
    is_paid: true,
    price: 35,
    capacity: 50,
    pricing_options: [{ title: '1 Level', levels: 1, price: 35 }]
  });

  // Edit-mode load (P1) — async IIFE inside the effect; every setState runs after the await.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void (async () => {
      try {
        const res = await instituteApi.getLevel(id);
        if (!alive) return;
        const level = res.data.level;
        setFormData({
          title_en: level.title_en || '',
          title_ar: level.title_ar || '',
          description_en: level.description_en || '',
          description_ar: level.description_ar || '',
          course_image: level.course_image || '',
          requirements: level.requirements || '',
          target_audience: level.target_audience || '',
          language: level.language || 'English',
          is_paid: level.is_paid !== undefined ? level.is_paid : true,
          price: level.price || 0,
          capacity: level.capacity || 50,
          pricing_options: level.pricing_options?.length ? level.pricing_options : [{ title: '1 Level', levels: 1, price: level.price || 0 }]
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
        alert('Failed to load level details');
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    
    // Check for checkbox
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: val });
    }
  };

  const addPricingOption = () => {
    setFormData(prev => ({
      ...prev,
      pricing_options: [...prev.pricing_options, { title: `${prev.pricing_options.length + 1} Levels`, levels: prev.pricing_options.length + 1, price: 0 }]
    }));
  };

  const updatePricingOption = (index: number, field: 'title' | 'levels' | 'price', value: string | number) => {
    const updated = [...formData.pricing_options];
    const opt = { ...updated[index] };
    if (field === 'title' && typeof value === 'string') opt.title = value;
    else if (field === 'levels' && typeof value === 'number') opt.levels = value;
    else if (field === 'price' && typeof value === 'number') opt.price = value;
    updated[index] = opt;
    // update base price if first option changes
    let basePrice = formData.price;
    if (index === 0 && field === 'price' && typeof value === 'number') {
      basePrice = value;
    }
    setFormData(prev => ({ ...prev, pricing_options: updated, price: basePrice }));
  };

  const removePricingOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricing_options: prev.pricing_options.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_en) {
      alert("Please enter a level name.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (id) {
        await instituteApi.updateLevel(id, formData);
        alert("Level Updated Successfully!");
      } else {
        await instituteApi.createLevel(formData);
        alert("Level Created Successfully!");
      }
      navigate('/dashboard/admin/institute');
    } catch (err) {
      alert(id ? "Failed to update level." : "Failed to create level.");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/admin/institute')}
              className="p-2 bg-white border rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Layers className="w-6 h-6 mr-2 text-primary-600" /> {id ? 'Edit Institute Level' : 'Create New Institute Level'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{id ? 'Update details for this English institute level.' : 'Configure rich details for the English institute level.'}</p>
            </div>
          </div>
          <EmcButton onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : id ? 'Update Level' : 'Save & Publish Level'}
          </EmcButton>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (English) <span className="text-rose-500">*</span></label>
                  <input type="text" name="title_en" value={formData.title_en} onChange={handleChange} required
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Level 1 - Beginner" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (Arabic)</label>
                  <input type="text" name="title_ar" value={formData.title_ar} onChange={handleChange} dir="rtl"
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="مثال: المستوى الأول - مبتدئ" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                  <textarea name="description_en" value={formData.description_en} onChange={handleChange} rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Describe what students will learn..."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
                  <textarea name="description_ar" value={formData.description_ar} onChange={handleChange} rows={3} dir="rtl"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="وصف محتوى المستوى..."></textarea>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Course Specifics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <input type="text" name="target_audience" value={formData.target_audience} onChange={handleChange}
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Students aged 15-20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                  <input type="text" name="requirements" value={formData.requirements} onChange={handleChange}
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Pass placement test" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity per Class</label>
                  <input type="number" name="capacity" value={formData.capacity} onChange={handleChange}
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select name="language" value={formData.language} onChange={handleChange}
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="English">English Only</option>
                    <option value="Bilingual">Bilingual (EN/AR)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Media</h3>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-medium">Click to upload thumbnail</span>
                <input type="text" name="course_image" value={formData.course_image} onChange={handleChange} placeholder="Or enter image URL" className="mt-4 w-full h-9 px-3 text-xs border border-gray-300 rounded outline-none" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Pricing & Bundles</h3>
              
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" name="is_paid" checked={formData.is_paid} onChange={handleChange} className="w-4 h-4 text-primary-600 rounded" />
                  <span className="text-sm font-bold text-blue-900">This is a Paid Level</span>
                </label>
              </div>

              {formData.is_paid && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Pricing Packages</label>
                    <button type="button" onClick={addPricingOption} className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded hover:bg-primary-100 transition-colors">
                      <Plus className="w-3 h-3 inline mr-1" /> Add
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.pricing_options.map((opt, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative group">
                        <button type="button" onClick={() => removePricingOption(index)} className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border">
                          <XCircle className="w-5 h-5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500">Title</label>
                            <input type="text" value={opt.title} onChange={(e) => updatePricingOption(index, 'title', e.target.value)}
                              className="w-full text-sm h-8 px-2 border border-gray-300 rounded outline-none focus:border-primary-500" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500">Levels Included</label>
                            <input type="number" value={opt.levels} onChange={(e) => updatePricingOption(index, 'levels', parseInt(e.target.value))}
                              className="w-full text-sm h-8 px-2 border border-gray-300 rounded outline-none focus:border-primary-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-500">Price (€)</label>
                          <input type="number" value={opt.price} onChange={(e) => updatePricingOption(index, 'price', parseInt(e.target.value))}
                            className="w-full text-sm h-8 px-2 border border-gray-300 rounded outline-none focus:border-primary-500 font-bold text-primary-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  );
}
