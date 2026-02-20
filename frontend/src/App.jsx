import { useState, useEffect, useRef } from 'react'
import { getToken, loadProfile, saveProfile } from './api'
import { ALLERGENS, INTOLERANCES } from './constants'

const AUTOSAVE_DELAY_MS = 400

function profileFromState(allergies, intolerances) {
  const profile = {
    allergies: ALLERGENS.filter((x) => allergies[x.code]).map((x) => x.code),
    intolerances: INTOLERANCES.filter((x) => intolerances[x.code]).map((x) => x.code),
  }
  console.log('📋 profileFromState:', {
    input: { allergies, intolerances },
    output: profile,
  })
  return profile
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('token') || '')
  const [username, setUsername] = useState('alice')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [allergies, setAllergies] = useState({})
  const [intolerances, setIntolerances] = useState({})
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef(null)
  const pendingSaveRef = useRef(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef(null)

  useEffect(() => {
    if (!avatarMenuOpen) return
    const close = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) setAvatarMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [avatarMenuOpen])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const t = await getToken(username, password)
      sessionStorage.setItem('token', t)
      setToken(t)
    } catch (err) {
      setLoginError(err.message || 'Login failed')
    }
  }

  const loadProfileIntoState = async (t, options = {}) => {
    if (!t) return
    const silent = options.silent
    if (!silent) setLoadError('')
    try {
      const p = await loadProfile(t)
      console.log('🔄 loadProfileIntoState: setting state from loaded profile:', p)
      const a = {}
      ALLERGENS.forEach((x) => (a[x.code] = p.allergies.includes(x.code)))
      const i = {}
      INTOLERANCES.forEach((x) => (i[x.code] = p.intolerances.includes(x.code)))
      const checkedAllergies = Object.entries(a).filter(([_, checked]) => checked).map(([code]) => code)
      const checkedIntolerances = Object.entries(i).filter(([_, checked]) => checked).map(([code]) => code)
      console.log('  State being set:', {
        allergies: a,
        intolerances: i,
        checkedAllergies,
        checkedIntolerances,
      })
      setAllergies(a)
      setIntolerances(i)
    } catch (err) {
      if (err.message && String(err.message).includes('401')) {
        sessionStorage.removeItem('token')
        setToken('')
      }
      if (!silent) setLoadError(err.message || 'Load failed')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Auto-load profile when we have a token (page load or after login)
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    loadProfileIntoState(token)
  }, [token])

  const performSave = async (allergyState, intoleranceState) => {
    if (!token) return
    console.log('💾 PERFORM SAVE:', { allergyState, intoleranceState })
    setSaveStatus('Saving…')
    try {
      const profile = profileFromState(allergyState, intoleranceState)
      await saveProfile(token, profile)
      console.log('✅ Save completed successfully')
      setSaveStatus('Saved')
      pendingSaveRef.current = null
      // Do not refetch here: eventual consistency can return stale data and overwrite the user's correct state
    } catch (err) {
      console.error('❌ Save failed:', err)
      setSaveStatus('Save failed: ' + (err.message || ''))
      pendingSaveRef.current = { allergyState, intoleranceState }
    }
  }

  const scheduleAutosave = (nextAllergies, nextIntolerances) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null
      performSave(nextAllergies, nextIntolerances)
    }, AUTOSAVE_DELAY_MS)
  }

  const toggleAllergy = (code) => {
    const before = allergies[code]
    const after = !before
    const next = { ...allergies, [code]: after }
    console.log('🔘 TOGGLE allergy:', code, { before, after, nextState: next })
    setAllergies(next)
    scheduleAutosave(next, intolerances)
  }
  const toggleIntolerance = (code) => {
    const before = intolerances[code]
    const after = !before
    const next = { ...intolerances, [code]: after }
    console.log('🔘 TOGGLE intolerance:', code, { before, after, nextState: next })
    setIntolerances(next)
    scheduleAutosave(allergies, next)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    setToken('')
    setAvatarMenuOpen(false)
  }

  const navBar = (
    <nav className="nav">
      <h1 className="nav__title">My allergens</h1>
      {token ? (
        <div className="nav__user" ref={avatarMenuRef}>
          <button type="button" className="nav__user-trigger" onClick={() => setAvatarMenuOpen((o) => !o)} aria-expanded={avatarMenuOpen} aria-haspopup="true">
            <img src="/avatar.png" alt="" className="nav__avatar" />
            <span className="nav__username">{username ? username.charAt(0).toUpperCase() + username.slice(1).toLowerCase() : ''}</span>
          </button>
          {avatarMenuOpen && (
            <ul className="nav__dropdown" role="menu">
              <li role="none"><button type="button" role="menuitem" onClick={handleLogout}>Log out</button></li>
            </ul>
          )}
        </div>
      ) : null}
    </nav>
  )

  if (!token) {
    return (
      <>
        {navBar}
        <main className="main">
          <h1>Log in</h1>
          <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit">Log in</button>
        </form>
        {loginError && <p className="error">{loginError}</p>}
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
          Use <strong>alice</strong> / <strong>alice</strong> (Kvasir demo pod). Keycloak must have Direct access grants enabled for kvasir-ui.
        </p>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        {navBar}
        <main className="main">
          <p>Loading your profile…</p>
        </main>
      </>
    )
  }

  return (
    <>
      {navBar}
      <main className="main">
        <p style={{ marginBottom: '1rem' }}>
          <button type="button" onClick={() => loadProfileIntoState(token)}>Refresh</button>
          {saveStatus && <span className={saveStatus.startsWith('Save failed') ? 'error' : 'success'} style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>{saveStatus}</span>}
        </p>
      {loadError && <p className="error">{loadError}</p>}

      <section className="section">
        <h2>Allergies</h2>
        <div className="section__grid">
          {ALLERGENS.map(({ code, name }) => (
            <label key={code}>
              <input
                type="checkbox"
                checked={!!allergies[code]}
                onChange={() => toggleAllergy(code)}
              />
              {name}
            </label>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Intolerances</h2>
        <div className="section__grid">
          {INTOLERANCES.map(({ code, name }) => (
            <label key={code}>
              <input
                type="checkbox"
                checked={!!intolerances[code]}
                onChange={() => toggleIntolerance(code)}
              />
              {name}
            </label>
          ))}
        </div>
      </section>
      </main>
    </>
  )
}
