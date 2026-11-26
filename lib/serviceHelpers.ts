// lib/serviceHelpers.ts

/**
 * Extracts the accessories list from a service record.
 * Supports:
 * 1. Array in service.accessories
 * 2. Comma-separated or JSON string in service.accessories
 * 3. Tagged string in service.problem_description (e.g. "[Accessories: Charger, Bag]")
 */
export function extractAccessories(service: any): string[] {
  if (!service) return []

  // 1. Direct array
  if (Array.isArray(service.accessories)) {
    return service.accessories.map((s: any) => String(s).trim()).filter(Boolean)
  }

  // 2. Direct string (JSON array or comma-separated)
  if (typeof service.accessories === 'string' && service.accessories.trim()) {
    const raw = service.accessories.trim()
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => String(s).trim()).filter(Boolean)
      }
    } catch {}
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  // 3. Fallback: Check if embedded in problem_description
  if (typeof service.problem_description === 'string') {
    const match = service.problem_description.match(/\[Accessories:\s*([^\]]+)\]/i)
    if (match && match[1]) {
      return match[1].split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }

  return []
}

/**
 * Strips the internal "[Accessories: ...]" tag from problem_description for clean display
 */
export function cleanProblemDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  return desc.replace(/\n*\[Accessories:\s*[^\]]+\]/gi, '').trim()
}

/**
 * Formats accessories array into a comma-separated string
 */
export function formatAccessories(accessories: string[] | string | null | undefined): string {
  if (!accessories) return ''
  if (Array.isArray(accessories)) {
    return accessories.map((a) => a.trim()).filter(Boolean).join(', ')
  }
  return String(accessories).trim()
}
