import { Skeleton } from '@/components/shared/skeleton'
import { TableRowSkeleton } from '@/components/shared/skeleton'

export default function UserDetailLoading() {
  return (
    <div className="p-8 max-w-3xl">
      <Skeleton className="h-4 w-16 mb-6" />

      {/* Profile card */}
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] p-5 mb-6 flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full flex-none" />
        <div>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48 mt-1.5" />
        </div>
        <div className="ml-auto">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Connectors table */}
      <Skeleton className="h-5 w-32 mb-3" />
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-[#E3E1DC]">
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={4} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
