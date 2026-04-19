import { ConnectorCardSkeleton } from '@/components/shared/skeleton'

export default function ConnectorsLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="h-7 w-32 bg-[#E3E1DC] rounded animate-pulse" />
        <div className="h-4 w-56 bg-[#E3E1DC] rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ConnectorCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
