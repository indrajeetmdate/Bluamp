
import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ReceivedGood, WIPItem, FinishedGood, Recipe, SupplyRecord, LogEntry, View, ExtractedInvoice, Expense } from '../types';

interface HomeDashboardProps {
    receivedGoods: ReceivedGood[];
    wipItems: WIPItem[];
    finishedGoods: FinishedGood[];
    recipes: Recipe[];
    suppliesRecords: SupplyRecord[];
    logs: LogEntry[];
    currentUser: { username: string; role: 'admin' | 'user' | 'billing' } | null;
    setView: (view: View) => void;
}

// Utility: human readable time ago
const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const isToday = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const isThisWeek = (ts: number) => {
    const now = Date.now();
    return now - ts < 7 * 86400000;
};

const HomeDashboard: React.FC<HomeDashboardProps> = ({
    receivedGoods, wipItems, finishedGoods, recipes, suppliesRecords, logs, currentUser, setView
}) => {
    // Fetch invoice & expense counts from Supabase (they aren't passed as props)
    const [invoiceStats, setInvoiceStats] = useState({ total: 0, today: 0, thisWeek: 0, totalValue: 0, todayValue: 0 });
    const [expenseStats, setExpenseStats] = useState({ total: 0, today: 0, todayAmount: 0 });
    const [recentInvoices, setRecentInvoices] = useState<ExtractedInvoice[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

            // Invoices
            const { data: allInv } = await supabase.from('invoices').select('id, created_at, totals, document_type, invoice_metadata, receiver_details, issuer_details').order('created_at', { ascending: false }).limit(500);
            if (allInv) {
                const today = allInv.filter((i: any) => i.created_at?.startsWith(todayStr));
                const week = allInv.filter((i: any) => i.created_at && i.created_at >= weekAgoStr);
                const totalVal = allInv.reduce((s: number, i: any) => s + (i.totals?.grand_total || 0), 0);
                const todayVal = today.reduce((s: number, i: any) => s + (i.totals?.grand_total || 0), 0);
                setInvoiceStats({ total: allInv.length, today: today.length, thisWeek: week.length, totalValue: totalVal, todayValue: todayVal });
                setRecentInvoices(allInv.slice(0, 5) as ExtractedInvoice[]);
            }

            // Expenses
            const { data: allExp } = await supabase.from('expenses').select('id, date, amount, type').order('date', { ascending: false }).limit(500);
            if (allExp) {
                const todayExp = allExp.filter((e: any) => e.date === todayStr);
                const todayAmt = todayExp.reduce((s: number, e: any) => s + (e.type === 'debit' ? (e.amount || 0) : 0), 0);
                setExpenseStats({ total: allExp.length, today: todayExp.length, todayAmount: todayAmt });
            }
        };
        fetch();
    }, []);

    // Operations KPIs
    const ops = useMemo(() => {
        const rmTotal = receivedGoods.length;
        const rmTotalQty = receivedGoods.reduce((s, r) => s + r.quantity, 0);
        const rmToday = receivedGoods.filter(r => isToday(r.timestamp)).length;

        const wipTotal = wipItems.length;
        const wipTotalQty = wipItems.reduce((s, w) => s + w.quantity, 0);
        const wipToday = wipItems.filter(w => isToday(w.timestamp)).length;

        const fgTotal = finishedGoods.length;
        const fgTotalQty = finishedGoods.reduce((s, f) => s + f.quantity, 0);
        const fgToday = finishedGoods.filter(f => isToday(f.timestamp)).length;
        const fgDelivered = finishedGoods.filter(f => f.unitDeliveries && Object.keys(f.unitDeliveries).length > 0).length;

        const supInward = suppliesRecords.filter(s => s.direction === 'inward').length;
        const supOutward = suppliesRecords.filter(s => s.direction === 'outward').length;
        const supToday = suppliesRecords.filter(s => isToday(s.timestamp)).length;

        return { rmTotal, rmTotalQty, rmToday, wipTotal, wipTotalQty, wipToday, fgTotal, fgTotalQty, fgToday, fgDelivered, supInward, supOutward, supToday };
    }, [receivedGoods, wipItems, finishedGoods, suppliesRecords]);

    // Recent activity timeline
    const recentLogs = useMemo(() => {
        return [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
    }, [logs]);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const quickLinks: { label: string; view: View; icon: string; color: string }[] = [
        { label: 'Raw Materials', view: 'received', icon: '📦', color: 'from-amber-500/20 to-orange-500/20 border-amber-400/40' },
        { label: 'Work in Progress', view: 'wip', icon: '⚙️', color: 'from-blue-500/20 to-cyan-500/20 border-blue-400/40' },
        { label: 'Finished Goods', view: 'finished', icon: '✅', color: 'from-green-500/20 to-emerald-500/20 border-green-400/40' },
        { label: 'Invoice Maker', view: 'finance_maker' as View, icon: '🧾', color: 'from-purple-500/20 to-violet-500/20 border-purple-400/40' },
        { label: 'Expenses', view: 'finance_expenses' as View, icon: '💰', color: 'from-red-500/20 to-pink-500/20 border-red-400/40' },
        { label: 'AI Assistant', view: 'ai_assistant', icon: '✨', color: 'from-indigo-500/20 to-blue-500/20 border-indigo-400/40' },
    ];

    const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const actionIcon = (action: string) => {
        if (action.includes('Added') || action.includes('Created') || action.includes('Received')) return '➕';
        if (action.includes('Delivered') || action.includes('Shipped')) return '🚚';
        if (action.includes('Started') || action.includes('Production')) return '⚙️';
        if (action.includes('Tested') || action.includes('Test')) return '🧪';
        if (action.includes('Deleted') || action.includes('Removed')) return '🗑️';
        if (action.includes('Invoice') || action.includes('Saved')) return '📄';
        return '📝';
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header greeting */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {greeting}, <span className="text-[#658C3E]">{currentUser?.username?.split('@')[0] || 'User'}</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">{todayStr}</p>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                {quickLinks.map(link => (
                    <button
                        key={link.view}
                        onClick={() => setView(link.view)}
                        className={`bg-gradient-to-br ${link.color} border rounded-xl p-3 text-center hover:scale-105 transition-all duration-200 hover:shadow-lg group`}
                    >
                        <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{link.icon}</div>
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider leading-tight">{link.label}</div>
                    </button>
                ))}
            </div>

            {/* KPI Cards - Operations */}
            <div className="mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#8EBF45] rounded-full"></span>
                    Operations Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Raw Materials */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView('received')}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raw Materials</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{ops.rmTotal}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{ops.rmTotalQty.toLocaleString()} total units</p>
                            </div>
                            <div className="text-3xl opacity-60">📦</div>
                        </div>
                        {ops.rmToday > 0 && (
                            <div className="mt-3 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                +{ops.rmToday} today
                            </div>
                        )}
                    </div>

                    {/* WIP */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView('wip')}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Production</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{ops.wipTotal}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{ops.wipTotalQty.toLocaleString()} batches</p>
                            </div>
                            <div className="text-3xl opacity-60">⚙️</div>
                        </div>
                        {ops.wipToday > 0 && (
                            <div className="mt-3 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                +{ops.wipToday} today
                            </div>
                        )}
                    </div>

                    {/* Finished Goods */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView('finished')}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finished Goods</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{ops.fgTotal}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{ops.fgTotalQty.toLocaleString()} units built</p>
                            </div>
                            <div className="text-3xl opacity-60">✅</div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {ops.fgToday > 0 && (
                                <div className="bg-green-50 text-green-700 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                    +{ops.fgToday} today
                                </div>
                            )}
                            {ops.fgDelivered > 0 && (
                                <div className="bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                    {ops.fgDelivered} delivered
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Supplies */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView('supplies')}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplies</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{ops.supInward + ops.supOutward}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{ops.supInward}↓ in · {ops.supOutward}↑ out</p>
                            </div>
                            <div className="text-3xl opacity-60">🚚</div>
                        </div>
                        {ops.supToday > 0 && (
                            <div className="mt-3 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                +{ops.supToday} today
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards - Finance (Admin/Billing only) */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'billing') && (
                <div className="mb-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#658C3E] rounded-full"></span>
                        Finance Summary
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Invoices Total */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView(currentUser?.role === 'admin' ? 'finance_dashboard' as View : 'finance_maker' as View)}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Invoices</p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{invoiceStats.total}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(invoiceStats.totalValue)}</p>
                                </div>
                                <div className="text-3xl opacity-60">🧾</div>
                            </div>
                            {invoiceStats.today > 0 && (
                                <div className="mt-3 bg-green-50 text-green-700 text-[10px] font-bold rounded-full px-2.5 py-1 inline-block">
                                    +{invoiceStats.today} today ({formatCurrency(invoiceStats.todayValue)})
                                </div>
                            )}
                        </div>

                        {/* This Week */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This Week</p>
                                    <p className="text-3xl font-black text-[#658C3E] mt-1">{invoiceStats.thisWeek}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">invoices processed</p>
                                </div>
                                <div className="text-3xl opacity-60">📊</div>
                            </div>
                        </div>

                        {/* Expenses Today */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setView('finance_expenses' as View)}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expenses Today</p>
                                    <p className="text-3xl font-black text-red-600 mt-1">{expenseStats.today}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(expenseStats.todayAmount)} spent</p>
                                </div>
                                <div className="text-3xl opacity-60">💸</div>
                            </div>
                        </div>

                        {/* Total Expenses */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Entries</p>
                                    <p className="text-3xl font-black text-slate-900 mt-1">{expenseStats.total}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">expense records</p>
                                </div>
                                <div className="text-3xl opacity-60">📋</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Section: Recent Activity + Recent Invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            Recent Activity
                        </h3>
                        <button onClick={() => setView('log')} className="text-[10px] font-bold text-[#658C3E] hover:underline uppercase tracking-wider">
                            View All →
                        </button>
                    </div>
                    {recentLogs.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4 text-center">No activity recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentLogs.map((log, idx) => (
                                <div key={log.id || idx} className="flex items-start gap-3 group">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-[#8EBF45]/10 transition-colors">
                                        {actionIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{log.action}</p>
                                        <p className="text-xs text-slate-500 truncate">{log.details}</p>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium flex-shrink-0 mt-0.5">
                                        {timeAgo(log.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Invoices (Admin/Billing only) */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'billing') ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#8EBF45] rounded-full"></span>
                                Recent Documents
                            </h3>
                            {currentUser?.role === 'admin' && (
                                <button onClick={() => setView('finance_dashboard' as View)} className="text-[10px] font-bold text-[#658C3E] hover:underline uppercase tracking-wider">
                                    Dashboard →
                                </button>
                            )}
                        </div>
                        {recentInvoices.length === 0 ? (
                            <p className="text-sm text-slate-400 italic py-4 text-center">No invoices saved yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentInvoices.map((inv, idx) => (
                                    <div key={(inv as any).id || idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 bg-[#8EBF45]/10 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                                            {inv.document_type?.includes('po') ? '📋' : inv.document_type?.includes('quotation') ? '📝' : '🧾'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {inv.invoice_metadata?.invoice_number || inv.filename || 'Untitled'}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {(inv.receiver_details as any)?.name || (inv.issuer_details as any)?.name || '—'}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black text-slate-900">{formatCurrency(inv.totals?.grand_total || 0)}</p>
                                            <p className="text-[10px] text-slate-400">{inv.invoice_metadata?.invoice_date || ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* For general employees: Production Pipeline */
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            Production Pipeline
                        </h3>
                        <div className="flex items-center justify-between py-6">
                            <div className="text-center flex-1">
                                <div className="text-2xl mb-1">📦</div>
                                <p className="text-2xl font-black text-slate-900">{ops.rmTotal}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Raw</p>
                            </div>
                            <div className="text-slate-300 text-2xl">→</div>
                            <div className="text-center flex-1">
                                <div className="text-2xl mb-1">⚙️</div>
                                <p className="text-2xl font-black text-slate-900">{ops.wipTotal}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">WIP</p>
                            </div>
                            <div className="text-slate-300 text-2xl">→</div>
                            <div className="text-center flex-1">
                                <div className="text-2xl mb-1">✅</div>
                                <p className="text-2xl font-black text-slate-900">{ops.fgTotal}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Finished</p>
                            </div>
                            <div className="text-slate-300 text-2xl">→</div>
                            <div className="text-center flex-1">
                                <div className="text-2xl mb-1">🚚</div>
                                <p className="text-2xl font-black text-slate-900">{ops.fgDelivered}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Shipped</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Recipes Overview */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                    Product Recipes ({recipes.length})
                </h3>
                {recipes.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-3">No recipes configured yet.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {recipes.map(r => {
                            const fgCount = finishedGoods.filter(f => f.recipeId === r.id).reduce((s, f) => s + f.quantity, 0);
                            const wipCount = wipItems.filter(w => w.recipeId === r.id).reduce((s, w) => s + w.quantity, 0);
                            return (
                                <div key={r.id} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 hover:border-[#8EBF45]/50 transition-colors">
                                    <p className="text-xs font-bold text-slate-800 truncate mb-2" title={r.name}>{r.name}</p>
                                    <div className="flex justify-center gap-3 text-[10px]">
                                        <span className="text-blue-600 font-bold">{wipCount} WIP</span>
                                        <span className="text-green-600 font-bold">{fgCount} FG</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeDashboard;
