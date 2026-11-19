import {assertEquals,assertRejects} from "@std/assert";
import {commonsCandidates,matchedCandidate,neutralCategoryCandidates,searchListingReference} from "../api-v1-products/lib/listing-cover-search.ts";
import {ServiceUnavailableError} from "../_shared/errors.ts";
function commons(license="CC0",host="upload.wikimedia.org",attribution="false") {
  return {query:{pages:{"42":{pageid:42,title:"File:Fresh apples.png",imageinfo:[{url:`https://${host}/apple.png`,mime:"image/png",width:1024,height:768,extmetadata:{LicenseShortName:{value:license},LicenseUrl:{value:"https://creativecommons.org/publicdomain/zero/1.0/"},AttributionRequired:{value:attribution},Copyrighted:{value:"True"},Artist:{value:"Photographer"},ImageDescription:{value:"<p>Fresh apples in a bowl</p>"}}}]}}}};
}
Deno.test("Commons accepts CC0 without mandatory attribution and retains source provenance",()=>{
  const candidates=commonsCandidates(commons());assertEquals(candidates.length,1);assertEquals(candidates[0].caption,"Fresh apples in a bowl");assertEquals(candidates[0].sourcePageUrl,"https://commons.wikimedia.org/?curid=42");
});
Deno.test("unknown or attribution-requiring licenses and foreign download hosts fail closed",()=>{
  for(const document of [commons("CC BY-SA 4.0"),commons("All rights reserved"),commons("CC0","127.0.0.1"),commons("CC0","example.com"),commons("CC0","upload.wikimedia.org","true")])assertEquals(commonsCandidates(document),[]);
});
Deno.test("AI cannot select an unknown page, low confidence or invalid numeric score",()=>{
  const candidates=commonsCandidates(commons());
  for(const match of [{pageId:99,confidence:1},{pageId:42,confidence:0.79},{pageId:42,confidence:NaN},{pageId:42,confidence:2},{pageId:"42",confidence:1}])assertEquals(matchedCandidate(candidates,match),null);
  assertEquals(matchedCandidate(candidates,{pageId:42,confidence:0.95})?.candidate.pageId,42);
});
Deno.test("AI search uses title plus description, ranks only licensed candidates and never asks for generation",async()=>{
  let ai=0;let searches=0;
  const send=((input:string|URL|Request,init?:RequestInit)=>{
    const url=String(input);
    if(url==="https://api.groq.com/openai/v1/chat/completions"){
      ai++;const body=JSON.parse(init?.body as string);assertEquals(body.messages[1].content.includes("Fresh garden apples"),true);
      assertEquals(new Headers(init?.headers).get("authorization"),"Bearer test-only");
      return Promise.resolve(Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify(ai===1?{query:"fresh apples",fallbackQuery:"apples",categoryOnly:false}:{pageId:42,confidence:0.96})}}]}));
    }
    searches++;assertEquals(new URL(url).hostname,"commons.wikimedia.org");assertEquals(new Headers(init?.headers).has("authorization"),false);assertEquals(init?.redirect,"error");
    return Promise.resolve(Response.json(commons()));
  }) as typeof fetch;
  const result=await searchListingReference({title:"Apples",description:"Fresh garden apples",postType:"food",images:[]},{apiKey:"test-only",fetch:send});
  assertEquals(result.candidate.pageId,42);assertEquals(result.scope,"subject");assertEquals(ai,2);assertEquals(searches,1);
});
Deno.test("AI outage is retryable and cannot become a fabricated cover",async()=>{
  await assertRejects(()=>searchListingReference({title:"Apples",postType:"food",images:[]},{apiKey:"test-only",fetch:(()=>Promise.resolve(new Response("Unavailable",{status:503}))) as typeof fetch}),ServiceUnavailableError);
});

Deno.test("vague food listings cannot silently become specific meals",()=>{
  const base=commonsCandidates(commons())[0];
  const meal={...base,pageId:1,title:"File:Pancakes with honey.jpg",caption:"Pouring honey on pancakes with walnuts"};
  const neutral={...base,pageId:2,title:"File:Groceries in a basket.jpg",caption:"Mixed groceries for food donation"};
  assertEquals(neutralCategoryCandidates([meal,neutral],"food").map((c)=>c.pageId),[2]);
  assertEquals(neutralCategoryCandidates([meal],"wanted"),[]);
});

Deno.test("category fallback rejects a specific meal before AI ranking, even if search returns it",async()=>{
  let ai=0;let searches=0;
  const send=((input:string|URL|Request)=>{
    if(String(input)==="https://api.groq.com/openai/v1/chat/completions"){
      ai++;if(ai>1)throw Error("A specific meal must not reach category ranking");
      return Promise.resolve(Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({query:"food",fallbackQuery:"food basket",categoryOnly:true})}}]}));
    }
    searches++;const document=commons();document.query.pages["42"].title="File:Pancakes with honey.png";document.query.pages["42"].imageinfo[0].extmetadata.ImageDescription.value="Pancakes with honey and walnuts";
    return Promise.resolve(Response.json(document));
  }) as typeof fetch;
  await assertRejects(()=>searchListingReference({title:"Rosa",postType:"food",images:[]},{apiKey:"test-only",fetch:send}),ServiceUnavailableError);
  assertEquals(ai,1);assertEquals(searches,2);
});

Deno.test("neutral food references cannot be another organisation's sign or truck",()=>{
  const base=commonsCandidates(commons())[0];
  assertEquals(neutralCategoryCandidates([{...base,title:"File:Township food pantry truck.png",caption:"Groceries for donation"}],"wanted"),[]);
});
Deno.test("AI provider retry guidance is bounded and preserved",async()=>{
  try {
    await searchListingReference({title:"Apples",postType:"food",images:[]},{apiKey:"test-only",fetch:(()=>Promise.resolve(new Response("limited",{status:429,headers:{"retry-after":"90"}}))) as typeof fetch});
    throw Error("Expected provider rejection");
  } catch(error) {
    assertEquals(error instanceof ServiceUnavailableError,true);
    assertEquals((error as ServiceUnavailableError).retryAfterMs,90_000);
    assertEquals((error as Error).message.includes("429"),true);
  }
});

Deno.test("identical neutral candidates reuse ranking across name-only listings without caching licenses",async()=>{
  let ai=0;let queries=0;let ranks=0;let licensed=true;
  const send=((input:string|URL|Request,init?:RequestInit)=>{
    if(String(input)==="https://api.groq.com/openai/v1/chat/completions"){
      ai++;const body=JSON.parse(init?.body as string);const data=JSON.parse(body.messages[1].content);
      const ranking=Array.isArray(data.candidates);if(ranking)ranks++;else queries++;
      return Promise.resolve(Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify(ranking?{pageId:42,confidence:0.96}:{query:"food basket",fallbackQuery:"groceries",categoryOnly:true})}}]}));
    }
    const document=commons(licensed?"CC0":"CC BY-SA 4.0");document.query.pages["42"].title="File:Mixed vegetables for sharing.png";document.query.pages["42"].imageinfo[0].extmetadata.ImageDescription.value="Assorted mixed vegetables for a community food basket";
    return Promise.resolve(Response.json(document));
  }) as typeof fetch;
  for(const title of ["Test Person Alpha","Test Person Beta"])await searchListingReference({title,postType:"wanted",images:[]},{apiKey:"test-only",fetch:send});
  assertEquals(queries,2);assertEquals(ranks,1);assertEquals(ai,3);
  licensed=false;
  await assertRejects(()=>searchListingReference({title:"Test Person Gamma",postType:"wanted",images:[]},{apiKey:"test-only",fetch:send}),ServiceUnavailableError);
  assertEquals(ranks,1);
});
