import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DATA, L, PIPELINE, SOURCES, STATES, VIEWS, WEIGHTS } from '../data.js'
import { RM } from '../lib.js'
import Seg from './Seg.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

gsap.registerPlugin(ScrollTrigger)

const HERO = 'Every skill on your resume, linked to the file that proves it.'
const ROWS = DATA.A
const FOCUS = Math.max(0, ROWS.findIndex((r) => r.s === 'X'))
const STATE_VAR = { V: 'var(--st-v)', S: 'var(--st-s)', C: 'var(--st-c)', X: 'var(--st-x)' }

/* ---------- Hero ledger: skills resolve from "on the resume" to a state ---------- */
function Ledger() {
  const [resolved, setResolved] = useState(RM ? ROWS.length : 0)
  const [sel, setSel] = useState(RM ? FOCUS : 0)
  const done = resolved >= ROWS.length

  useEffect(() => {
    if (RM) return
    let n = 0
    let id
    const start = setTimeout(() => {
      id = setInterval(() => {
        n += 1
        setResolved(n)
        if (n < ROWS.length) setSel(n)
        if (n >= ROWS.length) {
          clearInterval(id)
          setTimeout(() => setSel(FOCUS), 650)
        }
      }, 640)
    }, 1500)
    return () => {
      clearTimeout(start)
      clearInterval(id)
    }
  }, [])

  const row = ROWS[sel]
  const isDone = sel < resolved

  return (
    <div className="ledger" aria-label="Sample skill passport">
      <div className="ledger-head">
        <span className="ledger-title">Skill passport</span>
        <span className="ledger-sample">Sample candidate</span>
      </div>
      <ul className="ledger-rows">
        {ROWS.map((r, i) => (
          <li key={r.n}>
            <button
              type="button"
              className={`lrow ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => done && setSel(i)}
              onFocus={() => done && setSel(i)}
              onClick={() => done && setSel(i)}
            >
              <span className="lrow-name">{r.n}</span>
              {i < resolved ? (
                <span key={`s${i}`} className={`chip swap ${r.s}`}>{L[r.s]}</span>
              ) : (
                <span className="chip pending">{i === resolved ? 'Checking' : 'On resume'}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="ledger-insp" aria-live="polite">
        <span className="insp-k">{isDone ? `Evidence for ${row.n}` : `${row.n}`}</span>
        <p key={`${sel}-${isDone}`} className="insp-ev m">
          {isDone ? row.ev : 'On the resume. Looking for files that prove it.'}
        </p>
      </div>
    </div>
  )
}

/* ---------- Scoring explorer ---------- */
function Scoring() {
  const [src, setSrc] = useState('code')
  const [quiz, setQuiz] = useState(false)
  const numRef = useRef(null)
  const tween = useRef({ v: 0 })

  const base = SOURCES[src].ceiling
  const bonus = src === 'code' && quiz ? 20 : 0
  const score = base + bonus
  const state = src === 'fork' ? 'X' : score >= 100 ? 'V' : score >= 60 ? 'S' : 'C'

  useEffect(() => {
    const el = numRef.current
    if (!el) return
    if (RM) {
      el.textContent = score
      return
    }
    gsap.to(tween.current, {
      v: score,
      duration: 0.9,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => {
        el.textContent = Math.round(tween.current.v)
      },
    })
  }, [score])

  const pick = (id) => {
    setSrc(id)
    if (id !== 'code') setQuiz(false)
  }

  let eq = '20% from the resume claim, which is the most a resume alone can earn.'
  if (src === 'code') eq = quiz ? '80% code evidence + 20% micro-check = 100%.' : '80% code evidence. The micro-check is the last 20%.'
  if (src === 'fork') eq = '0% evidence. The repository is not the candidate\'s work.'
  let note = SOURCES[src].note
  if (src === 'code') note = quiz ? 'Files exist, authorship is confirmed and the micro-check was passed.' : 'Files exist and the commit history shows who wrote them. One micro-check from Verified.'

  return (
    <div className="score-grid">
      <div>
        <div className="sec-head" data-rv>
          <h2>How a skill earns its state.</h2>
          <p className="lede">Where the evidence comes from sets the ceiling. Try it: switch the source and see how far one skill can go.</p>
        </div>
        <div className="ctl" data-rv>
          <div>
            <span className="ctl-label" id="src-label">Evidence source</span>
            <Seg
              label="Evidence source"
              value={src}
              onChange={pick}
              items={Object.entries(SOURCES).map(([id, s]) => ({ id, label: s.label }))}
            />
          </div>
          <div className="switch-row">
            <button
              type="button"
              role="switch"
              aria-checked={quiz}
              aria-labelledby="quiz-label"
              className="switch"
              disabled={src !== 'code'}
              onClick={() => setQuiz((q) => !q)}
            />
            <div className="switch-text" id="quiz-label">
              <b>Micro-check passed</b>
              <span>{src === 'code' ? 'A short question written from the candidate\'s own code.' : 'Needs code to ask about.'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="meter" data-rv style={{ '--c': STATE_VAR[state] }}>
        <div className="meter-top">
          <div className="meter-num"><span ref={numRef}>{score}</span><small>%</small></div>
          <span key={state} className={`chip lg swap ${state}`}>{L[state]}</span>
        </div>
        <div className="meter-track" role="img" aria-label={`Credibility ${score} percent, ${L[state]}`}>
          <div className="meter-fill" style={{ transform: `scaleX(${base / 100})` }} />
          <div className="meter-quiz" style={{ left: `${base}%`, width: '20%', transform: `scaleX(${bonus ? 1 : 0})` }} />
        </div>
        <div className="meter-marks" aria-hidden="true">
          <span style={{ left: '20%' }}>Claimed</span>
          <span style={{ left: '60%' }}>Supported</span>
          <span style={{ left: '100%' }}>Verified</span>
        </div>
        <p className="meter-eq m">{eq}</p>
        <p className="meter-note">{note}</p>
      </div>
    </div>
  )
}

export default function Home() {
  const root = useRef()
  const [tab, setTab] = useState('Candidate')

  useLayoutEffect(() => {
    let ctx
    try {
      ctx = gsap.context(() => {
        const list = root.current.querySelector('.state-list')
        if (RM) {
          list?.classList.add('in-view')
          return
        }

        // One orchestrated entrance for the hero
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
        tl.from('.hero-w', { yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.05 }, 0.1)
          .from('.hero .lead, .hero-actions, .hero-foot', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.7)
          .from('.ledger', { y: 48, opacity: 0, duration: 1.3 }, 0.35)
          .from('.lrow', { opacity: 0, y: 10, duration: 0.8, stagger: 0.05 }, 0.8)

        // Quiet reveals for the section content below the fold
        gsap.set('[data-rv]', { opacity: 0, y: 26 })
        ScrollTrigger.batch('[data-rv]', {
          start: 'top 90%',
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
        })

        // State weights fill when the list comes into view
        ScrollTrigger.create({ trigger: list, start: 'top 80%', once: true, onEnter: () => list.classList.add('in-view') })

        // Pipeline: the line fills with scroll and the current step lights up
        const steps = gsap.utils.toArray('.pstep')
        const fill = root.current.querySelector('.pipe-line i')
        const mark = () => {
          const y = innerHeight * 0.55
          let active = -1
          steps.forEach((s, i) => {
            if (s.getBoundingClientRect().top < y) active = i
          })
          steps.forEach((s, i) => {
            s.classList.toggle('on', i === active)
            s.classList.toggle('past', i < active)
          })
        }
        ScrollTrigger.create({
          trigger: '.pipe-list',
          start: 'top 60%',
          end: 'bottom 60%',
          onUpdate: (self) => {
            gsap.to(fill, { scaleY: self.progress, duration: 0.5, ease: 'power3.out', overwrite: true })
            mark()
          },
          onRefresh: mark,
        })
      }, root)
    } catch (e) {
      console.error(e)
    }
    return () => ctx && ctx.revert()
  }, [])

  const { user } = useAuth()
  const ctaDestination = !user ? '/login?tab=signup' : user.role === 'recruiter' ? '/recruiter' : '/dashboard'

  const v = VIEWS[tab]

  return (
    <main id="main" ref={root} className="page">
      <section id="top" className="hero">
        <div className="w hero-grid">
          <div>
            <h1 aria-label={HERO}>
              {HERO.split(' ').map((w, i) => (
                <span key={i} aria-hidden="true">
                  <span className="wd"><span className="hero-w">{w}</span></span>{' '}
                </span>
              ))}
            </h1>
            <p className="lead">
              ProofPass checks each skill on a resume against real commits and certificates, then labels it Verified, Supported, Claimed or Contradicted. Recruiters see the evidence behind every label.
            </p>
            <div className="hero-actions">
              <Link className="b" to={ctaDestination}>
                Verify a passport <span className="btn-arrow" aria-hidden="true">-&gt;</span>
              </Link>
              <a className="b g" href="#pipeline">See how it works</a>
            </div>
            <p className="hero-foot">There is no single hire score. Each label stands on its own evidence.</p>
          </div>
          <Ledger />
        </div>
      </section>

      <section id="states" className="sec">
        <div className="w">
          <div className="sec-head" data-rv>
            <h2>Four states for every skill.</h2>
            <p className="lede">Each skill ends in exactly one state, decided by what the evidence shows. The weight is how much the state counts in a role match.</p>
          </div>
          <div className="state-list">
            {STATES.map(([s, t]) => (
              <div className="srow" key={s} data-rv style={{ '--c': STATE_VAR[s] }}>
                <span className={`chip lg ${s}`} style={{ justifySelf: 'start' }}>{L[s]}</span>
                <p>{t}</p>
                <div className="weight">
                  <div className="weight-top"><span>Weight in role match</span><b>{WEIGHTS[s]}%</b></div>
                  <div className="weight-bar"><div className="weight-fill" style={{ '--w': `${WEIGHTS[s]}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="scoring" className="sec">
        <div className="w"><Scoring /></div>
      </section>

      <section id="pipeline" className="sec">
        <div className="w pipe">
          <div className="pipe-side">
            <div className="sec-head" data-rv>
              <h2>A model proposes. Plain code decides.</h2>
              <p className="lede">Eight steps from resume to a sealed passport. Language models only suggest. Every decision comes from files and commit history.</p>
            </div>
            <div className="pipe-key" data-rv>
              <div><span className="by Model">Model</span><span>Suggests, never final</span></div>
              <div><span className="by Code">Code</span><span>Checks and decides</span></div>
              <div><span className="by You">You</span><span>Provide input or answer a question</span></div>
            </div>
          </div>
          <div className="pipe-list">
            <div className="pipe-line" aria-hidden="true"><i /></div>
            <ol>
              {PIPELINE.map((s, i) => (
                <li className="pstep" key={s.h}>
                  <span className="pidx">{i + 1}</span>
                  <h3>{s.h}<span className={`by ${s.by}`}>{s.by}</span></h3>
                  <p>{s.p}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="views" className="sec">
        <div className="w">
          <div className="views-top" data-rv>
            <div className="sec-head">
              <h2>One passport, three views.</h2>
            </div>
            <Seg
              role="tablist"
              label="Passport views"
              value={tab}
              onChange={setTab}
              items={Object.keys(VIEWS).map((k) => ({ id: k, label: k }))}
            />
          </div>
          <div className="vpanel" key={tab} role="tabpanel">
            <div>
              <h3>{v[0]}</h3>
              <p>{v[1]}</p>
            </div>
            <ul>{v[2].map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="cta" className="sec cta">
        <div className="w cta-inner">
          <div data-rv>
            <h2>See the evidence behind every skill.</h2>
            <p>Candidates get a plan. Recruiters get evidence, not a single hire score.</p>
          </div>
          <Link className="b" to={ctaDestination} data-rv>
            Run verification <span className="btn-arrow" aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
