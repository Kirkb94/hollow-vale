# Faction balance sims: python3 tools/faction-balance.py SEEDS FACTION|all OUT.json  (needs the server on :8790 and tools/faction-balance.js)
import asyncio, json, sys, itertools
from playwright.async_api import async_playwright
SEEDS=int(sys.argv[1]) if len(sys.argv)>1 else 3
PAIRS=sys.argv[2] if len(sys.argv)>2 else 'undead'
OUT=sys.argv[3] if len(sys.argv)>3 else '/tmp/fb.json'
facs=['kingdom','vamp','undead','infernal','wilds','iron','arcane']
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8790/?fast'); await pg.wait_for_timeout(3000)
        await pg.add_script_tag(path=__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'faction-balance.js'))
        pairs = [(PAIRS,f) for f in facs if f!=PAIRS] if PAIRS!='all' else list(itertools.combinations(facs,2))
        res=[]
        for a,bb in pairs:
            for boss in [False,True]:
                for i in range(SEEDS):
                    for swap in [False,True]:
                        try: r = await pg.evaluate("c=>balanceMatch(c)", {'a':a,'b':bb,'seed':104729+i*7919,'swap':swap,'boss':boss})
                        except Exception as e: r={'a':a,'b':bb,'error':str(e)[:200]}
                        res.append(r)
            rows=[r for r in res if r.get('a')==a and r.get('b')==bb]
            print(a,'vs',bb,': ',a,sum(r.get('winner')==a for r in rows),'-',sum(r.get('winner')==bb for r in rows),bb,' timeouts',sum(r.get('winner')=='timeout' for r in rows),' errs',sum('error' in r for r in rows), 'avg round', round(sum(r.get('round',0) for r in rows)/max(1,len(rows)),1), flush=True)
        json.dump(res,open(OUT,'w'),indent=1)
        print('page errors', errs[:3]); await b.close()
asyncio.run(main())
