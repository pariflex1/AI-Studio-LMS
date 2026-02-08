
import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, Info, UserPlus, Clock, Briefcase, Loader2, Edit3, X, Save, UserCheck, Send, MoreVertical, MessageCircle, PieChart, Users, CheckCircle2 } from 'lucide-react';
import { Profile, Lead, Project, LeadStatus } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  currentUser: Profile;
  projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, projects }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [activeActionLead, setActiveActionLead] = useState<Lead | null>(null);
  const [projectStaff, setProjectStaff] = useState<Profile[]>([]);

  useEffect(() => {
    fetchLeads();
  }, [currentUser, filterProject]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      if (!currentUser.assigned_project_ids || currentUser.assigned_project_ids.length === 0) {
        setLeads([]);
        return;
      }

      let query = supabase
        .from('leads')
        .select('*')
        .in('project_id', currentUser.assigned_project_ids)
        .order('created_at', { ascending: false });

      if (filterProject !== 'all') {
        query = query.eq('project_id', filterProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data as Lead[]);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffForProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .contains('assigned_project_ids', [projectId]);
      
      if (!error && data) {
        setProjectStaff(data as Profile[]);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleClaim = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ user_id: currentUser.id })
        .eq('id', leadId)
        .is('user_id', null);

      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, user_id: currentUser.id } : l));
    } catch (err) {
      console.error('Error claiming lead:', err);
    }
  };

  const handleUpdateLead = async (updatedFields: Partial<Lead>) => {
    if (!editingLead) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update(updatedFields)
        .eq('id', editingLead.id);

      if (error) throw error;
      
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...updatedFields } : l));
      setEditingLead(null);
    } catch (err) {
      console.error('Error updating lead:', err);
      alert("Update failed. You may not have permission to modify this lead entry.");
    }
  };

  const getFilteredLeads = () => {
    return leads.filter(l => {
      const matchesSearch = l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            l.client_contact.includes(searchQuery);
      return matchesSearch;
    });
  };

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const filteredLeads = getFilteredLeads();
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Admin Metrics Bar */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <MetricCard 
             icon={<Users size={20} />} 
             label="Total Leads" 
             value={leads.length} 
             color="indigo" 
           />
           <MetricCard 
             icon={<Info size={20} />} 
             label="Available Pool" 
             value={leads.filter(l => !l.user_id).length} 
             color="amber" 
           />
           <MetricCard 
             icon={<CheckCircle2 size={20} />} 
             label="Booked/Closed" 
             value={leads.filter(l => l.status === 'Booked' || l.status === 'Closed').length} 
             color="emerald" 
           />
           <MetricCard 
             icon={<Clock size={20} />} 
             label="Project Nodes" 
             value={projects.length} 
             color="slate" 
           />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search active leads by name or contact..." 
            className="w-full pl-14 pr-4 py-5 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm outline-none transition-all font-bold text-slate-800 focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-white px-8 border border-slate-200 rounded-[1.5rem] shadow-sm min-w-[280px]">
          <Filter className="text-slate-400 w-4 h-4 shrink-0" />
          <select 
            className="bg-transparent py-5 text-[10px] font-black uppercase tracking-[0.2em] outline-none text-slate-700 appearance-none cursor-pointer w-full"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">Consolidated Project View</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing lead repository...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLeads.map(lead => (
            <LeadCard 
              key={lead.id} 
              lead={lead} 
              projectName={projects.find(p => p.id === lead.project_id)?.name || 'Unknown'}
              currentUser={currentUser}
              onClaim={handleClaim}
              onOpenActions={() => setActiveActionLead(lead)}
              onEdit={() => {
                setEditingLead(lead);
                fetchStaffForProject(lead.project_id);
              }}
              formatDate={formatDate}
            />
          ))}
          {filteredLeads.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <PieChart size={32} className="text-slate-200" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lead Node Empty</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">No leads matching your current workspace filter</p>
            </div>
          )}
        </div>
      )}

      {activeActionLead && (
        <LeadActionSheet 
          lead={activeActionLead} 
          onClose={() => setActiveActionLead(null)} 
          onEdit={() => {
            setEditingLead(activeActionLead);
            setActiveActionLead(null);
            fetchStaffForProject(activeActionLead.project_id);
          }}
        />
      )}

      {editingLead && (
        <EditLeadModal 
          lead={editingLead} 
          staff={projectStaff}
          currentUser={currentUser}
          onClose={() => setEditingLead(null)}
          onSave={handleUpdateLead}
        />
      )}
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: number, color: string }> = ({ icon, label, value, color }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-600 text-white shadow-indigo-100',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  };
  
  return (
    <div className={`p-6 rounded-3xl border flex items-center justify-between shadow-sm transition-transform hover:-translate-y-1 ${colorMap[color] || colorMap.slate}`}>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tighter">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === 'indigo' ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
        {icon}
      </div>
    </div>
  );
};

const LeadCard: React.FC<{
  lead: Lead;
  projectName: string;
  currentUser: Profile;
  onClaim: (id: string) => void;
  onEdit: () => void;
  onOpenActions: () => void;
  formatDate: (iso: string) => string;
}> = ({ lead, projectName, currentUser, onClaim, onEdit, onOpenActions, formatDate }) => {
  const isOwner = lead.user_id === currentUser.id;
  const isUnassigned = lead.user_id === null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group overflow-hidden">
      <div className={`px-8 py-3.5 text-[9px] font-black uppercase tracking-[0.25em] flex justify-between items-center ${isUnassigned ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>
        <span className="flex items-center gap-2">
           <Briefcase size={12} /> {projectName}
        </span>
        <button onClick={onOpenActions} className="p-1 hover:bg-black/5 rounded-lg"><MoreVertical size={16}/></button>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-5 mb-8">
           <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 font-black shrink-0 border border-slate-200 shadow-inner">
              {lead.client_name[0].toUpperCase()}
           </div>
           <div className="min-w-0">
              <h4 className="text-xl font-black text-slate-900 truncate leading-none group-hover:text-indigo-600 transition-colors">{lead.client_name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                <Clock size={12} /> {formatDate(lead.created_at)}
              </p>
           </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-[1.5rem] mb-8 space-y-3 border border-slate-100">
           <div className="flex justify-between items-center text-[10px] font-bold">
             <span className="text-slate-400 uppercase tracking-widest">Contact Identity</span>
             <span className="text-slate-900 font-black tracking-tight">+{lead.client_contact}</span>
           </div>
           <div className="flex justify-between items-center text-[10px] font-bold">
             <span className="text-slate-400 uppercase tracking-widest">Pipeline Node</span>
             <span className={`px-3 py-1 rounded-full font-black ${
               lead.status === 'Booked' ? 'bg-indigo-600 text-white' : 'text-indigo-600'
             }`}>{lead.status.toUpperCase()}</span>
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center">
           <button onClick={onEdit} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-2">
              <Edit3 size={14} /> Full Record
           </button>
           {isUnassigned ? (
             <button 
               onClick={() => onClaim(lead.id)} 
               className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
             >
               Take Over Lead
             </button>
           ) : (
             <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100">
                <UserCheck size={14} /> {isOwner ? 'Own Priority' : 'Assigned Staff'}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const LeadActionSheet: React.FC<{ lead: Lead, onClose: () => void, onEdit: () => void }> = ({ lead, onClose, onEdit }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
    <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
       <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-2xl tracking-tight">{lead.client_name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Lead Engagement Console</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-100 shadow-sm">
            <X size={24} className="text-slate-400" />
          </button>
       </div>
       <div className="p-8 grid grid-cols-2 gap-4">
          <ActionItem icon={<Phone size={24}/>} label="Direct Dial" href={`tel:+${lead.client_contact}`} color="blue" />
          <ActionItem icon={<MessageCircle size={24}/>} label="WhatsApp" href={`https://wa.me/${lead.client_contact}`} color="emerald" />
          <ActionItem icon={<Send size={24}/>} label="Text Message" href={`sms:+${lead.client_contact}`} color="indigo" />
          <button 
            onClick={onEdit}
            className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-[2rem] gap-3 border border-slate-100 hover:bg-white hover:border-indigo-400 transition-all group"
          >
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Edit3 size={24}/>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Modify Node</span>
          </button>
       </div>
    </div>
  </div>
);

const ActionItem: React.FC<{ icon: React.ReactNode, label: string, href: string, color: string }> = ({ icon, label, href, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
  };
  return (
    <a href={href} className={`flex flex-col items-center justify-center p-8 rounded-[2rem] gap-3 transition-all ${colors[color]}`}>
       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
         {icon}
       </div>
       <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </a>
  );
};

const EditLeadModal: React.FC<{
  lead: Lead;
  staff: Profile[];
  currentUser: Profile;
  onClose: () => void;
  onSave: (fields: Partial<Lead>) => void;
}> = ({ lead, staff, currentUser, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    client_name: lead.client_name,
    status: lead.status,
    budget: lead.budget || '',
    user_id: lead.user_id,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Modify Record</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Status</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})}
                >
                  <option value="New">New Enquiry</option>
                  <option value="Interested">Interested</option>
                  <option value="Following Up">Following Up</option>
                  <option value="Booked">Booked Unit</option>
                  <option value="Closed">Closed Deal</option>
                  <option value="Dead">Lost/Dead</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Owner</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold appearance-none"
                  value={formData.user_id || ''}
                  onChange={e => setFormData({...formData, user_id: e.target.value || null})}
                >
                  <option value="">Unassigned Market Pool</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.email.split('@')[0].toUpperCase()}</option>)}
                </select>
              </div>
           </div>
           
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal Identifier</label>
              <input 
                type="text"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                value={formData.client_name}
                onChange={e => setFormData({...formData, client_name: e.target.value})}
              />
           </div>

           <div className="flex gap-4 pt-6">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
              >
                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 Persist Changes
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="px-10 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px]"
              >
                Abort
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
