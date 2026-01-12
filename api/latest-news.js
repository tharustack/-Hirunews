const HiruNewsScraper = require('../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const { limit = 20, full = false } = req.query;
        const scraper = new HiruNewsScraper();
        const latestNews = await scraper.getLatestNews(parseInt(limit));

        // If full details requested, fetch complete articles
        if (full === 'true') {
            const detailedArticles = await Promise.all(
                latestNews.map(async (article) => {
                    const fullDetails = await scraper.getFullArticle(article.url);
                    return { ...article, ...fullDetails };
                })
            );
            
            return res.json({
                success: true,
                data: detailedArticles,
                count: detailedArticles.length
            });
        }

        res.json({
            success: true,
            data: latestNews,
            count: latestNews.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
