'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QuotationData, QuotationItem } from '@/lib/quotations'
import { numberToWordsRupees } from '@/lib/formatters'
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  Truck,
  CreditCard,
  Percent,
  CheckCircle2,
  Info,
} from 'lucide-react'
import Link from 'next/link'

interface QuotationEditorProps {
  initialData?: QuotationData
  nextQuoteNumber: string
  existingCompanies?: Array<{ name: string; address?: string; gstin?: string; phone?: string }>
}

export function QuotationEditor({ initialData, nextQuoteNumber, existingCompanies = [] }: QuotationEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Basic Information
  const [quotationName, setQuotationName] = useState(initialData?.quotation_name || '')
  const [quotationNumber, setQuotationNumber] = useState(initialData?.quotation_number || nextQuoteNumber)
  const [quotationDate, setQuotationDate] = useState(
    initialData?.quotation_date || new Date().toISOString().slice(0, 10)
  )

  // Company / Buyer Info
  const [companyName, setCompanyName] = useState(initialData?.company_name || '')
  const [companyAddress, setCompanyAddress] = useState(initialData?.company_address || '')
  const [companyState, setCompanyState] = useState(
    initialData?.company_state || 'Andhra Pradesh, Code : 37'
  )
  const [companyGstin, setCompanyGstin] = useState(initialData?.company_gstin || '')
  const [companyPhone, setCompanyPhone] = useState(initialData?.company_phone || '')
  const [companyEmail, setCompanyEmail] = useState(initialData?.company_email || '')

  // Consignee (Ship to)
  const [sameAsBuyer, setSameAsBuyer] = useState(
    !initialData || initialData.consignee_name === initialData.company_name
  )
  const [consigneeName, setConsigneeName] = useState(initialData?.consignee_name || '')
  const [consigneeAddress, setConsigneeAddress] = useState(initialData?.consignee_address || '')
  const [consigneeState, setConsigneeState] = useState(
    initialData?.consignee_state || 'Andhra Pradesh, Code : 37'
  )

  // Dispatch & Metadata
  const [deliveryNote, setDeliveryNote] = useState(initialData?.delivery_note || '')
  const [modeTermsOfPayment, setModeTermsOfPayment] = useState(
    initialData?.mode_terms_of_payment || 'Mode/Terms of Payment'
  )
  const [referenceNoDate, setReferenceNoDate] = useState(initialData?.reference_no_date || '')
  const [otherReferences, setOtherReferences] = useState(initialData?.other_references || '')
  const [buyersOrderNo, setBuyersOrderNo] = useState(initialData?.buyers_order_no || '')
  const [buyersOrderDate, setBuyersOrderDate] = useState(initialData?.buyers_order_date || '')
  const [dispatchDocNo, setDispatchDocNo] = useState(initialData?.dispatch_doc_no || '')
  const [deliveryNoteDate, setDeliveryNoteDate] = useState(initialData?.delivery_note_date || '')
  const [dispatchedThrough, setDispatchedThrough] = useState(initialData?.dispatched_through || '')
  const [destination, setDestination] = useState(initialData?.destination || 'Vijayawada')
  const [termsOfDelivery, setTermsOfDelivery] = useState(
    initialData?.terms_of_delivery || 'Standard Delivery at Site'
  )

  // Bank Details
  const [bankName, setBankName] = useState(initialData?.bank_details?.bank_name || 'KARUR VYSYA BANK')
  const [bankAcc, setBankAcc] = useState(initialData?.bank_details?.account_no || '1413010000000199')
  const [bankIfsc, setBankIfsc] = useState(
    initialData?.bank_details?.branch_ifsc || 'GOVERNOR PETA & KVBL0001413'
  )

  // Items State
  const [items, setItems] = useState<QuotationItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [
          {
            id: 'item-1',
            description: 'HP LAPTOPS CORE5',
            specifications:
              'Hp Omni Book 5 Flip Laptop\nCore5, 16Gb Ram, 512SSD, 14 Inch Screen\nTouch Screen',
            hsn_sac: '84713010',
            quantity: 1,
            unit: 'NOS',
            rate_incl_tax: 120000,
            rate_excl_tax: 101694.92,
            gst_rate: 18,
            discount_percent: 0,
            taxable_amount: 101694.92,
            cgst_rate: 9,
            cgst_amount: 9152.54,
            sgst_rate: 9,
            sgst_amount: 9152.54,
            igst_rate: 0,
            igst_amount: 0,
            line_total: 120000,
          },
        ]
  )

  // Sync Consignee when sameAsBuyer is true
  useEffect(() => {
    if (sameAsBuyer) {
      setConsigneeName(companyName)
      setConsigneeAddress(companyAddress)
      setConsigneeState(companyState)
    }
  }, [sameAsBuyer, companyName, companyAddress, companyState])

  // Select company from existing
  const handleSelectCompany = (comp: { name: string; address?: string; gstin?: string; phone?: string }) => {
    setCompanyName(comp.name)
    if (comp.address) setCompanyAddress(comp.address)
    if (comp.gstin) setCompanyGstin(comp.gstin)
    if (comp.phone) setCompanyPhone(comp.phone)
  }

  // Recalculate item line values
  const recalculateItem = (
    item: QuotationItem,
    fieldChanged: 'incl' | 'excl' | 'gst' | 'qty' | 'disc',
    newVal: number
  ): QuotationItem => {
    const updated = { ...item }

    if (fieldChanged === 'incl') updated.rate_incl_tax = newVal
    if (fieldChanged === 'excl') updated.rate_excl_tax = newVal
    if (fieldChanged === 'gst') updated.gst_rate = newVal
    if (fieldChanged === 'qty') updated.quantity = newVal
    if (fieldChanged === 'disc') updated.discount_percent = newVal

    const gstMultiplier = 1 + updated.gst_rate / 100

    if (fieldChanged === 'incl') {
      updated.rate_excl_tax = Math.round((updated.rate_incl_tax / gstMultiplier) * 100) / 100
    } else if (fieldChanged === 'excl' || fieldChanged === 'gst') {
      updated.rate_incl_tax = Math.round(updated.rate_excl_tax * gstMultiplier * 100) / 100
    }

    const grossTaxable = updated.rate_excl_tax * updated.quantity
    const discountAmount = Math.round(grossTaxable * (updated.discount_percent / 100) * 100) / 100
    updated.taxable_amount = Math.max(0, Math.round((grossTaxable - discountAmount) * 100) / 100)

    updated.cgst_rate = updated.gst_rate / 2
    updated.sgst_rate = updated.gst_rate / 2
    updated.cgst_amount = Math.round(updated.taxable_amount * (updated.cgst_rate / 100) * 100) / 100
    updated.sgst_amount = Math.round(updated.taxable_amount * (updated.sgst_rate / 100) * 100) / 100
    updated.igst_amount = 0

    updated.line_total =
      Math.round((updated.taxable_amount + updated.cgst_amount + updated.sgst_amount) * 100) / 100

    return updated
  }

  const handleItemFieldChange = (
    index: number,
    field: keyof QuotationItem,
    val: string | number
  ) => {
    const newItems = [...items]
    const current = newItems[index]

    if (field === 'rate_incl_tax') {
      newItems[index] = recalculateItem(current, 'incl', parseFloat(val as string) || 0)
    } else if (field === 'rate_excl_tax') {
      newItems[index] = recalculateItem(current, 'excl', parseFloat(val as string) || 0)
    } else if (field === 'gst_rate') {
      newItems[index] = recalculateItem(current, 'gst', parseFloat(val as string) || 0)
    } else if (field === 'quantity') {
      newItems[index] = recalculateItem(current, 'qty', parseFloat(val as string) || 1)
    } else if (field === 'discount_percent') {
      newItems[index] = recalculateItem(current, 'disc', parseFloat(val as string) || 0)
    } else {
      (newItems[index] as any)[field] = val
    }

    setItems(newItems)
  }

  const handleAddItem = () => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      description: '',
      specifications: '',
      hsn_sac: '84713010',
      quantity: 1,
      unit: 'NOS',
      rate_incl_tax: 0,
      rate_excl_tax: 0,
      gst_rate: 18,
      discount_percent: 0,
      taxable_amount: 0,
      cgst_rate: 9,
      cgst_amount: 0,
      sgst_rate: 9,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      line_total: 0,
    }
    setItems([...items, newItem])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  // Totals calculations
  const totalQty = items.reduce((acc, it) => acc + (parseFloat(it.quantity as any) || 0), 0)
  const taxableTotal = Math.round(items.reduce((acc, it) => acc + (it.taxable_amount || 0), 0) * 100) / 100
  const totalCgst = Math.round(items.reduce((acc, it) => acc + (it.cgst_amount || 0), 0) * 100) / 100
  const totalSgst = Math.round(items.reduce((acc, it) => acc + (it.sgst_amount || 0), 0) * 100) / 100
  const totalTax = Math.round((totalCgst + totalSgst) * 100) / 100
  const grandTotal = Math.round(items.reduce((acc, it) => acc + (it.line_total || 0), 0) * 100) / 100

  const amountInWords = numberToWordsRupees(grandTotal)
  const taxInWords = numberToWordsRupees(totalTax)

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!quotationName.trim()) {
      setErrorMsg('Please enter a Quotation / Project Name.')
      return
    }
    if (!companyName.trim()) {
      setErrorMsg('Please specify the Company / Client Name.')
      return
    }
    if (items.length === 0 || !items[0].description.trim()) {
      setErrorMsg('Please add at least one line item with a description.')
      return
    }

    setSaving(true)

    const payload: Partial<QuotationData> = {
      id: initialData?.id,
      quotation_number: quotationNumber,
      quotation_name: quotationName,
      company_name: companyName,
      company_address: companyAddress,
      company_state: companyState,
      company_gstin: companyGstin,
      company_phone: companyPhone,
      company_email: companyEmail,
      consignee_name: sameAsBuyer ? companyName : consigneeName,
      consignee_address: sameAsBuyer ? companyAddress : consigneeAddress,
      consignee_state: sameAsBuyer ? companyState : consigneeState,
      quotation_date: quotationDate,
      delivery_note: deliveryNote,
      mode_terms_of_payment: modeTermsOfPayment,
      reference_no_date: referenceNoDate,
      other_references: otherReferences,
      buyers_order_no: buyersOrderNo,
      buyers_order_date: buyersOrderDate,
      dispatch_doc_no: dispatchDocNo,
      delivery_note_date: deliveryNoteDate,
      dispatched_through: dispatchedThrough,
      destination: destination,
      terms_of_delivery: termsOfDelivery,
      items: items,
      total_qty: totalQty,
      taxable_total: taxableTotal,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_igst: 0,
      total_tax: totalTax,
      grand_total: grandTotal,
      amount_in_words: amountInWords,
      tax_in_words: taxInWords,
      bank_details: {
        bank_name: bankName,
        account_no: bankAcc,
        branch_ifsc: bankIfsc,
      },
      status: initialData?.status || 'Issued',
    }

    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save quotation')
      }

      router.push(`/dashboard/quotations/${data.quotation.id}`)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving quotation.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotations"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialData ? 'Edit Quotation' : 'New Estimation / Quotation'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only the shop owner can author, edit, or adjust company estimates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotations"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Preview Quotation'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: 1. Quotation & Company Identification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quotation Header & Title (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <FileText className="w-4 h-4" />
            <span>Quotation Particulars</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quotation Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={quotationName}
              onChange={(e) => setQuotationName(e.target.value)}
              placeholder="e.g. HP Laptops for Sports Authority"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Allows searching and referencing quotes easily</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quotation No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quotation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Terms
            </label>
            <input
              type="text"
              value={modeTermsOfPayment}
              onChange={(e) => setModeTermsOfPayment(e.target.value)}
              placeholder="e.g. 30 Days Credit, 50% Advance"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Company & Buyer Details (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Building2 className="w-4 h-4" />
              <span>Company / Client (Bill To)</span>
            </div>

            {existingCompanies.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%]">
                <span className="text-[10px] text-slate-400 shrink-0">Quick pick:</span>
                {existingCompanies.slice(0, 3).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectCompany(c)}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white truncate transition"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Sports Authority Of Andhra Pradesh"
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company GSTIN / UIN
              </label>
              <input
                type="text"
                value={companyGstin}
                onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 37BEYPC1417G1ZG"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Address &amp; Location
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="e.g. Vijayawada, NTR District"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                State Name &amp; Code
              </label>
              <input
                type="text"
                value={companyState}
                onChange={(e) => setCompanyState(e.target.value)}
                placeholder="Andhra Pradesh, Code : 37"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={sameAsBuyer}
                onChange={(e) => setSameAsBuyer(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <span>Ship to Consignee is same as Company (Bill to)</span>
            </label>
          </div>

          {!sameAsBuyer && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 mt-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Consignee (Ship To) Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  placeholder="Consignee Name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  placeholder="Shipping Address"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2. Line Items Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Quotation Items &amp; Costing
            </h2>
            <p className="text-xs text-slate-500">
              Enter inclusive or exclusive rates; taxes and totals calculate automatically
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] text-left">
                <th className="py-2.5 px-2 w-8">#</th>
                <th className="py-2.5 px-2">Description &amp; Specifications</th>
                <th className="py-2.5 px-2 w-24">HSN/SAC</th>
                <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                <th className="py-2.5 px-2 w-28 text-right">Rate (Incl. Tax)</th>
                <th className="py-2.5 px-2 w-28 text-right">Rate (Excl. Tax)</th>
                <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                <th className="py-2.5 px-2 w-28 text-right">Total</th>
                <th className="py-2.5 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {items.map((it, idx) => (
                <tr key={it.id || idx} className="align-top">
                  <td className="py-3 px-2 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-2 space-y-1.5 min-w-[240px]">
                    <input
                      type="text"
                      required
                      value={it.description}
                      onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                      placeholder="Item Name (e.g. HP LAPTOPS CORE5)"
                      className="w-full px-2.5 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <textarea
                      rows={2}
                      value={it.specifications}
                      onChange={(e) => handleItemFieldChange(idx, 'specifications', e.target.value)}
                      placeholder="Specifications / Configuration details (multi-line)"
                      className="w-full px-2.5 py-1.5 text-[11px] font-sans rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={it.hsn_sac}
                      onChange={(e) => handleItemFieldChange(idx, 'hsn_sac', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-center font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={it.unit}
                      onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value.toUpperCase())}
                      className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={it.rate_incl_tax}
                      onChange={(e) => handleItemFieldChange(idx, 'rate_incl_tax', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={it.rate_excl_tax}
                      onChange={(e) => handleItemFieldChange(idx, 'rate_excl_tax', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={it.gst_rate}
                      onChange={(e) => handleItemFieldChange(idx, 'gst_rate', e.target.value)}
                      className="w-full px-1.5 py-1.5 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                      <option value="12">12%</option>
                      <option value="5">5%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-white pt-4">
                    ₹ {(it.line_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-center pt-3.5">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: 3. Summary & Bank Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bank & Transport Metadata (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <CreditCard className="w-4 h-4" />
            <span>Bank &amp; Transport References</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Account No.
              </label>
              <input
                type="text"
                value={bankAcc}
                onChange={(e) => setBankAcc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Branch &amp; IFSC Code
              </label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Buyer's Order No.</label>
              <input
                type="text"
                value={buyersOrderNo}
                onChange={(e) => setBuyersOrderNo(e.target.value)}
                placeholder="Order ref"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Order Date</label>
              <input
                type="text"
                value={buyersOrderDate}
                onChange={(e) => setBuyersOrderDate(e.target.value)}
                placeholder="DD-MMM-YY"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Dispatched Through</label>
              <input
                type="text"
                value={dispatchedThrough}
                onChange={(e) => setDispatchedThrough(e.target.value)}
                placeholder="Carrier / Hand"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>
        </div>

        {/* Live Calculation Totals Box (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quotation Cost Breakdown
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Total Quantity:</span>
              <span className="font-mono font-bold text-white">{totalQty} NOS</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Taxable Value (Basic):</span>
              <span className="font-mono font-bold text-white">
                ₹ {taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>CGST Total:</span>
              <span className="font-mono text-slate-200">
                ₹ {totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>SGST Total:</span>
              <span className="font-mono text-slate-200">
                ₹ {totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-sm">Grand Total (Quote):</span>
              <span className="font-mono font-black text-xl text-emerald-400">
                ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 leading-snug">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Amount in words</div>
            <div className="font-bold text-white">{amountInWords}</div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Generate Quotation'}
          </button>
        </div>
      </div>
    </form>
  )
}
