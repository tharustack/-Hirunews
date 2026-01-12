# -Hirunews

hiru-news-api/
├── api/
│   ├── breaking-news.js    # GET /api/breaking-news
│   ├── latest-news.js      # GET /api/latest-news
│   ├── category.js         # GET /api/category?name=general
│   ├── date.js             # GET /api/date?date=2026-01-12
│   └── search.js           # GET /api/search?q=query
├── lib/
│   ├── scraper.js          # Core scraping functions
│   └── cache.js            # Caching for performance
├── package.json
└── vercel.json
