'use client'

import { useState, useEffect } from 'react'
import {
  Wrench,
  User,
  Phone,
  Mail,
  MapPin,
  Laptop,
  CheckCircle2,
  Printer,
  Share2,
  Plus,
  ArrowRight,
  Barcode,
  X,
  Check,
  PackageCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SHOP_DETAILS, formatCurrency } from '@/lib/formatters'
import { printDualServiceSlip } from '@/lib/serviceSlipPrinter'
import { extractAccessories, cleanProblemDescription } from '@/lib/serviceHelpers'

const COMMON_ACCESSORIES = [
  'Power Adapter / Charger',
  'Power Cable / Cord',
  'Laptop Bag / Sleeve',
  'External Mouse',
  'External Keyboard',
  'External HDD / SSD',
  'Pen Drive / Flash Drive',
  'Original Box / Packaging',
]

const SERVICE_TYPES = [
  'Data Recovery',
  'Hardware Repair',
  'Screen / Display Replacement',
  'OS Installation / Software',
  'Deep Cleaning / Thermal Paste',
  'Motherboard Chip-level Service',
  'Battery / Power Jack Repair',
  'Other',
]

const DEVICE_TYPES = ['Laptop', 'Desktop', 'CPU Only', 'Printer', 'MacBook / iMac', 'Server']

const BRANDS = [
  'Dell',
  'HP',
  'Lenovo',
  'Apple',
  'Asus',
  'Acer',
  'Samsung',
  'Epson',
  'Canon',
  'Custom / Assembled',
  'Other',
]

export function ServiceBookingForm({
  initialPhone = '',
  initialCustomerId = '',
}: {
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
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerFound, setCustomerFound] = useState(false)

  // Device & Service State
  const [serviceType, setServiceType] = useState('Hardware Repair')
  const [customServiceType, setCustomServiceType] = useState('')
  const [deviceType, setDeviceType] = useState('Laptop')
  const [companyBrand, setCompanyBrand] = useState('Dell')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [accessories, setAccessories] = useState<string[]>([])
  const [customAccessory, setCustomAccessory] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Generated Service Result
  const [registeredService, setRegisteredService] = useState<any | null>(null)

  const toggleAccessory = (item: string) => {
    if (accessories.includes(item)) {
      setAccessories(accessories.filter((a) => a !== item))
    } else {
      setAccessories([...accessories, item])
    }
  }

  const addCustomAccessory = () => {
    const trimmed = customAccessory.trim()
    if (!trimmed) return
    if (!accessories.includes(trimmed)) {
      setAccessories([...accessories, trimmed])
    }
    setCustomAccessory('')
  }

  useEffect(() => {
    if (initialPhone) {
      searchCustomer(initialPhone)
    }
  }, [initialPhone])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer.customer_name.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!problemDescription.trim()) {
      toast.error('Please describe the problem')
      return
    }

    setSubmitting(true)
    try {
      const finalServiceType = serviceType === 'Other' ? customServiceType || 'Custom Service' : serviceType

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          service_type: finalServiceType,
          device_type: deviceType,
          company_brand: companyBrand,
          model: model || 'Standard',
          serial_number: serialNumber,
          problem_description: problemDescription,
          estimated_cost: parseFloat(estimatedCost) || 0,
          accessories,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register service job')
      }

      toast.success(`Service registered: ${data.service_ref_number}`)
      setRegisteredService(data)
    } catch (err: any) {
      toast.error(err.message || 'Error creating service job')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setRegisteredService(null)
    setCustomer({
      id: '',
      customer_name: '',
      phone_number: '',
      alt_phone_number: '',
      email: '',
      address: '',
      gstin: '',
    })
    setCustomerSearchResults([])
    setShowCustomerDropdown(false)
    setCustomerFound(false)
    setModel('')
    setSerialNumber('')
    setProblemDescription('')
    setEstimatedCost('')
    setAccessories([])
    setCustomAccessory('')
  }

  return (
    <div className="space-y-8">
      {/* Dual Slip Receipt Modal (Matching Diagram) */}
      {registeredService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setRegisteredService(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            {/* SLIP 1: Service Confirmation for the Customer */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 mb-6 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Customer Acknowledgment Slip
                  </span>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white mt-1">
                    {SHOP_DETAILS.name}
                  </h3>
                  <p className="text-xs font-semibold text-orange-600">
                    {SHOP_DETAILS.tagline}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Ref ID: <span className="text-orange-600">{registeredService.service_ref_number}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-900 dark:text-white">Intake Center</p>
                  <p>Date: {new Date(registeredService.created_at).toLocaleDateString('en-IN')}</p>
                  <p className="font-mono text-[11px]">GSTIN: {SHOP_DETAILS.gstin}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Customer:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {registeredService.customers?.customer_name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{registeredService.customers?.phone_number}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Device Details:</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {registeredService.company_brand} {registeredService.model} ({registeredService.device_type})
                  </p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                    S/N: {registeredService.serial_number || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-xs mb-3">
                <span className="text-orange-700 dark:text-orange-300 font-bold uppercase text-[10px] block mb-0.5">
                  Reported Fault / Customer Issue:
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {cleanProblemDescription(registeredService.problem_description)}
                </p>
                <div className="mt-2.5 flex justify-between items-center pt-2 border-t border-orange-200/60 dark:border-orange-900/60 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">Estimated Cost:</span>
                  <span className="font-mono text-primary text-base font-black">
                    {formatCurrency(registeredService.estimated_cost)}
                  </span>
                </div>
              </div>

              {/* Slip 1: Accessories Received */}
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs mb-3">
                <span className="text-blue-700 dark:text-blue-300 font-bold uppercase text-[10px] block mb-1">
                  Accessories Received from Customer:
                </span>
                {extractAccessories(registeredService).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {extractAccessories(registeredService).map((acc: string) => (
                      <span
                        key={acc}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200 font-bold text-[11px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{acc}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic font-medium">Device Only (No accessories received)</span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                <span>* Please produce this receipt when taking delivery of the device.</span>
                <span className="font-semibold text-emerald-600">Status: Received</span>
              </div>
            </div>

            {/* SLIP 2: Internal Office / Job Card Reference */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Internal Bench Job Card
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    Service Docket Reference
                  </h3>
                  <p className="text-xs font-mono font-bold text-orange-600">
                    Ref: {registeredService.service_ref_number}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">Status: Received</p>
                  <p className="text-[11px]">Bench Queue</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <span className="text-slate-400">Device &amp; Brand:</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {registeredService.company_brand} {registeredService.model}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Customer Contact:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{registeredService.customers?.phone_number}</p>
                </div>
              </div>

              {/* Slip 2: Accessories to Return */}
              <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-xs mb-3">
                <span className="text-orange-700 dark:text-orange-300 font-bold uppercase text-[10px] block mb-1">
                  Accessories to Return upon Delivery:
                </span>
                {extractAccessories(registeredService).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {extractAccessories(registeredService).map((acc: string) => (
                      <span
                        key={acc}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 text-orange-950 dark:text-orange-200 font-bold text-[11px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                        <span>{acc}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic font-medium">Device Only (No accessories received)</span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end text-[10px] text-slate-500">
                <div className="w-36 border-t border-slate-400 pt-1 text-center font-medium">Customer Sign</div>
                <div className="w-36 border-t border-slate-400 pt-1 text-center font-medium">Technician Sign</div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => printDualServiceSlip(registeredService)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
              >
                <Printer className="w-4 h-4 text-orange-600" />
                <span>Print Dual Slip</span>
              </button>
              <Link
                href={`/dashboard/services/${registeredService.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                <ArrowRight className="w-4 h-4" />
                <span>View Job Details</span>
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Book Another Service</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        {/* Customer Information (Auto-fill on Phone Number or Name) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              <span>Customer Information</span>
            </h3>
            <span className="text-xs text-slate-400 italic">
              Existing phone/name auto-fills details; new numbers auto-register!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    if (customer.phone_number.trim()) {
                      searchCustomer(customer.phone_number)
                    }
                  }}
                  placeholder="e.g. 8919998149"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-slate-900 dark:text-white"
                  required
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Name *
              </label>
              <div className="relative">
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
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                  required
                />
                {searchingCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Alternative Phone Number
              </label>
              <input
                type="tel"
                value={customer.alt_phone_number}
                onChange={(e) => setCustomer({ ...customer, alt_phone_number: e.target.value })}
                placeholder="Optional secondary phone"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Email Address (Not Mandatory)
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Address
              </label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="Customer Address / Location"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
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
                    className="text-orange-600 font-semibold hover:underline"
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
                      className="w-full p-3 text-left hover:bg-orange-50 dark:hover:bg-slate-700/60 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{c.customer_name}</span>
                          <span className="text-[10px] text-orange-700 bg-orange-100 dark:bg-orange-950 px-1.5 py-0.2 rounded font-medium">
                            Saved Customer
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                          {c.phone_number && <span>Ph: {c.phone_number}</span>}
                          {c.address && <span>| {c.address}</span>}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-orange-600">
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

        {/* Device & Problem Details (Matching Diagram) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Laptop className="w-5 h-5 text-orange-600" />
            <span>Device & Service Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service Type Dropdown */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Service Type *
              </label>
              <input
                  type="text"
                  value={customServiceType}
                  onChange={(e) => setCustomServiceType(e.target.value)}
                  placeholder="Specify custom service"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                  required
                />
            </div>

            {/* Custom Service Type if Other was selected (Matching Diagram) */}
            {customServiceType && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Device Type (Laptop/Desktop/CPU/Printer) *
                </label>
                <input
                  type="text"
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  placeholder="Enter device type"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {/* Company (List All Companies) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company / Brand *
              </label>
              <input
                type="text"
                value={companyBrand}
                onChange={(e) => setCompanyBrand(e.target.value)}
                placeholder="Enter company or brand"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Model Name / Number
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Inspiron 15 3511, ThinkPad E14"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Serial Number / Service Tag
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional serial number"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-slate-900 dark:text-white"
              />
            </div>

            {/* Problem Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Problem Description *
              </label>
              <textarea
                rows={4}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the issues reported by the customer (e.g. No display, blue screen, liquid damage, battery not charging...)"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Accessories Received from Customer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-orange-600" />
              <span>Intake Accessories Received from Customer</span>
            </h3>
            <span className="text-xs text-slate-400">
              Listed on both Customer Slip &amp; Owner Copy
            </span>
          </div>

          {/* Quick Select Common Accessories */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Quick Select Common Accessories:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ACCESSORIES.map((item) => {
                const isSelected = accessories.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAccessory(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{item}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Accessory Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Add Other / Specific Accessories:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomAccessory()
                  }
                }}
                placeholder="e.g. 65W Dell Type-C Charger, 1TB Seagate HDD, Dongle, Power Bank..."
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addCustomAccessory}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Selected Accessories Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between items-center">
              <span>Attached Accessories ({accessories.length}):</span>
              {accessories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAccessories([])}
                  className="text-[11px] text-red-500 hover:underline font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>
            {accessories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {accessories.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200 text-xs font-bold"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => toggleAccessory(item)}
                      className="hover:text-red-600 transition ml-0.5 p-0.5"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Device Only &mdash; No accessories selected. Both customer and owner slips will indicate &quot;Device Only (No accessories received)&quot;.
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Wrench className="w-5 h-5" />
              <span>Submit the Service Registration</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
