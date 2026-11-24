'use client'

import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer, Download, RefreshCw, Barcode } from 'lucide-react'
import { toast } from 'sonner'

export function BarcodeGeneratorCard({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(
    initialValue || '890' + Math.floor(1000000000 + Math.random() * 9000000000)
  )
  const [format, setFormat] = useState('CODE128')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value.trim()) {
      try {
        JsBarcode(svgRef.current, value.trim(), {
          format: format as any,
          lineColor: '#000000',
          width: 2,
          height: 64,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
        })
      } catch (err: any) {
        console.warn('Barcode rendering error:', err)
      }
    }
  }, [value, format])

  const generateRandom = () => {
    setValue('890' + Math.floor(1000000000 + Math.random() * 9000000000))
  }

  const handlePrint = () => {
    if (!svgRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${value}</title>
          <style>
            body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            .label { text-align: center; padding: 20px; border: 1px dashed #ccc; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="label">
            ${svgRef.current.outerHTML}
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownload = () => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode-${value}.svg`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Barcode downloaded!')
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Barcode className="w-5 h-5 text-emerald-600" />
          <span>Barcode Generator</span>
        </h3>
        <button
          type="button"
          onClick={generateRandom}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Generate New Value</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Barcode Value / EAN
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Barcode Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
          >
            <option value="CODE128">CODE 128 (Alphanumeric)</option>
            <option value="EAN13">EAN-13 (Standard 13 digits)</option>
            <option value="EAN8">EAN-8</option>
            <option value="UPC">UPC-A</option>
          </select>
        </div>
      </div>

      {/* Barcode Render Area (Matching Diagram) */}
      <div className="p-6 bg-white border-2 border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[140px] shadow-inner">
        <svg ref={svgRef} className="max-w-full" />
      </div>

      {/* Buttons: Download, Print (Matching Diagram) */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>
      </div>
    </div>
  )
}
