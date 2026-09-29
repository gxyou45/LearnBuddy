// First-party, code-authored SVGs only. Never accept SVG source from a request.
// The learning canvas has a responsive aspect ratio. Fill its viewport so the
// normalized clue/target positions stay aligned, without SVG letterboxing.
const svg=(body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" preserveAspectRatio="none">${body}</svg>`;
export const huntTemplates=[{
 id:'living-room-v1',title:'温暖的客厅',description:'有窗户、沙发、书架和地毯的客厅，汉字藏在家具旁。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#f5eddd"/>
 <path d="M0 285H600V420H0Z" fill="#d9bd98"/><path d="M0 286H600" stroke="#bfa17d" stroke-width="7"/>
 <rect x="230" y="25" width="140" height="105" rx="12" fill="#acd4d4" stroke="#fffaf0" stroke-width="10"/>
 <path d="M300 29V126M236 78H364" stroke="#fffaf0" stroke-width="7"/><circle cx="340" cy="52" r="14" fill="#f3d287"/>
 <path d="M210 22H231V142L211 135ZM369 22H390V135L369 142Z" fill="#bcbd9c"/>
 <rect x="38" y="108" width="92" height="170" rx="8" fill="#b9906c"/><path d="M44 165H124M44 220H124" stroke="#f2dab7" stroke-width="7"/>
 <path d="M54 122V154M70 119V154M87 125L93 154M55 178V209M73 176V209M94 183V209" stroke="#dce1c2" stroke-width="12"/>
 <rect x="190" y="171" width="225" height="102" rx="25" fill="#91ad9a"/><rect x="175" y="218" width="255" height="62" rx="18" fill="#7f9d88"/>
 <rect x="195" y="193" width="57" height="43" rx="12" fill="#edcb9d"/><rect x="349" y="193" width="57" height="43" rx="12" fill="#e5b1a1"/>
 <path d="M195 278V295M409 278V295" stroke="#8d7159" stroke-width="10"/>
 <ellipse cx="301" cy="354" rx="137" ry="44" fill="#e6dbb9"/><ellipse cx="301" cy="354" rx="109" ry="29" fill="none" stroke="#c4c6a0" stroke-width="4"/>
 <path d="M501 273V131" stroke="#8b8066" stroke-width="8"/><path d="M465 136L478 83H524L539 136Z" fill="#e7c98b"/>
 <ellipse cx="501" cy="280" rx="30" ry="9" fill="#9e9176"/><path d="M66 371L61 329H108L103 371Z" fill="#bb8d72"/>
 <path d="M85 331V291M84 317Q49 315 58 286Q86 286 84 317M86 309Q115 305 111 280Q86 282 86 309" fill="#8aa984" stroke="#789777" stroke-width="3"/>`),
 slots:[
  {id:'shelf-top',x:18,y:18,clue:'看看书架上方。'},
  {id:'window',x:50,y:18,clue:'看看窗户旁边。'},
  {id:'lamp-top',x:82,y:18,clue:'看看落地灯上方。'},
  {id:'shelf-side',x:18,y:50,clue:'看看书架旁边。'},
  {id:'lamp-side',x:82,y:50,clue:'看看落地灯旁边。'},
  {id:'plant',x:18,y:82,clue:'看看小盆栽旁边。'},
  {id:'rug',x:50,y:82,clue:'看看地毯中间。'},
 ],
},{
 id:'kitchen-v1',title:'明亮的厨房',description:'有水槽、橱柜、碗架和餐桌的厨房，汉字藏在日常物品旁。',
 svg:svg(`<rect width="600" height="420" rx="26" fill="#edf1e5"/>
 <path d="M0 296H600V420H0Z" fill="#dfcdb1"/><path d="M0 296H600" stroke="#bfa88a" stroke-width="7"/>
 <rect x="37" y="30" width="112" height="98" rx="10" fill="#c2d6c6"/><path d="M44 81H142" stroke="#fff8e7" stroke-width="6"/>
 <path d="M57 70V47H76V70M91 70V45H118V70" fill="#e9be8f"/><path d="M59 110H127" stroke="#fff8e7" stroke-width="12" stroke-linecap="round"/>
 <rect x="215" y="30" width="166" height="100" rx="9" fill="#b3d5d8" stroke="#fffaf0" stroke-width="9"/>
 <path d="M299 35V125" stroke="#fffaf0" stroke-width="6"/><path d="M218 110Q266 69 296 112T377 100V125H218Z" fill="#abc5a0"/>
 <rect x="455" y="34" width="100" height="97" rx="8" fill="#d5bb96"/><path d="M505 36V130" stroke="#b99770" stroke-width="4"/><circle cx="493" cy="88" r="4" fill="#856e54"/>
 <rect x="33" y="198" width="525" height="91" rx="7" fill="#9ebcaf"/><path d="M177 208V287M340 208V287M449 208V287" stroke="#7f9e93" stroke-width="4"/>
 <path d="M49 220H75M195 220H221M362 220H388M470 220H496" stroke="#fff3d8" stroke-width="5" stroke-linecap="round"/>
 <rect x="24" y="185" width="544" height="18" rx="6" fill="#e5d1ad"/><ellipse cx="281" cy="183" rx="52" ry="11" fill="#86a5a3"/>
 <path d="M283 178V151Q283 135 300 140Q312 145 309 154" fill="none" stroke="#7d999a" stroke-width="7"/>
 <ellipse cx="110" cy="178" rx="36" ry="9" fill="#d4b08c"/><circle cx="97" cy="166" r="12" fill="#d99179"/><circle cx="122" cy="165" r="13" fill="#d8bc72"/>
 <path d="M484 183V153H518V183Z" fill="#f3ede0"/><path d="M518 157Q543 153 535 172H518" fill="none" stroke="#f3ede0" stroke-width="6"/>
 <ellipse cx="301" cy="337" rx="111" ry="29" fill="#be9672"/><path d="M225 351V397M377 351V397" stroke="#a58262" stroke-width="12"/>
 <ellipse cx="301" cy="333" rx="39" ry="12" fill="#f7eedb"/><path d="M70 365H133M83 363V397M124 363V397" stroke="#9fae8c" stroke-width="10" stroke-linecap="round"/>`),
 slots:[
  {id:'bowl-shelf',x:18,y:18,clue:'看看放碗的架子旁边。'},
  {id:'window',x:50,y:18,clue:'看看厨房的窗户。'},
  {id:'upper-cabinet',x:82,y:18,clue:'看看上方的小橱柜。'},
  {id:'fruit',x:18,y:50,clue:'看看水果盘旁边。'},
  {id:'cup',x:82,y:50,clue:'看看杯子旁边。'},
  {id:'stool',x:18,y:82,clue:'看看小凳子旁边。'},
  {id:'table',x:50,y:82,clue:'看看餐桌中间。'},
 ],
}];
export type HuntTemplate=typeof huntTemplates[number];
export function huntTemplate(id:string):HuntTemplate {
 const template=huntTemplates.find(t=>t.id===id);
 if(!template)throw new Error('未知找字场景模板');
 return template;
}
