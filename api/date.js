const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { date, limit = 10 } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required',
                example: '/api/date?date=2026-01-12',
                format: 'YYYY-MM-DD'
            });
        }
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                received: date,
                expected: 'YYYY-MM-DD'
            });
        }
        
        const scraper = new HiruNewsScraper();
        const articles = await scraper.getNewsByDate(date, parseInt(limit));
        
        res.json({
            success: true,
            date: date,
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
