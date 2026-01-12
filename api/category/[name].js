const HiruNewsScraper = require('../../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Get category name from URL: /api/category/sports
        const { name } = req.query;
        const { limit = 15 } = req.query;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required',
                example: '/api/category/sports',
                available: ['general', 'sports', 'business', 'entertainment', 'international']
            });
        }
        
        const scraper = new HiruNewsScraper();
        const articles = await scraper.getNewsByCategory(name, parseInt(limit));
        
        res.json({
            success: true,
            category: name,
            data: articles,
            count: articles.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
