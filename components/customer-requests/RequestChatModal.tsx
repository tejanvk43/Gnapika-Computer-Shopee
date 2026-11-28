// components/customer-requests/RequestChatModal.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Send,
  Image as ImageIcon,
  User,
  Wrench,
  Clock,
  CheckCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ServiceRequestMessage, CustomerServiceRequest } from '@/lib/customerRequests'

interface RequestChatModalProps {
  request: CustomerServiceRequest | null
  isOpen: boolean
  onClose: () => void
  currentUserName?: string
}

export function RequestChatModal({
  request,
  isOpen,
  onClose,
  currentUserName = 'Gnapika Support Team',
}: RequestChatModalProps) {
  const [messages, setMessages] = useState<ServiceRequestMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    if (!request?.id) return
    try {
      const res = await fetch(`/api/public/chat?requestId=${request.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (e) {
      console.warn('Error fetching chat messages:', e)
    }
  }

  // Load on open and poll every 4 seconds
  useEffect(() => {
    if (!isOpen || !request?.id) return

    setLoading(true)
    fetchMessages().finally(() => setLoading(false))

    const interval = setInterval(fetchMessages, 4000)
    return () => clearInterval(interval)
  }, [isOpen, request?.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !request) return null

  const handleSend = async (imageUrl?: string) => {
    if (!newMessage.trim() && !imageUrl) return
    setSending(true)

    try {
      const payload = {
        request_id: request.id,
        sender_type: 'team',
        sender_name: currentUserName,
        message_text: newMessage.trim(),
        image_url: imageUrl || '',
      }

      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
      } else {
        toast.error('Failed to send message')
      }
    } catch (err: any) {
      toast.error('Error sending message')
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/public/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        await handleSend(data.url)
        toast.success('Image sent!')
      } else {
        toast.error('Image upload failed')
      }
    } catch (err) {
      toast.error('Error uploading image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in-50 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl h-[88vh] max-h-[750px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold text-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Chat with {request.customer_name}
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  #{request.request_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {request.service_type === 'home' ? 'Home Service Booking' : 'Store Visit Booking'} •{' '}
                {request.phone_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchMessages}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-100/50 dark:bg-slate-950/50">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <CheckCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Booking Accepted! Chat channel is open.
              </p>
              <p className="text-[11px] max-w-xs">
                Send a message to update the customer on their repair status or request more device photos.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isTeam = msg.sender_type === 'team'
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isTeam ? 'items-end' : 'items-start'} max-w-[85%] ${
                    isTeam ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      {isTeam ? 'Gnapika Team' : msg.sender_name || 'Customer'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl p-3 shadow-xs text-xs space-y-2 ${
                      isTeam
                        ? 'bg-primary text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                    }`}
                  >
                    {msg.image_url && (
                      <div className="rounded-xl overflow-hidden max-w-xs border border-white/20">
                        <img
                          src={msg.image_url}
                          alt="Attachment"
                          className="w-full h-auto object-cover max-h-60"
                        />
                      </div>
                    )}
                    {msg.message_text && (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              title="Attach photo/image"
            >
              {uploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message to customer..."
              className="flex-1 px-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !uploadingImage)}
              className="p-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition disabled:opacity-50 cursor-pointer"
              title="Send Message"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
