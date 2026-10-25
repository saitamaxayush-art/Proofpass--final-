/**
 * JobDescriptionImport Component
 * Provides in-browser job description ingestion via File Upload (.docx, .pdf, .txt, .md) or Text Paste.
 *
 * Rules:
 * - Deterministic client-side parsing using native APIs (DOMParser, DecompressionStream).
 * - "Parsed in your browser. Nothing is uploaded." notice (PDF exception clearly stated).
 * - "Check what we found" review panel with editable title, location, workMode, minYears,
 *   skills with Must/Should/Nice and foundIn context, custom skill addition, and cleaned description.
 * - Conflict resolution: When a form field already has text, asks Replace or Keep per field.
 * - Does not save to backend directly; passes applied fields to parent form.
 */

import { useState, useRef } from 'react'
import Seg from './Seg.jsx'
import { readJobDescriptionFile } from '../lib/jdReader.js'
import { parseJobDescription } from '../lib/jdParser.js'
import { SAMPLE_JOB_DESCRIPTIONS } from '../data/sampleJobDescriptions.js'
import { TAXONOMY } from '../data/taxonomy.js'
import { getSkillId } from '../lib/skillsByState.js'

export default function JobDescriptionImport({
  currentValues = {},
  onApply,
  onDiscard,
  isOpenDefault = false,
}) {
  const [isExpanded, setIsExpanded] = useState(isOpenDefault)
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'paste'
  const [pastedText, setPastedText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [fileName, setFileName] = useState('')

  // Parsed / Review Panel State
  const [parsedData, setParsedData] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWorkMode, setEditWorkMode] = useState('')
  const [editMinYears, setEditMinYears] = useState('')
  const [editSkills, setEditSkills] = useState([])
  const [editDescription, setEditDescription] = useState('')
  const [expandedFoundIn, setExpandedFoundIn] = useState({}) // { [skillId]: boolean }

  // New Skill Input in Review Panel
  const [customSkillInput, setCustomSkillInput] = useState('')
  const [customSkillImportance, setCustomSkillImportance] = useState('Must')
  const [skillSuggestions, setSkillSuggestions] = useState([])

  // Conflict Resolution State
  const [conflictFields, setConflictFields] = useState(null) // Array of { field, label, currentVal, parsedVal, choice: 'replace' | 'keep' }

  const fileInputRef = useRef(null)

  // Autocomplete skill suggestions
  const handleCustomSkillChange = (e) => {
    const val = e.target.value
    setCustomSkillInput(val)
    if (!val || val.trim().length === 0) {
      setSkillSuggestions([])
      return
    }
    const clean = val.toLowerCase().trim()
    const existingNames = new Set(editSkills.map((s) => s.name.toLowerCase()))
    const matches = TAXONOMY.filter(
      (t) =>
        !existingNames.has(t.name.toLowerCase()) &&
        (t.name.toLowerCase().includes(clean) ||
          t.aliases.some((a) => a.toLowerCase().includes(clean)))
    ).slice(0, 5)
    setSkillSuggestions(matches)
  }

  const addCustomSkill = (nameToAdd, importance = customSkillImportance) => {
    const clean = (nameToAdd || customSkillInput).trim()
    if (!clean) return

    const existing = editSkills.find((s) => s.name.toLowerCase() === clean.toLowerCase())
    if (existing) {
      setCustomSkillInput('')
      setSkillSuggestions([])
      return
    }

    const taxonomyMatch = TAXONOMY.find(
      (t) =>
        t.name.toLowerCase() === clean.toLowerCase() ||
        t.aliases.some((a) => a.toLowerCase() === clean.toLowerCase())
    )

    const skillId = taxonomyMatch ? taxonomyMatch.id : getSkillId(clean)
    const displayName = taxonomyMatch ? taxonomyMatch.name : clean
    const isCustom = !taxonomyMatch

    setEditSkills((prev) => [
      ...prev,
      {
        skillId,
        name: displayName,
        importance,
        foundIn: 'Added during recruiter review',
        isCustom,
      },
    ])

    setCustomSkillInput('')
    setSkillSuggestions([])
  }

  // Parse raw text into review panel
  const handleParseText = (text, sourceLabel = 'input') => {
    if (!text || !text.trim()) {
      setErrorMessage('Please provide job description text or select a file.')
      return
    }

    setErrorMessage(null)
    setIsParsing(true)
    setStatusMessage('Parsing job description...')

    try {
      const parsed = parseJobDescription(text, TAXONOMY)
      setParsedData(parsed)
      setEditTitle(parsed.title || '')
      setEditLocation(parsed.location || '')
      setEditWorkMode(parsed.workMode || '')
      setEditMinYears(parsed.minExperienceYears != null ? String(parsed.minExperienceYears) : '')
      setEditSkills(
        parsed.skills.map((s) => ({
          ...s,
          isCustom: !TAXONOMY.some(
            (t) => t.id === s.skillId || t.name.toLowerCase() === s.name.toLowerCase()
          ),
        }))
      )
      setEditDescription(parsed.cleanedText || '')
      setIsExpanded(true)
      setStatusMessage(
        `Parsed successfully from ${sourceLabel}. Found ${parsed.skills.length} skills. Review below.`
      )
    } catch (err) {
      setErrorMessage(err.message || 'We could not read this file. Paste the text instead.')
      setStatusMessage('Parsing failed.')
    } finally {
      setIsParsing(false)
    }
  }

  // Process File Upload
  const processFile = async (file) => {
    if (!file) return
    setErrorMessage(null)
    setFileName(file.name)
    setIsParsing(true)
    setStatusMessage(`Reading ${file.name}...`)

    try {
      const extractedText = await readJobDescriptionFile(file)
      handleParseText(extractedText, file.name)
    } catch (err) {
      setErrorMessage(err.message || 'We could not read this file. Paste the text instead.')
      setStatusMessage('File read failed.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Sample JD loader
  const handleLoadSample = (sample) => {
    setFileName(sample.label)
    handleParseText(sample.text, sample.label)
  }

  // Skill row modifications
  const handleSkillImportanceChange = (skillId, nextImportance) => {
    setEditSkills((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, importance: nextImportance } : s))
    )
  }

  const handleRemoveSkill = (skillId) => {
    setEditSkills((prev) => prev.filter((s) => s.skillId !== skillId))
  }

  const toggleFoundIn = (skillId) => {
    setExpandedFoundIn((prev) => ({ ...prev, [skillId]: !prev[skillId] }))
  }

  // "Use this" & Conflict Detection
  const handleInitiateUseThis = () => {
    const conflicts = []

    if (currentValues.title && currentValues.title.trim() && currentValues.title.trim() !== editTitle.trim()) {
      conflicts.push({
        field: 'title',
        label: 'Role Title',
        currentVal: currentValues.title.trim(),
        parsedVal: editTitle.trim(),
        choice: 'replace',
      })
    }

    if (
      currentValues.description &&
      currentValues.description.trim() &&
      currentValues.description.trim() !== editDescription.trim()
    ) {
      conflicts.push({
        field: 'description',
        label: 'Requirement Description',
        currentVal: currentValues.description.trim(),
        parsedVal: editDescription.trim(),
        choice: 'replace',
      })
    }

    if (currentValues.requiredSkills && currentValues.requiredSkills.length > 0) {
      const currentListStr = currentValues.requiredSkills.map((s) => `${s.skill} (${s.importance})`).join(', ')
      const parsedListStr = editSkills.map((s) => `${s.name} (${s.importance})`).join(', ')
      if (currentListStr !== parsedListStr) {
        conflicts.push({
          field: 'requiredSkills',
          label: 'Required Skills List',
          currentVal: currentListStr,
          parsedVal: parsedListStr,
          choice: 'replace',
        })
      }
    }

    if (currentValues.location && currentValues.location.trim() && currentValues.location.trim() !== editLocation.trim()) {
      conflicts.push({
        field: 'location',
        label: 'Location',
        currentVal: currentValues.location.trim(),
        parsedVal: editLocation.trim(),
        choice: 'replace',
      })
    }

    if (currentValues.workMode && currentValues.workMode !== editWorkMode) {
      conflicts.push({
        field: 'workMode',
        label: 'Work Mode',
        currentVal: currentValues.workMode,
        parsedVal: editWorkMode || 'None',
        choice: 'replace',
      })
    }

    if (
      currentValues.minExperienceYears != null &&
      String(currentValues.minExperienceYears) !== editMinYears
    ) {
      conflicts.push({
        field: 'minExperienceYears',
        label: 'Minimum Years Experience',
        currentVal: `${currentValues.minExperienceYears} yrs`,
        parsedVal: editMinYears ? `${editMinYears} yrs` : 'None',
        choice: 'replace',
      })
    }

    if (conflicts.length > 0) {
      setConflictFields(conflicts)
    } else {
      applyFinalValues({})
    }
  }

  const applyFinalValues = (overrideChoices = {}) => {
    const finalTitle = overrideChoices.title === 'keep' ? currentValues.title : editTitle.trim()
    const finalDesc = overrideChoices.description === 'keep' ? currentValues.description : editDescription.trim()
    const finalSkills =
      overrideChoices.requiredSkills === 'keep'
        ? currentValues.requiredSkills
        : editSkills.map((s) => ({
            skill: s.name,
            importance: s.importance,
            weight: s.importance === 'Must' ? 3 : s.importance === 'Should' ? 2 : 1,
          }))
    const finalLoc = overrideChoices.location === 'keep' ? currentValues.location : editLocation.trim() || null
    const finalWorkMode = overrideChoices.workMode === 'keep' ? currentValues.workMode : editWorkMode || null
    const finalMinYears =
      overrideChoices.minExperienceYears === 'keep'
        ? currentValues.minExperienceYears
        : editMinYears
        ? Number(editMinYears)
        : null

    onApply({
      title: finalTitle,
      description: finalDesc,
      requiredSkills: finalSkills,
      location: finalLoc,
      workMode: finalWorkMode,
      minExperienceYears: finalMinYears,
    })

    setConflictFields(null)
    setParsedData(null)
    setIsExpanded(false)
    setStatusMessage('Job description imported successfully.')
  }

  const handleConflictChoiceChange = (field, choice) => {
    setConflictFields((prev) =>
      prev.map((c) => (c.field === field ? { ...c, choice } : c))
    )
  }

  const handleConfirmConflictResolution = () => {
    const choices = {}
    conflictFields.forEach((c) => {
      choices[c.field] = c.choice
    })
    applyFinalValues(choices)
  }

  const handleDiscard = () => {
    setParsedData(null)
    setConflictFields(null)
    setErrorMessage(null)
    setFileName('')
    setPastedText('')
    setIsExpanded(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (onDiscard) onDiscard()
  }

  return (
    <div
      className="jd-import-container"
      style={{
        marginBottom: '20px',
        border: '1px solid var(--line-soft)',
        borderRadius: '10px',
        background: 'var(--surface-2, rgba(255, 255, 255, 0.02))',
        padding: '16px',
      }}
    >
      {/* Header & Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Import from Job Description</span>
            <span className="chip sm S" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
              Instant Auto-Fill
            </span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '4px 0 0' }}>
            Upload a JD file or paste text to automatically extract title, location, years, and categorized skills.
          </p>
        </div>

        <button
          type="button"
          className="b sm g"
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide importer ▴' : 'Open importer ▾'}
        </button>
      </div>

      {/* ARIA Live Region for Screen Readers */}
      <div aria-live="polite" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {statusMessage}
      </div>

      {isExpanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--line-soft)', paddingTop: '16px' }}>
          {/* Importer Input Modes */}
          {!parsedData && (
            <>
              <div style={{ marginBottom: '14px' }}>
                <Seg
                  items={[
                    { id: 'upload', label: 'Upload file (.docx, .pdf, .txt)' },
                    { id: 'paste', label: 'Paste text' },
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                  role="tablist"
                  label="Job description import mode"
                />
              </div>

              {/* TAB 1: File Upload */}
              {activeTab === 'upload' && (
                <div>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--accent, #3b82f6)' : 'var(--line-soft)'}`,
                      borderRadius: '8px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: isDragging ? 'var(--card-subtle)' : 'transparent',
                      transition: 'border-color 0.2s ease, background 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={handleFileInputChange}
                    />

                    <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>📄</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)' }}>
                      Drag and drop your job description here, or{' '}
                      <span style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'underline' }}>
                        choose file
                      </span>
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--muted)' }}>
                      Supports .docx, .pdf, .txt, .md (max 2 MB)
                    </p>
                  </div>

                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--faint)',
                      margin: '10px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🔒 Parsed in your browser. Nothing is uploaded.</span>
                    <span style={{ fontSize: '0.7rem' }}>(PDF is the one exception, and it only goes to your own backend.)</span>
                  </p>
                </div>
              )}

              {/* TAB 2: Paste Text */}
              {activeTab === 'paste' && (
                <div>
                  <textarea
                    rows="6"
                    className="form-input"
                    placeholder="Paste job description text here (e.g. Job Title, Location, Requirements, Preferred Skills)..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    style={{ fontSize: '0.82rem', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="b sm"
                      disabled={isParsing || !pastedText.trim()}
                      onClick={() => handleParseText(pastedText, 'pasted text')}
                    >
                      {isParsing ? 'Parsing text...' : 'Parse text'}
                    </button>
                  </div>
                </div>
              )}

              {/* Try Sample Link */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Need a test job description?
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {SAMPLE_JOB_DESCRIPTIONS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      className="b sm g"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => handleLoadSample(sample)}
                    >
                      Try {sample.title.split(' ')[0]} ({sample.workMode || 'Role'})
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <span className="notice-dot" style={{ display: 'inline-block', marginRight: '6px' }} />
              Parsing job description in your browser...
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(179, 38, 30, 0.08)',
                border: '1px solid var(--st-x, #b3261e)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'var(--st-x, #b3261e)',
              }}
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {/* REVIEW PANEL: "Check what we found" */}
          {parsedData && !conflictFields && (
            <div
              className="jd-review-panel"
              style={{
                background: 'var(--surface, #1e1e1e)',
                border: '1px solid var(--line-soft)',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Check what we found
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Review and adjust extracted criteria before applying to your role.
                  </p>
                </div>
                <button
                  type="button"
                  className="b sm g"
                  onClick={handleDiscard}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Discard
                </button>
              </div>

              {/* Title & Location Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Role Title</label>
                  <input
                    type="text"
                    className="form-input sm"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Location (optional)</label>
                  <input
                    type="text"
                    className="form-input sm"
                    placeholder="e.g. London, UK"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Work Mode & Min Years Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Workplace Model (optional)</label>
                  <select
                    className="form-input sm"
                    value={editWorkMode}
                    onChange={(e) => setEditWorkMode(e.target.value)}
                  >
                    <option value="">None specified</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Min Experience (Years, optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="form-input sm"
                    placeholder="e.g. 4"
                    value={editMinYears}
                    onChange={(e) => setEditMinYears(e.target.value)}
                  />
                </div>
              </div>

              {/* Extracted Skills List */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Extracted Skills ({editSkills.length}) · Weights: Must (3x), Should (2x), Nice (1x)
                  </label>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'var(--surface-2)',
                    borderRadius: '6px',
                    border: '1px solid var(--line-soft)',
                  }}
                  data-lenis-prevent
                >
                  {editSkills.map((sk) => (
                    <div
                      key={sk.skillId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '6px 8px',
                        background: 'var(--surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--line-soft)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{sk.name}</strong>
                          {sk.isCustom && (
                            <span className="chip sm" style={{ fontSize: '0.62rem', background: 'var(--surface-2)' }}>
                              Custom
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            className="form-input sm"
                            style={{ width: '96px', padding: '2px 6px', fontSize: '0.74rem' }}
                            value={sk.importance}
                            onChange={(e) => handleSkillImportanceChange(sk.skillId, e.target.value)}
                          >
                            <option value="Must">Must (3x)</option>
                            <option value="Should">Should (2x)</option>
                            <option value="Nice">Nice (1x)</option>
                          </select>

                          <button
                            type="button"
                            className="b sm g"
                            style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                            onClick={() => toggleFoundIn(sk.skillId)}
                            title="View source sentence in JD"
                          >
                            {expandedFoundIn[sk.skillId] ? 'Hide context' : 'Found in...'}
                          </button>

                          <button
                            type="button"
                            className="b sm g"
                            style={{ fontSize: '0.8rem', padding: '2px 6px', color: 'var(--st-x)' }}
                            onClick={() => handleRemoveSkill(sk.skillId)}
                            aria-label={`Remove ${sk.name}`}
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {expandedFoundIn[sk.skillId] && (
                        <div
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--muted)',
                            background: 'var(--surface-2)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            borderLeft: '2px solid var(--accent, #3b82f6)',
                            fontStyle: 'italic',
                          }}
                        >
                          "{sk.foundIn || 'Source sentence not captured'}"
                        </div>
                      )}
                    </div>
                  ))}

                  {editSkills.length === 0 && (
                    <p style={{ margin: '8px 0', fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                      No skills found. Use the input below to add skills manually.
                    </p>
                  )}
                </div>

                {/* Add Skill with Autocomplete */}
                <div style={{ marginTop: '8px', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input sm"
                      placeholder="Add another skill (e.g. Docker, GraphQL, Kubernetes)"
                      value={customSkillInput}
                      onChange={handleCustomSkillChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomSkill()
                        }
                      }}
                    />
                    <select
                      className="form-input sm"
                      style={{ width: '96px', fontSize: '0.74rem' }}
                      value={customSkillImportance}
                      onChange={(e) => setCustomSkillImportance(e.target.value)}
                    >
                      <option value="Must">Must (3x)</option>
                      <option value="Should">Should (2x)</option>
                      <option value="Nice">Nice (1x)</option>
                    </select>
                    <button
                      type="button"
                      className="b sm g"
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      onClick={() => addCustomSkill()}
                    >
                      Add
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {skillSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: '110px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line-soft)',
                        borderRadius: '6px',
                        zIndex: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        marginTop: '4px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                      }}
                    >
                      {skillSuggestions.map((sug) => (
                        <div
                          key={sug.id}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--line-soft)',
                          }}
                          onClick={() => addCustomSkill(sug.name)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <strong>{sug.name}</strong>
                          <span style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>{sug.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cleaned Description (editable) */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                  Cleaned Description (min 40 characters)
                </label>
                <textarea
                  rows="4"
                  className="form-input sm"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
                />
              </div>

              {/* Actions: Use this & Discard */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="b sm g" onClick={handleDiscard}>
                  Discard
                </button>
                <button type="button" className="b sm" onClick={handleInitiateUseThis}>
                  Use this criteria
                </button>
              </div>
            </div>
          )}

          {/* CONFLICT RESOLUTION MODAL / PANEL */}
          {conflictFields && (
            <div
              className="jd-conflict-panel"
              style={{
                background: 'var(--surface, #1e1e1e)',
                border: '1px solid var(--line-soft)',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--ink)' }}>
                Field Content Conflict Review
              </h4>
              <p style={{ margin: '4px 0 16px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                Some role fields already have text. For each field, choose whether to keep your existing content or replace it with the parsed job description.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {conflictFields.map((cf) => (
                  <div
                    key={cf.field}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface-2)',
                      borderRadius: '6px',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <strong style={{ fontSize: '0.82rem', color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                      {cf.label}
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.78rem' }}>
                        <input
                          type="radio"
                          name={`conflict_${cf.field}`}
                          value="replace"
                          checked={cf.choice === 'replace'}
                          onChange={() => handleConflictChoiceChange(cf.field, 'replace')}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--accent, #3b82f6)' }}>Replace with parsed: </span>
                          <span style={{ color: 'var(--ink)' }}>
                            {cf.parsedVal.length > 120 ? `${cf.parsedVal.slice(0, 120)}...` : cf.parsedVal}
                          </span>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.78rem' }}>
                        <input
                          type="radio"
                          name={`conflict_${cf.field}`}
                          value="keep"
                          checked={cf.choice === 'keep'}
                          onChange={() => handleConflictChoiceChange(cf.field, 'keep')}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Keep existing: </span>
                          <span style={{ color: 'var(--ink)' }}>
                            {cf.currentVal.length > 120 ? `${cf.currentVal.slice(0, 120)}...` : cf.currentVal}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="b sm g" onClick={() => setConflictFields(null)}>
                  Back to review
                </button>
                <button type="button" className="b sm" onClick={handleConfirmConflictResolution}>
                  Confirm & Apply Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
