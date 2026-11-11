import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Sizes are tuned for touch: default is 44px tall (WCAG target size),
 * `lg` 52px for primary calls to action on mobile.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent bg-clip-padding text-[15px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-strong",
        outline:
          "border-input bg-card text-foreground hover:border-primary hover:text-primary-strong aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_10%)]",
        ghost: "text-primary-strong hover:bg-primary-soft aria-expanded:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-[#82271f]",
        "destructive-outline": "border-[#e3c2be] bg-card text-danger-foreground hover:bg-danger-soft",
        inverse: "bg-white text-primary-strong hover:bg-primary-soft",
        "inverse-outline": "border-white/50 bg-transparent text-white hover:bg-white/10",
        link: "h-auto px-0 text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
