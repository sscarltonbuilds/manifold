import { TableRowSkeleton } from '@/components/shared/skeleton'

export default function AdminConnectorsLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-[#E3E1DC] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[#E3E1DC] rounded animate-pulse mt-2" />
        </div>
        <div className="h-9 w-36 bg-[#E3E1DC] rounded-[8px] animate-pulse" />
      </div>
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-[#E3E1DC]">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={7} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
