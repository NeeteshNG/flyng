import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage'

export interface CartItem {
  id: string
  item_id: number
  item_uuid: string
  item_sku: string
  item_name: string
  unit_price: string | null
  source_bin_id: number | null
  source_bin_code: string | null
  quantity: number
  lot_number: string
  notes: string
}

interface CartState {
  items: CartItem[]
  warehouse: number | null
  priority: string
  customerName: string
  customerCode: string
  externalReference: string
  dueDate: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  notes: string

  addItem: (item: Omit<CartItem, 'id'>) => void
  updateItem: (id: string, updates: Partial<CartItem>) => void
  removeItem: (id: string) => void
  clearCart: () => void
  setOrderMeta: (meta: Partial<Omit<CartState, 'items' | 'addItem' | 'updateItem' | 'removeItem' | 'clearCart' | 'setOrderMeta'>>) => void
}

const INITIAL_META = {
  warehouse: null,
  priority: 'NORMAL',
  customerName: '',
  customerCode: '',
  externalReference: '',
  dueDate: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  notes: '',
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ...INITIAL_META,

      addItem: (item) => {
        const existing = get().items.find(
          (i) => i.item_id === item.item_id && i.lot_number === item.lot_number
        )
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === existing.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...item, id: crypto.randomUUID() }] })
        }
      },

      updateItem: (id, updates) =>
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }),

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      clearCart: () =>
        set({ items: [], ...INITIAL_META }),

      setOrderMeta: (meta) => set(meta),
    }),
    {
      name: STORAGE_KEYS.CART,
      partialize: (state) => ({
        items: state.items,
        warehouse: state.warehouse,
        priority: state.priority,
        customerName: state.customerName,
        customerCode: state.customerCode,
        externalReference: state.externalReference,
        dueDate: state.dueDate,
        addressLine1: state.addressLine1,
        addressLine2: state.addressLine2,
        city: state.city,
        state: state.state,
        postalCode: state.postalCode,
        country: state.country,
        notes: state.notes,
      }),
    }
  )
)
