// lib/invoicePrinter.ts
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from './formatters'

export function printTaxInvoice(invoice: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const grandTotal = parseFloat(invoice.total_grand_amount || invoice.grand_total || 0)
  const items = invoice.invoice_items && invoice.invoice_items.length > 0
    ? invoice.invoice_items
    : (invoice.items || invoice.invoice_snapshot?.items || [])

  const subtotal = invoice.subtotal
    ? parseFloat(invoice.subtotal)
    : (invoice.invoice_snapshot?.subtotal
      ? parseFloat(invoice.invoice_snapshot.subtotal)
      : items.reduce((sum: number, it: any) => {
          const qty = parseFloat(it.quantity) || 1
          const unitPrice = parseFloat(it.unit_price || it.unit_price_snapshot || 0)
          const discount = parseFloat(it.discount_applied || it.discount || 0)
          return sum + Math.max(0, (unitPrice * qty) - discount)
        }, 0) || (grandTotal / 1.18))

  const gstAmount = invoice.gst_amount
    ? parseFloat(invoice.gst_amount)
    : (invoice.invoice_snapshot?.gst_amount
      ? parseFloat(invoice.invoice_snapshot.gst_amount)
      : (grandTotal - subtotal))

  const cgstAmount = gstAmount / 2
  const sgstAmount = gstAmount / 2

  const customerName = invoice.customer?.customer_name || invoice.customers?.customer_name || invoice.invoice_snapshot?.customer?.customer_name || 'Counter Sale / Walk-in Customer'
  const customerPhone = invoice.customer?.phone_number || invoice.customers?.phone_number || invoice.invoice_snapshot?.customer?.phone_number || '-'
  const customerAltPhone = invoice.customer?.alt_phone_number || invoice.customers?.alt_phone_number || invoice.invoice_snapshot?.customer?.alt_phone_number || ''
  const customerAddress = invoice.customer?.address || invoice.customers?.address || invoice.invoice_snapshot?.customer?.address || ''
  const customerGstin = invoice.customer?.gstin || invoice.customers?.gstin || invoice.invoice_snapshot?.customer?.gstin || ''

  const invoiceNumber = invoice.invoice_number || 'INV-000000'
  const paymentMethod = invoice.payment_method || 'Cash'
  const date = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
  const time = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })

  const rowsHtml = items.map((it: any, index: number) => {
    const name = it.name || it.products?.name || 'Computer Hardware / Peripherals'
    const sku = it.sku || it.products?.sku || '-'
    const qty = parseFloat(it.quantity) || 1
    const unitPrice = parseFloat(it.unit_price || it.unit_price_snapshot || 0)
    const discount = parseFloat(it.discount_applied || it.discount || 0)
    // Base taxable value = (unitPrice * qty) - discount
    const taxable = parseFloat(it.taxable_amount) || Math.max(0, (unitPrice * qty) - discount)
    const gstRate = parseFloat(it.gst_rate_snapshot || 18)
    const itemGst = (taxable * gstRate) / 100
    // Gross Total with GST: Taxable + GST
    const lineTotalWithTax = taxable + itemGst

    return `
      <tr>
        <td style="text-align: center; font-family: monospace; color: #64748b; padding: 6px 4px;">${index + 1}</td>
        <td style="padding: 6px 6px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${name}</div>
          <div style="font-size: 9.5px; color: #64748b; font-family: monospace;">HSN/SKU: ${sku}</div>
        </td>
        <td style="text-align: center; font-weight: 700; padding: 6px 4px;">${qty}</td>
        <td style="text-align: right; font-family: monospace; padding: 6px 4px;">${formatCurrency(unitPrice)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 600; padding: 6px 4px;">${formatCurrency(taxable)}</td>
        <td style="text-align: right; font-family: monospace; color: #475569; padding: 6px 4px;">
          ${gstRate}%<br/><span style="font-size: 9px; color: #64748b;">(${formatCurrency(itemGst)})</span>
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f172a; padding: 6px 6px;">${formatCurrency(lineTotalWithTax)}</td>
      </tr>
    `
  }).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Tax Invoice - ${invoiceNumber} - ${SHOP_DETAILS.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.35;
          }
          .invoice-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px 18px;
            background: #ffffff;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .shop-title {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin: 0 0 2px 0;
          }
          .shop-tagline {
            font-size: 10px;
            font-weight: 600;
            color: #2563eb;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .shop-contact {
            font-size: 10px;
            color: #475569;
            line-height: 1.35;
          }
          .badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            font-size: 10.5px;
          }
          .cust-grid {
            display: grid;
            grid-template-columns: 1.3fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
          }
          .label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 1px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10.5px;
          }
          .items-table th {
            background: #f1f5f9;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #94a3b8;
            padding: 6px 4px;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9.5px;
            color: #334155;
          }
          .items-table td {
            border-bottom: 1px solid #e2e8f0;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 14px;
            border-top: 1.5px solid #cbd5e1;
            padding-top: 10px;
            margin-bottom: 12px;
          }
          .calc-table {
            width: 100%;
            font-size: 10.5px;
          }
          .calc-table td {
            padding: 2.5px 0;
          }
          .grand-total-row {
            border-top: 2px solid #0f172a;
            font-size: 13.5px;
            font-weight: 900;
            color: #0f172a;
            padding-top: 5px !important;
          }
          .terms {
            font-size: 9px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 8px;
          }
          .terms ol {
            margin: 2px 0 0 12px;
            padding: 0;
          }
          .terms li {
            margin-bottom: 1.5px;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 16px;
            padding-top: 8px;
            font-size: 10px;
          }
          .sig-box {
            text-align: center;
            width: 180px;
            border-top: 1px dashed #94a3b8;
            padding-top: 3px;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: top; width: 62%;">
                <div class="badge">TAX INVOICE</div>
                <div class="shop-title">${SHOP_DETAILS.name}</div>
                <div class="shop-tagline">${SHOP_DETAILS.tagline}</div>
                <div class="shop-contact">
                  ${SHOP_DETAILS.address}, ${SHOP_DETAILS.city}<br/>
                  Phone: <strong>${SHOP_DETAILS.phone}</strong> | Email: ${SHOP_DETAILS.email}<br/>
                  <strong>GSTIN: ${SHOP_DETAILS.gstin}</strong> | State: ${SHOP_DETAILS.state} (${SHOP_DETAILS.stateCode})
                </div>
              </td>
              <td style="vertical-align: top; text-align: right; width: 38%;">
                <div class="meta-box" style="text-align: right;">
                  <div class="label">Invoice No</div>
                  <div style="font-family: monospace; font-size: 14px; font-weight: 900; color: #2563eb;">${invoiceNumber}</div>
                  <div style="margin-top: 4px;">
                    <span class="label">Date:</span> <strong>${date} ${time}</strong>
                  </div>
                  <div style="margin-top: 2px;">
                    <span class="label">Payment Mode:</span> <strong>${paymentMethod}</strong> (PAID)
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Customer Info -->
          <div class="cust-grid">
            <div>
              <div class="label">Billed To (Customer Details):</div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 1px;">${customerName}</div>
              <div style="color: #475569; margin-top: 1px;">Phone: <strong>${customerPhone}</strong> ${customerAltPhone ? `/ ${customerAltPhone}` : ''}</div>
              ${customerAddress ? `<div style="color: #64748b; margin-top: 1px;">Address: ${customerAddress}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <div class="label">Tax Information:</div>
              <div style="font-family: monospace; font-weight: 700; margin-top: 1px;">GSTIN: ${customerGstin || 'Unregistered / Consumer'}</div>
              <div style="color: #64748b; margin-top: 1px;">Place of Supply: Andhra Pradesh (37)</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description</th>
                <th style="width: 45px; text-align: center;">Qty</th>
                <th style="width: 75px; text-align: right;">Rate</th>
                <th style="width: 85px; text-align: right;">Taxable Val</th>
                <th style="width: 75px; text-align: right;">GST (18%)</th>
                <th style="width: 85px; text-align: right;">Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div class="summary-grid">
            <!-- Left: Amount in words & Bank info -->
            <div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
                <div class="label">Amount in Words:</div>
                <div style="font-weight: 700; color: #0f172a; font-style: italic; font-size: 10.5px;">${numberToWordsRupees(grandTotal)}</div>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 10px; color: #475569;">
                <div class="label">Bank &amp; Payment Details:</div>
                <div>Bank: <strong>${SHOP_DETAILS.bankDetails.bankName}</strong> | A/c No: <strong style="font-family: monospace;">${SHOP_DETAILS.bankDetails.accountNo}</strong></div>
                <div>IFSC: <strong style="font-family: monospace;">${SHOP_DETAILS.bankDetails.ifsc}</strong> | UPI: <strong style="color: #2563eb;">${SHOP_DETAILS.bankDetails.upiId}</strong></div>
              </div>
            </div>

            <!-- Right: Calculations -->
            <div>
              <table class="calc-table">
                <tr>
                  <td style="color: #475569;">Taxable Amount (Subtotal):</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style="color: #475569;">Central GST (CGST 9%):</td>
                  <td style="text-align: right; font-family: monospace;">${formatCurrency(cgstAmount)}</td>
                </tr>
                <tr>
                  <td style="color: #475569;">State GST (SGST 9%):</td>
                  <td style="text-align: right; font-family: monospace;">${formatCurrency(sgstAmount)}</td>
                </tr>
                <tr>
                  <td style="color: #475569;">Total GST (18%):</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(gstAmount)}</td>
                </tr>
                <tr class="grand-total-row">
                  <td>Grand Total:</td>
                  <td style="text-align: right; font-family: monospace; color: #2563eb;">${formatCurrency(grandTotal)}</td>
                </tr>
                <tr>
                  <td style="color: #16a34a; font-weight: 600; padding-top: 3px;">Payment Received:</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a; padding-top: 3px;">${formatCurrency(grandTotal)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="terms">
            <strong>Terms &amp; Conditions:</strong>
            <ol>
              <li>Goods once sold will not be accepted back or exchanged after 7 days.</li>
              <li>Warranty is covered directly by the respective manufacturer / brand authorized service centers.</li>
              <li>Physical damage, liquid damage, or burn marks will not be covered under warranty.</li>
              <li>Disputes are subject to Vijayawada jurisdiction only.</li>
            </ol>
          </div>

          <!-- Signatures -->
          <div class="sig-row">
            <div class="sig-box">Customer Signature</div>
            <div style="font-size: 9.5px; color: #94a3b8; text-align: center;">Thank you for your business!</div>
            <div class="sig-box">
              <strong>For ${SHOP_DETAILS.name}</strong><br/>
              Authorized Signatory
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
