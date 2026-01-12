const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { limit = 10 } = req.query;
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
