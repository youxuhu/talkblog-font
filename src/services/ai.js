function buildUrl(path, query = {}) {
  const url = new URL(path, window.location.origin)
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson(path, { method = 'GET', payload, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: payload ? { 'Content-Type': 'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.response || data?.detail || '请求失败')
  }

  return data
}

export function askAI(blogTitle, blogContent, question, selectedText = null) {
  const payload = { blog_title: blogTitle, blog_content: blogContent, question }
  if (selectedText) {
    payload.selected_text = selectedText
  }
  return requestJson('/api/ai/help', {
    method: 'POST',
    payload,
  })
}
