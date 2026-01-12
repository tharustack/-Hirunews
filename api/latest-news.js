const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { limit = 10 } = req.query;
        const scraper = new HiruNewsScraper();
        
        const latestNews = await scraper.getLatestNews(parseInt(limit));
        
        res.json({
            success: true,
            data: latestNews,
            count: latestNews.length,
            timestamp: new Date().toISOString(),
            note: 'Data from hirunews.lk homepage'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try reducing the limit parameter'
        });
    }
};
