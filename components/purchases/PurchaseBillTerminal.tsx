// components/purchases/PurchaseBillTerminal.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Building2,
  Calendar,
  Hash,
  Phone,
  MapPin,
  Package,
  Barcode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Search,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, numberToWordsRupees } from '@/lib/formatters'
import { printPurchaseInvoice } from '@/lib/purchaseInvoicePrinter'
import { PurchaseInvoiceDetailView } from './PurchaseInvoiceDetailView'

export interface SupplierItem {
  id: string
  name: string
  phone?: string | null
  gstin?: string | null
  address?: string | null
  email?: string | null
}

export interface ExistingProductItem {
  id: string
  name: string
  sku: string
  description?: string | null
  price?: number
  cost_price?: number
}

export interface PurchaseBillItem {
  product_id?: string
  product_name: string
  sku?: string
  hsn_code: string
  quantity: number
  rate: number
  gross_amount: number
  taxable_amount: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  total_amount: number
  serial_numbers: string[]
}

export function PurchaseBillTerminal({
  initialSuppliers = [],
  initialProducts = [],
}: {
  initialSuppliers?: SupplierItem[]
  initialProducts?: ExistingProductItem[]
}) {
  // --- Suppliers State ---
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers)
  const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierItem[]>([])
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  // Company Details Form (Clean empty defaults)
  const [companyName, setCompanyName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [gstNo, setGstNo] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')

  // --- Products State ---
  const [products, setProducts] = useState<ExistingProductItem[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState<ExistingProductItem[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Current Product Entry Form State (Clean empty defaults)
  const [activeProductId, setActiveProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [rate, setRate] = useState<number>(0)
  const [cgstRate, setCgstRate] = useState<number>(9)
  const [sgstRate, setSgstRate] = useState<number>(9)
  const [igstRate, setIgstRate] = useState<number>(0)

  // Current Product Scanned Barcodes
  const [scannedSerials, setScannedSerials] = useState<string[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannerAlert, setScannerAlert] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const productNameInputRef = useRef<HTMLInputElement>(null)

  // --- Bill Cart Items ---
  const [billItems, setBillItems] = useState<PurchaseBillItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [savedPurchase, setSavedPurchase] = useState<any>(null)

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
        osc.frequency.setValueAtTime(880, ctx.currentTime) // crisp chime
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime) // alert buzzer
        osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch {}
  }

  // --- Calculation: Inclusive GST Pricing Model ---
  // rate => taxable + cgst + sgst + igst
  // gross = rate * qty
  // total amount is same as gross
  const grossAmount = Math.max(0, quantity * rate)
  const totalTaxRate = igstRate > 0 ? igstRate : (cgstRate + sgstRate)

  let calculatedTaxable = grossAmount
  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0

  if (totalTaxRate > 0 && grossAmount > 0) {
    const taxFactor = totalTaxRate / (100 + totalTaxRate)
    const totalTax = Math.round(grossAmount * taxFactor * 100) / 100
    if (igstRate > 0) {
      igstAmount = totalTax
      cgstAmount = 0
      sgstAmount = 0
    } else {
      cgstAmount = Math.round(totalTax * (cgstRate / totalTaxRate) * 100) / 100
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100
      igstAmount = 0
    }
    calculatedTaxable = Math.round((grossAmount - (cgstAmount + sgstAmount + igstAmount)) * 100) / 100
  }

  const totalAmount = grossAmount

  // Handle manual adjustment of Taxable Amount if user overrides it
  const handleTaxableChange = (typedTaxable: number) => {
    if (typedTaxable < 0) return
    const cgst = igstRate > 0 ? 0 : Math.round(((typedTaxable * cgstRate) / 100) * 100) / 100
    const sgst = igstRate > 0 ? 0 : Math.round(((typedTaxable * sgstRate) / 100) * 100) / 100
    const igst = igstRate > 0 ? Math.round(((typedTaxable * igstRate) / 100) * 100) / 100 : 0
    const newGross = Math.round((typedTaxable + cgst + sgst + igst) * 100) / 100
    const newRate = quantity > 0 ? Math.round((newGross / quantity) * 100) / 100 : newGross
    setRate(newRate)
  }

  // --- Live Dynamic Search for Suppliers ---
  const handleCompanyNameChange = async (typed: string) => {
    setCompanyName(typed)
    setSelectedSupplierId('')
    setShowSupplierDropdown(true)

    const q = typed.trim().toLowerCase()
    // Local filter first for instant 0ms results
    const localMatches = suppliers.filter((s) => s.name.toLowerCase().includes(q))
    setFilteredSuppliers(localMatches)

    // Remote query for live fresh DB records
    if (typed.trim().length >= 1) {
      try {
        const res = await fetch(`/api/suppliers?q=${encodeURIComponent(typed.trim())}`)
        if (res.ok) {
          const remoteData = await res.json()
          if (Array.isArray(remoteData)) {
            setFilteredSuppliers(remoteData)
          }
        }
      } catch (err) {
        // local matches stay
      }
    }
  }

  // Select Supplier from Dropdown
  const handleSelectSupplier = (s: SupplierItem) => {
    setSelectedSupplierId(s.id)
    setCompanyName(s.name)
    setPhoneNumber(s.phone || '')
    setGstNo(s.gstin || '')
    setAddress(s.address || '')
    setShowSupplierDropdown(false)
  }

  // --- Live Dynamic Search for Products ---
  const handleProductNameChange = async (typed: string) => {
    setProductName(typed)
    setActiveProductId('')
    setShowProductDropdown(true)

    const q = typed.trim().toLowerCase()
    // Local filter first for instant 0ms results
    const localMatches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    )
    setFilteredProducts(localMatches)

    // Remote query for live fresh DB records
    if (typed.trim().length >= 1) {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(typed.trim())}`)
        if (res.ok) {
          const remoteData = await res.json()
          if (Array.isArray(remoteData)) {
            setFilteredProducts(remoteData)
          }
        }
      } catch (err) {
        // local matches stay
      }
    }
  }

  // Select Product from Dropdown
  const handleSelectProduct = (p: ExistingProductItem) => {
    setActiveProductId(p.id)
    setProductName(p.name)
    setShowProductDropdown(false)

    // Extract HSN and Cost from description if present
    if (p.description) {
      const hsnMatch = p.description.match(/HSN:\s*([a-zA-Z0-9]+)/i)
      if (hsnMatch && hsnMatch[1]) {
        setHsnCode(hsnMatch[1])
      }
      const costMatch = p.description.match(/(?:Unit\s*Cost|Cost|Price):\s*₹?\s*(\d+(?:\.\d+)?)/i)
      if (costMatch && costMatch[1]) {
        const val = parseFloat(costMatch[1])
        if (!isNaN(val)) setRate(val)
      }
    }
  }

  // Focus Barcode Scanner Panel and keep cursor active
  const focusScanner = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus()
      barcodeInputRef.current?.select()
    }, 50)
  }

  // --- Instant Zero-Latency Barcode Scanner (Allows same / duplicate barcode to be added) ---
  const handleScanBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const code = barcodeInput.trim()
    if (!code) return

    // User requirement: "and see if the barcode or s.no is same also it should be also added"
    // Same barcode or S.NO is fully supported and added without rejection!
    playSound(true)
    const updated = [...scannedSerials, code]
    setScannedSerials(updated)
    setBarcodeInput('')

    const occurrences = updated.filter((s) => s === code).length
    const isRepeated = occurrences > 1

    setScannerAlert({
      type: 'success',
      message: isRepeated
        ? `✓ Barcode/S.NO "${code}" added (${occurrences}x repeated | ${updated.length} of ${Math.max(quantity, updated.length)} scanned)`
        : `✓ Barcode/S.NO "${code}" added (${updated.length} of ${Math.max(quantity, updated.length)} scanned)`,
    })

    if (isRepeated) {
      toast.success(`Added duplicate barcode: "${code}" (${occurrences}x)`)
    } else {
      toast.success(`Added barcode: "${code}"`)
    }

    // Automatically increase quantity if scanned count exceeds current quantity
    if (updated.length > quantity) {
      setQuantity(updated.length)
    }

    // Immediately keep focus active so user can continuously scan with barcode gun
    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus()
    })
  }

  // Remove individual scanned serial
  const removeSerial = (indexToRemove: number) => {
    setScannedSerials(scannedSerials.filter((_, idx) => idx !== indexToRemove))
    setScannerAlert({ type: null, message: '' })
    barcodeInputRef.current?.focus()
  }

  // Clear all scanned serials
  const clearAllSerials = () => {
    setScannedSerials([])
    setScannerAlert({ type: null, message: '' })
    barcodeInputRef.current?.focus()
  }

  // Add Item to Bill
  const handleAddItemToBill = () => {
    if (!productName.trim()) {
      toast.error('Please enter or select a Product Name.')
      productNameInputRef.current?.focus()
      return
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0.')
      return
    }
    if (rate <= 0) {
      toast.error('Please enter a valid purchase rate.')
      return
    }

    // If serial numbers scanned do not match quantity, alert user
    if (scannedSerials.length > 0 && scannedSerials.length !== quantity) {
      const proceed = confirm(
        `You have scanned ${scannedSerials.length} serial numbers for ${quantity} items. Do you want to adjust quantity to ${scannedSerials.length}?`
      )
      if (proceed) {
        setQuantity(scannedSerials.length)
      }
    }

    const newItem: PurchaseBillItem = {
      product_id: activeProductId || undefined,
      product_name: productName.trim(),
      hsn_code: hsnCode.trim(),
      quantity,
      rate,
      gross_amount: grossAmount,
      taxable_amount: calculatedTaxable,
      cgst_rate: igstRate > 0 ? 0 : cgstRate,
      cgst_amount: cgstAmount,
      sgst_rate: igstRate > 0 ? 0 : sgstRate,
      sgst_amount: sgstAmount,
      igst_rate: igstRate,
      igst_amount: igstAmount,
      total_amount: totalAmount,
      serial_numbers: [...scannedSerials],
    }

    setBillItems([...billItems, newItem])
    toast.success(`Added "${productName.trim()}" to purchase bill!`)

    // Reset product input form for next product
    setActiveProductId('')
    setProductName('')
    setHsnCode('')
    setQuantity(1)
    setRate(0)
    setCgstRate(9)
    setSgstRate(9)
    setIgstRate(0)
    setScannedSerials([])
    setScannerAlert({ type: null, message: '' })

    // Auto-focus back on product name for rapid data entry
    setTimeout(() => {
      productNameInputRef.current?.focus()
    }, 100)
  }

  // Remove Item from Bill
  const handleRemoveBillItem = (index: number) => {
    setBillItems(billItems.filter((_, idx) => idx !== index))
  }

  // Calculate Grand Totals of Bill
  const billTaxableTotal = billItems.reduce((sum, item) => sum + item.taxable_amount, 0)
  const billCgstTotal = billItems.reduce((sum, item) => sum + item.cgst_amount, 0)
  const billSgstTotal = billItems.reduce((sum, item) => sum + item.sgst_amount, 0)
  const billIgstTotal = billItems.reduce((sum, item) => sum + item.igst_amount, 0)
  const billGrandTotal = billItems.reduce((sum, item) => sum + item.total_amount, 0)

  // Save Purchase Bill to Server
  const handleSavePurchaseBill = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter the Supplier / Company Name.')
      return
    }
    if (billItems.length === 0) {
      toast.error('Please add at least one product to the purchase bill.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        supplier: {
          id: selectedSupplierId || undefined,
          name: companyName.trim(),
          gstin: gstNo.trim() || null,
          phone: phoneNumber.trim() || null,
          address: address.trim() || null,
        },
        invoice_number: invoiceNumber.trim() || undefined,
        receipt_date: invoiceDate || undefined,
        items: billItems,
        totals: {
          taxable_total: billTaxableTotal,
          cgst_total: billCgstTotal,
          sgst_total: billSgstTotal,
          igst_total: billIgstTotal,
          grand_total: billGrandTotal,
        },
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save purchase bill')
      }

      toast.success('Purchase bill recorded and stock updated successfully!')
      setSavedPurchase(data)
    } catch (err: any) {
      console.error('Save purchase error:', err)
      toast.error(err.message || 'An error occurred while saving purchase bill')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset for a New Bill (All fields empty)
  const handleStartNewBill = () => {
    setSavedPurchase(null)
    setBillItems([])
    setCompanyName('')
    setSelectedSupplierId('')
    setGstNo('')
    setPhoneNumber('')
    setAddress('')
    setInvoiceNumber('')
    setInvoiceDate('')
    setProductName('')
    setActiveProductId('')
    setHsnCode('')
    setQuantity(1)
    setRate(0)
    setScannedSerials([])
  }

  // If purchase is saved, render full Invoice view with print option!
  if (savedPurchase) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 dark:text-emerald-100">
                Purchase Bill Recorded Successfully!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Inventory stock levels incremented and serial numbers registered in database.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printPurchaseInvoice(savedPurchase)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Purchase Bill</span>
            </button>
            <button
              onClick={handleStartNewBill}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Bill</span>
            </button>
          </div>
        </div>

        <PurchaseInvoiceDetailView purchase={savedPurchase} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Gnapika Computer Shopee &bull; Inward Stock Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Record Purchase Bill
          </h1>
          <p className="text-xs text-slate-500">
            Add supplier invoices, auto-create products, scan serial numbers, and update warehouse stock.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid matching the wireframe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Supplier Details + Product Adding + Current Bill (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Supplier / Company Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Supplier / Company Details
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Auto-fills if company exists in DB
              </span>
            </div>

            {/* Top Row: Company Name & Invoice Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dynamic Search Company Name */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    onFocus={() => {
                      if (companyName.trim() || suppliers.length > 0) setShowSupplierDropdown(true)
                    }}
                    placeholder="Search or enter company..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Autocomplete Dropdown */}
                {showSupplierDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSupplier(s)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-700/60 transition flex flex-col"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-medium">
                            Existing Supplier
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {s.gstin ? `GSTIN: ${s.gstin}` : ''} {s.phone ? `| Ph: ${s.phone}` : ''} {s.address ? `| ${s.address}` : ''}
                        </span>
                      </button>
                    ))}

                    {companyName.trim() && !filteredSuppliers.some((s) => s.name.toLowerCase() === companyName.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setShowSupplierDropdown(false)}
                        className="w-full text-left px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-between text-primary font-medium"
                      >
                        <span>+ Use &quot;<b>{companyName.trim()}</b>&quot; (New Supplier)</span>
                        <span className="text-[10px] text-slate-400">Will auto-save to DB</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Number (Empty by default) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter vendor bill / invoice number..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              {/* Date (Empty by default) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* GST No */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GST No
                </label>
                <input
                  type="text"
                  value={gstNo}
                  onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 37AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, State"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Adding (Matching Wireframe Grid) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Product Adding
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Dynamic search available &bull; New products auto-added to DB
              </span>
            </div>

            {/* 2-Column Form Layout matching the wireframe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name (Dynamic Search) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={productNameInputRef}
                    type="text"
                    value={productName}
                    onChange={(e) => handleProductNameChange(e.target.value)}
                    onFocus={() => {
                      if (productName.trim() || products.length > 0) setShowProductDropdown(true)
                    }}
                    placeholder="Search or enter product..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-medium"
                  />
                  <Package className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Autocomplete Dropdown */}
                {showProductDropdown && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full text-left px-3 py-2.5 text-xs hover:bg-emerald-50 dark:hover:bg-slate-700/60 transition flex flex-col"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded font-medium">
                            Existing in Catalog
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          SKU: {p.sku} {p.description ? `| ${p.description}` : ''}
                        </span>
                      </button>
                    ))}

                    {productName.trim() && !filteredProducts.some((p) => p.name.toLowerCase() === productName.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setShowProductDropdown(false)}
                        className="w-full text-left px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-between text-emerald-600 font-medium"
                      >
                        <span>+ Use &quot;<b>{productName.trim()}</b>&quot; (New Product)</span>
                        <span className="text-[10px] text-slate-400">Will auto-register to DB</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* HSN Code (Empty by default) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="e.g. 8471"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-mono"
                />
              </div>

              {/* Qty */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Qty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-bold"
                />
              </div>

              {/* Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rate (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rate || ''}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-semibold"
                />
              </div>

              {/* Gross (Auto-calculated: Qty * Rate) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gross (Qty &times; Rate)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${grossAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              {/* Taxable Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Taxable Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={calculatedTaxable > 0 ? calculatedTaxable : ''}
                  onChange={(e) => handleTaxableChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden font-semibold"
                />
              </div>

              {/* CGST% (9% Default) & CGST Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CGST% (9% Default)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CGST Amount (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${cgstAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              {/* SGST% (9% Default) & SGST Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SGST% (9% Default)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SGST Amount (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${sgstAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              {/* IGST% (0% Default) & IGST Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IGST% (0% Default)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={igstRate}
                  onChange={(e) => setIgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IGST Amount (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${igstAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed"
                />
              </div>

              {/* Total Amount & Add Serial No Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Amount (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`₹${totalAmount.toFixed(2)}`}
                  className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-primary font-bold cursor-not-allowed"
                />
              </div>

              {/* Add Serial No Button (Directly focuses and activates right scanner) */}
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={focusScanner}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 group"
                >
                  <Barcode className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                  <span>Add Serial No ({scannedSerials.length}/{quantity})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition" />
                </button>
              </div>
            </div>

            {/* Bottom Button to Add Item to Bill */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleAddItemToBill}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product to Purchase Bill</span>
              </button>
            </div>
          </div>

          {/* Section 3: Current Bill Items Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Current Purchase Bill Items ({billItems.length})
                </h2>
              </div>
            </div>

            {billItems.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No products added yet. Add items using the form above.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase">
                        <th className="py-2 px-2 text-center">#</th>
                        <th className="py-2 px-2">Item</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Taxable</th>
                        <th className="py-2 px-2 text-right">GST</th>
                        <th className="py-2 px-2 text-right">Total</th>
                        <th className="py-2 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {billItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">
                            <div>{it.product_name}</div>
                            {it.serial_numbers.length > 0 && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Barcode className="w-3 h-3 text-primary" />
                                <span>{it.serial_numbers.length} serials attached</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold">{it.quantity}</td>
                          <td className="py-2.5 px-2 text-right">₹{it.rate.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right">₹{it.taxable_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right text-slate-500">
                            ₹{(it.cgst_amount + it.sgst_amount + it.igst_amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                            ₹{it.total_amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBillItem(idx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Totals Summary */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Taxable Total:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{billTaxableTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>CGST Total:</span>
                    <span>₹{billCgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>SGST Total:</span>
                    <span>₹{billSgstTotal.toFixed(2)}</span>
                  </div>
                  {billIgstTotal > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>IGST Total:</span>
                      <span>₹{billIgstTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total:</span>
                    <span className="text-primary">₹{billGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Save Purchase Bill Button */}
                <button
                  type="button"
                  onClick={handleSavePurchaseBill}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Inward Stock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Purchase Bill &amp; Update Stock</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Barcode Scanner Panel (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide">
                    Barcode / S.NO Scanner
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Fast instant duplicate check
                  </p>
                </div>
              </div>

              {scannedSerials.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllSerials}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Target Item Status Banner */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Target Product
                </span>
                <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                  {productName.trim() || 'Select product on left'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Scan Progress
                </span>
                <div
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    scannedSerials.length === quantity
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {scannedSerials.length} / {quantity} Scanned
                </div>
              </div>
            </div>

            {/* Barcode Scanner Input Form (NEVER disabled - Continuous Focus) */}
            <form onSubmit={handleScanBarcode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scan Barcode Gun or Type Serial
                </label>
                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode or press Enter..."
                    className="w-full pl-9 pr-14 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                  <Barcode className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <button
                    type="submit"
                    disabled={!barcodeInput.trim()}
                    className="absolute right-1.5 top-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Notification / Alert Area */}
            {scannerAlert.type && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  scannerAlert.type === 'error'
                    ? 'bg-rose-950/80 border border-rose-800 text-rose-200'
                    : 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                }`}
              >
                {scannerAlert.type === 'error' ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>{scannerAlert.message}</div>
              </div>
            )}

            {/* Scanned Barcodes List */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Scanned Barcodes ({scannedSerials.length})</span>
                <span className="text-[10px] text-slate-500">Fast continuous scan active</span>
              </div>

              {scannedSerials.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
                  All scanned barcodes for this product will appear here.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {scannedSerials.map((s, idx) => {
                    const occurrencesBeforeThis = scannedSerials.slice(0, idx + 1).filter((c) => c === s).length
                    const totalOccurrences = scannedSerials.filter((c) => c === s).length
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs font-mono text-slate-200 hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-sans text-[10px]">#{idx + 1}</span>
                          <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-white">{s}</span>
                          {totalOccurrences > 1 && (
                            <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                              Repeat #{occurrencesBeforeThis}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSerial(idx)}
                          className="text-slate-400 hover:text-rose-400 transition p-0.5 hover:bg-slate-700 rounded"
                          title="Remove this barcode"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
