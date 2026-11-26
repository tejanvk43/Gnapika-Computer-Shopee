'use client'

import React from 'react'
import { GNAPIKA_LOGO_BASE64, GNAPIKA_WATERMARK_BASE64 } from '@/lib/brandAssets'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { QuotationData } from '@/lib/quotations'
import { printQuotation } from '@/lib/quotationPrinter'
import { Printer, ArrowLeft, Building2, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'

export function QuotationPaperView({ quote }: { quote: QuotationData }) {
  if (!quote) return null

  const items = quote.items || []
  const grandTotal = quote.grand_total || 0
  const taxableTotal = quote.taxable_total || 0
  const totalCgst = quote.total_cgst || 0
  const totalSgst = quote.total_sgst || 0
  const totalIgst = quote.total_igst || 0
  const totalTax = quote.total_tax || totalCgst + totalSgst + totalIgst

  const amountInWords = quote.amount_in_words || numberToWordsRupees(grandTotal)
  const taxInWords = quote.tax_in_words || numberToWordsRupees(totalTax)

  const dateObj = quote.quotation_date ? new Date(quote.quotation_date) : new Date()
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })

  // HSN Tax Breakup Grouping
  const hsnMap: Record<
    string,
    { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; totalTax: number }
  > = {}

  for (const it of items) {
    const code = it.hsn_sac || '84713010'
    if (!hsnMap[code]) {
      hsnMap[code] = {
        taxable: 0,
        cgstRate: it.cgst_rate || 9,
        cgstAmount: 0,
        sgstRate: it.sgst_rate || 9,
        sgstAmount: 0,
        totalTax: 0,
      }
    }
    hsnMap[code].taxable += it.taxable_amount || 0
    hsnMap[code].cgstAmount += it.cgst_amount || 0
    hsnMap[code].sgstAmount += it.sgst_amount || 0
    hsnMap[code].totalTax += (it.cgst_amount || 0) + (it.sgst_amount || 0) + (it.igst_amount || 0)
  }

  const bankName = quote.bank_details?.bank_name || 'KARUR VYSYA BANK'
  const bankAcc = quote.bank_details?.account_no || '1413010000000199'
  const bankIfsc = quote.bank_details?.branch_ifsc || 'GOVERNOR PETA & KVBL0001413'

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/quotations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Quotes</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-500 font-mono font-bold">
            {quote.quotation_number}
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            - {quote.quotation_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printQuotation(quote)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Quotation</span>
          </button>
        </div>
      </div>

      {/* Sheet Container with Border and Low-Opacity Background Watermark */}
      <div className="relative bg-white text-black p-4 sm:p-6 border border-black shadow-lg mx-auto max-w-[850px] font-sans text-[10px] leading-tight select-text overflow-hidden">
        {/* Background Watermark Logo */}
        <img
          src={GNAPIKA_WATERMARK_BASE64}
          alt="Watermark"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-[550px] opacity-[0.11] z-0 select-none"
        />

        <div className="relative z-10 space-y-2">
          {/* Header Banner */}
          <div className="text-center font-black text-sm uppercase tracking-wider py-1 border-b border-black">
            ESTIMATION/QUOTATION
          </div>

          {/* Top 2-Column Box (Seller & Buyer / Meta Grid) */}
          <div className="border border-black">
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-black text-[9px]">
              {/* Left Column: Seller & Parties (7 cols) */}
              <div className="md:col-span-7 p-2.5 flex flex-col justify-between space-y-3">
                {/* Official Store Logo & Seller Details */}
                <div className="flex items-center gap-3 pb-2 border-b border-dashed border-gray-400">
                  <div className="shrink-0 w-36 max-w-[42%]">
                    <img
                      src={GNAPIKA_LOGO_BASE64}
                      alt="Gnapika Computer Shopee"
                      className="w-full h-auto max-h-14 object-contain block"
                    />
                  </div>
                  <div className="text-left text-[8.5px] leading-snug">
                    <div className="font-black text-[10px] text-black">M/S GNAPIKA COMPUTER SHOPEE</div>
                    <div>D.NO.40-72-3/2,SF4, Anjali Apartments, Sitaram Nagar Road,</div>
                    <div>Vijayawada, NTR, Andhra Pradesh, 520010</div>
                    <div><strong>GSTIN/UIN:</strong> 37BEYPC1417G1ZG</div>
                    <div><strong>State Name :</strong> Andhra Pradesh, Code : 37</div>
                    <div><strong>E-Mail :</strong> gnapikacomputershopee@gmail.com</div>
                    <div><strong>Phone :</strong> 9493471414</div>
                  </div>
                </div>

                {/* Consignee (Ship To) */}
                <div className="pb-2 border-b border-dashed border-gray-400">
                  <div className="font-bold underline text-[8.5px] text-gray-700">Consignee (Ship to)</div>
                  <div className="font-bold text-[10px] text-black mt-0.5">
                    {quote.consignee_name || quote.company_name}
                  </div>
                  <div className="text-[9px] mt-0.5">
                    {quote.consignee_address || quote.company_address || 'Vijayawada'}
                  </div>
                  <div className="text-[8.5px] mt-0.5">
                    <strong>State Name :</strong> {quote.consignee_state || quote.company_state || 'Andhra Pradesh, Code : 37'}
                  </div>
                </div>

                {/* Buyer (Bill To) */}
                <div>
                  <div className="font-bold underline text-[8.5px] text-gray-700">Buyer (Bill to)</div>
                  <div className="font-bold text-[10.5px] text-black mt-0.5">
                    {quote.company_name}
                  </div>
                  <div className="text-[9px] mt-0.5">
                    {quote.company_address || 'Vijayawada'}
                  </div>
                  <div className="text-[8.5px] mt-0.5">
                    <strong>State Name :</strong> {quote.company_state || 'Andhra Pradesh, Code : 37'}
                  </div>
                  {quote.company_gstin && (
                    <div className="text-[8.5px] font-mono mt-0.5">
                      <strong>GSTIN/UIN:</strong> {quote.company_gstin}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Quotation Metadata Table (5 cols) */}
              <div className="md:col-span-5 p-0">
                <table className="w-full border-collapse text-[8.5px]">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black w-1/2">
                        <div className="text-[7.5px] text-gray-600">Invoice / Quote No.</div>
                        <div className="font-bold font-mono text-[9.5px] text-black mt-0.5">{quote.quotation_number}</div>
                      </td>
                      <td className="p-1.5 w-1/2">
                        <div className="text-[7.5px] text-gray-600">Dated</div>
                        <div className="font-bold font-mono text-[9px] text-black mt-0.5">{formattedDate}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black">
                        <div className="text-[7.5px] text-gray-600">Delivery Note</div>
                        <div className="text-[8px]">{quote.delivery_note || '-'}</div>
                      </td>
                      <td className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Mode/Terms of Payment</div>
                        <div className="font-bold text-[8px]">{quote.mode_terms_of_payment || 'Against Delivery'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black">
                        <div className="text-[7.5px] text-gray-600">Reference No. &amp; Date.</div>
                        <div className="text-[8px]">{quote.reference_no_date || '-'}</div>
                      </td>
                      <td className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Other References</div>
                        <div className="text-[8px]">{quote.other_references || '-'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black">
                        <div className="text-[7.5px] text-gray-600">Buyer's Order No.</div>
                        <div className="text-[8px]">{quote.buyers_order_no || '-'}</div>
                      </td>
                      <td className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Dated</div>
                        <div className="text-[8px]">{quote.buyers_order_date || '-'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black">
                        <div className="text-[7.5px] text-gray-600">Dispatch Doc No.</div>
                        <div className="text-[8px]">{quote.dispatch_doc_no || '-'}</div>
                      </td>
                      <td className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Delivery Note Date</div>
                        <div className="text-[8px]">{quote.delivery_note_date || '-'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 border-r border-black">
                        <div className="text-[7.5px] text-gray-600">Dispatched through</div>
                        <div className="text-[8px]">{quote.dispatched_through || '-'}</div>
                      </td>
                      <td className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Destination</div>
                        <div className="text-[8px]">{quote.destination || 'Vijayawada'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="p-1.5">
                        <div className="text-[7.5px] text-gray-600">Terms of Delivery</div>
                        <div className="text-[8px]">{quote.terms_of_delivery || 'Standard Delivery at Site'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[8.5px]">
              <thead>
                <tr className="bg-transparent font-bold text-center border-b border-black text-[8px] leading-tight">
                  <th className="border border-black p-1 w-6">Sl<br/>No</th>
                  <th className="border border-black p-1 text-left">Description of Goods</th>
                  <th className="border border-black p-1 w-16">HSN/SAC</th>
                  <th className="border border-black p-1 w-14">Quantity</th>
                  <th className="border border-black p-1 w-16 text-right">Rate<br/>(Incl. of Tax)</th>
                  <th className="border border-black p-1 w-16 text-right">Rate</th>
                  <th className="border border-black p-1 w-10">per</th>
                  <th className="border border-black p-1 w-12 text-right">Disc. %</th>
                  <th className="border border-black p-1 w-20 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="border-b border-black">
                    <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black p-1">
                      <div className="font-bold text-black text-[9.5px] uppercase">{it.description}</div>
                      {it.specifications && (
                        <div className="text-[8px] text-gray-800 italic whitespace-pre-line mt-0.5 leading-snug">
                          {it.specifications}
                        </div>
                      )}
                    </td>
                    <td className="border border-black p-1 text-center font-mono">{it.hsn_sac || '84713010'}</td>
                    <td className="border border-black p-1 text-center font-mono font-bold">
                      {it.quantity} {it.unit || 'NOS'}
                    </td>
                    <td className="border border-black p-1 text-right font-mono">
                      {(it.rate_incl_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-black p-1 text-right font-mono">
                      {(it.rate_excl_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-black p-1 text-center">{it.unit || 'NOS'}</td>
                    <td className="border border-black p-1 text-right font-mono">
                      {it.discount_percent ? `${it.discount_percent}%` : ''}
                    </td>
                    <td className="border border-black p-1 text-right font-mono font-bold">
                      {(it.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}

                {/* In-table CGST / SGST sub-rows */}
                {totalCgst > 0 && (
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 text-right font-bold pr-4 font-mono text-[9px]">CGST</td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-l border-black p-1 text-right font-mono font-bold">
                      {totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {totalSgst > 0 && (
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 text-right font-bold pr-4 font-mono text-[9px]">SGST</td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-l border-black p-1 text-right font-mono font-bold">
                      {totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* Total Row */}
                <tr className="font-extrabold border-t-2 border-black bg-transparent">
                  <td colSpan={3} className="border border-black p-1.5 text-right uppercase">Total</td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {quote.total_qty || items.reduce((a, c) => a + (c.quantity || 1), 0)} NOS
                  </td>
                  <td colSpan={4} className="border border-black"></td>
                  <td className="border border-black p-1.5 text-right font-mono text-[10px]">
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="border border-black p-1.5 flex justify-between items-center text-[9px]">
            <div>
              <div className="text-[7.5px] text-gray-600">Amount Chargeable (in words)</div>
              <div className="font-black uppercase text-[10px] mt-0.5">{amountInWords}</div>
            </div>
            <div className="font-bold italic text-gray-700">E. &amp; O.E</div>
          </div>

          {/* HSN/SAC Tax Breakup Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[8px]">
              <thead>
                <tr className="text-center font-bold border-b border-black bg-transparent">
                  <th rowSpan={2} className="border border-black p-1 w-20">HSN/SAC</th>
                  <th rowSpan={2} className="border border-black p-1 w-24">Taxable Value</th>
                  <th colSpan={2} className="border border-black p-1">CGST</th>
                  <th colSpan={2} className="border border-black p-1">SGST/UTGST</th>
                  <th rowSpan={2} className="border border-black p-1 w-24">Total Tax Amount</th>
                </tr>
                <tr className="text-center font-bold border-b border-black">
                  <th className="border border-black p-0.5 w-12">Rate</th>
                  <th className="border border-black p-0.5 w-16">Amount</th>
                  <th className="border border-black p-0.5 w-12">Rate</th>
                  <th className="border border-black p-0.5 w-16">Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hsnMap).map(([hsn, val]) => (
                  <tr key={hsn} className="border-b border-black">
                    <td className="border border-black p-1 font-mono">{hsn}</td>
                    <td className="border border-black p-1 text-right font-mono">{val.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-black p-1 text-center font-mono">{val.cgstRate}%</td>
                    <td className="border border-black p-1 text-right font-mono">{val.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-black p-1 text-center font-mono">{val.sgstRate}%</td>
                    <td className="border border-black p-1 text-right font-mono">{val.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border border-black p-1 text-right font-mono font-bold">{val.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-black bg-transparent">
                  <td className="border border-black p-1 text-right uppercase">Total</td>
                  <td className="border border-black p-1 text-right font-mono">{taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-right font-mono">{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-right font-mono">{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Amount in Words */}
          <div className="border border-black p-1.5 text-[8.5px]">
            <strong>Tax Amount (in words) : </strong>
            <span className="font-bold uppercase">{taxInWords}</span>
          </div>

          {/* Bottom Section: Declaration & Bank Details & Signatory */}
          <div className="border border-black p-2 grid grid-cols-1 md:grid-cols-12 gap-3 text-[8.5px]">
            {/* Declaration */}
            <div className="md:col-span-5 space-y-1">
              <div className="font-bold underline">Declaration</div>
              <div className="text-gray-800 leading-snug">
                We declare that this quotation/estimation shows the actual price of the goods described and that all particulars are true and correct.
              </div>
            </div>

            {/* Bank Details */}
            <div className="md:col-span-4 border border-dashed border-gray-400 p-1.5 rounded-sm">
              <div className="font-bold underline mb-1">Company's Bank Details</div>
              <div><strong>Bank Name :</strong> {bankName}</div>
              <div><strong>A/c No. :</strong> <span className="font-mono font-bold">{bankAcc}</span></div>
              <div><strong>Branch &amp; IFS Code :</strong> {bankIfsc}</div>
            </div>

            {/* Signatory */}
            <div className="md:col-span-3 text-right flex flex-col justify-between pt-1">
              <div className="font-bold text-[8.5px]">for M/S GNAPIKA COMPUTER SHOPEE</div>
              <div className="mt-8">
                <span className="border-t border-dashed border-black pt-1 inline-block font-bold text-[8px]">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Computer Generated Footer */}
          <div className="text-center text-[7.5px] text-gray-500 pt-1">
            This is a Computer Generated Estimation/Quotation
          </div>
        </div>
      </div>
    </div>
  )
}
