'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import JsBarcode from 'jsbarcode'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Barcode,
  Search,
  Tag,
  Download,
  Printer,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

export interface ProductCatalogItem {
  id: string
  name: string
  sku: string
  description?: string | null
  created_at: string
  product_categories?: { name: string } | { name: string }[] | any
  product_barcodes?: { barcode_value: string; barcode_type: string }[]
  branch_products?: { current_stock: number | string; branch_id: string }[]
}

export function ProductCatalogTable({
  initialProducts = [],
}: {
  initialProducts: ProductCatalogItem[]
}) {
  const [products, setProducts] = useState<ProductCatalogItem[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null)

  // Modal Stock State
  const [stockToAdd, setStockToAdd] = useState('10')
  const [updatingStock, setUpdatingStock] = useState(false)

  // Modal Barcode State
  const [activeBarcode, setActiveBarcode] = useState('')
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128')
  const modalSvgRef = useRef<SVGSVGElement>(null)

  // When a product is opened in modal, initialize its barcode
  useEffect(() => {
    if (selectedProduct) {
      const existingBarcode =
        selectedProduct.product_barcodes?.[0]?.barcode_value ||
        '890' + Math.floor(1000000000 + Math.random() * 9000000000)
      setActiveBarcode(existingBarcode)
      setStockToAdd('10')
    }
  }, [selectedProduct])

  // Re-render barcode in modal whenever activeBarcode or barcodeFormat changes
  useEffect(() => {
    if (selectedProduct && modalSvgRef.current && activeBarcode) {
      try {
        JsBarcode(modalSvgRef.current, activeBarcode.trim(), {
          format: barcodeFormat as any,
          lineColor: '#000000',
          width: 2,
          height: 65,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
        })
      } catch (err: any) {
        console.warn('Modal barcode render notice:', err)
      }
    }
  }, [selectedProduct, activeBarcode, barcodeFormat])

  // Get category name safely whether it's an object or array
  const getCategoryName = (prod?: ProductCatalogItem | null) => {
    if (!prod || !prod.product_categories) return 'General'
    if (Array.isArray(prod.product_categories)) return prod.product_categories[0]?.name || 'General'
    return prod.product_categories.name || 'General'
  }

  // Get current stock number for a product
  const getProductStock = (prod: ProductCatalogItem) => {
    if (!prod.branch_products || prod.branch_products.length === 0) return 0
    return parseFloat(String(prod.branch_products[0]?.current_stock || '0'))
  }

  // Handle Add Stock
  const handleAddStock = async () => {
    if (!selectedProduct) return
    const qty = parseFloat(stockToAdd)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid positive quantity.')
      return
    }

    setUpdatingStock(true)
    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity_to_add: qty,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock')
      }

      toast.success(data.message || `Added ${qty} units to stock!`)

      // Update local state
      const updatedProducts = products.map((p) => {
        if (p.id === selectedProduct.id) {
          const currentBp = p.branch_products?.[0] || { current_stock: 0, branch_id: '' }
          const newStock = (parseFloat(String(currentBp.current_stock || '0')) || 0) + qty
          return {
            ...p,
            branch_products: [{ ...currentBp, current_stock: newStock }],
          }
        }
        return p
      })

      setProducts(updatedProducts)

      // Also update selectedProduct
      setSelectedProduct((prev) => {
        if (!prev) return null
        const currentBp = prev.branch_products?.[0] || { current_stock: 0, branch_id: '' }
        const newStock = (parseFloat(String(currentBp.current_stock || '0')) || 0) + qty
        return {
          ...prev,
          branch_products: [{ ...currentBp, current_stock: newStock }],
        }
      })
    } catch (err: any) {
      toast.error(err.message || 'Error updating stock')
    } finally {
      setUpdatingStock(false)
    }
  }

  // Handle Download Barcode SVG
  const handleDownloadBarcode = () => {
    if (!modalSvgRef.current) return
    const svgData = new XMLSerializer().serializeToString(modalSvgRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode-${activeBarcode}-${selectedProduct?.sku || 'product'}.svg`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Barcode SVG downloaded!')
  }

  // Handle Print Barcode Label
  const handlePrintBarcode = () => {
    if (!modalSvgRef.current || !selectedProduct) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${selectedProduct.name}</title>
          <style>
            @page { size: auto; margin: 8mm; }
            body { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .label { 
              text-align: center; 
              padding: 14px 20px; 
              border: 1.5px dashed #475569; 
              border-radius: 8px;
              max-width: 300px;
            }
            .name { font-size: 13px; font-weight: 800; margin-bottom: 2px; }
            .sku { font-size: 11px; font-mono: monospace; color: #64748b; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${selectedProduct.name}</div>
            <div class="sku">SKU: ${selectedProduct.sku}</div>
            ${modalSvgRef.current.outerHTML}
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

  // Filter products by search term
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    const matchName = p.name?.toLowerCase().includes(q)
    const matchSku = p.sku?.toLowerCase().includes(q)
    const matchBarcode = p.product_barcodes?.some((b) => b.barcode_value.includes(q))
    return matchName || matchSku || matchBarcode
  })

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by product name, model, SKU or barcode..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Catalog Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Product & Model</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Available Stock</th>
                <th className="p-4">Barcode</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    {searchTerm
                      ? `No products found matching "${searchTerm}"`
                      : 'No products found. Click "+ Add Product & Barcode" above to create your first item.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stock = getProductStock(product)
                  const isOutOfStock = stock <= 0
                  const isLowStock = stock > 0 && stock <= 10
                  const primaryBarcode = product.product_barcodes?.[0]?.barcode_value

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-4 pl-6 font-semibold text-slate-900 dark:text-white">
                        <div>{product.name}</div>
                        {product.description && (
                          <div className="text-xs font-normal text-slate-500 mt-0.5">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {product.sku}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {getCategoryName(product)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            0 Units (Out of Stock)
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            {stock} Units (Low)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            {stock} Units
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {primaryBarcode ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-xs font-mono font-medium text-indigo-700 dark:text-indigo-300 transition"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>{primaryBarcode}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No barcode</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-xs"
                          >
                            <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                            <span>+ Stock / Barcode</span>
                          </button>

                          <Link
                            href="/dashboard/billing/new"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition ml-2"
                          >
                            <span>Bill</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Stock & Barcode Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative my-8 space-y-6">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Product Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                <Package className="w-4 h-4" />
                <span>Product Manager</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedProduct.name}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                <span>SKU: {selectedProduct.sku}</span>
                <span>•</span>
                <span>Category: {getCategoryName(selectedProduct)}</span>
              </div>
            </div>

            {/* Current Stock Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider block">
                  Current Branch Stock
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {getProductStock(selectedProduct)} Units
                </span>
              </div>
              <div className="text-right text-xs text-indigo-700 dark:text-indigo-300">
                <span>Real-time available inventory</span>
              </div>
            </div>

            {/* Add Stock Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-emerald-600" />
                <span>Add / Restock Units</span>
              </h3>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={stockToAdd}
                    onChange={(e) => setStockToAdd(e.target.value)}
                    placeholder="Enter quantity to add"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddStock}
                  disabled={updatingStock}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition disabled:opacity-50"
                >
                  {updatingStock ? (
                    <span>Adding...</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>+ Add Stock</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Increment Chips */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
                {['5', '10', '25', '50', '100'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStockToAdd(preset)}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Barcode Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-indigo-600" />
                  <span>Product Barcode</span>
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setActiveBarcode(
                      '890' + Math.floor(1000000000 + Math.random() * 9000000000)
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>

              {/* Barcode SVG Rendering Area */}
              <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[140px] shadow-inner text-center">
                <svg ref={modalSvgRef} className="max-w-full" />
                <div className="mt-1 text-xs text-slate-500 font-medium font-mono">
                  {selectedProduct.name} ({selectedProduct.sku})
                </div>
              </div>

              {/* Barcode Action Buttons: Download & Print */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadBarcode}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-xs"
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Download SVG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBarcode}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Barcode Label</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
