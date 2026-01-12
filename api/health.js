const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Quick test to see if scraper works
        const scraper = new HiruNewsScraper();
        const testNews = await scraper.getLatestNews(1);
        
        res.json({
            status: 'healthy',
            service: 'Hiru News API',
            version: '1.0.0',
            scraper_working: testNews.length > 0,
            sample_articles_available: testNews.length,
            timestamp: new Date().toISOString(),
            endpoints: [
                { path: '/api/breaking-news', method: 'GET', description: 'Breaking/ticker news' },
                { path: '/api/latest-news', method: 'GET', description: 'Latest articles' },
                { path: '/api/article/{id}', method: 'GET', description: 'Full article by ID' },
                { path: '/api/category/{name}', method: 'GET', description: 'News by category' },
                { path: '/api/date', method: 'GET', description: 'News by date' },
                { path: '/api/search', method: 'GET', description: 'Search news' }
            ],
            usage_examples: [
                'curl "https://your-api.vercel.app/api/latest-news?limit=5"',
                'curl "https://your-api.vercel.app/api/article/440221"',
                'curl "https://your-api.vercel.app/api/category/sports"'
            ]
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
