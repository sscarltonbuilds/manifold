import { Skeleton } from '@/components/shared/skeleton'

export default function ConnectorDetailLoading() {
  return (
    <div className="p-8 max-w-4xl">
      {/* Back link */}
      <Skeleton className="h-4 w-24 mb-6" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Skeleton className="w-10 h-10 rounded-[8px] flex-none" />
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 mt-1.5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E3E1DC] mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      {/* Detail rows */}
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] divide-y divide-[#E3E1DC]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}
