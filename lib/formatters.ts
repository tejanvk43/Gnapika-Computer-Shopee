// lib/formatters.ts

export const SHOP_DETAILS = {
  name: 'Gnapika Computer Shopee',
  legalName: 'Gnapika Computer Shopee',
  tagline: 'Multi-Brand Laptops, Desktops, Peripherals, Accessories & Chip-Level Service Center',
  address: '38-1-7, American Hospital Road, Opposite Indira Towers, MG Road (near P.W.D Grounds / Rythu Bazar)',
  city: 'Vijayawada, Andhra Pradesh - 520002',
  phone: '+91 92915 86906 / +91 89199 98149',
  email: 'gnapikacomputers@gmail.com',
  gstin: '37AAEFG1234A1Z5',
  state: 'Andhra Pradesh',
  stateCode: '37',
  bankDetails: {
    bankName: 'State Bank of India',
    accountName: 'Gnapika Computer Shopee',
    accountNo: '389201948201',
    ifsc: 'SBIN0001234',
    branch: 'Vijayawada Main Branch',
    upiId: '9291586906@sbi',
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
