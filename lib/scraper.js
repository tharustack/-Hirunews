const axios = require('axios');
const cheerio = require('cheerio');

class HiruNewsScraper {
    constructor() {
        this.baseUrl = 'https://hirunews.lk';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        };
    }

    async fetchPage(url) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 10000 
            });
            return cheerio.load(response.data);
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            return null;
        }
    }

    async getBreakingNews() {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const breakingNews = [];
        
        // Top featured story (usually breaking news)
        const featured = $('.card-featured');
        if (featured.length) {
            breakingNews.push(this.extractArticleData(featured));
        }

        // News marquee/ticker (latest headlines)
        $('.news-heading a').each((i, el) => {
            const headline = $(el).text().trim();
            const url = $(el).attr('href');
            if (headline && url) {
                breakingNews.push({
                    headline,
                    url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                    isBreaking: true,
                    timestamp: new Date().toISOString()
                });
            }
        });

        return breakingNews.slice(0, 10); // Limit to 10 items
    }

    async getLatestNews(limit = 20) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const articles = [];
        
        // Latest News section
        $('a.card-v1').each((i, el) => {
            if (i >= limit) return false;
            articles.push(this.extractCardData($(el), 'latest'));
        });

        // Most Top News section
        $('a.card-v2').each((i, el) => {
            if (articles.length >= limit) return false;
            articles.push(this.extractCardData($(el), 'top'));
        });

        // More News section
        $('a.card-v3').each((i, el) => {
            if (articles.length >= limit) return false;
            articles.push(this.extractCardData($(el), 'more'));
        });

        return articles;
    }

    async getNewsByCategory(category, limit = 15) {
        // Map category names to URLs
        const categoryMap = {
            'general': '/news_listing.php?category=General',
            'international': '/news_listing.php?category=International',
            'entertainment': '/news_listing.php?category=Entertainment',
            'business': '/news_listing.php?category=Business',
            'sports': '/news_listing.php?category=Sports',
            'local': '/news_listing.php?category=General'
        };

        const categoryPath = categoryMap[category.toLowerCase()] || categoryMap.general;
        const url = `${this.baseUrl}${categoryPath}`;
        
        const $ = await this.fetchPage(url);
        if (!$) return [];

        const articles = [];
        $('.news-item, .card-v3, article').each((i, el) => {
            if (i >= limit) return false;
            articles.push(this.extractArticleData($(el)));
        });

        return articles;
    }

    async getNewsByDate(dateStr) {
        // Assuming date format: YYYY-MM-DD
        // Note: Hiru News might not have direct date URLs
        // This would require parsing archive pages
        const $ = await this.fetchPage(`${this.baseUrl}/archive`);
        if (!$) return [];

        const targetDate = new Date(dateStr);
        const articles = [];
        
        // This is a simplified example - actual implementation depends on site structure
        $('.news-item').each((i, el) => {
            const dateText = $(el).find('.date').text();
            const articleDate = this.parseDate(dateText);
            
            if (articleDate.toDateString() === targetDate.toDateString()) {
                articles.push(this.extractArticleData($(el)));
            }
        });

        return articles;
    }

    async getFullArticle(articleUrl) {
        const $ = await this.fetchPage(articleUrl);
        if (!$) return null;

        // Extract full article content
        const fullText = [];
        $('.article-content p, .story-content p, #content p').each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 20) {
                fullText.push(text);
            }
        });

        // Extract all images from article
        const images = [];
        $('.article-content img, .story-content img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
                images.push({
                    url: src.startsWith('http') ? src : `${this.baseUrl}${src}`,
                    alt: $(el).attr('alt') || '',
                    caption: $(el).attr('title') || ''
                });
            }
        });

        // Get article metadata
        const headline = $('h1').first().text().trim() || 
                        $('.title').first().text().trim();
        
        const thumbnail = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content') ||
                         $('.featured-image img').attr('src');

        return {
            headline,
            url: articleUrl,
            thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `${this.baseUrl}${thumbnail}`) : null,
            summary: $('meta[name="description"]').attr('content') || '',
            fullText: fullText.join('\n\n'),
            images,
            publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                          $('.date').first().text().trim(),
            author: $('meta[name="author"]').attr('content') || 
                   $('.author').first().text().trim(),
            category: $('meta[property="article:section"]').attr('content') || 
                     $('.category').first().text().trim()
        };
    }

    extractCardData($el, type = 'general') {
        const headline = $el.find('.card-title-v1, .card-title-v2, .card-title-v3, h4').first().text().trim();
        const url = $el.attr('href');
        const thumbnail = $el.find('img').attr('src');
        const summary = $el.find('.description').text().trim();
        const category = $el.find('.update-category').text().trim();
        const date = $el.find('.update-wrp-lg').text().replace(category, '').trim();

        return {
            headline,
            url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
            thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `${this.baseUrl}${thumbnail}`) : null,
            summary: summary || headline.substring(0, 150) + '...',
            category: category || 'General',
            date: date || new Date().toISOString().split('T')[0],
            type,
            timestamp: new Date().toISOString()
        };
    }

    extractArticleData($el) {
        // Similar to extractCardData but for different HTML structures
        return {
            headline: $el.find('h3, h4, .title').text().trim(),
            url: $el.find('a').attr('href'),
            thumbnail: $el.find('img').attr('src'),
            summary: $el.find('.summary, .excerpt').text().trim(),
            category: $el.find('.category, .tag').text().trim(),
            date: $el.find('.date, time').text().trim()
        };
    }

    parseDate(dateText) {
        // Parse Sinhala/English date strings
        const months = {
            'ජනවාරි': 0, 'පෙබරවාරි': 1, 'මාර්තු': 2, 'අප්‍රේල්': 3,
            'මැයි': 4, 'ජුනි': 5, 'ජූලි': 6, 'අගෝස්තු': 7,
            'සැප්තැම්බර්': 8, 'ඔක්තෝබර්': 9, 'නොවැම්බර්': 10, 'දෙසැම්බර්': 11
        };

        for (const [sinhala, month] of Object.entries(months)) {
            if (dateText.includes(sinhala)) {
                const day = parseInt(dateText.match(/\d+/)?.[0] || 1);
                const year = parseInt(dateText.match(/\d{4}/)?.[0] || new Date().getFullYear());
                return new Date(year, month, day);
            }
        }

        return new Date(dateText) || new Date();
    }
}

module.exports = HiruNewsScraper;
