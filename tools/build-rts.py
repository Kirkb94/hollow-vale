"""Concatenate tools/rts-src/*.js into the shell and write public/rts.html."""
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(here, 'rts-src', 'shell.html'), encoding='utf8').read()
js = '\n'.join(open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(here, 'rts-src', '*.js'))))
out = shell.replace('/*JS*/', js)
open(os.path.join(here, '..', 'public', 'rts.html'), 'w', encoding='utf8').write(out)
print('wrote public/rts.html', len(out), 'bytes')
