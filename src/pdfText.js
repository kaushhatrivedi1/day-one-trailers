// Read the text out of a resume PDF in the browser. Nothing is uploaded for this step.
// Scanned PDFs have no text layer; the caller tells the person to paste instead.
export async function pdfText(file) {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages = []
  for (let n = 1; n <= Math.min(doc.numPages, 6); n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    let line = ''
    const lines = []
    let lastY = null
    for (const item of content.items) {
      const y = item.transform?.[5]
      if (lastY !== null && Math.abs(y - lastY) > 4) { lines.push(line.trim()); line = '' }
      line += item.str + (item.hasEOL ? '\n' : ' ')
      lastY = y
    }
    lines.push(line.trim())
    pages.push(lines.filter(Boolean).join('\n'))
  }
  return pages.join('\n\n').trim()
}
