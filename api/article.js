const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Article URL is required'
            });
        }

        // Validate URL
        if (!url.includes('hirunews.lk')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Hiru News URL'
            });
        }

        const scraper = new HiruNewsScraper();
        const article = await scraper.getFullArticle(url);

        if (article.error) {
            return res.status(404).json({
                success: false,
                error: 'Article not found or inaccessible'
            });
        }

        res.json({
            success: true,
            data: article,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
