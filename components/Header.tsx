import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    className={`flex items-center px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-4 focus:outline-none ${isActive
      ? 'border-[#498e72] text-[#75c081] bg-white/10'
      : 'border-transparent text-slate-300 hover:text-white hover:border-[#75c081]/60'
      }`}
  >
    {icon && <span className={`mr-2 transition-colors duration-200 ${isActive ? 'text-[#75c081]' : 'text-slate-300'}`}>{icon}</span>}
    {children}
  </button>
);

const SubNavButton: React.FC<NavButtonProps> = ({ isActive, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap border focus:outline-none flex items-center gap-2 ${isActive
      ? 'bg-[#498e72] text-white border-[#498e72] shadow-md scale-105'
      : 'bg-white text-[#1E293B] border-[#2ca4c2]/30 hover:border-[#498e72] hover:text-[#205f64]'
      }`}
  >
    {icon}
    {children}
  </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, setView, username, userRole, onLogout }) => {
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOtherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = useMemo(() => ({
    home: ['home'] as View[],
    operations: ['received', 'testing', 'wip', 'dtf', 'finished', 'storage', 'supplies'] as View[],
    finance: ['finance_upload', 'finance_dashboard', 'finance_gst', 'finance_expenses', 'finance_prices', 'finance_maker'] as View[],
    admin: ['companies', 'users', 'employee_tasks', 'ai_assistant', 'reports', 'master', 'log'] as View[],
    help: ['help'] as View[],
  }), []);

  const currentCategory = useMemo(() => {
    if (currentView === 'home') return 'home';
    if (categories.operations.includes(currentView)) return 'operations';
    if (categories.finance.includes(currentView)) return 'finance';
    if (categories.admin.includes(currentView)) return 'admin';
    if (currentView === 'help') return 'help';
    return 'operations';
  }, [currentView, categories]);

  return (
    <header className="bg-[#205f64] sticky top-0 z-[100] shadow-xl border-b border-[#2ca4c2]/30 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between h-auto md:h-16 overflow-visible">
          
          {/* LOGO & BRANDING */}
          <div className="flex items-center justify-between py-3 md:py-0 mr-8">
            <div className="flex items-center cursor-pointer gap-3" onClick={() => setView('home')}>
              <img
                src="https://bluampenergy.com/wp-content/uploads/2018/07/logo-white-001.png"
                alt="Bluamp Logo"
                className="h-10 w-auto object-contain rounded-md p-0.5"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-lg font-extrabold text-white leading-none tracking-tight font-brand bluamp-logo-text">Bluamp</h1>
                <p className="text-[10px] text-[#75c081] font-black tracking-widest uppercase mt-0.5">Plant Management OS</p>
              </div>
            </div>
          </div>

          {/* MAIN TOP NAVIGATION */}
          <nav className="flex items-center space-x-1 md:flex-grow md:justify-center pt-1 md:pt-0 overflow-visible">
            {/* Top Navigation Items */}
            <div className="flex items-center space-x-1 overflow-visible">
              {/* 1. HOME */}
              <TopNavButton
                isActive={currentCategory === 'home'}
                onClick={() => setView('home')}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              >
                Home
              </TopNavButton>

              {/* 2. OPERATIONS */}
              <TopNavButton
                isActive={currentCategory === 'operations'}
                onClick={() => setView('received')}
                icon={<CubeIcon className="h-4 w-4" />}
              >
                Operations
              </TopNavButton>

              {/* 3. FINANCE */}
              <TopNavButton
                isActive={currentCategory === 'finance'}
                onClick={() => setView(userRole === 'admin' ? 'finance_dashboard' : 'finance_maker')}
                icon={<FileTextIcon className="h-4 w-4" />}
              >
                Finance
              </TopNavButton>

              {/* 4. ADMIN */}
              <TopNavButton
                isActive={currentCategory === 'admin'}
                onClick={() => setView('companies')}
                icon={<BuildingIcon className="h-4 w-4" />}
              >
                Admin
              </TopNavButton>
            </div>

            {/* DIVIDER */}
            <div className="w-px h-6 bg-[#2ca4c2]/40 mx-2 self-center hidden sm:block"></div>

            {/* 5. OTHER LINKS DROPDOWN */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setIsOtherOpen(!isOtherOpen)}
                className={`flex items-center px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-4 focus:outline-none ${
                  isOtherOpen || currentCategory === 'help'
                    ? 'border-[#498e72] text-[#75c081] bg-white/10'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-[#75c081]/60'
                }`}
              >
                <span className={`mr-2 transition-colors duration-200 ${isOtherOpen || currentCategory === 'help' ? 'text-[#75c081]' : 'text-slate-300'}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                Other Links
                <svg className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-200 ${isOtherOpen ? 'rotate-180 text-[#75c081]' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* OVERLAY DROPDOWN MENU */}
              {isOtherOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[1px]" 
                    onClick={() => setIsOtherOpen(false)} 
                  />
                  <div className="fixed top-16 right-4 sm:right-20 w-64 bg-[#1b4b4f] border border-[#2ca4c2]/40 rounded-2xl shadow-2xl py-3 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 text-[10px] font-black uppercase text-[#75c081] tracking-widest border-b border-[#2ca4c2]/20 flex justify-between items-center">
                      <span>Resources & Portals</span>
                      <span className="text-slate-300 font-normal">Press Esc</span>
                    </div>

                    {/* 1. Help Guide */}
                    <button
                      onClick={() => {
                        setView('help');
                        setIsOtherOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between hover:bg-[#205f64] transition-colors ${
                        currentView === 'help' ? 'text-[#75c081] bg-[#205f64] font-black' : 'text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📖</span>
                        <div>
                          <div className="leading-tight">Help & User Guide</div>
                          <div className="text-[10px] text-slate-300 font-normal">Component & App Manual</div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-[#75c081]/20 text-[#75c081] px-1.5 py-0.5 rounded font-black">NEW</span>
                    </button>

                    <div className="h-px bg-[#2ca4c2]/20 my-1"></div>

                    {/* 2. Reports */}
                    <a
                      href="https://support.bluampenergy.com/report"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOtherOpen(false)}
                      className="w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between hover:bg-[#205f64] text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📊</span>
                        <div>
                          <div className="leading-tight">Reports Portal</div>
                          <div className="text-[10px] text-slate-300 font-normal">External Support Reports</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-300">↗</span>
                    </a>

                    {/* 3. Prismatic Data */}
                    <a
                      href="https://support.bluampenergy.com/data"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOtherOpen(false)}
                      className="w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between hover:bg-[#205f64] text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💎</span>
                        <div>
                          <div className="leading-tight">Prismatic Data</div>
                          <div className="text-[10px] text-slate-300 font-normal">Analytics Engine</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-300">↗</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* USER PROFILE / LOGOUT */}
          <div className="flex items-center space-x-3 py-2 md:py-0 justify-end border-t md:border-t-0 border-[#2ca4c2]/30">
            {username && (
              <div className="flex items-center space-x-2 bg-[#1b4b4f] px-3 py-1.5 rounded-full border border-[#2ca4c2]/30 shadow-inner">
                <div className="w-6 h-6 rounded-full bg-[#498e72] text-white font-extrabold flex items-center justify-center text-xs uppercase shadow-sm">
                  {username.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">{username}</span>
                  <span className="text-[9px] text-[#75c081] font-black uppercase tracking-wider mt-0.5">
                    {userRole === 'admin' ? 'Director Admin' : userRole === 'billing' ? 'Billing & Ops' : 'Employee'}
                  </span>
                </div>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-300 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* SUB-NAVIGATION BAR */}
      <div className="bg-slate-50 border-t border-[#2ca4c2]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 py-2.5 overflow-x-auto scrollbar-hide">
            
            {/* HOME SUB-NAV */}
            {currentCategory === 'home' && (
              <>
                <div className="flex items-center gap-1 text-[10px] font-black text-[#205f64]/70 uppercase tracking-widest mr-2">Overview:</div>
                <SubNavButton isActive={currentView === 'home'} onClick={() => setView('home')}>Plant Dashboard Summary</SubNavButton>
              </>
            )}

            {/* OPERATIONS SUB-NAV */}
            {currentCategory === 'operations' && (
              <>
                <SubNavButton isActive={currentView === 'received'} onClick={() => setView('received')}>Raw Materials</SubNavButton>
                <SubNavButton isActive={currentView === 'testing'} onClick={() => setView('testing')}>Testing</SubNavButton>
                <SubNavButton isActive={currentView === 'wip'} onClick={() => setView('wip')}>WIP (Assembly)</SubNavButton>
                <SubNavButton isActive={currentView === 'dtf'} onClick={() => setView('dtf')}>Direct-To-Finished</SubNavButton>
                <SubNavButton isActive={currentView === 'finished'} onClick={() => setView('finished')}>Finished Goods</SubNavButton>
                <SubNavButton isActive={currentView === 'storage'} onClick={() => setView('storage')}>Storage Rack Map</SubNavButton>
                <SubNavButton isActive={currentView === 'supplies'} onClick={() => setView('supplies')}>Supplies</SubNavButton>
              </>
            )}

            {/* FINANCE SUB-NAV */}
            {currentCategory === 'finance' && (
              <>
                {userRole === 'admin' && (
                  <>
                    <SubNavButton isActive={currentView === 'finance_upload'} onClick={() => setView('finance_upload')}>Scan & Import</SubNavButton>
                    <SubNavButton isActive={currentView === 'finance_dashboard'} onClick={() => setView('finance_dashboard')}>Summary</SubNavButton>
                  </>
                )}
                <SubNavButton isActive={currentView === 'finance_maker'} onClick={() => setView('finance_maker')}>Invoice Maker</SubNavButton>
                {userRole === 'admin' && (
                  <>
                    <SubNavButton isActive={currentView === 'finance_gst'} onClick={() => setView('finance_gst')}>GST Returns</SubNavButton>
                    <SubNavButton isActive={currentView === 'finance_prices'} onClick={() => setView('finance_prices')}>Prices</SubNavButton>
                  </>
                )}
                <SubNavButton isActive={currentView === 'finance_expenses'} onClick={() => setView('finance_expenses')}>Expenses</SubNavButton>
              </>
            )}

            {/* ADMIN SUB-NAV */}
            {currentCategory === 'admin' && (
              <>
                <SubNavButton isActive={currentView === 'companies'} onClick={() => setView('companies')}>Companies</SubNavButton>
                {userRole === 'admin' && (
                  <SubNavButton isActive={currentView === 'users'} onClick={() => setView('users')}>Users</SubNavButton>
                )}
                <SubNavButton isActive={currentView === 'employee_tasks'} onClick={() => setView('employee_tasks')}>
                  📋 Employee Tasks
                </SubNavButton>
                <div className="w-px h-6 bg-[#2ca4c2]/30 mx-2"></div>
                <SubNavButton isActive={currentView === 'ai_assistant'} onClick={() => setView('ai_assistant')} icon={<SparklesIcon className="h-3 w-3" />}>AI Assistant</SubNavButton>
                <SubNavButton isActive={currentView === 'reports'} onClick={() => setView('reports')}>Exports</SubNavButton>
                <SubNavButton isActive={currentView === 'master'} onClick={() => setView('master')}>Traceability</SubNavButton>
                <SubNavButton isActive={currentView === 'log'} onClick={() => setView('log')}>Logs</SubNavButton>
              </>
            )}

            {/* HELP SUB-NAV */}
            {currentCategory === 'help' && (
              <>
                <div className="flex items-center gap-1 text-[10px] font-black text-[#205f64]/70 uppercase tracking-widest mr-2">Guide:</div>
                <SubNavButton isActive={currentView === 'help'} onClick={() => setView('help')}>Help & User Guide</SubNavButton>
              </>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;