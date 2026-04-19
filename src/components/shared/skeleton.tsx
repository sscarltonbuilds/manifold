import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-[#E3E1DC]',
        className
      )}
    />
  )
}

export function ConnectorCardSkeleton() {
  return (
    <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="w-10 h-10 rounded-[8px]" />
        <Skeleton className="w-10 h-5 rounded-full mt-0.5" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}
