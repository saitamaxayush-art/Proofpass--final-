/**
 * Job Description Document Reader (Client-side)
 * Reads pasted text, .txt, .md, .docx, and .pdf documents up to 2 MB.
 *
 * Rules:
 * - .docx: In-browser unzip reading central directory, extracting word/document.xml,
 *          inflating with native DecompressionStream('deflate-raw'), and parsing with DOMParser.
 *          If anything fails: "We could not read this file. Paste the text instead."
 * - .pdf:  POSTs to /api/v1/extract-resume. If server unreachable:
 *          "PDF reading needs the server. Start the backend or paste the text."
 * - Max file size: 2 MB.
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

/**
 * Extracts plain text from a DOCX ArrayBuffer in-browser without external libraries.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function readDocxArrayBuffer(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer)
    const len = bytes.length
    if (len < 22) {
      throw new Error('File too small')
    }

    const view = new DataView(arrayBuffer)

    // 1. Locate End of Central Directory (EOCD) signature: 0x06054b50 (PK\x05\x06)
    let eocdOffset = -1
    const searchLimit = Math.max(0, len - 65557)
    for (let i = len - 22; i >= searchLimit; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i
        break
      }
    }

    let targetEntry = null

    if (eocdOffset !== -1) {
      const cdOffset = view.getUint32(eocdOffset + 16, true)
      const totalEntries = view.getUint16(eocdOffset + 10, true)
      let cur = cdOffset

      for (let i = 0; i < totalEntries && cur + 46 <= len; i++) {
        if (view.getUint32(cur, true) !== 0x02014b50) break

        const compressionMethod = view.getUint16(cur + 10, true)
        const compressedSize = view.getUint32(cur + 20, true)
        const uncompressedSize = view.getUint32(cur + 24, true)
        const fileNameLen = view.getUint16(cur + 28, true)
        const extraFieldLen = view.getUint16(cur + 30, true)
        const fileCommentLen = view.getUint16(cur + 32, true)
        const localHeaderOffset = view.getUint32(cur + 42, true)

        const fileNameBytes = new Uint8Array(arrayBuffer, cur + 46, fileNameLen)
        const fileName = new TextDecoder('utf-8').decode(fileNameBytes)

        if (fileName === 'word/document.xml') {
          targetEntry = {
            compressionMethod,
            compressedSize,
            uncompressedSize,
            localHeaderOffset,
          }
          break
        }

        cur += 46 + fileNameLen + extraFieldLen + fileCommentLen
      }
    }

    // Fallback: Scan local file headers if Central Directory wasn't found or entry missing
    if (!targetEntry) {
      let cur = 0
      while (cur + 30 <= len) {
        if (view.getUint32(cur, true) !== 0x04034b50) break
        const compressionMethod = view.getUint16(cur + 8, true)
        const compressedSize = view.getUint32(cur + 18, true)
        const uncompressedSize = view.getUint32(cur + 22, true)
        const fileNameLen = view.getUint16(cur + 26, true)
        const extraFieldLen = view.getUint16(cur + 28, true)

        const fileNameBytes = new Uint8Array(arrayBuffer, cur + 30, fileNameLen)
        const fileName = new TextDecoder('utf-8').decode(fileNameBytes)

        if (fileName === 'word/document.xml') {
          targetEntry = {
            compressionMethod,
            compressedSize,
            uncompressedSize,
            localHeaderOffset: cur,
          }
          break
        }

        cur += 30 + fileNameLen + extraFieldLen + compressedSize
      }
    }

    if (!targetEntry) {
      throw new Error('word/document.xml not found')
    }

    // 2. Read local file header to locate compressed data start
    const lh = targetEntry.localHeaderOffset
    if (lh + 30 > len || view.getUint32(lh, true) !== 0x04034b50) {
      throw new Error('Invalid local header')
    }

    const localFileNameLen = view.getUint16(lh + 26, true)
    const localExtraLen = view.getUint16(lh + 28, true)
    const dataStart = lh + 30 + localFileNameLen + localExtraLen

    let compressedSize = targetEntry.compressedSize
    if (compressedSize === 0) {
      // Local header check if CD had 0
      compressedSize = view.getUint32(lh + 18, true)
    }

    const compressedSlice = new Uint8Array(arrayBuffer, dataStart, compressedSize)

    // 3. Decompress XML content
    let xmlString = ''
    if (targetEntry.compressionMethod === 0) {
      // Stored / uncompressed
      xmlString = new TextDecoder('utf-8').decode(compressedSlice)
    } else if (targetEntry.compressionMethod === 8) {
      // Deflated: Use native DecompressionStream('deflate-raw')
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('DecompressionStream not supported')
      }
      const ds = new DecompressionStream('deflate-raw')
      const writer = ds.writable.getWriter()
      writer.write(compressedSlice)
      writer.close()
      const resp = new Response(ds.readable)
      const decompressedBuffer = await resp.arrayBuffer()
      xmlString = new TextDecoder('utf-8').decode(decompressedBuffer)
    } else {
      throw new Error(`Unsupported compression method ${targetEntry.compressionMethod}`)
    }

    // 4. Parse XML with DOMParser and extract paragraph text
    if (typeof DOMParser === 'undefined') {
      throw new Error('DOMParser unavailable')
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'application/xml')
    if (doc.querySelector('parsererror')) {
      throw new Error('XML parsing failed')
    }

    // Select all paragraphs (w:p) and join w:t text with a line break after each w:p
    const allElements = Array.from(doc.getElementsByTagName('*'))
    const paragraphs = allElements.filter(
      (el) => el.localName === 'p' || el.tagName === 'w:p' || el.tagName.toLowerCase().endsWith(':p')
    )

    const paragraphLines = paragraphs.map((p) => {
      const pElements = Array.from(p.getElementsByTagName('*'))
      const textNodes = pElements.filter(
        (el) => el.localName === 't' || el.tagName === 'w:t' || el.tagName.toLowerCase().endsWith(':t')
      )
      return textNodes.map((t) => t.textContent || '').join('')
    })

    const result = paragraphLines.join('\n').trim()
    if (!result) {
      throw new Error('No text content found in document')
    }
    return result
  } catch (err) {
    // Contract: If anything fails, throw friendly message and never crash
    throw new Error('We could not read this file. Paste the text instead.')
  }
}

/**
 * Reads any supported file (.txt, .md, .docx, .pdf) up to 2 MB into plain text.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function readJobDescriptionFile(file) {
  if (!file) {
    throw new Error('No file provided.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the 2 MB limit.')
  }

  const name = (file.name || '').toLowerCase()

  // 1. Text & Markdown files
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    try {
      const text = await file.text()
      if (!text || !text.trim()) {
        throw new Error('Uploaded file is empty.')
      }
      return text.trim()
    } catch (err) {
      throw new Error(err.message || 'We could not read this file. Paste the text instead.')
    }
  }

  // 2. DOCX files
  if (name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer()
    return await readDocxArrayBuffer(arrayBuffer)
  }

  // 3. PDF files (proxied to backend /api/v1/extract-resume)
  if (name.endsWith('.pdf')) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/v1/extract-resume', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('PDF reading needs the server. Start the backend or paste the text.')
      }

      const data = await response.json()
      if (!data || !data.text || !data.text.trim()) {
        throw new Error('PDF reading needs the server. Start the backend or paste the text.')
      }

      return data.text.trim()
    } catch (err) {
      throw new Error('PDF reading needs the server. Start the backend or paste the text.')
    }
  }

  // Unsupported format fallback
  throw new Error('Please upload a .txt, .md, .docx, or .pdf file, or paste the text.')
}
