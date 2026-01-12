const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { name = 'general', limit = 15 } = req.query;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        const scraper = new HiruNewsScraper();
        const articles = await scraper.getNewsByCategory(name, parseInt(limit));

        res.json({
            success: true,
            category: name,
            data: articles,
            count: articles.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
