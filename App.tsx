
import React, { useState, useEffect } from 'react';
import { Users, Plus, LayoutDashboard, LogOut, Briefcase, PlusCircle, UserPlus, Mail, Shield, CheckCircle2, Loader2, Info, X, Save, FolderPlus, Settings, PieChart, UserCheck, Rocket, Menu, Home, ShieldAlert, Cpu, Link, Copy, Send } from 'lucide-react';
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

  // Invitation State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTargetProjectId, setInviteTargetProjectId] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

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
      
      const pendingInviteId = localStorage.getItem('pending_invite_id');
      if (pendingInviteId && !userProfile.assigned_project_ids.includes(pendingInviteId)) {
        const updatedIds = [...userProfile.assigned_project_ids, pendingInviteId];
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
      if (role === 'admin') query = query.eq('admin_id', userId);
      else {
        if (!assignedIds || assignedIds.length === 0) {
          setProjects([]);
          return;
        }
        query = query.in('id', assignedIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      setProjects(data as Project[] || []);
      if (data && data.length > 0 && !inviteTargetProjectId) {
        setInviteTargetProjectId(data[0].id);
      }
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

      const updatedIds = [...(authState.user.assigned_project_ids || []), data.id];
      await supabase.from('profiles').update({ assigned_project_ids: updatedIds }).eq('id', authState.user.id);

      setProjects(prev => [...prev, data]);
      setAuthState(prev => prev.user ? { ...prev, user: { ...prev.user, assigned_project_ids: updatedIds } } : prev);
      
      setNewProjectName('');
      setIsCreatingProject(false);
      setShowCreateProjectModal(false);
      setActiveTab('management');
      setMgmtSection('projects');
    } catch (err) {
      console.error('Project creation failed:', err);
      setIsCreatingProject(false);
    }
  };

  const handleToggleProjectAssignment = async (profileId: string, projectId: string) => {
    const profile = teamProfiles.find(p => p.id === profileId);
    if (!profile) return;
    let updatedIds = [...(profile.assigned_project_ids || [])];
    if (updatedIds.includes(projectId)) updatedIds = updatedIds.filter(id => id !== projectId);
    else updatedIds.push(projectId);

    try {
      const { error } = await supabase.from('profiles').update({ assigned_project_ids: updatedIds }).eq('id', profileId);
      if (error) throw error;
      setTeamProfiles(prev => prev.map(p => p.id === profileId ? { ...p, assigned_project_ids: updatedIds } : p));
    } catch (err) {
      console.error('Assignment update failed:', err);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteTargetProjectId || isSendingInvite) return;
    
    setIsSendingInvite(true);
    const selectedProject = projects.find(p => p.id === inviteTargetProjectId);
    const projectName = selectedProject?.name || 'our Lead Management system';
    const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${inviteTargetProjectId}`;
    
    try {
      // Primary Action: Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          to: inviteEmail,
          projectName: projectName,
          inviteLink: inviteLink,
          inviterEmail: authState.user?.email
        }
      });

      if (error) {
        // Fallback: If edge function fails (e.g. not deployed), use a friendly error or mailto
        console.warn("Edge function unreachable, falling back to manual protocol", error);
        const subject = encodeURIComponent(`Invitation to join project: ${projectName}`);
        const body = encodeURIComponent(`Hello,\n\nYou have been invited to join the "${projectName}" node on Antigravity CRM.\n\nAccess Link: ${inviteLink}\n\nSecurity Protocol Active.`);
        window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
      }

      setInviteEmail('');
      setCopyFeedback('invite_sent');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('Backend invitation failed:', err);
    } finally {
      setIsSendingInvite(false);
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
            {activeTab === 'add' && (projects.length > 0 ? <LeadForm currentUser={authState.user!} projects={projects} onSuccess={() => setActiveTab('dashboard')} /> : <EmptyState isAdmin={isAdmin} onCreate={() => setShowCreateProjectModal(true)} />)}
            {activeTab === 'projects' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(p => <ProjectCard key={p.id} project={p} onCopyInvite={() => handleCopyInviteLink(p.id)} copied={copyFeedback === p.id} isAdmin={isAdmin} />)}
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
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${copyFeedback === p.id ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'}`}
                          >
                            {copyFeedback === p.id ? <CheckCircle2 size={12}/> : <Link size={12}/>}
                            {copyFeedback === p.id ? 'Copied' : 'Invite'}
                          </button>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">{p.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">ID: {p.id.slice(0, 8)}</p>
                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex -space-x-2">
                              {teamProfiles.filter(t => t.assigned_project_ids?.includes(p.id)).slice(0, 5).map(staff => (
                                <div key={staff.id} title={staff.email} className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">{staff.email?.[0]}</div>
                              ))}
                           </div>
                           <button onClick={() => setMgmtSection('team')} className="text-indigo-600 text-[9px] font-black uppercase tracking-widest hover:underline">Manage Team</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/30 font-black text-[10px] text-slate-400 uppercase tracking-[0.3em]">Authorized Personnel Registry</div>
                        <div className="divide-y divide-slate-50">
                          {teamProfiles.map(profile => (
                            <div key={profile.id} className="p-8 flex flex-col gap-6 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 text-xl uppercase">{profile.email?.[0]}</div>
                                  <div>
                                    <h5 className="font-black text-slate-900 text-lg leading-none">{profile.email}</h5>
                                    <div className="flex items-center gap-3 mt-3">
                                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${profile.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{profile.role}</span>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile.assigned_project_ids?.length || 0} Nodes Assigned</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {projects.map(proj => (
                                  <button key={proj.id} onClick={() => handleToggleProjectAssignment(profile.id, proj.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${profile.assigned_project_ids?.includes(proj.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                    {proj.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Send size={80} />
                        </div>
                        <h4 className="text-xl font-black mb-1 uppercase tracking-tight">Onboard Node Staff</h4>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-8">Send Identity Activation Link</p>
                        
                        <form onSubmit={handleSendEmailInvite} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80 px-1">Recipient Email</label>
                            <input 
                              type="email" 
                              required 
                              placeholder="colleague@agency.com" 
                              className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white focus:text-indigo-900 transition-all font-bold placeholder:text-white/40"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80 px-1">Initial Cluster Node</label>
                            <select 
                              required
                              className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white focus:text-indigo-900 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                              value={inviteTargetProjectId}
                              onChange={(e) => setInviteTargetProjectId(e.target.value)}
                            >
                              {projects.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                            </select>
                          </div>

                          <button 
                            type="submit" 
                            disabled={isSendingInvite || !inviteEmail}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${copyFeedback === 'invite_sent' ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:scale-[1.02] active:scale-95 shadow-lg'}`}
                          >
                            {isSendingInvite ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : copyFeedback === 'invite_sent' ? (
                              <><CheckCircle2 size={18} /> Invitation Dispatched</>
                            ) : (
                              <><Send size={18} /> Dispatch Backend Invite</>
                            )}
                          </button>
                        </form>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                             <Info size={16} />
                           </div>
                           <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Security Note</h5>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                          Invitations generate a unique activation link. Once the recipient authenticates via this link, their identity node will be automatically bound to the selected project cluster.
                        </p>
                      </div>
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
        {isAdmin && <MobileNavItem icon={<Settings size={20} />} active={activeTab === 'management'} onClick={() => setActiveTab('management')} />}
      </nav>

      {showCreateProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Deploy Cluster</h3>
              <button onClick={() => setShowCreateProjectModal(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cluster Designation</label>
                <input type="text" required autoFocus className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-800 text-lg" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
              </div>
              <button type="submit" disabled={isCreatingProject || !newProjectName.trim()} className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3">
                {isCreatingProject ? <Loader2 className="animate-spin" size={24} /> : <Rocket size={24} />} DEPLOY NODE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MobileNavItem: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400'}`}>{icon}</button>
);

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>{icon}{label}</button>
);

const ProjectCard: React.FC<{ project: Project, onCopyInvite: () => void, copied: boolean, isAdmin: boolean }> = ({ project, onCopyInvite, copied, isAdmin }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
    <div className="flex justify-between items-start mb-8">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Briefcase size={28} /></div>
      {isAdmin && (
        <button onClick={onCopyInvite} className={`p-3 rounded-xl border transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-600 hover:text-indigo-600'}`}>
          {copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}
        </button>
      )}
    </div>
    <h4 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{project.name}</h4>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4"><CheckCircle2 size={12} className="text-emerald-500" /> System Link Active</p>
  </div>
);

const EmptyState: React.FC<{ isAdmin: boolean, onCreate: () => void }> = ({ isAdmin, onCreate }) => (
  <div className="bg-white rounded-[3rem] p-16 md:p-24 text-center border-2 border-dashed border-slate-200 shadow-sm animate-in fade-in zoom-in-95">
    <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-slate-100"><Cpu size={48} className="text-slate-200" /></div>
    <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Cluster Inactive</h3>
    <p className="text-slate-500 mb-12 max-w-md mx-auto font-medium text-lg leading-relaxed">
      {isAdmin ? 'No project clusters have been initialized. Begin by deploying your first project node.' : 'Your identity has not been assigned to any project clusters yet. Contact an administrator.'}
    </p>
    {isAdmin && (
      <button onClick={onCreate} className="bg-indigo-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 mx-auto">
        <Rocket size={24} /> Deploy First Cluster
      </button>
    )}
  </div>
);

export default App;
