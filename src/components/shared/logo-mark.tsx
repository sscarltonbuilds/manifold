'use client'

export function LogoMark({ size = 48 }: { size?: number }) {
  const scale = size / 48
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top node — amber, the platform source */}
      <circle cx="24" cy="8" r="5" fill="#C4853A" />
      {/* Vertical stem */}
      <line x1="24" y1="13" x2="24" y2="24" stroke="#9C9890" strokeWidth="1.5" />
      {/* Branch left */}
      <line x1="24" y1="24" x2="10" y2="36" stroke="#9C9890" strokeWidth="1.5" />
      {/* Branch center */}
      <line x1="24" y1="24" x2="24" y2="36" stroke="#9C9890" strokeWidth="1.5" />
      {/* Branch right */}
      <line x1="24" y1="24" x2="38" y2="36" stroke="#9C9890" strokeWidth="1.5" />
      {/* Output nodes — subdued */}
      <circle cx="10" cy="40" r="4" fill="#9C9890" />
      <circle cx="24" cy="40" r="4" fill="#9C9890" />
      <circle cx="38" cy="40" r="4" fill="#9C9890" />
    </svg>
  )
}
