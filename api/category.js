const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { name = 'general', limit = 5 } = req.query;
        
        const validCategories = ['general', 'international', 'entertainment', 'business', 'sports', 'local'];
        
        if (!validCategories.includes(name.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Valid categories: ${validCategories.join(', ')}`,
                validCategories
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
        console.error('Category error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
