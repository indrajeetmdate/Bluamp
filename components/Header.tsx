import React, { useMemo } from 'react';
import type { View } from '../types';
import type { User } from '../types';
import { BuildingIcon } from './icons/BuildingIcon';
import { CubeIcon } from './icons/CubeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  username: string;
  userRole: User['role'];
  onLogout: () => void;
}

interface NavButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const TopNavButton: React.FC<NavButtonProps> = ({ isActive, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-4 focus:outline-none ${
      isActive
        ? 'border-[#8EBF45] text-[#8EBF45] bg-white/5'
        : 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
    }`}
  >
    {icon && <span className={`mr-2 transition-colors duration-200 ${isActive ? 'text-[#8EBF45]' : 'text-slate-500'}`}>{icon}</span>}
    {children}
  </button>
);

const SubNavButton: React.FC<NavButtonProps> = ({ isActive, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 whitespace-nowrap border focus:outline-none flex items-center gap-2 ${
      isActive
        ? 'bg-[#8EBF45] text-[#0D0D0D] border-[#8EBF45] shadow-lg scale-105'
        : 'bg-white text-[#404040] border-[#A8BF75]/30 hover:border-[#8EBF45] hover:text-[#658C3E]'
    }`}
  >
    {icon}
    {children}
  </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, setView, username, userRole, onLogout }) => {
  
  const categories = useMemo(() => ({
    operations: ['received', 'testing', 'wip', 'finished', 'storage'] as View[],
    finance: ['finance_upload', 'finance_dashboard', 'finance_gst', 'finance_expenses', 'finance_maker'] as View[],
    analytics: ['ai_assistant', 'reports', 'master', 'log'] as View[],
    admin: ['companies', 'users'] as View[],
  }), []);

  const currentCategory = useMemo(() => {
    if (categories.finance.includes(currentView)) return 'finance';
    if (categories.operations.includes(currentView)) return 'operations';
    if (categories.analytics.includes(currentView)) return 'analytics';
    if (categories.admin.includes(currentView)) return 'admin';
    return 'operations';
  }, [currentView, categories]);

  return (
    <header className="bg-[#0D0D0D] sticky top-0 z-50 shadow-xl border-b border-[#404040]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between h-auto md:h-16">
          <div className="flex items-center justify-between py-3 md:py-0 mr-8">
            <div className="flex items-center cursor-pointer gap-3" onClick={() => setView('finance_dashboard')}>
                <img 
                  src="https://bfkxdpripwjxenfvwpfu.supabase.co/storage/v1/object/public/Logo/DC_Full_battery_black_bg.png" 
                  alt="Datlion Cnergy Logo" 
                  className="h-10 w-auto object-contain"
                />
                <div className="flex flex-col justify-center">
                    <h1 className="text-lg font-bold text-white leading-none tracking-tight font-brand">Datlion Cnergy</h1>
                    <p className="text-[10px] text-[#8EBF45] font-black tracking-widest uppercase mt-0.5">Plant Management OS</p>
                </div>
            </div>
          </div>

          <nav className="flex space-x-1 overflow-x-auto scrollbar-hide md:flex-grow md:justify-center pt-1 md:pt-0">
             <TopNavButton isActive={currentCategory === 'operations'} onClick={() => setView('received')} icon={<CubeIcon className="h-4 w-4" />}>Operations</TopNavButton>
             <TopNavButton isActive={currentCategory === 'finance'} onClick={() => setView('finance_dashboard')} icon={<FileTextIcon className="h-4 w-4" />}>Finance</TopNavButton>
             <TopNavButton isActive={currentCategory === 'analytics'} onClick={() => setView('reports')} icon={<SearchIcon className="h-4 w-4" />}>Analytics</TopNavButton>
             <TopNavButton isActive={currentCategory === 'admin'} onClick={() => setView('companies')} icon={<BuildingIcon className="h-4 w-4" />}>Admin</TopNavButton>
          </nav>

          <div className="absolute top-4 right-4 md:static flex items-center md:ml-6">
            <div className="text-right mr-3 hidden md:block">
                <div className="text-xs font-bold text-white">{username}</div>
                <div className="text-[9px] uppercase font-black text-[#8EBF45] bg-white/10 px-1.5 py-0.5 rounded mt-0.5">{userRole}</div>
            </div>
            <button onClick={onLogout} className="ml-3 text-slate-500 hover:text-[#8EBF45] transition-colors p-1.5 hover:bg-white/5 rounded-full" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#A8BF75]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 py-2.5 overflow-x-auto scrollbar-hide">
            {currentCategory === 'operations' && (
              <>
                <div className="flex items-center gap-1 text-[10px] font-black text-[#404040]/50 uppercase tracking-widest mr-2">Workflow:</div>
                <SubNavButton isActive={currentView === 'received'} onClick={() => setView('received')}>Raw Materials</SubNavButton>
                <div className="text-[#A8BF75]">/</div>
                <SubNavButton isActive={currentView === 'testing'} onClick={() => setView('testing')}>Testing</SubNavButton>
                <div className="text-[#A8BF75]">/</div>
                <SubNavButton isActive={currentView === 'wip'} onClick={() => setView('wip')}>Work in Progress</SubNavButton>
                <div className="text-[#A8BF75]">/</div>
                <SubNavButton isActive={currentView === 'finished'} onClick={() => setView('finished')}>Finished Goods</SubNavButton>
                <div className="w-px h-6 bg-[#A8BF75]/40 mx-2"></div>
                <SubNavButton isActive={currentView === 'storage'} onClick={() => setView('storage')} icon={<SearchIcon className="w-3 h-3"/>}>Storage Layout</SubNavButton>
              </>
            )}
            {currentCategory === 'finance' && (
              <>
                <SubNavButton isActive={currentView === 'finance_dashboard'} onClick={() => setView('finance_dashboard')}>Dashboard</SubNavButton>
                <SubNavButton isActive={currentView === 'finance_upload'} onClick={() => setView('finance_upload')}>Scan Invoice</SubNavButton>
                <SubNavButton isActive={currentView === 'finance_maker'} onClick={() => setView('finance_maker')}>Invoice Maker</SubNavButton>
                <SubNavButton isActive={currentView === 'finance_gst'} onClick={() => setView('finance_gst')}>GST Returns</SubNavButton>
                <SubNavButton isActive={currentView === 'finance_expenses'} onClick={() => setView('finance_expenses')}>Expenses</SubNavButton>
              </>
            )}
            {currentCategory === 'analytics' && (
              <>
                <SubNavButton isActive={currentView === 'ai_assistant'} onClick={() => setView('ai_assistant')} icon={<SparklesIcon className="h-3 w-3" />}>AI Assistant</SubNavButton>
                <SubNavButton isActive={currentView === 'reports'} onClick={() => setView('reports')}>Exports</SubNavButton>
                <SubNavButton isActive={currentView === 'master'} onClick={() => setView('master')}>Traceability</SubNavButton>
                <SubNavButton isActive={currentView === 'log'} onClick={() => setView('log')}>Logs</SubNavButton>
              </>
            )}
            {currentCategory === 'admin' && (
              <>
                <SubNavButton isActive={currentView === 'companies'} onClick={() => setView('companies')}>Companies</SubNavButton>
                {userRole === 'admin' && (
                    <SubNavButton isActive={currentView === 'users'} onClick={() => setView('users')}>Users</SubNavButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;