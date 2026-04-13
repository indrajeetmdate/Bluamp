
import React, { useState } from 'react';
import type { SupplyRecord, CompanyProfile, User } from '../types';
import { Plus, Trash2, Search, RefreshCw } from './invoices/Icons';

interface SuppliesRecordProps {
  suppliesRecords: SupplyRecord[];
  setSuppliesRecords: React.Dispatch<React.SetStateAction<SupplyRecord[]>>;
  companyProfiles: CompanyProfile[];
  addLogEntry: (action: string, details: string) => void;
  currentUser: User | null;
}

const SuppliesRecord: React.FC<SuppliesRecordProps> = ({
  suppliesRecords,
  setSuppliesRecords,
  companyProfiles,
  addLogEntry,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SupplyRecord>>({
    item_name: '',
    direction: 'inward',
    from_company: '',
    to_company: '',
    is_ordered: false,
    is_received: false,
    is_shipped: false
  });

  // Iframe modal for adding company
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [lastSelectedType, setLastSelectedType] = useState<'from_company' | 'to_company' | null>(null);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'COMPANY_ADDED') {
        const newCompany = event.data.company;
        if (lastSelectedType) {
          setNewItem(prev => ({ ...prev, [lastSelectedType]: newCompany.name }));
        }
        setIsAddCompanyModalOpen(false);
        setLastSelectedType(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lastSelectedType]);

  const handleDropdownChange = (type: 'from_company' | 'to_company', value: string) => {
    if (value === 'ADD_NEW') {
      setLastSelectedType(type);
      setIsAddCompanyModalOpen(true);
    } else {
      setNewItem({ ...newItem, [type]: value });
    }
  };

  const handleAddItem = () => {
    if (!newItem.item_name) return;

    const record: SupplyRecord = {
      id: crypto.randomUUID(),
      item_name: newItem.item_name,
      direction: newItem.direction as 'inward' | 'outward',
      from_company: newItem.from_company,
      to_company: newItem.to_company,
      is_ordered: !!newItem.is_ordered,
      is_received: !!newItem.is_received,
      is_shipped: !!newItem.is_shipped,
      timestamp: Date.now(),
      created_by: currentUser?.username
    };

    setSuppliesRecords(prev => [record, ...prev]);
    addLogEntry('Supply Record Created', `Item: ${record.item_name}, Direction: ${record.direction}`);
    setNewItem({
      item_name: '',
      direction: 'inward',
      from_company: '',
      to_company: '',
      is_ordered: false,
      is_received: false,
      is_shipped: false
    });
    setIsAdding(false);
  };

  const toggleCheckbox = (id: string, field: keyof SupplyRecord) => {
    setSuppliesRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: !r[field] };
        addLogEntry('Supply Record Updated', `Item: ${r.item_name}, Field: ${field}, Value: ${updated[field]}`);
        return updated;
      }
      return r;
    }));
  };

  const deleteRecord = (id: string) => {
    const record = suppliesRecords.find(r => r.id === id);
    if (!record) return;
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    setSuppliesRecords(prev => prev.filter(r => r.id !== id));
    addLogEntry('Supply Record Deleted', `Item: ${record.item_name}`);
  };

  const filteredRecords = suppliesRecords.filter(r => 
    r.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.from_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.to_company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Supplies Record</h2>
          <p className="text-sm text-slate-500">Track inward and outward supplies status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search items or companies..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8EBF45]/20 focus:border-[#8EBF45] w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#8EBF45] text-[#0D0D0D] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#7aa83b] transition-colors shadow-sm"
          >
            <Plus size={18} /> Add Record
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white/80 backdrop-blur-md border border-[#A8BF75]/30 p-6 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-black text-[#404040]/50 uppercase tracking-widest mb-4">New Supply Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8EBF45]/20 focus:border-[#8EBF45]"
                placeholder="e.g. Solar Inverters"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Direction</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8EBF45]/20 focus:border-[#8EBF45]"
                value={newItem.direction}
                onChange={(e) => setNewItem({ ...newItem, direction: e.target.value as 'inward' | 'outward' })}
              >
                <option value="inward">Inward (Incoming)</option>
                <option value="outward">Outward (Outgoing)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">From Company</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8EBF45]/20 focus:border-[#8EBF45]"
                value={newItem.from_company}
                onChange={(e) => handleDropdownChange('from_company', e.target.value)}
              >
                <option value="">Select Company</option>
                {companyProfiles.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="ADD_NEW" className="font-bold text-[#658C3E]">+ Add New...</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">To Company</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8EBF45]/20 focus:border-[#8EBF45]"
                value={newItem.to_company}
                onChange={(e) => handleDropdownChange('to_company', e.target.value)}
              >
                <option value="">Select Company</option>
                {companyProfiles.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="ADD_NEW" className="font-bold text-[#658C3E]">+ Add New...</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              className="bg-[#0D0D0D] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#404040] transition-colors"
            >
              Save Record
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">From / To</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ordered</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin-slow opacity-20" size={48} />
                    <p>No supply records found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{record.item_name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded w-fit ${
                        record.direction === 'inward' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {record.direction}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold uppercase text-[9px] w-8">From:</span>
                        <span className="text-slate-700">{record.from_company || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold uppercase text-[9px] w-8">To:</span>
                        <span className="text-slate-700">{record.to_company || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleCheckbox(record.id, 'is_ordered')}
                      className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center mx-auto ${
                        record.is_ordered 
                          ? 'bg-[#8EBF45] border-[#8EBF45] text-white' 
                          : 'border-slate-300 hover:border-[#8EBF45]'
                      }`}
                    >
                      {record.is_ordered && <Check size={14} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.direction === 'inward' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Received</span>
                        <button
                          onClick={() => toggleCheckbox(record.id, 'is_received')}
                          className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center ${
                            record.is_received 
                              ? 'bg-[#8EBF45] border-[#8EBF45] text-white' 
                              : 'border-slate-300 hover:border-[#8EBF45]'
                          }`}
                        >
                          {record.is_received && <Check size={14} />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Shipped</span>
                        <button
                          onClick={() => toggleCheckbox(record.id, 'is_shipped')}
                          className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center ${
                            record.is_shipped 
                              ? 'bg-[#8EBF45] border-[#8EBF45] text-white' 
                              : 'border-slate-300 hover:border-[#8EBF45]'
                          }`}
                        >
                          {record.is_shipped && <Check size={14} />}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Add Company Modal with Iframe */}
      {isAddCompanyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 text-left">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-slate-800">Add New Company Profile</h2>
              <button onClick={() => setIsAddCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
            </div>
            <div className="flex-1 min-h-[600px] h-[75vh]">
              <iframe 
                src="/?mode=add_company" 
                className="w-full h-full border-none"
                title="Add Company"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Check: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default SuppliesRecord;
