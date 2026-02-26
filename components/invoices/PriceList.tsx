import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import type { PriceListItem } from '../../types';

interface PriceListProps {
    priceList: PriceListItem[];
    setPriceList: React.Dispatch<React.SetStateAction<PriceListItem[]>>;
}

const PriceList: React.FC<PriceListProps> = ({ priceList, setPriceList }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editHsn, setEditHsn] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    // New row state
    const [newName, setNewName] = useState('');
    const [newHsn, setNewHsn] = useState('');
    const [newPrice, setNewPrice] = useState('');

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) {
                    alert('CSV must have a header row and at least one data row.');
                    setIsUploading(false);
                    return;
                }

                // Parse header to find column indices
                const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                const nameIdx = header.findIndex(h => h.includes('model') || h.includes('name') || h.includes('description') || h.includes('item'));
                const hsnIdx = header.findIndex(h => h.includes('hsn') || h.includes('sac') || h.includes('code'));
                const priceIdx = header.findIndex(h => h.includes('price') || h.includes('rate') || h.includes('amount'));

                if (nameIdx === -1 || priceIdx === -1) {
                    alert('CSV must contain columns matching "Model Name" and "Price without GST".\nFound headers: ' + header.join(', '));
                    setIsUploading(false);
                    return;
                }

                const parsed: Omit<PriceListItem, 'id'>[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(c => c.trim());
                    const name = cols[nameIdx];
                    const hsn = hsnIdx !== -1 ? (cols[hsnIdx] || '') : '';
                    const price = parseFloat(cols[priceIdx]);
                    if (name && !isNaN(price)) {
                        parsed.push({ model_name: name, hsn_code: hsn, price_without_gst: price });
                    }
                }

                if (parsed.length === 0) {
                    alert('No valid rows found in CSV.');
                    setIsUploading(false);
                    return;
                }

                // Replace entire price list in Supabase
                await supabase.from('price_list').delete().neq('id', '');
                const { data, error } = await supabase.from('price_list').insert(parsed).select();
                if (error) {
                    alert('Failed to save price list: ' + error.message);
                } else if (data) {
                    setPriceList(data as PriceListItem[]);
                    alert(`✅ Imported ${data.length} prices successfully!`);
                }
            } catch (err: any) {
                alert('Error parsing CSV: ' + err.message);
            }
            setIsUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleAddRow = async () => {
        if (!newName.trim()) return;
        const price = parseFloat(newPrice) || 0;
        const { data, error } = await supabase.from('price_list').insert([{ model_name: newName.trim(), hsn_code: newHsn.trim(), price_without_gst: price }]).select();
        if (data && !error) {
            setPriceList(prev => [...prev, ...(data as PriceListItem[])]);
            setNewName('');
            setNewHsn('');
            setNewPrice('');
        }
    };

    const handleDeleteRow = async (id: string) => {
        await supabase.from('price_list').delete().eq('id', id);
        setPriceList(prev => prev.filter(p => p.id !== id));
    };

    const handleStartEdit = (item: PriceListItem) => {
        setEditingId(item.id);
        setEditName(item.model_name);
        setEditHsn(item.hsn_code || '');
        setEditPrice(String(item.price_without_gst));
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        const price = parseFloat(editPrice) || 0;
        await supabase.from('price_list').update({ model_name: editName.trim(), hsn_code: editHsn.trim(), price_without_gst: price }).eq('id', editingId);
        setPriceList(prev => prev.map(p => p.id === editingId ? { ...p, model_name: editName.trim(), hsn_code: editHsn.trim(), price_without_gst: price } : p));
        setEditingId(null);
    };

    const filtered = priceList.filter(p => p.model_name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.hsn_code || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Price List</h2>
                    <p className="text-slate-500 text-sm">Upload your latest CSV pricelist. These prices auto-fill in Invoice Maker.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-400 font-bold">{priceList.length} items</span>
                </div>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Upload CSV Price List</label>
                        <p className="text-[10px] text-slate-400 mb-3">CSV columns: <strong>Model Name</strong>, <strong>HSN Code</strong>, <strong>Price without GST</strong>. Uploading replaces the entire list.</p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            onChange={handleCsvUpload}
                            disabled={isUploading}
                            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#8EBF45] file:text-[#0D0D0D] hover:file:bg-[#658C3E] hover:file:text-white file:cursor-pointer file:transition-colors"
                        />
                    </div>
                    {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-indigo-600 font-bold">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Importing...
                        </div>
                    )}
                </div>
            </div>

            {/* Search & Add */}
            <div className="flex gap-3">
                <input
                    type="text"
                    placeholder="Search models or HSN..."
                    className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#8EBF45] shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Model name"
                    className="w-40 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#8EBF45]"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="HSN code"
                    className="w-28 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#8EBF45]"
                    value={newHsn}
                    onChange={e => setNewHsn(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Price"
                    className="w-28 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#8EBF45]"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                />
                <button
                    onClick={handleAddRow}
                    disabled={!newName.trim()}
                    className="bg-[#8EBF45] text-[#0D0D0D] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#658C3E] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                    + Add
                </button>
            </div>

            {/* Price Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Model Name</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">HSN Code</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-40">Price (excl. GST)</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-xs text-slate-400">{idx + 1}</td>
                                {editingId === item.id ? (
                                    <>
                                        <td className="p-3">
                                            <input
                                                className="w-full text-sm p-1.5 border rounded outline-none focus:border-[#8EBF45]"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                autoFocus
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                className="w-full text-sm p-1.5 border rounded outline-none focus:border-[#8EBF45]"
                                                value={editHsn}
                                                onChange={e => setEditHsn(e.target.value)}
                                            />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input
                                                type="number"
                                                className="w-full text-sm p-1.5 border rounded outline-none focus:border-[#8EBF45] text-right"
                                                value={editPrice}
                                                onChange={e => setEditPrice(e.target.value)}
                                            />
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={handleSaveEdit} className="text-[10px] bg-[#8EBF45] text-[#0D0D0D] px-2.5 py-1 rounded font-bold hover:bg-[#658C3E] hover:text-white">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-1 rounded font-bold hover:bg-slate-300">Cancel</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-3 text-sm font-medium text-slate-800">{item.model_name}</td>
                                        <td className="p-3 text-sm font-mono text-slate-600">{item.hsn_code || '—'}</td>
                                        <td className="p-3 text-sm font-mono text-right text-slate-700">₹{item.price_without_gst.toLocaleString('en-IN')}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => handleStartEdit(item)} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded font-bold hover:border-[#8EBF45] hover:text-[#658C3E]">Edit</button>
                                                <button onClick={() => handleDeleteRow(item.id)} className="text-[10px] bg-white border border-red-200 text-red-500 px-2.5 py-1 rounded font-bold hover:bg-red-50">Del</button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic text-sm">
                                    {priceList.length === 0 ? 'No prices uploaded yet. Upload a CSV to get started.' : 'No matching models found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PriceList;
