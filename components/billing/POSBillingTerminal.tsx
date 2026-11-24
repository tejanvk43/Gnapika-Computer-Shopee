'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Barcode,
  Plus,
  Trash2,
  Receipt,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  RefreshCw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { printTaxInvoice } from '@/lib/invoicePrinter'

interface ProductItem {
  id: string
  name: string
  sku: string
  description?: string | null
  price?: number
  cost_price?: number
  product_categories?: { name: string } | { name: string }[] | any
  product_barcodes?: { barcode_value: string; barcode_type: string }[]
}

export function extractProductPrice(product: ProductItem | any): number {
  if (product.price && !isNaN(parseFloat(product.price))) {
    return parseFloat(product.price)
  }
  if (product.cost_price && !isNaN(parseFloat(product.cost_price))) {
    return parseFloat(product.cost_price)
  }
  if (product.description) {
    const match =
      product.description.match(/(?:Unit\s*Cost|Cost|Price|MRP):\s*₹?\s*(\d+(?:\.\d+)?)/i) ||
      product.description.match(/₹\s*(\d+(?:\.\d+)?)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  return 0
}

interface CartItem {
  product_id: string
  name: string
  sku: string
  unit_price: number
  quantity: number
  discount: number
  line_total: number
}

export function POSBillingTerminal({
  initialProducts = [],
  initialPhone = '',
  initialCustomerId = '',
}: {
  initialProducts?: ProductItem[]
  initialPhone?: string
  initialCustomerId?: string
}) {
  // Customer State
  const [customer, setCustomer] = useState({
    id: initialCustomerId,
    customer_name: '',
    phone_number: initialPhone,
    alt_phone_number: '',
    email: '',
    address: '',
    gstin: '',
  })
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerFound, setCustomerFound] = useState(false)

  // Products & Search State
  const [products] = useState<ProductItem[]>(initialProducts)
  const [productQuery, setProductQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash')
  const [submitting, setSubmitting] = useState(false)

  // Generated Invoice Result
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null)

  // Auto-lookup customer by phone
  useEffect(() => {
    if (initialPhone) {
      lookupCustomer(initialPhone)
    }
  }, [initialPhone])

  const lookupCustomer = async (phone: string) => {
    if (phone.length < 10) return
    setSearchingCustomer(true)
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(phone.trim())}`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          const found = data[0]
          setCustomer({
            id: found.id,
            customer_name: found.customer_name || '',
            phone_number: found.phone_number || phone,
            alt_phone_number: found.alt_phone_number || '',
            email: found.email || '',
            address: found.address || '',
            gstin: found.gstin || '',
          })
          setCustomerFound(true)
          toast.success(`Existing customer found: ${found.customer_name}`)
        } else {
          setCustomerFound(false)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingCustomer(false)
    }
  }

  // Filter products as user types
  useEffect(() => {
    if (!productQuery.trim()) {
      setFilteredProducts([])
      setShowProductDropdown(false)
      return
    }

    const q = productQuery.toLowerCase()
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.product_barcodes?.some((b) => b.barcode_value.toLowerCase().includes(q))
    )
    setFilteredProducts(matches)
    setShowProductDropdown(true)
  }, [productQuery, products])

  const addToCart = (product: ProductItem, customPrice?: number) => {
    const itemPrice = customPrice !== undefined ? customPrice : extractProductPrice(product)
    const existingIndex = cart.findIndex((item) => item.product_id === product.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += 1
      updated[existingIndex].line_total =
        updated[existingIndex].quantity * updated[existingIndex].unit_price - updated[existingIndex].discount
      setCart(updated)
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: itemPrice,
          quantity: 1,
          discount: 0,
          line_total: itemPrice,
        },
      ])
    }
    setProductQuery('')
    setShowProductDropdown(false)
    toast.success(`Added ${product.name} (₹${itemPrice}) to bill`)
  }

  const handleProductInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = productQuery.trim().toLowerCase()
      if (!q) return

      // 1. Check exact barcode match first
      const exactBarcode = products.find((p) =>
        p.product_barcodes?.some((b) => b.barcode_value.toLowerCase() === q)
      )
      if (exactBarcode) {
        addToCart(exactBarcode)
        return
      }

      // 2. Check exact SKU match
      const exactSku = products.find((p) => p.sku.toLowerCase() === q)
      if (exactSku) {
        addToCart(exactSku)
        return
      }

      // 3. If single search result match
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0])
      }
    }
  }

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeItem(index)
      return
    }
    const updated = [...cart]
    updated[index].quantity = qty
    updated[index].line_total = qty * updated[index].unit_price - updated[index].discount
    setCart(updated)
  }

  const updatePrice = (index: number, price: number) => {
    const updated = [...cart]
    updated[index].unit_price = price
    updated[index].line_total = updated[index].quantity * price - updated[index].discount
    setCart(updated)
  }

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Calculations (18% GST)
  const subtotal = cart.reduce((sum, it) => sum + it.line_total, 0)
  const gstRate = 0.18
  const gstAmount = subtotal * gstRate
  const grandTotal = subtotal + gstAmount

  // Handle Bill Generation
  const handleGenerateBill = async () => {
    if (!customer.customer_name.trim()) {
      toast.error('Please enter customer name')
      return
    }
    if (cart.length === 0) {
      toast.error('Please add at least one product to the bill')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/billing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items: cart,
          subtotal,
          gst_amount: gstAmount,
          grand_total: grandTotal,
          payment_method: paymentMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate bill')
      }

      toast.success(`Bill Generated: ${data.invoice_number}`)
      setGeneratedInvoice({
        ...data.invoice,
        items: cart,
        subtotal,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        customer,
      })
    } catch (err: any) {
      toast.error(err.message || 'Error creating invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setGeneratedInvoice(null)
    setCart([])
    setCustomer({
      id: '',
      customer_name: '',
      phone_number: '',
      alt_phone_number: '',
      email: '',
      address: '',
      gstin: '',
    })
    setCustomerFound(false)
  }

  return (
    <div className="space-y-8">
      {/* Generated Bill Template Modal (Matching Diagram) */}
      {generatedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setGeneratedInvoice(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Bill Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>TAX INVOICE - PAID ({generatedInvoice.payment_method})</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                    {SHOP_DETAILS.name}
                  </h2>
                  <p className="text-[11px] font-semibold text-primary">{SHOP_DETAILS.tagline}</p>
                  <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Invoice No: <span className="text-primary">{generatedInvoice.invoice_number}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Main Store Counter</p>
                  <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                  <p className="font-mono text-[11px]">GSTIN: {SHOP_DETAILS.gstin}</p>
                  <p className="text-[11px]">Ph: {SHOP_DETAILS.phone}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block mb-0.5">Billed To (Customer):</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">
                    {generatedInvoice.customer?.customer_name || 'Walk-in / Counter Sale'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Phone: {generatedInvoice.customer?.phone_number || '-'}
                  </p>
                  {generatedInvoice.customer?.address && (
                    <p className="text-slate-500">{generatedInvoice.customer?.address}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block mb-0.5">Tax Details:</span>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    GSTIN: {generatedInvoice.customer?.gstin || 'Unregistered'}
                  </p>
                  <p className="text-slate-400 text-[11px]">Place of Supply: Andhra Pradesh (37)</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2 px-1">Item Description</th>
                    <th className="py-2 px-1 text-right">Rate</th>
                    <th className="py-2 px-1 text-center">Qty</th>
                    <th className="py-2 px-1 text-right">Taxable</th>
                    <th className="py-2 px-1 text-right">GST (18%)</th>
                    <th className="py-2 px-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {generatedInvoice.items?.map((it: any, i: number) => {
                    const unitPrice = parseFloat(it.unit_price) || 0
                    const qty = parseFloat(it.quantity) || 1
                    const discount = parseFloat(it.discount) || 0
                    const taxable = Math.max(0, (unitPrice * qty) - discount)
                    const itemGst = (taxable * 18) / 100
                    const lineTotalWithTax = taxable + itemGst

                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-1 font-bold text-slate-900 dark:text-white">
                          {it.name}
                          <span className="block text-[10px] font-mono font-normal text-slate-400">SKU: {it.sku}</span>
                        </td>
                        <td className="py-2.5 px-1 text-right font-mono">{formatCurrency(unitPrice)}</td>
                        <td className="py-2.5 px-1 text-center font-mono font-bold">{qty}</td>
                        <td className="py-2.5 px-1 text-right font-mono font-medium">{formatCurrency(taxable)}</td>
                        <td className="py-2.5 px-1 text-right font-mono text-slate-500">{formatCurrency(itemGst)}</td>
                        <td className="py-2.5 px-1 text-right font-mono font-bold text-slate-950 dark:text-white">
                          {formatCurrency(lineTotalWithTax)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal (Excl. Tax):</span>
                <span className="font-mono font-medium">{formatCurrency(generatedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>CGST (9%):</span>
                <span className="font-mono font-medium">{formatCurrency(generatedInvoice.gst_amount / 2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>SGST (9%):</span>
                <span className="font-mono font-medium">{formatCurrency(generatedInvoice.gst_amount / 2)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 dark:border-slate-700 pt-2 text-base font-black text-slate-950 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-primary text-lg">{formatCurrency(generatedInvoice.grand_total)}</span>
              </div>
              <div className="text-[11px] text-left text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                Chargeable: <strong>{numberToWordsRupees(generatedInvoice.grand_total)}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => printTaxInvoice(generatedInvoice)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Print Bill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Bill reference copied to clipboard!')
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left (Customer + Products + Cart) / Right (Billing Summary & Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Cart */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Details Box (Auto-fill on Phone Number) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Customer Details
                </h3>
              </div>
              <span className="text-xs text-slate-400 italic">
                Existing phone auto-fills details; new numbers auto-register!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={customer.phone_number}
                    onChange={(e) => {
                      setCustomer({ ...customer, phone_number: e.target.value })
                      if (e.target.value.length >= 10) lookupCustomer(e.target.value)
                    }}
                    onBlur={() => lookupCustomer(customer.phone_number)}
                    placeholder="e.g. 8919998149"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-slate-900 dark:text-white"
                    required
                  />
                  {searchingCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Name *
                </label>
                <input
                  type="text"
                  value={customer.customer_name}
                  onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                  placeholder="Customer Full Name"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Alternative Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Alternative Phone Number
                </label>
                <input
                  type="tel"
                  value={customer.alt_phone_number}
                  onChange={(e) => setCustomer({ ...customer, alt_phone_number: e.target.value })}
                  placeholder="Optional alternate phone"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Email Address (Not Mandatory)
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Address
                </label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Street / City / Locality"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Product Lookup & Barcode Scanning */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                <span>Add Products to Bill</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <Barcode className="w-4 h-4 text-primary" />
                <span>{showScanner ? 'Hide Camera Scanner' : 'Scan the Barcode'}</span>
              </button>
            </div>

            {showScanner && (
              <div className="mb-4 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                <BarcodeScanner />
              </div>
            )}

            {/* Product Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                onKeyDown={handleProductInputKeyDown}
                placeholder="Search the product by name, SKU or scan barcode (Press Enter)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400"
              />

              {/* Autocomplete Dropdown */}
              {showProductDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">
                      No products found. (You can also add items directly below)
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const itemPrice = extractProductPrice(p)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addToCart(p)}
                          className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-white">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku} {itemPrice > 0 ? `• ₹${itemPrice}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <span>+ Add {itemPrice > 0 ? `(₹${itemPrice})` : ''}</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table (Matching Diagram: List of the products added should come over here) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Items in Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3 pl-4">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-right">Unit Price (₹)</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Line Total (₹)</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No items added yet. Search or scan a barcode to add products.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 pl-4 font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded text-right font-mono text-xs"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{item.line_total.toFixed(2)}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Billing Summary (Matching Diagram) */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Billing Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Calculated with 18% GST (9% CGST + 9% SGST)</p>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CGST (9%):</span>
                <span className="font-mono">₹{(gstAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>SGST (9%):</span>
                <span className="font-mono">₹{(gstAmount / 2).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900 dark:text-white">Grand Total:</span>
                <span className="text-2xl font-black font-mono text-primary">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Mode of Payment (Cash / Card / UPI - Matching Diagram) */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Mode of Payment
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', icon: Banknote },
                  { id: 'Card', icon: CreditCard },
                  { id: 'UPI', icon: QrCode },
                ].map((mode) => {
                  const Icon = mode.icon
                  const isSelected = paymentMethod === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span>{mode.id}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Generate Bill Button */}
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={submitting || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Receipt className="w-5 h-5" />
                  <span>Generate Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
