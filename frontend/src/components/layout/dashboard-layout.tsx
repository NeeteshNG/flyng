import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Plane,
  Package,
  MapPin,
  ShoppingCart,
  Settings,
  FileText,
  Box,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Search,
  Moon,
  Sun,
  CreditCard,
  KeyRound,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

interface NavChild {
  name: string
  path: string
  roles?: string[] // If specified, only show to these roles
}

interface NavItem {
  name: string
  path?: string
  icon: React.ElementType
  children?: NavChild[]
  roles?: string[] // If specified, only show to these roles
}

const navigation: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home },
  {
    name: 'Drones',
    icon: Plane,
    children: [
      { name: 'Drone List', path: '/dashboard/drones' },
      { name: 'Telemetry', path: '/dashboard/telemetry' },
      { name: 'Batteries', path: '/dashboard/batteries' },
    ],
  },
  {
    name: 'Locations',
    icon: MapPin,
    children: [
      { name: 'Warehouses', path: '/dashboard/warehouses' },
      { name: 'Zones', path: '/dashboard/zones' },
      { name: 'Ground Stations', path: '/dashboard/ground-stations' },
      { name: 'Work Areas', path: '/dashboard/work-areas' },
      { name: 'Locations', path: '/dashboard/locations' },
    ],
  },
  {
    name: 'Inventory',
    icon: Package,
    children: [
      { name: 'Categories', path: '/dashboard/categories' },
      { name: 'Items', path: '/dashboard/items' },
      { name: 'Stock', path: '/dashboard/inventory' },
    ],
  },
  {
    name: 'Orders',
    icon: ShoppingCart,
    children: [
      { name: 'Create Order', path: '/dashboard/orders/create' },
      { name: 'Order History', path: '/dashboard/orders' },
    ],
  },
  {
    name: 'Bin Setup',
    icon: Box,
    children: [
      { name: 'Label Types', path: '/dashboard/label-types' },
      { name: 'Bin Templates', path: '/dashboard/bin-templates' },
      { name: 'Bins', path: '/dashboard/bins' },
    ],
  },
  {
    name: 'Engineering',
    icon: FileText,
    children: [
      { name: 'Log Files', path: '/dashboard/log-files' },
      { name: 'Graph Templates', path: '/dashboard/graph-templates' },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Users', path: '/dashboard/users', roles: ['ADMIN', 'MANAGER'] },
      { name: 'Settings', path: '/dashboard/settings' },
    ],
  },
]

// Helper to check if user has required role
const hasRole = (userRole: string | undefined, allowedRoles?: string[]): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Home'])
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { user } = useAuthStore()

  useEffect(() => {
    // Check for system preference on mount
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const savedTheme = localStorage.getItem('theme')

    if (savedTheme === 'dark' || (!savedTheme && isDark)) {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    }
  }, [])

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    )
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user?.first_name) {
      return user.first_name
    }
    return user?.email || 'User'
  }

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        // Check if user has permission to see this nav item
        if (!hasRole(user?.role, item.roles)) return null

        const isExpanded = expandedItems.includes(item.name)
        const isActive = item.path
          ? location.pathname === item.path
          : item.children?.some((child) => location.pathname === child.path)

        if (item.children) {
          // Filter children based on role
          const visibleChildren = item.children.filter((child) =>
            hasRole(user?.role, child.roles)
          )

          // Don't render parent if no visible children
          if (visibleChildren.length === 0) return null

          return (
            <div key={item.name}>
              <button
                onClick={() => toggleExpand(item.name)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {(sidebarOpen || mobile) && <span>{item.name}</span>}
                </div>
                {(sidebarOpen || mobile) && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </button>
              {isExpanded && (sidebarOpen || mobile) && (
                <div className="ml-8 mt-1 space-y-1">
                  {visibleChildren.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => mobile && setMobileMenuOpen(false)}
                      className={cn(
                        'block px-3 py-2 text-sm rounded-lg transition-colors',
                        location.pathname === child.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.name}
            to={item.path!}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {(sidebarOpen || mobile) && <span>{item.name}</span>}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            <span className="text-xl font-bold">FlyNG</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <NavItems mobile />
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col bg-card border-r transition-all duration-300',
          sidebarOpen ? 'lg:w-64' : 'lg:w-20'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            {sidebarOpen && <span className="text-xl font-bold">FlyNG</span>}
          </Link>
          {sidebarOpen && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <ChevronDown className="h-5 w-5 -rotate-90" />
            </Button>
          )}
        </div>
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto mt-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <NavItems />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search */}
            <div className="w-64 sm:w-80 lg:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search anything..."
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            {/* User menu */}
            <div className="pl-2 border-l">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profile_picture || ''} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium">{getUserDisplayName()}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user?.role?.toLowerCase() || 'User'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/billing')}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/api-keys')}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      <span>API Keys</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
