import {ContentImage} from './ContentImage';

// Presentation-only replacement for the ten immutable, generated v1 backgrounds.
// Keep the published asset hashes and saved round identities unchanged.
const gardenColors:Record<string,string>={
 '4b8d739b0b2d745de36c3ed32920d484b1c3a401a9c9185e909227f18003076c':'#efe3cb',
 'e44a9e7468899babe81c3f5c405be515c4a56edb6ebd4fdf23a1366f2d6454a9':'#dbe8dc',
 'a13748005bd77ca30f3c1f8e359621292cc8acd4440a5021719806a6595742a9':'#daead6',
 'b31c9398801a022cd5cee8e0013037c22944039dbca37e04a06337263cc8f57f':'#dce8ee',
 'b17bbf66a743cc7e61d2f59e001a6ae90579d4645c15f293626382ff89ce49f7':'#f0dfcf',
 'b9e45c2b5f51c58b5f1fc4b98a97357b7106e02de3a4545bfd97648a416e8afa':'#e1e5ed',
 '53fd4b4d34bba339e4fdd29d6f154add28e7a174c891114d1f76ef6a7bbe8746':'#eadfec',
 'da3929860012e40c9e3773a21565e72ed18415649845042793f0ddc5172a0fc5':'#f2e4d8',
 '17f0373766939007f8efea5955e9b5989fcf001951b023e5de86043e9543e478':'#e3eadb',
 '03da428b2de5e6a8255ccc1cdb108938648b79c1f182d3b66d1ad243c8ca3e4f':'#dae9e5',
};
export function isPlainGarden(sha256:string){return Object.hasOwn(gardenColors,sha256);}
export function HuntBackground({id,sha256,alt}:{id:string;sha256:string;alt:string}){
 if(!isPlainGarden(sha256))return <ContentImage id={id} alt={alt} className="hunt-background"/>;
 return <svg className="hunt-background" data-plain-garden="true" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true">
  <rect width="600" height="420" rx="26" fill={gardenColors[sha256]}/>
  <circle cx="525" cy="55" r="25" fill="#edcb7e"/>
  <path d="M0 315Q140 250 290 315T600 300V420H0" fill="#b9cea9"/>
  <path d="M50 310V180M50 250L24 223M50 230L79 202" stroke="#9e8b65" strokeWidth="9"/>
  <circle cx="50" cy="164" r="43" fill="#91b58a"/>
  <path d="M470 320V219H556V320" fill="#faf2d9"/>
  <path d="M452 219L513 167L574 219Z" fill="#c79379"/>
  <path d="M503 320V266Q513 249 526 266V320" fill="#96ac99"/>
 </svg>;
}
