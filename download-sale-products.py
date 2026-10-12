import json,urllib.request,concurrent.futures
from pathlib import Path
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def fetch(p):
 try:
  data=opener.open(p['imageSource'],timeout=25).read()
  if data[:2]!=b'\xff\xd8': raise ValueError('Not JPEG')
  Path(p['image']).write_bytes(data)
  return p['id'],len(data)
 except Exception as e:return p['id'],str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(fetch,json.loads(Path('assets/sale-catalog.json').read_text())):print(*result)
