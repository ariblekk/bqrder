import { useState } from 'react'
import { Input } from './ui'

export function HeaderSearch({
  onSearch,
  placeholder = 'Cari...',
}: {
  onSearch: (v: string) => void
  placeholder?: string
}) {
  const [v, setV] = useState('')
  return (
    <Input
      placeholder={placeholder}
      value={v}
      onChange={(e) => {
        setV(e.target.value)
        onSearch(e.target.value)
      }}
      className="w-40 sm:w-56"
    />
  )
}