/**
 * useDeleteDialog hook for FlyNG.
 *
 * Provides reusable delete confirmation dialog state management.
 * Reduces boilerplate in list pages that need delete functionality.
 */

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api-error'

interface UseDeleteDialogOptions<T> {
  /**
   * Function to call the delete API
   */
  deleteFn: (item: T) => Promise<unknown>

  /**
   * Query keys to invalidate/refetch after successful delete
   */
  queryKeys: string[][]

  /**
   * Success message to show in toast
   */
  successMessage?: string

  /**
   * Error message fallback
   */
  errorMessage?: string

  /**
   * Callback after successful delete
   */
  onSuccess?: () => void
}

interface UseDeleteDialogReturn<T> {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean

  /**
   * The item being deleted (for display in dialog)
   */
  itemToDelete: T | null

  /**
   * Whether delete is in progress
   */
  isDeleting: boolean

  /**
   * Open the delete dialog for an item
   */
  openDialog: (item: T) => void

  /**
   * Close the dialog without deleting
   */
  closeDialog: () => void

  /**
   * Confirm and execute the delete
   */
  confirmDelete: () => void
}

/**
 * Hook for managing delete confirmation dialogs.
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   itemToDelete,
 *   isDeleting,
 *   openDialog,
 *   closeDialog,
 *   confirmDelete
 * } = useDeleteDialog({
 *   deleteFn: (item) => api.deleteItem(item.uuid),
 *   queryKeys: [['items'], ['items-stats']],
 *   successMessage: 'Item deleted successfully',
 * })
 *
 * // In JSX:
 * <Button onClick={() => openDialog(item)}>Delete</Button>
 *
 * <Dialog open={isOpen} onOpenChange={closeDialog}>
 *   <DialogContent>
 *     <p>Delete {itemToDelete?.name}?</p>
 *     <Button onClick={confirmDelete} disabled={isDeleting}>
 *       {isDeleting ? 'Deleting...' : 'Delete'}
 *     </Button>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function useDeleteDialog<T>({
  deleteFn,
  queryKeys,
  successMessage = 'Deleted successfully',
  errorMessage = 'Failed to delete',
  onSuccess,
}: UseDeleteDialogOptions<T>): UseDeleteDialogReturn<T> {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)

  const mutation = useMutation({
    mutationFn: (item: T) => deleteFn(item),
    onSuccess: () => {
      setIsOpen(false)
      setItemToDelete(null)
      toast.success(successMessage, { duration: 4000 })

      // Refetch all specified query keys
      queryKeys.forEach((key) => {
        queryClient.refetchQueries({ queryKey: key, type: 'all' })
      })

      onSuccess?.()
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, errorMessage), { duration: 5000 })
    },
  })

  const openDialog = useCallback((item: T) => {
    setItemToDelete(item)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    setItemToDelete(null)
  }, [])

  const confirmDelete = useCallback(() => {
    if (itemToDelete) {
      mutation.mutate(itemToDelete)
    }
  }, [itemToDelete, mutation])

  return {
    isOpen,
    itemToDelete,
    isDeleting: mutation.isPending,
    openDialog,
    closeDialog,
    confirmDelete,
  }
}
