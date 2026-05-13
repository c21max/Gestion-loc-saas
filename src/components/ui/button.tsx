import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white shadow-[0_1px_3px_rgba(15,23,42,0.4),0_8px_20px_-10px_rgba(15,23,42,0.7)] hover:bg-slate-800',
        destructive: 'bg-rose-600 text-white shadow-[0_8px_20px_-10px_rgba(225,29,72,0.7)] hover:bg-rose-700',
        outline: 'border border-slate-200 bg-white text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950',
        link: 'text-blue-600 underline-offset-4 hover:underline',
        success: 'bg-emerald-700 text-white shadow-[0_8px_20px_-10px_rgba(4,120,87,0.7)] hover:bg-emerald-800',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
