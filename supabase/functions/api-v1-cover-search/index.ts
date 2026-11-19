/** Authenticated AI-assisted reference-image search and durable Supabase upload. */
import {createAPIHandler,ok} from "../_shared/api-handler.ts";
import {coverSearchSchema,handleCoverSearch} from "./lib/handler.ts";
Deno.serve(createAPIHandler({
  service:"api-v1-cover-search",version:"1.0.0",requireAuth:true,csrf:true,
  rateLimit:{limit:10,windowMs:60_000,keyBy:"user"},
  routes:{
    POST:{schema:coverSearchSchema,handler:handleCoverSearch,requireAuth:true,idempotent:true},
    GET:{requireAuth:false,handler:(ctx)=>Promise.resolve(ok({service:"api-v1-cover-search",status:"healthy",
      source:"wikimedia-commons",imageGeneration:false,aiConfigured:Boolean(Deno.env.get("GROQ_API_KEY"))},ctx))},
  },
}));
