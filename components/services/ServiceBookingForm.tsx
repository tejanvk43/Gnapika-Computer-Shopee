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
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SHOP_DETAILS, formatCurrency } from '@/lib/formatters'
import { printDualServiceSlip } from '@/lib/serviceSlipPrinter'

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
  })
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  // Device & Service State
  const [serviceType, setServiceType] = useState('Hardware Repair')
  const [customServiceType, setCustomServiceType] = useState('')
  const [deviceType, setDeviceType] = useState('Laptop')
  const [companyBrand, setCompanyBrand] = useState('Dell')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Generated Service Result
  const [registeredService, setRegisteredService] = useState<any | null>(null)

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
          })
          toast.success(`Found customer: ${found.customer_name}`)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingCustomer(false)
    }
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
    })
    setModel('')
    setSerialNumber('')
    setProblemDescription('')
    setEstimatedCost('')
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
                  {registeredService.problem_description}
                </p>
                <div className="mt-2.5 flex justify-between items-center pt-2 border-t border-orange-200/60 dark:border-orange-900/60 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">Estimated Cost:</span>
                  <span className="font-mono text-primary text-base font-black">
                    {formatCurrency(registeredService.estimated_cost)}
                  </span>
                </div>
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
        {/* Customer Information (Auto-fill on Phone Number) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              <span>Customer Information</span>
            </h3>
            <span className="text-xs text-slate-400 italic">
              Existing phone auto-fills details; new numbers auto-register!
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
                    setCustomer({ ...customer, phone_number: e.target.value })
                    if (e.target.value.length >= 10) lookupCustomer(e.target.value)
                  }}
                  onBlur={() => lookupCustomer(customer.phone_number)}
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
              <input
                type="text"
                value={customer.customer_name}
                onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
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
