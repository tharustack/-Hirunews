const axios = require('axios');
const cheerio = require('cheerio');

class HiruNewsScraper {
    constructor() {
        this.baseUrl = 'https://hirunews.lk';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };
    }

    async fetchPage(url) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 15000 
            });
            return cheerio.load(response.data);
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            return null;
        }
    }

    async getLatestNews(limit = 10) {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const articles = [];
        const articlePromises = [];
        
        // Get all article links from homepage
        $('a.card-v1, a.card-v2, a.card-v3, a[href*="/news/"]').each((i, el) => {
            if (articles.length >= limit) return false;
            
            const url = $(el).attr('href');
            if (url && url.includes('/news/') || url.match(/\/\d{6}\//)) {
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                
                // Extract basic info from homepage card
                const headline = $(el).find('.card-title-v1, .card-title-v2, .card-title-v3, h4').text().trim() || 
                                $(el).text().trim().substring(0, 100);
                const thumbnail = $(el).find('img').attr('src');
                const summary = $(el).find('.description').text().trim() || 
                              headline.substring(0, 150) + '...';
                
                // Store basic info and queue full article fetch
                const articleData = {
                    headline,
                    url: fullUrl,
                    thumbnail: this.makeAbsoluteUrl(thumbnail),
                    summary,
                    basic: true // Mark as basic (needs full fetch)
                };
                
                articles.push(articleData);
                articlePromises.push(this.getFullArticle(fullUrl));
            }
        });

        // Fetch all full articles in parallel
        const fullArticles = await Promise.all(articlePromises);
        
        // Merge basic info with full details
        return articles.map((basic, index) => ({
            ...basic,
            ...fullArticles[index],
            basic: undefined // Remove the flag
        }));
    }

    async getFullArticle(articleUrl) {
        console.log(`📄 Fetching full article: ${articleUrl}`);
        const $ = await this.fetchPage(articleUrl);
        if (!$) return { error: 'Failed to fetch article' };

        // Extract full article content
        const contentSelectors = [
            '.article-content',
            '.story-content',
            '.news-detail',
            '.single-news',
            '#content',
            'article'
        ];

        let fullText = '';
        let articleContainer = null;

        for (const selector of contentSelectors) {
            articleContainer = $(selector);
            if (articleContainer.length) break;
        }

        if (articleContainer && articleContainer.length) {
            // Remove unwanted elements (ads, share buttons, etc.)
            articleContainer.find('script, style, .advertisement, .share-buttons, iframe').remove();
            
            // Get all paragraphs
            articleContainer.find('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 10 && !text.includes('ADVERTISEMENT')) {
                    fullText += text + '\n\n';
                }
            });

            // If no paragraphs found, get all text
            if (!fullText) {
                fullText = articleContainer.text()
                    .replace(/\s+/g, ' ')
                    .trim();
            }
        }

        // Extract all images from article
        const images = [];
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.includes('logo') && !src.includes('icon') && 
                !src.includes('ad') && src.includes('hirunews')) {
                images.push({
                    url: this.makeAbsoluteUrl(src),
                    alt: $(el).attr('alt') || '',
                    caption: $(el).attr('title') || $(el).attr('alt') || ''
                });
            }
        });

        // Get category from article page (usually in breadcrumb or metadata)
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
                const metaCat = $(selector).attr('content');
                if (metaCat) {
                    category = metaCat;
                    break;
                }
            } else {
                const catElem = $(selector);
                if (catElem.length) {
                    category = catElem.first().text().trim();
                    break;
                }
            }
        }

        // Get published date
        let publishedDate = '';
        const dateSelectors = [
            'meta[property="article:published_time"]',
            '.date',
            '.published-date',
            'time'
        ];

        for (const selector of dateSelectors) {
            if (selector.startsWith('meta')) {
                const metaDate = $(selector).attr('content');
                if (metaDate) {
                    publishedDate = metaDate;
                    break;
                }
            } else {
                const dateElem = $(selector);
                if (dateElem.length) {
                    publishedDate = dateElem.first().text().trim();
                    break;
                }
            }
        }

        // Get author
        let author = 'Hiru News';
        const authorSelectors = [
            'meta[name="author"]',
            '.author',
            '.byline',
            '.reporter'
        ];

        for (const selector of authorSelectors) {
            if (selector.startsWith('meta')) {
                const metaAuthor = $(selector).attr('content');
                if (metaAuthor) {
                    author = metaAuthor;
                    break;
                }
            } else {
                const authorElem = $(selector);
                if (authorElem.length) {
                    author = authorElem.first().text().trim();
                    break;
                }
            }
        }

        return {
            fullText: fullText.trim(),
            images: images.slice(0, 10), // Limit to 10 images
            category: this.cleanCategory(category),
            publishedDate: this.formatDate(publishedDate),
            author: author,
            wordCount: fullText.trim().split(/\s+/).length,
            hasFullContent: fullText.length > 100
        };
    }

    async getNewsByCategory(categoryName, limit = 10) {
        const categoryMap = {
            'general': 'General',
            'local': 'General',
            'international': 'International',
            'entertainment': 'Entertainment',
            'business': 'Business',
            'sports': 'Sports'
        };

        const category = categoryMap[categoryName.toLowerCase()] || 'General';
        const categoryUrl = `${this.baseUrl}/news_listing.php?category=${category}`;
        
        console.log(`📂 Fetching category: ${category} from ${categoryUrl}`);
        const $ = await this.fetchPage(categoryUrl);
        if (!$) return [];

        const articles = [];
        const articlePromises = [];
        
        // Find article links on category page
        $('a[href*="/news/"], a[href*="/sports/"], a[href*="/business/"], a[href*="/entertainment/"]').each((i, el) => {
            if (articles.length >= limit) return false;
            
            const url = $(el).attr('href');
            const headline = $(el).find('h3, h4, .title').text().trim() || 
                           $(el).text().trim();
            const thumbnail = $(el).find('img').attr('src');
            
            if (url && headline && !url.includes('#') && url.includes('/')) {
                const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                
                articles.push({
                    headline,
                    url: fullUrl,
                    thumbnail: this.makeAbsoluteUrl(thumbnail),
                    category: category,
                    basic: true
                });
                
                articlePromises.push(this.getFullArticle(fullUrl));
            }
        });

        // Fetch full details for all articles
        const fullArticles = await Promise.all(articlePromises);
        
        return articles.map((basic, index) => ({
            ...basic,
            ...fullArticles[index],
            basic: undefined
        }));
    }

    async getBreakingNews() {
        const $ = await this.fetchPage(this.baseUrl);
        if (!$) return [];

        const breakingNews = [];
        
        // Check for breaking news banner/marquee
        $('.breaking-news, .news-ticker, .alert, .marquee').each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 10) {
                breakingNews.push({
                    headline: text,
                    isBreaking: true,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Also check top featured story
        const featured = $('.card-featured');
        if (featured.length) {
            const headline = featured.find('.card-title-featured').text().trim();
            if (headline) {
                breakingNews.push({
                    headline,
                    isBreaking: true,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return breakingNews.slice(0, 5);
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
        return category.replace(/[^\w\s]/g, '').trim() || 'General';
    }

    formatDate(dateString) {
        if (!dateString) return new Date().toISOString();
        
        // Try to parse various date formats
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        
        // Handle Sinhala dates
        const sinhalaMonths = {
            'ජනවාරි': 'January', 'පෙබරවාරි': 'February', 'මාර්තු': 'March',
            'අප්‍රේල්': 'April', 'මැයි': 'May', 'ජුනි': 'June',
            'ජූලි': 'July', 'අගෝස්තු': 'August', 'සැප්තැම්බර්': 'September',
            'ඔක්තෝබර්': 'October', 'නොවැම්බර්': 'November', 'දෙසැම්බර්': 'December'
        };

        for (const [sinhala, english] of Object.entries(sinhalaMonths)) {
            if (dateString.includes(sinhala)) {
                const englishDate = dateString.replace(sinhala, english);
                const parsed = new Date(englishDate);
                if (!isNaN(parsed.getTime())) {
                    return parsed.toISOString();
                }
            }
        }

        return new Date().toISOString();
    }
}

module.exports = HiruNewsScraper;
