'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export function OAuthResultToast() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  useEffect(() => {
    const connected = searchParams.get('oauth_connected')
    const error     = searchParams.get('oauth_error')

    if (connected) {
      toast.success(`${connected} connected`)
      // Remove the query param from URL without a navigation
      const params = new URLSearchParams(searchParams.toString())
      params.delete('oauth_connected')
      const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl)
    } else if (error) {
      toast.error(`Connection failed: ${error}`)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('oauth_error')
      const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
