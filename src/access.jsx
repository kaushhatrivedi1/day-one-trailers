import { createContext, useContext, useEffect, useState } from 'react'
import { strings, langInfo } from './i18n.js'

// Viewer preferences: sign language (on by default) and the language for narration and the interface.
const Ctx = createContext({ sign: true, setSign: () => {}, lang: 'en', setLang: () => {}, guest: '', forget: () => {} })
export const useAccess = () => useContext(Ctx)
export const useT = () => strings(useContext(Ctx).lang)

const read = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

export function AccessProvider({ children }) {
  const [sign, setSign] = useState(() => read('dayone.sign', 'on') !== 'off')
  const [lang, setLang] = useState(() => read('dayone.lang', 'en'))
  // Anonymous visitor id for Bolt's memory. "Forget me" switches to a new one.
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/-/g, '')
  const [guest, setGuest] = useState(() => read('dayone.guest', '') || newId())
  useEffect(() => write('dayone.guest', guest), [guest])
  const forget = () => setGuest(newId())
  useEffect(() => write('dayone.sign', sign ? 'on' : 'off'), [sign])
  useEffect(() => {
    write('dayone.lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = langInfo(lang).dir
  }, [lang])
  return <Ctx.Provider value={{ sign, setSign, lang, setLang, guest, forget }}>{children}</Ctx.Provider>
}
