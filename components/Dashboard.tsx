
import React, { useState, useEffect } from 'react';
import { Search, Filter, Phone, Info, UserPlus, Clock, Briefcase, Loader2, Edit3, X, Save, UserCheck, Send, MoreVertical, MessageCircle, PieChart, Users, CheckCircle2, MapPin, Mail, ChevronRight, Calendar } from 'lucide-react';
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
    }
  };

  const getFilteredLeads = () => {
    return leads.filter(l => {
      const matchesSearch = l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            l.client_contact.includes(searchQuery);
      return matchesSearch;
    });
  };

  const filteredLeads = getFilteredLeads();
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-8 pb-24">
      {/* Admin Metrics Bar */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <MetricCard icon={<Users size={20} />} label="Total Leads" value={leads.length} color="indigo" />
           <MetricCard icon={<Info size={20} />} label="Available Pool" value={leads.filter(l => !l.user_id).length} color="amber" />
           <MetricCard icon={<CheckCircle2 size={20} />} label="Booked/Closed" value={leads.filter(l => l.status === 'Booked' || l.status === 'Closed').length} color="emerald" />
           <MetricCard icon={<Clock size={20} />} label="Project Nodes" value={projects.length} color="slate" />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search contacts by name, contact, city or tag..." 
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
            <option value="all">Consolidated View</option>
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
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 px-2 flex items-center gap-2">
            Client Listing <span className="text-slate-400 font-medium text-sm">({filteredLeads.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {filteredLeads.map(lead => (
              <LeadListItem 
                key={lead.id} 
                lead={lead} 
                onClick={() => setSelectedLead(lead)}
              />
            ))}
            {filteredLeads.length === 0 && (
              <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                 <PieChart size={32} className="text-slate-200 mx-auto mb-6" />
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Results</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetailsBottomSheet 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onEdit={() => {
            setEditingLead(selectedLead);
            fetchStaffForProject(selectedLead.project_id);
          }}
          onClaim={() => handleClaim(selectedLead.id)}
          isUnassigned={selectedLead.user_id === null}
        />
      )}

      {editingLead && (
        <EditLeadModal 
          lead={editingLead} 
          staff={projectStaff}
          onClose={() => setEditingLead(null)}
          onSave={handleUpdateLead}
        />
      )}
    </div>
  );
};

const LeadListItem: React.FC<{ lead: Lead, onClick: () => void }> = ({ lead, onClick }) => {
  const statusColors: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-600',
    'Interested': 'bg-indigo-50 text-indigo-600',
    'Following Up': 'bg-amber-50 text-amber-600',
    'Booked': 'bg-emerald-50 text-emerald-600',
    'Closed': 'bg-slate-900 text-white',
    'Dead': 'bg-rose-50 text-rose-600'
  };

  return (
    <div 
      onClick={onClick}
      className="flex items-start gap-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="size-16 rounded-2xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-100">
        {lead.client_image_url ? (
          <img src={lead.client_image_url} alt={lead.client_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-xl">
            {lead.client_name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h3 className="font-black text-slate-900 text-lg truncate leading-tight">{lead.client_name}</h3>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${statusColors[lead.status] || 'bg-slate-100'}`}>
              {lead.status}
            </span>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-500 mt-1">+{lead.client_contact}</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <MapPin size={12} className="text-indigo-400" />
            {lead.city || 'Location N/A'}
          </div>
          {lead.budget && (
             <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <Briefcase size={12} className="text-indigo-400" />
               {lead.budget}
             </div>
          )}
        </div>
      </div>
      <div className="flex items-center self-center pl-2">
        <ChevronRight size={20} className="text-slate-300" />
      </div>
    </div>
  );
};

const LeadDetailsBottomSheet: React.FC<{ 
  lead: Lead, 
  onClose: () => void, 
  onEdit: () => void,
  onClaim: () => void,
  isUnassigned: boolean 
}> = ({ lead, onClose, onEdit, onClaim, isUnassigned }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg mx-auto bg-white rounded-t-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-slate-200"></div>
        </div>
        
        <div className="px-8 pb-32 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{lead.client_name}</h2>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">{lead.profession || 'Premium Lead'}</p>
            </div>
            <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              {lead.status}
            </span>
          </div>

          <div className="mt-8 space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <div className="flex items-center gap-4 mb-6">
                 <div className="size-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600"><Phone size={24}/></div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Number</p>
                   <p className="text-xl font-black text-indigo-600">+{lead.client_contact}</p>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="size-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600"><MapPin size={24}/></div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">City Node</p>
                   <p className="text-lg font-black text-slate-900">{lead.city || 'Unspecified'}</p>
                 </div>
               </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Edit3 size={16} className="text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Lead Dossier</p>
              </div>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                {lead.notes || 'Looking for high-yield properties in ' + (lead.pref_location || lead.city || 'the region') + '. Requirement profile suggests ' + (lead.prop_pref || 'luxury units') + ' within ' + (lead.budget || 'market') + ' range.'}
              </p>
            </div>

            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="text-indigo-600" size={20} />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Registered Date</p>
                  <p className="text-slate-900 font-black">{new Date(lead.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={onEdit} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Edit Node</button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-8 pb-12 pt-6">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <ActionIcon icon={<Phone size={24}/>} label="Call" href={`tel:+${lead.client_contact}`} />
            <ActionIcon icon={<MessageCircle size={24}/>} label="WhatsApp" href={`https://wa.me/${lead.client_contact}`} color="bg-emerald-500" />
            <ActionIcon icon={<Send size={24}/>} label="SMS" href={`sms:+${lead.client_contact}`} />
            <ActionIcon icon={<Mail size={24}/>} label="Email" href={`mailto:${lead.email}`} />
          </div>
          {isUnassigned && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClaim(); onClose(); }}
              className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-100"
            >
              Take Over Identity Node
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionIcon: React.FC<{ icon: React.ReactNode, label: string, href: string, color?: string }> = ({ icon, label, href, color = 'bg-indigo-600' }) => (
  <a href={href} className="flex flex-col items-center gap-2 group transition-transform active:scale-95">
    <div className={`size-12 rounded-full ${color} flex items-center justify-center text-white shadow-lg`}>
      {icon}
    </div>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
  </a>
);

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

const EditLeadModal: React.FC<{
  lead: Lead;
  staff: Profile[];
  onClose: () => void;
  onSave: (fields: Partial<Lead>) => void;
}> = ({ lead, staff, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    client_name: lead.client_name,
    status: lead.status,
    budget: lead.budget || '',
    user_id: lead.user_id,
    notes: lead.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Modify Dossier</h3>
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Authority</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold appearance-none"
                  value={formData.user_id || ''}
                  onChange={e => setFormData({...formData, user_id: e.target.value || null})}
                >
                  <option value="">Unassigned Pool</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.email.split('@')[0].toUpperCase()}</option>)}
                </select>
              </div>
           </div>
           
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Nominal ID</label>
              <input 
                type="text"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                value={formData.client_name}
                onChange={e => setFormData({...formData, client_name: e.target.value})}
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record Notes</label>
              <textarea 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-medium min-h-[100px] resize-none"
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Internal dossier notes..."
              />
           </div>

           <div className="flex gap-4 pt-6">
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 Persist Update
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
