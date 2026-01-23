
import React from 'react';
import { ExtractedInvoice, InvoiceItem } from '../../types';
import { validateGSTIN, recalculateInvoiceTotals } from '../../utils/invoiceUtils';
import { Plus, Trash2, AlertTriangle, CheckCircle, FileText } from './Icons';

interface InvoiceFormProps {
  data: ExtractedInvoice;
  onChange: (data: ExtractedInvoice) => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  // Removed local state to prevent sync conflicts. Now directly modifies parent state via onChange.

  const updateField = (section: keyof ExtractedInvoice, field: string, value: any) => {
    const updated = {
      ...data,
      [section]: {
        ...(data[section] as any),
        [field]: value
      }
    };
    
    if (field === 'source_type') {
         const currentMetadata = updated.invoice_metadata;
         if (value === 'sales') {
             updated.invoice_metadata = { ...currentMetadata, input_tax_credit: 'not_applicable' };
         } else if (value === 'purchase' && currentMetadata.input_tax_credit === 'not_applicable') {
             updated.invoice_metadata = { ...currentMetadata, input_tax_credit: 'set_off' };
         }
    }

    onChange(updated);
  };

  const updateMetadata = (field: string, value: string) => {
      updateField('invoice_metadata', field, value);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate Taxable Value
    if (field === 'quantity' || field === 'unit_price') {
       newItems[index].taxable_value = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    
    // Auto-calculate Taxes based on Taxable Value
    if (field === 'cgst_rate' || field === 'quantity' || field === 'unit_price') {
        newItems[index].cgst_amount = (newItems[index].taxable_value * Number(newItems[index].cgst_rate || 0)) / 100;
    }
    if (field === 'sgst_rate' || field === 'quantity' || field === 'unit_price') {
        newItems[index].sgst_amount = (newItems[index].taxable_value * Number(newItems[index].sgst_rate || 0)) / 100;
    }
    if (field === 'igst_rate' || field === 'quantity' || field === 'unit_price') {
        newItems[index].igst_amount = (newItems[index].taxable_value * Number(newItems[index].igst_rate || 0)) / 100;
    }

    // Auto-calculate Total
    newItems[index].total_value = 
        (newItems[index].taxable_value || 0) + 
        (newItems[index].cgst_amount || 0) + 
        (newItems[index].sgst_amount || 0) + 
        (newItems[index].igst_amount || 0);

    const updated = { ...data, items: newItems };
    
    const newTotals = recalculateInvoiceTotals(newItems);
    updated.totals = { ...updated.totals, ...newTotals, grand_total: newTotals.grand_total + (updated.totals.round_off || 0) };

    onChange(updated);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      description: 'New Item',
      item_type: '',
      make_model: '',
      hsn_sac: '',
      quantity: 1,
      unit_price: 0,
      taxable_value: 0,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      total_value: 0
    };
    const updated = { ...data, items: [...data.items, newItem] };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    const updated = { ...data, items: newItems };
    const newTotals = recalculateInvoiceTotals(newItems);
    updated.totals = { ...updated.totals, ...newTotals, grand_total: newTotals.grand_total + (updated.totals.round_off || 0) };
    onChange(updated);
  };

  return (
    <div className="space-y-8 pb-5">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
           <FileText className="w-5 h-5 text-blue-600"/> Invoice Metadata
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Invoice Number" value={data.invoice_metadata?.invoice_number} onChange={(v) => updateMetadata('invoice_number', v)} />
          <InputField label="Date" type="date" value={data.invoice_metadata?.invoice_date} onChange={(v) => updateMetadata('invoice_date', v)} />
          <InputField label="Due Date" type="date" value={data.invoice_metadata?.due_date} onChange={(v) => updateMetadata('due_date', v)} />
          
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500 mb-1">Type</label>
            <select 
                className="p-2 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={data.source_type}
                onChange={(e) => updateField('source_type', 'value_not_used', e.target.value)}
            >
                <option value="purchase">Purchase</option>
                <option value="sales">Sales</option>
            </select>
          </div>

          {data.source_type === 'purchase' && (
             <div className="flex flex-col md:col-start-4">
                <label className="text-xs font-medium text-slate-500 mb-1">Input Tax Credit (ITC)</label>
                <select 
                    className="p-2 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={data.invoice_metadata?.input_tax_credit || 'set_off'}
                    onChange={(e) => updateMetadata('input_tax_credit', e.target.value)}
                >
                    <option value="set_off">Set Off (Eligible)</option>
                    <option value="non_set_off">Non Set Off (Ineligible)</option>
                </select>
            </div>
          )}

        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PartyForm 
            title="Issuer (Supplier)" 
            data={data.issuer_details || {}} 
            onChange={(field, val) => updateField('issuer_details', field, val)} 
        />
        <PartyForm 
            title="Receiver (Buyer)" 
            data={data.receiver_details || {}} 
            onChange={(field, val) => updateField('receiver_details', field, val)} 
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">Line Items</h3>
            <button onClick={addItem} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1">
                <Plus size={16}/> Add Item
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-slate-700 font-medium border-b">
                    <tr>
                        <th className="p-3 w-8">#</th>
                        <th className="p-3 min-w-[180px]">Description</th>
                        <th className="p-3 w-24">HSN/SAC</th>
                        <th className="p-3 w-20 text-right">Qty</th>
                        <th className="p-3 w-24 text-right">Price</th>
                        <th className="p-3 w-24 text-right">Taxable</th>
                        <th className="p-3 w-16 text-right">GST%</th>
                        <th className="p-3 w-24 text-right">Tax Amt</th>
                        <th className="p-3 w-28 text-right">Total</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(data.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 text-xs text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                                <input 
                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none placeholder-slate-300" 
                                    value={item.description || ''} 
                                    onChange={(e) => updateItem(idx, 'description', e.target.value)} 
                                    placeholder="Item description"
                                />
                            </td>
                            <td className="p-3">
                                <input 
                                    className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none placeholder-slate-300" 
                                    value={item.hsn_sac || ''} 
                                    onChange={(e) => updateItem(idx, 'hsn_sac', e.target.value)} 
                                    placeholder="HSN"
                                />
                            </td>
                            <td className="p-3 text-right">
                                <input 
                                    type="number" 
                                    className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-500 outline-none" 
                                    value={item.quantity || 0} 
                                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))} 
                                />
                            </td>
                            <td className="p-3 text-right">
                                <input 
                                    type="number" 
                                    className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-500 outline-none" 
                                    value={item.unit_price || 0} 
                                    onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value))} 
                                />
                            </td>
                            <td className="p-3 text-right font-medium text-slate-800">
                                {(item.taxable_value || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                                <input 
                                    type="number" 
                                    className="w-full text-right bg-transparent border-b border-transparent focus:border-blue-500 outline-none" 
                                    placeholder="Rate"
                                    value={(item.igst_rate > 0 ? item.igst_rate : ((item.cgst_rate||0) + (item.sgst_rate||0))) || 0} 
                                    onChange={(e) => {
                                        const rate = parseFloat(e.target.value);
                                        updateItem(idx, 'cgst_rate', rate / 2);
                                        updateItem(idx, 'sgst_rate', rate / 2);
                                        updateItem(idx, 'igst_rate', 0); // Defaulting to Intra-state for quick edit
                                    }} 
                                />
                            </td>
                             <td className="p-3 text-right text-xs text-slate-500">
                                {((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0)).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                                {(item.total_value || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
             <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <CheckCircle size={16} /> Validation Status
             </h3>
             <div className="space-y-2 text-sm">
                <ValidationRow 
                    label="Issuer GSTIN" 
                    isValid={validateGSTIN(data.issuer_details?.gstin)} 
                    value={data.issuer_details?.gstin || ''}
                />
                 <ValidationRow 
                    label="Receiver GSTIN" 
                    isValid={validateGSTIN(data.receiver_details?.gstin)} 
                    value={data.receiver_details?.gstin || ''}
                />
                 <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Confidence Score</span>
                    <span className={`font-medium ${(data.ocr_confidence_score || 0) > 0.8 ? 'text-green-600' : 'text-amber-600'}`}>
                        {((data.ocr_confidence_score || 0) * 100).toFixed(0)}%
                    </span>
                </div>
             </div>
        </div>

        <div className="bg-slate-800 text-white p-6 rounded-lg shadow-md">
             <div className="space-y-3">
                <SummaryRow label="Taxable Amount" value={data.totals?.subtotal_taxable} />
                <SummaryRow label="CGST" value={data.totals?.cgst_total} />
                <SummaryRow label="SGST" value={data.totals?.sgst_total} />
                <SummaryRow label="IGST" value={data.totals?.igst_total} />
                <div className="border-t border-slate-600 my-2 pt-2 flex justify-between items-center text-lg font-bold text-green-400">
                    <span>Grand Total</span>
                    <span>₹ {(data.totals?.grand_total || 0).toFixed(2)}</span>
                </div>
             </div>
        </div>
      </div>

    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: { label: string, value: string | number | undefined, onChange: (val: string) => void, type?: string }) => (
  <div className="flex flex-col">
    <label className="text-xs font-medium text-slate-500 mb-1">{label}</label>
    <input 
        type={type}
        className="p-2 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none w-full"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const PartyForm = ({ title, data, onChange }: { title: string, data: any, onChange: (f: string, v: string) => void }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
     <h4 className="text-md font-semibold text-slate-700 mb-4 pb-2 border-b">{title}</h4>
     <div className="space-y-3">
        <InputField label="Name/Legal Entity" value={data?.name} onChange={(v) => onChange('name', v)} />
        <InputField label="GSTIN" value={data?.gstin} onChange={(v) => onChange('gstin', v)} />
        <InputField label="Address" value={data?.address} onChange={(v) => onChange('address', v)} />
        <div className="grid grid-cols-2 gap-3">
             <InputField label="State" value={data?.state} onChange={(v) => onChange('state', v)} />
             <InputField label="State Code" value={data?.state_code} onChange={(v) => onChange('state_code', v)} />
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Contact Info</p>
            <div className="grid grid-cols-2 gap-3">
                <InputField label="Email" value={data?.email} onChange={(v) => onChange('email', v)} />
                <InputField label="Phone" value={data?.phone} onChange={(v) => onChange('phone', v)} />
            </div>
            <div className="mt-3">
                <InputField label="Contact Person" value={data?.contact_person} onChange={(v) => onChange('contact_person', v)} />
            </div>
        </div>
     </div>
  </div>
);

const ValidationRow = ({ label, isValid, value }: { label: string, isValid: boolean, value: string }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-slate-600">{label}</span>
        {value ? (
             <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isValid ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                {isValid ? 'Valid' : 'Invalid'}
            </span>
        ) : (
             <span className="text-xs text-slate-400 italic">Not detected</span>
        )}
       
    </div>
);

const SummaryRow = ({ label, value }: { label: string, value: number | undefined }) => (
    <div className="flex justify-between items-center text-sm text-slate-300">
        <span>{label}</span>
        <span>{(value || 0).toFixed(2)}</span>
    </div>
);

export default InvoiceForm;
