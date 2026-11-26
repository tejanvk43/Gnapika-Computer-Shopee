// lib/serviceSlipPrinter.ts
import { SHOP_DETAILS, formatCurrency } from './formatters'
import { extractAccessories, cleanProblemDescription } from './serviceHelpers'

export function printDualServiceSlip(service: any) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const customerName = service.customers?.customer_name || 'Valued Customer'
  const phone = service.customers?.phone_number || 'N/A'
  const altPhone = service.customers?.alt_phone_number || ''
  const address = service.customers?.address || ''
  const device = `${service.company_brand || ''} ${service.model || ''} (${service.device_type || 'Device'})`.trim()
  const ref = service.service_ref_number || 'SRV-001'
  const date = new Date(service.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = new Date(service.created_at || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const problem = cleanProblemDescription(service.problem_description) || 'General Service & Inspection'
  const accessories = extractAccessories(service)
  const diagnosis = service.diagnosis || 'Standard Hardware Diagnostic'
  const cost = parseFloat(service.estimated_cost || 0)
  const serial = service.serial_number || 'Not Specified'
  const status = service.status || 'Received'

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Service Slip - ${ref} - ${SHOP_DETAILS.name}</title>
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
          .slip {
            border: 1.5px dashed #64748b;
            border-radius: 8px;
            padding: 12px 14px;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .shop-title {
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
            margin: 0 0 2px 0;
          }
          .shop-tagline {
            font-size: 10px;
            font-weight: 600;
            color: #ea580c;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .shop-contact {
            font-size: 10.5px;
            color: #475569;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-cust {
            background: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
          }
          .badge-office {
            background: #ffedd5;
            color: #c2410c;
            border: 1px solid #fed7aa;
          }
          .ref-box {
            text-align: right;
          }
          .ref-number {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 16px;
            font-weight: 900;
            color: #ea580c;
            margin-top: 2px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 12px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .info-label {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .info-val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
          }
          .info-sub {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
          }
          .prob-box {
            background: #fff7ed;
            border: 1px solid #ffedd5;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 12px;
          }
          .checklist-box {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 10.5px;
          }
          .checklist-items {
            display: flex;
            gap: 18px;
            margin-top: 4px;
            font-weight: 600;
            color: #334155;
          }
          .terms {
            font-size: 9.5px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            margin-top: 10px;
          }
          .terms ol {
            margin: 3px 0 0 14px;
            padding: 0;
          }
          .terms li {
            margin-bottom: 2px;
          }
          .sig-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10.5px;
            color: #334155;
          }
          .sig-box {
            text-align: center;
            width: 180px;
            border-top: 1px dashed #94a3b8;
            padding-top: 4px;
          }
          .divider {
            text-align: center;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, monospace;
            color: #94a3b8;
            margin: 10px 0;
            letter-spacing: 2px;
          }
        </style>
      </head>
      <body>
        <!-- ============================================== -->
        <!-- SLIP 1: CUSTOMER Reference SLIP           -->
        <!-- ============================================== -->
        <div class="slip">
          <div class="header">
            <div>
              <div class="shop-title">${SHOP_DETAILS.name}</div>
              <div class="shop-tagline">Sales, Hardware Repair &amp; Chip-Level Service Center</div>
              <div class="shop-contact">
                ${SHOP_DETAILS.address}, ${SHOP_DETAILS.city}<br/>
                Phone: <strong>${SHOP_DETAILS.phone}</strong> | GSTIN: ${SHOP_DETAILS.gstin}
              </div>
            </div>
            <div class="ref-box">
              <span class="badge badge-cust">Customer Reference</span>
              <div class="ref-number">${ref}</div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                Intake Date: <strong>${date} ${time}</strong>
              </div>
            </div>
          </div>

          <div class="grid-3">
            <div class="info-card">
              <div class="info-label">Customer Details</div>
              <div class="info-val">${customerName}</div>
              <div class="info-sub">Ph: ${phone} ${altPhone ? `/ ${altPhone}` : ''}</div>
              ${address ? `<div class="info-sub">${address}</div>` : ''}
            </div>

            <div class="info-card">
              <div class="info-label">Device Information</div>
              <div class="info-val">${device}</div>
              <div class="info-sub">Serial No: <strong>${serial}</strong></div>
              <div class="info-sub">Status: <strong>${status}</strong></div>
            </div>

            <div class="info-card">
              <div class="info-label">Service Diagnosis &amp; Cost</div>
              <div class="info-val" style="color: #ea580c;">Est: ${formatCurrency(cost)}</div>
              <div class="info-sub">Category: ${diagnosis}</div>
              <div class="info-sub" style="color: #16a34a; font-weight: 700;">3-Step Service: Received</div>
            </div>
          </div>

          <div class="prob-box">
            <strong style="color: #c2410c;">Reported Problem / Customer Complaint:</strong>
            <div style="margin-top: 3px; font-weight: 500; font-size: 12.5px;">${problem}</div>
          </div>

          <div class="checklist-box">
            <strong style="color: #0f172a; font-size: 11px;">Accessories Received from Customer:</strong>
            <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 6px;">
              ${accessories.length > 0
                ? accessories.map((acc: string) => `
                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 2px 8px; font-weight: 700; color: #0f172a; font-size: 10px;">
                      <span style="color: #16a34a; font-weight: 900;">&#10004;</span> ${acc}
                    </span>
                  `).join('')
                : '<span style="color: #64748b; font-style: italic; font-weight: 600;">[ None &mdash; Device Received Only ]</span>'
              }
            </div>
          </div>

            <div style="height: 15px;"></div>
          <div class="sig-row">
            <div class="sig-box">${SHOP_DETAILS.name}</div>
          </div>
        </div>

        <div class="divider">- - - - - - - - - - - - - - - &check; CUT OR TEAR HERE - - - - - - - - - - - - - - -</div>

        <!-- ============================================== -->
        <!-- SLIP 2: INTERNAL TECHNICIAN / JOB CARD DOCKET  -->
        <!-- ============================================== -->
        <div class="slip">
          <div class="header">
            <div>
              <div class="shop-title">${SHOP_DETAILS.name}</div>
              <div class="shop-tagline">Internal Job Card &amp; Hardware Service Docket</div>
              <div class="shop-contact">
                Technician Work Order | Ref: <strong>${ref}</strong>
              </div>
            </div>
            <div class="ref-box">
              <span class="badge badge-office">Internal Office Copy</span>
              <div class="ref-number">${ref}</div>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                Status: <strong>${status}</strong> | Date: <strong>${date}</strong>
              </div>
            </div>
          </div>

          <div class="grid-3">
            <div class="info-card">
              <div class="info-label">Customer Contact</div>
              <div class="info-val">${customerName}</div>
              <div class="info-sub">Phone: <strong>${phone}</strong></div>
              ${altPhone ? `<div class="info-sub">Alt: ${altPhone}</div>` : ''}
            </div>

            <div class="info-card">
              <div class="info-label">Hardware Profile</div>
              <div class="info-val">${device}</div>
              <div class="info-sub">S/N: <strong style="font-family: monospace;">${serial}</strong></div>
            </div>

            <div class="info-card">
              <div class="info-label">Cost &amp; Category</div>
              <div class="info-val">Est: ${formatCurrency(cost)}</div>
              <div class="info-sub">Category: ${diagnosis}</div>
            </div>
          </div>

          <div class="prob-box">
            <strong style="color: #c2410c;">Customer Problem Statement:</strong>
            <div style="margin-top: 3px; font-weight: 600;">${problem}</div>
          </div>

          <!-- Intake Accessories Box for Technician & Shop Owner -->
          <div style="border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; background: #fff7ed; font-size: 11px;">
            <strong style="color: #c2410c; font-size: 11px;">Customer Accessories Received (Must Return on Delivery):</strong>
            <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 6px;">
              ${accessories.length > 0
                ? accessories.map((acc: string) => `
                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #f97316; border-radius: 4px; padding: 2px 8px; font-weight: 700; color: #9a3412; font-size: 10px;">
                      <span style="color: #ea580c; font-weight: 900;">&#10004;</span> ${acc}
                    </span>
                  `).join('')
                : '<span style="color: #78716c; font-style: italic; font-weight: 600;">[ None &mdash; Device Received Only ]</span>'
              }
            </div>
          </div>
          
          <div class="terms">
            <strong>Customer Terms and Conditions:</strong>
            <ol>
              <li>Please produce this original acknowledgment slip at the time of collecting your device.</li>
              <li>Customers are strictly requested to take backup of important data. ${SHOP_DETAILS.name} is not responsible for any data loss.</li>
              <li>Estimated cost and timeline are tentative and subject to bench diagnostic inspection.</li>
              <li>Equipment not claimed within 30 days of completion notification will not be the center's responsibility.</li>
            </ol>
          </div>

          <div style="height: 12px;"></div>

          <div class="sig-row">
            <div style="width: 100%; margin-bottom: 8px; font-size: 11px; font-weight: 700;">I ACCEPT THE ABOVE TERMS AND CONDITIONS</div>
            <div class="sig-box">Customer Signature</div>
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
