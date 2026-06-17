# BarberSaaS — Design System (Fase 3.1)

Direção: **dark-first premium, sóbrio e editorial** — inspirado na *sensação* de Linear, Vercel, Stripe e Calendly (não em cópia). Preto-azulado profundo, um único acento quente (dourado de barbearia), tipografia com hierarquia forte e muito respiro. Tudo via **tokens (CSS variables)**, então a **cor de cada barbearia** continua sobrescrevendo o acento em runtime, e **light/dark** trocam só os tokens.

> Princípio: nenhuma cor fixa nas telas — só tokens. Contraste mínimo AA. Movimento curto e natural (150–300ms), respeitando `prefers-reduced-motion`.

---

## 1. Cores (tokens semânticos, em canais RGB p/ opacidade do Tailwind)

### Dark (padrão)
| Token | RGB | Uso |
|---|---|---|
| `--bg` | `8 9 12` | fundo da app (preto-azulado) |
| `--surface` | `16 17 21` | cards, sidebar, topbar |
| `--surface-hover` | `23 24 30` | hover/inputs/realces sutis |
| `--border` | `32 34 42` | divisores e contornos |
| `--text` | `248 248 250` | texto principal |
| `--text-muted` | `156 158 168` | secundário |
| `--text-subtle` | `104 106 118` | terciário/placeholder |
| `--accent` | `202 168 92` | **marca** (botões, links, foco) — *sobrescrito por barbearia* |
| `--accent-hover` | auto | estado hover do acento |
| `--accent-fg` | auto | texto sobre o acento (contraste por luminância) |
| `--success` `--warning` `--danger` `--info` | `46 200 132` · `245 184 60` · `244 96 96` · `96 160 250` | semânticos |

### Light
Mesmos nomes; superfícies claras (`--bg 250 250 252`, `--surface 255 255 255`), texto escuro (`--text 24 24 28`), acento dourado mais escuro p/ contraste (`--accent 166 124 38`), semânticos em tons mais fechados.

### Por barbearia
`applyTenantTheme()` converte a cor da marca (hex) → `--accent`/`--accent-hover` (claro/escuro) e calcula `--accent-fg` por luminância. A cor do topo (primary) alimenta o hero público. Nenhuma tela referencia hex fixo.

---

## 2. Tipografia
- Família: **Inter** (system-ui fallback). Numérica tabular onde houver tabela/valor.
- Escala: `text-xs 12` · `sm 14` (corpo) · `base 16` · `lg 18` · `xl 20` · `2xl 24` · `3xl 30` (títulos de página) · `4xl 36` (hero).
- Pesos: 400 corpo, 500 rótulos, 600 ênfase, 700/800 títulos. Títulos com `tracking-tight`.
- Hierarquia: título de página `text-xl/2xl font-bold`; seção `text-sm font-semibold text-muted`; corpo `text-sm`.

## 3. Tokens de forma
- **Espaçamento:** escala 4px (gap/padding 1.5–6). Respiro generoso: cards `p-6`, seções `space-y-6`.
- **Raio:** `lg .875rem` · `xl 1rem` · `2xl 1.125rem` (cards). Botões/inputs `rounded-xl`.
- **Sombra/elevação:** `sm` (cartões em repouso) → `md` (hover) → `lg` (modais/popovers); `glow` (anel de acento). Sombras suaves, multi-camada.

## 4. Componentes base (classes em `@layer components`)
- **Botões:** `.btn-primary` (acento + texto de contraste, `active:scale .98`), `.btn-secondary` (contorno do acento), `.btn-ghost`, `.btn-danger`.
- **Inputs:** `.input` (fundo surfaceHover, foco com anel de acento), `.label`.
- **Cards:** `.card` (surface + border + radius 2xl + shadow sm); `.card-tap` (selecionável: sobe no hover, encolhe no tap).
- **Badges de status:** `.badge-pending/confirmed/completed/cancelled`.
- **Estados:** `.skeleton` (shimmer) para loading; empty states com ícone + texto; foco visível com anel de acento.
- **Navegação:** item ativo com fundo `accent/15`, borda `accent/30`, texto acento.

## 5. Movimento
- Keyframes: `fade-in` (.18s), `slide-up` (.26s), `scale-in` (.18s, leve overshoot), `shimmer`.
- Listas: entrada escalonada (`animationDelay` por índice). Sucesso: `scale-in` + anel `ping`. Tudo desligado sob `prefers-reduced-motion`.

## 6. Acessibilidade
- Contraste AA no texto sobre superfícies (dark e light). Acento com `--accent-fg` calculado p/ legibilidade.
- Alvos de toque ≥ 44px no fluxo do cliente. Foco sempre visível.

---

**Style guide vivo:** rota `/style-guide` renderiza paleta, tipografia, botões, inputs, cards, badges, skeleton e empty state aplicando os tokens — para validar a direção em light e dark.
