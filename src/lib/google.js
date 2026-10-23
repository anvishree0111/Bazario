const GIS_SRC = 'https://accounts.google.com/gsi/client'
let gisLoadPromise

export function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      if (window.google?.accounts?.id) resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.head.appendChild(script)
  })

  return gisLoadPromise
}

export function getGoogleCredential(response) {
  if (typeof response === 'string') return response
  return typeof response?.credential === 'string' ? response.credential : ''
}
