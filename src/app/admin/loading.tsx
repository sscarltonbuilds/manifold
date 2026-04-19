import { Skeleton } from '@/components/shared/skeleton'

export default function AdminOverviewLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E3E1DC] rounded-[10px] px-5 py-4">
            <Skeleton className="h-3 w-28 mb-3" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Connector health */}
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden divide-y divide-[#E3E1DC]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-2 h-2 rounded-full flex-none" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent events */}
        <div>
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden divide-y divide-[#E3E1DC]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="w-1.5 h-1.5 rounded-full flex-none mt-1.5" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-36 mb-1.5" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
