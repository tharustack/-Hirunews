const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required (minimum 2 characters)',
                example: '/api/search?q=ප්රථම',
                example_english: '/api/search?q=accident'
            });
        }
        
        const scraper = new HiruNewsScraper();
        const allNews = await scraper.getLatestNews(50); // Get more to search through
        
        // Simple search in headlines and summaries
        const searchTerm = q.toLowerCase();
        const results = allNews.filter(article => {
            const searchText = (article.headline + ' ' + article.summary).toLowerCase();
            return searchText.includes(searchTerm);
        }).slice(0, parseInt(limit));
        
        res.json({
            success: true,
            query: q,
            data: results,
            count: results.length,
            timestamp: new Date().toISOString(),
            note: 'Basic search in headlines/summaries. For full-text search, article content scraping would be needed.'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
