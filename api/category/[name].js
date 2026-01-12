const HiruNewsScraper = require('../../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Get category from URL: /api/category/sports
        const { name } = req.query;
        const { limit = 10 } = req.query;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required',
                example: '/api/category/sports',
                available_categories: ['general', 'sports', 'business', 'entertainment', 'international']
            });
        }
        
        const validCategories = ['general', 'sports', 'business', 'entertainment', 'international'];
        
        if (!validCategories.includes(name.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Available: ${validCategories.join(', ')}`,
                received: name
            });
        }
        
        const scraper = new HiruNewsScraper();
        const articles = await scraper.getNewsByCategory(name, parseInt(limit));
        
        res.json({
            success: true,
            category: name,
            data: articles,
            count: articles.length,
            timestamp: new Date().toISOString(),
            note: 'Filtered from homepage. For complete category pages, might need separate scraping.'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
