export default function Loading() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="h-4 w-20 bg-[#E3E1DC] rounded animate-pulse mb-6" />
      <div className="h-32 bg-[#E3E1DC] rounded-[10px] animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-[#E3E1DC] rounded-[10px] animate-pulse" />
        <div className="h-64 bg-[#E3E1DC] rounded-[10px] animate-pulse" />
      </div>
    </div>
  )
}
