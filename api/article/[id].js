const HiruNewsScraper = require('../../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Get ID from URL: /api/article/440221
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Article ID is required',
                example: '/api/article/440221',
                note: 'Use IDs from breaking-news or latest-news endpoints'
            });
        }
        
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid article ID format',
                received: id,
                expected: 'Numeric ID like 440221'
            });
        }
        
        const scraper = new HiruNewsScraper();
        const article = await scraper.getArticleById(id);
        
        res.json({
            success: true,
            data: article,
            timestamp: new Date().toISOString(),
            source: 'hirunews.lk'
        });
        
    } catch (error) {
        console.error(`Error fetching article ${req.query.id}:`, error.message);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: `Article with ID ${req.query.id} not found`,
                suggestion: 'Check if the ID is correct. Get valid IDs from /api/latest-news'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message,
            id_attempted: req.query.id
        });
    }
};
