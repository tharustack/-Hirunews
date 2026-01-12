// lib/scraper.js - Complete Hiru News Scraper
const axios = require('axios');
const cheerio = require('cheerio');

class HiruNewsScraper {
    constructor() {
        this.baseUrl = 'https://hirunews.lk';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        };
        
        // Category URL mapping
        this.categoryMap = {
            'general': 'General',
            'local': 'General',
            'international': 'International',
            'entertainment': 'Entertainment',
            'business': 'Business',
            'sports': 'Sports',
            'technology': 'Technology',
            'world': 'International'
        };
        
        // Sinhala month mapping
        this.sinhalaMonths = {
            'ජනවාරි': 'January',
            'පෙබරවාරි': 'February',
            'මාර්තු': 'March',
            'අප්‍රේල්': 'April',
            'මැයි': 'May',
            'ජුනි': 'June',
            'ජූලි': 'July',
            'අගෝස්තු': 'August',
            'සැප්තැම්බර්': 'September',
            'ඔක්තෝබර්': 'October',
            'නොවැම්බර්': 'November',
            'දෙසැම්බර්': 'December'
        };
    }

    /**
     * Fetch and parse a webpage
     * @param {string} url - URL to fetch
     * @returns {Promise<CheerioStatic|null>} Cheerio object or null
     */
    async fetchPage(url) {
        try {
            console.log(`🌐 Fetching: ${url}`);
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 15000,
                validateStatus: status => status === 200
            });
            
            // Check if it's a valid HTML page
            if (!response.data || typeof response.data !== 'string') {
                throw new Error('Invalid response data');
            }
            
            return cheerio.load(response.data);
        } catch (error) {
            console.error(`❌ Error fetching ${url}:`, error.message);
            
            // Return null for 404/not found
            if (error.response && error.response.status === 404) {
                console.log(`📭 Page not found (404): ${url}`);
            }
            
            return null;
        }
    }

    /**
     * Make relative URLs absolute
     * @param {string} url - URL to process
     * @returns {string|null} Absolute URL or null
     */
    makeAbsoluteUrl(url) {
        if (!url || url === 'N/A' || url === '#') {
            return null;
        }
        
        if (url.startsWith('http')) {
            return url;
        }
        
        if (url.startsWith('//')) {
            return `https:${url}`;
        }
        
        if (url.startsWith('/')) {
            return `${this.baseUrl}${url}`;
        }
        
        return `${this.baseUrl}/${url}`;
    }

    /**
     * Clean and standardize category names
     * @param {string} category - Raw category string
     * @returns {string} Clean category name
     */
    cleanCategory(category) {
        if (!category || typeof category !== 'string') {
            return 'General';
        }
        
        const cleaned = category
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        // Map to standardized categories
        for (const [key, value] of Object.entries(this.categoryMap)) {
            if (cleaned.includes(key) || key.includes(cleaned)) {
                return value;
            }
        }
        
        // Return capitalized version if not in map
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    /**
     * Parse and format dates
     * @param {string} dateString - Raw date string
     * @returns {string} ISO format date string
     */
    formatDate(dateString) {
        if (!dateString) {
            return new Date().toISOString();
        }
        
        // Try to parse as ISO date first
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Continue to other parsing methods
        }
        
        // Try to parse Sinhala dates
        for (const [sinhala, english] of Object.entries(this.sinhalaMonths)) {
            if (dateString.includes(sinhala)) {
                try {
                    const englishDate = dateString
                        .replace(sinhala, english)
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    const date = new Date(englishDate);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                } catch (e) {
                    // Continue to next attempt
                }
            }
        }
        
        // Extract date-like patterns
        const datePatterns = [
            /(\d{1,2})\s+(\w+)\s+(\d{4})/i,  // 12 January 2026
            /(\d{4})-(\d{1,2})-(\d{1,2})/,   // 2026-01-12
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/  // 12/01/2026
        ];
        
        for (const pattern of datePatterns) {
            const match = dateString.match(pattern);
            if (match) {
                try {
                    let date;
                    if (pattern.source.includes('/')) {
                        // DD/MM/YYYY format
                        date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                    } else if (pattern.source.includes('-')) {
                        // YYYY-MM-DD format
                        date = new Date(dateString);
                    } else {
                        // 12 January 2026 format
                        date = new Date(dateString);
                    }
                    
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                } catch (e) {
                    // Continue to next pattern
                }
            }
        }
        
        // Return current date as fallback
        return new Date().toISOString();
    }

    /**
     * Get article by ID (main method for API)
     * @param {string|number} newsId - Article ID
     * @returns {Promise<Object>} Article data
     */
    async getArticleById(newsId) {
        console.log(`🔍 Looking for article ID: ${newsId}`);
        
        // Try multiple URL patterns
        const urlPatterns = [
            `${this.baseUrl}/${newsId}`,
            `${this.baseUrl}/news/${newsId}`,
            `${this.baseUrl}/${newsId}/article`,
            `${this.baseUrl}/article/${newsId}`,
            `${this.baseUrl}/en/${newsId}`,
            `${this.baseUrl}/sinhala/${newsId}`,
            `${this.baseUrl}/tm/${newsId}`
        ];
        
        let $ = null;
        let finalUrl = '';
        
        for (const url of urlPatterns) {
            $ = await this.fetchPage(url);
            if ($ && $.text() && !$.text().includes('404') && 
                !$.text().includes('Not Found') && 
                !$.text().includes('Page Not Found')) {
                finalUrl = url;
                console.log(`✅ Found at: ${url}`);
                break;
            }
        }
        
        if (!$) {
            throw new Error(`Article with ID ${newsId} not found`);
        }
        
        return await this.extractArticleData($, newsId, finalUrl);
    }

    /**
     * Extract complete article data from page
     * @param {CheerioStatic} $ - Cheerio object
     * @param {string} newsId - Article ID
     * @param {string} url - Article URL
     * @returns {Promise<Object>} Complete article data
     */
    async extractArticleData($, newsId, url) {
        console.log(`📄 Extracting data from article...`);
        
        // 1. Extract headline
        const headline = this.extractHeadline($);
        
        // 2. Extract thumbnail
        const thumbnail = this.extractThumbnail($);
        
        // 3. Extract summary
        const summary = this.extractSummary($);
        
        // 4. Extract full text
        const fullText = this.extractFullText($);
        
        // 5. Extract images
        const images = this.extractImages($);
        
        // 6. Extract category
        const category = this.extractCategory($);
        
        // 7. Extract published date
        const publishedDate = this.extractPublishedDate($);
        
        // 8. Extract author
        const author = this.extractAuthor($);
        
        return {
            id: newsId.toString(),
            headline,
            url: url,
            thumbnail: this.makeAbsoluteUrl(thumbnail),
            summary,
            fullText,
            images,
            category: this.cleanCategory(category),
            publishedDate: this.formatDate(publishedDate),
            author,
            wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
            hasFullContent: fullText.length > 300,
            source: 'hirunews.lk',
            scrapedAt: new Date().toISOString(),
            language: this.detectLanguage(fullText)
        };
    }

    /**
     * Extract headline from article page
     */
    extractHeadline($) {
        const selectors = [
            'h1.article-title',
            'h1.news-title',
            'h1.title',
            'h1',
            '.title h1',
            '.news-heading h1',
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            '.card-title-featured',
            '.card-title-v1',
            '.card-title-v2',
            '.card-title-v3',
            '.card-title-v4'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content.length > 10) {
                    return content.replace(' - Hiru News', '').trim();
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const text = element.text().trim();
                    if (text && text.length > 10) {
                        return text;
                    }
                }
            }
        }
        
        return 'Headline not available';
    }

    /**
     * Extract thumbnail from article page
     */
    extractThumbnail($) {
        const selectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'meta[property="twitter:image"]',
            '.featured-image img',
            '.article-image img',
            '.news-image img',
            '.image-wrp img',
            'article img:first',
            '.content img:first',
            'img[src*="news_images"]',
            'img[src*="News_Images"]'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content.includes('hirunews')) {
                    return content;
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const src = element.attr('src');
                    if (src && src.includes('hirunews')) {
                        return src;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Extract summary from article page
     */
    extractSummary($) {
        const selectors = [
            'meta[name="description"]',
            'meta[property="og:description"]',
            'meta[name="twitter:description"]',
            '.article-summary',
            '.news-summary',
            '.summary',
            '.excerpt',
            '.description',
            'p:first',
            'article > p:first'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content.length > 20) {
                    return content;
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const text = element.text().trim();
                    if (text && text.length > 20) {
                        return text.substring(0, 250) + (text.length > 250 ? '...' : '');
                    }
                }
            }
        }
        
        return 'Summary not available';
    }

    /**
     * Extract full text from article page
     */
    extractFullText($) {
        const contentSelectors = [
            '.article-content',
            '.story-content',
            '.news-detail',
            '.single-news',
            '.news-content',
            '#content',
            'article',
            '.col-lg-8',
            '.content-wrp',
            '.main-content',
            '.entry-content'
        ];
        
        let fullText = '';
        
        for (const selector of contentSelectors) {
            const container = $(selector);
            if (container.length) {
                // Clone to avoid modifying original
                const content = container.clone();
                
                // Remove unwanted elements
                content.find('script, style, .advertisement, .share-buttons, iframe, .comments, .related-news, .ad, .social-share, .author-box, .tags, .news-meta, .read-more, .btn').remove();
                
                // Get all paragraphs
                const paragraphs = [];
                content.find('p').each((i, el) => {
                    const text = $(el).text().trim();
                    if (text && text.length > 30 && 
                        !text.includes('ADVERTISEMENT') &&
                        !text.includes('adsbygoogle') &&
                        !text.includes('var ') &&
                        !text.match(/^[0-9\W]+$/)) {
                        paragraphs.push(text);
                    }
                });
                
                if (paragraphs.length > 0) {
                    fullText = paragraphs.join('\n\n');
                    break;
                }
            }
        }
        
        // If no paragraphs found, extract all text
        if (!fullText || fullText.length < 100) {
            const bodyText = $('body').text()
                .replace(/\s+/g, ' ')
                .replace(/ADVERTISEMENT.*?ADVERTISEMENT/gi, '')
                .replace(/adsbygoogle.*?adsbygoogle/gi, '')
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .trim();
            
            // Take reasonable amount of text
            fullText = bodyText.substring(0, 10000);
        }
        
        return fullText.trim();
    }

    /**
     * Extract all images from article
     */
    extractImages($) {
        const images = [];
        const seenUrls = new Set();
        
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (!src || seenUrls.has(src)) {
                return;
            }
            
            // Filter out logos, icons, ads
            if (src.includes('hirunews') && 
                !src.includes('logo') && 
                !src.includes('icon') &&
                !src.includes('favicon') &&
                !src.includes('sprite') &&
                !src.includes('ad') &&
                !src.includes('banner') &&
                (src.includes('news_images') || src.includes('News_Images') || src.match(/\.(jpg|jpeg|png|webp|gif)$/i))) {
                
                seenUrls.add(src);
                
                images.push({
                    url: this.makeAbsoluteUrl(src),
                    alt: $(el).attr('alt') || `News image ${images.length + 1}`,
                    caption: $(el).attr('title') || 
                            $(el).closest('figure').find('figcaption').text().trim() ||
                            $(el).closest('div').find('.caption').text().trim(),
                    index: images.length
                });
            }
        });
        
        // Sort by likely relevance (larger images first)
        return images
            .filter(img => img.url)
            .slice(0, 20); // Limit to 20 images
    }

    /**
     * Extract category from article
     */
    extractCategory($) {
        const selectors = [
            '.breadcrumb a:nth-child(2)',
            '.category a',
            '.news-category',
            '.article-category',
            '.cat-links a',
            'meta[property="article:section"]',
            'meta[name="category"]',
            '.update-category',
            '.category-label',
            '.tag'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) {
                    return content;
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const text = element.text().trim();
                    if (text) {
                        return text;
                    }
                }
            }
        }
        
        return 'General';
    }

    /**
     * Extract published date
     */
    extractPublishedDate($) {
        const selectors = [
            'meta[property="article:published_time"]',
            'meta[name="published_date"]',
            'meta[name="date"]',
            '.date',
            '.published-date',
            '.article-date',
            '.news-date',
            'time',
            '.update-wrp-lg',
            '.post-date',
            '.timestamp'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content) {
                    return content;
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const text = element.text().trim();
                    if (text && text.length > 5) {
                        return text;
                    }
                }
            }
        }
        
        return '';
    }

    /**
     * Extract author
     */
    extractAuthor($) {
        const selectors = [
            'meta[name="author"]',
            '.author',
            '.article-author',
            '.byline',
            '.reporter',
            '.writer',
            '.post-author',
            'meta[property="article:author"]'
        ];
        
        for (const selector of selectors) {
            if (selector.startsWith('meta')) {
                const content = $(selector).attr('content');
                if (content && content !== 'Hiru News') {
                    return content;
                }
            } else {
                const element = $(selector).first();
                if (element.length) {
                    const text = element.text().trim();
                    if (text && text !== 'Hiru News' && text.length > 2) {
                        return text;
                    }
                }
            }
        }
        
        return 'Hiru News';
    }

    /**
     * Detect article language
     */
    detectLanguage(text) {
        if (!text) return 'si'; // Default to Sinhala
        
        // Simple detection based on character ranges
        const sinhalaChars = text.match(/[\u0D80-\u0DFF]/g);
        const englishChars = text.match(/[a-zA-Z]/g);
        
        if (sinhalaChars && englishChars) {
            return sinhalaChars.length > englishChars.length ? 'si' : 'en';
        } else if (sinhalaChars) {
            return 'si';
        } else if (englishChars) {
            return 'en';
        }
        
        return 'si'; // Default
    }

    /**
     * Get breaking news from homepage
     */
    async getBreakingNews(limit = 10) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const breakingNews = [];
        
        // 1. Check breaking news marquee
        $('.news-marquee a, .news-ticker a, .breaking-news a').each((i, el) => {
            if (breakingNews.length >= limit) return false;
            
            const headline = $(el).text().trim();
            const url = $(el).attr('href');
            
            if (headline && url && headline.length > 10) {
                breakingNews.push({
                    headline,
                    url: this.makeAbsoluteUrl(url),
                    isBreaking: true,
                    timestamp: new Date().toISOString(),
                    type: 'marquee'
                });
            }
        });

        // 2. Check featured/top story
        const featured = $('.card-featured, .top-story, .featured-news');
        if (featured.length && breakingNews.length < limit) {
            const headline = featured.find('.title, h3, h4').first().text().trim();
            const url = featured.find('a').attr('href');
            
            if (headline && url) {
                breakingNews.unshift({ // Add to beginning
                    headline,
                    url: this.makeAbsoluteUrl(url),
                    isBreaking: true,
                    timestamp: new Date().toISOString(),
                    type: 'featured'
                });
            }
        }

        return breakingNews.slice(0, limit);
    }

    /**
     * Get latest news from homepage
     */
    async getLatestNews(limit = 15) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const articles = [];
        
        // Collect all potential article links
        $('a[href*="/news/"], a[href*="/sports/"], a[href*="/business/"], a[href*="/entertainment/"]').each((i, el) => {
            if (articles.length >= limit * 2) return false; // Get extra for filtering
            
            const $el = $(el);
            const url = $el.attr('href');
            const headline = $el.find('.title, h3, h4, .card-title-v1, .card-title-v2, .card-title-v3').text().trim() || 
                           $el.text().substring(0, 100).trim();
            const thumbnail = $el.find('img').attr('src');
            const summary = $el.find('.description, .summary').text().trim();
            
            if (url && headline && headline.length > 10 && 
                !url.includes('#') && 
                !headline.includes('ADVERTISEMENT')) {
                
                articles.push({
                    headline,
                    url: this.makeAbsoluteUrl(url),
                    thumbnail: this.makeAbsoluteUrl(thumbnail),
                    summary: summary || headline.substring(0, 150) + '...',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Remove duplicates based on URL
        const uniqueArticles = [];
        const seenUrls = new Set();
        
        for (const article of articles) {
            if (!seenUrls.has(article.url) && uniqueArticles.length < limit) {
                seenUrls.add(article.url);
                uniqueArticles.push(article);
            }
        }

        return uniqueArticles;
    }

    /**
     * Get news by category
     */
    async getNewsByCategory(category, limit = 15) {
        const categoryName = this.categoryMap[category.toLowerCase()] || 'General';
        const categoryUrl = `${this.baseUrl}/news_listing.php?category=${categoryName}`;
        
        console.log(`📂 Fetching category: ${categoryName} from ${categoryUrl}`);
        
        const $ = await this.fetchPage(categoryUrl);
        if (!$) return [];

        const articles = [];
        const articlePromises = [];
        
        // Find article links on category page
        $('a[href*="/news/"], a[href*="/sports/"], a[href*="/business/"], a[href*="/entertainment/"]').each((i, el) => {
            if (articles.length >= limit) return false;
            
            const $el = $(el);
            const url = $el.attr('href');
            const headline = $el.find('h3, h4, .title').text().trim() || 
                           $el.text().trim();
            const thumbnail = $el.find('img').attr('src');
            
            if (url && headline && !url.includes('#') && url.includes('/')) {
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                
                // Get basic info
                const articleData = {
                    headline,
                    url: fullUrl,
                    thumbnail: this.makeAbsoluteUrl(thumbnail),
                    category: categoryName,
                    basic: true
                };
                
                articles.push(articleData);
                
                // Queue full article fetch
                articlePromises.push(
                    this.getArticleById(this.extractArticleId(fullUrl))
                        .catch(err => {
                            console.error(`Failed to fetch full article: ${err.message}`);
                            return null;
                        })
                );
            }
        });

        // Fetch full details
        const fullArticles = await Promise.all(articlePromises);
        
        // Merge basic and full data
        return articles.map((basic, index) => {
            const full = fullArticles[index];
            if (full && !full.error) {
                return {
                    ...basic,
                    ...full,
                    basic: undefined
                };
            }
            return {
                ...basic,
                fullText: 'Failed to load full article',
                images: [],
                author: 'Unknown',
                publishedDate: new Date().toISOString(),
                hasFullContent: false
            };
        }).filter(article => article !== null);
    }

    /**
     * Extract article ID from URL
     */
    extractArticleId(url) {
        if (!url) return null;
        
        // Try to extract numeric ID
        const matches = url.match(/\/(\d{5,})\//) || url.match(/\/(\d{5,})$/);
        if (matches && matches[1]) {
            return matches[1];
        }
        
        // Fallback: use last numeric part of URL
        const parts = url.split('/').filter(part => part.length > 0);
        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^\d+$/.test(parts[i])) {
                return parts[i];
            }
        }
        
        return null;
    }

    /**
     * Get news by date (simplified - uses homepage structure)
     */
    async getNewsByDate(dateString, limit = 10) {
        // Note: This is a simplified version since Hiru News doesn't have direct date URLs
        // In production, you might need to scrape archive pages
        
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const targetDate = new Date(dateString);
        const articles = [];
        
        // Extract dates from articles on homepage
        $('.update-wrp-lg, .date, time').each((i, el) => {
            if (articles.length >= limit) return false;
            
            const dateText = $(el).text().trim();
            const articleDate = this.formatDate(dateText);
            
            // Check if date matches (same day)
            if (new Date(articleDate).toDateString() === targetDate.toDateString()) {
                // Find the closest article element
                const articleElement = $(el).closest('a, .card-v1, .card-v2, .card-v3, article');
                if (articleElement.length) {
                    const url = articleElement.attr('href');
                    const headline = articleElement.find('.title, h3, h4').text().trim();
                    
                    if (url && headline) {
                        articles.push({
                            headline,
                            url: this.makeAbsoluteUrl(url),
                            publishedDate: articleDate,
                            dateMatch: true
                        });
                    }
                }
            }
        });

        return articles;
    }

    /**
     * Search news (simplified - uses text matching)
     */
    async searchNews(query, limit = 10) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const searchResults = [];
        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
        
        if (searchTerms.length === 0) {
            return [];
        }
        
        // Search through article titles and summaries
        $('a[href*="/news/"], a[href*="/sports/"], a[href*="/business/"], a[href*="/entertainment/"]').each((i, el) => {
            if (searchResults.length >= limit) return false;
            
            const $el = $(el);
            const headline = $el.find('.title, h3, h4, .card-title-v1, .card-title-v2, .card-title-v3').text().trim() || 
                           $el.text().trim();
            const summary = $el.find('.description, .summary').text().trim();
            const url = $el.attr('href');
            
            if (!headline || !url) return;
            
            const textToSearch = (headline + ' ' + summary).toLowerCase();
            
            // Check if all search terms are present
            const matches = searchTerms.every(term => textToSearch.includes(term));
            
            if (matches) {
                searchResults.push({
                    headline,
                    url: this.makeAbsoluteUrl(url),
                    summary: summary || headline.substring(0, 150) + '...',
                    relevance: this.calculateRelevance(textToSearch, searchTerms),
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Sort by relevance
        return searchResults
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
    }

    /**
     * Calculate search relevance score
     */
    calculateRelevance(text, searchTerms) {
        let score = 0;
        
        for (const term of searchTerms) {
            const occurrences = (text.match(new RegExp(term, 'g')) || []).length;
            score += occurrences * 10;
            
            // Bonus for term at the beginning
            if (text.startsWith(term)) {
                score += 5;
            }
        }
        
        return score;
    }
}

// Export the scraper class
module.exports = HiruNewsScraper;
