"use client";

import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  purchase: any;
  items: any[];
  company?: any;
}

export function PrintPageClient({ purchase, items, company }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Automatically trigger print dialog after a short delay to ensure rendering is complete
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const displayPoNumber = purchase.amendment_number > 0 
    ? `${purchase.po_number}/AMD/${purchase.amendment_number}`
    : purchase.po_number;

  const gstAmount = purchase.grand_total - purchase.total_raw_amount - (purchase.other_charges || 0);

  return (
    <div className="min-h-screen bg-white p-0 m-0 text-black font-sans print:p-0">
      <div className="max-w-[850px] mx-auto p-12 print:p-8 space-y-10">
        
        {/* A. Header / Letterhead */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
          <div className="space-y-1.5 flex-1">
            <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter leading-none mb-2">
                {company?.name || "ASM CORPORATE"}
            </h1>
            <p className="text-[12px] text-slate-600 font-bold max-w-[400px] uppercase leading-relaxed">
                {company?.address || "Registered Office Address Not Configured"}
            </p>
            <div className="flex items-center gap-4 mt-2">
                <p className="text-[11px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded-sm">
                    GSTIN: {company?.gst_number || "XXXXXXXXXXX"}
                </p>
                <p className="text-[11px] font-bold text-slate-400 italic">Official Procurement Authority</p>
            </div>
          </div>
          <div className="text-right space-y-2 shrink-0">
            <div className="inline-block bg-slate-900 text-white px-6 py-2 text-[14px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                Purchase Order
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol ID</p>
                <p className="text-[18px] font-black text-slate-900">{displayPoNumber}</p>
            </div>
            <div className="space-y-0.5 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorization Date</p>
                <p className="text-[13px] font-bold text-slate-800">{format(new Date(purchase.purchase_date), "do MMMM yyyy")}</p>
            </div>
          </div>
        </div>

        {/* B. Billing & Vendor Grid */}
        <div className="grid grid-cols-2 gap-16">
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-white bg-slate-900 px-3 py-1.5 uppercase tracking-widest rounded-sm inline-block">Supplier Registry Detail</h4>
            <div className="space-y-1.5 pl-1 border-l-4 border-slate-100">
                <p className="text-[15px] font-black uppercase text-slate-900 leading-tight">{purchase.supplier?.name}</p>
                <p className="text-[12px] text-slate-600 font-medium uppercase leading-relaxed max-w-[300px]">
                    {purchase.supplier?.address || "Supplier Address Not Documented"}
                </p>
                <div className="pt-2">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                        GSTIN: <span className="font-bold text-slate-500">{purchase.supplier?.gst_number || "NOT_PROVIDED"}</span>
                    </p>
                </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-slate-400 border-b-2 border-slate-100 px-1 py-1.5 uppercase tracking-widest inline-block">Consignee / Site Authority</h4>
            <div className="space-y-1.5 pl-1">
                <p className="text-[15px] font-black uppercase text-slate-900">{purchase.project?.name || "CENTRAL LOGISTICS HUB"}</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase italic tracking-widest">
                    Reference: {purchase.reference || "INTERNAL_STOCK_PROCUREMENT"}
                </p>
                <div className="mt-4 flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol Type</span>
                    <span className="text-[12px] font-black uppercase text-slate-700">{purchase.po_type || "Domestic"} Entry</span>
                </div>
            </div>
          </div>
        </div>

        {/* C. Material Schedule */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
             <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Audit Material Schedule</h4>
             <span className="text-[10px] font-bold text-slate-400 italic font-serif">Authority: {purchase.status}</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-y border-slate-200">
                <th className="py-3 text-left w-12 pl-4 border-r border-slate-100 font-serif">No.</th>
                <th className="py-3 text-left pl-6 border-r border-slate-100">Technical Specifications & Decal</th>
                <th className="py-3 text-center w-24 border-r border-slate-100">Quantum</th>
                <th className="py-3 text-right w-32 border-r border-slate-100">Unit Rate</th>
                <th className="py-3 text-right w-36 pr-4">Agg Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="text-[12px] border-b border-slate-100 last:border-b-2 last:border-slate-400 group h-14">
                  <td className="w-12 text-center text-slate-400 font-black font-serif italic border-r border-slate-100 bg-slate-50/30">{idx + 1}</td>
                  <td className="pl-6 border-r border-slate-100 py-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-black uppercase text-slate-900 tracking-tight">{item.asset_name}</span>
                        {item.remarks && <span className="text-[10px] text-slate-500 italic font-medium leading-none">Remark: {item.remarks}</span>}
                        {item.asset_type?.name && <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter">{item.asset_type.name} Registry</span>}
                    </div>
                  </td>
                  <td className="text-center font-black text-slate-900 border-r border-slate-100">
                    <span className="text-[13px]">{item.quantity}</span> 
                    <span className="text-[9px] text-slate-400 ml-1 font-bold">NOS</span>
                  </td>
                  <td className="text-right font-bold text-slate-600 italic border-r border-slate-100 bg-slate-50/10">
                    <span className="text-[10px] text-slate-400 mr-1 opacity-50 not-italic">₹</span>
                    {item.unit_price?.toLocaleString('en-IN')}
                  </td>
                  <td className="text-right font-black pr-4 text-slate-900 bg-slate-50/20">
                    <span className="text-[10px] text-slate-400 mr-2 font-bold opacity-70">INR</span>
                    {item.total_price?.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* D. Fiscal Summary */}
        <div className="flex justify-end pt-6">
          <div className="w-[320px] space-y-2.5 bg-slate-50/30 p-4 border border-slate-100 rounded-sm">
            <div className="flex justify-between items-center text-[12px] text-slate-500 font-bold px-1">
              <span className="uppercase tracking-widest text-[10px] text-slate-400">Total Assessable Value:</span>
              <span className="text-slate-700">₹ {purchase.total_raw_amount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center text-[12px] text-slate-500 font-bold px-1">
              <span className="uppercase tracking-widest text-[10px] text-slate-400">Integrated GST (18%):</span>
              <span className="text-slate-700 italic">₹ {gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            {purchase.other_charges > 0 && (
              <div className="flex justify-between items-center text-[12px] text-slate-500 font-bold px-1">
                <span className="uppercase tracking-widest text-[10px] text-slate-400">Logistical Charges:</span>
                <span className="text-slate-700 font-black">₹ {purchase.other_charges.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="pt-2 pb-1 border-t-2 border-slate-900 mt-2">
              <div className="flex justify-between items-end text-slate-900">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-1 leading-none">Net Payable Aggregate</span>
                    <span className="text-[13px] font-black uppercase italic leading-none">Total Authorized Value</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-bold text-slate-400 italic">INR</span>
                    <span className="text-2xl font-black tracking-tighter">₹ {purchase.grand_total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-400 text-right uppercase italic leading-none pt-1">
                Values Inclusive of all applicable statutory duties
            </p>
          </div>
        </div>

        {/* E. Signatories */}
        <div className="pt-24 grid grid-cols-2 gap-20 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">
          <div className="space-y-4">
             <div className="h-20 border-b border-dashed border-slate-200" />
             <p className="mt-4">Prepared By / Asset Executive</p>
          </div>
          <div className="space-y-4">
             <div className="h-20 border-b border-dashed border-slate-200" />
             <p className="mt-4 text-slate-600">Authorized Signatory / Approver</p>
          </div>
        </div>

        {/* F. Footer Disclaimer */}
        <div className="pt-20 text-center space-y-6">
          <p className="text-[10px] text-slate-400 uppercase font-black leading-relaxed italic border-t border-slate-100 pt-6 px-10">
            This document is a computer-authorized Purchase Protocol. No biological signature is required for digital verification within the ISM corporate system. Unauthorized duplication or alteration is strictly prohibited.
          </p>
          <div className="flex items-center justify-center gap-10 text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em]">
             <span>Generated: {format(new Date(), "PPpp")}</span>
             <span className="w-1 h-1 bg-slate-200 rounded-full" />
             <span>ISO 9001:2015 AUDITED PROCESS</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
