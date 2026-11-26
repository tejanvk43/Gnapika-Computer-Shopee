'use client'

import React from 'react'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { GNAPIKA_LOGO_BASE64, GNAPIKA_WATERMARK_BASE64 } from '@/lib/brandAssets'

export function TaxInvoicePaperView({ invoice }: { invoice: any }) {
  if (!invoice) return null

  const grandTotal = parseFloat(invoice.total_grand_amount || invoice.grand_total || 0)
  const items = invoice.invoice_items && invoice.invoice_items.length > 0
    ? invoice.invoice_items
    : (invoice.items || invoice.invoice_snapshot?.items || [])

  const serviceCharge = parseFloat(
    invoice.service_charge !== undefined
      ? invoice.service_charge
      : (invoice.invoice_snapshot?.service_charge || 0)
  ) || 0
  const serviceChargeDesc = invoice.service_charge_description
    || invoice.invoice_snapshot?.service_charge_description
    || 'Service / Labor Charge'

  const serviceTaxable = serviceCharge
  const serviceCgst = Math.round(serviceTaxable * 0.09 * 100) / 100
  const serviceSgst = Math.round(serviceTaxable * 0.09 * 100) / 100
  const serviceGst = Math.round((serviceCgst + serviceSgst) * 100) / 100
  const serviceTotal = Math.round((serviceTaxable + serviceGst) * 100) / 100

  const customerName = invoice.customer?.customer_name || invoice.customers?.customer_name || invoice.invoice_snapshot?.customer?.customer_name || 'Counter Customer / Walk-in'
  const customerPhone = invoice.customer?.phone_number || invoice.customers?.phone_number || invoice.invoice_snapshot?.customer?.phone_number || '-'
  const customerAddress = invoice.customer?.address || invoice.customers?.address || invoice.invoice_snapshot?.customer?.address || 'Vijayawada'
  const customerGstin = invoice.customer?.gstin || invoice.customers?.gstin || invoice.invoice_snapshot?.customer?.gstin || 'NA'

  const invoiceNumber = invoice.invoice_number || 'INV-000000'
  const paymentMethod = invoice.payment_method || 'Cash'

  const invoiceDateObj = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date()
  const dateStr = invoiceDateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = invoiceDateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const amountPaid = parseFloat(
    invoice.amount_paid !== undefined
      ? invoice.amount_paid
      : (invoice.invoice_snapshot?.amount_paid !== undefined ? invoice.invoice_snapshot.amount_paid : grandTotal)
  ) || 0
  const balanceDue = parseFloat(
    invoice.balance_due !== undefined
      ? invoice.balance_due
      : (invoice.invoice_snapshot?.balance_due !== undefined ? invoice.invoice_snapshot.balance_due : Math.max(0, grandTotal - amountPaid))
  ) || 0

  // Accumulate totals
  let totalQty = 0
  let totalGross = 0
  let totalDisc = 0
  let totalTaxable = 0
  let totalCgstVal = 0
  let totalSgstVal = 0
  let totalLineAmount = 0

  const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number }> = {}

  const renderedItems = items.map((it: any, index: number) => {
    const name = it.name || it.products?.name || 'Computer Hardware / Peripherals'
    const sku = it.sku || it.products?.sku || ''
    const serial = it.serial_number || it.barcode_value || it.serial || ''
    const hsn = it.hsn_code || (/^\d{4,8}$/.test(sku) ? sku : '84716040')
    const qty = parseFloat(it.quantity) || 1
    const rate = parseFloat(it.unit_price || it.unit_price_snapshot || 0)
    const discount = parseFloat(it.discount_applied || it.discount || 0)
    const gross = rate * qty
    const taxable = Math.max(0, gross - discount)
    const gstRate = parseFloat(it.gstRate || it.gst_rate_snapshot || 18)
    const cgstVal = Math.round(taxable * (gstRate / 2 / 100) * 100) / 100
    const sgstVal = Math.round(taxable * (gstRate / 2 / 100) * 100) / 100
    const lineTotal = Math.round((taxable + cgstVal + sgstVal) * 100) / 100

    totalQty += qty
    totalGross += gross
    totalDisc += discount
    totalTaxable += taxable
    totalCgstVal += cgstVal
    totalSgstVal += sgstVal
    totalLineAmount += lineTotal

    if (!hsnMap[hsn]) {
      hsnMap[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    }
    hsnMap[hsn].taxable += taxable
    hsnMap[hsn].cgst += cgstVal
    hsnMap[hsn].sgst += sgstVal

    return {
      index: index + 1,
      name,
      sku,
      serial,
      hsn,
      qty,
      rate,
      gross,
      discount,
      taxable,
      gstRate,
      cgstVal,
      sgstVal,
      lineTotal,
    }
  })

  // Add Service Charge to totals & HSN map
  if (serviceCharge > 0) {
    const sHsn = '998713'
    totalQty += 1
    totalGross += serviceTaxable
    totalTaxable += serviceTaxable
    totalCgstVal += serviceCgst
    totalSgstVal += serviceSgst
    totalLineAmount += serviceTotal

    if (!hsnMap[sHsn]) {
      hsnMap[sHsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    }
    hsnMap[sHsn].taxable += serviceTaxable
    hsnMap[sHsn].cgst += serviceCgst
    hsnMap[sHsn].sgst += serviceSgst
  }

  const calculatedGrandTotal = Math.round(totalLineAmount * 100) / 100
  const roundedTarget = Math.round(calculatedGrandTotal)
  const roundOff = Math.round((roundedTarget - calculatedGrandTotal) * 100) / 100

  return (
    <div className="relative bg-white text-black p-4 sm:p-6 border border-black shadow-lg mx-auto max-w-[850px] font-sans text-[10px] leading-tight select-text overflow-hidden">
      {/* Background Watermark Logo */}
      <img
        src={GNAPIKA_WATERMARK_BASE64}
        alt="Watermark"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-[580px] opacity-[0.12] z-0 select-none"
      />

      <div className="relative z-10 space-y-2.5 sm:space-y-3">
        {/* Header Box */}
        <div className="border border-black p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="shrink-0 w-72 sm:w-80 max-w-[48%]">
            <img
              src={GNAPIKA_LOGO_BASE64}
              alt="Gnapika Computer Shopee"
              className="w-full h-auto max-h-18 object-contain block"
            />
          </div>
          <div className="text-left text-[9px] leading-snug text-black">
            <div>D.No. 38-1-7, Opposite Indira Towers, American Hospital Road, MG Road</div>
            <div>(near P.W.D Grounds / Rythu Bazar), Vijayawada</div>
            <div className="mt-1.5">Email: {SHOP_DETAILS.email}</div>
            <div>Phone No: &nbsp;{SHOP_DETAILS.phone}</div>
            <div>GSTIN : &nbsp; {SHOP_DETAILS.gstin}</div>
          </div>
        </div>

        {/* Tax Invoice Banner Title */}
        <div className="text-center font-black text-sm uppercase tracking-wider py-1">
          Invoice
        </div>

        {/* 3-Column Party & Invoice Details Box */}
        <div className="border border-black">
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-black text-[9px]">
            {/* Column 1: Bill To Party */}
            <div className="md:col-span-4 p-2">
              <div className="font-bold underline mb-1 text-[9.5px]">Bill To Party:</div>
              <div className="text-gray-600 text-[8.5px]">Party Name &amp; Address:</div>
              <div className="font-bold text-[10.5px] text-black mt-0.5">{customerName}</div>
              <div className="text-[9px] mt-0.5">{customerAddress}</div>
            </div>

            {/* Column 2: Ship To Party */}
            <div className="md:col-span-4 p-2">
              <div className="font-bold underline mb-1 text-[9.5px]">Ship To Party:</div>
              <div className="text-gray-600 text-[8.5px]">Party Name &amp; Address:</div>
              <div className="font-bold text-[10.5px] text-black mt-0.5">{customerName}</div>
              <div className="text-[9px] mt-0.5">{customerAddress}</div>
            </div>

            {/* Column 3: Invoice Info */}
            <div className="md:col-span-4 p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice No:</span>
                <span className="font-mono font-bold">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date :</span>
                <span className="font-mono font-bold">{dateStr}</span>
              </div>
            </div>
          </div>

          {/* ACK / IRN Sub-Row */}
          <div className="border-t border-black px-2 py-1 flex justify-between text-[8.5px] bg-transparent">
            <span>ACK No : </span>
            <span>Ack Dt : </span>
            <span>IRN No : </span>
          </div>
        </div>

        {/* Items Table (15 Columns Exactly Per Reference Mockup) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[8.5px]">
            <thead>
              <tr className="bg-transparent font-bold text-center border-b border-black text-[8px] leading-tight">
                <th className="border border-black p-1 w-6">S<br/>No</th>
                <th className="border border-black p-1 text-left">Desc of goods<br/>Product Name</th>
                <th className="border border-black p-1 w-16">HSN/SAC</th>
                <th className="border border-black p-1 w-10">QTY</th>
                <th className="border border-black p-1 w-12 text-right">Rate</th>
                <th className="border border-black p-1 w-14 text-right">Gross</th>
                <th className="border border-black p-1 w-10 text-right">Disc</th>
                <th className="border border-black p-1 w-14 text-right">Taxable<br/>Value</th>
                <th className="border border-black p-1 w-14 text-right">Basic<br/>Value</th>
                <th className="border border-black p-1 w-8">CGST<br/>%</th>
                <th className="border border-black p-1 w-12 text-right">CGST<br/>Value</th>
                <th className="border border-black p-1 w-8">SGST<br/>%</th>
                <th className="border border-black p-1 w-12 text-right">SGST<br/>Value</th>
                <th className="border border-black p-1 w-10 text-right">IGST</th>
                <th className="border border-black p-1 w-16 text-right">Total<br/>Amount</th>
              </tr>
            </thead>
            <tbody>
              {renderedItems.map((it: any) => (
                <tr key={it.index} className="border-b border-black">
                  <td className="border border-black p-1 text-center font-mono">{it.index}</td>
                  <td className="border border-black p-1">
                    <div className="font-bold text-black text-[9px]">{it.name}</div>
                    {it.serial && (
                      <div className="text-[8px] text-gray-700 font-mono">S.NO: {it.serial}</div>
                    )}
                    {it.sku && it.sku !== it.hsn && (
                      <div className="text-[7.5px] text-gray-500 font-mono">SKU: {it.sku}</div>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">{it.hsn}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{it.qty.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.rate.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.gross.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.discount.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.taxable.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.taxable.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{(it.gstRate / 2).toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.cgstVal.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{(it.gstRate / 2).toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{it.sgstVal.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-black">{it.lineTotal.toFixed(2)}</td>
                </tr>
              ))}

              {/* Service Charge Row */}
              {serviceCharge > 0 && (
                <tr className="border-b border-black bg-transparent">
                  <td className="border border-black p-1 text-center font-mono">{items.length + 1}</td>
                  <td className="border border-black p-1">
                    <div className="font-bold text-amber-900 text-[9px]">{serviceChargeDesc}</div>
                    <div className="text-[8px] text-gray-500 font-mono">SAC: 998713 (Labor / Service)</div>
                  </td>
                  <td className="border border-black p-1 text-center font-mono">998713</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">1.00</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceCharge.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceCharge.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceTaxable.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceTaxable.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">9.00</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceCgst.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">9.00</td>
                  <td className="border border-black p-1 text-right font-mono">{serviceSgst.toFixed(2)}</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono font-bold text-amber-900">{serviceTotal.toFixed(2)}</td>
                </tr>
              )}

              {/* Totals Row */}
              <tr className="bg-transparent font-bold border-t border-black">
                <td colSpan={3} className="border border-black p-1 text-center">Total</td>
                <td className="border border-black p-1 text-center font-mono">{totalQty.toFixed(2)}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-right font-mono">{totalGross.toFixed(2)}</td>
                <td className="border border-black p-1 text-right font-mono">{totalDisc.toFixed(2)}</td>
                <td className="border border-black p-1 text-right font-mono">{totalTaxable.toFixed(2)}</td>
                <td className="border border-black p-1 text-right font-mono">{totalTaxable.toFixed(2)}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-right font-mono">{totalCgstVal.toFixed(2)}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-right font-mono">{totalSgstVal.toFixed(2)}</td>
                <td className="border border-black p-1 text-right font-mono">0.00</td>
                <td className="border border-black p-1 text-right font-mono text-[9.5px] font-black">{totalLineAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary & Totals Box (Below Item Table) */}
        <div className="border border-black grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-black">
          {/* Left Side: Value in Words & PDC Terms */}
          <div className="md:col-span-7 p-2 flex flex-col justify-between space-y-2">
            <div>
              <div className="text-[9.5px]">
                <span className="font-bold">Invoice Value in Words :</span>{' '}
                <span className="font-bold italic text-black">₹ {numberToWordsRupees(calculatedGrandTotal)}</span>
              </div>
              <div className="text-[9px] mt-1.5">
                <span className="font-bold">Reverse Charge For this Invoice :</span> NA
              </div>
            </div>

            <div className="border border-gray-400 p-1.5 text-[8px] bg-transparent leading-snug">
              <div className="font-bold text-black">
                21 Days PDC from the date of billing/All payments Should be in the name of GNAPIKA COMPUTER SHOPEE ONLY
              </div>
              <div className="text-gray-600 italic">
                (Your Total Outstanding is including Post Dated Cheques)
              </div>
            </div>
          </div>

          {/* Right Side: Calculations */}
          <div className="md:col-span-5 p-2 text-[9.5px] space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-700">Taxable Amount :</span>
              <span className="font-mono font-semibold">₹ {totalTaxable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">CGST Value :</span>
              <span className="font-mono">₹ {totalCgstVal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">SGST Value :</span>
              <span className="font-mono">₹ {totalSgstVal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">IGST Value :</span>
              <span className="font-mono">₹ 0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Round off :</span>
              <span className="font-mono text-gray-700">₹ {roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-black text-[11px] font-black text-black">
              <span>Invoice Value :</span>
              <span className="font-mono">₹ {calculatedGrandTotal.toFixed(2)}</span>
            </div>

            {/* Payment & Dues Status */}
            {amountPaid > 0 && (
              <div className="flex justify-between text-[9px] text-emerald-800 font-semibold pt-0.5">
                <span>Payment Recd ({paymentMethod}) :</span>
                <span className="font-mono font-bold">₹ {amountPaid.toFixed(2)}</span>
              </div>
            )}
            {balanceDue > 0 ? (
              <div className="flex justify-between text-[9.5px] text-rose-800 font-black bg-transparent p-1 border border-rose-300 rounded mt-1">
                <span>Balance Due :</span>
                <span className="font-mono">₹ {balanceDue.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-[8.5px] text-emerald-800 font-bold pt-0.5">
                <span>Settlement Status :</span>
                <span>Fully Paid</span>
              </div>
            )}
          </div>
        </div>

        {/* RMA DETAILS (GST TAX SUMMARY) Box */}
        <div className="border border-black">
          <div className="font-bold text-[9px] px-2 py-0.5 bg-transparent border-b border-black uppercase tracking-wide">
            RMA DETAILS (GST TAX BREAKUP)
          </div>
          <table className="w-full border-collapse text-[8.5px]">
            <thead>
              <tr className="bg-transparent border-b border-black font-bold text-center text-[8px]">
                <th rowSpan={2} className="border-r border-black p-1 w-1/4">HSN/SAC</th>
                <th rowSpan={2} className="border-r border-black p-1 w-1/5 text-right">Taxable</th>
                <th colSpan={2} className="border-r border-black p-1 w-1/6">CGST</th>
                <th colSpan={2} className="border-r border-black p-1 w-1/6">SGST</th>
                <th colSpan={2} className="p-1 w-1/6">IGST</th>
              </tr>
              <tr className="bg-transparent border-b border-black font-bold text-center text-[7.5px]">
                <th className="border-r border-black p-0.5">Rate</th>
                <th className="border-r border-black p-0.5 text-right">Amount</th>
                <th className="border-r border-black p-0.5">Rate</th>
                <th className="border-r border-black p-0.5 text-right">Amount</th>
                <th className="border-r border-black p-0.5">Rate</th>
                <th className="p-0.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hsnMap).map(([hsn, val]) => (
                <tr key={hsn} className="border-b border-black">
                  <td className="border-r border-black p-1 font-mono font-semibold">{hsn}</td>
                  <td className="border-r border-black p-1 text-right font-mono">{val.taxable.toFixed(2)}</td>
                  <td className="border-r border-black p-1 text-center font-mono">9.00</td>
                  <td className="border-r border-black p-1 text-right font-mono">{val.cgst.toFixed(2)}</td>
                  <td className="border-r border-black p-1 text-center font-mono">9.00</td>
                  <td className="border-r border-black p-1 text-right font-mono">{val.sgst.toFixed(2)}</td>
                  <td className="border-r border-black p-1 text-center font-mono">0.00</td>
                  <td className="p-1 text-right font-mono">0.00</td>
                </tr>
              ))}
              <tr className="bg-transparent font-bold border-t border-black">
                <td className="border-r border-black p-1 text-center">Total</td>
                <td className="border-r border-black p-1 text-right font-mono">{totalTaxable.toFixed(2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1 text-right font-mono">{totalCgstVal.toFixed(2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1 text-right font-mono">{totalSgstVal.toFixed(2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="p-1 text-right font-mono">0.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Box: Terms & Signature */}
        <div className="border border-black p-2 space-y-2">
          {/* Time & Prepared By */}
          <div className="flex justify-between text-[8.5px]">
            <span>Time: <strong>{timeStr}</strong></span>
            <span>Prepared By: <strong>Gnapika Computer Shopee</strong></span>
          </div>

          {/* Terms & Authorized Signatory */}
          <div className="flex justify-between items-end gap-4 pt-1">
            <div className="w-2/3">
              <div className="font-bold underline text-[9px] mb-0.5">Terms &amp; Conditions:</div>
              <ol className="list-decimal pl-3.5 text-[8px] leading-snug space-y-0.5 text-gray-800">
                <li>No warranty for burns or physical damage.</li>
                <li>Goods Once sold will not be taken back.</li>
                <li>Interest will be charged@24% pa. If this payment not made on or before due date Subject to Vijayawada Jurisdiction.</li>
                <li>Eleven months warranty as per manufacturers.</li>
              </ol>
            </div>

            <div className="w-1/3 text-right">
              <div className="text-[9px] font-bold">For {SHOP_DETAILS.name}</div>
              <div className="h-9"></div>
              <div className="text-[9px] font-bold border-t border-black inline-block pt-0.5 min-w-[130px] text-center">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
