"""Muestrea los mosaicos CRISM GMWG 2012 (ALT, FM2, MAF) en cada parada de data/rutas/rutas_sol5070_calculadas.geojson.
Ventana 3x3 píxeles (~58 m). Devuelve el valor medio en bytes, su valor aproximado del parámetro y su percentil en la zona y en el mosaico."""
import json, math, sys
from osgeo import gdal
gdal.UseExceptions()
import numpy as np

R=3396190.0
import os
# Uso: python herramientas/crism_muestras_paradas.py <carpeta con ALT.tif, FM2.tif, MAF.tif> (requiere GDAL)
D=(sys.argv[1].rstrip('/')+'/') if len(sys.argv)>1 else 'crism/'
REPO=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
meta=json.load(open(REPO+'data/terreno/sol5070/meta.json'))
latN,latS,lonW,lonE=meta['lat_norte'],meta['lat_sur'],meta['lon_oeste'],meta['lon_este']
LIM={'ALT':[('D2300',.01,.03),('SINDEX2',.01,.03),('BD1900_2',.005,.025)],
     'FM2':[('BD530',.18,.25),('BD920',.005,.02),('BDI1000VIS',.01,.022)],
     'MAF':[('OLINDEX3',.025,.1),('LCPINDEX2',0,.02),('HCPINDEX2',0,.15)]}
def load(p):
    ds=gdal.Open(D+p+'.tif'); a=ds.ReadAsArray(); gt=ds.GetGeoTransform()
    if a.ndim==2: a=a[None]
    return a,gt
def tocr(gt,lat,lon):
    x=math.radians(lon)*R; y=math.radians(lat)*R
    return (x-gt[0])/gt[1], (y-gt[3])/gt[5]
g=json.load(open(REPO+'data/rutas/rutas_sol5070_calculadas.geojson'))
pts=[(f['properties']['parada'],f['geometry']['coordinates']) for f in g['features'] if f['geometry']['type']=='Point' and f['properties']['parada']!='C2']
lines=[(f['properties']['ruta'],f['geometry']['coordinates']) for f in g['features'] if f['geometry']['type']=='LineString']
out={}
for p in ['ALT','FM2','MAF']:
    a,gt=load(p)
    valid=~np.all(a==255,axis=0)
    c0,r0=tocr(gt,latN,lonW); c1,r1=tocr(gt,latS,lonE)
    c0,r0,c1,r1=int(c0),int(r0),int(math.ceil(c1)),int(math.ceil(r1))
    zone=a[:,r0:r1,c0:c1].astype(float)
    res={}
    for name,(lon,lat) in pts:
        c,r=tocr(gt,lat,lon); c,r=int(c),int(r)
        win=a[:,r-1:r+2,c-1:c+2].reshape(a.shape[0],-1).astype(float)
        vals=[]
        for b in range(a.shape[0]):
            dn=win[b].mean()
            nm,lo,hi=LIM[p][b]
            pct_zone=100*(zone[b]<dn).mean()
            allv=a[b][valid].astype(float)
            pct_all=100*(allv<dn).mean()
            vals.append(dict(param=nm,dn=round(dn,1),valor=round(lo+dn/254*(hi-lo),4),pct_zona=round(pct_zone),pct_mosaico=round(pct_all)))
        res[name]=vals
    out[p]=res
    # zone stats
    out[p+'_zona_media_dn']=[round(zone[b].mean(),1) for b in range(a.shape[0])]
json.dump(out,open(REPO+'data/mineralogia/crism_sol5070/muestras_paradas.json','w'),indent=1,ensure_ascii=False)
for p in ['ALT','FM2','MAF']:
    print('==',p,[x[0] for x in LIM[p]],'media zona DN',out[p+'_zona_media_dn'])
    for name,_ in pts:
        print(' ',name.ljust(3),'  '.join(f"{v['param']}: DN{v['dn']:6.1f} p_zona{v['pct_zona']:3d} p_mos{v['pct_mosaico']:3d}" for v in out[p][name]))
