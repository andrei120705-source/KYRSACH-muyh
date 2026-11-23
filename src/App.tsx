import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, ClipboardList, FileText, Gavel, LayoutDashboard, LogOut, Map as MapIcon, Menu, Moon, PanelLeftClose, PanelLeftOpen, RefreshCw, RotateCcw, Search, Sparkles, Sun, Truck, Users, X } from 'lucide-react';
import { api, isLocalMode } from './api/client';
import { CommandPalette } from './components/CommandPalette';
import { LoginScreen } from './components/LoginScreen';
import { NotificationCenter } from './components/NotificationCenter';
import { ToastProvider, useToast } from './components/ToastProvider';
import type { Client, DashboardData, Driver, Order, Vehicle } from './types/logistics';
import { type AppUser, type NavTab, ROLE_DEFAULT_TAB, ROLE_LABELS, ROLE_TABS, canResetDemo, clearSession, initials, loadSession, saveSession } from './utils/auth';

const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
const OrdersView = lazy(() => import('./components/OrdersView').then((m) => ({ default: m.OrdersView })));
const FreightExchangeView = lazy(() => import('./components/FreightExchangeView').then((m) => ({ default: m.FreightExchangeView })));
const TrackingMapView = lazy(() => import('./components/TrackingMapView').then((m) => ({ default: m.TrackingMapView })));
const FleetView = lazy(() => import('./components/FleetView').then((m) => ({ default: m.FleetView })));
const DriversView = lazy(() => import('./components/DriversView').then((m) => ({ default: m.DriversView })));
const ClientsView = lazy(() => import('./components/ClientsView').then((m) => ({ default: m.ClientsView })));
const DocumentsView = lazy(() => import('./components/DocumentsView').then((m) => ({ default: m.DocumentsView })));

function ViewFallback() { return <div className="rounded-2xl bg-white border border-slate-200 p-12 flex items-center justify-center gap-3 text-sm text-slate-500"><RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Загрузка раздела...</div>; }

function AppContent({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const { notify } = useToast();
  const role = user.role;
  const allowedTabs = ROLE_TABS[role];
  const [activeTab, setActiveTabRaw] = useState<NavTab>(ROLE_DEFAULT_TAB[role]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [docOrderId, setDocOrderId] = useState<number | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => { try { return localStorage.getItem('translogist_sidebar_collapsed') === '1'; } catch { return false; } });
  const [quickDockOpen, setQuickDockOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => { try { return localStorage.getItem('translogist_theme') === 'dark'; } catch { return false; } });

  const setActiveTab = useCallback((tab: NavTab) => { if (allowedTabs.includes(tab)) setActiveTabRaw(tab); else notify('Раздел недоступен для вашей роли', 'error'); }, [allowedTabs, notify]);
  useEffect(() => { try { localStorage.setItem('translogist_sidebar_collapsed', sidebarCollapsed ? '1' : '0'); } catch {} }, [sidebarCollapsed]);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); try { localStorage.setItem('translogist_theme', darkMode ? 'dark' : 'light'); } catch {} }, [darkMode]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((v) => !v); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); setSidebarCollapsed((v) => !v); }
      else if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dash, ord, veh, drv, cli] = await Promise.all([api.getDashboard(), api.getOrders(), api.getVehicles(), api.getDrivers(), api.getClients()]);
      setDashboard(dash); setOrders(ord); setVehicles(veh); setDrivers(drv); setClients(cli); setLastSync(new Date());
    } catch (err: unknown) { notify(err instanceof Error ? err.message : 'Ошибка загрузки данных', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [notify]);

  useEffect(() => { loadAllData(); }, [loadAllData]);
  const handleOpenOrder = (orderId: number) => { setSelectedOrderId(orderId); setActiveTab('orders'); };
  const handleOpenDocumentForOrder = (orderId: number) => { setDocOrderId(orderId); setSelectedOrderId(null); setActiveTab('documents'); };
  const handleResetDemo = async () => { if (!canResetDemo(role)) return; if (!window.confirm('Сбросить демо-данные?')) return; await api.resetDemo(); await loadAllData(); notify('Демо-данные восстановлены', 'info'); };

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const activeTripsCount = orders.filter((o) => ['assigned', 'loading', 'in_transit'].includes(o.status)).length;
  const maintCount = vehicles.filter((v) => v.status === 'maintenance').length;
  const allNavItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; badgeTone?: 'amber' | 'blue' }> = [
    { id: 'dashboard', label: 'Обзор и аналитика', icon: LayoutDashboard },
    { id: 'orders', label: 'Заявки и диспетчеризация', icon: ClipboardList, badge: newOrdersCount || undefined, badgeTone: 'amber' },
    { id: 'exchange', label: 'Биржа CMR24 (Грузы/ТС)', icon: Gavel, badge: 6, badgeTone: 'blue' },
    { id: 'tracking', label: 'Карта маршрутов', icon: MapIcon, badge: activeTripsCount || undefined, badgeTone: 'blue' },
    { id: 'fleet', label: 'Автопарк и ТО', icon: Truck, badge: maintCount || undefined, badgeTone: 'amber' },
    { id: 'drivers', label: 'Водители', icon: Users },
    { id: 'clients', label: 'Клиенты (CRM)', icon: Building2 },
    { id: 'documents', label: 'Документы и отчёты', icon: FileText },
  ];
  const navItems = allNavItems.filter((n) => allowedTabs.includes(n.id));
  const currentNav = navItems.find((n) => n.id === activeTab);
  const dockItems = navItems.filter((n) => ['dashboard', 'orders', 'tracking', 'exchange'].includes(n.id));

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" />}
      <aside className={`no-print fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 ${sidebarCollapsed ? 'lg:w-20 w-68' : 'w-68'} bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-200 flex flex-col border-r border-slate-800/80 shadow-xl transition-all duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`px-4 py-4 border-b border-slate-800/80 flex items-center ${sidebarCollapsed ? 'lg:justify-center justify-between' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed((c) => !c)} className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0"><Truck className="w-5 h-5" /></button>
            <div className={sidebarCollapsed ? 'lg:hidden block' : 'block'}><div className="font-bold text-sm text-white">ТрансЛогист PRO</div><div className="text-[11px] text-sky-400/90">TMS Control Tower</div></div>
          </div>
          <button onClick={() => setSidebarCollapsed(true)} className={`hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white ${sidebarCollapsed ? 'lg:hidden' : ''}`}><PanelLeftClose className="w-4 h-4" /></button>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon; const active = activeTab === item.id;
            return (
              <button key={item.id} title={sidebarCollapsed ? item.label : undefined} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`relative w-full flex items-center ${sidebarCollapsed ? 'lg:justify-center justify-between px-3 py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                <span className="flex items-center gap-2.5"><Icon className="w-4 h-4 shrink-0" /><span className={sidebarCollapsed ? 'lg:hidden inline' : 'inline'}>{item.label}</span></span>
                {item.badge !== undefined && <span className={`${sidebarCollapsed ? 'lg:absolute lg:top-1.5 lg:right-1.5 lg:px-1.5' : 'px-2 py-0.5'} rounded-full text-[10px] font-bold ${active ? 'bg-white text-blue-700' : item.badgeTone === 'amber' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/80 space-y-2.5">
          {sidebarCollapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">{initials(user.fullName)}</div>
              <button onClick={() => setSidebarCollapsed(false)} className="w-full flex items-center justify-center py-2 rounded-xl bg-slate-900 text-slate-300"><PanelLeftOpen className="w-4 h-4" /></button>
              <button onClick={onLogout} className="w-full flex items-center justify-center py-2 rounded-xl text-slate-400 hover:text-rose-300"><LogOut className="w-4 h-4" /></button>
            </div>
          ) : null}
          <div className={`rounded-xl bg-slate-900 p-3 flex items-center gap-2.5 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials(user.fullName)}</div>
            <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-white truncate">{user.fullName}</div><div className="text-[11px] text-slate-400 truncate">{ROLE_LABELS[role]}</div></div>
            <button onClick={onLogout} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300"><LogOut className="w-4 h-4" /></button>
          </div>
          {canResetDemo(role) && <button onClick={handleResetDemo} className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 hover:text-white"><RotateCcw className="w-3.5 h-3.5 shrink-0" /><span className={sidebarCollapsed ? 'lg:hidden inline' : 'inline'}>Сбросить демо</span></button>}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600"><Menu className="w-5 h-5" /></button>
            <button onClick={() => setSidebarCollapsed((c) => !c)} className="hidden lg:inline-flex p-2 rounded-xl border border-slate-200 bg-white text-slate-600">{sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
            <div className="min-w-0"><h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{currentNav?.label}</h1><p className="text-xs text-slate-500 hidden sm:block truncate">ООО «ТрансЛогист Экспресс» · {user.fullName}</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setCmdOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600"><Search className="w-3.5 h-3.5" /><span className="hidden md:inline">Поиск...</span></button>
            <button onClick={() => loadAllData()} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} /></button>
            <NotificationCenter orders={orders} vehicles={vehicles} drivers={drivers} allowedTabs={allowedTabs} onOpenOrder={handleOpenOrder} onNavigate={setActiveTab} />
            <button onClick={() => setDarkMode((d) => !d)} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600">{darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}</button>
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{isLocalMode() ? 'Автономный режим' : 'Сервер SQLite'}{lastSync && <span className="font-normal">· {lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}</div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          <Suspense fallback={<ViewFallback />}>
            <div key={activeTab} className="animate-viewIn">
              {activeTab === 'dashboard' && <DashboardView data={dashboard} loading={loading} onNavigate={(tab) => setActiveTab(tab as NavTab)} onOpenOrder={handleOpenOrder} />}
              {activeTab === 'orders' && <OrdersView clients={clients} vehicles={vehicles} drivers={drivers} selectedOrderId={selectedOrderId} onSelectOrderId={setSelectedOrderId} onDataChanged={loadAllData} onOpenDocumentForOrder={handleOpenDocumentForOrder} />}
              {activeTab === 'exchange' && <FreightExchangeView clients={clients} onLotTaken={async (orderId) => { await loadAllData(); setSelectedOrderId(orderId); setActiveTab('orders'); }} />}
              {activeTab === 'tracking' && <TrackingMapView orders={orders} clients={clients} onOpenOrder={handleOpenOrder} onDataChanged={loadAllData} />}
              {activeTab === 'fleet' && <FleetView vehicles={vehicles} onDataChanged={loadAllData} />}
              {activeTab === 'drivers' && <DriversView drivers={drivers} onDataChanged={loadAllData} />}
              {activeTab === 'clients' && <ClientsView clients={clients} onDataChanged={loadAllData} />}
              {activeTab === 'documents' && <DocumentsView orders={orders} preselectedOrderId={docOrderId} />}
            </div>
          </Suspense>
        </main>
      </div>
      <div className="no-print fixed bottom-5 left-5 lg:left-auto lg:right-6 z-30 flex items-center gap-1.5 bg-slate-900/95 text-white p-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
        {quickDockOpen && <div className="flex items-center gap-1 px-1">{dockItems.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-2 rounded-xl ${activeTab === item.id ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300'}`}><Icon className="w-4 h-4" /></button>; })}<button onClick={() => setCmdOpen(true)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-300"><Search className="w-4 h-4" /></button></div>}
        <button onClick={() => setQuickDockOpen((o) => !o)} className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold"><Sparkles className="w-3.5 h-3.5" />{quickDockOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <span className="text-[11px]">Меню</span>}</button>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} orders={orders} vehicles={allowedTabs.includes('fleet') ? vehicles : []} drivers={allowedTabs.includes('drivers') ? drivers : []} clients={allowedTabs.includes('clients') ? clients : []} onNavigate={(tab) => setActiveTab(tab as NavTab)} onOpenOrder={handleOpenOrder} />
    </div>
  );
}

function AuthGate() {
  const { notify } = useToast();
  const [user, setUser] = useState<AppUser | null>(() => loadSession());
  if (!user) return <LoginScreen onLogin={(u) => { saveSession(u); setUser(u); notify(`Добро пожаловать, ${u.fullName.split(' ')[1] || u.fullName}!`); }} />;
  return <AppContent key={user.login} user={user} onLogout={() => { clearSession(); setUser(null); }} />;
}

export default function App() { return <ToastProvider><AuthGate /></ToastProvider>; }
