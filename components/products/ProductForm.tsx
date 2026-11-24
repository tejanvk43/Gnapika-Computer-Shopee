'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import JsBarcode from 'jsbarcode'
import { toast } from 'sonner'
import { Barcode, Printer, Download, RefreshCw, Plus, Sparkles, Building2, Package, Tag, Layers, IndianRupee } from 'lucide-react'

interface ProductCategoryOption {
  id: string
  name: string
}

const COMMON_COMPANIES = [
  'Apple',
  'Samsung',
  'Xiaomi / Redmi',
  'OnePlus',
  'Realme',
  'Vivo',
  'Oppo',
  'Boat',
  'Noise',
  'Motorola',
  'Lenovo',
  'Sony',
  'HP',
  'Dell',
  'Generic / Unbranded',
  'Other'
]

const ACCESSORY_SUGGESTIONS = [
  'Tempered Glass',
  'Silicone Back Case',
  'Fast Charger 65W',
  'USB Type-C Cable',
  'Wireless Earbuds',
  'Display Combo Assembly',
  'Replacement Battery',
  'Camera Lens Protector',
  'OTG Adapter',
  'Power Bank 10000mAh'
]

export function ProductForm({ categories = [] }: { categories?: ProductCategoryOption[] }) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)

  // Form State according to Wireframe
  const [company, setCompany] = useState('Apple')
  const [customCompany, setCustomCompany] = useState('')
  const [accessoryName, setAccessoryName] = useState('')
  const [modelName, setModelName] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [costForEach, setCostForEach] = useState('350')
  const [categoryId, setCategoryId] = useState('')
  const [barcodeValue, setBarcodeValue] = useState(() => '890' + Math.floor(1000000000 + Math.random() * 9000000000))
  const [barcodeType, setBarcodeType] = useState('CODE128')
  const [loading, setLoading] = useState(false)

  // Generate random barcode
  const generateNewBarcode = () => {
    const randomNum = '890' + Math.floor(1000000000 + Math.random() * 9000000000)
    setBarcodeValue(randomNum)
  }

  // Auto-render Barcode
  useEffect(() => {
    if (svgRef.current && barcodeValue.trim()) {
      try {
        JsBarcode(svgRef.current, barcodeValue.trim(), {
          format: barcodeType as any,
          lineColor: '#000000',
          width: 2,
          height: 70,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
        })
      } catch (err: any) {
        console.warn('Barcode render error:', err)
      }
    }
  }, [barcodeValue, barcodeType])

  // Handle Download Barcode SVG
  const handleDownload = () => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode-${barcodeValue.trim()}.svg`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Barcode SVG downloaded successfully!')
  }

  // Handle Print Barcode Label
  const handlePrint = () => {
    if (!svgRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const selectedCompany = company === 'Other' ? customCompany : company
    const productName = `${selectedCompany} ${accessoryName} (${modelName})`.trim()

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${barcodeValue}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #fff;
            }
            .label { 
              text-align: center; 
              padding: 16px 24px; 
              border: 1.5px dashed #333; 
              border-radius: 8px;
              max-width: 320px;
            }
            .item-title { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
            .item-price { font-size: 14px; font-weight: 800; color: #16a34a; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="item-title">${productName || 'PRODUCT'}</div>
            <div class="item-price">MRP: ₹${costForEach || '0'}</div>
            ${svgRef.current.outerHTML}
          </div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedCompany = company === 'Other' ? customCompany.trim() : company
    if (!accessoryName.trim()) {
      toast.error('Please enter an Accessory Name')
      return
    }

    const fullProductName = `${selectedCompany ? selectedCompany + ' ' : ''}${accessoryName.trim()}${modelName.trim() ? ' - ' + modelName.trim() : ''}`
    const skuCode = `${(selectedCompany || 'PRD').substring(0, 4).toUpperCase()}-${(modelName || accessoryName).substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    setLoading(true)
    try {
      const payload = {
        name: fullProductName,
        sku: skuCode,
        company: selectedCompany,
        accessory_name: accessoryName.trim(),
        model_name: modelName.trim(),
        quantity: parseFloat(quantity) || 0,
        cost_price: parseFloat(costForEach) || 0,
        category_id: categoryId || null,
        description: `Company: ${selectedCompany} | Model: ${modelName || 'Universal'} | Unit Cost: ₹${costForEach}`,
        barcodes: barcodeValue.trim()
          ? [{ value: barcodeValue.trim(), type: barcodeType }]
          : [],
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save product')
      }

      toast.success(`Product "${fullProductName}" created successfully!`)
      router.push('/dashboard/products')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error creating product')
    } finally {
      setLoading(false)
    }
  }

  const effectiveCompany = company === 'Other' ? customCompany : company

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 2-Column Responsive Layout matching Wireframe Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Specifications Form */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Product & Accessory Details</span>
            </h2>

            {/* Company Drop Down */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Company Drop Down *</span>
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {COMMON_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {company === 'Other' && (
                <input
                  type="text"
                  placeholder="Type Company / Brand Name..."
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              )}
            </div>

            {/* Accessory Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Accessory Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tempered Glass, Fast Charger, Back Cover"
                value={accessoryName}
                onChange={(e) => setAccessoryName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />

              {/* Quick Suggestions Chips */}
              <div className="flex gap-1.5 flex-wrap mt-2">
                {ACCESSORY_SUGGESTIONS.slice(0, 5).map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setAccessoryName(sugg)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  >
                    + {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Model Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. iPhone 15 Pro, Galaxy S24, Universal"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Quantity and Cost For EACH */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cost For EACH (₹) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costForEach}
                  onChange={(e) => setCostForEach(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Optional Category */}
            {categories.length > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Category (Optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium"
                >
                  <option value="">General / Accessories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Barcode Generator Box directly from Wireframe */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                <span>BARCODE</span>
              </h2>
              <button
                type="button"
                onClick={generateNewBarcode}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            </div>

            {/* Barcode Value input & format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Barcode Digits
                </label>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Format
                </label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC-A</option>
                </select>
              </div>
            </div>

            {/* Barcode Visual Box (Matching Wireframe Center Box) */}
            <div className="p-6 bg-white border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[160px] shadow-inner text-center">
              <svg ref={svgRef} className="max-w-full" />
              <div className="mt-2 text-xs text-slate-500 font-medium">
                {effectiveCompany} {accessoryName} {modelName && `(${modelName})`}
              </div>
              <div className="text-sm font-bold text-emerald-600">
                ₹{costForEach || '0'}
              </div>
            </div>

            {/* Download & Print Buttons (Directly from Wireframe) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Save / Add Product Action Button */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
        >
          {loading ? (
            <span>Adding Product...</span>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Save & Add Product</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
