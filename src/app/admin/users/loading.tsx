import { TableRowSkeleton } from '@/components/shared/skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-7 w-24 bg-[#E3E1DC] rounded animate-pulse" />
        <div className="h-4 w-20 bg-[#E3E1DC] rounded animate-pulse mt-2" />
      </div>
      <div className="bg-white border border-[#E3E1DC] rounded-[10px] overflow-hidden">
        <table className="w-full">
          <tbody className="divide-y divide-[#E3E1DC]">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={4} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
