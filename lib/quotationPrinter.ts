// lib/quotationPrinter.ts
import { GNAPIKA_LOGO_BASE64, GNAPIKA_WATERMARK_BASE64 } from './brandAssets'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from './formatters'
import { QuotationData } from './quotations'

export function printQuotation(quote: QuotationData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

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

  // Group HSN summary
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

  const itemRowsHtml = items
    .map((it, idx) => {
      const specsHtml = it.specifications
        ? `<div style="font-size: 8.5px; color: #222; margin-top: 2px; white-space: pre-line; line-height: 1.25; font-style: italic;">${it.specifications}</div>`
        : ''

      return `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: left;">
          <div style="font-weight: 700; font-size: 9.5px; text-transform: uppercase;">${it.description || 'Hardware Item'}</div>
          ${specsHtml}
        </td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace;">${it.hsn_sac || '84713010'}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-family: monospace;">${it.quantity} ${it.unit || 'NOS'}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: monospace;">${(it.rate_incl_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: monospace;">${(it.rate_excl_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${it.unit || 'NOS'}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: monospace;">${it.discount_percent ? it.discount_percent + '%' : ''}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; font-family: monospace;">${(it.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
    })
    .join('')

  const hsnRowsHtml = Object.entries(hsnMap)
    .map(([hsn, val]) => {
      return `
      <tr>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: left; font-family: monospace;">${hsn}</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-family: monospace;">${val.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: center; font-family: monospace;">${val.cgstRate}%</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-family: monospace;">${val.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: center; font-family: monospace;">${val.sgstRate}%</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-family: monospace;">${val.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 2px 4px; text-align: right; font-weight: bold; font-family: monospace;">${val.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
    })
    .join('')

  const bankName = quote.bank_details?.bank_name || 'KARUR VYSYA BANK'
  const bankAcc = quote.bank_details?.account_no || '1413010000000199'
  const bankIfsc = quote.bank_details?.branch_ifsc || 'GOVERNOR PETA & KVBL0001413'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Estimation / Quotation - ${quote.quotation_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      position: relative;
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      border: 1.5px solid #000;
      padding: 8px;
      background: #fff;
    }
    .watermark {
      position: absolute;
      top: 52%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 72%;
      max-width: 520px;
      opacity: 0.11;
      pointer-events: none;
      z-index: 0;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    .header-banner {
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 4px 0 6px 0;
      border-bottom: 1.5px solid #000;
      margin-bottom: 6px;
    }
    .top-grid {
      display: flex;
      border: 1px solid #000;
      margin-bottom: 6px;
    }
    .top-left {
      width: 55%;
      border-right: 1px solid #000;
      padding: 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top-right {
      width: 45%;
      padding: 0;
    }
    .seller-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #666;
    }
    .seller-logo {
      width: 140px;
      max-height: 48px;
      object-fit: contain;
    }
    .seller-info {
      font-size: 8.5px;
      line-height: 1.2;
    }
    .party-box {
      margin-top: 4px;
      font-size: 9px;
    }
    .party-title {
      font-weight: bold;
      color: #333;
      text-decoration: underline;
      font-size: 8.5px;
    }
    .party-name {
      font-weight: 800;
      font-size: 10px;
      margin-top: 1px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }
    .meta-table td {
      border-bottom: 1px solid #000;
      border-right: 1px solid #000;
      padding: 3px 5px;
      vertical-align: top;
    }
    .meta-table tr td:last-child {
      border-right: none;
    }
    .meta-table tr:last-child td {
      border-bottom: none;
    }
    .meta-label {
      font-size: 7.5px;
      color: #555;
      display: block;
      line-height: 1;
    }
    .meta-val {
      font-weight: 700;
      font-size: 9px;
      font-family: monospace;
      margin-top: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 6px;
    }
    .items-table th {
      border: 1px solid #000;
      padding: 4px 2px;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      background: transparent;
      text-align: center;
    }
    .tax-breakup-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      margin: 4px 0 6px 0;
    }
    .tax-breakup-table th, .tax-breakup-table td {
      border: 1px solid #000;
      padding: 2px 4px;
    }
    .bottom-box {
      border: 1px solid #000;
      padding: 6px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 8.5px;
    }
    .bank-box {
      border: 1px dashed #333;
      padding: 4px 8px;
      line-height: 1.35;
      font-size: 8.5px;
      background: transparent;
    }
    @media print {
      body {
        margin: 0;
      }
      .page-container {
        border: 1.5px solid #000 !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <img src="${GNAPIKA_WATERMARK_BASE64}" class="watermark" alt="Watermark" />
    <div class="content">
      <!-- ESTIMATION / QUOTATION Top Header Banner -->
      <div class="header-banner">
        ESTIMATION / QUOTATION
      </div>

      <!-- Top Section (Seller & Buyer / Meta Details) -->
      <div class="top-grid">
        <!-- Top Left -->
        <div class="top-left">
          <!-- Seller Branding -->
          <div class="seller-header">
            <img src="${GNAPIKA_LOGO_BASE64}" alt="Gnapika Computer Shopee" class="seller-logo" />
            <div class="seller-info">
              <div style="font-weight: 900; font-size: 10px;">M/S GNAPIKA COMPUTER SHOPEE</div>
              <div>D.NO.40-72-3/2,SF4, Anjali Apartments, Sitaram Nagar Road,</div>
              <div>Vijayawada, NTR, Andhra Pradesh, 520010</div>
              <div><strong>GSTIN/UIN:</strong> 37BEYPC1417G1ZG</div>
              <div><strong>State Name:</strong> Andhra Pradesh, Code : 37</div>
              <div><strong>E-Mail:</strong> gnapikacomputershopee@gmail.com</div>
              <div><strong>Phone:</strong> 9493471414</div>
            </div>
          </div>

          <!-- Consignee (Ship To) -->
          <div class="party-box" style="border-bottom: 1px dashed #999; padding-bottom: 4px; margin-bottom: 4px;">
            <div class="party-title">Consignee (Ship to)</div>
            <div class="party-name">${quote.consignee_name || quote.company_name}</div>
            <div>${quote.consignee_address || quote.company_address || 'Vijayawada'}</div>
            <div><strong>State Name :</strong> ${quote.consignee_state || quote.company_state || 'Andhra Pradesh, Code : 37'}</div>
          </div>

          <!-- Buyer (Bill To) -->
          <div class="party-box">
            <div class="party-title">Buyer (Bill to)</div>
            <div class="party-name">${quote.company_name}</div>
            <div>${quote.company_address || 'Vijayawada'}</div>
            <div><strong>State Name :</strong> ${quote.company_state || 'Andhra Pradesh, Code : 37'}</div>
            ${quote.company_gstin ? `<div><strong>GSTIN/UIN:</strong> ${quote.company_gstin}</div>` : ''}
          </div>
        </div>

        <!-- Top Right (Quotation & Transport Details) -->
        <div class="top-right">
          <table class="meta-table">
            <tr>
              <td style="width: 50%;">
                <span class="meta-label">Quotation / Invoice No.</span>
                <span class="meta-val">${quote.quotation_number}</span>
              </td>
              <td style="width: 50%;">
                <span class="meta-label">Dated</span>
                <span class="meta-val">${formattedDate}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="meta-label">Delivery Note</span>
                <span style="font-size: 8px;">${quote.delivery_note || '-'}</span>
              </td>
              <td>
                <span class="meta-label">Mode/Terms of Payment</span>
                <span style="font-size: 8px; font-weight: bold;">${quote.mode_terms_of_payment || 'Against Delivery'}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="meta-label">Reference No. &amp; Date</span>
                <span style="font-size: 8px;">${quote.reference_no_date || '-'}</span>
              </td>
              <td>
                <span class="meta-label">Other References</span>
                <span style="font-size: 8px;">${quote.other_references || '-'}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="meta-label">Buyer's Order No.</span>
                <span style="font-size: 8px;">${quote.buyers_order_no || '-'}</span>
              </td>
              <td>
                <span class="meta-label">Dated</span>
                <span style="font-size: 8px;">${quote.buyers_order_date || '-'}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="meta-label">Dispatch Doc No.</span>
                <span style="font-size: 8px;">${quote.dispatch_doc_no || '-'}</span>
              </td>
              <td>
                <span class="meta-label">Delivery Note Date</span>
                <span style="font-size: 8px;">${quote.delivery_note_date || '-'}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="meta-label">Dispatched through</span>
                <span style="font-size: 8px;">${quote.dispatched_through || '-'}</span>
              </td>
              <td>
                <span class="meta-label">Destination</span>
                <span style="font-size: 8px;">${quote.destination || 'Vijayawada'}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span class="meta-label">Terms of Delivery</span>
                <span style="font-size: 8px;">${quote.terms_of_delivery || 'Standard Delivery at Site'}</span>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 25px;">Sl<br/>No.</th>
            <th style="text-align: left;">Description of Goods</th>
            <th style="width: 65px;">HSN/SAC</th>
            <th style="width: 55px;">Quantity</th>
            <th style="width: 75px; text-align: right;">Rate<br/>(Incl. of Tax)</th>
            <th style="width: 75px; text-align: right;">Rate</th>
            <th style="width: 35px;">per</th>
            <th style="width: 45px; text-align: right;">Disc. %</th>
            <th style="width: 80px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}

          <!-- Tax subtotals row inside items table -->
          ${
            totalCgst > 0
              ? `
          <tr>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-weight: bold; padding: 2px 8px; font-family: monospace;">CGST</td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-family: monospace; font-weight: bold; padding: 2px 4px;">
              ${totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
          `
              : ''
          }
          ${
            totalSgst > 0
              ? `
          <tr>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-weight: bold; padding: 2px 8px; font-family: monospace;">SGST</td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-family: monospace; font-weight: bold; padding: 2px 4px;">
              ${totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
          `
              : ''
          }
          ${
            totalIgst > 0
              ? `
          <tr>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-weight: bold; padding: 2px 8px; font-family: monospace;">IGST</td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none;"></td>
            <td style="border: 1px solid #000; border-top: none; text-align: right; font-family: monospace; font-weight: bold; padding: 2px 4px;">
              ${totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
          `
              : ''
          }

          <!-- Total Row -->
          <tr style="font-weight: 800; border-top: 1.5px solid #000; background: transparent;">
            <td colspan="3" style="border: 1px solid #000; padding: 4px; text-align: right; text-transform: uppercase;">Total</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace;">${quote.total_qty || items.reduce((a, c) => a + (c.quantity || 1), 0)} NOS</td>
            <td colspan="4" style="border: 1px solid #000;"></td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right; font-family: monospace; font-size: 11px;">
              ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div style="border: 1px solid #000; padding: 4px 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div>
          <span style="font-size: 8px; color: #444;">Amount Chargeable (in words)</span>
          <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase;">${amountInWords}</div>
        </div>
        <div style="font-weight: bold; font-size: 9px; font-style: italic;">E. &amp; O.E</div>
      </div>

      <!-- HSN/SAC Tax Breakup Table -->
      <table class="tax-breakup-table">
        <thead>
          <tr style="text-align: center; font-weight: bold;">
            <th rowspan="2" style="width: 75px;">HSN/SAC</th>
            <th rowspan="2" style="width: 85px;">Taxable<br/>Value</th>
            <th colspan="2">CGST</th>
            <th colspan="2">SGST/UTGST</th>
            <th rowspan="2" style="width: 85px;">Total<br/>Tax Amount</th>
          </tr>
          <tr style="text-align: center; font-weight: bold;">
            <th style="width: 45px;">Rate</th>
            <th style="width: 65px;">Amount</th>
            <th style="width: 45px;">Rate</th>
            <th style="width: 65px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${hsnRowsHtml}
          <!-- Taxable Total Row -->
          <tr style="font-weight: 800;">
            <td style="text-align: right; text-transform: uppercase;">Total</td>
            <td style="text-align: right; font-family: monospace;">${taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
            <td style="text-align: right; font-family: monospace;">${totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
            <td style="text-align: right; font-family: monospace;">${totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-family: monospace;">${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <!-- Tax Amount in Words -->
      <div style="border: 1px solid #000; padding: 3px 6px; font-size: 8.5px; margin-bottom: 6px;">
        <strong>Tax Amount (in words) : </strong>
        <span style="text-transform: uppercase; font-weight: 700;">${taxInWords}</span>
      </div>

      <!-- Bottom Declaration & Bank Details & Signatory -->
      <div class="bottom-box">
        <!-- Declaration -->
        <div style="width: 40%; line-height: 1.3;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Declaration</div>
          <div>We declare that this quotation/estimation shows the actual price of the goods described and that all particulars are true and correct.</div>
        </div>

        <!-- Bank Details -->
        <div style="width: 32%;">
          <div class="bank-box">
            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Company's Bank Details</div>
            <div><strong>Bank Name :</strong> ${bankName}</div>
            <div><strong>A/c No. :</strong> <span style="font-family: monospace; font-weight: bold;">${bankAcc}</span></div>
            <div><strong>Branch &amp; IFS Code :</strong> ${bankIfsc}</div>
          </div>
        </div>

        <!-- Authorized Signatory -->
        <div style="width: 28%; text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 700; font-size: 9px;">for M/S GNAPIKA COMPUTER SHOPEE</div>
          <div style="margin-top: 32px; font-size: 8.5px; font-weight: bold; border-top: 1px dashed #444; display: inline-block; padding-top: 2px;">
            Authorised Signatory
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="text-align: center; font-size: 8px; color: #444; margin-top: 4px;">
        This is a Computer Generated Estimation/Quotation
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
