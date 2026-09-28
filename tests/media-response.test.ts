import {test,expect} from 'vitest';
import {mediaResponse} from '../apps/api/src/media-response';
test('seekable media handles full, open, suffix and invalid ranges with original privacy headers',async()=>{
 const bytes=Buffer.from('0123456789'),headers={'Cache-Control':'no-store'};
 for(const [range,status,body] of [[undefined,200,'0123456789'],['bytes=2-4',206,'234'],['bytes=8-',206,'89'],['bytes=-3',206,'789'],['bytes=8-999',206,'89'],['bytes=20-',416,''],['bytes=4-2',416,''],['bytes=-0',416,''],['bytes=1-2,4-5',416,'']] as const){
  const response=mediaResponse(bytes,headers,range);
  expect(response.status).toBe(status);expect(await response.text()).toBe(body);
  expect(response.headers.get('Accept-Ranges')).toBe('bytes');expect(response.headers.get('Cache-Control')).toBe('no-store');
 }
 expect(headers).toEqual({'Cache-Control':'no-store'});
});
