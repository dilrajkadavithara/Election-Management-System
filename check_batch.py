import redis, json

r = redis.Redis(host='redis', port=6379, db=0)
for key in r.keys('batch:*'):
    data = json.loads(r.get(key))
    bid = key.decode().replace('batch:', '')
    status = data.get('status', '?')
    results = len(data.get('results', []))
    filename = data.get('filename', '?')
    print(f"Batch: {bid} | Status: {status} | Results: {results} | File: {filename}")
