import type { ReactNode } from 'react'
import { Logo } from '../../components/ui/Logo'

/* Moldura das telas de acesso (entrar, criar conta, confirmar e-mail).
   Desktop: painel na cor da marca com a frase do produto, formulário à direita.
   Celular: só o formulário, com a marca no topo. */
export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen min-h-dvh flex bg-surface">
      <aside className="hidden lg:flex flex-col justify-between w-[44%] max-w-[620px] p-12 relative overflow-hidden"
        style={{ background: 'var(--brand)' }}>
        <Logo size={34} inverse />
        <div className="relative">
          <p className="t-display text-white text-[46px] leading-[50px] max-w-[15ch]">
            Agenda, clientes e caixa da barbearia num só lugar.
          </p>
          <p className="mt-5 text-md max-w-[40ch]" style={{ color: 'rgba(255,255,255,0.78)' }}>
            O cliente marca pelo link, a equipe vê a agenda do dia e você acompanha o faturamento do mês.
          </p>
        </div>
        <p className="text-13" style={{ color: 'rgba(255,255,255,0.6)' }}>© {new Date().getFullYear()} Trimly</p>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="lg:hidden px-6 pt-[calc(24px+env(safe-area-inset-top))]">
          <Logo size={32} />
        </div>
        <div className="flex-1 flex items-start lg:items-center justify-center px-6 pt-12 pb-10 lg:py-10">
          <div className={`w-full ${wide ? 'max-w-[460px]' : 'max-w-[380px]'}`}>{children}</div>
        </div>
      </main>
    </div>
  )
}
