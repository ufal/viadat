import requests
import time

def safe_post(url, data):
    for i in range(10):
        r = requests.post(url, data=data)
        if r.status_code == 200:
            return r
        print("POST failed, retrying ...")
        time.sleep(0.5)
    else:
        raise Exception("Cannot retreive name tags")


class Service:

    def __init__(self):
        self.cache = {}

    def post(self, url, data):
        pair = (url, str(data))
        value = self.cache.get(pair)
        if value is not None:
            return value
        results = safe_post(url, data)
        self.cache[pair] = results
        return results