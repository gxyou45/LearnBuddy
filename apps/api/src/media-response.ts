/** Byte ranges let browsers seek without exposing private recordings publicly. */
export function mediaResponse(bytes:Buffer,headers:Record<string,string>,range?:string) {
 headers={...headers,'Accept-Ranges':'bytes'};
 if(range) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  let start=0,end=bytes.length-1;
  if(match&&(match[1]||match[2])) {
   if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   else start=Math.max(0,bytes.length-Number(match[2]));
  }else start=bytes.length;
  if(start>end||start>=bytes.length){headers['Content-Range']=`bytes */${bytes.length}`;return new Response(null,{status:416,headers});}
  headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;headers['Content-Length']=String(end-start+1);
  return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:206,headers});
 }
 headers['Content-Length']=String(bytes.length);
 return new Response(new Uint8Array(bytes),{headers});
}
