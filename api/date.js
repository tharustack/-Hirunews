const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
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
        
        // Simple date validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                received: date,
                expected_format: 'YYYY-MM-DD'
            });
        }
        
        // For now, we'll filter from latest news by date text
        const scraper = new HiruNewsScraper();
        const allNews = await scraper.getLatestNews(30); // Get more to filter
        
        // Filter articles that mention the date
        const filtered = allNews.filter(article => {
            return article.date && article.date.includes(date.substring(8, 10)); // Check day
        }).slice(0, parseInt(limit));
        
        res.json({
            success: true,
            date: date,
            data: filtered,
            count: filtered.length,
            timestamp: new Date().toISOString(),
            note: 'Date filtering is basic. For better date filtering, archive page scraping would be needed.'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
