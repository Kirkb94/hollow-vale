'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public/art/rigs'),file=path.join(root,'catalog.json'),catalog=JSON.parse(fs.readFileSync(file,'utf8'));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.(png|json)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
for(const c of Object.values(catalog.units)){const hash=crypto.createHash('sha256');for(const p of files(path.join(root,c.folder))){hash.update(path.relative(root,p));hash.update(fs.readFileSync(p));}c.revision=hash.digest('hex').slice(0,12);}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');console.log('Stamped '+Object.keys(catalog.units).length+' art kits.');
