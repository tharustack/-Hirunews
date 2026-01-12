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
// Update the extractFullArticle method in your scraper.js
async extractFullArticle($, newsId) {
    console.log(`📄 Extracting full article content for ID: ${newsId}`);
    
    // 1. Get headline - FIXED
    const headline = $('h1').first().text().trim() || 
                    $('.article-title, .news-title, .title').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') ||
                    $('title').text().replace(' - Hiru News', '').trim();
    
    // 2. Get thumbnail - FIXED
    const thumbnail = $('meta[property="og:image"]').attr('content') ||
                     $('meta[name="twitter:image"]').attr('content') ||
                     $('img[src*="News_Images"]').first().attr('src') ||
                     $('article img').first().attr('src');
    
    // 3. Get summary - FIXED
    const summary = $('meta[name="description"]').attr('content') ||
                   $('meta[property="og:description"]').attr('content') ||
                   $('.description, .summary, .excerpt').first().text().trim() ||
                   '';
    
    // 4. FIXED: Get full text - BETTER SELECTORS
    let fullText = '';
    
    // Try multiple content container selectors
    const contentSelectors = [
        '.article-content',
        '.story-content',
        '.news-detail',
        '.single-news',
        '.news-content',
        '#content',
        'article',
        '.content-wrp',
        '.col-lg-8',
        '.main-content',
        '.entry-content',
        '.post-content',
        '.story-body'
    ];
    
    for (const selector of contentSelectors) {
        const container = $(selector);
        if (container.length) {
            console.log(`✅ Found content container with: ${selector}`);
            
            // Clone to avoid modifying original
            const content = container.clone();
            
            // Remove unwanted elements
            content.find('script, style, .advertisement, .share-buttons, iframe, .comments, .related-news, .ad, .social-share, .author-box, .tags, .news-meta').remove();
            
            // Get all text elements, not just paragraphs
            const textElements = content.find('p, div, span').filter(function() {
                return $(this).text().trim().length > 30 && 
                       !$(this).hasClass('ad') &&
                       !$(this).text().includes('ADVERTISEMENT');
            });
            
            if (textElements.length > 0) {
                textElements.each((i, el) => {
                    const text = $(el).text().trim();
                    if (text.length > 30) {
                        fullText += text + '\n\n';
                    }
                });
                
                if (fullText.length > 300) {
                    console.log(`✅ Extracted ${fullText.length} characters`);
                    break;
                }
            }
        }
    }
    
    // 5. FALLBACK: If no text found, try getting all text from body
    if (!fullText || fullText.length < 300) {
        console.log('⚠️ Using fallback text extraction');
        
        // Get the main article area
        const mainContent = $('body').clone();
        
        // Remove navigation, headers, footers, ads
        mainContent.find('header, footer, nav, aside, .header, .footer, .navigation, .sidebar, .ad, iframe, script, style').remove();
        
        // Get all text
        const allText = mainContent.text()
            .replace(/\s+/g, ' ')
            .replace(/ADVERTISEMENT.*?ADVERTISEMENT/gi, '')
            .replace(/adsbygoogle.*?adsbygoogle/gi, '')
            .trim();
        
        // Extract a reasonable amount (first 8000 chars)
        fullText = allText.substring(0, 8000);
        
        // Try to find the article content by looking for the headline
        const headlineIndex = fullText.indexOf(headline.substring(0, 50));
        if (headlineIndex !== -1) {
            fullText = fullText.substring(headlineIndex);
        }
    }
    
    // 6. Clean up the text
    fullText = fullText
        .replace(/\n\s*\n/g, '\n\n') // Remove extra newlines
        .replace(/\s+/g, ' ')         // Normalize spaces
        .trim();
    
    // 7. FIXED: Extract category properly
    let category = 'General';
    const categorySelectors = [
        'meta[property="article:section"]',
        '.breadcrumb a:nth-child(2)',
        '.category a',
        '.news-category',
        '.article-category',
        '.cat-links a',
        'meta[name="category"]',
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
            const element = $(selector).first();
            if (element.length) {
                const text = element.text().trim();
                if (text) {
                    category = text;
                    break;
                }
            }
        }
    }
    
    // 8. FIXED: Extract images (remove duplicates)
    const images = [];
    const seenUrls = new Set();
    
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (!src || seenUrls.has(src)) return;
        
        if (src.includes('hirunews') && 
            !src.includes('logo') && 
            !src.includes('icon') &&
            !src.includes('favicon') &&
            !src.includes('sprite') &&
            !src.includes('ad') &&
            !src.includes('banner')) {
            
            seenUrls.add(src);
            
            images.push({
                url: this.makeAbsoluteUrl(src),
                alt: $(el).attr('alt') || `News image ${images.length + 1}`,
                caption: $(el).attr('title') || $(el).closest('figure').find('figcaption').text().trim()
            });
        }
    });
    
    // Remove duplicate images by URL
    const uniqueImages = [];
    const uniqueUrls = new Set();
    
    images.forEach(img => {
        if (!uniqueUrls.has(img.url)) {
            uniqueUrls.add(img.url);
            uniqueImages.push(img);
        }
    });
    
    // 9. Get author and date
    let author = 'Hiru News';
    let publishedDate = new Date().toISOString();
    
    // Author selectors
    const authorSelectors = [
        'meta[name="author"]',
        '.author',
        '.article-author',
        '.byline',
        '.reporter',
        '.writer'
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
                const text = element.text().trim();
                if (text) {
                    author = text;
                    break;
                }
            }
        }
    }
    
    // Date selectors
    const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="published_date"]',
        '.date',
        '.published-date',
        '.article-date',
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
                const text = element.text().trim();
                if (text) {
                    publishedDate = text;
                    break;
                }
            }
        }
    }
    
    // Clean category (remove duplicates)
    const cleanCategory = this.cleanCategory(category)
        .replace(/(\w+)\1+/g, '$1'); // Remove repeated words
    
    return {
        id: newsId,
        headline,
        url: `${this.baseUrl}/${newsId}`,
        thumbnail: this.makeAbsoluteUrl(thumbnail),
        summary: summary || headline.substring(0, 200) + '...',
        fullText,
        images: uniqueImages.slice(0, 10), // Limit to 10 unique images
        category: cleanCategory,
        publishedDate: this.formatDate(publishedDate),
        author,
        wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
        hasFullContent: fullText.length > 300,
        source: 'hirunews.lk',
        timestamp: new Date().toISOString()
    };
}

// Also update the cleanCategory method to handle duplicates:
cleanCategory(category) {
    if (!category) return 'General';
    
    // Remove duplicate words
    const words = category.split(/(?=[A-Z])/).filter(word => word.trim());
    const uniqueWords = [...new Set(words)];
    
    const cleanCat = uniqueWords.join('') || category;
    
    const categoryMap = {
        'general': 'General',
        'sports': 'Sports',
        'business': 'Business',
        'entertainment': 'Entertainment',
        'international': 'International',
        'local': 'Local'
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
        if (cleanCat.toLowerCase().includes(key)) {
            return value;
        }
    }
    
    return cleanCat || 'General';
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
