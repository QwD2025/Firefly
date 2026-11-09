import {mkdir, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','reader.css','reader.js','chapters.json']){
 await copyFile(path.join(root,'reader',name),path.join(root,'dist',name));
}
console.log('Built public reader to dist (no private database or keys).');
