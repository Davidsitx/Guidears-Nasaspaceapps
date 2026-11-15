# Arma plantilla.html = cabecera.html (HTML/CSS) + script de la app con interfaz.js adentro.
import re
s=open('_cuerpo.html').read()
i=s.index('// ==================== Interfaz estilo Google Earth'); j=s.index("\nabrir('explorar', false);")
s=s[:i]+open('interfaz.js').read().rstrip()+'\n'+open('biblioteca.js').read().rstrip()+'\n'+open('linea.js').read().rstrip()+'\n'+open('marte.js').read().rstrip()+'\n'+open('tour.js').read().rstrip()+'\n'+open('mision.js').read().rstrip()+s[j:]
s=s.replace("$('exag').onchange = e => { viewer.scene.verticalExaggeration = +e.target.value; };",
 "$('exag').onchange = e => { const v = +e.target.value; viewer.scene.verticalExaggeration = v; $('relBadge').textContent = '×' + String(v).replace('.', ','); $('relBadge').classList.toggle('oculto', v === 1); };")
import json
s=s.replace('/*__IDIOMA_JS__*/', open('idioma.js').read().replace('/*__IDIOMA_EN__*/{}', json.dumps(json.load(open('datos/idioma_en.json', encoding='utf-8')), ensure_ascii=False, separators=(',', ':'))), 1)
c=open('cabecera.html').read().replace('<text x="20" y="4.6" font-size="0" fill="none">N</text>','')
open('plantilla.html','w').write(c+s)
