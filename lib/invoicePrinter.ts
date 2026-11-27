// lib/invoicePrinter.ts
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from './formatters'
import { GNAPIKA_LOGO_BASE64, GNAPIKA_WATERMARK_BASE64 } from './brandAssets'

export function printTaxInvoice(invoice: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

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
  const date = invoiceDateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = invoiceDateObj.toLocaleTimeString('en-IN', {
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

  // Accumulate totals across line items
  let totalQty = 0
  let totalGross = 0
  let totalDisc = 0
  let totalTaxable = 0
  let totalCgstVal = 0
  let totalSgstVal = 0
  let totalLineAmount = 0

  // Group by HSN for RMA / GST tax breakup table
  const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number }> = {}

  const itemRowsHtml = items.map((it: any, index: number) => {
    const name = it.name || it.products?.name || 'Computer Hardware / Peripherals'
    const sku = it.sku || it.products?.sku || ''
    const serial = it.serial_number || it.barcode_value || it.serial || ''
    const hsn = it.hsn_code || (/^\d{4,8}$/.test(sku) ? sku : '84716040')
    const qty = parseFloat(it.quantity) || 1
    const rate = parseFloat(it.unit_price || it.unit_price_snapshot || 0)
    const discount = parseFloat(it.discount_applied || it.discount || 0)
    const gross = rate * qty
    const taxable = Math.max(0, gross - discount)
    const gstRate = parseFloat(it.gst_rate_snapshot || 18)
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

    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>
          <div style="font-weight: 700;">${name}</div>
          ${serial ? `<div style="font-size: 8px; color: #333; font-family: monospace;">S.NO: ${serial}</div>` : ''}
          ${sku && sku !== hsn ? `<div style="font-size: 8px; color: #555;">SKU: ${sku}</div>` : ''}
        </td>
        <td style="text-align: center; font-family: monospace;">${hsn}</td>
        <td style="text-align: center; font-weight: 700;">${qty.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${rate.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${gross.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${discount.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${taxable.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${taxable.toFixed(2)}</td>
        <td style="text-align: center;">${(gstRate / 2).toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${cgstVal.toFixed(2)}</td>
        <td style="text-align: center;">${(gstRate / 2).toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${sgstVal.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">0.00</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700;">${lineTotal.toFixed(2)}</td>
      </tr>
    `
  }).join('')

  // Include Service Charge row if applicable
  let serviceRowHtml = ''
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

    serviceRowHtml = `
      <tr style="background: transparent;">
        <td style="text-align: center;">${items.length + 1}</td>
        <td>
          <div style="font-weight: 700; color: #8a3b0f;">${serviceChargeDesc}</div>
          <div style="font-size: 8px; color: #555;">Labor / Service Charges</div>
        </td>
        <td style="text-align: center; font-family: monospace;">${sHsn}</td>
        <td style="text-align: center; font-weight: 700;">1.00</td>
        <td style="text-align: right; font-family: monospace;">${serviceTaxable.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${serviceTaxable.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">0.00</td>
        <td style="text-align: right; font-family: monospace;">${serviceTaxable.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${serviceTaxable.toFixed(2)}</td>
        <td style="text-align: center;">9.00</td>
        <td style="text-align: right; font-family: monospace;">${serviceCgst.toFixed(2)}</td>
        <td style="text-align: center;">9.00</td>
        <td style="text-align: right; font-family: monospace;">${serviceSgst.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">0.00</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #8a3b0f;">${serviceTotal.toFixed(2)}</td>
      </tr>
    `
  }

  // RMA / GST Table Rows
  const rmaRowsHtml = Object.entries(hsnMap).map(([hsn, val]) => `
    <tr>
      <td style="padding: 3px 6px; font-family: monospace; font-weight: 600;">${hsn}</td>
      <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${val.taxable.toFixed(2)}</td>
      <td style="padding: 3px 6px; text-align: center;">9.00</td>
      <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${val.cgst.toFixed(2)}</td>
      <td style="padding: 3px 6px; text-align: center;">9.00</td>
      <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${val.sgst.toFixed(2)}</td>
      <td style="padding: 3px 6px; text-align: center;">0.00</td>
      <td style="padding: 3px 6px; text-align: right; font-family: monospace;">0.00</td>
    </tr>
  `).join('')

  // Round off calculation
  const calculatedGrandTotal = Math.round(totalLineAmount * 100) / 100
  const roundedTarget = Math.round(calculatedGrandTotal)
  const roundOff = Math.round((roundedTarget - calculatedGrandTotal) * 100) / 100

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${invoiceNumber} - ${SHOP_DETAILS.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 9.5px;
            line-height: 1.25;
          }
          .invoice-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            position: relative;
            background: #ffffff;
            min-height: 275mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          /* Watermark Logo */
          .watermark-bg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 78%;
            max-width: 580px;
            opacity: 0.12;
            pointer-events: none;
            z-index: 0;
          }
          .content-layer {
            position: relative;
            z-index: 1;
          }
          .box-border {
            border: 1px solid #000000;
          }
          .border-b {
            border-bottom: 1px solid #000000;
          }
          .border-t {
            border-top: 1px solid #000000;
          }
          .border-r {
            border-right: 1px solid #000000;
          }
          .border-l {
            border-left: 1px solid #000000;
          }
          .item-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
          }
          .item-table th, .item-table td {
            border: 1px solid #000000;
            padding: 3px 2px;
          }
          .item-table th {
            background-color: transparent;
            font-weight: 700;
            text-align: center;
            font-size: 8px;
            line-height: 1.1;
          }
          .rma-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
          }
          .rma-table th, .rma-table td {
            border: 1px solid #000000;
          }
          .rma-table th {
            background-color: transparent;
            font-weight: 700;
            text-align: center;
            font-size: 8px;
          }
          .bold { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Background Watermark Logo -->
          <img src="${GNAPIKA_WATERMARK_BASE64}" class="watermark-bg" alt="Watermark" />

          <div class="content-layer">
            

            <!-- Header Box -->
            <div class="box-border" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="flex-shrink: 0; width: 320px; max-width: 48%;">
                <img src="${GNAPIKA_LOGO_BASE64}" style="width: 100%; height: auto; max-height: 72px; object-fit: contain; display: block;" alt="Gnapika Computer Shopee" />
              </div>
              <div style="text-align: left; font-size: 8.8px; line-height: 1.35; color: #000000;">
                <div>D.No. 38-1-7, Opposite Indira Towers, American Hospital Road, MG Road</div>
                <div>(near P.W.D Grounds / Rythu Bazar), Vijayawada</div>
                <div style="margin-top: 6px;">Email: ${SHOP_DETAILS.email}</div>
                <div>Phone No: &nbsp;${SHOP_DETAILS.phone}</div>
                <div>GSTIN : &nbsp; ${SHOP_DETAILS.gstin}</div>
              </div>
            </div>

            <!-- Tax Invoice Banner Title -->
            <div style="text-align: center; font-weight: 900; font-size: 14px; padding: 6px 0; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
              Invoice
            </div>

            <!-- 3-Column Party & Invoice Details Box -->
            <div class="box-border" style="margin-top: 8px;">
              <div style="display: flex;">
                <!-- Column 1: Bill To Party -->
                <div style="width: 35%; padding: 5px 7px;" class="border-r">
                  <div class="bold" style="font-size: 10px; text-decoration: underline; margin-bottom: 2px;">Bill To Party:</div>
                  <div style="font-size: 8.5px; color: #333;">Party Name &amp; Address:</div>
                  <div class="bold" style="font-size: 11px; margin-top: 1px;">${customerName}</div>
                  <div style="font-size: 9px; margin-top: 1px;">${customerAddress}</div>
                </div>

                <!-- Column 2: Ship To Party -->
                <div style="width: 35%; padding: 5px 7px;" class="border-r">
                  <div class="bold" style="font-size: 10px; text-decoration: underline; margin-bottom: 2px;">Ship To Party:</div>
                  <div style="font-size: 8.5px; color: #333;">Party Name &amp; Address:</div>
                  <div class="bold" style="font-size: 11px; margin-top: 1px;">${customerName}</div>
                  <div style="font-size: 9px; margin-top: 1px;">${customerAddress}</div>
                </div>

                <!-- Column 3: Invoice Info -->
                <div style="width: 30%; padding: 5px 7px; font-size: 9px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 1px 0; color: #333;">Invoice No:</td>
                      <td style="padding: 1px 0; text-align: right; font-family: monospace; font-weight: 700; color: #000;">${invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 1px 0; color: #333;">Date :</td>
                      <td style="padding: 1px 0; text-align: right; font-family: monospace; font-weight: 700;">${date}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- ACK / IRN Row -->
              <div class="border-t" style="display: flex; justify-content: space-between; padding: 2px 8px; font-size: 8.5px; background: transparent;">
                <span>ACK No : </span>
                <span>Ack Dt : </span>
                <span>IRN No : </span>
              </div>
            </div>

            <!-- Items Table (15 Columns Exactly Per Reference Mockup) -->
            <table class="item-table" style="margin-top: 10px;">
              <thead>
                <tr>
                  <th style="width: 24px;">S<br/>No</th>
                  <th style="width: 180px;">Desc of goods<br/>Product Name</th>
                  <th style="width: 55px;">HSN/SAC</th>
                  <th style="width: 30px;">QTY</th>
                  <th style="width: 45px;">Rate</th>
                  <th style="width: 48px;">Gross</th>
                  <th style="width: 38px;">Disc</th>
                  <th style="width: 50px;">Taxable<br/>Value</th>
                  <th style="width: 50px;">Basic<br/>Value</th>
                  <th style="width: 32px;">CGST<br/>%</th>
                  <th style="width: 42px;">CGST<br/>Value</th>
                  <th style="width: 32px;">SGST<br/>%</th>
                  <th style="width: 42px;">SGST<br/>Value</th>
                  <th style="width: 35px;">IGST</th>
                  <th style="width: 55px;">Total<br/>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
                ${serviceRowHtml}
                <!-- Total Row -->
                <tr style="font-weight: 700; background: transparent;">
                  <td colspan="3" style="text-align: center;">Total</td>
                  <td style="text-align: center; font-family: monospace;">${totalQty.toFixed(2)}</td>
                  <td></td>
                  <td style="text-align: right; font-family: monospace;">${totalGross.toFixed(2)}</td>
                  <td style="text-align: right; font-family: monospace;">${totalDisc.toFixed(2)}</td>
                  <td style="text-align: right; font-family: monospace;">${totalTaxable.toFixed(2)}</td>
                  <td style="text-align: right; font-family: monospace;">${totalTaxable.toFixed(2)}</td>
                  <td></td>
                  <td style="text-align: right; font-family: monospace;">${totalCgstVal.toFixed(2)}</td>
                  <td></td>
                  <td style="text-align: right; font-family: monospace;">${totalSgstVal.toFixed(2)}</td>
                  <td style="text-align: right; font-family: monospace;">0.00</td>
                  <td style="text-align: right; font-family: monospace; font-size: 9.5px; font-weight: 800;">${totalLineAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Summary & Totals Box (Below Item Table) -->
            <div class="box-border" style="margin-top: 10px; display: flex;">
              <!-- Left Side: Value in Words & PDC Terms -->
              <div style="width: 58%; padding: 6px 8px;" class="border-r">
                <div style="font-size: 9.5px;">
                  <span class="bold">Invoice Value in Words :</span>
                  <span style="font-weight: 700; font-style: italic;">₹ ${numberToWordsRupees(calculatedGrandTotal)}</span>
                </div>
                <div style="font-size: 9px; margin-top: 6px;">
                  <span class="bold">Reverse Charge For this Invoice :</span> NA
                </div>
                <div style="margin-top: 8px; border: 1px solid #777; padding: 4px 6px; font-size: 8px; line-height: 1.3; background: transparent;">
                  <div class="bold">21 Days PDC from the date of billing/All payments Should be in the name of GNAPIKA COMPUTER SHOPEE ONLY</div>
                  <div style="color: #444; font-style: italic;">(Your Total Outstanding is including Post Dated Cheques)</div>
                </div>
              </div>

              <!-- Right Side: Calculations -->
              <div style="width: 42%; padding: 5px 8px; font-size: 9.5px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 1.5px 0; color: #222;">Taxable Amount :</td>
                    <td style="padding: 1.5px 0; text-align: right; font-family: monospace; font-weight: 600;">₹ ${totalTaxable.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1.5px 0; color: #222;">CGST Value :</td>
                    <td style="padding: 1.5px 0; text-align: right; font-family: monospace;">₹ ${totalCgstVal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1.5px 0; color: #222;">SGST Value :</td>
                    <td style="padding: 1.5px 0; text-align: right; font-family: monospace;">₹ ${totalSgstVal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 1.5px 0; color: #222;">IGST Value :</td>
                    <td style="padding: 1.5px 0; text-align: right; font-family: monospace;">₹ 0.00</td>
                  </tr>
                  <tr>
                    <td style="padding: 1.5px 0; color: #222;">Round off :</td>
                    <td style="padding: 1.5px 0; text-align: right; font-family: monospace; color: #444;">₹ ${roundOff >= 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 1px solid #000; font-size: 11px;">
                    <td style="padding: 3px 0; font-weight: 900;">Invoice Value :</td>
                    <td style="padding: 3px 0; text-align: right; font-family: monospace; font-weight: 900; color: #000;">₹ ${calculatedGrandTotal.toFixed(2)}</td>
                  </tr>
                  ${amountPaid > 0 ? `
                  <tr style="font-size: 9px; color: #166534;">
                    <td style="padding: 1px 0; font-weight: 600;">Payment Recd (${paymentMethod}) :</td>
                    <td style="padding: 1px 0; text-align: right; font-family: monospace; font-weight: 700;">₹ ${amountPaid.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${balanceDue > 0 ? `
                  <tr style="font-size: 9.5px; color: #b91c1c; font-weight: 900; background: transparent;">
                    <td style="padding: 2px 4px;">Balance Due :</td>
                    <td style="padding: 2px 4px; text-align: right; font-family: monospace;">₹ ${balanceDue.toFixed(2)}</td>
                  </tr>
                  ` : `
                  <tr style="font-size: 8.5px; color: #166534;">
                    <td style="padding: 1px 0;">Settlement :</td>
                    <td style="padding: 1px 0; text-align: right; font-weight: 700;">Fully Paid</td>
                  </tr>
                  `}
                </table>
              </div>
            </div>

            <!-- RMA DETAILS (GST TAX SUMMARY) Box -->
            <div class="box-border" style="margin-top: 10px;">
              <div style="font-weight: 800; font-size: 9px; padding: 2px 6px; background: transparent; border-bottom: 1px solid #000; text-transform: uppercase;">
                RMA DETAILS (GST TAX BREAKUP)
              </div>
              <table class="rma-table">
                <thead>
                  <tr>
                    <th rowspan="2" style="width: 25%;">HSN/SAC</th>
                    <th rowspan="2" style="width: 20%;">Taxable</th>
                    <th colspan="2" style="width: 18%;">CGST</th>
                    <th colspan="2" style="width: 18%;">SGST</th>
                    <th colspan="2" style="width: 19%;">IGST</th>
                  </tr>
                  <tr>
                    <th style="width: 8%;">Rate</th>
                    <th style="width: 10%;">Amount</th>
                    <th style="width: 8%;">Rate</th>
                    <th style="width: 10%;">Amount</th>
                    <th style="width: 8%;">Rate</th>
                    <th style="width: 11%;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rmaRowsHtml}
                  <tr style="font-weight: 700; background: transparent;">
                    <td style="padding: 3px 6px; text-align: center;">Total</td>
                    <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${totalTaxable.toFixed(2)}</td>
                    <td></td>
                    <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${totalCgstVal.toFixed(2)}</td>
                    <td></td>
                    <td style="padding: 3px 6px; text-align: right; font-family: monospace;">${totalSgstVal.toFixed(2)}</td>
                    <td></td>
                    <td style="padding: 3px 6px; text-align: right; font-family: monospace;">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer Box: Terms & Signature -->
            <div class="box-border" style="margin-top: 10px; padding: 6px 8px;">
              <!-- Meta Row -->
              <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-bottom: 4px;">
                <span>Time: <strong>${time}</strong></span>
                <span>Prepared By: <strong>Gnapika Computer Shopee</strong></span>
              </div>

              

              <!-- Terms & Signatory Grid -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;">
                <div style="width: 62%;">
                  <div class="bold" style="font-size: 9px; text-decoration: underline; margin-bottom: 2px;">Terms &amp; Conditions:</div>
                  <ol style="margin: 0; padding-left: 14px; font-size: 8px; line-height: 1.35; color: #111;">
                    <li>No warranty for burns or physical damage.</li>
                    <li>Goods Once sold will not be taken back.</li>
                    <li>Interest will be charged@24% pa. If this payment not made on or before due date Subject to Vijayawada Jurisdiction.</li>
                    <li>Eleven months warranty as per manufacturers.</li>
                  </ol>
                </div>

                <div style="width: 38%; text-align: right;">
                  <div style="font-size: 9px; font-weight: 700;">For ${SHOP_DETAILS.name}</div>
                  <div style="height: 38px;"></div>
                  <div style="font-size: 9px; font-weight: 700; border-top: 1px solid #000; display: inline-block; padding-top: 2px; min-width: 140px; text-align: center;">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
