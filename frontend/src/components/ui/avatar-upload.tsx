import { useState, useRef, useCallback } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface AvatarUploadProps {
  value?: string | null
  onChange: (file: File | null) => void
  fallback?: string
  disabled?: boolean
  className?: string
}

export function AvatarUpload({
  value,
  onChange,
  fallback = 'U',
  disabled = false,
  className,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) {
        setPreview(null)
        onChange(null)
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return
      }

      setIsLoading(true)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setIsLoading(false)
      }
      reader.readAsDataURL(file)

      onChange(file)
    },
    [onChange]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files?.[0] || null
    handleFileSelect(file)
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const displayImage = preview || value

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'relative cursor-pointer group',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Avatar
          className={cn(
            'h-24 w-24 border-2 border-dashed transition-colors',
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-primary/50',
            displayImage && 'border-solid border-transparent'
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full w-full bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <AvatarImage src={displayImage || ''} alt="Profile" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {fallback}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 transition-opacity',
            !disabled && 'group-hover:opacity-100'
          )}
        >
          <Camera className="h-6 w-6 text-white" />
        </div>

        {/* Clear button */}
        {displayImage && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground text-center">
        Click or drag to upload
        <br />
        Max size: 5MB
      </p>
    </div>
  )
}

export default AvatarUpload
