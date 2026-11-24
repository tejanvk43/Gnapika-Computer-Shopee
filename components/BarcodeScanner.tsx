// components/BarcodeScanner.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { toast } from 'sonner'

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!scanning || !videoRef.current) return

    const videoEl = videoRef.current
    if (!videoEl) return

    const reader = new BrowserMultiFormatReader()

    const startScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        videoEl.srcObject = stream
        await videoEl.play()

        reader.decodeFromVideoDevice(undefined, videoEl, (code: any, error: any) => {
          if (error) {
            console.error('Error reading barcode:', error)
            return
          }
          if (code) {
            const text = typeof code.getText === 'function' ? code.getText() : String(code)
            setResult(text)
            // Stop scanning after successful read
            stream.getTracks().forEach(track => track.stop())
            setScanning(false)
            toast.success(`Scanned Barcode: ${text}`)
            // Emit code to parent component (e.g., POS cart) via prop/callback
          }
        })
      } catch (err) {
        console.error('Media access error:', err)
        toast.error('Camera access denied or unavailable. Check permissions.')
      }
    }

    startScan()

    // Cleanup on unmount
    return () => {
      if (videoEl && videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(track => track.stop())
      }
    }
  }, [scanning])

  const toggleScan = () => setScanning(prev => !prev)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-3 text-center bg-muted">
        <p>{scanning ? 'Scanning...' : 'Click to Start Camera Scan'}</p>
      </div>
      <video ref={videoRef} className="w-full" autoPlay playsInline muted />
      <div className="p-3 text-center">
        <button onClick={toggleScan} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
          {scanning ? 'Stop Scanning' : 'Start Scanning'}
        </button>
        {result && <p className="mt-2 font-mono text-green-600">Last Scan Result: {result}</p>}
      </div>
    </div>
  )
}