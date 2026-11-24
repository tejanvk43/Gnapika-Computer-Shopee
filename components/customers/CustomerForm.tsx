'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CustomerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    alt_phone_number: '',
    email: '',
    address: '',
    gstin: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer')
      }

      toast.success('Customer created successfully!')
      router.push('/dashboard/customers')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="customer_name" className="block text-sm font-medium">Customer Name *</label>
        <input
          id="customer_name"
          name="customer_name"
          type="text"
          value={formData.customer_name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium">Phone Number</label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
          />
        </div>

        <div>
          <label htmlFor="alt_phone_number" className="block text-sm font-medium">Alternate Phone</label>
          <input
            id="alt_phone_number"
            name="alt_phone_number"
            type="tel"
            value={formData.alt_phone_number}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium">Address</label>
        <textarea
          id="address"
          name="address"
          rows={3}
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="gstin" className="block text-sm font-medium">GSTIN</label>
        <input
          id="gstin"
          name="gstin"
          type="text"
          value={formData.gstin}
          onChange={handleChange}
          placeholder="e.g. 22AAAAA0000A1Z5"
          className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  )
}
