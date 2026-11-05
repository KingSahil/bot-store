export function parseAllowedNumbers(value = '') {
  if (!value.trim()) return []
  const numbers = value.split(',').map(entry => {
    const number = entry.trim().replace(/^\+/, '').replace(/[\s()-]/g, '')
    if (!/^\d{7,15}$/.test(number)) throw new Error('ALLOWED_NUMBERS must contain comma-separated international phone numbers, for example 919876543210,6581234567. Leave it blank to allow everyone.')
    return number
  })
  return [...new Set(numbers)]
}

export function isSenderAllowed(jid, allowedNumbers) {
  if (!allowedNumbers.length) return true
  // An unresolved LID is not a phone number, even if its digits match an entry.
  const match = /^(\d+)(?::\d+)?@s\.whatsapp\.net$/.exec(jid || '')
  return Boolean(match && allowedNumbers.includes(match[1]))
}
