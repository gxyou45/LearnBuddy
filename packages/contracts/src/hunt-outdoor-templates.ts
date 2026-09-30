// First-party SVG illustrations. No text, target boxes, scripts or external assets.
// These are draft templates, not an instruction to enable any published course.
const svg=(body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" preserveAspectRatio="none">${body}</svg>`;
export const outdoorHuntTemplates=[{
 id:'pond-v1',title:'安静的池塘',description:'柳树、芦苇和荷叶围着小池塘，小鸭在水边休息。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#eaf1df"/>
 <path d="M0 0H600V155Q450 123 300 162T0 145Z" fill="#dcebed"/>
 <path d="M247 56Q250 32 270 42Q287 16 309 39Q336 35 340 57Z" fill="#fbfaf0"/>
 <path d="M84 177L93 30" stroke="#9b8967" stroke-width="13"/>
 <path d="M25 48Q92 2 165 48M32 63Q30 100 40 132M62 43Q51 107 69 147M114 43Q125 95 109 125M147 59Q167 95 155 119" fill="none" stroke="#93b58a" stroke-width="15" stroke-linecap="round"/>
 <path d="M0 245Q131 195 252 235T600 218V420H0Z" fill="#c1d2a5"/>
 <ellipse cx="313" cy="279" rx="244" ry="107" fill="#b8cec0"/>
 <ellipse cx="313" cy="269" rx="229" ry="99" fill="#acd0d0"/>
 <path d="M157 265H211M279 302H325M369 231H410" stroke="#dcecea" stroke-width="5" stroke-linecap="round"/>
 <path d="M204 216A43 17 0 1 1 202 217L234 208Z" fill="#8faf87"/>
 <path d="M261 198Q239 175 249 168Q264 168 269 183Q278 155 287 170Q295 184 279 199Z" fill="#e2b7ae"/>
 <ellipse cx="358" cy="331" rx="40" ry="15" fill="#86ab86"/>
 <path d="M486 226Q481 142 497 65M508 222Q522 139 529 86M467 211Q448 151 459 104" fill="none" stroke="#7f9e76" stroke-width="5"/>
 <path d="M497 62L493 94M529 82L525 111M459 100L460 126" stroke="#a68c66" stroke-width="10" stroke-linecap="round"/>
 <ellipse cx="476" cy="279" rx="30" ry="16" fill="#edd9a5"/><circle cx="494" cy="259" r="16" fill="#edd9a5"/>
 <path d="M507 257L522 262L506 267Z" fill="#cd9d68"/><circle cx="498" cy="256" r="2.5" fill="#626d55"/>
 <ellipse cx="109" cy="354" rx="34" ry="17" fill="#abae95"/><ellipse cx="63" cy="367" rx="23" ry="12" fill="#bcc0a5"/>`),
 slots:[
  {id:'willow',x:18,y:18,clue:'看看柳树的枝叶旁边。'},
  {id:'cloud',x:50,y:18,clue:'看看白云下方。'},
  {id:'reeds',x:82,y:18,clue:'看看高高的芦苇旁边。'},
  {id:'left-bank',x:18,y:50,clue:'看看池塘左边的岸边。'},
  {id:'duck',x:82,y:50,clue:'看看小鸭上方。'},
  {id:'stones',x:18,y:82,clue:'看看岸边的石头。'},
  {id:'lily',x:50,y:82,clue:'看看下方荷叶旁边。'},
 ],
},{
 id:'pet-yard-v1',title:'友好的宠物小院',description:'小猫、小狗和小鸟住在有树荫、矮篱笆与草地的小院。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#e5eee2"/>
 <path d="M0 215Q140 178 298 217T600 202V420H0Z" fill="#c7d6ae"/>
 <path d="M285 420Q347 349 306 270" fill="none" stroke="#e5d8bb" stroke-width="63"/>
 <path d="M10 163H590M10 200H590" stroke="#e9ddbd" stroke-width="10"/>
 <path d="M35 135V220M85 135V220M135 135V220M185 135V220M415 135V220M465 135V220M515 135V220M565 135V220" stroke="#ddcba6" stroke-width="13" stroke-linecap="round"/>
 <path d="M100 175V65" stroke="#aa9270" stroke-width="17"/><path d="M52 89Q8 53 57 33Q93 1 125 30Q180 26 160 80Q125 114 52 89Z" fill="#95b294"/>
 <path d="M258 81H338" stroke="#a28e6d" stroke-width="7" stroke-linecap="round"/><ellipse cx="301" cy="64" rx="17" ry="12" fill="#a3b8c3"/><circle cx="314" cy="54" r="10" fill="#a3b8c3"/><path d="M322 52L334 58L321 61Z" fill="#c5a275"/>
 <path d="M448 128V78L489 45L533 78V128Z" fill="#ddc19b"/><path d="M438 81L489 36L544 81" fill="none" stroke="#b48d74" stroke-width="12" stroke-linecap="round"/><path d="M475 128V103A15 15 0 0 1 505 103V128" fill="#927f69"/>
 <ellipse cx="106" cy="235" rx="25" ry="31" fill="#d4b087"/><path d="M83 211L82 182L102 195L125 181L129 214Z" fill="#d4b087"/><circle cx="96" cy="211" r="3" fill="#67715c"/><circle cx="116" cy="211" r="3" fill="#67715c"/><path d="M126 250Q167 266 151 231" fill="none" stroke="#d4b087" stroke-width="12" stroke-linecap="round"/>
 <ellipse cx="496" cy="243" rx="33" ry="24" fill="#f0e3c7"/><circle cx="497" cy="210" r="24" fill="#f0e3c7"/><ellipse cx="473" cy="212" rx="10" ry="22" fill="#b29b7e"/><ellipse cx="521" cy="212" rx="10" ry="22" fill="#b29b7e"/><circle cx="489" cy="207" r="3" fill="#626c55"/><circle cx="505" cy="207" r="3" fill="#626c55"/><ellipse cx="497" cy="219" rx="5" ry="4" fill="#8b806a"/>
 <circle cx="106" cy="347" r="25" fill="#d7b494"/><path d="M86 332Q116 344 118 368M84 360Q101 335 128 337" fill="none" stroke="#f0dec0" stroke-width="5"/>
 <ellipse cx="308" cy="347" rx="38" ry="11" fill="#8eaaa6"/><path d="M270 347Q273 380 308 380Q343 380 346 347Z" fill="#aac6bf"/>
 <path d="M455 365L474 342L488 370M514 369L532 340L545 369" fill="none" stroke="#95b18a" stroke-width="5"/>`),
 slots:[
  {id:'tree',x:18,y:18,clue:'看看小院的树荫。'},
  {id:'bird',x:50,y:18,clue:'看看小鸟旁边。'},
  {id:'doghouse',x:82,y:18,clue:'看看小狗的屋子。'},
  {id:'cat',x:18,y:50,clue:'看看小猫旁边。'},
  {id:'dog',x:82,y:50,clue:'看看小狗旁边。'},
  {id:'ball',x:18,y:82,clue:'看看草地上的小球。'},
  {id:'bowl',x:50,y:82,clue:'看看小水碗旁边。'},
 ],
},{
 id:'garden-v1',title:'轻轻开花的花园',description:'花朵、蝴蝶、浇水壶和小花盆围着花园小路。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#edf1df"/>
 <path d="M0 196Q160 142 305 199T600 174V420H0Z" fill="#c8d5aa"/>
 <path d="M206 420Q340 342 278 229Q256 186 308 166" fill="none" stroke="#e5d6b5" stroke-width="58"/>
 <path d="M100 150V65M76 142L64 108M116 138L134 100" fill="none" stroke="#87a27c" stroke-width="6"/>
 <g fill="#dfb0a3"><circle cx="88" cy="57" r="17"/><circle cx="110" cy="57" r="17"/><circle cx="100" cy="78" r="17"/></g><circle cx="99" cy="61" r="10" fill="#e9d298"/>
 <path d="M298 74Q260 20 258 62Q263 94 298 84Q336 22 340 60Q336 94 303 84Z" fill="#d7c6a0"/><path d="M300 66V91" stroke="#948d70" stroke-width="5" stroke-linecap="round"/>
 <path d="M490 147V65" stroke="#8da780" stroke-width="6"/><g fill="#c7b5c6"><circle cx="473" cy="64" r="17"/><circle cx="494" cy="47" r="17"/><circle cx="512" cy="66" r="17"/><circle cx="492" cy="80" r="17"/></g><circle cx="493" cy="65" r="10" fill="#f0d89a"/>
 <path d="M55 244Q39 186 82 191Q128 174 146 218Q126 255 55 244Z" fill="#96b38b"/><circle cx="75" cy="213" r="8" fill="#e7c293"/><circle cx="116" cy="218" r="8" fill="#e3b3a6"/>
 <path d="M455 217H516V259H455Z" fill="#9db9b3"/><path d="M516 228L555 209L560 223L516 246" fill="#9db9b3"/><path d="M455 222Q425 207 433 238L455 244" fill="none" stroke="#9db9b3" stroke-width="8"/>
 <path d="M75 333H143L134 381H84Z" fill="#bd967c"/><path d="M108 333V292M107 318Q68 310 81 286Q107 287 107 318M109 309Q140 301 140 276Q113 275 109 309" fill="#8dac85" stroke="#7f9d79" stroke-width="3"/>
 <path d="M262 361Q286 328 309 356Q330 340 350 366Z" fill="#aaa88d"/><circle cx="455" cy="350" r="17" fill="#d5b57f"/><path d="M447 350Q455 335 467 350Q460 365 447 357" fill="none" stroke="#ad906c" stroke-width="3"/><path d="M461 368H494L493 358" fill="none" stroke="#91a380" stroke-width="7" stroke-linecap="round"/>`),
 slots:[
  {id:'pink-flower',x:18,y:18,clue:'看看粉色花朵旁边。'},
  {id:'butterfly',x:50,y:18,clue:'看看蝴蝶旁边。'},
  {id:'purple-flower',x:82,y:18,clue:'看看紫色花朵旁边。'},
  {id:'flower-bed',x:18,y:50,clue:'看看左边的小花丛。'},
  {id:'watering-can',x:82,y:50,clue:'看看浇水壶旁边。'},
  {id:'flower-pot',x:18,y:82,clue:'看看小花盆旁边。'},
  {id:'path-stones',x:50,y:82,clue:'看看小路旁的石头。'},
 ],
},{
 id:'picnic-v1',title:'树荫下的野餐',description:'树荫下铺着野餐垫，篮子、水壶和水果安静地放在草地上。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#e9efdc"/>
 <path d="M0 0H600V154Q468 115 326 161T0 147Z" fill="#dfeceb"/>
 <path d="M0 233Q136 164 310 215T600 206V420H0Z" fill="#c5d3a7"/>
 <path d="M93 200L102 50" stroke="#a08c69" stroke-width="17"/><path d="M29 96Q2 54 47 38Q59 7 108 22Q166 3 178 56Q199 96 153 110Z" fill="#96b28a"/>
 <path d="M257 75Q263 44 282 50Q299 25 320 49Q347 45 354 77Z" fill="#faf9ed"/>
 <path d="M477 42L515 70L484 106L447 75Z" fill="#d7b397"/><path d="M482 102Q525 121 487 151Q471 162 492 181" fill="none" stroke="#afad85" stroke-width="3"/>
 <path d="M169 273L389 258L442 373L194 391Z" fill="#e6d6af"/><path d="M220 270L243 386M277 267L307 381M334 262L373 377M181 308L410 299M189 352L428 339" stroke="#c4c4a3" stroke-width="9"/>
 <path d="M66 203H144L132 258H79Z" fill="#be9a70"/><path d="M77 203Q101 156 134 203" fill="none" stroke="#a98865" stroke-width="8"/><path d="M80 217H132M84 235H128" stroke="#d8bd92" stroke-width="5"/>
 <rect x="476" y="184" width="40" height="78" rx="12" fill="#9fbcb5"/><rect x="483" y="174" width="25" height="15" rx="5" fill="#8ba49d"/><path d="M516 198Q538 202 527 230H516" fill="none" stroke="#9fbcb5" stroke-width="7"/>
 <ellipse cx="102" cy="349" rx="46" ry="16" fill="#f5eed9"/><circle cx="88" cy="339" r="15" fill="#ce9d85"/><circle cx="117" cy="341" r="14" fill="#d6bc79"/><path d="M88 325L91 316" stroke="#8d9d76" stroke-width="4"/>
 <ellipse cx="303" cy="345" rx="40" ry="13" fill="#f7efd9"/><path d="M282 342L307 315L326 344Z" fill="#d2ac79"/><path d="M286 340L307 321L321 342" fill="none" stroke="#aebb83" stroke-width="5"/>
 <path d="M494 365V334M479 349L494 362L511 340" fill="none" stroke="#91ab7d" stroke-width="5" stroke-linecap="round"/>`),
 slots:[
  {id:'shade',x:18,y:18,clue:'看看大树的树荫。'},
  {id:'cloud',x:50,y:18,clue:'看看白云旁边。'},
  {id:'kite',x:82,y:18,clue:'看看风筝旁边。'},
  {id:'basket',x:18,y:50,clue:'看看野餐篮旁边。'},
  {id:'bottle',x:82,y:50,clue:'看看水壶旁边。'},
  {id:'fruit',x:18,y:82,clue:'看看水果盘旁边。'},
  {id:'mat',x:50,y:82,clue:'看看野餐垫上的小盘子。'},
 ],
}];
