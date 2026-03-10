const crypto = require('crypto');
const { Op } = require('sequelize');
const {
    Post,
    Comment,
    Blog,
    Hashtag,
    PostHashtag,
    Group
} = require('../models');
const elasticsearchService = require('../services/elasticsearchService');

const memorySearchHistory = new Map();
const memorySavedSearches = new Map();

const toInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const safeText = (value) => String(value || '').trim();

const normalizeText = (value) =>
    safeText(value)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[\u0000-\u001f]/g, '')
        .trim();

const tokenize = (value) =>
    normalizeText(value)
        .split(/[^a-z0-9#@]+/i)
        .filter((token) => token.length > 1);

const dedupeByFingerprint = (items, fingerprintSelector) => {
    const seen = new Set();
    const deduped = [];

    for (const item of items) {
        const fingerprint = normalizeText(fingerprintSelector(item));
        if (!fingerprint) {
            deduped.push(item);
            continue;
        }
        if (seen.has(fingerprint)) {
            continue;
        }
        seen.add(fingerprint);
        deduped.push(item);
    }

    return deduped;
};

const buildSnippet = (text, query, radius = 80) => {
    const source = safeText(text);
    if (!source) return '';

    const terms = tokenize(query);
    if (terms.length === 0) {
        return source.length > 170 ? `${source.slice(0, 167)}...` : source;
    }

    const lower = source.toLowerCase();
    let bestIndex = -1;
    let bestTerm = '';

    for (const term of terms) {
        const idx = lower.indexOf(term.toLowerCase());
        if (idx >= 0 && (bestIndex === -1 || idx < bestIndex)) {
            bestIndex = idx;
            bestTerm = term;
        }
    }

    if (bestIndex === -1) {
        return source.length > 170 ? `${source.slice(0, 167)}...` : source;
    }

    const start = Math.max(0, bestIndex - radius);
    const end = Math.min(source.length, bestIndex + bestTerm.length + radius);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < source.length ? '...' : '';
    const snippet = source.slice(start, end);

    // Plain text highlight markers; UI can style if desired
    const highlighted = snippet.replace(new RegExp(`(${bestTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '[[$1]]');

    return `${prefix}${highlighted}${suffix}`;
};

const scoreSemantic = (query, haystack) => {
    const qTokens = new Set(tokenize(query));
    if (qTokens.size === 0) return 0;

    const hTokens = new Set(tokenize(haystack));
    if (hTokens.size === 0) return 0;

    let overlap = 0;
    for (const token of qTokens) {
        if (hTokens.has(token)) overlap += 1;
    }

    const union = new Set([...qTokens, ...hTokens]).size;
    const jaccard = union === 0 ? 0 : overlap / union;

    const phraseBoost = normalizeText(haystack).includes(normalizeText(query)) ? 0.25 : 0;
    return jaccard + phraseBoost;
};

const parseNaturalLanguage = (query, dateFrom, dateTo) => {
    const raw = safeText(query);
    const now = new Date();

    let inferredFrom = dateFrom ? new Date(dateFrom) : null;
    let inferredTo = dateTo ? new Date(dateTo) : null;

    let cleanQuery = raw;

    const stripAndApply = (pattern, fromBuilder, toBuilder) => {
        if (!pattern.test(cleanQuery)) return;
        cleanQuery = cleanQuery.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
        inferredFrom = fromBuilder(now);
        inferredTo = toBuilder(now);
    };

    stripAndApply(/\b(today)\b/i,
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        (d) => new Date(d));

    stripAndApply(/\b(yesterday)\b/i,
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1),
        (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));

    stripAndApply(/\b(last\s+7\s+days|last\s+week)\b/i,
        (d) => new Date(d.getTime() - (7 * 24 * 60 * 60 * 1000)),
        (d) => new Date(d));

    stripAndApply(/\b(this\s+month)\b/i,
        (d) => new Date(d.getFullYear(), d.getMonth(), 1),
        (d) => new Date(d));

    return {
        cleanQuery,
        dateFrom: inferredFrom,
        dateTo: inferredTo,
        interpreted: cleanQuery !== raw || Boolean(inferredFrom || inferredTo)
    };
};

const sortItems = (items, sortBy) => {
    const sorted = [...items];

    if (sortBy === 'date') {
        sorted.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
        return sorted;
    }

    if (sortBy === 'popularity') {
        sorted.sort((a, b) => {
            const aScore = (a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.views || 0);
            const bScore = (b.likes || 0) + (b.comments || 0) + (b.shares || 0) + (b.views || 0);
            return bScore - aScore;
        });
        return sorted;
    }

    // relevance / semantic fallback
    sorted.sort((a, b) => (b._score || 0) - (a._score || 0));
    return sorted;
};

const readHistoryFromMemory = (userId) => memorySearchHistory.get(userId) || [];

const writeHistoryToMemory = (userId, history) => {
    memorySearchHistory.set(userId, history.slice(0, 20));
};

const getHistory = async (redis, userId) => {
    if (!redis) {
        return readHistoryFromMemory(userId);
    }

    const key = `search:history:${userId}`;
    const entries = await redis.lrange(key, 0, 19);
    return entries.map((entry) => {
        try {
            return JSON.parse(entry);
        } catch {
            return null;
        }
    }).filter(Boolean);
};

const saveHistory = async (redis, userId, entry) => {
    if (!redis) {
        const existing = readHistoryFromMemory(userId);
        const merged = [entry, ...existing.filter((h) => !(h.query === entry.query && h.type === entry.type))];
        writeHistoryToMemory(userId, merged);
        return;
    }

    const key = `search:history:${userId}`;
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 19);
    await redis.expire(key, 30 * 24 * 60 * 60);
};

const readSavedFromMemory = (userId) => memorySavedSearches.get(userId) || [];

const writeSavedToMemory = (userId, saved) => {
    memorySavedSearches.set(userId, saved);
};

const getSavedSearches = async (redis, userId) => {
    if (!redis) {
        return readSavedFromMemory(userId);
    }

    const key = `search:saved:${userId}`;
    const entries = await redis.lrange(key, 0, 99);
    return entries.map((entry) => {
        try {
            return JSON.parse(entry);
        } catch {
            return null;
        }
    }).filter(Boolean);
};

const setSavedSearches = async (redis, userId, savedSearches) => {
    if (!redis) {
        writeSavedToMemory(userId, savedSearches);
        return;
    }

    const key = `search:saved:${userId}`;
    await redis.del(key);
    if (savedSearches.length > 0) {
        await redis.rpush(key, ...savedSearches.map((item) => JSON.stringify(item)));
    }
    await redis.expire(key, 90 * 24 * 60 * 60);
};

const fetchCollaborationResults = async (query, limit) => {
    const baseUrl = process.env.COLLABORATION_SERVICE_URL || 'http://collaboration-service:8004';

    try {
        const [docsRes, wikiRes] = await Promise.all([
            fetch(`${baseUrl}/public/docs`),
            fetch(`${baseUrl}/public/wiki`)
        ]);

        const docs = docsRes.ok ? await docsRes.json() : [];
        const wikis = wikiRes.ok ? await wikiRes.json() : [];

        const terms = tokenize(query);
        const matchByQuery = (item) => {
            if (terms.length === 0) return true;
            const haystack = normalizeText(`${item.title || ''} ${item.content || ''}`);
            return terms.some((term) => haystack.includes(term));
        };

        const documents = docs
            .filter(matchByQuery)
            .slice(0, limit)
            .map((doc) => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                updatedAt: doc.updatedAt,
                visibility: doc.visibility,
                type: 'document',
                snippet: buildSnippet(doc.content || doc.title, query),
                _score: scoreSemantic(query, `${doc.title || ''} ${doc.content || ''}`)
            }));

        const wikiPages = wikis
            .filter(matchByQuery)
            .slice(0, limit)
            .map((wiki) => ({
                id: wiki.id,
                title: wiki.title,
                content: wiki.content,
                slug: wiki.slug,
                updatedAt: wiki.updatedAt,
                visibility: wiki.visibility,
                type: 'wiki',
                snippet: buildSnippet(wiki.content || wiki.title, query),
                _score: scoreSemantic(query, `${wiki.title || ''} ${wiki.content || ''}`)
            }));

        return {
            documents,
            wikis: wikiPages
        };
    } catch (error) {
        return {
            documents: [],
            wikis: []
        };
    }
};

const buildElasticSearchPayload = async ({
    query,
    type,
    sortBy,
    limit,
    offset,
    dateFrom,
    dateTo,
    authorId,
    mode,
    dedupe
}) => {
    const parsed = parseNaturalLanguage(query, dateFrom, dateTo);
    const effectiveQuery = parsed.cleanQuery;
    const searchLimit = clamp(limit, 1, 100);
    const searchOffset = Math.max(offset, 0);

    const elasticType = ['all', 'posts', 'blogs', 'documents', 'wikis'].includes(type) ? type : 'all';

    const elasticResponse = await elasticsearchService.search({
        query: effectiveQuery,
        type: elasticType,
        limit: searchLimit,
        offset: searchOffset,
        sortBy,
        mode,
        dateFrom: parsed.dateFrom ? parsed.dateFrom.toISOString() : undefined,
        dateTo: parsed.dateTo ? parsed.dateTo.toISOString() : undefined,
        authorId,
    });

    if (!elasticResponse?.available) {
        return null;
    }

    let posts = [];
    let blogs = [];
    let documents = [];
    let wikis = [];

    for (const hit of elasticResponse.hits || []) {
        const source = hit.source || {};
        const mapped = {
            id: source.id,
            title: source.title,
            content: source.content,
            description: source.description,
            snippet: hit.snippet || buildSnippet(source.content || source.description || source.title, effectiveQuery),
            highlights: Object.values(hit.highlight || {}).flatMap((entries) => entries || []),
            _score: hit.score,
            userId: source.authorId,
            visibility: source.visibility,
            category: source.category,
            likes: source.likes,
            comments: source.comments,
            shares: source.shares,
            views: source.views,
            createdAt: source.createdAt,
            updatedAt: source.updatedAt,
            source: 'elasticsearch',
            searchEngine: 'elasticsearch',
        };

        if (source.type === 'post') posts.push(mapped);
        if (source.type === 'blog') blogs.push(mapped);
        if (source.type === 'document') documents.push({ ...mapped, type: 'document' });
        if (source.type === 'wiki') wikis.push({ ...mapped, type: 'wiki' });
    }

    if (dedupe) {
        posts = dedupeByFingerprint(posts, (item) => item.content || item.snippet || item.id);
        blogs = dedupeByFingerprint(blogs, (item) => `${item.title || ''} ${item.content || ''}`);
        documents = dedupeByFingerprint(documents, (item) => `${item.title || ''} ${item.content || ''}`);
        wikis = dedupeByFingerprint(wikis, (item) => `${item.title || ''} ${item.content || ''}`);
    }

    const results = {
        posts: { items: posts, count: posts.length },
        comments: { items: [], count: 0 },
        blogs: { items: blogs, count: blogs.length },
        documents: { items: documents, count: documents.length },
        wikis: { items: wikis, count: wikis.length },
        hashtags: { items: [], count: 0 },
        hashtagPosts: { items: [], count: 0 },
    };

    const total = Object.values(results).reduce((sum, bucket) => sum + (bucket.count || 0), 0);
    const topType = Object.entries(results)
        .sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))[0]?.[0] || 'results';

    return {
        query: effectiveQuery,
        engine: 'elasticsearch',
        mode,
        parsedQuery: {
            interpreted: parsed.interpreted,
            original: query,
            normalized: effectiveQuery,
            dateFrom: parsed.dateFrom ? parsed.dateFrom.toISOString() : null,
            dateTo: parsed.dateTo ? parsed.dateTo.toISOString() : null,
        },
        summary: total === 0
            ? 'No Elasticsearch matches found. Try broader keywords or switch to keyword search.'
            : `Found ${total} Elasticsearch result${total === 1 ? '' : 's'}. Top category: ${topType}.`,
        facets: {
            types: (elasticResponse.facets?.types || []).map((bucket) => ({
                type: bucket.value === 'post' ? 'posts' : `${bucket.value}s`.replace('documentss', 'documents').replace('wikis', 'wikis'),
                count: bucket.count,
            })),
            authors: elasticResponse.facets?.authors || [],
            dateRange: {
                from: parsed.dateFrom ? parsed.dateFrom.toISOString() : null,
                to: parsed.dateTo ? parsed.dateTo.toISOString() : null,
            },
        },
        results,
        meta: {
            limit: searchLimit,
            offset: searchOffset,
            sortBy,
            dedupe,
        },
    };
};

const buildSearchPayload = async ({
    query,
    type,
    sortBy,
    limit,
    offset,
    dateFrom,
    dateTo,
    authorId,
    hashtag,
    mode,
    dedupe
}) => {
    const parsed = parseNaturalLanguage(query, dateFrom, dateTo);
    const effectiveQuery = parsed.cleanQuery;

    const searchLimit = clamp(limit, 1, 100);
    const searchOffset = Math.max(offset, 0);
    const includeAll = type === 'all';

    const dateClause = {};
    if (parsed.dateFrom instanceof Date && !Number.isNaN(parsed.dateFrom.getTime())) {
        dateClause[Op.gte] = parsed.dateFrom;
    }
    if (parsed.dateTo instanceof Date && !Number.isNaN(parsed.dateTo.getTime())) {
        dateClause[Op.lte] = parsed.dateTo;
    }

    const applyDateClause = Object.keys(dateClause).length > 0;

    const postWhere = { isPublished: true };
    const commentWhere = {};
    const blogWhere = { status: 'published' };

    if (applyDateClause) {
        postWhere.createdAt = dateClause;
        commentWhere.createdAt = dateClause;
        blogWhere.publishedAt = dateClause;
    }

    if (authorId) {
        postWhere.userId = authorId;
        commentWhere.userId = authorId;
        blogWhere.userId = authorId;
    }

    const hasQuery = safeText(effectiveQuery).length > 0;

    if (hasQuery && mode !== 'semantic') {
        postWhere[Op.or] = [{ content: { [Op.iLike]: `%${effectiveQuery}%` } }];
        commentWhere[Op.or] = [{ content: { [Op.iLike]: `%${effectiveQuery}%` } }];
        blogWhere[Op.or] = [
            { title: { [Op.iLike]: `%${effectiveQuery}%` } },
            { content: { [Op.iLike]: `%${effectiveQuery}%` } }
        ];
    }

    const [postsRaw, commentsRaw, blogsRaw, hashtagsRaw, collab] = await Promise.all([
        includeAll || type === 'posts'
            ? Post.findAll({ where: postWhere, limit: searchLimit * 3, offset: searchOffset, order: [['createdAt', 'DESC']] })
            : Promise.resolve([]),
        includeAll || type === 'comments'
            ? Comment.findAll({ where: commentWhere, limit: searchLimit * 3, offset: searchOffset, order: [['createdAt', 'DESC']] })
            : Promise.resolve([]),
        includeAll || type === 'blogs'
            ? Blog.findAll({ where: blogWhere, limit: searchLimit * 3, offset: searchOffset, order: [['publishedAt', 'DESC']] })
            : Promise.resolve([]),
        includeAll || type === 'hashtags'
            ? Hashtag.findAll({
                where: hasQuery ? { tag: { [Op.iLike]: `%${effectiveQuery.replace(/^#/, '')}%` } } : undefined,
                order: [['postCount', 'DESC']],
                limit: searchLimit
            })
            : Promise.resolve([]),
        includeAll || type === 'wikis' || type === 'documents'
            ? fetchCollaborationResults(effectiveQuery, searchLimit)
            : Promise.resolve({ documents: [], wikis: [] })
    ]);

    let posts = postsRaw.map((post) => {
        const row = post.toJSON();
        const score = scoreSemantic(effectiveQuery, row.content || '');
        return {
            ...row,
            snippet: buildSnippet(row.content, effectiveQuery),
            highlights: tokenize(effectiveQuery).filter((term) => normalizeText(row.content).includes(term)),
            _score: score
        };
    });

    let comments = commentsRaw.map((comment) => {
        const row = comment.toJSON();
        const score = scoreSemantic(effectiveQuery, row.content || '');
        return {
            ...row,
            snippet: buildSnippet(row.content, effectiveQuery),
            highlights: tokenize(effectiveQuery).filter((term) => normalizeText(row.content).includes(term)),
            _score: score
        };
    });

    let blogs = blogsRaw.map((blog) => {
        const row = blog.toJSON();
        const combined = `${row.title || ''} ${row.content || ''}`;
        const score = scoreSemantic(effectiveQuery, combined);
        return {
            ...row,
            snippet: buildSnippet(row.content || row.title, effectiveQuery),
            highlights: tokenize(effectiveQuery).filter((term) => normalizeText(combined).includes(term)),
            _score: score
        };
    });

    let documents = collab.documents;
    let wikis = collab.wikis;

    // Hashtag-backed post results
    let hashtagPosts = { items: [], count: 0 };
    if (hashtag || (hasQuery && effectiveQuery.includes('#'))) {
        const rawTag = hashtag || effectiveQuery.split(/\s+/).find((token) => token.startsWith('#'));
        const normalizedTag = safeText(rawTag).replace(/^#/, '').toLowerCase();
        if (normalizedTag) {
            const tagRecord = await Hashtag.findOne({ where: { tag: normalizedTag } });
            if (tagRecord) {
                const links = await PostHashtag.findAll({
                    where: { hashtagId: tagRecord.id },
                    limit: searchLimit * 2
                });
                const ids = links.map((link) => link.postId);
                const tagPostsRaw = ids.length ? await Post.findAll({ where: { id: ids } }) : [];
                const tagPosts = tagPostsRaw.map((post) => {
                    const row = post.toJSON();
                    return {
                        ...row,
                        snippet: buildSnippet(row.content, effectiveQuery),
                        _score: scoreSemantic(effectiveQuery, row.content || '') + 0.2
                    };
                });
                hashtagPosts = { items: sortItems(tagPosts, sortBy).slice(0, searchLimit), count: tagPosts.length };
            }
        }
    }

    // Semantic mode keeps broader candidates and uses score threshold.
    if (mode === 'semantic' && hasQuery) {
        posts = posts.filter((item) => item._score >= 0.06);
        comments = comments.filter((item) => item._score >= 0.06);
        blogs = blogs.filter((item) => item._score >= 0.06);
        documents = documents.filter((item) => item._score >= 0.06);
        wikis = wikis.filter((item) => item._score >= 0.06);
    }

    posts = sortItems(posts, sortBy).slice(0, searchLimit);
    comments = sortItems(comments, sortBy).slice(0, searchLimit);
    blogs = sortItems(blogs, sortBy).slice(0, searchLimit);
    documents = sortItems(documents, sortBy).slice(0, searchLimit);
    wikis = sortItems(wikis, sortBy).slice(0, searchLimit);

    if (dedupe) {
        posts = dedupeByFingerprint(posts, (item) => item.content || item.snippet || item.id);
        comments = dedupeByFingerprint(comments, (item) => item.content || item.snippet || item.id);
        blogs = dedupeByFingerprint(blogs, (item) => `${item.title || ''} ${item.content || ''}`);
        documents = dedupeByFingerprint(documents, (item) => `${item.title || ''} ${item.content || ''}`);
        wikis = dedupeByFingerprint(wikis, (item) => `${item.title || ''} ${item.content || ''}`);
    }

    const hashtagItems = hashtagsRaw.map((item) => {
        const row = item.toJSON();
        return {
            ...row,
            text: `#${row.tag}`
        };
    });

    const results = {
        posts: { items: posts, count: posts.length },
        comments: { items: comments, count: comments.length },
        blogs: { items: blogs, count: blogs.length },
        documents: { items: documents, count: documents.length },
        wikis: { items: wikis, count: wikis.length },
        hashtags: { items: hashtagItems, count: hashtagItems.length },
        hashtagPosts
    };

    const allItems = [...posts, ...comments, ...blogs, ...documents, ...wikis];

    const authorCounter = new Map();
    for (const item of allItems) {
        if (!item.userId) continue;
        authorCounter.set(item.userId, (authorCounter.get(item.userId) || 0) + 1);
    }

    const facets = {
        types: Object.entries(results).map(([key, bucket]) => ({ type: key, count: bucket.count })),
        authors: [...authorCounter.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([userId, count]) => ({ userId, count })),
        dateRange: {
            from: parsed.dateFrom ? parsed.dateFrom.toISOString() : null,
            to: parsed.dateTo ? parsed.dateTo.toISOString() : null
        }
    };

    const total = Object.values(results).reduce((sum, bucket) => sum + (bucket.count || 0), 0);
    const topType = facets.types.slice().sort((a, b) => b.count - a.count)[0]?.type || 'results';

    const summary = total === 0
        ? 'No results found. Try broader keywords or semantic mode.'
        : `Found ${total} results. Top category: ${topType}.`;

    return {
        query: effectiveQuery,
        mode,
        parsedQuery: {
            interpreted: parsed.interpreted,
            original: query,
            normalized: effectiveQuery,
            dateFrom: parsed.dateFrom ? parsed.dateFrom.toISOString() : null,
            dateTo: parsed.dateTo ? parsed.dateTo.toISOString() : null
        },
        summary,
        facets,
        results,
        meta: {
            limit: searchLimit,
            offset: searchOffset,
            sortBy,
            dedupe
        }
    };
};

exports.search = async (req, res) => {
    try {
        const {
            query = '',
            type = 'all',
            sortBy = 'relevance',
            limit = 20,
            offset = 0,
            dateFrom,
            dateTo,
            authorId,
            hashtag,
            mode = 'keyword',
            dedupe = 'true',
            engine = 'standard'
        } = req.query;

        const dedupeEnabled = String(dedupe).toLowerCase() !== 'false';

        if (safeText(engine) === 'elastic') {
            const elasticPayload = await buildElasticSearchPayload({
                query,
                type,
                sortBy,
                limit: toInt(limit, 20),
                offset: toInt(offset, 0),
                dateFrom,
                dateTo,
                authorId,
                mode,
                dedupe: dedupeEnabled
            });

            if (elasticPayload) {
                return res.json(elasticPayload);
            }
        }

        const payload = await buildSearchPayload({
            query,
            type,
            sortBy,
            limit: toInt(limit, 20),
            offset: toInt(offset, 0),
            dateFrom,
            dateTo,
            authorId,
            hashtag,
            mode,
            dedupe: dedupeEnabled
        });

        res.json({ engine: 'standard', ...payload });
    } catch (error) {
        console.error('[search] failed:', error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
};

exports.elasticsearch = async (req, res) => {
    try {
        const payload = { ...(req.query || {}), ...(req.body || {}) };
        const filters = typeof payload.filters === 'object' && payload.filters !== null ? payload.filters : {};

        const searchResults = await elasticsearchService.search({
            query: payload.query || '',
            type: payload.type || 'all',
            limit: toInt(payload.limit, 20),
            offset: toInt(payload.offset, 0),
            sortBy: payload.sortBy || 'relevance',
            mode: payload.mode || 'keyword',
            dateFrom: filters.fromDate || payload.dateFrom,
            dateTo: filters.toDate || payload.dateTo,
            authorId: filters.authorId || payload.authorId,
            category: filters.category || payload.category,
        });

        if (!searchResults.available) {
            return res.status(503).json({
                error: 'Elasticsearch unavailable',
                message: 'The Elasticsearch node is not reachable. Use the standard search engine instead.'
            });
        }

        res.json({
            engine: 'elasticsearch',
            results: searchResults.hits,
            total: searchResults.total,
            query: payload.query || '',
            offset: toInt(payload.offset, 0),
            limit: toInt(payload.limit, 20),
            facets: searchResults.facets,
        });
    } catch (error) {
        console.error('[search elasticsearch] failed:', error);
        res.status(500).json({ error: 'Elasticsearch search failed', details: error.message });
    }
};

exports.reindexSearch = async (req, res) => {
    try {
        const role = safeText(req.header('x-user-role'));
        if (role && role !== 'admin') {
            return res.status(403).json({ error: 'Admin role required to reindex search content' });
        }

        const result = await elasticsearchService.reindexAll();
        if (!result.available) {
            return res.status(503).json({ error: 'Elasticsearch unavailable' });
        }

        res.json({
            message: 'Reindexing complete',
            results: result.byType,
            indexed: result.indexed,
            index: elasticsearchService.ELASTICSEARCH_INDEX,
        });
    } catch (error) {
        console.error('[search reindex] failed:', error);
        res.status(500).json({ error: 'Failed to reindex search content', details: error.message });
    }
};

exports.suggestions = async (req, res) => {
    try {
        const query = safeText(req.query.query || req.query.q || '');
        const limit = clamp(toInt(req.query.limit, 10), 1, 25);

        if (query.length < 2) {
            return res.json({ suggestions: [] });
        }

        const [hashtags, posts, blogs] = await Promise.all([
            Hashtag.findAll({
                where: { tag: { [Op.iLike]: `%${query.replace(/^#/, '')}%` } },
                order: [['postCount', 'DESC']],
                limit
            }),
            Post.findAll({
                where: { content: { [Op.iLike]: `%${query}%` }, isPublished: true },
                order: [['createdAt', 'DESC']],
                limit
            }),
            Blog.findAll({
                where: {
                    status: 'published',
                    [Op.or]: [
                        { title: { [Op.iLike]: `%${query}%` } },
                        { content: { [Op.iLike]: `%${query}%` } }
                    ]
                },
                order: [['publishedAt', 'DESC']],
                limit
            })
        ]);

        const out = [];

        for (const tag of hashtags) {
            const row = tag.toJSON();
            out.push({ text: `#${row.tag}`, type: 'hashtag', count: row.postCount });
        }

        for (const post of posts) {
            const row = post.toJSON();
            out.push({ text: buildSnippet(row.content, query, 45).replace(/\[\[|\]\]/g, ''), type: 'post', count: row.likes || 0 });
        }

        for (const blog of blogs) {
            const row = blog.toJSON();
            out.push({ text: row.title, type: 'blog', count: row.likes || 0 });
        }

        const deduped = dedupeByFingerprint(out, (item) => item.text).slice(0, limit);
        res.json({ suggestions: deduped });
    } catch (error) {
        console.error('[search suggestions] failed:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
};

exports.trending = async (req, res) => {
    try {
        const limit = clamp(toInt(req.query.limit, 10), 1, 30);
        const days = clamp(toInt(req.query.days, 7), 1, 365);

        const threshold = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

        const [hashtags, popularPosts] = await Promise.all([
            Hashtag.findAll({
                order: [['postCount', 'DESC']],
                limit
            }),
            Post.findAll({
                where: { isPublished: true, createdAt: { [Op.gte]: threshold } },
                order: [['likes', 'DESC'], ['comments', 'DESC']],
                limit
            })
        ]);

        const trending = [
            ...hashtags.map((tag) => {
                const row = tag.toJSON();
                return {
                    query: `#${row.tag}`,
                    count: row.postCount,
                    type: 'hashtag'
                };
            }),
            ...popularPosts.map((post) => {
                const row = post.toJSON();
                return {
                    query: buildSnippet(row.content, row.content, 32).replace(/\[\[|\]\]/g, ''),
                    count: (row.likes || 0) + (row.comments || 0) + (row.shares || 0),
                    type: 'post'
                };
            })
        ];

        const output = dedupeByFingerprint(trending, (item) => item.query)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        res.json({ trending: output });
    } catch (error) {
        console.error('[search trending] failed:', error);
        res.status(500).json({ error: 'Failed to fetch trending searches' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const history = await getHistory(req.cacheManager?.redis, userId);
        res.json({ history });
    } catch (error) {
        console.error('[search history] fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch search history' });
    }
};

exports.saveHistory = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const query = safeText(req.body.query);
        const type = safeText(req.body.type || 'all');
        if (!query) {
            return res.status(400).json({ error: 'query is required' });
        }

        const entry = {
            id: crypto.randomUUID(),
            query,
            type,
            createdAt: new Date().toISOString()
        };

        await saveHistory(req.cacheManager?.redis, userId, entry);
        res.json({ success: true, entry });
    } catch (error) {
        console.error('[search history] save failed:', error);
        res.status(500).json({ error: 'Failed to save search history' });
    }
};

exports.getSavedSearches = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const searches = await getSavedSearches(req.cacheManager?.redis, userId);
        res.json({ searches });
    } catch (error) {
        console.error('[saved search] fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
};

exports.createSavedSearch = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const name = safeText(req.body.name);
        const query = safeText(req.body.query);
        const type = safeText(req.body.type || 'all');
        const filters = typeof req.body.filters === 'object' && req.body.filters !== null ? req.body.filters : {};

        if (!name || !query) {
            return res.status(400).json({ error: 'name and query are required' });
        }

        const searches = await getSavedSearches(req.cacheManager?.redis, userId);
        const entry = {
            id: crypto.randomUUID(),
            name,
            query,
            type,
            filters,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        searches.unshift(entry);
        await setSavedSearches(req.cacheManager?.redis, userId, searches.slice(0, 100));

        res.status(201).json({ savedSearch: entry });
    } catch (error) {
        console.error('[saved search] create failed:', error);
        res.status(500).json({ error: 'Failed to create saved search' });
    }
};

exports.deleteSavedSearch = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const searches = await getSavedSearches(req.cacheManager?.redis, userId);
        const next = searches.filter((search) => search.id !== id);

        if (next.length === searches.length) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        await setSavedSearches(req.cacheManager?.redis, userId, next);
        res.json({ success: true });
    } catch (error) {
        console.error('[saved search] delete failed:', error);
        res.status(500).json({ error: 'Failed to delete saved search' });
    }
};

exports.executeSavedSearch = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const searches = await getSavedSearches(req.cacheManager?.redis, userId);
        const found = searches.find((search) => search.id === id);

        if (!found) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        const engine = req.query.engine || found.filters?.engine || 'standard';

        if (safeText(engine) === 'elastic') {
            const elasticPayload = await buildElasticSearchPayload({
                query: found.query,
                type: found.type || 'all',
                sortBy: req.query.sortBy || found.filters?.sortBy || 'relevance',
                limit: toInt(req.query.limit, 20),
                offset: toInt(req.query.offset, 0),
                dateFrom: req.query.dateFrom || found.filters?.dateFrom,
                dateTo: req.query.dateTo || found.filters?.dateTo,
                authorId: req.query.authorId || found.filters?.authorId,
                mode: req.query.mode || found.filters?.mode || 'keyword',
                dedupe: String(req.query.dedupe || found.filters?.dedupe || 'true').toLowerCase() !== 'false'
            });

            if (elasticPayload) {
                return res.json({ savedSearch: found, ...elasticPayload });
            }
        }

        const payload = await buildSearchPayload({
            query: found.query,
            type: found.type || 'all',
            sortBy: req.query.sortBy || found.filters?.sortBy || 'relevance',
            limit: toInt(req.query.limit, 20),
            offset: toInt(req.query.offset, 0),
            dateFrom: req.query.dateFrom || found.filters?.dateFrom,
            dateTo: req.query.dateTo || found.filters?.dateTo,
            authorId: req.query.authorId || found.filters?.authorId,
            hashtag: req.query.hashtag || found.filters?.hashtag,
            mode: req.query.mode || found.filters?.mode || 'keyword',
            dedupe: String(req.query.dedupe || found.filters?.dedupe || 'true').toLowerCase() !== 'false'
        });

        res.json({ savedSearch: found, ...payload });
    } catch (error) {
        console.error('[saved search] execute failed:', error);
        res.status(500).json({ error: 'Failed to execute saved search' });
    }
};

exports.discoverGroups = async (req, res) => {
    try {
        const query = safeText(req.query.query || req.query.interest || '');
        const category = safeText(req.query.category || '');
        const limit = clamp(toInt(req.query.limit, 12), 1, 50);

        const where = {};
        if (category) where.category = { [Op.iLike]: `%${category}%` };
        if (query) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } },
                { category: { [Op.iLike]: `%${query}%` } }
            ];
        }

        const groups = await Group.findAll({
            where,
            order: [['memberCount', 'DESC'], ['createdAt', 'DESC']],
            limit
        });

        const results = groups.map((group) => {
            const row = group.toJSON();
            return {
                ...row,
                reason: query
                    ? `Matches your interest in "${query}"`
                    : 'Popular group by member activity',
                snippet: buildSnippet(row.description || row.name, query || row.category)
            };
        });

        res.json({ groups: results });
    } catch (error) {
        console.error('[discover groups] failed:', error);
        res.status(500).json({ error: 'Failed to fetch group discovery results' });
    }
};

exports.discoverContent = async (req, res) => {
    try {
        const userId = req.header('x-user-id');
        const interest = safeText(req.query.interest || req.query.query || '');
        const limit = clamp(toInt(req.query.limit, 12), 1, 50);

        let interestTerms = tokenize(interest);

        if (interestTerms.length === 0 && userId) {
            // lightweight personalized fallback: infer interests from user's own recent posts
            const ownPosts = await Post.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: 20
            });
            const joined = ownPosts.map((p) => p.content || '').join(' ');
            interestTerms = [...new Set(tokenize(joined))].slice(0, 8);
        }

        const publicPosts = await Post.findAll({
            where: { isPublished: true, visibility: 'public' },
            order: [['createdAt', 'DESC']],
            limit: limit * 4
        });

        const scored = publicPosts.map((post) => {
            const row = post.toJSON();
            const haystack = `${row.content || ''}`;
            const scoreFromInterest = interestTerms.length
                ? scoreSemantic(interestTerms.join(' '), haystack)
                : 0;

            const engagementBoost = ((row.likes || 0) + (row.comments || 0) + (row.shares || 0)) / 100;

            return {
                ...row,
                _score: scoreFromInterest + engagementBoost,
                snippet: buildSnippet(row.content, interestTerms.join(' ')),
                reason: interestTerms.length
                    ? `Recommended because it overlaps with your interests: ${interestTerms.slice(0, 3).join(', ')}`
                    : 'Trending by engagement'
            };
        });

        const ranked = sortItems(scored, 'relevance').slice(0, limit);
        res.json({ recommendations: ranked });
    } catch (error) {
        console.error('[discover content] failed:', error);
        res.status(500).json({ error: 'Failed to fetch content recommendations' });
    }
};
