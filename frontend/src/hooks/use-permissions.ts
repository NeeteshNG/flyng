import { useAuthStore } from '@/stores/auth-store'

export function usePermissions() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
  const role = useAuthStore((s) => s.user?.membership_role)

  const has = (code: string): boolean => {
    if (role === 'ADMIN') return true
    return permissions.includes(code)
  }

  const canCreate = (app: string, resource: string) => has(`${app}.${resource}.create`)
  const canUpdate = (app: string, resource: string) => has(`${app}.${resource}.update`)
  const canDelete = (app: string, resource: string) => has(`${app}.${resource}.destroy`)
  const canList = (app: string, resource: string) => has(`${app}.${resource}.list`)

  const isAdmin = role === 'ADMIN'
  const isManager = role === 'ADMIN' || role === 'MANAGER'

  return { has, canCreate, canUpdate, canDelete, canList, isAdmin, isManager, role, permissions }
}
