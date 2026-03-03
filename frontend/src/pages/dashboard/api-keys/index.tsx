import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, KeyRound, Copy, Check, Eye, EyeOff,
  ShieldAlert, Clock, Activity, Loader2, Ban,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import apiKeysApi, { APIKey, APIKeyCreateResponse } from '@/api/endpoints/api-keys'
import { useFormat } from '@/hooks/use-format'
import { getErrorMessage } from '@/lib/api-error'

export default function APIKeysPage() {
  const queryClient = useQueryClient()
  const { formatDateTime, formatRelative } = useFormat()

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null)
  const [newKey, setNewKey] = useState<APIKeyCreateResponse | null>(null)
  const [showKeyOpen, setShowKeyOpen] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Copy state
  const [copied, setCopied] = useState(false)
  const [showRawKey, setShowRawKey] = useState(false)

  // Fetch API keys
  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.getAPIKeys(),
  })

  const apiKeys: APIKey[] = data?.data?.data || []
  const activeKeys = apiKeys.filter(k => k.is_active)
  const revokedKeys = apiKeys.filter(k => !k.is_active)

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      apiKeysApi.createAPIKey(payload),
    onSuccess: (response) => {
      const keyData = response.data.data
      setNewKey(keyData)
      setCreateOpen(false)
      setShowKeyOpen(true)
      setName('')
      setDescription('')
      queryClient.refetchQueries({ queryKey: ['api-keys'] })
      toast.success('API key created successfully', { duration: 4000 })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create API key'), { duration: 5000 })
    },
  })

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiKeysApi.revokeAPIKey(id),
    onSuccess: () => {
      setRevokeOpen(false)
      setKeyToRevoke(null)
      queryClient.refetchQueries({ queryKey: ['api-keys'] })
      toast.success('API key revoked successfully', { duration: 4000 })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to revoke API key'), { duration: 5000 })
    },
  })

  const handleCreate = () => {
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim(), description: description.trim() })
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetCreateForm = () => {
    setName('')
    setDescription('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for external integrations
          </p>
        </div>
        <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiKeys.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeKeys.length} active, {revokedKeys.length} revoked
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <ShieldAlert className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeKeys.length}</div>
              <p className="text-xs text-muted-foreground">Currently in use</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {apiKeys.reduce((sum, k) => sum + k.usage_count, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all keys</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            API keys allow external systems to authenticate with your organization's API.
            Keep your keys secure and revoke any that are no longer needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No API Keys</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first API key to start integrating with external systems.
              </p>
              <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id} className={!apiKey.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{apiKey.name}</div>
                        {apiKey.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {apiKey.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {apiKey.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {!apiKey.is_active ? (
                        <Badge variant="outline" className="text-muted-foreground">Revoked</Badge>
                      ) : apiKey.is_expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                      {apiKey.expires_at && apiKey.is_active && !apiKey.is_expired && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {formatRelative(apiKey.expires_at)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{apiKey.usage_count.toLocaleString()} calls</span>
                    </TableCell>
                    <TableCell>
                      {apiKey.last_used_at ? (
                        <div>
                          <div className="text-sm">{formatRelative(apiKey.last_used_at)}</div>
                          {apiKey.last_used_ip && (
                            <div className="text-xs text-muted-foreground">{apiKey.last_used_ip}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{formatDateTime(apiKey.created_at)}</div>
                        <div className="text-xs text-muted-foreground">by {apiKey.created_by_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {apiKey.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setKeyToRevoke(apiKey); setRevokeOpen(true) }}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external integrations. The key will only be shown once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Integration"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-description">Description (optional)</Label>
              <Textarea
                id="key-description"
                placeholder="What is this API key used for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Key Dialog (after creation) */}
      <Dialog open={showKeyOpen} onOpenChange={(open) => {
        if (!open) {
          setShowKeyOpen(false)
          setNewKey(null)
          setShowRawKey(false)
          setCopied(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again after closing this dialog.
            </DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <p className="text-sm font-medium">{newKey.name}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md font-mono break-all">
                    {showRawKey ? newKey.raw_key : '•'.repeat(40)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRawKey(!showRawKey)}
                  >
                    {showRawKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCopy(newKey.raw_key)}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Make sure to copy your API key now. For security reasons, it cannot be displayed again after you close this dialog.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setShowKeyOpen(false); setNewKey(null); setShowRawKey(false); setCopied(false) }}>
              I've Copied My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the API key "{keyToRevoke?.name}"?
              This action cannot be undone. Any integrations using this key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revokeMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (keyToRevoke) revokeMutation.mutate(keyToRevoke.id)
              }}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
