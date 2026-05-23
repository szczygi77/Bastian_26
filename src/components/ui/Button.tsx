import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'relative inline-flex items-center justify-center gap-2 select-none',
          'font-mono font-medium uppercase tracking-[0.10em] transition-all duration-200',
          'border focus-visible:outline-none',
          // Size
          size === 'xs' && 'px-2.5 py-1 text-[9px] rounded-[6px]',
          size === 'sm' && 'px-3 py-1.5 text-[10px] rounded-[8px]',
          size === 'md' && 'px-4 py-2 text-[11px] rounded-[14px]',
          size === 'lg' && 'px-6 py-2.5 text-[12px] rounded-[14px]',
          // Variants
          variant === 'primary' && [
            'bg-[rgba(255,138,31,0.10)] text-[#FF8A1F]',
            'border-[rgba(255,138,31,0.30)]',
            'hover:bg-[rgba(255,138,31,0.18)] hover:border-[rgba(255,138,31,0.55)]',
            'hover:shadow-[0_0_16px_rgba(255,138,31,0.30),0_0_4px_rgba(255,138,31,0.20)]',
            'active:bg-[rgba(255,138,31,0.07)] active:scale-[0.99]',
          ],
          variant === 'secondary' && [
            'bg-[rgba(255,255,255,0.04)] text-[#94A3B8]',
            'border-[rgba(255,255,255,0.08)]',
            'hover:bg-[rgba(255,255,255,0.08)] hover:text-[#E6EDF3]',
            'hover:border-[rgba(255,138,31,0.25)]',
            'active:bg-[rgba(255,255,255,0.03)]',
          ],
          variant === 'danger' && [
            'bg-[rgba(239,68,68,0.09)] text-[#EF4444]',
            'border-[rgba(239,68,68,0.25)]',
            'hover:bg-[rgba(239,68,68,0.16)] hover:border-[rgba(239,68,68,0.50)]',
            'hover:shadow-[0_0_16px_rgba(239,68,68,0.30),0_0_4px_rgba(239,68,68,0.20)]',
            'active:scale-[0.99]',
          ],
          variant === 'ghost' && [
            'bg-transparent text-[#66778B] border-transparent',
            'hover:bg-[rgba(255,255,255,0.05)] hover:text-[#94A3B8]',
          ],
          (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
