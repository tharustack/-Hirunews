const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { limit = 5 } = req.query;
        const scraper = new HiruNewsScraper();
        
        const breakingNews = await scraper.getBreakingNews(parseInt(limit));
        
        res.status(200).json({
            success: true,
            data: breakingNews,
            count: breakingNews.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
