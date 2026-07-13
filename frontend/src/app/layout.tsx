import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/services/auth'
import { SidebarProvider } from './sidebar-context'
import { Nav } from './nav'
import { MainContent } from './main-content'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Controle de Produção',
  description: 'Sistema de controle de produção e assistência técnica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <Nav />
            <MainContent>{children}</MainContent>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
