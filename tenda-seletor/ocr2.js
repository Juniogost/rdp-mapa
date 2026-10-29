// Leitura local com RapidOCR (modelos PP-OCRv6 em ONNX) via onnxruntime-web. A foto nao sai do aparelho.
(function(){
const BASE='vendor/rapid/';const SFX=new URLSearchParams(location.search).get('m')==='s'?'':'_t';let det,rec,dict,loading;
const loadScript=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('falha ao carregar '+u));document.head.appendChild(s)});
const MCACHE='iel-rapid-v1'; // modelos ficam no aparelho: 1o download lento, leituras seguintes sem rede
async function getBuf(u,onP,w0,w1){let store=null;try{store=await caches.open(MCACHE)}catch(e){}
  if(store){try{const hit=await store.match(u);if(hit){const b=await hit.arrayBuffer();onP&&onP(w1,b.byteLength,b.byteLength);return b}}catch(e){}}
  const r=await fetch(u);if(!r.ok)throw new Error('modelo '+r.status);const tot=+r.headers.get('content-length')||0;
  if(!r.body){const b=await r.arrayBuffer();onP&&onP(w1,b.byteLength,tot||b.byteLength);return b}
  const rd=r.body.getReader();const parts=[];let got=0;for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;onP&&onP(tot?w0+(w1-w0)*got/tot:w0,got,tot)}
  const out=new Uint8Array(got);let o=0;for(const p of parts){out.set(p,o);o+=p.length}
  if(store){try{await store.put(u,new Response(out.buffer.slice(0)))}catch(e){}}
  onP&&onP(w1,got,tot||got);return out.buffer}
function load(onP){if(loading)return loading;loading=(async()=>{
  await loadScript(BASE+'ort.wasm.min.js');ort.env.wasm.wasmPaths=new URL(BASE,document.baseURI).href;ort.env.wasm.numThreads=1;
  dict=await (await fetch(BASE+'dict'+SFX+'.json')).json();
  const db=await getBuf(BASE+'det'+SFX+'.onnx',onP,0,.3);const rb=await getBuf(BASE+'rec'+SFX+'.onnx',onP,.3,.9);
  det=await ort.InferenceSession.create(db,{executionProviders:['wasm']});rec=await ort.InferenceSession.create(rb,{executionProviders:['wasm']});onP&&onP(1)})();
  loading.catch(()=>{loading=null});return loading}
function toTensor(ctx,w,h){const d=ctx.getImageData(0,0,w,h).data,n=w*h,f=new Float32Array(3*n);
  for(let i=0;i<n;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];f[i]=b/127.5-1;f[n+i]=g/127.5-1;f[2*n+i]=r/127.5-1}return f} // BGR, (x/255-.5)/.5
async function detect(src,maxSide){
  let s=Math.min(1,maxSide/Math.max(src.width,src.height));const minS=Math.min(src.width,src.height)*s;if(minS<640)s=Math.min(s*640/minS,2);
  const w=Math.max(32,Math.round(src.width*s/32)*32),h=Math.max(32,Math.round(src.height*s/32)*32);
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(src,0,0,w,h);
  const t=new ort.Tensor('float32',toTensor(x,w,h),[1,3,h,w]);const o=await det.run({[det.inputNames[0]]:t});const P=o[det.outputNames[0]].data;
  const sx=src.width/w,sy=src.height/h,bin=new Uint8Array(w*h);for(let i=0;i<w*h;i++)bin[i]=P[i]>0.3?1:0;
  const seen=new Uint8Array(w*h),stack=new Int32Array(w*h),boxes=[];
  for(let i0=0;i0<w*h;i0++){if(!bin[i0]||seen[i0])continue;let sp=0,cnt=0,sum=0;const pts=[];stack[sp++]=i0;seen[i0]=1;
    while(sp){const i=stack[--sp],px=i%w,py=(i/w)|0;cnt++;sum+=P[i];pts.push(px,py);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(bin[j]&&!seen[j]){seen[j]=1;stack[sp++]=j}}}
    if(cnt<12||sum/cnt<0.5)continue;
    let mx=0,my=0;const m=pts.length/2;for(let k=0;k<pts.length;k+=2){mx+=pts[k];my+=pts[k+1]}mx/=m;my/=m;
    let sxx=0,syy=0,sxy=0;for(let k=0;k<pts.length;k+=2){const a=pts[k]-mx,b=pts[k+1]-my;sxx+=a*a;syy+=b*b;sxy+=a*b}
    let th=0.5*Math.atan2(2*sxy,sxx-syy);if(Math.abs(th)>Math.PI/4)th=0;const cu=Math.cos(th),su=Math.sin(th);
    let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(let k=0;k<pts.length;k+=2){const a=pts[k]-mx,b=pts[k+1]-my,u=a*cu+b*su,v=-a*su+b*cu;if(u<u0)u0=u;if(u>u1)u1=u;if(v<v0)v0=v;if(v>v1)v1=v}
    let bw=u1-u0+1,bh=v1-v0+1;if(Math.min(bw,bh)<3)continue;const d=bw*bh*1.6/(2*(bw+bh));bw+=2*d;bh+=2*d;
    const cu0=(u0+u1)/2,cv0=(v0+v1)/2,cx=mx+cu0*cu-cv0*su,cy=my+cu0*su+cv0*cu;
    // volta para a escala da imagem original (isotropica na pratica)
    boxes.push({cx:cx*sx,cy:cy*sy,w:bw*sx,h:bh*sy,th})}
  return boxes}
function cropBox(src,b){const W=Math.max(8,Math.round(b.w)),H=Math.max(8,Math.round(b.h));const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);
  x.translate(W/2,H/2);x.rotate(-b.th);x.drawImage(src,-b.cx,-b.cy);return c}
async function recog(crop){const H=48,W=Math.min(1600,Math.max(16,Math.ceil(H*crop.width/crop.height)));const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(crop,0,0,W,H);
  const o=await rec.run({[rec.inputNames[0]]:new ort.Tensor('float32',toTensor(x,W,H),[1,3,H,W])});const r=o[rec.outputNames[0]],T=r.dims[1],C=r.dims[2],D=r.data;
  let s='',last=-1,sc=0,n=0;for(let t=0;t<T;t++){let bi=0,bv=-1e9;const off=t*C;for(let k=0;k<C;k++){const v=D[off+k];if(v>bv){bv=v;bi=k}}if(bi!==0&&bi!==last){s+=dict[bi]||'';sc+=bv;n++}last=bi}
  return {text:s,score:n?sc/n:0}}
async function read(src,opt){opt=opt||{};const t0=performance.now();await load(opt.onLoad);opt.onStage&&opt.onStage('det');
  let boxes=await detect(src,opt.maxSide||1280);boxes.sort((a,b)=>a.cy-b.cy);
  // agrupa em linhas (mesma altura) e ordena por x, como a leitura natural
  const lines=[];for(const b of boxes){const L=lines.find(l=>Math.abs(l.cy-b.cy)<0.4*Math.min(l.h,b.h));if(L){L.items.push(b)}else lines.push({cy:b.cy,h:b.h,items:[b]})}
  const ordered=[];for(const L of lines){L.items.sort((a,b)=>a.cx-b.cx);ordered.push(...L.items)}
  const out=[];let i=0;for(const b of ordered){opt.onStage&&opt.onStage('rec',++i,ordered.length);const crop=cropBox(src,b);const r=await recog(crop);crop.width=crop.height=0;if(r.score>=0.5&&r.text.trim())out.push(r.text.trim())}
  return {text:out.join('\n'),ms:Math.round(performance.now()-t0),boxes:boxes.length}}
window.RapidLocal={read,load};
})();
