
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Phone, Info, UserPlus, Clock, Briefcase, Loader2, Edit3, X, Save, UserCheck, Send, MoreVertical, MessageCircle, PieChart, Users, CheckCircle2, MapPin, Mail, ChevronRight, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import { Profile, Lead, Project, LeadStatus } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  currentUser: Profile;
  projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, projects }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [projectStaff, setProjectStaff] = useState<Profile[]>([]);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const assignedIds = currentUser.assigned_project_ids || [];
      if (assignedIds.length === 0) {
        setLeads([]);
        return;
      }

      let query = supabase
        .from('leads')
        .select('*')
        .in('project_id', assignedIds)
        .order('created_at', { ascending: false });

      if (filterProject !== 'all') {
        query = query.eq('project_id', filterProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data as Lead[] || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser.assigned_project_ids, filterProject]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, currentUser.assigned_project_ids]);

  const handleUpdateLead = async (updatedFields: Partial<Lead>) => {
    if (!editingLead) return;
    try {
      const { error } = await supabase.from('leads').update(updatedFields).eq('id', editingLead.id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...updatedFields } : l));
      setEditingLead(null);
    } catch (err) { console.error(err); }
  };

  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    return (l.client_name?.toLowerCase() || '').includes(q) || (l.client_contact || '').includes(q);
  });

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-8 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard icon={<Users size={20} />} label="Total Leads" value={leads.length} color="indigo" />
          <MetricCard icon={<Info size={20} />} label="Unassigned" value={leads.filter(l => !l.user_id).length} color="amber" />
          <MetricCard icon={<CheckCircle2 size={20} />} label="Closed" value={leads.filter(l => l.status === 'Booked' || l.status === 'Closed').length} color="emerald" />
          <button onClick={() => fetchLeads(true)} className="p-6 rounded-3xl border border-slate-200 bg-white flex items-center justify-between hover:border-indigo-600 transition-all shadow-sm">
            <p className="text-xl font-black text-slate-900">Sync</p>
            <RefreshCw className={`${refreshing ? 'animate-spin' : ''}`} size={24} />
          </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input type="text" placeholder="Search Identity Pool..." className="w-full pl-14 pr-4 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select className="bg-white px-8 py-5 border border-slate-200 rounded-2xl font-black text-[10px] uppercase outline-none" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="all">Consolidated View</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLeads.map(lead => <LeadListItem key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />)}
          {filteredLeads.length === 0 && <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 font-black text-slate-300 uppercase">Registry Empty</div>}
        </div>
      )}

      {selectedLead && <LeadDetails lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
};

const LeadListItem = ({ lead, onClick }: any) => (
  <div onClick={onClick} className="flex items-center gap-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-600 transition-all cursor-pointer">
    <div className="size-14 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-300 overflow-hidden">
      {lead.client_image_url ? <img src={lead.client_image_url} className="w-full h-full object-cover" /> : lead.client_name?.[0]}
    </div>
    <div className="flex-1">
      <h3 className="font-black text-slate-900">{lead.client_name}</h3>
      <p className="text-[10px] font-bold text-slate-400 mt-1">+{lead.client_contact}</p>
    </div>
    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100`}>{lead.status}</span>
    <ChevronRight size={20} className="text-slate-300" />
  </div>
);

const LeadDetails = ({ lead, onClose }: any) => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-lg mx-auto bg-white rounded-t-[3rem] p-10 space-y-6" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-start">
        <h2 className="text-3xl font-black">{lead.client_name}</h2>
        <button onClick={onClose} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button>
      </div>
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-600">Contact: <span className="font-black">+{lead.client_contact}</span></p>
        <p className="text-sm font-medium text-slate-600">Budget: <span className="font-black">{lead.budget || 'N/A'}</span></p>
        <p className="text-sm font-medium text-slate-600">Location: <span className="font-black">{lead.city || 'N/A'}</span></p>
      </div>
      <div className="flex gap-4 pt-6">
        <a href={`tel:+${lead.client_contact}`} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-center font-black text-[10px] uppercase">Call</a>
        <a href={`https://wa.me/${lead.client_contact}`} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-center font-black text-[10px] uppercase">WhatsApp</a>
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, color, icon }: any) => (
  <div className="p-6 rounded-3xl border border-slate-200 bg-white flex items-center justify-between">
    <div>
      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600">{icon}</div>
  </div>
);

export default Dashboard;
