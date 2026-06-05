import { ShieldAlert, Users, LayoutDashboard, Settings, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 text-xl font-bold border-b border-slate-800 flex items-center gap-2">
          <ShieldAlert className="text-red-500" /> NeoPay Admin
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/dashboard" className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg text-slate-200"><LayoutDashboard size={20} /> Transactions</a>
          <a href="#" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg text-slate-400"><Users size={20} /> Users</a>
          <a href="#" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg text-slate-400"><Settings size={20} /> Settings</a>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 w-full p-3 hover:bg-red-900/50 rounded-lg text-red-400 transition-colors">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">Live Monitor</h1>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm text-slate-500">System Secure</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
