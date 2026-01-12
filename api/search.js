const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required (min 2 characters)',
                example: '/api/search?q=ප්රථම'
            });
        }
        
        const scraper = new HiruNewsScraper();
        const results = await scraper.searchNews(q, parseInt(limit));
        
        res.json({
            success: true,
            query: q,
            data: results,
            count: results.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
