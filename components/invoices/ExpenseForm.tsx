
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ExtractedInvoice, EMPTY_INVOICE } from '../../types';
import { Loader2, PlusCircle, CheckCircle } from './Icons';

interface ExpenseFormProps {
    currentUser: { username: string } | null;
}

const CATEGORIES = [
    'Travel & Commute',
    'Food & Dining',
    'Office Supplies',
    'Software Subscriptions',
    'Marketing',
    'Maintenance',
    'Other'
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        employeeName: currentUser?.username || '',
        date: new Date().toISOString().split('T')[0],
        category: 'Travel & Commute',
        description: '',
        amount: '',
        imageLink: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const amount = parseFloat(formData.amount);
            
            const payload: any = {
                ...EMPTY_INVOICE,
                timestamp: undefined, // Let Supabase set created_at
                filename: 'Internal Expense',
                document_type: 'receipt',
                source_type: 'purchase',
                issuer_details: {
                    ...EMPTY_INVOICE.issuer_details,
                    name: `Expense: ${formData.category} (${formData.employeeName})`
                },
                receiver_details: {
                    ...EMPTY_INVOICE.receiver_details,
                    name: 'Datlion Cnergy Pvt. Ltd.'
                },
                invoice_metadata: {
                    ...EMPTY_INVOICE.invoice_metadata,
                    invoice_number: `EXP-${Date.now().toString().slice(-6)}`,
                    invoice_date: formData.date,
                    employee_name: formData.employeeName,
                    expense_category: formData.category
                },
                items: [
                    {
                        description: formData.description,
                        hsn_sac: '',
                        quantity: 1,
                        unit_price: amount,
                        taxable_value: amount,
                        cgst_rate: 0, cgst_amount: 0,
                        sgst_rate: 0, sgst_amount: 0,
                        igst_rate: 0, igst_amount: 0,
                        total_value: amount
                    }
                ],
                totals: {
                    ...EMPTY_INVOICE.totals,
                    subtotal_taxable: amount,
                    grand_total: amount
                },
                uploaded_by: currentUser?.username || 'system',
                image_link: formData.imageLink || ''
            };
            
            delete payload.timestamp;

            const { error } = await supabase.from('invoices').insert([payload]);
            if (error) throw error;

            setSuccess(true);
            setFormData({
                employeeName: currentUser?.username || '',
                date: new Date().toISOString().split('T')[0],
                category: 'Travel & Commute',
                description: '',
                amount: '',
                imageLink: ''
            });
            setTimeout(() => setSuccess(false), 3000);

        } catch (err: any) {
            alert('Error saving expense: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-8 animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-[#0D0D0D] p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <PlusCircle /> Record Employee Spend
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Internal record keeping for Datlion Cnergy Pvt. Ltd.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Employee Name</label>
                            <input 
                                type="text" required
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none"
                                placeholder="John Doe"
                                value={formData.employeeName}
                                onChange={e => setFormData({...formData, employeeName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                            <input 
                                type="date" required
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                            <select 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Total Amount (₹)</label>
                            <input 
                                type="number" required step="0.01" min="0"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none font-semibold"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                        <textarea 
                            required rows={3}
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none"
                            placeholder="Details of the expense..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Image Link (Optional)</label>
                        <input 
                            type="url"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8EBF45] outline-none"
                            placeholder="https://..."
                            value={formData.imageLink}
                            onChange={e => setFormData({...formData, imageLink: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-black uppercase tracking-widest text-[#0D0D0D] transition-all transform active:scale-95 flex items-center justify-center gap-2
                            ${success ? 'bg-[#8EBF45] hover:bg-[#658C3E]' : 'bg-[#8EBF45] hover:bg-[#658C3E] hover:text-white'}
                        `}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : success ? <CheckCircle /> : <PlusCircle />}
                        {success ? 'Expense Recorded!' : 'Save Record'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ExpenseForm;
