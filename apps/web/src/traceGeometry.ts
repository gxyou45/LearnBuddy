export type Point=readonly [number,number];
export function sampleStroke(median:readonly Point[],spacing=12):Point[]{
 const points:Point[]=[];
 for(let i=1;i<median.length;i++){
  const a=median[i-1],b=median[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/spacing));
  for(let j=0;j<n;j++)points.push([a[0]+(b[0]-a[0])*j/n,900-(a[1]+(b[1]-a[1])*j/n)]);
 }
 const end=median.at(-1);if(end)points.push([end[0],900-end[1]]);
 return points;
}
// A bounded forward window prevents endpoint taps, reverse strokes and large jumps
// from completing a stroke. Tolerance is deliberately generous for a child's finger.
export function traceForward(points:readonly Point[],index:number,point:Point){
 if(!points.length)return 0;
 const distance=(i:number)=>Math.hypot(points[i][0]-point[0],points[i][1]-point[1]);
 let best=index;
 for(let i=index;i<=Math.min(points.length-1,index+8);i++)if(distance(i)<distance(best))best=i;
 return distance(best)<=76?best:index;
}
export function canResumeStroke(points:readonly Point[],index:number,point:Point){
 return !!points[index]&&Math.hypot(points[index][0]-point[0],points[index][1]-point[1])<=85;
}
