const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { limit = 15 } = req.query;
        const scraper = new HiruNewsScraper();
        
        const latestNews = await scraper.getLatestNews(parseInt(limit));
        
        res.json({
            success: true,
            data: latestNews,
            count: latestNews.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
