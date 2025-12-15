import React, { useState, useEffect } from 'react';
import { Client, AdvisorProfile } from './types';
import { AddClientModal } from './components/AddClientModal';
import { ClientDetail } from './components/ClientDetail';
import { VestingCalendar } from './components/VestingCalendar';
import { Button } from './components/Button';
import { Login } from './components/Login';
import { Users, LayoutGrid, LogOut, Search, Loader2, Menu, X, CalendarDays, Briefcase, Trash2, Settings, Palette } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { getClients, saveClient, deleteClient, getAdvisorProfile, saveAdvisorProfile } from './services/supabaseService';

const App: React.FC = () => {
  // --- Auth State ---
  const { user, logout } = useAuth();
  
  // --- App State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation State
  const [activeView, setActiveView] = useState<'clients' | 'calendar'>('clients');
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Advisor Profile State
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [brandingForm, setBrandingForm] = useState({ companyName: '', logoUrl: '', primaryColor: '#0066cc' });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // --- Fetch Clients and Advisor Profile on Load ---
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        getClients(user.id),
        getAdvisorProfile(user.id)
      ])
        .then(([clientsData, profileData]) => {
          setClients(clientsData);
          if (profileData) {
            setAdvisorProfile(profileData);
            setBrandingForm({
              companyName: profileData.companyName || '',
              logoUrl: profileData.logoUrl || '',
              primaryColor: profileData.primaryColor || '#0066cc'
            });
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setClients([]);
      setAdvisorProfile(null);
    }
  }, [user]);

  // --- Handlers ---
  const handleAddClient = async (
    name: string, 
    taxBracket: number, 
    state: string, 
    filingStatus: 'single' | 'married_joint', 
    estimatedIncome: number, 
    customState?: number, 
    customLtcg?: number,
    customAmtSafeHarbor?: number
  ) => {
    if (!user) return;

    const newClient: Client = {
      id: crypto.randomUUID(),
      name,
      taxBracket,
      state,
      filingStatus,
      estimatedIncome,
      customStateTaxRate: customState,
      customLtcgTaxRate: customLtcg,
      customAmtSafeHarbor,
      grants: [],
      plannedExercises: []
    };

    // Optimistic Update
    setClients([...clients, newClient]);

    // Cloud Save
    await saveClient(user.id, newClient);
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    if (!user) return;

    // Store previous state for rollback
    const previousClients = [...clients];

    // Optimistic Update
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));

    // Cloud Save with error handling
    try {
      console.log('💾 Saving client:', updatedClient.name, 'with', updatedClient.grants.length, 'grants');
      await saveClient(user.id, updatedClient);
      console.log('✅ Client saved successfully');
    } catch (error) {
      console.error('❌ Failed to save client:', error);
      console.error('Client data:', JSON.stringify(updatedClient, null, 2));

      // Rollback optimistic update
      setClients(previousClients);

      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      alert(`Error saving data: ${errorMessage}\n\nPlease check the browser console for details and try again.`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!user) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmDelete) return;

    // Optimistic Update
    setClients(clients.filter(c => c.id !== clientId));

    // If the deleted client was selected, clear selection
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }

    // Cloud Delete
    try {
      await deleteClient(user.id, clientId);
    } catch (error) {
      console.error('Failed to delete client:', error);
      // Revert optimistic update on error
      const originalClients = await getClients(user.id);
      setClients(originalClients);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSelectedClientId(null);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSaveBranding = async () => {
    if (!user) return;
    setIsSavingBranding(true);
    try {
      const savedProfile = await saveAdvisorProfile(user.id, {
        companyName: brandingForm.companyName,
        logoUrl: brandingForm.logoUrl,
        primaryColor: brandingForm.primaryColor
      });
      setAdvisorProfile(savedProfile);
      setShowBrandingModal(false);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const navigateTo = (view: 'clients' | 'calendar') => {
    setActiveView(view);
    setSelectedClientId(null);
    closeMobileMenu();
  };

  // --- Render Login if not authenticated ---
  if (!user) {
    return <Login />;
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-tidemark-navy text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-tidemark-blue rounded-lg flex items-center justify-center text-white">
               <Briefcase size={20} />
             </div>
             <span className="font-bold text-lg tracking-tight">EquityCompass</span>
        </div>
        <button onClick={toggleMobileMenu} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-tidemark-navy text-slate-300 flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        print:hidden
      `}>
        <div className="p-6 border-b border-slate-700/50 hidden md:block">
          <div className="flex items-center gap-3">
             {advisorProfile?.logoUrl ? (
               <img
                 src={advisorProfile.logoUrl}
                 alt={advisorProfile.companyName || 'Company Logo'}
                 className="w-8 h-8 rounded-lg object-contain bg-white"
               />
             ) : (
               <div className="w-8 h-8 bg-tidemark-blue rounded-lg flex items-center justify-center text-white">
                 <Briefcase size={20} />
               </div>
             )}
             <span className="font-bold text-lg text-white tracking-tight">
               {advisorProfile?.companyName || 'EquityCompass'}
             </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 md:mt-0">
          <button
            onClick={() => navigateTo('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'clients' && !selectedClientId ? 'bg-tidemark-blue text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <LayoutGrid size={20} />
            <span className="font-medium">Client Portfolio</span>
          </button>

          <button
            onClick={() => navigateTo('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'calendar' ? 'bg-tidemark-blue text-white shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <CalendarDays size={20} />
            <span className="font-medium">Vesting Calendar</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
             <div className="flex items-center justify-between mb-2">
               <h4 className="text-xs font-semibold text-slate-400 uppercase">Advisor</h4>
               <button
                 onClick={() => setShowBrandingModal(true)}
                 className="p-1 hover:bg-slate-700 rounded transition-colors"
                 title="Branding Settings"
               >
                 <Settings size={14} className="text-slate-400" />
               </button>
             </div>
             <p className="text-sm text-white truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen print:h-auto print:w-full">
        {selectedClientId && activeClient ? (
          <ClientDetail 
            client={activeClient} 
            onBack={() => { setSelectedClientId(null); setActiveView('clients'); }}
            onUpdateClient={handleUpdateClient}
          />
        ) : activeView === 'calendar' ? (
          <VestingCalendar clients={clients} />
        ) : (
          <div className="max-w-6xl mx-auto space-y-8 print:hidden pb-20">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-tidemark-navy">Client Overview</h1>
                <p className="text-slate-500">Manage your portfolio of clients and their equity grants.</p>
              </div>
              <Button onClick={() => setIsAddClientModalOpen(true)} className="gap-2 shadow-lg shadow-tidemark-blue/20 w-full md:w-auto">
                <Users size={20} />
                Add New Client
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search clients by name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-tidemark-blue outline-none shadow-sm"
              />
            </div>

            {/* Loading State */}
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 size={40} className="animate-spin mb-4 text-tidemark-blue" />
                  <p>Loading Clients from Secure Cloud...</p>
               </div>
            ) : (
                /* Client Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-tidemark-blue transition-all cursor-pointer group relative"
                    >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client.id);
                      }}
                      className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-tidemark-blue/10 text-tidemark-navy rounded-full flex items-center justify-center font-bold text-xl group-hover:bg-tidemark-blue group-hover:text-white transition-colors">
                        {client.name.charAt(0)}
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-medium">
                        {client.taxBracket}% Tax
                        </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{client.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        {client.grants.length} Active Grant{client.grants.length !== 1 ? 's' : ''}
                    </p>
                    
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <span className="text-slate-500">View Details</span>
                        <span className="text-tidemark-blue font-medium flex items-center gap-1">
                        Open Portfolio &rarr;
                        </span>
                    </div>
                    </div>
                ))}
                
                {filteredClients.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No clients found.</p>
                    </div>
                )}
                </div>
            )}
          </div>
        )}
      </main>

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSave={handleAddClient}
      />

      {showBrandingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-tidemark-navy to-tidemark-blue">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette size={20} />
                Branding Settings
              </h2>
              <p className="text-sm text-blue-200">Customize your advisor portal appearance</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={brandingForm.companyName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Logo URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={brandingForm.logoUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none"
                  />
                </div>
                {brandingForm.logoUrl && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <img
                      src={brandingForm.logoUrl}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span className="text-sm text-slate-600">Logo Preview</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Enter a URL to your logo image. Recommended size: 128x128px
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Primary Color</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                    placeholder="#0066cc"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowBrandingModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
                {isSavingBranding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Branding'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;