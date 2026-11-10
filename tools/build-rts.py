"""Build Warfront: concatenate tools/warfront-src/*.js (sorted) into its shell and write public/rts.html."""
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'warfront-src')
js = '\n'.join(open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(src, '*.js'))))
html = open(os.path.join(src, 'shell.html'), encoding='utf8').read().replace('/*__GAME__*/', '"use strict";\n' + js)
open(os.path.join(here, '..', 'public', 'rts.html'), 'w', encoding='utf8').write(html)
print('wrote public/rts.html', len(html), 'bytes')
