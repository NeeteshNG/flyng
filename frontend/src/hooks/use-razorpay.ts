import { useCallback } from 'react'

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface RazorpayCallbacks {
  onSuccess: (response: RazorpayResponse) => void
  onError: () => void
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void
      close: () => void
    }
  }
}

export function useRazorpay() {
  const openCheckout = useCallback(
    (subscriptionId: string, keyId: string, callbacks: RazorpayCallbacks) => {
      if (!window.Razorpay) {
        console.error('Razorpay SDK not loaded')
        callbacks.onError()
        return
      }

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'FlyNG',
        description: 'Subscription Payment',
        handler: callbacks.onSuccess,
        modal: {
          ondismiss: callbacks.onError,
          confirm_close: true,
        },
        theme: {
          color: '#6366f1',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    },
    []
  )

  return { openCheckout }
}
