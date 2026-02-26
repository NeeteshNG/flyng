/**
 * useFormat hook for FlyNG.
 *
 * Provides consistent formatting utilities across the application.
 * Centralizes date, number, and text formatting for Indian locale.
 */

import { useMemo } from 'react'

interface UseFormatReturn {
  /**
   * Format a date string for display.
   * Uses Indian locale (DD MMM YYYY format).
   */
  formatDate: (dateString: string | Date | null | undefined) => string

  /**
   * Format a date with time.
   */
  formatDateTime: (dateString: string | Date | null | undefined) => string

  /**
   * Format a date relative to now (e.g., "2 hours ago").
   */
  formatRelative: (dateString: string | Date | null | undefined) => string

  /**
   * Format a number with Indian locale (lakhs/crores).
   */
  formatNumber: (value: number | null | undefined) => string

  /**
   * Format currency in INR.
   */
  formatCurrency: (value: number | null | undefined) => string

  /**
   * Format a phone number for display.
   */
  formatPhone: (phone: string | null | undefined) => string

  /**
   * Truncate text with ellipsis.
   */
  truncate: (text: string | null | undefined, maxLength?: number) => string
}

/**
 * Hook for formatting values consistently.
 *
 * @example
 * ```tsx
 * const { formatDate, formatCurrency } = useFormat()
 *
 * <p>{formatDate(item.created_at)}</p>  // "15 Jan 2024"
 * <p>{formatCurrency(item.price)}</p>    // "₹1,50,000"
 * ```
 */
export function useFormat(): UseFormatReturn {
  const formatters = useMemo(() => {
    // Date formatter for Indian locale
    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    // DateTime formatter
    const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Number formatter for Indian locale
    const numberFormatter = new Intl.NumberFormat('en-IN')

    // Currency formatter for INR
    const currencyFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    })

    // Relative time formatter
    const relativeFormatter = new Intl.RelativeTimeFormat('en', {
      numeric: 'auto',
    })

    return {
      dateFormatter,
      dateTimeFormatter,
      numberFormatter,
      currencyFormatter,
      relativeFormatter,
    }
  }, [])

  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      return formatters.dateFormatter.format(date)
    } catch {
      return '-'
    }
  }

  const formatDateTime = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      return formatters.dateTimeFormatter.format(date)
    } catch {
      return '-'
    }
  }

  const formatRelative = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      const now = new Date()
      const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000)

      // Choose appropriate unit
      const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
      ]

      for (const { unit, seconds } of units) {
        if (Math.abs(diffInSeconds) >= seconds) {
          const value = Math.round(diffInSeconds / seconds)
          return formatters.relativeFormatter.format(value, unit)
        }
      }

      return 'just now'
    } catch {
      return '-'
    }
  }

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return formatters.numberFormatter.format(value)
  }

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return formatters.currencyFormatter.format(value)
  }

  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '-'
    // Format Indian phone numbers: +91 XXXXX XXXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
    }
    return phone
  }

  const truncate = (text: string | null | undefined, maxLength = 50): string => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength - 3)}...`
  }

  return {
    formatDate,
    formatDateTime,
    formatRelative,
    formatNumber,
    formatCurrency,
    formatPhone,
    truncate,
  }
}

/**
 * Standalone format functions for use outside React components.
 */
export const format = {
  date: (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  },

  dateTime: (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '-'
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  },

  number: (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-IN').format(value)
  },

  currency: (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  },
}
