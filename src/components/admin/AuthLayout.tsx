import type { ReactNode } from 'react'

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="page-full">
      <div className="bg-glow-spot" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <h1>Admin Portal</h1>
          <p className="text-[13px] uppercase tracking-[0.4em] text-accent/80 font-medium">
            • Backstage •
          </p>
        </div>

        <div className="login-card">{children}</div>

        <p className="p-clean text-center text-s my-10 opacity-50">
          &copy; {new Date().getFullYear()} Tip the Velvet • Restricted Access
        </p>
      </div>
    </div>
  )
}
