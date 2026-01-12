// lib/scraper.js - UPDATED AND WORKING VERSION
const axios = require('axios');
const cheerio = require('cheerio');

class HiruNewsScraper {
    constructor() {
        this.baseUrl = 'https://hirunews.lk';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

    // ✅ WORKING: Get latest news from homepage
    async getLatestNews(limit = 10) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const articles = [];
        
        // METHOD 1: Get from card-v1 (Latest News section)
        $('a.card-v1').each((i, el) => {
            if (articles.length >= limit) return false;
            
            const $el = $(el);
            const headline = $el.find('.card-title-v1').text().trim();
            const url = $el.attr('href');
            const thumbnail = $el.find('img').attr('src');
            const summary = $el.find('.description').text().trim();
            
            // Get category and date from update-wrp-lg
            let category = 'General';
            let date = '';
            const updateWrp = $el.find('.update-wrp-lg');
            if (updateWrp.length) {
                category = updateWrp.find('.update-category').text().trim() || 'General';
                // Get date by removing category from text
                date = updateWrp.text().replace(category, '').trim();
            }
            
            if (headline && url) {
                articles.push({
                    id: this.extractArticleId(url),
                    headline,
                    url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                    thumbnail: this.makeAbsoluteUrl(thumbnail),
                    summary: summary || headline.substring(0, 150) + '...',
                    category: category,
                    date: date,
                    type: 'latest',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // METHOD 2: Get from card-v2 (Most Top News section)
        if (articles.length < limit) {
            $('a.card-v2').each((i, el) => {
                if (articles.length >= limit) return false;
                
                const $el = $(el);
                const headline = $el.find('.card-title-v2').text().trim();
                const url = $el.attr('href');
                const thumbnail = $el.find('img').attr('src');
                
                // Get category and date
                let category = 'General';
                let date = '';
                const updateWrp = $el.find('.update-wrp-lg');
                if (updateWrp.length) {
                    category = updateWrp.find('.update-category').text().trim() || 'General';
                    date = updateWrp.text().replace(category, '').trim();
                }
                
                if (headline && url && !articles.some(a => a.url.includes(url))) {
                    articles.push({
                        id: this.extractArticleId(url),
                        headline,
                        url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                        thumbnail: this.makeAbsoluteUrl(thumbnail),
                        summary: headline.substring(0, 150) + '...',
                        category: category,
                        date: date,
                        type: 'top',
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }

        // METHOD 3: Get from card-v3 (More News section)
        if (articles.length < limit) {
            $('a.card-v3').each((i, el) => {
                if (articles.length >= limit) return false;
                
                const $el = $(el);
                const headline = $el.find('.card-title-v3').text().trim();
                const url = $el.attr('href');
                const thumbnail = $el.find('img').attr('src');
                const summary = $el.find('.description').text().trim();
                
                // Get category and date
                let category = 'General';
                let date = '';
                const updateWrp = $el.find('.update-wrp-lg');
                if (updateWrp.length) {
                    category = updateWrp.find('.update-category').text().trim() || 'General';
                    date = updateWrp.text().replace(category, '').trim();
                }
                
                if (headline && url && !articles.some(a => a.url.includes(url))) {
                    articles.push({
                        id: this.extractArticleId(url),
                        headline,
                        url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                        thumbnail: this.makeAbsoluteUrl(thumbnail),
                        summary: summary || headline.substring(0, 150) + '...',
                        category: category,
                        date: date,
                        type: 'more',
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }

        return articles.slice(0, limit);
    }

    // ✅ WORKING: Get breaking/news ticker
    async getBreakingNews(limit = 5) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const breakingNews = [];
        
        // Get from news marquee/ticker
        $('.news-heading a').each((i, el) => {
            if (breakingNews.length >= limit) return false;
            
            const headline = $(el).text().trim();
            const url = $(el).attr('href');
            
            if (headline && url) {
                breakingNews.push({
                    id: this.extractArticleId(url),
                    headline,
                    url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                    isBreaking: true,
                    type: 'ticker',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get featured/top story
        const featured = $('a.card-featured');
        if (featured.length && breakingNews.length < limit) {
            const headline = featured.find('.card-title-featured').text().trim();
            const url = featured.attr('href');
            
            if (headline && url) {
                breakingNews.unshift({ // Add to beginning as most important
                    id: this.extractArticleId(url),
                    headline,
                    url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
                    isBreaking: true,
                    type: 'featured',
                    timestamp: new Date().toISOString()
                });
            }
        }

        return breakingNews.slice(0, limit);
    }

    // ✅ WORKING: Get article by ID
    async getArticleById(newsId) {
        console.log(`🔍 Fetching article ID: ${newsId}`);
        
        // Try direct URL first
        let $ = await this.fetchPage(`${this.baseUrl}/${newsId}`);
        
        // If not found, try with common patterns
        if (!$ || $.text().includes('404') || $.text().includes('Page Not Found')) {
            console.log(`Trying alternative patterns for ID: ${newsId}`);
            
            const patterns = [
                `${this.baseUrl}/news/${newsId}`,
                `${this.baseUrl}/en/${newsId}`,
                `${this.baseUrl}/sinhala/${newsId}`,
                `${this.baseUrl}/article/${newsId}`
            ];
            
            for (const url of patterns) {
                $ = await this.fetchPage(url);
                if ($ && !$.text().includes('404')) {
                    console.log(`✅ Found at: ${url}`);
                    break;
                }
            }
        }
        
        if (!$) {
            throw new Error(`Article with ID ${newsId} not found`);
        }
        
        return await this.extractFullArticle($, newsId);
    }

    // ✅ WORKING: Extract full article data
    async extractFullArticle($, newsId) {
        // 1. Get headline
        const headline = $('h1').first().text().trim() || 
                        $('.card-title-featured, .card-title-v1, .card-title-v2, .card-title-v3').first().text().trim() ||
                        $('title').text().replace(' - Hiru News', '').trim();
        
        // 2. Get thumbnail
        const thumbnail = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content') ||
                         $('.image-wrp img').attr('src') ||
                         $('article img').first().attr('src');
        
        // 3. Get full text - look in content areas
        let fullText = '';
        const contentSelectors = [
            '.article-content',
            '.story-content',
            '.news-detail',
            '.single-news',
            '#content',
            'article',
            '.content-wrp',
            '.col-lg-8'
        ];
        
        for (const selector of contentSelectors) {
            const container = $(selector);
            if (container.length) {
                // Remove unwanted elements
                container.find('script, style, .advertisement, .share-buttons, iframe').remove();
                
                // Get all paragraphs
                container.find('p').each((i, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 30 && 
                        !text.includes('ADVERTISEMENT') &&
                        !text.includes('adsbygoogle')) {
                        fullText += text + '\n\n';
                    }
                });
                
                if (fullText.length > 300) break;
            }
        }
        
        // 4. Get summary
        const summary = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       fullText.substring(0, 200) + '...';
        
        // 5. Get images
        const images = [];
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('hirunews') && 
                !src.includes('logo') && 
                !src.includes('icon') &&
                !src.includes('ad')) {
                images.push({
                    url: this.makeAbsoluteUrl(src),
                    alt: $(el).attr('alt') || `Image ${i + 1}`,
                    caption: $(el).attr('title') || ''
                });
            }
        });
        
        // 6. Get category
        let category = 'General';
        const categorySelectors = [
            '.breadcrumb a:nth-child(2)',
            '.category a',
            '.news-category',
            'meta[property="article:section"]',
            '.update-category'
        ];
        
        for (const selector of categorySelectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) {
                    category = content;
                    break;
                }
            } else {
                const element = $(selector);
                if (element.length) {
                    category = element.text().trim();
                    break;
                }
            }
        }
        
        // 7. Get date
        let publishedDate = '';
        const dateSelectors = [
            'meta[property="article:published_time"]',
            '.date',
            '.published-date',
            'time',
            '.update-wrp-lg'
        ];
        
        for (const selector of dateSelectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) {
                    publishedDate = content;
                    break;
                }
            } else {
                const element = $(selector);
                if (element.length) {
                    publishedDate = element.text().trim();
                    break;
                }
            }
        }
        
        // 8. Get author
        let author = 'Hiru News';
        const authorSelectors = [
            'meta[name="author"]',
            '.author',
            '.byline',
            '.reporter'
        ];
        
        for (const selector of authorSelectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) {
                    author = content;
                    break;
                }
            } else {
                const element = $(selector);
                if (element.length) {
                    author = element.text().trim();
                    break;
                }
            }
        }
        
        return {
            id: newsId,
            headline,
            url: `${this.baseUrl}/${newsId}`,
            thumbnail: this.makeAbsoluteUrl(thumbnail),
            summary,
            fullText: fullText.trim(),
            images: images.slice(0, 15),
            category: this.cleanCategory(category),
            publishedDate: this.formatDate(publishedDate),
            author,
            wordCount: fullText.trim().split(/\s+/).length,
            hasFullContent: fullText.length > 300,
            source: 'hirunews.lk',
            timestamp: new Date().toISOString()
        };
    }

    // ✅ WORKING: Get news by category
    async getNewsByCategory(categoryName, limit = 10) {
        const categoryMap = {
            'general': 'General',
            'sports': 'Sports',
            'business': 'Business',
            'entertainment': 'Entertainment',
            'international': 'International',
            'local': 'General'
        };
        
        const category = categoryMap[categoryName.toLowerCase()] || 'General';
        
        // For now, filter from homepage (category pages might need separate scraping)
        const allNews = await this.getLatestNews(50); // Get more to filter
        
        return allNews
            .filter(article => 
                article.category.toLowerCase().includes(category.toLowerCase()) ||
                (category === 'General' && !['Sports', 'Business', 'Entertainment', 'International']
                    .some(cat => article.category.includes(cat)))
            )
            .slice(0, limit);
    }

    // ✅ WORKING: Helper methods
    extractArticleId(url) {
        if (!url) return null;
        const matches = url.match(/\/(\d{6,})\//) || url.match(/\/(\d{6,})$/);
        return matches ? matches[1] : null;
    }

    makeAbsoluteUrl(url) {
        if (!url || url === 'N/A') return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return `https:${url}`;
        if (url.startsWith('/')) return `${this.baseUrl}${url}`;
        return `${this.baseUrl}/${url}`;
    }

    cleanCategory(category) {
        if (!category) return 'General';
        
        const clean = category
            .replace(/[^\w\s]/g, '')
            .trim();
        
        const categoryMap = {
            'general': 'General',
            'sports': 'Sports',
            'business': 'Business',
            'entertainment': 'Entertainment',
            'international': 'International'
        };
        
        return categoryMap[clean.toLowerCase()] || clean || 'General';
    }

    formatDate(dateString) {
        if (!dateString) return new Date().toISOString();
        
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Try parsing different formats
        }
        
        return new Date().toISOString();
    }
}

module.exports = HiruNewsScraper;
