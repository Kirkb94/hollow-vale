"""Export Hollow Vale's final hero/faction data (after all in-page patches) to public/rts-data.json.
Run with the game server up: python3 tools/export-rts-data.py http://localhost:8790/"""
import asyncio, json, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8790/'
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(); await pg.goto(URL); await pg.wait_for_timeout(3000)
        data = await pg.evaluate("""(()=>{
          const strip=o=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v=='function'?undefined:v));
          const heroes={};
          for(const k of Object.keys(H)){ const h=H[k]; const o=strip(h); o.hire=hireCost(k); o.slots=slotCost(k); o.role=(typeof ROLE!='undefined'&&ROLE[k])?ROLE[k]:null;
            try{ o.kw=(kwH(k,'p')||[]).map(([n,d])=>[String(n),String(d).replace(/<[^>]+>/g,'')]); }catch(e){ o.kw=[]; }
            heroes[k]=o; }
          const fac={}; for(const k of Object.keys(FAC)) fac[k]=strip(FAC[k]);
          return {heroes, fac, classes: typeof CLASSDESC!='undefined'?CLASSDESC:{}, armyBase: typeof ARMY_BASE!='undefined'?ARMY_BASE:10, armyMax: typeof ARMY_MAX!='undefined'?ARMY_MAX:null, bld: strip(BLD)};
        })()""")
        json.dump(data, open('public/rts-data.json','w'), ensure_ascii=False, separators=(',',':'))
        print(len(data['heroes']), 'heroes,', len(data['fac']), 'factions')
        await b.close()
asyncio.run(main())
