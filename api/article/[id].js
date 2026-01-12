const HiruNewsScraper = require('../../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Get ID from URL path: /api/article/440221
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Article ID is required',
                example: '/api/article/440221'
            });
        }
        
        // Validate ID is numeric
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid article ID format',
                received: id
            });
        }
        
        const scraper = new HiruNewsScraper();
        const article = await scraper.getArticleById(id);
        
        res.json({
            success: true,
            data: article,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Article error:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: `Article with ID ${req.query.id} not found`
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
