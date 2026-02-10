
import React, { useState, useEffect } from 'react';
import { Users, Plus, LayoutDashboard, LogOut, Briefcase, PlusCircle, UserPlus, Mail, Shield, CheckCircle2, Loader2, Info, X, Save, FolderPlus, Settings, PieChart, UserCheck, Rocket, Menu, Home, ShieldAlert, Cpu, Link, Copy, Send, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LeadForm from './components/LeadForm';
import { Profile, Project, AuthState } from './types';
import Login from './components/Login';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'management' | 'projects'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [mgmtSection, setMgmtSection] = useState<'projects' | 'team'>('projects');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setAuthState({ user: null, isAuthenticated: false, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      // Check for invitation in URL
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('invite');
      if (inviteId) {
        localStorage.setItem('pending_invite_id', inviteId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
          return;
        }
        setAuthState({ user: null, isAuthenticated: false, loading: false });
        return;
      }

      let userProfile = profile as Profile;
      
      // Auto-join project if there's a pending invite
      const pendingInviteId = localStorage.getItem('pending_invite_id');
      if (pendingInviteId && pendingInviteId !== 'null' && !userProfile.assigned_project_ids?.includes(pendingInviteId)) {
        const updatedIds = Array.from(new Set([...(userProfile.assigned_project_ids || []), pendingInviteId]));
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ assigned_project_ids: updatedIds })
          .eq('id', userId);
        
        if (!updateError) {
          userProfile.assigned_project_ids = updatedIds;
          localStorage.removeItem('pending_invite_id');
        }
      }

      setAuthState({ user: userProfile, isAuthenticated: true, loading: false });
      fetchProjects(userProfile.assigned_project_ids || [], userProfile.role, userId);
      if (userProfile.role === 'admin') fetchTeamProfiles();
    } catch (err) {
      console.error('Error fetching profile:', err);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchTeamProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('email');
      if (!error && data) setTeamProfiles(data as Profile[]);
    } catch (err) {
      console.error('Error fetching team:', err);
    }
  };

  const fetchProjects = async (assignedIds: string[], role: string, userId: string) => {
    try {
      let query = supabase.from('projects').select('*');
      if (role === 'admin') {
        // Admins should see all projects they manage
        query = query.eq('admin_id', userId);
      } else {
        if (!assignedIds || assignedIds.length === 0) {
          setProjects([]);
          return;
        }
        query = query.in('id', assignedIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      setProjects(data as Project[] || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjectName.trim() || !authState.user) return;
    setIsCreatingProject(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name: newProjectName, admin_id: authState.user.id })
        .select().single();

      if (error) throw error;

      const updatedIds = Array.from(new Set([...(authState.user.assigned_project_ids || []), data.id]));
      await supabase.from('profiles').update({ assigned_project_ids: updatedIds }).eq('id', authState.user.id);

      setProjects(prev => [...prev, data]);
      setAuthState(prev => prev.user ? { ...prev, user: { ...prev.user, assigned_project_ids: updatedIds } } : prev);
      
      setNewProjectName('');
      setIsCreatingProject(false);
      setShowCreateProjectModal(false);
      setActiveTab('projects');
    } catch (err) {
      console.error('Project creation failed:', err);
      setIsCreatingProject(false);
    }
  };

  const handleToggleProjectAssignment = async (profileId: string, projectId: string) => {
    const profile = teamProfiles.find(p => p.id === profileId);
    if (!profile) return;
    
    let updatedIds = [...(profile.assigned_project_ids || [])];
    if (updatedIds.includes(projectId)) {
      updatedIds = updatedIds.filter(id => id !== projectId);
    } else {
      updatedIds.push(projectId);
    }

    try {
      const { error } = await supabase.from('profiles').update({ assigned_project_ids: updatedIds }).eq('id', profileId);
      if (error) throw error;
      
      setTeamProfiles(prev => prev.map(p => p.id === profileId ? { ...p, assigned_project_ids: updatedIds } : p));
      
      if (profileId === authState.user?.id) {
        setAuthState(prev => prev.user ? { ...prev, user: { ...prev.user, assigned_project_ids: updatedIds } } : prev);
      }
    } catch (err) {
      console.error('Assignment update failed:', err);
    }
  };

  const handleCopyInviteLink = (projectId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?invite=${projectId}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(projectId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pending_invite_id');
  };

  if (authState.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-2xl h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Initializing Antigravity Cluster...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) return <Login />;

  const isAdmin = authState.user?.role === 'admin';

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-inter">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex shadow-2xl z-20">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
                <Shield className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">Lead<br/>Node</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secure Cloud</span>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-6 space-y-2">
            <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<PlusCircle size={18} />} label="New Lead" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
            <SidebarItem icon={<Briefcase size={18} />} label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            {isAdmin && <SidebarItem icon={<Settings size={18} />} label="Security Panel" active={activeTab === 'management'} onClick={() => setActiveTab('management')} />}
          </nav>
          <div className="p-6 border-t border-slate-50">
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-600 border border-indigo-200 uppercase">{authState.user?.email?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{authState.user?.email.split('@')[0]}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-600">{authState.user?.role} Authority</p>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-[10px] font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-widest"><LogOut size={16} /> De-Authorize</button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto relative bg-slate-50/50 pb-20 md:pb-0">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 md:px-8 md:py-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {activeTab === 'dashboard' && 'Active Leads'}
                {activeTab === 'add' && 'Lead Intake'}
                {activeTab === 'projects' && 'Cluster Nodes'}
                {activeTab === 'management' && 'Workspace Security'}
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{projects.length} Operational Nodes Active</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowCreateProjectModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                <Rocket size={14} /> New Cluster
              </button>
            )}
          </header>

          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (projects.length > 0 ? <Dashboard currentUser={authState.user!} projects={projects} /> : <EmptyState isAdmin={isAdmin} onCreate={() => setShowCreateProjectModal(true)} />)}
            {activeTab === 'add' && (projects.length > 0 ? <LeadForm currentUser={authState.user!} projects={projects} onSuccess={() => {setActiveTab('dashboard'); fetchProfile(authState.user!.id); }} /> : <EmptyState isAdmin={isAdmin} onCreate={() => setShowCreateProjectModal(true)} />)}
            {activeTab === 'projects' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(p => <ProjectCard key={p.id} project={p} onCopyInvite={() => handleCopyInviteLink(p.id)} copied={copyFeedback === p.id} isAdmin={isAdmin} />)}
                  {projects.length === 0 && <EmptyState isAdmin={isAdmin} onCreate={() => setShowCreateProjectModal(true)} />}
               </div>
            )}
            {activeTab === 'management' && isAdmin && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex gap-4 p-1.5 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
                  <button onClick={() => setMgmtSection('projects')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mgmtSection === 'projects' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Manage Clusters</button>
                  <button onClick={() => setMgmtSection('team')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mgmtSection === 'team' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Team Authorization</button>
                </div>

                {mgmtSection === 'projects' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col group">
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Briefcase size={28} /></div>
                          <button 
                            onClick={() => handleCopyInviteLink(p.id)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${copyFeedback === p.id ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'}`}
                          >
                            {copyFeedback === p.id ? <CheckCircle2 size={12}/> : <Link size={12}/>}
                            {copyFeedback === p.id ? 'Copied' : 'Copy Link'}
                          </button>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">{p.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Node ID: {p.id.slice(0, 8)}</p>
                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex -space-x-2">
                              {teamProfiles.filter(t => t.assigned_project_ids?.includes(p.id)).slice(0, 5).map(staff => (
                                <div key={staff.id} title={staff.email} className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">{staff.email?.[0]}</div>
                              ))}
                           </div>
                           <button onClick={() => setMgmtSection('team')} className="text-indigo-600 text-[9px] font-black uppercase tracking-widest hover:underline">Manage Authority</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                      <span className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em]">Personnel Registry Authority</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {teamProfiles.map(profile => (
                        <div key={profile.id} className="p-8 flex flex-col gap-6 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 text-xl uppercase">{profile.email?.[0]}</div>
                              <div>
                                <h5 className="font-black text-slate-900 text-lg leading-none">{profile.email}</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{profile.assigned_project_ids?.length || 0} Nodes Connected</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {projects.map(proj => (
                              <button key={proj.id} onClick={() => handleToggleProjectAssignment(profile.id, proj.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${profile.assigned_project_ids?.includes(proj.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                {proj.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-4 md:hidden z-50">
        <MobileNavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<PlusCircle size={20} />} active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
        <MobileNavItem icon={<Briefcase size={20} />} active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
      </nav>
    </div>
  );
};

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-2xl ${active ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>{icon}</button>
);
const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>{icon}{label}</button>
);
const ProjectCard = ({ project, onCopyInvite, copied, isAdmin }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group">
    <div className="flex justify-between items-start mb-8">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600"><Briefcase size={28} /></div>
      {isAdmin && <button onClick={onCopyInvite} className={`p-3 rounded-xl border transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-600'}`}>{copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}</button>}
    </div>
    <h4 className="text-2xl font-black text-slate-900 leading-tight">{project.name}</h4>
  </div>
);
const EmptyState = ({ isAdmin, onCreate }: any) => (
  <div className="bg-white rounded-[3rem] p-16 text-center border-2 border-dashed border-slate-200 w-full">
    <h3 className="text-2xl font-black text-slate-900 mb-4">No Clusters Available</h3>
    {isAdmin && <button onClick={onCreate} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase">Initialize Cluster</button>}
  </div>
);
export default App;
