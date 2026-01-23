
import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download } from './invoices/Icons';

interface LabelData {
  productName: string;
  voltage: string;
  capacity: string;
  mfgDate: string;
  balancing: string;
  energy: string;
  weight: string;
  productId: string;
  qrCodeUrl: string;
  email?: string;
}

interface ProductLabelProps {
  data: LabelData;
  id?: string;
}

const ProductLabel: React.FC<ProductLabelProps> = ({ data, id }) => {
  // Using the high-quality template background
  const BACKGROUND_URL = "https://bfkxdpripwjxenfvwpfu.supabase.co/storage/v1/object/public/Images/Template_label_new.png";
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow && labelRef.current) {
        // We use the SVG content directly for printing to maintain vector quality
        const svgContent = labelRef.current.innerHTML;
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Label - ${data.productId}</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; }
                        @media print {
                            body { background: white; }
                            @page { size: 50mm 30mm; margin: 0; }
                            /* Force background graphics to print */
                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                    </style>
                </head>
                <body>
                    <div style="width: 50mm; height: 30mm;">
                        ${svgContent}
                    </div>
                    <script>
                        // Allow image to load before printing
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const handleDownloadSVG = () => {
      if (!labelRef.current) return;
      const svgElement = labelRef.current.querySelector('svg');
      if (!svgElement) return;

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${data.productId}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center gap-4">
        {/* Label Container - Fixed 50mm x 30mm */}
        <div 
            ref={labelRef}
            id={id || "label-preview"}
            className="bg-white shadow-xl print:shadow-none transition-transform hover:scale-105 duration-200 cursor-default"
            style={{
                width: '50mm',
                height: '30mm',
                boxSizing: 'border-box',
                overflow: 'hidden' // Ensure content strictly fits
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 50 30"
                width="50mm"
                height="30mm"
                style={{ width: '100%', height: '100%', display: 'block' }}
                textRendering="geometricPrecision"
                shapeRendering="geometricPrecision"
            >
                <defs>
                    <style>
                        {`
                            .txt-label { font-family: Arial, sans-serif; font-size: 1.7px; fill: #000000; font-weight: bold; }
                            .txt-value { font-family: Arial, sans-serif; font-size: 2.2px; fill: #000000; font-weight: bold; }
                            .txt-header { font-family: Arial, sans-serif; font-size: 2.3px; fill: #4a7c26; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1px; }
                            .txt-small { font-family: Arial, sans-serif; font-size: 1.1px; fill: #444; }
                            .tbl-line { stroke: #000000; stroke-width: 0.15px; }
                        `}
                    </style>
                </defs>

                {/* Layer 1: Background Template embedded inside SVG for high-quality export */}
                <image 
                    href={BACKGROUND_URL} 
                    x="0" 
                    y="0" 
                    width="50" 
                    height="30" 
                    preserveAspectRatio="none"
                />

                {/* Layer 1.5: Grid Lines */}
                {/* 
                    Logic:
                    1. Shift whole table left by 1: 
                       Left x: 18 -> 17
                       Mid x: 27 -> 26
                       Right x: 47 -> 46
                    2. Expand second column by 1 from right:
                       Right x: 46 -> 47
                */}
                <g>
                    {/* Horizontal Lines */}
                    <line x1="17" y1="2.0" x2="47" y2="2.0" className="tbl-line" />
                    <line x1="17" y1="9.0" x2="47" y2="9.0" className="tbl-line" />
                    <line x1="17" y1="16.0" x2="47" y2="16.0" className="tbl-line" />
                    <line x1="17" y1="23.0" x2="47" y2="23.0" className="tbl-line" />
                    
                    {/* Vertical Dividers */}
                    <line x1="17" y1="2.0" x2="17" y2="23.0" className="tbl-line" />
                    <line x1="26" y1="2.0" x2="26" y2="23.0" className="tbl-line" />
                    <line x1="47" y1="2.0" x2="47" y2="23.0" className="tbl-line" />
                </g>

                {/* Layer 2: Dynamic Data Overlay */}
                
                {/* Data Grid - Aligned with Shifted Grid Lines */}
                
                {/* Row 1: y 2.0 - 9.0 */}
                <text x="18" y="4.5" className="txt-label">Voltage</text>
                <text id="voltage_v" x="18" y="7.5" className="txt-value">{data.voltage}</text>

                <text x="27" y="4.5" className="txt-label">Weight</text>
                <text id="weight" x="27" y="7.5" className="txt-value">{data.weight}</text>

                {/* Row 2: y 9.0 - 16.0 */}
                <text x="18" y="11.5" className="txt-label">Capacity</text>
                <text id="capacity_ah" x="18" y="14.5" className="txt-value">{data.capacity}</text>

                <text x="27" y="11.5" className="txt-label">Mfg Date</text>
                <text id="manufacture_date" x="27" y="14.5" className="txt-value">{data.mfgDate}</text>

                {/* Row 3: y 16.0 - 23.0 */}
                <text x="18" y="18.5" className="txt-label">Energy</text>
                <text id="energy" x="18" y="21.5" className="txt-value">{data.energy}</text>

                <text x="27" y="18.5" className="txt-label">Batch / ID</text>
                <text id="product_id" x="27" y="21.5" className="txt-value">{data.productId}</text>

                {/* QR Code Area - Left Side */}
                <svg x="1.5" y="13" width="13" height="13" viewBox="0 0 29 29">
                    <QRCodeSVG
                        value={data.qrCodeUrl}
                        size={29}
                        level="M"
                        bgColor="#ffffff" 
                        fgColor="#000000"
                        includeMargin={false}
                    />
                </svg>
            </svg>
        </div>

        <div className="flex gap-2 no-print">
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-colors text-xs font-bold shadow-sm"
            >
                <Printer size={14} /> Print Label
            </button>
            <button 
                onClick={handleDownloadSVG}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-xs font-medium"
            >
                <Download size={14} /> Export SVG
            </button>
        </div>
    </div>
  );
};

export default ProductLabel;
