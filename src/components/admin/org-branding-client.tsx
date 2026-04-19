'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES     = 512 * 1024  // 512 KB

interface OrgBrandingClientProps {
  currentLogoUrl?: string | null
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type. Use SVG, PNG, JPEG, or WebP.`
  }
  if (file.size > MAX_BYTES) {
    return `File too large — max 512 KB. This file is ${(file.size / 1024).toFixed(0)} KB.`
  }
  return null
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function OrgBrandingClient({ currentLogoUrl }: OrgBrandingClientProps) {
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile]       = useState<File | null>(null)
  const [fileError, setFileError]           = useState<string | null>(null)
  const [dragging, setDragging]             = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [savedUrl, setSavedUrl]             = useState<string | null>(currentLogoUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = pendingDataUrl ?? savedUrl

  const processFile = useCallback(async (file: File) => {
    setFileError(null)
    const err = validateFile(file)
    if (err) { setFileError(err); return }
    try {
      const dataUrl = await readAsDataUrl(file)
      setPendingDataUrl(dataUrl)
      setPendingFile(file)
    } catch {
      setFileError('Could not read file.')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleSave = async () => {
    if (!pendingDataUrl) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'org_logo_url', value: pendingDataUrl }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSavedUrl(pendingDataUrl)
      setPendingDataUrl(null)
      setPendingFile(null)
      toast.success('Organisation logo updated')
    } catch {
      toast.error('Failed to save logo')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'org_logo_url', value: '' }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSavedUrl(null)
      setPendingDataUrl(null)
      setPendingFile(null)
      toast.success('Logo removed')
    } catch {
      toast.error('Failed to remove logo')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setPendingDataUrl(null)
    setPendingFile(null)
    setFileError(null)
  }

  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 flex flex-col gap-4">
      <p className="text-[#6B6966] text-sm">
        Appears in the sidebar for all users. SVG or PNG on a transparent background, square, under 512 KB.
      </p>

      <div className="flex items-start gap-5">
        {/* Live preview on dark bg — mirrors the actual sidebar */}
        <div className="w-16 h-16 bg-[#0D0D0B] rounded-[10px] flex items-center justify-center flex-none border border-[#2A2926] relative overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo preview"
              className="w-9 h-9 object-contain"
              onError={() => { setSavedUrl(null); setPendingDataUrl(null) }}
            />
          ) : (
            <ImageIcon size={18} className="text-[#3A3836]" strokeWidth={1.5} />
          )}
          {pendingFile && (
            <div className="absolute bottom-0 inset-x-0 bg-[#C4853A]/90 text-[#1A1917] text-[8px] text-center font-semibold py-0.5 leading-none">
              UNSAVED
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              w-full border-2 border-dashed rounded-[8px] px-4 py-5 flex flex-col items-center gap-1.5 transition-colors text-center cursor-pointer
              ${dragging
                ? 'border-[#C4853A] bg-[#FBF3E8]'
                : 'border-[#E3E1DC] hover:border-[#C4853A] hover:bg-[#FDFCFB]'
              }
            `}
          >
            <Upload size={16} className="text-[#9C9890]" strokeWidth={1.75} />
            <span className="text-[#6B6966] text-xs">
              {pendingFile
                ? <span className="text-[#1A1917] font-medium">{pendingFile.name}</span>
                : <>Drop a file or <span className="text-[#C4853A]">browse</span></>
              }
            </span>
            <span className="text-[#9C9890] text-[10px]">SVG, PNG, JPEG, WebP · max 512 KB</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileChange}
            className="sr-only"
          />

          {fileError && (
            <p className="text-[#A3352B] text-xs bg-[#FDF2F2] border border-[#F5C6C6] rounded-[6px] px-3 py-2">
              {fileError}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {pendingDataUrl && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-[#C4853A] hover:bg-[#E8A855] text-[#1A1917] font-semibold rounded-[8px] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save logo'}
            </button>
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-3 py-2 text-sm text-[#6B6966] hover:text-[#1A1917] transition-colors flex items-center gap-1"
            >
              <X size={13} /> Discard
            </button>
          </>
        )}
        {!pendingDataUrl && savedUrl && (
          <button
            onClick={handleRemove}
            disabled={saving}
            className="px-4 py-2 text-sm text-[#6B6966] hover:text-[#A3352B] border border-[#E3E1DC] rounded-[8px] transition-colors disabled:opacity-50"
          >
            {saving ? 'Removing…' : 'Remove logo'}
          </button>
        )}
      </div>
    </div>
  )
}
