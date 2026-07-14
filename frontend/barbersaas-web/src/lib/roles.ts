/**
 * Papel do usuário logado → para onde ele "mora" no app.
 *
 * Super admin é dono do Trimly, não de uma barbearia: a casa dele é /super-admin.
 * Owner/Admin continuam no dashboard da própria barbearia (/admin), como sempre.
 *
 * Ponto único da decisão — antes o '/admin' vivia hardcoded no LoginPage e no
 * router, e mudar o comportamento exigia caçar cada ocorrência.
 */
export const isSuperAdmin = (role?: string | null) =>
  role?.toLowerCase() === 'superadmin'

export const homeRouteFor = (role?: string | null) =>
  isSuperAdmin(role) ? '/super-admin' : '/admin'
