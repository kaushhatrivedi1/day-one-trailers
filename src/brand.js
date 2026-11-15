// A company's brand colour from its logo, for when research finds none: the most common saturated
// colour in the image (white, black and greys are ignored). Cached per logo.
const cache = new Map()

export function logoColor(src) {
  if (!src) return Promise.resolve('')
  if (!cache.has(src)) {
    cache.set(src, new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const n = 40
          const c = document.createElement('canvas')
          c.width = n; c.height = n
          const g = c.getContext('2d', { willReadFrequently: true })
          g.drawImage(img, 0, 0, n, n)
          const d = g.getImageData(0, 0, n, n).data
          const buckets = new Map()
          for (let i = 0; i < d.length; i += 4) {
            const [r, gg, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]]
            if (a < 200) continue
            const max = Math.max(r, gg, b), min = Math.min(r, gg, b)
            if (max < 40 || max - min < 50) continue // too dark or too grey
            const key = `${r >> 5},${gg >> 5},${b >> 5}`
            const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }
            e.n++; e.r += r; e.g += gg; e.b += b
            buckets.set(key, e)
          }
          const best = [...buckets.values()].sort((x, y) => y.n - x.n)[0]
          if (!best || best.n < 6) return resolve('')
          const hex = (v) => Math.round(v / best.n).toString(16).padStart(2, '0')
          resolve(`#${hex(best.r)}${hex(best.g)}${hex(best.b)}`)
        } catch { resolve('') }
      }
      img.onerror = () => resolve('')
      img.src = src
    }))
  }
  return cache.get(src)
}

// Fill in research.brandColor from the logo when it is missing.
export async function withBrand(research) {
  if (!research || research.brandColor || !research.logo) return research
  const color = await logoColor(research.logo)
  return color ? { ...research, brandColor: color } : research
}
