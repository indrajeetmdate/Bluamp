
import React, { useState, useEffect, useMemo } from 'react';
import { ExtractedInvoice, InvoiceItem } from '../../types';
import { Download, Package, Plus, Trash2 } from './Icons';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { downloadFile } from '../../utils/invoiceUtils';
import { supabase } from '../../supabaseClient';

interface InventoryPanelProps {
  data: ExtractedInvoice;
  onUpdate: (items: InvoiceItem[]) => void;
  setView?: (view: any) => void;
}

const CATEGORIES = ['Cell', 'BMS', 'Bat-misc', 'Nickel Strip', 'Wire', 'Connector', 'Holder', 'Epoxy Sheet', 'Sleeve', 'Tape', 'Screw', 'Cabinet', 'Uncategorized'];

const InventoryPanel: React.FC<InventoryPanelProps> = ({ data, onUpdate, setView }) => {
  const [items, setItems] = useState<any[]>([]);
  const [existingItemNames, setExistingItemNames] = useState<string[]>([]);

  // Fetch unique item names already in system to suggest to user
  useEffect(() => {
    const fetchNames = async () => {
        const { data: rgData } = await supabase.from('received_goods').select('name');
        if (rgData) {
            const unique = Array.from(new Set(rgData.map((g: any) => g.name))) as string[];
            setExistingItemNames(unique);
        }
    };
    fetchNames();
  }, []);

  const guessCategory = (item: InvoiceItem): string => {
      if (item.item_type && CATEGORIES.includes(item.item_type)) return item.item_type;
      const text = ((item.description || '') + ' ' + (item.item_type || '')).toLowerCase();
      if (text.includes('cell') || text.includes('lfp') || text.includes('nmc') || text.includes('battery')) return 'Cell';
      if (text.includes('bms') || text.includes('pcb') || text.includes('protection') || text.includes('circuit')) return 'BMS';
      if (text.includes('tape') || text.includes('nickel') || text.includes('holder') || text.includes('connector') || text.includes('screw')) return 'Bat-misc';
      return 'Uncategorized';
  };

  useEffect(() => {
    const mappedItems = data.items.map(item => {
      const category = item.item_type || guessCategory(item);
      return {
        name: item.description || 'Unknown Item',
        category: category,
        make_model: item.make_model || '',
        quantity: item.quantity || 0,
        status: item.status || 'Not Damaged',
        original_item: item 
      };
    });

    setItems(prev => {
        const prevJson = JSON.stringify(prev.map(({original_item, ...rest}) => rest));
        const nextJson = JSON.stringify(mappedItems.map(({original_item, ...rest}) => rest));
        if (prevJson !== nextJson) return mappedItems;
        return prev;
    });
  }, [data.items]);

  const syncToParent = (newLocalItems: any[]) => {
      const invoiceItems: InvoiceItem[] = newLocalItems.map(local => {
          const base = local.original_item || {};
          return {
              ...base,
              description: local.name,
              item_type: local.category,
              make_model: local.make_model,
              quantity: Number(local.quantity),
              status: local.status,
              hsn_sac: base.hsn_sac || '',
              unit_price: base.unit_price || 0,
              taxable_value: base.taxable_value || 0,
              cgst_rate: base.cgst_rate || 0,
              cgst_amount: base.cgst_amount || 0,
              sgst_rate: base.sgst_rate || 0,
              sgst_amount: base.sgst_amount || 0,
              igst_rate: base.igst_rate || 0,
              igst_amount: base.igst_amount || 0,
              total_value: base.total_value || 0
          };
      });
      onUpdate(invoiceItems);
  };

  const handleFieldChange = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    syncToParent(updated);
  };

  const handleSendToStorage = () => {
      const exportData = items.map(item => ({
          name: item.name,
          category: item.category,
          makeModel: item.make_model,
          supplier: data.issuer_details?.name || 'Unknown',
          invoiceNumber: data.invoice_metadata?.invoice_number || 'Unknown',
          quantity: Number(item.quantity),
          status: item.status
      }));
      localStorage.setItem('pendingInventoryImport', JSON.stringify(exportData));
      if (setView) setView('received');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600"/> Master Item Mapping</h3>
            <p className="text-xs text-slate-500 mt-1">Review item names before import. Ensure names match existing Master Items for SKU recipes.</p>
        </div>
        <button onClick={handleSendToStorage} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow-sm"><ArrowRightIcon size={16} /> Add to Stock</button>
      </div>

      <div className="overflow-x-auto border rounded-md border-slate-200">
        <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-indigo-50 text-indigo-900 font-medium border-b">
                <tr>
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 min-w-[200px]">Item Name (Master ID)</th>
                    <th className="p-3 min-w-[120px]">Category</th>
                    <th className="p-3 min-w-[120px]">Make / Model</th>
                    <th className="p-3 w-20 text-right">Qty</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 w-10"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-xs text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                            <input list="master-names-list" className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-800 font-bold" value={item.name || ''} onChange={(e) => handleFieldChange(idx, 'name', e.target.value)} />
                            <datalist id="master-names-list">
                                {existingItemNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </td>
                        <td className="p-3">
                            <input list={`cat-options-${idx}`} className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-800" value={item.category || ''} onChange={(e) => handleFieldChange(idx, 'category', e.target.value)} />
                            <datalist id={`cat-options-${idx}`}>{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                        </td>
                        <td className="p-3">
                            <input 
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-800" 
                                placeholder="Manufacturer..."
                                value={item.make_model || ''} 
                                onChange={(e) => handleFieldChange(idx, 'make_model', e.target.value)} 
                            />
                        </td>
                        <td className="p-3 text-right">
                            <input type="number" className="w-full text-right border border-slate-200 bg-slate-50 rounded px-2 py-1 outline-none font-bold" value={item.quantity} onChange={(e) => handleFieldChange(idx, 'quantity', e.target.value)} />
                        </td>
                        <td className="p-3">
                            <select 
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-800 text-xs" 
                                value={item.status || 'Not Damaged'} 
                                onChange={(e) => handleFieldChange(idx, 'status', e.target.value)}
                            >
                                <option value="Not Damaged">Not Damaged</option>
                                <option value="Damaged">Damaged</option>
                                <option value="Partially Received">Partially Received</option>
                                <option value="Other">Other</option>
                            </select>
                        </td>
                        <td className="p-3 text-center">
                            <button onClick={() => { const updated = items.filter((_, i) => i !== idx); setItems(updated); syncToParent(updated); }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-4 italic">* Consistent naming is key. If a "32700 Cell" arrives, ensure the name exactly matches your existing "32700 Cell" Master Item to keep SKU recipes working automatically.</p>
    </div>
  );
};

export default InventoryPanel;
