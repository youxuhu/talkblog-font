const SENSITIVE_WORDS = [
  '敏感词1',
  '敏感词2',
]

export function censorText(text) {
  if (!text) return text
  let result = text
  for (const word of SENSITIVE_WORDS) {
    while (result.includes(word)) {
      result = result.replace(word, '***')
    }
  }
  return result
}
