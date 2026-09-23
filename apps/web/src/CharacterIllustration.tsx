import type { Character } from './content';

/** A directional scene makes 来 distinct from waving hello. */
export function CharacterIllustration({ character }: { character: Character }) {
  if (character.id !== 'lai') return <span aria-hidden="true">{character.icon}</span>;
  return <svg className="character-scene" viewBox="0 0 120 110" role="img" aria-label="一个小朋友沿着小路朝我们走过来，箭头指向面前的位置">
    <rect x="3" y="3" width="114" height="104" rx="19" fill="#eff2e4"/>
    <path d="M50 13h20l25 91H25Z" fill="#e7dcc0"/>
    <path d="M60 13v9" stroke="#c6b58d" strokeWidth="3" strokeDasharray="3 4"/>
    <ellipse cx="60" cy="97" rx="28" ry="7" fill="#c4d3ab"/>
    <path d="m54 65-7 18m18-18 9 15" stroke="#7e9675" strokeWidth="8" strokeLinecap="round"/>
    <path d="m48 83-6 1m33-3 5 2" stroke="#786c59" strokeWidth="5" strokeLinecap="round"/>
    <path d="M47 67V49q0-13 13-13t13 13v18Z" fill="#dda979"/>
    <path d="m47 48-9 13m35-13 9 6" stroke="#ebc4a0" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="60" cy="29" r="13" fill="#efc9a6"/>
    <path d="M47 29q-3-20 14-18 15 1 12 18-9-3-13-10-4 8-13 10" fill="#786555"/>
    <path d="m55 29 1 0m8 0 1 0" stroke="#79604b" strokeWidth="2" strokeLinecap="round"/>
    <path d="M57 35q3 3 6 0" stroke="#bd8b73" strokeWidth="1.5" fill="none"/>
    <path d="M98 48v30m-9-9 9 10 9-10" stroke="#78945d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M51 94h18" stroke="#7f9b63" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}
