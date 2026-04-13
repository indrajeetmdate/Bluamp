
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { ExtractedInvoice, InvoiceItem, InvoiceTemplate } from '../../types';
import { getTaxMode, safeRender, amountToWords, getCurrencySymbol } from '../../utils/invoiceUtils';
import { Printer, Download, X } from './Icons';
import { QRCodeSVG } from 'qrcode.react';

interface InvoicePrintViewProps {
    invoice: ExtractedInvoice;
    onClose: () => void;
}

const ITEMS_PER_PAGE = 10;

const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice, onClose }) => {
    const [logo, setLogo] = useState<string | null>(null);
    const [stamp, setStamp] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [config, setConfig] = useState({
        font: 'font-sans',
        color: '#000000',
        footerText: 'This is a system generated invoice.',
        terms: '1. Payment due within 30 days.',
        logoSize: 64,
        showReceiverSign: true,
        showQRCode: true,
        showTotalsTable: true,
        showTaxTable: true,
        billedToLabel: 'Billed To',
        shippedToLabel: 'Shipped To',
        visibleColumns: {
            index: true,
            description: true,
            hsn: true,
            quantity: true,
            rate: true,
            discount: true,
            taxableValue: true,
            total: true
        }
    });
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // First try to load from invoice metadata ui_config
        if (invoice.invoice_metadata?.ui_config) {
            const ui = invoice.invoice_metadata.ui_config as any;
            setLogo(ui.logoUrl || null);
            setStamp(ui.stampUrl || null);
            setSignature(ui.signatureUrl || null);
            setConfig(prev => ({
                ...prev,
                ...ui,
                logoSize: ui.logoSize || 64,
                showReceiverSign: ui.showReceiverSign ?? true,
                showQRCode: ui.showQRCode ?? true,
                showTotalsTable: ui.showTotalsTable ?? true,
                showTaxTable: ui.showTaxTable ?? true,
                billedToLabel: ui.billedToLabel || prev.billedToLabel,
                shippedToLabel: ui.shippedToLabel || prev.shippedToLabel,
                visibleColumns: ui.visibleColumns || prev.visibleColumns
            }));
        } else {
            // Load template for branding fallback
            const loadTemplate = async () => {
                const { data } = await supabase.from('invoice_templates').select('*').limit(1);
                if (data && data.length > 0) {
                    const tmpl = data[0] as InvoiceTemplate;
                    const c = tmpl.config as any;
                    setLogo(c.logoUrl || null);
                    setStamp(c.stampUrl || null);
                    setSignature(c.signatureUrl || null);
                    setConfig(prev => ({
                        ...prev,
                        font: c.font || prev.font,
                        color: c.color || prev.color,
                        footerText: c.footerText || prev.footerText,
                        terms: c.terms || prev.terms,
                        logoSize: c.logoSize || prev.logoSize,
                        showReceiverSign: c.showReceiverSign ?? true,
                        showQRCode: c.showQRCode ?? true,
                        showTotalsTable: c.showTotalsTable ?? true,
                        showTaxTable: c.showTaxTable ?? true
                    }));
                }
            };
            loadTemplate();
        }
    }, [invoice]);

    const doc = invoice;
    const docType = doc.document_type || 'invoice';
    const customTitle = docType === 'generated_po' ? 'PURCHASE ORDER' : docType === 'quotation' ? 'QUOTATION' : 'INVOICE';
    const amountInWordsStr = amountToWords(doc.totals?.grand_total || 0, doc.totals?.currency);
    const taxMode = getTaxMode(doc.issuer_details?.gstin, doc.receiver_details?.gstin, doc.invoice_metadata?.tax_mode);
    const currencySymbol = getCurrencySymbol(doc.totals?.currency);

    const formatPrintDate = (dateStr: string) => {
        if (!dateStr) return '';
        try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return dateStr; }
    };

    // Paginate items
    const items = doc.items || [];
    const paginatedPages: InvoiceItem[][] = [];
    if (items.length === 0) {
        paginatedPages.push([]);
    } else {
        for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
            paginatedPages.push(items.slice(i, i + ITEMS_PER_PAGE));
        }
    }



    const actualShippedTo = doc.shipped_to_details || (doc.invoice_metadata as any)?.shipped_to_details;

    const handlePrint = () => {
        window.print();
    };

    const overlayContent = (
        <div id="invoice-print-overlay" className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col h-full">
            <style>{`
                @media print {
                    body > *:not(#invoice-print-overlay) { display: none !important; }
                    #invoice-print-overlay { position: static !important; height: auto !important; width: 100% !important; display: block !important; background: transparent !important; }
                    #invoice-print-overlay > .print-toolbar { display: none !important; }
                    #invoice-print-overlay > .print-scroll-area { overflow: visible !important; background: white !important; padding: 0 !important; }
                    @page { size: A4; margin: 0; }
                    .invoice-print-page {
                        page-break-after: always;
                        width: 210mm;
                        min-height: 297mm;
                        max-height: 297mm;
                        padding: 8mm;
                        box-sizing: border-box;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .invoice-print-page:last-child { page-break-after: auto; }
                }
            `}</style>
                {/* Toolbar */}
                <div className="print-toolbar bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Invoice Preview</h3>
                        <p className="text-xs text-slate-500">{safeRender(doc.invoice_metadata?.invoice_number)} — {safeRender(doc.issuer_details?.name)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handlePrint} className="bg-[#0D0D0D] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#404040] transition-colors">
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable preview */}
                <div className="print-scroll-area flex-1 overflow-y-auto bg-slate-200 p-8" ref={printRef}>
                    <div className={`mx-auto ${config.font}`}>
                        {paginatedPages.map((pageItems, pageIdx) => (
                            <div className="invoice-print-page bg-white shadow-xl mx-auto mb-8 w-[210mm] min-h-[297mm] p-8 flex flex-col relative" key={pageIdx}>
                                {/* HEADER */}
                                <div className="flex justify-between items-start mb-3 border-b pb-3">
                                    <div className="flex items-start gap-4 flex-1">
                                        {logo ? <img src={logo} alt="Logo" className="w-auto object-contain" style={{ height: config.logoSize || 64 }} /> : <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-300 text-xs">Logo</div>}
                                        <div className="flex-1">
                                            <h2 className="font-bold text-xl uppercase tracking-wide text-slate-900 leading-none mb-1">{safeRender(doc.issuer_details?.name)}</h2>
                                            <p className="text-xs text-slate-500 whitespace-pre-line max-w-sm leading-tight mb-1">{safeRender(doc.issuer_details?.address)}</p>
                                            <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                                {doc.issuer_details?.gstin && <span><strong>GSTIN:</strong> {doc.issuer_details.gstin}</span>}
                                                {doc.issuer_details?.pan && <span><strong>PAN:</strong> {doc.issuer_details.pan}</span>}
                                                {doc.issuer_details?.email && <span>{doc.issuer_details.email}</span>}
                                                {doc.issuer_details?.phone && <span>Ph: {doc.issuer_details.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-3xl font-light tracking-tight mb-1 uppercase" style={{ color: config.color }}>{customTitle}</h1>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div className="flex items-center justify-end gap-1"><span className="font-semibold">No:</span> <span className="font-mono">{doc.invoice_metadata?.invoice_number}</span></div>
                                            <div className="flex items-center justify-end gap-1"><span className="font-semibold">Date:</span> <span>{formatPrintDate(doc.invoice_metadata?.invoice_date || '')}</span></div>
                                            {paginatedPages.length > 1 && <div className="text-xs text-slate-400">Page {pageIdx + 1} of {paginatedPages.length}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* RECEIVER (Billed + Shipped) */}
                                <div className="mb-3 flex gap-6">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{config.billedToLabel || (docType === 'quotation' ? 'Quotation For' : docType === 'generated_po' ? 'Vendor' : 'Billed To')}</p>
                                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{safeRender(doc.receiver_details?.name) || 'Client Name'}</h3>
                                        <p className="text-xs text-slate-600 whitespace-pre-line mb-1 leading-tight">{safeRender(doc.receiver_details?.address)}</p>
                                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                            {doc.receiver_details?.gstin && <span><strong>GSTIN:</strong> {doc.receiver_details.gstin}</span>}
                                            {doc.receiver_details?.pan && <span><strong>PAN:</strong> {doc.receiver_details.pan}</span>}
                                            {doc.receiver_details?.email && <span>{doc.receiver_details.email}</span>}
                                            {doc.receiver_details?.phone && <span>Ph: {doc.receiver_details.phone}</span>}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{config.shippedToLabel || 'Shipped To'}</p>
                                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{safeRender(actualShippedTo?.name) || safeRender(doc.receiver_details?.name) || 'Client Name'}</h3>
                                        <p className="text-xs text-slate-600 whitespace-pre-line mb-1 leading-tight">{safeRender(actualShippedTo?.address) || safeRender(doc.receiver_details?.address)}</p>
                                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                                            {(actualShippedTo?.gstin || doc.receiver_details?.gstin) && <span><strong>GSTIN:</strong> {actualShippedTo?.gstin || doc.receiver_details?.gstin}</span>}
                                            {(actualShippedTo?.phone || doc.receiver_details?.phone) && <span>Ph: {actualShippedTo?.phone || doc.receiver_details?.phone}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS TABLE */}
                                <div className="mb-3">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b-2" style={{ borderColor: config.color }}>
                                                {config.visibleColumns.index && <th className="py-1.5 pl-2 w-8 text-slate-500 font-semibold">#</th>}
                                                {config.visibleColumns.description && <th className="py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Description</th>}
                                                {config.visibleColumns.hsn && <th className="py-1.5 text-left w-20 text-slate-500 font-semibold">HSN/SAC</th>}
                                                {config.visibleColumns.quantity && <th className="py-1.5 text-right w-14 text-slate-500 font-semibold">Qty</th>}
                                                {config.visibleColumns.rate && <th className="py-1.5 text-right w-24 text-slate-500 font-semibold">Rate ({currencySymbol})</th>}
                                                {config.visibleColumns.discount && <th className="py-1.5 text-right w-24 text-slate-500 font-semibold">Discount ({currencySymbol})</th>}
                                                {config.visibleColumns.taxableValue && <th className="py-1.5 text-right w-24 text-slate-500 font-semibold">Taxable</th>}
                                                {config.visibleColumns.total && <th className="py-1.5 text-right w-28 text-slate-900 font-bold pr-2">Total ({currencySymbol})</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pageItems.map((item, idx) => {
                                                const globalIdx = pageIdx * ITEMS_PER_PAGE + idx;
                                                return (
                                                    <tr key={globalIdx}>
                                                        {config.visibleColumns.index && <td className="py-1.5 pl-2 text-slate-400">{globalIdx + 1}</td>}
                                                        {config.visibleColumns.description && <td className="py-1.5 font-medium text-slate-800">{safeRender(item.description)}</td>}
                                                        {config.visibleColumns.hsn && <td className="py-1.5 text-slate-600 text-xs">{item.hsn_sac || '—'}</td>}
                                                        {config.visibleColumns.quantity && <td className="py-1.5 text-right">{item.quantity}</td>}
                                                        {config.visibleColumns.rate && <td className="py-1.5 text-right">{item.unit_price}</td>}
                                                        {config.visibleColumns.discount && <td className="py-1.5 text-right">{item.discount || 0}</td>}
                                                        {config.visibleColumns.taxableValue && <td className="py-1.5 text-right text-slate-600">{(item.taxable_value || 0).toFixed(2)}</td>}
                                                        {config.visibleColumns.total && <td className="py-1.5 text-right font-semibold pr-2">{(item.total_value || 0).toFixed(2)}</td>}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* TAX BREAKDOWN (Grouped) */}
                                {(config.showTaxTable ?? true) && items.length > 0 && (() => {
                                    const taxGrps: { [k: string]: { hsn: string; taxableValue: number; rate: number; cgst: number; sgst: number; igst: number; totalTax: number } } = {};
                                    items.forEach(item => {
                                        const rate = Number(item.igst_rate || 0);
                                        const key = `${rate}-${item.hsn_sac || ''}`;
                                        if (!taxGrps[key]) taxGrps[key] = { hsn: item.hsn_sac || '-', taxableValue: 0, rate, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
                                        taxGrps[key].taxableValue += item.taxable_value || 0;
                                        taxGrps[key].cgst += item.cgst_amount || 0;
                                        taxGrps[key].sgst += item.sgst_amount || 0;
                                        taxGrps[key].igst += item.igst_amount || 0;
                                        taxGrps[key].totalTax += (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
                                    });
                                    const grps = Object.values(taxGrps);
                                    return (
                                        <div className="mb-3">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tax Breakdown {taxMode === 'intra' ? '(CGST + SGST)' : '(IGST)'}</p>
                                            <table className="w-full text-xs border-collapse border border-slate-200">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="py-1 px-2 text-left text-slate-500 font-semibold">HSN/SAC</th>
                                                        <th className="py-1 px-2 text-right text-slate-500 font-semibold">Taxable</th>
                                                        <th className="py-1 px-2 text-center text-slate-500 font-semibold">Rate%</th>
                                                        {taxMode === 'intra' ? (<><th className="py-1 px-2 text-right text-slate-500 font-semibold">CGST</th><th className="py-1 px-2 text-right text-slate-500 font-semibold">SGST</th></>) : (<th className="py-1 px-2 text-right text-slate-500 font-semibold">IGST</th>)}
                                                        <th className="py-1 px-2 text-right text-slate-500 font-bold">Tax</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {grps.map((g, i) => (
                                                        <tr key={i}>
                                                            <td className="py-1 px-2 text-slate-600">{g.hsn}</td>
                                                            <td className="py-1 px-2 text-right">{g.taxableValue.toFixed(2)}</td>
                                                            <td className="py-1 px-2 text-center">{g.rate}%</td>
                                                            {taxMode === 'intra' ? (<><td className="py-1 px-2 text-right">{g.cgst.toFixed(2)}</td><td className="py-1 px-2 text-right">{g.sgst.toFixed(2)}</td></>) : (<td className="py-1 px-2 text-right">{g.igst.toFixed(2)}</td>)}
                                                            <td className="py-1 px-2 text-right font-semibold">{g.totalTax.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t border-slate-300 font-bold text-xs">
                                                        <td className="py-1 px-2">Total</td>
                                                        <td className="py-1 px-2 text-right">{(doc.totals?.subtotal_taxable || 0).toFixed(2)}</td>
                                                        <td className="py-1 px-2"></td>
                                                        {taxMode === 'intra' ? (<><td className="py-1 px-2 text-right">{(doc.totals?.cgst_total || 0).toFixed(2)}</td><td className="py-1 px-2 text-right">{(doc.totals?.sgst_total || 0).toFixed(2)}</td></>) : (<td className="py-1 px-2 text-right">{(doc.totals?.igst_total || 0).toFixed(2)}</td>)}
                                                        <td className="py-1 px-2 text-right" style={{ color: config.color }}>{((doc.totals?.cgst_total || 0) + (doc.totals?.sgst_total || 0) + (doc.totals?.igst_total || 0)).toFixed(2)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    );
                                })()}

                                {/* SUMMARY */}
                                <div className="flex flex-col border-t pt-1 mt-1">
                                    {(config.showTotalsTable ?? true) && (
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Amount in Words</p>
                                                <p className="text-[10px] font-bold text-slate-700">{amountInWordsStr}</p>
                                            </div>
                                            <div className="w-44">
                                                <div className="flex justify-between text-[10px] text-slate-600 mb-0.5"><span>Subtotal</span><span>{(doc.totals?.subtotal_taxable || 0).toFixed(2)}</span></div>
                                                <div className="flex justify-between text-[10px] text-slate-600 mb-0.5"><span>Tax</span><span>{((doc.totals?.cgst_total || 0) + (doc.totals?.sgst_total || 0) + (doc.totals?.igst_total || 0)).toFixed(2)}</span></div>
                                                <div className="flex justify-between text-sm font-bold border-t border-slate-300 pt-1 mt-1" style={{ color: config.color }}><span>Total</span><span>{currencySymbol} {(doc.totals?.grand_total || 0).toFixed(2)}</span></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-6 mt-2 pt-1 border-t border-slate-100">
                                        {(doc.issuer_details?.bank_details?.account_number || doc.issuer_details?.bank_details?.upi_id) && (
                                            <div className="flex-[2] flex gap-3">
                                                {(config.showQRCode ?? true) && doc.issuer_details?.bank_details?.upi_id && (
                                                    <div className="flex-shrink-0 bg-white p-1 border rounded shadow-sm self-start">
                                                        <QRCodeSVG 
                                                            value={`upi://pay?pa=${doc.issuer_details.bank_details.upi_id}&pn=${encodeURIComponent(doc.issuer_details.name || '')}&am=${doc.totals?.grand_total || 0}&cu=${doc.totals?.currency || 'INR'}`}
                                                            size={55}
                                                            level="M"
                                                        />
                                                        <p className="text-[7px] text-center font-bold text-slate-400 mt-0.5 uppercase">Scan to Pay</p>
                                                    </div>
                                                )}
                                                {doc.issuer_details?.bank_details?.account_number && (
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-[9px] text-slate-500 uppercase mb-0.5">Bank Details</h4>
                                                        <div className="text-[9px] text-slate-600 grid grid-cols-[auto_1fr] gap-x-2">
                                                            <span>Bank:</span><span className="font-medium">{doc.issuer_details.bank_details.bank_name}</span>
                                                            {doc.issuer_details.bank_details.account_name && <><span>Name:</span><span className="font-medium">{doc.issuer_details.bank_details.account_name}</span></>}
                                                            <span>A/c:</span><span className="font-medium">{doc.issuer_details.bank_details.account_number}</span>
                                                            <span>IFSC:</span><span className="font-medium">{doc.issuer_details.bank_details.ifsc}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-bold text-[9px] text-slate-500 uppercase mb-0.5">Terms</h4>
                                            <p className="text-[9px] text-slate-600 whitespace-pre-line">{config.terms}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* SIGNATURES */}
                                <div className="flex justify-between items-end mt-auto pt-3 break-inside-avoid relative">
                                    {config.showReceiverSign && (
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-600 mb-6">&nbsp;</p>
                                            <div className="h-px bg-slate-400 w-32 mb-1 mx-auto"></div>
                                            <p className="text-[9px] font-bold text-slate-600">Receiver's Signature</p>
                                        </div>
                                    )}
                                    {stamp && (
                                        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 pointer-events-none">
                                            <img src={stamp} alt="Stamp" className="h-16 w-16 object-contain opacity-80" style={{ transform: 'rotate(-10deg)', mixBlendMode: 'multiply' as any }} />
                                        </div>
                                    )}
                                    <div className="text-center relative ml-auto">
                                        <p className="text-xs font-bold text-slate-800 mb-2">For {safeRender(doc.issuer_details?.name)}</p>
                                        {signature ? <img src={signature} alt="Signature" className="h-10 w-auto mx-auto mb-1 object-contain" /> : <div className="h-10"></div>}
                                        <div className="h-px bg-slate-400 w-32 mb-1 mx-auto"></div>
                                        <p className="text-[9px] font-bold text-slate-600">Issuer's Signature</p>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="pt-1 text-center text-[9px] text-slate-400">{safeRender(config.footerText)}</div>
                            </div>
                        ))}
                    </div>
                </div>
        </div>
    );

    if (typeof window === 'undefined') return null;
    return createPortal(overlayContent, document.body);
};

export default InvoicePrintView;
