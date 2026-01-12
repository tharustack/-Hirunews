const HiruNewsScraper = require('../../lib/scraper');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { name } = req.query;
        const { limit = 10, details = 'true' } = req.query;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required',
                example: '/api/category/sports',
                available_categories: ['general', 'sports', 'business', 'entertainment', 'international', 'local'],
                usage: 'GET /api/category/sports?limit=15&details=false'
            });
        }
        
        const validCategories = ['general', 'sports', 'business', 'entertainment', 'international', 'local'];
        
        if (!validCategories.includes(name.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Available: ${validCategories.join(', ')}`,
                received: name,
                suggestion: 'Use one of the valid categories listed above'
            });
        }
        
        const scraper = new HiruNewsScraper();
        const articles = await scraper.getNewsByCategory(name, parseInt(limit));
        
        // If no details needed, return basic info only
        if (details === 'false') {
            const basicArticles = articles.map(article => ({
                id: article.id,
                headline: article.headline,
                url: article.url,
                thumbnail: article.thumbnail,
                category: article.category,
                timestamp: article.timestamp
            }));
            
            return res.json({
                success: true,
                category: name,
                data: basicArticles,
                count: basicArticles.length,
                note: 'Basic info only. Add &details=true for full article content.',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            category: name,
            data: articles,
            count: articles.length,
            timestamp: new Date().toISOString(),
            note: `Scraped from ${name} category page`,
            details_fetched: articles.filter(a => a.fullText).length
        });
        
    } catch (error) {
        console.error(`Category error for ${req.query.name}:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            category: req.query.name
        });
    }
};
