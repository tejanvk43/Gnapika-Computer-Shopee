// lib/formatters.ts

export const SHOP_DETAILS = {
  name: 'GNAPIKA COMPUTER SHOPEE',
  legalName: 'GNAPIKA COMPUTER SHOPEE',
  tagline: 'A house that cares for all your computer needs',
  address: 'D.No. 38-1-7, Opposite Indira Towers, American Hospital Road, MG Road (near P.W.D Grounds / Rythu Bazar)',
  city: 'Vijayawada, Andhra Pradesh - 520002',
  phone: '9493471414',
  email: 'gnapikacomputershopee@gmail.com',
  gstin: '37BEYPC1417G1ZG',
  pan: 'BEYPC1417G',
  state: 'ANDHRA PRADESH',
  stateCode: '37',
  bankDetails: {
    bankName: 'CITY UNION BANK',
    accountName: 'GNAPIKA COMPUTER SHOPEE',
    accountNo: '512020010025952',
    ifsc: 'CIUB0000061',
    branch: 'VIJAYAWADA',
    upiId: '9493471414@ybl',
  },
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === undefined || num === null || isNaN(num)) return '₹0.00'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function numberToWordsRupees(num: number): string {
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10]
    if (n < 1000)
      return inWords(Math.floor(n / 100)) + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '')
    if (n < 100000)
      return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '')
    if (n < 10000000)
      return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '')
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '')
  }

  const rounded = Math.round(num)
  if (rounded === 0) return 'Zero Rupees Only'
  return `${inWords(rounded).trim()} Rupees Only`
}

/**
 * Computes Indian Financial Year in 'YY-YY' format (e.g. '26-27').
 * Financial Year changes after every March (i.e., on April 1st).
 * - January, February, March: (Year - 1)-(Year) -> e.g. March 2027 is '26-27'
 * - April through December: Year-(Year + 1) -> e.g. November 2026 is '26-27'
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() // 0 to 11 (0=Jan, 1=Feb, 2=Mar, 3=Apr)
  const year = date.getFullYear()

  const startYear = month < 3 ? year - 1 : year
  const endYear = startYear + 1

  const startStr = String(startYear).slice(-2)
  const endStr = String(endYear).slice(-2)

  return `${startStr}-${endStr}`
}

