/**
 * Recruiter Batch Ingestion API Client.
 * Interfaces with backend /api/v1/batch endpoints with mock mode support.
 */

const API_BASE = '/api/v1/batch'

export async function uploadBatchFiles({
  spreadsheetFile,
  zipFile = null,
  consent = false,
  targetRole = 'Software Engineer',
  mock = false,
}) {
  const isMock = mock || import.meta.env.VITE_USE_MOCK === 'true'

  const formData = new FormData()
  formData.append('spreadsheet_file', spreadsheetFile)
  if (zipFile) {
    formData.append('resumes_zip', zipFile)
  }
  formData.append('consent', consent ? 'true' : 'false')
  formData.append('target_role', targetRole || 'Software Engineer')
  formData.append('mock', isMock ? 'true' : 'false')

  const res = await fetch(API_BASE, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) {
    const errorText = await res.text()
    try {
      const parsed = JSON.parse(errorText)
      throw new Error(parsed.detail || `Upload failed with status ${res.status}`)
    } catch {
      throw new Error(`Upload failed with status ${res.status}: ${errorText}`)
    }
  }

  return await res.json()
}

export async function getBatchStatus(batchId) {
  const res = await fetch(`${API_BASE}/${batchId}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch batch status: ${res.status}`)
  }

  return await res.json()
}

export async function startBatch(batchId, selectedRowIds = null) {
  const res = await fetch(`${API_BASE}/${batchId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selectedRowIds ? { selected_row_ids: selectedRowIds } : {}),
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Failed to start batch processing: ${res.status}`)
  }

  return await res.json()
}

export async function retryBatchRow(batchId, rowId) {
  const res = await fetch(`${API_BASE}/${batchId}/retry/${rowId}`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Failed to retry row: ${res.status}`)
  }

  return await res.json()
}
