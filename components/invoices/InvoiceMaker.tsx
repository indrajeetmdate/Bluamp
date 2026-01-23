
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { ExtractedInvoice, InvoiceTemplate, EMPTY_INVOICE, InvoiceItem, CompanyProfile, BankDetails } from '../../types';
import { recalculateInvoiceTotals, safeRender, amountToWords } from '../../utils/invoiceUtils';
import { Save, Printer, Plus, Trash2, SettingsIcon, Columns, Wallet, Download, RefreshCw, ChevronUp, ChevronDown, Loader2, LayoutDashboard } from './Icons';
import { ImportIcon } from '../icons/ImportIcon';

interface InvoiceMakerProps {
    currentUser: { username: string } | null;
    companyProfiles?: CompanyProfile[];
    initialData?: ExtractedInvoice | null;
}

// Extend config locally to support new UI flags without breaking shared types immediately
type ExtendedConfig = InvoiceTemplate['config'] & {
    showReceiverSign?: boolean;
};

const InvoiceMaker: React.FC<InvoiceMakerProps> = ({ currentUser, companyProfiles = [], initialData }) => {
    const [docType, setDocType] = useState<'invoice' | 'po' | 'quotation'>('invoice');
    const [customTitle, setCustomTitle] = useState('INVOICE');
    const [doc, setDoc] = useState<ExtractedInvoice>({ ...EMPTY_INVOICE, source_type: 'sales', document_type: 'generated_invoice' });
    
    // Default config with showReceiverSign
    const [config, setConfig] = useState<ExtendedConfig>({ 
        font: 'font-sans', 
        color: '#000000', 
        headerText: '', 
        footerText: 'This is a system generated invoice.', 
        terms: '1. Payment due within 30 days.', 
        logoSize: 64,
        showReceiverSign: true 
    });

    const [logo, setLogo] = useState<string | null>(null);
    const [stamp, setStamp] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Visibility States
    const [showSummarySection, setShowSummarySection] = useState(true);
    
    // Total visibility control for all columns
    const [visibleColumns, setVisibleColumns] = useState({ 
        index: true,
        description: true, 
        hsn: true, 
        quantity: true, 
        rate: true, 
        taxRate: true,
        taxAmt: true,
        total: true
    });
    
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [amountInWordsStr, setAmountInWordsStr] = useState('');
    
    const itemFileInputRef = useRef<HTMLInputElement>(null);
    // Refs to clear file inputs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setDoc(initialData);
            const type = initialData.document_type === 'generated_po' ? 'po' : 'invoice';
            setDocType(type);
            setCustomTitle(type === 'invoice' ? 'INVOICE' : 'PURCHASE ORDER');
        }
        fetchTemplates();
    }, [initialData]);

    useEffect(() => {
        setAmountInWordsStr(amountToWords(doc.totals.grand_total || 0));
    }, [doc.totals.grand_total]);

    const fetchTemplates = async () => { const { data } = await supabase.from('invoice_templates').select('*'); if (data) setTemplates(data); };
    
    const saveTemplate = async () => {
        if (!templateName) return alert("Enter template name");
        const payload: InvoiceTemplate = { 
            name: templateName, 
            type: docType as any, 
            config: { 
                ...config, 
                logoUrl: logo || undefined,
                stampUrl: stamp || undefined,
                signatureUrl: signature || undefined,
                issuer_details: doc.issuer_details
            } 
        };
        const { error } = await supabase.from('invoice_templates').insert([payload]);
        if (!error) { alert("Template saved!"); fetchTemplates(); } else alert("Error saving template");
    };

    const deleteTemplate = async () => {
        if (!selectedTemplateId) return;
        if (!confirm("Are you sure you want to delete this template?")) return;
        
        const { error } = await supabase.from('invoice_templates').delete().eq('id', selectedTemplateId);
        if (error) {
            alert("Error deleting template: " + error.message);
        } else {
            setSelectedTemplateId('');
            fetchTemplates();
        }
    };

    const loadTemplate = (tmpl: InvoiceTemplate) => { 
        // Cast tmpl.config to include potential new properties
        const loadedConfig = tmpl.config as ExtendedConfig;
        setConfig({ 
            ...loadedConfig, 
            logoSize: loadedConfig.logoSize || 64,
            showReceiverSign: loadedConfig.showReceiverSign ?? true 
        }); 
        
        // Handle legacy type mapping or new type
        if ((tmpl.type as any) === 'quotation') {
            setDocType('quotation');
            setCustomTitle('QUOTATION');
        } else {
            setDocType(tmpl.type as 'invoice' | 'po'); 
            setCustomTitle(tmpl.type === 'invoice' ? 'INVOICE' : 'PURCHASE ORDER');
        }

        setLogo(loadedConfig.logoUrl || null);
        setStamp(loadedConfig.stampUrl || null);
        setSignature(loadedConfig.signatureUrl || null);
        if (loadedConfig.issuer_details) {
            setDoc(prev => ({ ...prev, issuer_details: loadedConfig.issuer_details! }));
        }
    };

    const updateParty = (side: 'issuer' | 'receiver', field: string, val: string) => {
        setDoc(prev => ({ ...prev, [side === 'issuer' ? 'issuer_details' : 'receiver_details']: { ...prev[side === 'issuer' ? 'issuer_details' : 'receiver_details'], [field]: val } }));
    };
    
    const updateBankDetails = (field: keyof BankDetails, val: string) => {
        setDoc(prev => {
            const currentBank = prev.issuer_details.bank_details || { account_name: '', account_number: '', bank_name: '', branch: '', ifsc: '' };
            return { ...prev, issuer_details: { ...prev.issuer_details, bank_details: { ...currentBank, [field]: val } } };
        });
    };
    
    const loadCompanyProfile = (side: 'issuer' | 'receiver', companyName: string) => {
        const profile = companyProfiles.find(c => c.name === companyName);
        if (profile) {
            setDoc(prev => ({
                ...prev,
                [side === 'issuer' ? 'issuer_details' : 'receiver_details']: {
                    ...prev[side === 'issuer' ? 'issuer_details' : 'receiver_details'],
                    name: profile.name, gstin: profile.gstNumber, address: profile.shippingAddress, email: profile.email, phone: profile.phoneNumber, contact_person: profile.contactPerson
                }
            }));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...doc.items];
        newItems[index] = { ...newItems[index], [field]: value };
        const item = newItems[index];
        
        if (field === 'quantity' || field === 'unit_price') {
            item.taxable_value = Number(item.quantity) * Number(item.unit_price);
        }

        // Logic for Tax Calculation integration with separate Tax % column
        const rate = Number(item.igst_rate || 0);
        item.igst_amount = item.taxable_value * (rate / 100);
        item.cgst_amount = 0; 
        item.sgst_amount = 0;
        
        item.total_value = item.taxable_value + item.igst_amount;
        
        const newTotals = recalculateInvoiceTotals(newItems);
        setDoc(prev => ({ ...prev, items: newItems, totals: newTotals }));
    };

    const moveItem = (index: number, direction: number) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === doc.items.length - 1)) return;
        const newItems = [...doc.items];
        const targetIndex = index + direction;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setDoc(prev => ({ ...prev, items: newItems }));
    };

    const deleteItem = (index: number) => {
        const newItems = doc.items.filter((_, i) => i !== index);
        setDoc(prev => ({ ...prev, items: newItems, totals: recalculateInvoiceTotals(newItems) }));
    };

    const handleItemImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                if (lines.length < 2) return;

                const newItems: InvoiceItem[] = [];
                lines.slice(1).forEach(line => {
                    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length >= 4) {
                        const quantity = parseFloat(cols[2]) || 0;
                        const unit_price = parseFloat(cols[3]) || 0;
                        const igst_rate = cols[4] ? parseFloat(cols[4]) : 18;
                        const taxable_value = quantity * unit_price;
                        const igst_amount = taxable_value * (igst_rate / 100);

                        newItems.push({
                            description: cols[0],
                            hsn_sac: cols[1],
                            quantity,
                            unit_price,
                            taxable_value,
                            cgst_rate: 0,
                            cgst_amount: 0,
                            sgst_rate: 0,
                            sgst_amount: 0,
                            igst_rate,
                            igst_amount,
                            total_value: taxable_value + igst_amount
                        });
                    }
                });

                if (newItems.length > 0) {
                    setDoc(prev => {
                        const updatedItems = [...prev.items, ...newItems];
                        return {
                            ...prev,
                            items: updatedItems,
                            totals: recalculateInvoiceTotals(updatedItems)
                        };
                    });
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const addItem = () => {
        const newItem: InvoiceItem = { description: 'New Item', hsn_sac: '', quantity: 1, unit_price: 0, taxable_value: 0, cgst_rate: 0, cgst_amount: 0, sgst_rate: 0, sgst_amount: 0, igst_rate: 18, igst_amount: 0, total_value: 0 };
        const newItems = [...doc.items, newItem];
        setDoc(prev => ({ ...prev, items: newItems, totals: recalculateInvoiceTotals(newItems) }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setLogo(reader.result as string); reader.readAsDataURL(file); }
    };

    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setStamp(reader.result as string); reader.readAsDataURL(file); }
    };

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setSignature(reader.result as string); reader.readAsDataURL(file); }
    };

    // Remove handlers
    const removeLogo = () => { setLogo(null); if (logoInputRef.current) logoInputRef.current.value = ''; };
    const removeStamp = () => { setStamp(null); if (stampInputRef.current) stampInputRef.current.value = ''; };
    const removeSignature = () => { setSignature(null); if (signatureInputRef.current) signatureInputRef.current.value = ''; };

    const handleSaveRecord = async () => {
        const invNum = doc.invoice_metadata.invoice_number;
        if (!invNum) return alert("Please provide an invoice number.");

        setIsSaving(true);
        try {
            // Check for duplicates in Supabase Dashboard
            const { data: existing, error: checkError } = await supabase
                .from('invoices')
                .select('id')
                .eq('invoice_metadata->>invoice_number', invNum)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existing) {
                alert(`Duplicate detected: Invoice #${invNum} already exists in the finance dashboard.`);
                setIsSaving(false);
                return;
            }

            // Force invoice number as filename
            const record = { 
                ...doc, 
                filename: invNum,
                document_type: docType === 'invoice' ? 'generated_invoice' : 'generated_po', 
                uploaded_by: currentUser?.username || 'system' 
            };
            
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, timestamp, ...cleanRecord } = record as any;
            const { error: insertError } = await supabase.from('invoices').insert([cleanRecord]);
            if (insertError) throw insertError;
            
            alert("Document saved to Dashboard!");
        } catch (error: any) {
            alert("Error saving record: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const originalTitle = document.title;
        if (doc.invoice_metadata.invoice_number) document.title = doc.invoice_metadata.invoice_number;
        window.print();
        document.title = originalTitle;
    };

    const generateInvoiceNumber = async () => {
        const date = new Date();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        // Indian FY Logic: April to March
        let fyStart, fyEnd;
        if (month >= 4) {
            fyStart = year;
            fyEnd = year + 1;
        } else {
            fyStart = year - 1;
            fyEnd = year;
        }

        const fyStr = `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
        const mm = String(month).padStart(2, '0');
        
        // Determine "Other Party" based on context for code
        const otherPartyName = docType === 'invoice' ? doc.receiver_details.name : doc.issuer_details.name;
        let code = 'XX';
        if (otherPartyName) {
            code = otherPartyName.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
        }

        // Handle Prefix (DC for Invoice/PO, Q for Quotation)
        const prefixBase = docType === 'quotation' ? 'Q' : 'DC';
        const fyPrefix = `${prefixBase}.${code}.${fyStr}.`;

        // Fetch count for THIS financial year to reset numbering
        const { count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .ilike('invoice_metadata->>invoice_number', `${fyPrefix}%`);

        const sequence = String((count || 0) + 1).padStart(3, '0');
        const newNumber = `${fyPrefix}${mm}.${sequence}`;
        
        setDoc(prev => ({
            ...prev,
            invoice_metadata: { ...prev.invoice_metadata, invoice_number: newNumber }
        }));
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100">
            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { visibility: hidden; }
                    #print-area {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm;
                        min-height: 296mm;
                        padding: 8mm;
                        margin: 0;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        box-shadow: none;
                        overflow: visible;
                    }
                    #print-area * { visibility: visible; }
                    .no-print, .no-print * { display: none !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}</style>

            {/* Sidebar Configuration */}
            <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 overflow-y-auto p-4 no-print shadow-xl z-10 h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Document Maker</h2>
                    <div className="flex gap-1">
                        <button onClick={() => { setDocType('invoice'); setCustomTitle('INVOICE'); }} className={`px-2 py-1 text-xs rounded-lg border ${docType==='invoice' ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-slate-600 border-slate-200'}`}>Invoice</button>
                        <button onClick={() => { setDocType('quotation'); setCustomTitle('QUOTATION'); }} className={`px-2 py-1 text-xs rounded-lg border ${docType==='quotation' ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-slate-600 border-slate-200'}`}>Quote</button>
                        <button onClick={() => { setDocType('po'); setCustomTitle('PURCHASE ORDER'); }} className={`px-2 py-1 text-xs rounded-lg border ${docType==='po' ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-slate-600 border-slate-200'}`}>PO</button>
                    </div>
                </div>

                <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-500 uppercase">Load Template</span><SettingsIcon size={14} className="text-slate-400"/></div>
                    
                    <div className="flex gap-2 mb-2">
                        <select 
                            className="flex-1 text-sm p-2 border rounded bg-white outline-none focus:border-[#8EBF45]" 
                            value={selectedTemplateId}
                            onChange={(e) => { 
                                const id = e.target.value;
                                setSelectedTemplateId(id);
                                const t = templates.find(t => t.id === id); 
                                if(t) loadTemplate(t); 
                            }}
                        >
                            <option value="">Select a template...</option>
                            {templates.map((t, i) => <option key={t.id || i} value={t.id}>{safeRender(t.name)}</option>)}
                        </select>
                        <button 
                            onClick={deleteTemplate}
                            disabled={!selectedTemplateId}
                            className={`p-2 rounded border transition-colors ${selectedTemplateId ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 cursor-pointer' : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'}`}
                            title="Delete Template"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>

                    <div className="flex gap-2"><input className="flex-1 text-sm p-2 border rounded" placeholder="New template name" value={templateName} onChange={e => setTemplateName(e.target.value)} /><button onClick={saveTemplate} className="p-2 bg-slate-200 rounded hover:bg-slate-300"><Save size={16}/></button></div>
                </div>
                
                <div className="mb-6 space-y-3 border-b pb-6">
                     <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><SettingsIcon size={14}/> Branding</h3>
                     <div>
                         <label className="text-xs text-slate-500 mb-1 block">Logo</label>
                         <div className="flex gap-2">
                             <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs w-full"/>
                             {logo && <button onClick={removeLogo} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Remove Logo"><Trash2 size={14}/></button>}
                         </div>
                     </div>
                     <div>
                         <label className="text-xs text-slate-500 mb-1 block">Logo Size ({config.logoSize || 64}px)</label>
                         <input type="range" min="32" max="200" value={config.logoSize || 64} onChange={(e) => setConfig({ ...config, logoSize: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                     </div>
                     <div>
                         <label className="text-xs text-slate-500 mb-1 block">Stamp / Seal</label>
                         <div className="flex gap-2">
                             <input ref={stampInputRef} type="file" accept="image/*" onChange={handleStampUpload} className="text-xs w-full"/>
                             {stamp && <button onClick={removeStamp} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Remove Stamp"><Trash2 size={14}/></button>}
                         </div>
                     </div>
                     <div>
                         <label className="text-xs text-slate-500 mb-1 block">Signature (Issuer)</label>
                         <div className="flex gap-2">
                             <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="text-xs w-full"/>
                             {signature && <button onClick={removeSignature} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Remove Signature"><Trash2 size={14}/></button>}
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div><label className="text-xs text-slate-500">Font</label><select className="text-sm p-2 border rounded w-full" value={config.font} onChange={e => setConfig({...config, font: e.target.value as any})}><option value="font-sans">Sans Serif</option><option value="font-serif">Serif</option></select></div>
                         <div><label className="text-xs text-slate-500">Accent</label><input type="color" className="w-full h-9 p-0 border rounded cursor-pointer" value={config.color} onChange={e => setConfig({...config, color: e.target.value})} /></div>
                     </div>
                     <div>
                         <label className="text-xs text-slate-500">Document Title</label>
                         <input className="w-full text-sm p-2 border rounded font-bold uppercase" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                     </div>
                     <div>
                         <label className="text-xs text-slate-500 mb-1 block">Footer Text</label>
                         <textarea 
                             className="w-full text-sm p-2 border rounded" 
                             rows={2}
                             value={config.footerText} 
                             onChange={e => setConfig({...config, footerText: e.target.value})} 
                         />
                     </div>
                </div>

                <div className="mb-6 space-y-3 border-b pb-6">
                     <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><LayoutDashboard size={14}/> Sections</h3>
                     <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={showSummarySection} onChange={e => setShowSummarySection(e.target.checked)} className="rounded border-gray-300 text-[#8EBF45] focus:ring-[#8EBF45]" />
                        Show Totals, Bank & Terms
                     </label>
                     <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" checked={config.showReceiverSign ?? true} onChange={e => setConfig({...config, showReceiverSign: e.target.checked})} className="rounded border-gray-300 text-[#8EBF45] focus:ring-[#8EBF45]" />
                        Show Receiver's Signature
                     </label>
                </div>

                <div className="space-y-6">
                    {/* Issuer */}
                    <div className="bg-slate-50 p-3 rounded border">
                        <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold text-slate-700">From (Issuer)</h3>
                             {companyProfiles.length > 0 && (<select className="text-xs p-1 border rounded max-w-[120px]" onChange={(e) => loadCompanyProfile('issuer', e.target.value)}><option value="">Load Profile</option>{companyProfiles.map(cp => <option key={cp.id} value={cp.name}>{cp.name}</option>)}</select>)}
                        </div>
                        <input className="w-full text-sm p-2 border rounded mb-2" placeholder="Company Name" value={doc.issuer_details.name || ''} onChange={e => updateParty('issuer', 'name', e.target.value)} />
                        <textarea className="w-full text-sm p-2 border rounded" placeholder="Address" rows={2} value={doc.issuer_details.address || ''} onChange={e => updateParty('issuer', 'address', e.target.value)} />
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input className="w-full text-sm p-2 border rounded" placeholder="GSTIN" value={doc.issuer_details.gstin || ''} onChange={e => updateParty('issuer', 'gstin', e.target.value)} />
                            <input className="w-full text-sm p-2 border rounded" placeholder="PAN" value={doc.issuer_details.pan || ''} onChange={e => updateParty('issuer', 'pan', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input className="w-full text-sm p-2 border rounded" placeholder="Email" value={doc.issuer_details.email || ''} onChange={e => updateParty('issuer', 'email', e.target.value)} />
                            <input className="w-full text-sm p-2 border rounded" placeholder="Phone" value={doc.issuer_details.phone || ''} onChange={e => updateParty('issuer', 'phone', e.target.value)} />
                        </div>
                        <div className="mt-4 pt-2 border-t border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Wallet size={12}/> Bank Details</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="w-full text-xs p-2 border rounded" placeholder="Bank Name" value={doc.issuer_details.bank_details?.bank_name || ''} onChange={e => updateBankDetails('bank_name', e.target.value)} />
                                <input className="w-full text-xs p-2 border rounded" placeholder="Account No" value={doc.issuer_details.bank_details?.account_number || ''} onChange={e => updateBankDetails('account_number', e.target.value)} />
                                <input className="w-full text-xs p-2 border rounded" placeholder="IFSC Code" value={doc.issuer_details.bank_details?.ifsc || ''} onChange={e => updateBankDetails('ifsc', e.target.value)} />
                                <input className="w-full text-xs p-2 border rounded" placeholder="Branch" value={doc.issuer_details.bank_details?.branch || ''} onChange={e => updateBankDetails('branch', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Receiver */}
                    <div className="bg-slate-50 p-3 rounded border">
                        <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold text-slate-700">To (Receiver)</h3>
                             {companyProfiles.length > 0 && (<select className="text-xs p-1 border rounded max-w-[120px]" onChange={(e) => loadCompanyProfile('receiver', e.target.value)}><option value="">Load Profile</option>{companyProfiles.map(cp => <option key={cp.id} value={cp.name}>{cp.name}</option>)}</select>)}
                        </div>
                        <input className="w-full text-sm p-2 border rounded mb-2" placeholder="Client Name" value={doc.receiver_details.name || ''} onChange={e => updateParty('receiver', 'name', e.target.value)} />
                        <textarea className="w-full text-sm p-2 border rounded" placeholder="Address" rows={2} value={doc.receiver_details.address || ''} onChange={e => updateParty('receiver', 'address', e.target.value)} />
                         <div className="grid grid-cols-2 gap-2 mt-2">
                            <input className="w-full text-sm p-2 border rounded" placeholder="GSTIN" value={doc.receiver_details.gstin || ''} onChange={e => updateParty('receiver', 'gstin', e.target.value)} />
                            <input className="w-full text-sm p-2 border rounded" placeholder="PAN" value={doc.receiver_details.pan || ''} onChange={e => updateParty('receiver', 'pan', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input className="w-full text-sm p-2 border rounded" placeholder="Email" value={doc.receiver_details.email || ''} onChange={e => updateParty('receiver', 'email', e.target.value)} />
                            <input className="w-full text-sm p-2 border rounded" placeholder="Phone" value={doc.receiver_details.phone || ''} onChange={e => updateParty('receiver', 'phone', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t flex flex-col gap-3 mb-10">
                    <button 
                        onClick={handleSaveRecord} 
                        disabled={isSaving}
                        className={`w-full ${isSaving ? 'bg-slate-400' : 'bg-[#8EBF45] hover:bg-[#658C3E] text-[#0D0D0D] hover:text-white'} py-2 rounded shadow flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                        {isSaving ? "Checking for duplicates..." : "Save Draft"}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex-1 bg-[#0D0D0D] text-white py-2 rounded shadow hover:bg-[#404040] flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide"><Printer size={16}/> Print</button>
                        <button onClick={handlePrint} className="flex-1 bg-[#8EBF45] text-[#0D0D0D] py-2 rounded shadow hover:bg-[#658C3E] hover:text-white flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide"><Download size={16}/> PDF</button>
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="w-full lg:w-2/3 bg-slate-200 overflow-y-auto p-8 h-full">
                <div id="print-area" className={`mx-auto bg-white shadow-2xl min-h-[29.7cm] w-[21cm] p-8 ${config.font} relative flex flex-col`}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 border-b pb-4">
                        <div className="flex items-start gap-4 flex-1">
                            {logo ? <img src={logo} alt="Logo" className="w-auto object-contain" style={{ height: config.logoSize || 64 }} /> : <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-300 text-xs">Logo</div>}
                            <div className="flex-1">
                                <h2 className="font-bold text-xl uppercase tracking-wide text-slate-900 leading-none mb-1">{safeRender(doc.issuer_details.name)}</h2>
                                <p className="text-xs text-slate-500 whitespace-pre-line max-w-sm leading-tight mb-1">{safeRender(doc.issuer_details.address)}</p>
                                <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                    {doc.issuer_details.gstin && <span><strong>GSTIN:</strong> {doc.issuer_details.gstin}</span>}
                                    {doc.issuer_details.pan && <span><strong>PAN:</strong> {doc.issuer_details.pan}</span>}
                                    {doc.issuer_details.email && <span>{doc.issuer_details.email}</span>}
                                    {doc.issuer_details.phone && <span>Ph: {doc.issuer_details.phone}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-light tracking-tight mb-1 uppercase" style={{ color: config.color }}>{customTitle}</h1>
                            <div className="text-sm text-slate-600 space-y-2">
                                <div className="flex items-center justify-end gap-0.5">
                                    <span className="font-semibold text-xs">No:</span>
                                    <div className="relative group">
                                        <input className="text-right border-b border-transparent hover:border-slate-300 focus:border-[#8EBF45] outline-none w-32 bg-transparent text-xs font-mono" value={doc.invoice_metadata.invoice_number} onChange={(e) => setDoc(prev => ({...prev, invoice_metadata: {...prev.invoice_metadata, invoice_number: e.target.value}}))} />
                                        <button onClick={generateInvoiceNumber} className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 p-0.5" title="Auto-Generate FY Number"><RefreshCw size={12} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-0.5">
                                    <span className="font-semibold text-xs">Date:</span> 
                                    <input type="date" className="text-right border-b border-transparent hover:border-slate-300 focus:border-[#8EBF45] outline-none w-24 bg-transparent text-xs" value={doc.invoice_metadata.invoice_date} onChange={(e) => setDoc(prev => ({...prev, invoice_metadata: {...prev.invoice_metadata, invoice_date: e.target.value}}))} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                {docType === 'quotation' ? 'Quotation For' : docType === 'po' ? 'Vendor' : 'Billed To'}
                            </p>
                            <h3 className="font-bold text-sm text-slate-900 leading-tight">{safeRender(doc.receiver_details.name) || 'Client Name'}</h3>
                            <p className="text-xs text-slate-600 whitespace-pre-line mb-1 leading-tight">{safeRender(doc.receiver_details.address)}</p>
                             <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                 {doc.receiver_details.gstin && <span><strong>GSTIN:</strong> {doc.receiver_details.gstin}</span>}
                                 {doc.receiver_details.pan && <span><strong>PAN:</strong> {doc.receiver_details.pan}</span>}
                                 {doc.receiver_details.email && <span>{doc.receiver_details.email}</span>}
                                 {doc.receiver_details.phone && <span>Ph: {doc.receiver_details.phone}</span>}
                             </div>
                         </div>
                    </div>

                    <div className="flex justify-between items-center mb-2 no-print">
                        <div className="flex gap-2">
                            <button onClick={() => setShowColumnMenu(!showColumnMenu)} className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200"><Columns size={12}/> Columns</button>
                            {showColumnMenu && (
                                <div className="absolute top-64 left-16 bg-white shadow-xl border rounded p-3 w-48 z-20 grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.index} onChange={e => setVisibleColumns({...visibleColumns, index: e.target.checked})} /> No #</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.description} onChange={e => setVisibleColumns({...visibleColumns, description: e.target.checked})} /> Desc</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.hsn} onChange={e => setVisibleColumns({...visibleColumns, hsn: e.target.checked})} /> HSN</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.quantity} onChange={e => setVisibleColumns({...visibleColumns, quantity: e.target.checked})} /> Qty</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.rate} onChange={e => setVisibleColumns({...visibleColumns, rate: e.target.checked})} /> Rate</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.taxRate} onChange={e => setVisibleColumns({...visibleColumns, taxRate: e.target.checked})} /> Tax %</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.taxAmt} onChange={e => setVisibleColumns({...visibleColumns, taxAmt: e.target.checked})} /> Tax Amt</label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={visibleColumns.total} onChange={e => setVisibleColumns({...visibleColumns, total: e.target.checked})} /> Total</label>
                                </div>
                            )}
                            <button onClick={() => itemFileInputRef.current?.click()} className="text-xs bg-[#A8BF75]/20 text-[#658C3E] px-3 py-1 rounded-full border border-[#A8BF75]/50 flex items-center gap-1 hover:bg-[#A8BF75]/30"><ImportIcon size={12}/> Import Table</button>
                            <input type="file" ref={itemFileInputRef} className="hidden" accept=".csv" onChange={handleItemImport} />
                        </div>
                        <button onClick={addItem} className="text-xs text-[#658C3E] flex items-center gap-1"><Plus size={12}/> Add Line</button>
                    </div>
                    
                    <div className="flex-1 mb-4">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2" style={{ borderColor: config.color }}>
                                    {visibleColumns.index && <th className="py-1.5 pl-2 w-8 text-slate-500 font-semibold">#</th>}
                                    {visibleColumns.description && <th className="py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Description</th>}
                                    {visibleColumns.hsn && <th className="py-1.5 w-16 text-slate-500 font-semibold">HSN</th>}
                                    {visibleColumns.quantity && <th className="py-1.5 text-right w-12 text-slate-500 font-semibold">Qty</th>}
                                    {visibleColumns.rate && <th className="py-1.5 text-right w-20 text-slate-500 font-semibold">Rate</th>}
                                    {visibleColumns.taxRate && <th className="py-1.5 text-right w-12 text-slate-500 font-semibold">GST%</th>}
                                    {visibleColumns.taxAmt && <th className="py-1.5 text-right w-20 text-slate-500 font-semibold">Tax</th>}
                                    {visibleColumns.total && <th className="py-1.5 text-right w-24 text-slate-900 font-bold pr-2">Total</th>}
                                    <th className="py-1.5 w-20 no-print"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(doc.items || []).map((item, idx) => (
                                    <tr key={idx} className="group">
                                        {visibleColumns.index && <td className="py-2 pl-2 text-slate-400">{idx + 1}</td>}
                                        {visibleColumns.description && <td className="py-2"><input className="w-full bg-transparent outline-none font-medium text-slate-800" value={safeRender(item.description)} onChange={e => updateItem(idx, 'description', e.target.value)} /></td>}
                                        {visibleColumns.hsn && <td className="py-2"><input className="w-full bg-transparent outline-none text-slate-500" value={safeRender(item.hsn_sac)} onChange={e => updateItem(idx, 'hsn_sac', e.target.value)} /></td>}
                                        {visibleColumns.quantity && <td className="py-2 text-right"><input className="w-full bg-transparent outline-none text-right" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></td>}
                                        {visibleColumns.rate && <td className="py-2 text-right"><input className="w-full bg-transparent outline-none text-right" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} /></td>}
                                        {visibleColumns.taxRate && <td className="py-2 text-right"><input className="w-full bg-transparent outline-none text-right font-bold text-slate-900" value={item.igst_rate} onChange={e => updateItem(idx, 'igst_rate', e.target.value)} /></td>}
                                        {visibleColumns.taxAmt && <td className="py-2 text-right text-slate-500">{((item.igst_amount||0) + (item.cgst_amount||0) + (item.sgst_amount||0)).toFixed(2)}</td>}
                                        {visibleColumns.total && <td className="py-2 text-right font-medium pr-2">{(item.total_value||0).toFixed(2)}</td>}
                                        <td className="py-2 text-center no-print w-20">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveItem(idx, -1)} disabled={idx===0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ChevronUp size={14}/></button>
                                                <button onClick={() => moveItem(idx, 1)} disabled={idx===doc.items.length-1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ChevronDown size={14}/></button>
                                                <button onClick={() => deleteItem(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showSummarySection && (
                    <div className="flex flex-col border-t pt-2 mt-2">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Amount in Words</p>
                                 <textarea className="w-full text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 outline-none resize-none overflow-hidden p-0" rows={2} value={amountInWordsStr} onChange={(e) => setAmountInWordsStr(e.target.value)} />
                            </div>
                            <div className="w-48">
                                <div className="flex justify-between text-xs text-slate-600 mb-0.5"><span>Subtotal</span><span>{(doc.totals.subtotal_taxable||0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs text-slate-600 mb-0.5"><span>Tax</span><span>{((doc.totals.cgst_total||0) + (doc.totals.sgst_total||0) + (doc.totals.igst_total||0)).toFixed(2)}</span></div>
                                <div className="flex justify-between text-base font-bold border-t border-slate-300 pt-1 mt-1" style={{ color: config.color }}><span>Total</span><span>₹ {(doc.totals.grand_total||0).toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div className="flex gap-8 mt-4 pt-2 border-t border-slate-100">
                             {doc.issuer_details.bank_details?.account_number && (
                                 <div className="flex-1">
                                     <h4 className="font-bold text-[10px] text-slate-500 uppercase mb-1">Bank Details</h4>
                                     <div className="text-[10px] text-slate-600 grid grid-cols-[auto_1fr] gap-x-2">
                                         <span>Bank:</span><span className="font-medium">{doc.issuer_details.bank_details.bank_name}</span>
                                         <span>A/c:</span><span className="font-medium">{doc.issuer_details.bank_details.account_number}</span>
                                         <span>IFSC:</span><span className="font-medium">{doc.issuer_details.bank_details.ifsc}</span>
                                     </div>
                                 </div>
                             )}
                             <div className="flex-1">
                                <h4 className="font-bold text-[10px] text-slate-500 uppercase mb-1">Terms</h4>
                                <textarea className="w-full text-[10px] text-slate-600 whitespace-pre-line bg-transparent border-none focus:ring-0 outline-none resize-none overflow-hidden p-0" rows={3} value={config.terms} onChange={(e) => setConfig({...config, terms: e.target.value})} />
                             </div>
                        </div>
                    </div>
                    )}
                    
                    <div className="flex justify-between items-end mt-6 pt-4 break-inside-avoid relative">
                        {(config.showReceiverSign ?? true) && (
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-600 mb-6">&nbsp;</p> 
                                <div className="h-px bg-slate-400 w-32 mb-1 mx-auto"></div>
                                <p className="text-[10px] font-bold text-slate-600">Receiver's Signature</p>
                            </div>
                        )}
                        {stamp && (
                            <div className="absolute left-1/2 bottom-2 -translate-x-1/2 pointer-events-none">
                                <img src={stamp} alt="Stamp" className="h-20 w-20 object-contain opacity-80" style={{ transform: 'rotate(-10deg)', mixBlendMode: 'multiply' }} />
                            </div>
                        )}
                        <div className="text-center relative ml-auto">
                            <p className="text-xs font-bold text-slate-800 mb-2">For {safeRender(doc.issuer_details.name)}</p>
                            {signature ? (
                                <img src={signature} alt="Signature" className="h-12 w-auto mx-auto mb-1 object-contain" />
                            ) : (
                                <div className="h-12"></div>
                            )}
                            <div className="h-px bg-slate-400 w-32 mb-1 mx-auto"></div>
                            <p className="text-[10px] font-bold text-slate-600">Issuer's Signature</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 text-center text-[10px] text-slate-400">{safeRender(config.footerText)}</div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceMaker;
