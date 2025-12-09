export function formatAmountForDisplay(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100)
}

export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100)
}
