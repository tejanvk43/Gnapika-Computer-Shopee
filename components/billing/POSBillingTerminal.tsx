'use client'

import { useState, useEffect, useRef } from 'react'
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
  Check,
  AlertTriangle,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { SHOP_DETAILS, formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { printTaxInvoice } from '@/lib/invoicePrinter'
import { TaxInvoicePaperView } from '@/components/billing/TaxInvoicePaperView'

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
      product.description.match(/(?:Unit\s*Cost|Cost|Price|MRP|Rate):\s*₹?\s*(\d+(?:\.\d+)?)/i) ||
      product.description.match(/₹\s*(\d+(?:\.\d+)?)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  return 0
}

export function getProductBarcodeValues(p: any): string[] {
  if (!p || !p.product_barcodes) return []
  if (Array.isArray(p.product_barcodes)) {
    return p.product_barcodes
      .map((b: any) => String(b?.barcode_value || '').toLowerCase())
      .filter(Boolean)
  }
  if (typeof p.product_barcodes === 'object' && p.product_barcodes.barcode_value) {
    return [String(p.product_barcodes.barcode_value).toLowerCase()]
  }
  return []
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
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerFound, setCustomerFound] = useState(false)

  // Products & Search State
  const [products, setProducts] = useState<ProductItem[]>(initialProducts)
  const [productQuery, setProductQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const productInputRef = useRef<HTMLInputElement>(null)

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [serviceCharge, setServiceCharge] = useState<number>(0)
  const [serviceChargeDesc, setServiceChargeDesc] = useState<string>('Service Charge')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash')
  const [paymentModeType, setPaymentModeType] = useState<'full' | 'partial' | 'credit'>('full')
  const [amountPaidNow, setAmountPaidNow] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Generated Invoice Result
  const [generatedInvoice, setGeneratedInvoice] = useState<any | null>(null)

  // Audio synthesizer for zero-latency instant feedback
  const playSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (success) {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      }
    } catch {}
  }

  // Auto-lookup customer by initial phone
  useEffect(() => {
    if (initialPhone) {
      searchCustomer(initialPhone)
    }
  }, [initialPhone])

  // Dynamic Customer Search
  const searchCustomer = async (term: string) => {
    const q = term.trim()
    if (!q) {
      setCustomerSearchResults([])
      setShowCustomerDropdown(false)
      return
    }

    setSearchingCustomer(true)
    setShowCustomerDropdown(true)
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCustomerSearchResults(data)
          if (data.length === 1 && (data[0].phone_number === q || data[0].customer_name.toLowerCase() === q.toLowerCase())) {
            // Auto match exact
            setCustomer({
              id: data[0].id,
              customer_name: data[0].customer_name || '',
              phone_number: data[0].phone_number || q,
              alt_phone_number: data[0].alt_phone_number || '',
              email: data[0].email || '',
              address: data[0].address || '',
              gstin: data[0].gstin || '',
            })
            setCustomerFound(true)
          }
        }
      }
    } catch (err) {
      console.error('Customer lookup error:', err)
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleSelectCustomer = (found: any) => {
    setCustomer({
      id: found.id,
      customer_name: found.customer_name || '',
      phone_number: found.phone_number || '',
      alt_phone_number: found.alt_phone_number || '',
      email: found.email || '',
      address: found.address || '',
      gstin: found.gstin || '',
    })
    setCustomerFound(true)
    setShowCustomerDropdown(false)
    toast.success(`Selected customer: ${found.customer_name}`)
  }

  // Dynamic Product Query with Remote Fallback
  const handleProductQueryChange = async (typed: string) => {
    setProductQuery(typed)
    if (!typed.trim()) {
      setFilteredProducts([])
      setShowProductDropdown(false)
      return
    }

    const q = typed.trim().toLowerCase()
    // Local filter first for instant 0ms results
    const localMatches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        getProductBarcodeValues(p).some((val) => val.includes(q))
    )
    setFilteredProducts(localMatches)
    setShowProductDropdown(true)

    // Remote fetch for live fresh DB records
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(typed.trim())}`)
      if (res.ok) {
        const remote = await res.json()
        if (Array.isArray(remote)) {
          setFilteredProducts(remote)
          // Merge into products list
          setProducts((prev) => {
            const m = new Map(prev.map((p) => [p.id, p]))
            for (const r of remote) m.set(r.id, r)
            return Array.from(m.values())
          })
        }
      }
    } catch (err) {
      console.warn('Product remote search notice:', err)
    }
  }

  // Add Product to Cart (Allows duplicate barcode scan to increment quantity)
  const addToCart = (product: ProductItem, customPrice?: number) => {
    const itemPrice = customPrice !== undefined ? customPrice : extractProductPrice(product)
    const existingIndex = cart.findIndex((item) => item.product_id === product.id)

    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += 1
      const taxable = Math.max(0, updated[existingIndex].quantity * updated[existingIndex].unit_price - (updated[existingIndex].discount || 0))
      updated[existingIndex].line_total = Math.round(taxable * 1.18 * 100) / 100
      setCart(updated)
      playSound(true)
      toast.success(`Incremented "${product.name}" quantity to ${updated[existingIndex].quantity}`)
    } else {
      const taxable = itemPrice
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: itemPrice,
          quantity: 1,
          discount: 0,
          line_total: Math.round(taxable * 1.18 * 100) / 100,
        },
      ])
      playSound(true)
      toast.success(`Added "${product.name}" (₹${itemPrice}) to bill`)
    }

    setProductQuery('')
    setShowProductDropdown(false)
    requestAnimationFrame(() => {
      productInputRef.current?.focus()
    })
  }

  // Enter Key / Hardware Barcode Scanner Handler
  const handleProductInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = productQuery.trim()
      if (!code) return

      // 1. Check if exact barcode, SKU or name matches locally
      let matched = products.find(
        (p) =>
          getProductBarcodeValues(p).some((val) => val === code.toLowerCase()) ||
          p.sku.toLowerCase() === code.toLowerCase() ||
          p.name.toLowerCase() === code.toLowerCase()
      )

      // 2. If not found locally, query remote /api/products?barcode=...
      if (!matched) {
        try {
          const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`)
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
              matched = data[0]
            }
          }
        } catch {}
      }

      // 3. Fallback to single filtered product
      if (!matched && filteredProducts.length === 1) {
        matched = filteredProducts[0]
      }

      if (matched) {
        addToCart(matched)
        setProductQuery('')
        setShowProductDropdown(false)
        requestAnimationFrame(() => productInputRef.current?.focus())
      } else {
        toast.error(`No product found for barcode or query: "${code}"`)
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
    const taxable = Math.max(0, qty * updated[index].unit_price - (updated[index].discount || 0))
    updated[index].line_total = Math.round(taxable * 1.18 * 100) / 100
    setCart(updated)
  }

  const updatePrice = (index: number, price: number) => {
    const updated = [...cart]
    updated[index].unit_price = price
    const taxable = Math.max(0, updated[index].quantity * price - (updated[index].discount || 0))
    updated[index].line_total = Math.round(taxable * 1.18 * 100) / 100
    setCart(updated)
  }

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // --- Taxable Pricing & GST Calculations ---
  // Unit price and service charge are taxable amounts
  // taxable = (unit_price * qty) - discount
  // GST 18% (9% CGST + 9% SGST) added on top
  const productsTaxable = cart.reduce(
    (sum, it) => sum + Math.max(0, it.unit_price * it.quantity - (it.discount || 0)),
    0
  )
  const numServiceCharge = Math.max(0, parseFloat(serviceCharge as any) || 0)
  const subtotal = Math.round((productsTaxable + numServiceCharge) * 100) / 100
  const cgstAmount = Math.round(subtotal * 0.09 * 100) / 100
  const sgstAmount = Math.round(subtotal * 0.09 * 100) / 100
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100
  const grandTotal = Math.round((subtotal + totalGst) * 100) / 100

  // Effective Payment & Due Calculations
  const effectiveAmountPaid = paymentModeType === 'full'
    ? grandTotal
    : paymentModeType === 'credit'
    ? 0
    : Math.min(grandTotal, Math.max(0, parseFloat(amountPaidNow) || 0))
  const effectiveBalanceDue = Math.max(0, Math.round((grandTotal - effectiveAmountPaid) * 100) / 100)

  // Handle Bill Generation
  const handleGenerateBill = async () => {
    if (!customer.customer_name.trim()) {
      toast.error('Please enter customer name')
      return
    }
    if (cart.length === 0 && numServiceCharge <= 0) {
      toast.error('Please add at least one product or service charge to the bill')
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
          service_charge: numServiceCharge,
          service_charge_description: serviceChargeDesc,
          subtotal,
          gst_amount: totalGst,
          grand_total: grandTotal,
          amount_paid: effectiveAmountPaid,
          payment_method: paymentModeType === 'credit' ? 'Due / Credit' : paymentMethod,
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
        service_charge: numServiceCharge,
        service_charge_description: serviceChargeDesc,
        subtotal,
        gst_amount: totalGst,
        grand_total: grandTotal,
        amount_paid: effectiveAmountPaid,
        balance_due: effectiveBalanceDue,
        payment_method: paymentModeType === 'credit' ? 'Due / Credit' : paymentMethod,
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
    setServiceCharge(0)
    setServiceChargeDesc('Service Charge')
    setPaymentModeType('full')
    setAmountPaidNow('')
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
      {/* Generated Bill Template Modal */}
      {generatedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Invoice Generated: {generatedInvoice.invoice_number}
                </h3>
              </div>
              <button
                onClick={() => setGeneratedInvoice(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exact Paper View */}
            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white">
              <TaxInvoicePaperView invoice={generatedInvoice} />
            </div>

            {/* Action Buttons: Print, Reset */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={resetForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Bill</span>
              </button>

              <button
                onClick={() => printTaxInvoice(generatedInvoice)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left (Customer + Products + Cart) / Right (Billing Summary & Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Cart */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Details Box with Live Search Dropdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Customer Details
                </h3>
              </div>
              <span className="text-xs text-slate-400 italic">
                Type name or phone for instant auto-complete!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number Input */}
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
                      const val = e.target.value
                      setCustomer({ ...customer, phone_number: val })
                      searchCustomer(val)
                    }}
                    onFocus={() => {
                      if (customer.phone_number.trim() || customer.customer_name.trim()) {
                        searchCustomer(customer.phone_number || customer.customer_name)
                      }
                    }}
                    placeholder="e.g. 8919998149"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary font-mono text-slate-900 dark:text-white"
                    required
                  />
                  {searchingCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Name Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter Customer Name *
                </label>
                <input
                  type="text"
                  value={customer.customer_name}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomer({ ...customer, customer_name: val })
                    searchCustomer(val)
                  }}
                  onFocus={() => {
                    if (customer.customer_name.trim()) {
                      searchCustomer(customer.customer_name)
                    }
                  }}
                  placeholder="Customer Full Name"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>

              {/* Alternative Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alternative Phone Number
                </label>
                <input
                  type="tel"
                  value={customer.alt_phone_number}
                  onChange={(e) => setCustomer({ ...customer, alt_phone_number: e.target.value })}
                  placeholder="Optional alternate phone"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Street / City / Locality"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Customer Live Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute z-30 left-6 right-6 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {customerSearchResults.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 flex items-center justify-between">
                    <span>No existing customer matches &quot;{customer.customer_name || customer.phone_number}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="text-primary font-semibold hover:underline"
                    >
                      + Use as New Customer
                    </button>
                  </div>
                ) : (
                  <>
                    {customerSearchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-3 text-left hover:bg-emerald-50 dark:hover:bg-slate-700/60 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{c.customer_name}</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-medium">
                              Saved Customer
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            {c.phone_number && <span>Ph: {c.phone_number}</span>}
                            {c.address && <span>| {c.address}</span>}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-primary">
                          Auto-fill &rarr;
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="w-full p-2.5 text-center text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40 font-medium"
                    >
                      + Register as New Customer
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Product Lookup & Barcode Scanning */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                <span>Add Products to Bill</span>
              </h3>
              {/* <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <Barcode className="w-4 h-4 text-primary" />
                <span>{showScanner ? 'Hide Camera Scanner' : 'Scan via Camera'}</span>
              </button> */}
            </div>

            {showScanner && (
              <div className="mb-4 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                <BarcodeScanner onDetected={(scannedCode: string) => {
                  setProductQuery(scannedCode)
                  handleProductQueryChange(scannedCode)
                }} />
              </div>
            )}

            {/* Product Search Input (Continuous focus for barcode guns) */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => handleProductQueryChange(e.target.value)}
                onKeyDown={handleProductInputKeyDown}
                placeholder="Scan barcode gun or type product name/SKU (Press Enter)..."
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400 font-mono"
              />

              {/* Autocomplete Dropdown */}
              {showProductDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">
                      No matching products found.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const itemPrice = extractProductPrice(p)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addToCart(p)}
                          className="w-full p-3 text-left hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 transition"
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

          {/* Cart Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Items in Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="p-3 pl-4">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-right">Taxable Rate (₹)</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Line Total (+18% GST)</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Scan barcodes or search products above to add items to this bill.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                            className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-mono text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
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
                            className="text-red-500 hover:text-red-700 p-1 rounded-md"
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

        {/* Right Column: Billing Summary & Payment */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Billing Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">+18% GST (9% CGST + 9% SGST) added to taxable amounts</p>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Products Taxable:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{productsTaxable.toFixed(2)}
                </span>
              </div>
              {numServiceCharge > 0 && (
                <div className="flex justify-between text-primary font-semibold">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{serviceChargeDesc || 'Service Charge'}:</span>
                  </span>
                  <span className="font-mono font-bold">+₹{numServiceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span>Total Taxable Subtotal:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CGST (9%):</span>
                <span className="font-mono">₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>SGST (9%):</span>
                <span className="font-mono">₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Total GST (18%):</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">₹{totalGst.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900 dark:text-white">Net Payable:</span>
                <span className="text-2xl font-black font-mono text-primary">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Service Charge Input Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                  <span>Service / Labor Charge</span>
                </label>
                {serviceCharge > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setServiceCharge(0)
                      setServiceChargeDesc('Service Charge')
                    }}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    Clear (₹0)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  <input
                    type="text"
                    value={serviceChargeDesc}
                    onChange={(e) => setServiceChargeDesc(e.target.value)}
                    placeholder="e.g. Service Charge, Installation"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="col-span-5 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={serviceCharge === 0 ? '' : serviceCharge}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setServiceCharge(Math.max(0, val))
                    }}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick:</span>
                {[100, 200, 300, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setServiceCharge(amt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition ${
                      serviceCharge === amt
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Settlement Type (Full, Partial Advance, or Credit/Due) */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Payment Settlement
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModeType('full')
                    setAmountPaidNow(grandTotal.toString())
                  }}
                  className={`py-2 px-1 rounded-lg transition text-center cursor-pointer ${
                    paymentModeType === 'full'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModeType('partial')
                    if (!amountPaidNow || parseFloat(amountPaidNow) >= grandTotal) {
                      setAmountPaidNow((grandTotal * 0.5).toFixed(0))
                    }
                  }}
                  className={`py-2 px-1 rounded-lg transition text-center cursor-pointer ${
                    paymentModeType === 'partial'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Partial Advance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModeType('credit')
                    setAmountPaidNow('0')
                  }}
                  className={`py-2 px-1 rounded-lg transition text-center cursor-pointer ${
                    paymentModeType === 'credit'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Due / Credit
                </button>
              </div>

              {/* Partial Amount Input */}
              {paymentModeType === 'partial' && (
                <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-300">Amount Paid Now (₹):</span>
                    <span className="text-[11px] text-slate-500">Max: ₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={grandTotal}
                      value={amountPaidNow}
                      onChange={(e) => setAmountPaidNow(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[500, 1000, 2000, 5000].filter((val) => val < grandTotal).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountPaidNow(val.toString())}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded text-[11px] font-mono text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 cursor-pointer"
                      >
                        ₹{val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Due Amount Banner */}
              {effectiveBalanceDue > 0 && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs">
                  <span className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Outstanding Due:</span>
                  </span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                    ₹{effectiveBalanceDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Mode of Payment (Only relevant if paying something now) */}
            {paymentModeType !== 'credit' && effectiveAmountPaid > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Payment Mode (for ₹{effectiveAmountPaid.toFixed(2)})
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
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
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
            )}

            {/* Generate Bill Button */}
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleGenerateBill}
              className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md shadow-primary/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Bill...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  {effectiveBalanceDue > 0 ? (
                    <span>
                      Generate Bill (Paid ₹{effectiveAmountPaid.toFixed(2)} | Due ₹{effectiveBalanceDue.toFixed(2)})
                    </span>
                  ) : (
                    <span>Generate Bill (₹{grandTotal.toFixed(2)})</span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
