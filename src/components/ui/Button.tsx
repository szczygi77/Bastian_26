import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium uppercase tracking-wider transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] select-none'

    const sizes = {
      sm: 'px-3 py-1.5 text-[11px] rounded-[8px]',
      md: 'px-4 py-2 text-[12px] rounded-[14px]',
      lg: 'px-6 py-2.5 text-[13px] rounded-[14px]',
    }

    const variants = {
      primary: 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20 hover:border-[#00E5FF]/60 hover:shadow-[0_0_12px_rgba(0,229,255,0.25)] active:bg-[#00E5FF]/5',
      secondary: 'bg-white/5 text-[#94A3B8] border border-white/10 hover:bg-white/10 hover:text-[#E6EDF3] hover:border-[#00E5FF]/30 active:bg-white/[0.03]',
      danger: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/20 hover:border-[#EF4444]/60 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] active:bg-[#EF4444]/5',
      ghost: 'bg-transparent text-[#66778B] border border-transparent hover:bg-white/5 hover:text-[#94A3B8]',
    }

    const disabledCls = 'opacity-40 cursor-not-allowed pointer-events-none'

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, sizes[size], variants[variant], (disabled || loading) && disabledCls, className)}
        {...props}
      >
        {loading ? (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
