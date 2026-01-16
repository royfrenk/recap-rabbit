'use client'

import { useState, useRef } from 'react'
import { Upload, FileAudio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export default function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && isAudioFile(file)) {
      setFileName(file.name)
      onFileSelect(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && isAudioFile(file)) {
      setFileName(file.name)
      onFileSelect(file)
    }
  }

  const isAudioFile = (file: File) => {
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/ogg', 'audio/flac']
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
    return audioTypes.includes(file.type) || audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
        isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50 hover:bg-accent/50',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
      {fileName ? (
        <div className="flex flex-col items-center">
          <FileAudio className="h-12 w-12 text-primary mb-4" />
          <p className="text-foreground font-medium">{fileName}</p>
        </div>
      ) : (
        <>
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-foreground font-medium">Drop your audio file here</p>
          <p className="text-muted-foreground text-sm mt-1">or click to browse</p>
          <p className="text-muted-foreground/70 text-xs mt-2">Supports MP3, WAV, M4A, OGG, FLAC</p>
        </>
      )}
    </div>
  )
}
