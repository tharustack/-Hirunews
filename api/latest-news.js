const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { limit = 5, timeout = 20000 } = req.query; // Default to 5 articles for speed
        const scraper = new HiruNewsScraper();
        
        // Set a timeout to avoid Vercel's 10-second limit
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), parseInt(timeout));
        });
        
        const newsPromise = scraper.getLatestNews(parseInt(limit));
        
        // Race between news fetching and timeout
        const articles = await Promise.race([newsPromise, timeoutPromise]);
        
        res.status(200).json({
            success: true,
            data: articles,
            count: articles.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in latest-news:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try reducing the limit parameter'
        });
    }
};
