
import { ExtractedInvoice, InvoiceItem } from "../types";

// --- Validation ---
export const validateGSTIN = (gstin: string): boolean => {
  if (!gstin) return true; // Empty is valid (unregistered)
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin);
};

export const calculateItemTotal = (item: InvoiceItem): number => {
  return (item.taxable_value || 0) + (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
};

export const recalculateInvoiceTotals = (items: InvoiceItem[]): any => {
  return items.reduce(
    (acc, item) => {
      acc.subtotal_taxable += item.taxable_value || 0;
      acc.cgst_total += item.cgst_amount || 0;
      acc.sgst_total += item.sgst_amount || 0;
      acc.igst_total += item.igst_amount || 0;
      acc.grand_total += calculateItemTotal(item);
      return acc;
    },
    {
      subtotal_taxable: 0,
      cgst_total: 0,
      sgst_total: 0,
      igst_total: 0,
      grand_total: 0,
    }
  );
};

// --- Helper Functions ---

export const safeRender = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// --- Number to Words (Indian System) ---
function numberToWords(n: number): string {
  if (n === 0) return "Zero";

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWordsLessThan1000 = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return units[num];
    const t = Math.floor(num / 10);
    const u = num % 10;
    return tens[t] + (u > 0 ? " " + units[u] : "");
  };

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;
  
  let str = "";
  if (crore > 0) str += numToWordsLessThan1000(crore) + " Crore ";
  if (lakh > 0) str += numToWordsLessThan1000(lakh) + " Lakh ";
  if (thousand > 0) str += numToWordsLessThan1000(thousand) + " Thousand ";
  if (hundred > 0) str += numToWordsLessThan1000(hundred) + " Hundred ";
  if (n > 0) str += numToWordsLessThan1000(n);
  
  return str.trim();
}

export const amountToWords = (amount: number): string => {
    const whole = Math.floor(amount);
    const fraction = Math.round((amount - whole) * 100);
    
    let str = numberToWords(whole) + " Rupees";
    if (fraction > 0) {
        str += " and " + numberToWords(fraction) + " Paise";
    }
    return str + " Only";
};

// --- Export Helper ---

export const generateCSV = (invoices: ExtractedInvoice[]): string => {
  const headers = [
    "Invoice Number",
    "Date",
    "Type",
    "Issuer Name",
    "Issuer GSTIN",
    "Receiver Name",
    "Receiver GSTIN",
    "Item Description",
    "HSN/SAC",
    "Quantity",
    "Unit Price",
    "Taxable Value",
    "CGST Rate",
    "CGST Amount",
    "SGST Rate",
    "SGST Amount",
    "IGST Rate",
    "IGST Amount",
    "Total Value"
  ];

  const rows: string[] = [];
  rows.push(headers.join(","));

  invoices.forEach(inv => {
    const items = inv.items && inv.items.length > 0 ? inv.items : [];
    
    if (items.length === 0) {
        const row = [
            `"${inv.invoice_metadata?.invoice_number || ''}"`,
            `"${inv.invoice_metadata?.invoice_date || ''}"`,
            `"${inv.source_type || ''}"`,
            `"${inv.issuer_details?.name || ''}"`,
            `"${inv.issuer_details?.gstin || ''}"`,
            `"${inv.receiver_details?.name || ''}"`,
            `"${inv.receiver_details?.gstin || ''}"`,
            "Summary - No Items", "", "", "", 
            inv.totals?.subtotal_taxable || 0,
            "", inv.totals?.cgst_total || 0,
            "", inv.totals?.sgst_total || 0,
            "", inv.totals?.igst_total || 0,
            `"${inv.totals?.grand_total || 0}"`
        ];
        rows.push(row.join(","));
    } else {
        items.forEach(item => {
            const row = [
                `"${inv.invoice_metadata?.invoice_number || ''}"`,
                `"${inv.invoice_metadata?.invoice_date || ''}"`,
                `"${inv.source_type || ''}"`,
                `"${inv.issuer_details?.name || ''}"`,
                `"${inv.issuer_details?.gstin || ''}"`,
                `"${inv.receiver_details?.name || ''}"`,
                `"${inv.receiver_details?.gstin || ''}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${item.hsn_sac || ''}"`,
                item.quantity || 0,
                item.unit_price || 0,
                item.taxable_value || 0,
                item.cgst_rate || 0,
                item.cgst_amount || 0,
                item.sgst_rate || 0,
                item.sgst_amount || 0,
                item.igst_rate || 0,
                item.igst_amount || 0,
                item.total_value || 0
            ];
            rows.push(row.join(","));
        });
    }
  });

  return rows.join("\n");
};

export const generateCompanyProfileCSV = (invoices: ExtractedInvoice[]): string => {
    const headers = [
        "Company Name",
        "GST Number",
        "Email",
        "Contact Person",
        "Phone Number",
        "Shipping Address"
    ];

    const companyMap = new Map<string, any>();

    invoices.forEach(inv => {
        if (inv.source_type === 'purchase') {
            const party = inv.issuer_details;
            const key = party.gstin || party.name;
            if (key) {
                companyMap.set(key, party);
            }
        }
        else if (inv.source_type === 'sales') {
            const party = inv.receiver_details;
            const key = party.gstin || party.name;
            if (key) {
                companyMap.set(key, party);
            }
        }
    });

    const rows: string[] = [];
    rows.push(headers.join(","));

    companyMap.forEach((party) => {
        const row = [
            `"${(party.name || '').replace(/"/g, '""')}"`,
            `"${(party.gstin || '').replace(/"/g, '""')}"`,
            `"${(party.email || '').replace(/"/g, '""')}"`,
            `"${(party.contact_person || '').replace(/"/g, '""')}"`,
            `"${(party.phone || '').replace(/"/g, '""')}"`,
            `"${(party.address || '').replace(/"/g, '""')}"`
        ];
        rows.push(row.join(","));
    });

    return rows.join("\n");
};

export const downloadFile = (content: string, filename: string, type: 'csv' | 'json') => {
    const mimeType = type === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
