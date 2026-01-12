// In lib/cache.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

async function getCachedOrFetch(key, fetchFunction) {
    const cached = cache.get(key);
    if (cached) return cached;
    
    const data = await fetchFunction();
    cache.set(key, data);
    return data;
  }
