import type { ModelChunk } from './anatomy.ts';

/** Static hosts may serve .gz as a compressed response or as a gzip file.
 * Fetch already decodes Content-Encoding; inspect the payload to avoid decoding twice.
 */
export async function decodeModelResponse(response:Response,expectedBytes:number,compressed:boolean):Promise<ArrayBuffer>{
 if(!response.ok)throw new Error('An anatomy file could not be loaded.');
 const payload=await response.arrayBuffer(),signature=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 const gzip=compressed&&signature[0]===0x1f&&signature[1]===0x8b;
 const buffer=gzip?await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():payload;
 if(buffer.byteLength!==expectedBytes)throw new Error('An anatomy file was incomplete. Please reload the viewer.');
 return buffer;
}

export async function downloadModelChunk(chunk:ModelChunk,signal:AbortSignal):Promise<ArrayBuffer>{
 const compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';
 const url=compressed?chunk.gzip!:chunk.url;
 let cache:Cache|undefined;
 if(chunk.streams)try{cache=await caches.open('anatomy-geometry-v1');}catch{/* Storage can be disabled or full. */}
 signal.throwIfAborted();
 const stored=cache?await cache.match(url).catch(()=>undefined):undefined;
 signal.throwIfAborted();
 if(stored){
  try{return await decodePackedResponse(stored,chunk);}catch{await cache?.delete(url).catch(()=>false);}
 }
 const response=await fetch(url,{signal,cache:'force-cache'});
 const copy=cache&&response.ok?response.clone():null;
 const buffer=chunk.streams?await decodePackedResponse(response,chunk):await decodeModelResponse(response,chunk.bytes,compressed);
 signal.throwIfAborted();
 // Cache only validated, content-addressed geometry, so retry can recover from a bad response.
 if(cache&&copy)void cache.put(url,copy).catch(()=>{});
 return buffer;
}

export async function decodePackedResponse(response:Response,chunk:ModelChunk):Promise<ArrayBuffer>{
 if(!chunk.streams)return decodeModelResponse(response,chunk.bytes,!!chunk.gzip);
 const packed=new Uint8Array(await decodeModelResponse(response,chunk.packedBytes!,true));
 const {MeshoptDecoder}=await import('meshoptimizer/decoder');
 await MeshoptDecoder.ready;
 const raw=new Uint8Array(chunk.bytes);
 let cursor=0;
 for(const stream of chunk.streams){
  MeshoptDecoder.decodeGltfBuffer(raw.subarray(stream.offset,stream.offset+stream.count*stream.stride),stream.count,stream.stride,packed.subarray(cursor,cursor+stream.size),stream.mode);
  cursor+=stream.size;
 }
 return raw.buffer;
}
