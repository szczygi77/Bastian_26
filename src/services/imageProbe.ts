const LOGO_HINT = /logo|herb|flaga|icon|emblemat|znak/i

export function isLikelyLogoUrl(url: string): boolean {
  return LOGO_HINT.test(decodeURIComponent(url))
}

/** Sprawdza, czy URL ładuje się jako sensowne zdjęcie (min. 64×64). */
export function probeImageUrl(url: string, timeoutMs = 8000): Promise<boolean> {
  if (!url || isLikelyLogoUrl(url)) return Promise.resolve(false)

  return new Promise(resolve => {
    const img = new Image()
    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok)
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs)

    img.onload = () => {
      finish(img.naturalWidth >= 64 && img.naturalHeight >= 64)
    }
    img.onerror = () => finish(false)
    img.src = url
  })
}

export async function pickFirstValidImage(
  candidates: Array<{ url: string; attribution?: string }>,
): Promise<{ url: string; attribution?: string } | null> {
  for (const candidate of candidates) {
    if (await probeImageUrl(candidate.url)) {
      return candidate
    }
  }
  return null
}
