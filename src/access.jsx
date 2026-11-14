import { createContext, useContext, useEffect, useState } from 'react'

// Accessibility preferences: signing on by default, captions are always on in the player.
const Ctx = createContext({ sign: true, setSign: () => {} })
export const useAccess = () => useContext(Ctx)

export function AccessProvider({ children }) {
  const [sign, setSign] = useState(() => { try { return localStorage.getItem('dayone.sign') !== 'off' } catch { return true } })
  useEffect(() => { try { localStorage.setItem('dayone.sign', sign ? 'on' : 'off') } catch { /* private mode */ } }, [sign])
  return <Ctx.Provider value={{ sign, setSign }}>{children}</Ctx.Provider>
}
