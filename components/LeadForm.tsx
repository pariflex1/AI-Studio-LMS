
import React, { useState, useEffect, useRef } from 'react';
/* Added 'Plus' to the import list from 'lucide-react' to fix the reported reference error */
import { User, MapPin, Mail, Briefcase, IndianRupee, Info, Loader2, Save, Phone, Building, Globe, Layers, UserCircle, AlertCircle, Camera, X, CheckCircle2, Plus } from 'lucide-react';
import { Profile, Project, LeadStatus } from '../types';
import { supabase } from '../lib/supabase';

interface LeadFormProps {
  currentUser: Profile;
  projects: Project[];
  onSuccess: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ currentUser, projects, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_contact: '',
    email: '',
    city: '',
    budget: '',
    project_id: currentUser.assigned_project_ids[0] || '',
    status: 'New' as LeadStatus,
    pref_location: '',
    profession: '',
    prop_pref: '',
    lead_source: 'Direct',
    client_image_url: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    const contact = formData.client_contact.replace(/\D/g, '');
    if (contact.length === 10) {
      handleDuplicateCheck(contact);
    } else {
      setIsDuplicate(false);
    }
  }, [formData.client_contact, formData.project_id]);

  const handleDuplicateCheck = async (contact: string) => {
    setCheckingDuplicate(true);
    const searchVal = `91${contact}`;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('client_contact', searchVal)
        .eq('project_id', formData.project_id)
        .maybeSingle();

      if (!error && data) {
        setIsDuplicate(true);
        // Do not auto-fill to allow user to see it's a block
      } else {
        setIsDuplicate(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'client_contact') {
      const val = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: val }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate || submitting) return;
    setSubmitting(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lead-images')
          .upload(fileName, imageFile);
        
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('lead-images').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('leads')
        .insert({
          ...formData,
          client_contact: `91${formData.client_contact}`,
          user_id: currentUser.id,
          client_image_url: imageUrl,
        });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(`Registration Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden mb-12 animate-in slide-in-from-bottom-8 duration-700">
      <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-indigo-100">
            <UserCircle size={36} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Lead Intake Console</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
              {checkingDuplicate ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
              Registry Identity Sync Active
            </p>
          </div>
        </div>
        {isDuplicate && (
          <div className="bg-rose-50 border border-rose-100 px-8 py-4 rounded-2xl flex items-center gap-4 animate-bounce">
            <AlertCircle className="text-rose-500" size={24} />
            <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest">Duplicate Identity Detected</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-12 md:p-16 space-y-16">
        {/* Photo Section */}
        <div className="flex justify-center flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div 
              className="w-32 h-32 rounded-full border-4 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: imagePreview ? `url(${imagePreview})` : 'none' }}
            >
              {!imagePreview && <Camera className="text-slate-300" size={32} />}
            </div>
            <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
              <Plus size={16} />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Identity Portrait</p>
        </div>

        {/* Step 1 */}
        <div className="space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
             <span className="bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">1</span>
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Core Identity Node</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <InputField icon={<User size={18}/>} label="Client Name" name="client_name" value={formData.client_name} onChange={handleInputChange} placeholder="Full legal name" required />
            <InputField icon={<Phone size={18}/>} label="Contact Mobile" name="client_contact" value={formData.client_contact} onChange={handleInputChange} placeholder="10-digit primary" required />
            <InputField icon={<Mail size={18}/>} label="Email Address" name="email" value={formData.email} onChange={handleInputChange} placeholder="identity@protocol.io" type="email" />
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
             <span className="bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">2</span>
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Requirements Cluster</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <InputField icon={<IndianRupee size={18}/>} label="Budget Estimate" name="budget" value={formData.budget} onChange={handleInputChange} placeholder="e.g. 2.5 Cr+" />
            <InputField icon={<Layers size={18}/>} label="Config Preference" name="prop_pref" value={formData.prop_pref} onChange={handleInputChange} placeholder="e.g. 3BHK Skyline" />
            <InputField icon={<Building size={18}/>} label="Pref Location" name="pref_location" value={formData.pref_location} onChange={handleInputChange} placeholder="Target location" />
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
             <span className="bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg">3</span>
             <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Acquisition Node</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <InputField icon={<MapPin size={18}/>} label="Current City" name="city" value={formData.city} onChange={handleInputChange} placeholder="Current residency" />
            <InputField icon={<Briefcase size={18}/>} label="Profession" name="profession" value={formData.profession} onChange={handleInputChange} placeholder="Employment identity" />
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Globe size={14} /> Acquisition Source
              </label>
              <select 
                name="lead_source" 
                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-100 font-bold appearance-none transition-all shadow-inner"
                value={formData.lead_source} 
                onChange={handleInputChange}
              >
                <option value="Direct">Direct Node</option>
                <option value="Facebook">FB Protocol</option>
                <option value="Instagram">Insta Pulse</option>
                <option value="Google">Search Matrix</option>
                <option value="Referral">Network Referral</option>
                <option value="Portal">Property Portal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-10 rounded-[3rem] border-4 border-white shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-widest px-2">Target Cluster Node</label>
              <select 
                name="project_id"
                className="w-full px-8 py-5 bg-white border border-transparent rounded-[2rem] outline-none focus:ring-8 focus:ring-white/20 font-black text-indigo-900 text-lg shadow-xl"
                value={formData.project_id} onChange={handleInputChange}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-widest px-2">Initial Pipeline Status</label>
              <select 
                name="status"
                className="w-full px-8 py-5 bg-white border border-transparent rounded-[2rem] outline-none focus:ring-8 focus:ring-white/20 font-black text-indigo-900 text-lg shadow-xl"
                value={formData.status} onChange={handleInputChange}
              >
                <option value="New">Fresh Intake</option>
                <option value="Interested">Interested Cluster</option>
                <option value="Following Up">Protocol Active</option>
                <option value="Booked">Successful Deployment</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={submitting || isDuplicate}
          className="w-full bg-indigo-600 text-white py-8 rounded-[3rem] font-black uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all text-sm flex items-center justify-center gap-5 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:grayscale"
        >
          {submitting ? <Loader2 className="animate-spin" size={28}/> : <Save size={28} />}
          {isDuplicate ? 'IDENTICAL RECORD ABORTED' : 'COMMENCE LEAD DEPLOYMENT'}
        </button>
      </form>
    </div>
  );
};

const InputField: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  name: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  type?: string,
  required?: boolean
}> = ({ icon, label, name, value, onChange, placeholder, type = "text", required = false }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
      {icon} {label}
    </label>
    <input 
      type={type} 
      name={name} 
      required={required}
      placeholder={placeholder}
      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all shadow-inner"
      value={value} 
      onChange={onChange}
    />
  </div>
);

export default LeadForm;
