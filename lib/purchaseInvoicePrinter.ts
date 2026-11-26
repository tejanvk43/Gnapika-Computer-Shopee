// lib/purchaseInvoicePrinter.ts
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from './formatters'

export function printPurchaseInvoice(purchaseInvoice: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const snapshot = purchaseInvoice.invoice_snapshot || purchaseInvoice
  const supplier = snapshot.supplier || purchaseInvoice.suppliers || {}
  const items = snapshot.items || purchaseInvoice.purchase_receipt_items || []
  const totals = snapshot.totals || {}

  const invoiceNumber = snapshot.invoice_number || purchaseInvoice.receipt_number || 'PUR-000000'
  const dateStr = snapshot.receipt_date || purchaseInvoice.receipt_date || new Date().toISOString()
  const invoiceDate = new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const supplierName = supplier.name || 'Vendor'
  const supplierPhone = supplier.phone || '-'
  const supplierGstin = supplier.gstin || '-'
  const supplierAddress = supplier.address || '-'

  const taxableTotal = parseFloat(totals.taxable_total || totals.gross_total || 0)
  const cgstTotal = parseFloat(totals.cgst_total || 0)
  const sgstTotal = parseFloat(totals.sgst_total || 0)
  const igstTotal = parseFloat(totals.igst_total || 0)
  const grandTotal = parseFloat(totals.grand_total || (taxableTotal + cgstTotal + sgstTotal + igstTotal))

  const itemsHtml = items
    .map((item: any, idx: number) => {
      const pName = item.product_name || item.products?.name || item.name || 'Product'
      const hsn = item.hsn_code || '8471'
      const qty = parseFloat(item.quantity) || 1
      const rate = parseFloat(item.rate || item.purchase_price) || 0
      const taxable = parseFloat(item.taxable_amount || (qty * rate))
      const cgstAmt = parseFloat(item.cgst_amount || 0)
      const sgstAmt = parseFloat(item.sgst_amount || 0)
      const igstAmt = parseFloat(item.igst_amount || 0)
      const lineTotal = parseFloat(item.total_amount || (taxable + cgstAmt + sgstAmt + igstAmt))
      const serials = Array.isArray(item.serial_numbers) ? item.serial_numbers : []

      const serialsHtml = serials.length > 0
        ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
             <b>S/N:</b> ${serials.join(', ')}
           </div>`
        : ''

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; text-align: center; font-size: 9pt;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-size: 9.5pt;">
            <div style="font-weight: 600; color: #0f172a;">${pName}</div>
            ${serialsHtml}
          </td>
          <td style="padding: 6px 8px; text-align: center; font-size: 9pt;">${hsn}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 600; font-size: 9pt;">${qty}</td>
          <td style="padding: 6px 8px; text-align: right; font-size: 9pt;">₹${rate.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-size: 9pt;">₹${taxable.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-size: 9pt;">₹${cgstAmt.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-size: 9pt;">₹${sgstAmt.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-size: 9pt;">₹${igstAmt.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; font-size: 9.5pt;">₹${lineTotal.toFixed(2)}</td>
        </tr>
      `
    })
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill - ${invoiceNumber} - ${SHOP_DETAILS.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 10pt;
      line-height: 1.35;
    }
    .invoice-card {
      max-width: 100%;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .divider {
      height: 2px;
      background: #0f172a;
      margin: 6px 0 10px 0;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .info-cell {
      padding: 8px 12px;
      vertical-align: top;
      font-size: 9pt;
      width: 50%;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 7px 8px;
    }
    .totals-table {
      width: 48%;
      margin-left: auto;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 4px 8px;
      font-size: 9.5pt;
    }
    .grand-total-row {
      background: #f1f5f9;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-weight: 800;
      font-size: 11pt;
    }
    .amount-words {
      margin-top: 8px;
      padding: 6px 10px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      font-size: 9pt;
    }
    .footer-section {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <h1 style="margin: 0; font-size: 17pt; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
            ${SHOP_DETAILS.name}
          </h1>
          <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
            ${SHOP_DETAILS.tagline}
          </div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
            ${SHOP_DETAILS.address}, ${SHOP_DETAILS.city}
          </div>
          <div style="font-size: 8.5pt; font-weight: 600; color: #334155; margin-top: 2px;">
            Phone: ${SHOP_DETAILS.phone} | GSTIN: <b>${SHOP_DETAILS.gstin}</b>
          </div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div class="badge" style="background: #2563eb; color: #ffffff; padding: 4px 10px; font-size: 9pt;">
            PURCHASE BILL & INWARD
          </div>
          <div style="font-size: 13pt; font-weight: 800; color: #0f172a; margin-top: 4px;">
            ${invoiceNumber}
          </div>
          <div style="font-size: 9pt; color: #475569; margin-top: 2px;">
            Date: <b>${invoiceDate}</b>
          </div>
        </td>
      </tr>
    </table>

    <div class="divider"></div>

    <!-- Vendor & Inward Meta -->
    <table class="info-grid">
      <tr>
        <td class="info-cell" style="border-right: 1px solid #e2e8f0;">
          <div style="font-size: 8pt; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 2px;">
            Vendor / Supplier Information:
          </div>
          <div style="font-size: 11pt; font-weight: 700; color: #0f172a;">${supplierName}</div>
          <div style="margin-top: 2px; color: #334155;"><b>GSTIN:</b> ${supplierGstin}</div>
          <div style="color: #334155;"><b>Phone:</b> ${supplierPhone}</div>
          <div style="color: #475569; margin-top: 2px;"><b>Address:</b> ${supplierAddress}</div>
        </td>
        <td class="info-cell">
          <div style="font-size: 8pt; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 2px;">
            Store & Inward Details:
          </div>
          <div><b>Recipient:</b> ${SHOP_DETAILS.name}</div>
          <div><b>Warehouse:</b> Main Store (Vijayawada)</div>
          <div><b>Receipt Status:</b> <span style="color: #16a34a; font-weight: 700;">RECEIVED & INVENTORIED</span></div>
          <div style="color: #64748b; font-size: 8pt; margin-top: 4px;">Verified by store inventory system</div>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 32%; text-align: left;">Product / Item Description</th>
          <th style="width: 8%; text-align: center;">HSN</th>
          <th style="width: 6%; text-align: center;">Qty</th>
          <th style="width: 9%; text-align: right;">Rate</th>
          <th style="width: 10%; text-align: right;">Taxable</th>
          <th style="width: 7%; text-align: right;">CGST</th>
          <th style="width: 7%; text-align: right;">SGST</th>
          <th style="width: 7%; text-align: right;">IGST</th>
          <th style="width: 10%; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 6px;">
      <div style="width: 50%;">
        <div class="amount-words">
          <span style="font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount in Words:</span>
          <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">
            ${numberToWordsRupees(grandTotal)}
          </div>
        </div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 10px;">
          Note: This document acknowledges receipt of stock into Gnapika Computer Shopee inventory. All recorded serial numbers are uniquely verified.
        </div>
      </div>

      <table class="totals-table">
        <tr>
          <td>Taxable Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${taxableTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST Total:</td>
          <td style="text-align: right;">₹${cgstTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST Total:</td>
          <td style="text-align: right;">₹${sgstTotal.toFixed(2)}</td>
        </tr>
        ${igstTotal > 0 ? `
        <tr>
          <td>IGST Total:</td>
          <td style="text-align: right;">₹${igstTotal.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="grand-total-row">
          <td style="padding: 7px 8px;">Net Purchase Amount:</td>
          <td style="text-align: right; padding: 7px 8px; color: #0f172a;">₹${grandTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Signatures -->
    <table style="width: 100%; margin-top: 35px; border-collapse: collapse;">
      <tr>
        <td style="width: 50%; text-align: left; vertical-align: bottom;">
          <div style="border-top: 1px dashed #94a3b8; width: 180px; padding-top: 4px; font-size: 8.5pt; color: #64748b;">
            Supplier / Carrier Signature
          </div>
        </td>
        <td style="width: 50%; text-align: right; vertical-align: bottom;">
          <div style="font-weight: 700; font-size: 9pt; margin-bottom: 30px;">
            For ${SHOP_DETAILS.name}
          </div>
          <div style="border-top: 1px dashed #94a3b8; width: 180px; margin-left: auto; padding-top: 4px; font-size: 8.5pt; color: #64748b;">
            Authorized Store In-charge
          </div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
