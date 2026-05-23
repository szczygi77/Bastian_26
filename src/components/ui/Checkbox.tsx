import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  label?: string
  className?: string
}

export function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  label,
  className,
}: CheckboxProps) {
  const [internal, setInternal] = useState(defaultChecked ?? false)
  const isChecked = checked ?? internal

  const toggle = () => {
    if (disabled) return
    const next = !isChecked
    setInternal(next)
    onCheckedChange?.(next)
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer select-none',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border border-input bg-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isChecked && 'bg-primary border-primary text-primary-foreground',
        )}
      >
        {isChecked && <Check className="h-3 w-3" />}
      </button>
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
    </label>
  )
}
