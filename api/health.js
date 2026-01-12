module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.json({
        status: 'healthy',
        service: 'Hiru News API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/breaking-news',
            '/api/latest-news',
            '/api/article/{id}',
            '/api/category/{name}',
            '/api/date',
            '/api/search'
        ]
    });
};
