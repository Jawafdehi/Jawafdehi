// SPDX-License-Identifier: Hippocratic-3.0
import { chromium, devices as pw } from "playwright";
const BASE="https://jawafdehi.org";
const b=await chromium.launch();
for (const [route,slug] of [["/team","team"],["/","home"],["/cases","cases"]]) {
  const ctx=await b.newContext({viewport:{width:360,height:640},userAgent:pw["Galaxy S9+"].userAgent,deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:"ne-NP",
    storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:"jawafdehi_analytics_consent",value:"denied"}]}]}});
  const p=await ctx.newPage();
  await p.goto(BASE+route,{waitUntil:"load",timeout:120000});
  // scroll to the bottom so lazy images actually load, as a real reader would
  await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));} });
  await p.waitForTimeout(4000);
  const t=await p.evaluate(()=>{
    const rs=performance.getEntriesByType("resource");
    const nav=performance.getEntriesByType("navigation")[0];
    const by={};let enc=0;
    for(const r of rs){
      const k=/\.(png|jpe?g|gif|webp|avif|svg|ico)(\?|$)/i.test(r.name)?"image":/\.(woff2?|ttf|otf)(\?|$)/i.test(r.name)?"font":/\.(js|mjs)(\?|$)/i.test(r.name)?"js":/\.css(\?|$)/i.test(r.name)?"css":"other";
      by[k]=by[k]||{n:0,enc:0};by[k].n++;by[k].enc+=r.encodedBodySize;enc+=r.encodedBodySize;
    }
    if(nav){by.html={n:1,enc:nav.encodedBodySize};enc+=nav.encodedBodySize;}
    const biggest=rs.map(r=>({u:r.name.replace(location.origin,"").slice(-58),e:r.encodedBodySize})).sort((a,b)=>b.e-a.e).slice(0,6);
    return {by,enc,count:rs.length,biggest};
  });
  console.log(`\n=== ${slug} (fully scrolled, 360x640) total = ${(t.enc/1048576).toFixed(2)} MB across ${t.count} requests`);
  for(const [k,v] of Object.entries(t.by).sort((a,b)=>b[1].enc-a[1].enc)) console.log(`   ${k.padEnd(6)} n=${String(v.n).padStart(3)}  ${(v.enc/1024).toFixed(0).padStart(6)} KB`);
  console.log("   biggest:"); for(const x of t.biggest) console.log(`     ${(x.e/1024).toFixed(0).padStart(6)} KB  ${x.u}`);
  await ctx.close();
}
await b.close();
