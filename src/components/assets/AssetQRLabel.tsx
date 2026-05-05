"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetQRLabelProps {
  asset: {
    id: string;
    asset_code: string;
    brand: string;
    model: string;
    serial_number: string;
  };
  onClose: () => void;
}

export function AssetQRLabel({ asset, onClose }: AssetQRLabelProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Asset Label - ${asset.asset_code}</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; }
            .label-container {
              width: 50mm;
              height: 30mm;
              padding: 2mm;
              box-sizing: border-box;
              display: flex;
              gap: 2mm;
              align-items: center;
              border: 1px solid #eee;
            }
            .qr-side { width: 22mm; height: 22mm; }
            .info-side { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .code { font-size: 10pt; font-weight: 900; margin-bottom: 1mm; }
            .brand { font-size: 7pt; font-weight: 700; color: #666; text-transform: uppercase; }
            .sn { font-size: 6pt; color: #999; margin-top: 1mm; }
            .company { font-size: 5pt; font-weight: 900; color: #000; margin-top: auto; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-800">Generate_Physical_Tag</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
            <X size={16} />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-8">
          {/* Label Preview */}
          <div 
            ref={printRef}
            className="w-[50mm] h-[30mm] bg-white border border-slate-200 flex p-[2mm] gap-[2mm] items-center box-border shadow-sm rounded-sm overflow-hidden"
          >
            <div className="w-[22mm] h-[22mm] flex-shrink-0">
               <QRCodeSVG 
                  value={`${window.location.origin}/assets/intelligence/${asset.id}`}
                  size={80}
                  level="H"
                  includeMargin={false}
               />
            </div>
            <div className="flex-1 flex flex-col justify-center h-full overflow-hidden">
               <div className="text-[10pt] font-black text-slate-900 leading-tight truncate">{asset.asset_code}</div>
               <div className="text-[6pt] font-bold text-slate-500 uppercase truncate">{asset.brand} {asset.model}</div>
               <div className="text-[5pt] text-slate-400 mt-0.5 truncate">S/N: {asset.serial_number}</div>
               <div className="text-[5pt] font-black text-primary uppercase tracking-[0.2em] mt-auto">ADIOS_CORP_SYSTEM</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <Button 
                onClick={handlePrint}
                className="h-12 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all"
            >
              <Printer size={14} /> Print_Label
            </Button>
            <Button 
                variant="outline"
                className="h-12 rounded-xl border-slate-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <Download size={14} /> Download_SVG
            </Button>
          </div>
          
          <p className="text-[9px] font-medium text-slate-400 text-center uppercase tracking-widest leading-relaxed">
            Standard 50mm x 30mm thermal adhesive dimensions.<br />
            Optimized for Zebra / Brother desktop printers.
          </p>
        </div>
      </div>
    </div>
  );
}
