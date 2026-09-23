export function database(env){
 if(!env.DB)throw new Error('DATABASE_UNAVAILABLE');
 return {all:async(sql,...params)=>(await env.DB.prepare(sql).bind(...params).all()).results,
 first:(sql,...params)=>env.DB.prepare(sql).bind(...params).first(),
 run:(sql,...params)=>env.DB.prepare(sql).bind(...params).run()};
}
