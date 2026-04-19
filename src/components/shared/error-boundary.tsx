'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
          <AlertTriangle size={32} className="text-[#9C9890]" strokeWidth={1.25} />
          <div>
            <p className="text-[#1A1917] font-medium">Something went wrong</p>
            <p className="text-[#6B6966] text-sm mt-1">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-sm text-[#C4853A] hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
