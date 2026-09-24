/** Small, explicit meaning-in-context scenes; not inferred by substring/category. */
import {sketches} from './sketches';
const ink='#536650',skin='#ecc6a2',green='#9cb58b',ochre='#dbb97e',blue='#a6c7d0';
const path=(d:string,fill='none',stroke=ink,w=3)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect=(x:number,y:number,w:number,h:number,fill=green,rx=5)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${ink}" stroke-width="2"/>`;
const circle=(x:number,y:number,r:number,fill=skin)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${ink}" stroke-width="2"/>`;
const text=(s:string,x=60,y=55,size=20,color=ink)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}" font-family="sans-serif">${s}</text>`;
const group=(body:string,x=0,y=0,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
const item=(id:string,x:number,y:number,s=.42)=>group(sketches[id],x,y,s);
const arrow=(x:number,y:number,dx=1,dy=0,len=23)=>`<g transform="translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})">${path(`M0 0H${len}m-7-6 7 6-7 6`,'none','#b48752',3)}</g>`;
const check=(x:number,y:number)=>path(`m${x} ${y} 6 6 12-16`,'none','#709557',4);
const cross=(x:number,y:number)=>path(`m${x} ${y} 12 12m0-12-12 12`,'none','#be8373',3);
const heart=(x:number,y:number,s=.5)=>group(path('M0 10Q-20-5-12-15 0-25 0-12 1-25 13-15 20-5 0 10Z','#ce948b'),x,y,s);
const bubble=(s:string,x=76,y=20)=>rect(x-16,y-14,34,26,'#fff5da',9)+path(`m${x-8} ${y+12}-5 7 15-7`,'#fff5da')+text(s,x,y+5,16);
type Pose='stand'|'walk'|'wave'|'reach'|'stop'|'sit'|'jump'|'lift'|'point'|'read';
function human(x:number,y:number,s=1,pose:Pose='stand',color=green,female=false){
 const arms:Record<Pose,string>={stand:'M-10 6-17 24M10 6l17 18',walk:'M-10 6-21 16M10 6l15-9',wave:'M-10 6-19-6-1-16M10 6l17 18',reach:'M-10 6-18 17M10 6l23-4',stop:'M-10 6-17 24M10 6l16-13v-11',sit:'M-10 6-12 24h27',jump:'M-10 6-23-5M10 6l23-11',lift:'M-10 6-18-10M10 6l18-10',point:'M-10 6-16 20M10 6l28-12',read:'M-10 6-16 17 10 6M10 6l16 11-10 6'};
 const legs=pose==='sit'?'M-5 26h22v19m-11-19h15v19':pose==='jump'?'M-5 26-12 39-10-4M5 26l12 13 10-4':pose==='walk'?'M-5 26-16 43M5 26l16 17':'M-5 26v18M5 26v18';
 return group((female?path('M-14-16q-5-24 14-24 20 0 16 29l-4 8H-14Z','#82705a'): '')+circle(0,-22,12)+path('M-12-25q1-17 14-14 12 2 10 14-9 0-13-7-4 6-11 7','#82705a')+path('M-4-21h1m7 0h1','none',ink,2)+path('M-3-15q3 3 6 0','none','#a77d67',1.5)+path('M0-10V0','none',skin,6)+path('M-10 0h20l4 26h-28Z',color)+path(arms[pose],'none',skin,5)+path(legs,'none','#788775',5),x,y,s);
}
const floor=path('M12 93h96','none','#d5d9bd',2);
const book=(x:number,y:number,s=.65)=>group(path('M0 0q13-7 26 0 13-7 26 0v24q-13-7-26 0-13-7-26 0Z','#f5e8bf')+path('M26 0v24'),x,y,s);
const ball=(x:number,y:number,r=9)=>circle(x,y,r,ochre)+path(`M${x-r} ${y}h${r*2}M${x} ${y-r}v${r*2}`,'none','#aa8959',1.5);
const house=(x=56,y=26,s=.55)=>item('roof',x,y,s)+group(rect(24,48,72,43,'#f0dfba')+rect(52,65,18,26,'#b1c2a3'),x,y,s);
const cloud=path('M9 30q-8-15 9-18 4-16 21-10 17-4 20 12 22 2 15 16Z','#d0dfe1');
const rain=group(cloud,12,6,.8)+path('M25 41l-4 8m20-8-4 8m20-8-4 8','none','#75a8be');
const umbrella=(x:number,y:number,s=.8)=>group(path('M-23 0q23-40 46 0Z','#b1c5a1')+path('M0 0v29q-10 13-13 0'),x,y,s);
const two=(pose:Pose='stand')=>human(32,43,.82,pose)+human(88,43,.82,pose,ochre,true)+floor;
const linked=human(33,45,.8,'reach')+human(87,45,.8,'stand',ochre,true)+path('M59 47 73 64','none',skin,5)+floor;
const reading=human(38,42,.9,'read')+book(46,46,.9)+floor;
const table=rect(17,59,87,9,'#d8bc8e')+path('M25 69v23m71-23v23');
const eat=human(54,38,.85,'sit')+table+path('M36 48h38q-3 17-19 17T36 48Z','#acc5b2')+path('M61 19 72 43m-6-24 11 24','none','#9a805c',2)+path('M42 48q10-8 26 0','#faf1d6')+path('M68 44 71 31','none',skin,5);
const jump=human(60,41,.83,'jump',ochre)+path('M37 35Q-2-8 14 57q9 32 46 32t46-32Q122-8 83 35','none','#ba976d')+path('M40 94h40m-41-13-5 7m47-7 5 7','none','#c7cfb8',2);
const approach=(female=false)=>path('M42 15 26 91M94 91 78 15','none','#ddd4b8',2)+human(59,43,.9,'walk',female?'#c3adbb':green,female)+arrow(103,40,0,1,37)+floor;
const backpack=(x:number,y:number,s=1)=>group(rect(10,10,45,53,'#c0cfac',9)+path('M21 10V4h22v6M10 23H4v30h6m45-30h6v30h-6')+rect(17,34,31,20,ochre,5),x,y,s);
const bag=backpack(73,40,.48);
const shelf=item('shelf',64,21,.5);
const arrange=human(31,45,.9,'reach')+shelf+book(49,41,.3)+arrow(53,28,1,0,18)+floor;
const tidy=item('shelf',7,12,.65)+item('cabinet',59,13,.6)+check(79,83);
const calendar=item('calendar-week',8,10,.7);
const queue=human(23,53,.7,'stand')+human(60,53,.7,'stand',ochre)+human(97,53,.7,'stand',blue);
const dots=(n:number,x=15,y=38,color=green)=>Array.from({length:n},(_,i)=>circle(x+i%5*18,y+Math.floor(i/5)*22,6,color)).join('');
const compare=(same=false)=>circle(27,47,16,green)+(same?circle(88,47,16,green):rect(71,31,33,33,ochre,1))+text(same?'=':'≠',58,54,25);
const timeline=path('M12 68h96','none','#b9c8a9')+[23,60,97].map((x,i)=>circle(x,68,7,'#f0e3c5')+text(String(i+1),x,73,12)).join('')+arrow(30,25,1,0,57);
const plan=item('list',55,15,.56)+human(28,47,.88,'point')+floor;
const thinking=human(43,52,.8,'stand')+bubble('?',84,24);
const idea=human(43,52,.8,'stand')+item('lamp',66,0,.45);
const gift=item('jar',48,41,.26)+rect(57,46,21,18,'#d9b587')+path('M68 43v22m-11-13h21');
const give=human(23,45,.8,'reach')+human(98,45,.8,'stand',ochre)+gift+arrow(48,24,1,0,28)+floor;
const fix=book(15,57,1.3)+path('m50 53 7 30m-13-10h21m-24-9h25','none','#bd946d')+check(79,24);
const help=human(30,55,.65,'sit',ochre)+human(90,38,.95,'reach')+path('M76 42 49 62','none',skin,5)+arrow(58,54,0,-1,19)+floor;
const pathForward=path('M18 86q21-36 43-8t42-9','none','#c1b088',7)+human(40,38,.65,'walk')+arrow(71,30,1,0,24);
const box=rect(40,43,39,35,'#e2c99d')+path('M40 43 60 31l19 12M60 31v12');
const personBox=human(17,45,.78,'reach')+box+floor;
const groupWork=human(25,45,.85,'reach')+human(98,45,.85,'stand',ochre)+rect(42,48,37,15,'#b9a07a')+floor;
const promise=two('reach')+path('M53 48h21','none',skin,4)+heart(60,22,.4);
const talk=two('stand')+bubble('…',60,18);
const shield=path('M60 15 91 27v24q-3 30-31 43-28-13-31-43V27Z','#c1d4b0');
const lock=item('lock-dots',43,5,.58)+human(23,56,.7,'stop')+floor;
const photograph=item('art',15,14,.75)+circle(78,71,14,'#efe3c4')+path('M88 82 103 95','none','#aa936b',5);
const inspect=item('page',10,5,.65)+circle(74,60,22,'#f3edda')+path('M91 77 107 93','none','#9c8a67',6)+check(63,61);
const trophy=path('M41 18h38v29q-19 24-38 0Z','#dfc178')+path('M41 23H24q-3 27 22 27m33-27h17q3 27-22 27M60 61v20M43 86h34')+text('★',60,43,16);
const actionCheck=plan+check(76,65);
const leaf=path('M27 66Q32 17 92 20 100 83 27 66Z','#9dbd87')+path('M30 63 82 30');
const flower=item('flower-open',58,28,.56);
const nature=item('river',0,13,.8)+item('forest',50,8,.62)+flower;
const textLines=(ys:number[],x=16,w=85)=>ys.map(y=>path(`M${x} ${y}h${w}`,'none','#87967b',3)).join('');
export const semanticScenes:Record<string,string>={
 'together':linked,'love-you':linked+heart(60,18,.55),'greet':two('wave'),'man-approach':approach(),'woman-approach':approach(true),
 'cat-approach':path('M34 45 35 22 48 34 63 24l5 25Z','#d1b28a')+circle(51,49,22,'#dcc39b')+path('M41 48h2m15 0h2M46 59h10m14 1q26-10 22 12')+arrow(96,53,0,1,30),
 'eat':eat,'jump-rope':jump,'myself':human(60,45,.95,'stand')+path('M78 51 60 37','none',skin,5)+floor,
 'come-home':house(58,18,.55)+human(25,47,.85,'walk')+arrow(43,67,1,0,23)+floor,
 'at-home':house(20,8,.8)+human(64,62,.45,'stand'),
 'nod':human(58,48,.94)+path('M83 13q16 12 0 24')+arrow(89,29,-1,1,10),
 'look':human(32,47,.82,'point')+flower+path('M42 31 80 50','none','#bec8ac',1.5),
 'fish-present':item('lake',6,28,.84)+path('M47 65q14-16 28 0-14 16-28 0Zm28 0 11-9v18Z',ochre),
 'sit':item('desk',62,49,.35)+human(45,44,.86,'sit')+rect(22,69,49,6,ochre)+path('M28 75v17m36-17v17'),
 'stand-up':human(60,41,.9)+arrow(97,79,0,-1,39)+floor,
 'park':human(28,44,.87,'walk')+item('forest',53,16,.59)+arrow(49,74,1,0,24),
 'we':human(25,53,.65)+human(59,49,.72,'stand',ochre)+human(96,53,.65,'stand',blue)+path('M12 87q48 13 96 0'),
 'here':human(32,43,.9,'point')+circle(67,76,7,ochre)+arrow(67,44,0,1,18),
 'there':human(20,51,.72,'point')+house(80,12,.3)+arrow(52,26,1,0,34),
 'where':thinking+house(70,44,.2),
 'who':human(38,53,.76)+bubble('?',82,20)+circle(87,60,12,'#dbe1cf'),
 'what':box+bubble('?',94,20),
 'learn':reading+item('lamp',75,0,.3),
 'class':human(25,25,.55,'point')+item('blackboard',46,0,.55)+human(35,69,.42,'sit',ochre)+human(76,69,.42,'sit',blue),
 'call-me':human(30,48,.84,'wave')+bubble('…',72,21)+arrow(80,62,-1,0,25),
 'answer':talk+arrow(76,41,-1,0,27),
 'play':human(25,42,.9,'reach')+human(90,42,.85,'reach',ochre)+ball(62,64,13)+floor,
 'make-way':human(40,45,.85)+human(91,32,.55,'walk',ochre)+arrow(47,80,-1,0,29)+path('M77 15 60 93h54L99 15Z','none','#ddd8c1',1.5),
 'wait':human(29,48,.85,'stop')+item('clock',62,23,.47)+floor,
 'please-sit':human(28,44,.9,'point')+item('desk',62,45,.4)+rect(69,67,27,6,ochre)+path('M72 74v14m21-14v14'),
 'thanks':human(30,44,.87,'read')+human(94,44,.87,'stand',ochre)+heart(62,23,.47),
 'sorry':two('stand')+path('M51 19q11 11 22 0','none','#bf9c80')+heart(61,64,.38),
 'awake':item('quilt',13,37,.66)+human(58,43,.75,'lift')+item('sunlight',76,0,.31),
 'none':item('empty',7,9,.85)+cross(48,45),
 'clean':path('M39 20 20 32l10 19 10-5v38h40V46l10 5 10-19-19-12q-21 16-42 0Z','#d6e0c7')+text('✦',93,22,24)+text('✧',22,74,22),
 'toilet':item('door',6,12,.58)+human(89,43,.85,'walk')+arrow(77,68,-1,0,26),
 'arrange':arrange,'take':human(30,45,.88,'reach')+book(76,50,.46)+arrow(75,30,-1,0,24)+floor,
 'bring':human(54,44,.9,'walk')+bag+floor,
 'found':human(27,47,.86,'point')+ball(87,64,12)+check(82,26)+floor,
 'front':human(60,27,.45,'stand','#d3d9c6')+human(60,56,.7)+arrow(86,55,-1,0,17),
 'behind':human(60,27,.45,'stand',ochre)+human(60,56,.7,'stand','#d3d9c6')+arrow(90,22,-1,0,15),
 'first':timeline+circle(23,68,10,ochre)+text('1',23,73,12),
 'once':ball(36,56,15)+text('1',84,63,27)+path('M15 84h90'),
 'safe':shield+group(human(60,46,.65),21,14,.65),
 'danger':path('M60 12 108 85H12Z','#edd6a3')+text('!',60,71,44),
 'hurt':human(59,45,.9)+path('m38 66-9-6m6 14-13 1m13 8-9 8','none','#c9896e')+circle(50,70,5,'#d4a086'),
 'help':help,'tell':talk,'bright':item('room',5,8,.85)+item('sunlight',60,17,.33),
 'grow':human(30,62,.43)+arrow(49,54,1,0,20)+human(96,37,.98)+floor,
 'life':item('seed',1,30,.35)+arrow(31,47,1,0,16)+item('flower-open',53,10,.64),
 'protect':shield+group(human(60,45,.8),14,14,.75),
 'roadside':item('road',40,18,.65)+human(22,46,.8)+floor,
 'cross-road':item('crosswalk',14,23,.8)+group(linked,28,0,.65),
 'ride':rect(15,34,91,42,blue,8)+circle(33,80,8,'#929e8b')+circle(90,80,8,'#929e8b')+rect(25,40,30,24,'#f5ebd2')+human(42,50,.36,'sit')+rect(67,41,27,19,'#f5ebd2'),
 'out':item('door',8,8,.72)+human(91,48,.8,'walk')+arrow(45,70,1,0,35),
 'in':item('door',66,29,.45)+human(27,48,.8,'walk')+arrow(45,70,1,0,30),
 'far':human(24,52,.75)+house(82,6,.28)+path('M37 89 91 49','none','#baac8b',3),
 'near':human(28,48,.85)+house(58,25,.55)+path('M38 90h27','none','#baac8b',3),
 'beside':human(36,47,.86)+item('forest',66,24,.48)+path('M53 83h23','none','#baac8b',3),
 'turn':human(59,44,.9,'walk')+path('M90 67q22-51-23-51')+arrow(73,16,-1,0,12),
 'market':item('shop',0,25,.6)+item('shop',51,25,.6)+dots(4,31,65),
 'sell':human(83,27,.6,'reach')+rect(13,58,95,24,ochre)+dots(4,24,51)+arrow(57,21,-1,0,23),
 'pay':human(23,41,.85,'reach')+human(98,41,.85,'stand',ochre)+circle(63,42,10,'#e4c87d')+text('¥',63,47,13)+arrow(46,20,1,0,26),
 'goods':rect(12,19,96,70,'#eee6cd')+path('M12 54h96')+item('jar',19,24,.27)+item('bottle',65,21,.3)+book(24,70,.48),
 'restaurant':table+human(37,38,.75,'sit')+human(92,38,.75,'sit',ochre)+item('cup',44,32,.28),
 'guest':item('door',66,29,.45)+human(28,45,.85,'wave')+human(84,52,.52,'stand',ochre),
 'neighbours':house(0,21,.53)+house(57,21,.53)+human(45,63,.38)+human(74,63,.38,'wave',ochre),
 'home-area':house(2,21,.55)+house(60,21,.55)+item('forest',38,49,.45),
 'rescue':help+rect(7,5,22,18,'#faf5e3')+path('M18 8v12m-6-6h12','none','#91ae7e'),
 'team':queue+[24,60,96].map(x=>circle(x,60,3,ochre)).join(''),
 'travel':human(31,43,.88,'walk')+backpack(65,41,.65)+house(78,1,.28)+arrow(48,22,1,0,28),
 'hometown':house(12,10,.8)+heart(60,27,.45),
 'sign':rect(21,11,78,52,'#e6e9d6')+text('!',60,50,35)+path('M60 64v28'),
 'volunteer':help+heart(18,17,.4),
 'rules':item('list',12,4,.9)+check(76,78),
 'relatives':group(human(29,40,1),0,2,.8)+human(66,39,.94,'stand',ochre,true)+human(99,62,.52,'stand',blue)+floor,
 'older-brother':siblings(false,false),'older-sister':siblings(true,false),'younger-brother':siblings(false,true),'younger-sister':siblings(true,true),
 'uncle':human(35,37,1)+human(91,60,.55)+path('M20 16q15-10 30 0')+floor,
 'aunt':human(35,37,1,'stand',ochre,true)+human(91,60,.55)+floor,
 'sound':human(34,46,.82)+path('M54 27q10 8 0 16m10-24q18 16 0 33m10-40q25 22 0 46','none','#a1b58e'),
 'grain':item('millet',7,6,.67)+item('rice',48,35,.57),
 'full-tummy':human(57,41,.9,'read')+path('M42 60q15 12 30 0','none','#c4a779')+check(87,28),
 'waste':item('rice',3,26,.55)+arrow(56,56,1,0,17)+rect(80,36,26,43,'#c6cbb9')+path('M77 32h32')+cross(50,12),
 'tidy':tidy,'soft':item('pillow',8,24,.75)+path('M57 12v26m-8-7 8 9 8-9','none','#b58b67')+path('M32 71q18-11 36 0','none','#91a578'),
 'hard':rect(23,33,65,43,'#c0b798')+path('M56 10v20m-8-7 8 9 8-9')+text('✦',94,29,18),
 'thick':path('M41 17 20 30 10 64l18 7 10-28v46h44V43l10 28 18-7-10-34-21-13-19 10Z','#bdceb0')+path('M60 27v60M40 43h40M40 58h40M40 73h40')+path('M44 16q16-14 32 0','none','#d9c9a2',9),
 'gentle':human(25,42,.85,'reach')+book(56,54,.78)+path('M66 40q16-6 30 0','none','#c4d3b8',1.5),
 'broken':item('torn',12,7,.85),
 'old':book(22,26,1.5)+path('m36 32 7 4m45 16-6 6m-37 17 9-4','none','#bea378',2),
 'number':rect(18,22,84,57,'#f2e4bd')+text('123',60,61,28),
 'long-time':item('clock',4,15,.7)+path('M94 22v55m-8-10 8 10 8-10')+text('…',95,87,16),
 'how-many':dots(4,22,49)+bubble('?',87,18),
 'less':dots(4,13,34)+arrow(49,47,0,1,19)+dots(2,42,82),
 'every-day':calendar+check(25,52)+check(45,52)+check(63,52),
 'each':human(25,36,.65)+human(89,36,.65,'stand',ochre)+ball(24,76)+ball(89,76),
 'total':dots(2,16,29)+text('+',60,34)+dots(1,95,29)+arrow(60,45,0,1,13)+dots(3,42,79),
 'one-bird':path('M35 54q0-26 31-17 21 13 0 32-29 6-31-15Z',blue)+path('m35 52-17-10 3 23m45-23 13 7-13 3','#d0b276')+circle(60,44,2,ink)+path('M46 67v15h-7m21-15v15h7M45 48q7 15 16 3')+text('1',94,75,23),
 'one-sheet':item('page',15,10,.83)+text('1',94,77,23),
 'one-strip':path('M18 53q20-30 40 0t40 0','none','#b99e72',6)+text('1',91,83,22),
 'one-leaf':leaf+text('1',98,84,22),
 'one-block':box+text('1',94,81,22),
 'lower-head':path('M44 40h24l8 34H41Z',green)+path('M47 75v17m20-17v17M48 45 38 65m30-20 15 20','none',skin,5)+group(circle(0,0,13)+path('M-12-3q8-21 24-4','none','#82705a',7)+path('M4 3h1m4 4h1'),62,29)+arrow(97,18,0,1,25),
 'flat':path('M13 68 45 31h64L77 68Z','#d9c295')+path('M13 68v8h64v-8M77 76l32-37v-8'),
 'same':compare(true),'different':compare(),'similar':circle(29,49,17,green)+circle(87,49,19,'#b4c9a5')+text('≈',59,55,21),
 'order':timeline,'last':timeline+circle(97,68,10,ochre)+text('3',97,73,12),
 'compare':item('scale',15,4,.84),'enough':human(25,38,.65)+human(89,38,.65,'stand',ochre)+ball(25,76)+ball(89,76)+check(51,60),
 'experiment':human(24,45,.86,'point')+item('cup',69,31,.38)+path('M74 7h15l-5 29-10 2Z','#efe6ce')+arrow(64,19,0,1,16),
 'change':item('seed',3,30,.3)+arrow(34,44,1,0,19)+item('flower-open',62,6,.8),
 'push':personBox+arrow(47,18,1,0,30),
 'save':path('M16 29h56v17H60V34H16Z','#b4c5c3')+path('M44 12v16m-14-16h29')+path('M66 56q-11 15 0 17 11-2 0-17Z','#8bbbc8')+human(96,49,.65,'reach')+arrow(44,69,0,-1,18)+check(79,86),
 'use':human(28,46,.86,'read')+book(53,47,.8)+floor,
 'story':reading+bubble('…',96,18),
 'long-ago':item('clock',3,12,.65)+arrow(99,37,-1,0,24)+house(63,46,.4),
 'one-house':house(11,11,.87)+text('1',97,88,22),
 'like':human(58,46,.93,'read')+heart(93,23,.5)+floor,
 'welcome':human(28,43,.85,'wave')+human(95,43,.85,'walk',ochre)+arrow(67,74,-1,0,19)+floor,
 'comfort':human(34,52,.68,'sit',ochre)+human(85,41,.96,'reach')+heart(57,23,.48),
 'brave':human(43,39,.9,'walk')+rect(65,76,19,12,ochre)+rect(84,61,20,27,ochre)+arrow(71,50,1,-1,24),
 'try':item('blocks',54,24,.62)+human(22,48,.82,'reach')+arrow(45,24,1,0,24),
 'lost':human(60,56,.75)+path('M59 87V73M12 74l34-30-23-27m39 57 33-30-1-22','none','#c2b18b',5)+bubble('?',91,16),
 'missing':rect(20,38,80,42,'#f2e8cd')+path('M44 49h33v20H44Z','none','#b4b99f',1)+bubble('?',81,18),
 'search':photograph,'chase':human(27,49,.8,'walk')+human(89,35,.65,'walk',ochre)+arrow(47,78,1,0,31),
 'escape':human(81,39,.93,'walk')+arrow(29,70,1,0,29)+path('M12 24h30m-27 10h20','none','#c3bfa5'),
 'because':rain+arrow(57,54,1,0,18)+umbrella(94,69,.64),
 'therefore':rain+arrow(57,54,1,0,18)+umbrella(94,69,.64)+check(85,88),
 'idea':idea,'method':plan,'work-together':groupWork,'work':arrange,
 'result':item('blocks',6,23,.56)+arrow(65,52,1,0,18)+check(87,50),
 'things':ball(24,66,12)+book(50,27,.85)+item('cup',63,54,.35),
 'give':give,'catch':`<g transform="translate(166 0) scale(-1 1)">${human(83,45,.9,'reach')}</g>`+ball(39,33,11)+arrow(34,57,1,0,28)+floor,
 'truth':human(27,46,.83,'point')+item('cup',61,42,.45)+check(81,17),
 'false':human(26,47,.85)+bubble('…',78,20)+cross(68,58),
 'real-or-fake':circle(28,47,15,ochre)+circle(89,47,15,'#f4ead1')+check(15,76)+cross(82,74),
 'kind':give+heart(60,12,.32),
 'wrong':item('blocks',15,8,.75)+cross(81,20),'correct':cross(14,37)+arrow(42,48,1,0,25)+check(83,49),
 'admit':human(33,47,.85,'point')+item('cup',62,48,.42)+bubble('…',76,21),
 'forgive':promise+check(78,10),
 'difficult':human(25,51,.78,'reach')+rect(59,25,42,65,ochre)+bubble('?',31,16),
 'persist':timeline+human(60,44,.6,'walk')+check(90,19),
 'effort':human(27,44,.9,'reach')+box+path('M44 11l-4 8m-10-9-4 8','none','#79adbb')+arrow(75,82,1,0,25),
 'can':human(40,46,.8,'read')+book(54,38,.73)+check(82,19),
 'talents':human(23,57,.6,'wave')+text('♪',45,32,24)+human(95,57,.6,'read',ochre)+book(68,60,.6),
 'sudden':human(53,49,.84,'stop')+text('!',94,29,30)+path('M10 26h20m-12-9 12 8-12 8','none','#b79a76'),
 'bird-song':path('M17 63q0-26 29-17 22 13 0 32-28 6-29-15Z',blue)+path('m43 48 15 9-15 3',ochre)+path('M29 77v12h-7m19-12v12h7M25 58q8 16 17 4')+circle(44,51,2,ink)+text('♪',80,37,32)+text('♫',100,66,21),
 'climb':item('forest',44,8,.6)+human(56,46,.7,'lift')+arrow(28,72,0,-1,31),
 'crawl-in':item('cave',53,28,.59)+human(24,46,.75,'reach')+arrow(50,73,1,0,25),
 'shelter':rain+human(78,51,.7)+umbrella(80,24,.8)+floor,
 'hide':item('forest',19,8,.83)+circle(74,70,10,skin)+path('M70 69h1m6 0h1'),
 'roll':ball(81,64,20)+path('M15 67h23m-18-10h17')+arrow(46,33,1,0,30)+floor,
 'beautiful':nature,'duckling':path('M27 66q5-24 35-6l13-22 17 8q5 39-29 40-31-2-36-20Z','#c7c6b0')+circle(80,32,15,'#c7c6b0')+path('m91 31 17 7-19 4Z',ochre)+circle(83,28,2,ink),
 'curious':photograph+bubble('?',26,18),'strange':thinking+rect(68,51,30,30,'#ddc6a1')+circle(83,66,8,blue),
 'meet':two('wave')+arrow(50,74,1,0,20),
 'leave':two('wave')+arrow(63,75,1,0,31),
 'miss':human(26,42,.85,'wave')+human(98,48,.55,'walk',ochre)+heart(59,35,.55)+floor,
 'want':human(22,49,.86,'point')+bubble('★',78,19)+item('flower-open',69,44,.44),
 'dream':human(31,56,.7,'sit')+bubble('★',86,22)+item('flower-open',66,44,.49),
 'expect':calendar+human(91,59,.61)+heart(91,20,.35),
 'more':dots(2,19,59)+text('+',58,64)+dots(1,95,59)+arrow(93,25,0,1,17),
 'all':dots(5,23,50)+path('M12 66h97m-97 0v-9m97 9v-9')+check(47,82),
 'good':trophy,'pour':item('cup',64,42,.45)+`<g transform="translate(24 2) rotate(35 25 20) scale(.4)">${sketches.cup}</g>`+path('M65 37q17 7 17 22','none','#83b7c8',4),
 'already':item('shelf',16,5,.87)+check(81,73),
 'ask':talk+bubble('?',59,21),'agree':two('wave')+check(50,24),
 'again':human(35,46,.83,'walk')+path('M86 30q27 25-1 46-14 11-31 1')+arrow(67,79,-1,0,12),
 'choose':human(27,46,.86,'point')+circle(82,32,12,blue)+circle(82,72,12,ochre)+check(96,32),
 'feel-cold':human(57,48,.9)+path('M15 21v18m-6-15 12 12m-12 0 12-12','none','#8ab6c5')+path('M38 54h44','none',skin,5),
 'judge':compare()+check(78,81),
 'patient':human(30,47,.85,'read')+item('clock',60,26,.46),
 'focus':reading+path('M16 18h-8v18m100-18h8v18M8 65v18h8m100-18v18h-8','none','#c6ad7c',2),
 'careful':inspect,'features':leaf+circle(71,43,21,'none')+path('M85 60 99 78','none','#a48e66',5),
 'personality':human(27,46,.85,'wave')+human(91,46,.85,'read',ochre)+floor,
 'interest':human(23,57,.6,'read')+book(40,60,.45)+human(92,57,.6,'point',ochre)+item('art',75,3,.34),
 'mood':face('smile',30)+face('sad',90),
 'excited':human(60,41,.95,'lift',ochre)+text('✦',22,24,24)+text('✦',100,34,20)+floor,
 'argue':two('point')+bubble('!',29,12)+bubble('!',93,12),
 'resolve':two('stand')+ball(60,61,10)+arrow(52,28,1,0,18)+check(55,88),
 'persuade':talk+heart(60,57,.4),
 'need':human(29,46,.88,'reach')+item('cup',70,39,.39)+bubble('?',82,17),
 'contact':human(26,49,.78)+human(94,49,.78,'stand',ochre)+path('M42 28q18-17 36 0')+rect(38,28,7,15,blue)+rect(74,28,7,15,blue),
 'touch':human(87,43,.92)+path('M15 43h43l15-5','none',skin,7)+circle(77,38,5,ochre),
 'privacy':lock,'respect':human(27,45,.85,'stop')+human(93,45,.85,'stand',ochre)+path('M60 22v62','none','#c7cdb8',1.5),
 'include':human(24,52,.65)+human(93,52,.65,'stand',ochre)+human(59,41,.85,'stand',blue)+path('M12 87q48 15 96 0'),
 'promise':promise,'responsible':human(29,45,.86,'reach')+item('cup',73,39,.4)+check(73,20),
 'public':queue+item('shelf',38,0,.35),
 'noise':queue+text('!',18,24,18)+text('!',60,20,18)+text('!',99,24,18),
 'start':timeline+arrow(22,44,0,1,13),
 'finish':item('shelf',12,5,.85)+check(81,73),
 'slow':human(51,43,.91,'walk')+path('M79 72h14m-14 8h10','none','#b3bd9e')+floor,
 'repeat':path('M27 32q28-29 59 0m0 38q-29 29-59 0')+arrow(72,27,1,1,17)+arrow(40,75,-1,-1,17)+book(39,39,.8),
 'author':human(29,44,.85,'read')+book(54,48,.88)+path('M78 35 68 61','none','#a68c60',4),
 'edition':book(7,36,.75)+book(68,36,.75)+text('1',28,34,17)+text('2',89,34,17),
 'pause':reading+rect(83,13,6,22,ochre,1)+rect(96,13,6,22,ochre,1),
 'continue':pathForward,'follow':human(25,58,.65,'walk')+human(94,39,.9,'walk',ochre)+arrow(48,75,1,0,20)+floor,
 'setting':nature+human(76,62,.5),
 'footprints':item('paw',1,34,.34)+item('paw',35,12,.34)+item('paw',68,34,.34),
 'evidence':photograph+check(76,16),
 'misunderstand':human(25,47,.84,'point')+bag+book(77,42,.32)+bubble('?',45,16),
 'clear':inspect+check(22,80),
 'future':calendar+arrow(75,62,1,0,29)+item('flower-open',87,13,.23),
 'news':item('page',4,8,.75)+human(92,47,.77,'wave'),
 'plan':plan,'steps':timeline+check(80,17),
 'show-how':human(24,33,.72,'read')+book(5,49,.65)+arrow(52,49,1,0,17)+human(94,37,.72,'read',ochre)+book(78,57,.65),
 'classify':dots(1,21,19)+dots(1,45,19,ochre)+arrow(59,31,0,1,17)+rect(9,60,43,29,'#d0dfbd')+rect(68,60,43,29,'#e9d3ad')+circle(25,75,8,green)+circle(87,75,8,ochre),
 'part':item('list',17,4,.85)+rect(41,28,28,15,'none'),
 'structure':rect(12,30,32,42,green)+rect(75,30,32,42,ochre)+path('M50 27h19v50H50Z','none','#bfcca9',2),
 'combine':rect(12,12,24,24,green)+text('+',50,31)+rect(65,12,24,24,ochre)+arrow(55,43,0,1,16)+rect(32,71,24,24,green)+rect(56,71,24,24,ochre),
 'symbols':text('★',31,41,30)+text('♪',82,40,31)+text('?',57,84,31),
 'words':book(12,27,1.8)+text('喝水',58,57,17),
 'match':rect(9,29,36,35,'#e5eccc')+text('喝',27,53,20)+rect(74,29,36,35,'#e4e2c3')+text('水',92,53,20)+path('M45 47h29'),
 'connect':circle(28,48,18,green)+circle(92,48,18,ochre)+path('M46 48h28'),
 'replace':book(8,36,.7)+arrow(51,48,1,0,22)+book(81,36,.6),
 'share':human(23,43,.85,'reach')+human(98,43,.85,'stand',ochre)+ball(60,53,11)+arrow(45,21,1,0,27)+floor,
 'praise':two('wave')+text('★',60,22,24),
 'grade':house(3,2,.85)+text('学校',51,55,14)+text('1',92,79,25),
 'ready':backpack(17,13,1)+check(79,31)+book(43,25,.5),
 'must':item('helmet',21,12,.72)+check(81,81),
 'cherish':human(60,42,.9,'read')+book(33,55,1.05)+heart(91,23,.4),
 'borrow':give+book(50,42,.65)+path('M46 83q16 10 31 0'),
 'task':actionCheck,'independent':human(59,40,.95,'read')+item('cup',67,44,.4)+check(91,20),
 'healthy':human(59,42,.95,'stand')+heart(60,49,.3)+check(90,19),
 'stretch':human(59,45,.9,'lift')+arrow(20,77,0,-1,29)+arrow(99,77,0,-1,29),
 'record':book(14,38,1.7)+path('M91 12 65 61','none','#a9915f',6),
 'recall':human(27,48,.8,'stand')+bubble('…',81,20)+item('art',60,40,.45),
 'introduce':human(31,45,.88,'wave')+human(96,45,.88,'stand',ochre)+bubble('…',56,15),
 'age':human(28,63,.45)+arrow(44,52,1,0,21)+human(92,43,.9)+text('5',33,25,23),
 'surname':human(34,48,.88)+rect(65,26,42,43,'#f4e7c3')+text('李',86,56,26),
 'bless':give+heart(60,17,.45),
 'happy-family':group(human(29,38,1),0,4,.8)+human(86,40,.92,'stand',ochre,true)+human(59,63,.5)+heart(59,20,.4),
 'country':rect(25,20,66,41,'#c57766',2)+text('★',39,39,16,'#ffe184')+text('★',53,27,6,'#ffe184')+text('★',59,33,6,'#ffe184')+text('★',59,42,6,'#ffe184')+text('★',53,49,6,'#ffe184')+path('M25 13v78')+house(61,63,.3),
 'capital':path('M12 53h96l-12-11H24Z','#caa476')+rect(23,55,75,29,'#cf8f77',1)+path('M45 84V68h16v16m7 0V68h16v16')+text('北京',60,30,17),
 'tradition':human(29,38,1)+human(89,60,.54)+giveHands()+item('dumpling-leaf',54,41,.3),
 'festival':item('dragonboat',1,15,.75)+item('dumpling-leaf',70,51,.4),
 'build':human(20,42,.85,'lift')+item('wall',54,34,.58)+rect(17,11,24,13,ochre),
 'make':human(29,43,.9,'read')+table+item('blocks',63,28,.35),
 'technology':item('machine',13,12,.8)+check(85,80),
 'science':human(24,45,.85,'point')+item('magnet-pull',64,12,.42)+table,
 'environment':nature,'pollution':item('river',4,1,.93)+rect(58,33,28,14,'#999789')+circle(75,61,8,'#a6a185')+cross(87,13),
 'people':queue,'understand':reading+item('lamp',73,0,.37)+check(86,73),
 'display':human(25,44,.87,'point')+item('art',57,20,.52),
 'harvest':item('millet',0,0,.85)+rect(58,53,51,36,'#d2b88d')+dots(3,68,68,ochre),
 'keep':rect(20,42,80,44,'#e2cc9e')+book(40,46,.83)+path('M19 37h82')+heart(61,20,.35),
 'memory':item('art',4,6,.75)+heart(90,27,.42)+item('album',62,51,.4),
};
function face(kind:'smile'|'sad',x:number){return circle(x,48,22,kind==='smile'?'#e4cd8e':'#c4d7d3')+path(`M${x-8} 43h1m14 0h1M${x-8} ${kind==='smile'?55:61}q8 ${kind==='smile'?10:-10} 16 0`,'none',ink,2);}
function siblings(female:boolean,younger:boolean){return human(31,42,.9,'stand',younger?'#d6ddc7':green,female)+human(91,61,.52,'stand',younger?ochre:'#d6ddc7',female)+arrow(younger?66:6,younger?45:15,1,0,12)+floor;}
function giveHands(){return path('M43 47 77 62','none',skin,5);}
