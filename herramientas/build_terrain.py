import numpy as np, csv, json, base64, io, math, os
from PIL import Image
L0,S0,N=9971,2360,1600
a=np.memmap('/mnt/user-data/uploads/msl_orbital_dem.img',dtype='>f4',mode='r',offset=53928,shape=(11571,6741))
z=np.array(a[L0:L0+N,S0:S0+N],dtype=np.float64).reshape(800,2,800,2).mean(axis=(1,3)); cs=2.0
gy,gx=np.gradient(z,cs)
H=np.zeros_like(z); nd=16
for k in range(nd):
    th=2*math.pi*k/nd; dx,dy=math.cos(th),math.sin(th)
    hmax=np.zeros_like(z)
    for step in range(1,201):
        ox=int(round(dx*step)); oy=int(round(dy*step))
        if ox==0 and oy==0: continue
        sh=np.full_like(z,-1e9)
        ys=slice(max(0,-oy),800-max(0,oy)); yd=slice(max(0,oy),800-max(0,-oy))
        xs=slice(max(0,-ox),800-max(0,ox)); xd=slice(max(0,ox),800-max(0,-ox))
        sh[ys,xs]=z[yd,xd]
        hmax=np.maximum(hmax,np.arctan2(sh-z,cs*math.hypot(ox,oy)))
    H+=np.sin(np.clip(hmax,0,None))
blocked=H/nd
az,alt=math.radians(315),math.radians(35)
asp=np.arctan2(-gx,gy); sl=np.arctan(np.hypot(gx,gy))
hs=np.clip((np.sin(alt)*np.cos(sl)+np.cos(alt)*np.sin(sl)*np.cos(az-asp))*255,0,255).astype(np.uint8)
buf=io.BytesIO(); Image.fromarray(hs).save(buf,'PNG',optimize=True)
zmin=float(np.floor(z.min()))
zq=np.round((z-zmin)*100).astype('<u2')
bq=np.clip(np.round(blocked*255),0,255).astype(np.uint8)
tr=[]
for row in csv.DictReader(open('/mnt/user-data/uploads/e2126db0-localized_interp.csv',newline='')):
    if row['frame'].strip()!='ROVER': continue
    Lp=float(row['dem_pixel_line']); Sp=float(row['dem_pixel_sample'])
    if L0<=Lp<L0+N and S0<=Sp<S0+N:
        tr.append([round((Sp-S0)/2,1),round((Lp-L0)/2,1),int(float(row['sol'])),round(float(row['pitch']),1),round(float(row['roll']),1),round(float(row['elevation']),1)])
tr=tr[::2]
# check: DEM vs rover elevation at traverse points
d=[ z[min(799,int(p[1])),min(799,int(p[0]))]-p[5] for p in tr]
print("DEM-rover elev median/p5/p95",np.median(d),np.percentile(d,5),np.percentile(d,95))
R=3396190.0
lat_top=math.degrees((-271513.07519-L0)/R); lon_left=math.degrees((8141037.49279+S0)/R)
meta=dict(n=800,cs=cs,zmin=zmin,lat_top=lat_top,lon_left=lon_left,deg_per_m=math.degrees(1/R),
  src="msl_orbital_dem.img (PDS Geosciences, paquete MSL PLACES), lineas %d-%d y columnas %d-%d, promediado a 2 m"%(L0,L0+N,S0,S0+N))
print("sols",tr[0][2],tr[-1][2],len(tr), "lat/lon",lat_top,lon_left)
json.dump(dict(meta=meta,hs=base64.b64encode(buf.getvalue()).decode(),z=base64.b64encode(zq.tobytes()).decode(),b=base64.b64encode(bq.tobytes()).decode(),tr=tr),open('terrain.json','w'))
print("MB",os.path.getsize('terrain.json')/1e6)
