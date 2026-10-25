import type { Barber } from '../types'
import { brl, num } from './format'

/** Remuneração em uma linha: "50% de comissão", "R$ 20,00 por atendimento", + "cadeira R$ 800,00/mês". */
export function payModel(b: Pick<Barber, 'commissionType' | 'commissionValue' | 'chairRentAmount' | 'chairRentPeriod'>) {
  const commission = b.commissionType === 1
    ? `${brl(b.commissionValue)} por atendimento`
    : `${num(b.commissionValue)}% de comissão`
  const rent = b.chairRentAmount != null
    ? `cadeira ${brl(b.chairRentAmount)}/${b.chairRentPeriod === 0 ? 'semana' : 'mês'}`
    : null
  return rent ? `${commission}, ${rent}` : commission
}
