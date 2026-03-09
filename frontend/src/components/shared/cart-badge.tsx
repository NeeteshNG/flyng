import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'

export function CartBadge() {
  const navigate = useNavigate()
  const itemCount = useCartStore((s) => s.items.length)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative rounded-full"
      onClick={() => navigate('/dashboard/orders/create?tab=cart')}
      title="Shopping Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Button>
  )
}
