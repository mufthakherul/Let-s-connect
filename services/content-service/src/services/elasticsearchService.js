const { Client } = require('@elastic/elasticsearch');
const { Post, Blog } = require('../models');

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'lets-connect-search';
const AUTO_REINDEX_TTL_MS = 5 * 60 * 1000;

let client = null;
let indexEnsured = false;
let lastReindexAt = 0;
let reindexPromise = null;

const safeText = (value) => String(value || '').trim();
const normalizeText = (value) => safeText(value).toLowerCase();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toExistsBoolean = (response) => {
    if (typeof response === 'boolean') return response;
    if (typeof response?.body === 'boolean') return response.body;
    return Boolean(response);
};

const buildElasticDocId = (type, id) => `${type}:${id}`;

const buildTitleFromContent = (content, fallback = 'Untitled') => {
    const text = safeText(content);
    if (!text) return fallback;
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const extractTags = (text) => {
    const matches = String(text || '').match(/#[\w-]+/g) || [];
    return [...new Set(matches.map((tag) => normalizeText(tag.replace(/^#/, ''))).filter(Boolean))];
};

const getClient = () => {
    if (process.env.ELASTICSEARCH_DISABLED === 'true') {
        return null;
    }

    if (!client) {
        const options = {
            node: ELASTICSEARCH_URL,
            requestTimeout: 5000,
            maxRetries: 1,
        };

        if (process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASSWORD) {
            options.auth = {
                username: process.env.ELASTICSEARCH_USER,
                password: process.env.ELASTICSEARCH_PASSWORD,
            };
        }

        client = new Client(options);
    }

    return client;
};

const isAvailable = async () => {
    const elasticClient = getClient();
    if (!elasticClient) return false;

    try {
        await elasticClient.ping();
        return true;
    } catch (error) {
        return false;
    }
};

const ensureIndex = async () => {
    const elasticClient = getClient();
    if (!elasticClient) return null;

    if (indexEnsured) {
        return elasticClient;
    }

    const exists = toExistsBoolean(await elasticClient.indices.exists({ index: ELASTICSEARCH_INDEX }));

    if (!exists) {
        await elasticClient.indices.create({
            index: ELASTICSEARCH_INDEX,
            mappings: {
                properties: {
                    id: { type: 'keyword' },
                    type: { type: 'keyword' },
                    title: { type: 'text' },
                    content: { type: 'text' },
                    description: { type: 'text' },
                    authorId: { type: 'keyword' },
                    visibility: { type: 'keyword' },
                    category: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    likes: { type: 'integer' },
                    comments: { type: 'integer' },
                    shares: { type: 'integer' },
                    views: { type: 'integer' },
                    engagement: { type: 'integer' },
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' },
                },
            },
        });
    }

    indexEnsured = true;
    return elasticClient;
};

const fetchCollaborationResources = async (limit = 2000) => {
    const baseUrl = process.env.COLLABORATION_SERVICE_URL || 'http://collaboration-service:8004';

    try {
        const [docsResponse, wikisResponse] = await Promise.all([
            fetch(`${baseUrl}/public/docs`),
            fetch(`${baseUrl}/public/wiki`),
        ]);

        const documents = docsResponse.ok ? await docsResponse.json() : [];
        const wikis = wikisResponse.ok ? await wikisResponse.json() : [];

        return {
            documents: Array.isArray(documents) ? documents.slice(0, limit) : [],
            wikis: Array.isArray(wikis) ? wikis.slice(0, limit) : [],
        };
    } catch (error) {
        return { documents: [], wikis: [] };
    }
};

const collectIndexDocuments = async () => {
    const [postsRaw, blogsRaw, collaboration] = await Promise.all([
        Post.findAll({
            where: { isPublished: true },
            order: [['createdAt', 'DESC']],
            limit: 2000,
        }),
        Blog.findAll({
            where: { status: 'published' },
            order: [['publishedAt', 'DESC']],
            limit: 2000,
        }),
        fetchCollaborationResources(2000),
    ]);

    const posts = postsRaw.map((post) => {
        const row = post.toJSON();
        return {
            id: String(row.id),
            type: 'post',
            title: buildTitleFromContent(row.content, 'Post'),
            content: row.content || '',
            description: row.content || '',
            authorId: row.userId ? String(row.userId) : '',
            visibility: row.visibility || 'public',
            category: normalizeText(row.category || ''),
            tags: extractTags(row.content),
            likes: row.likes || 0,
            comments: row.comments || 0,
            shares: row.shares || 0,
            views: row.views || 0,
            engagement: (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.views || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt || row.createdAt,
        };
    });

    const blogs = blogsRaw.map((blog) => {
        const row = blog.toJSON();
        return {
            id: String(row.id),
            type: 'blog',
            title: safeText(row.title) || 'Blog',
            content: row.content || '',
            description: row.excerpt || row.content || '',
            authorId: row.userId ? String(row.userId) : '',
            visibility: row.visibility || 'public',
            category: normalizeText(row.category || ''),
            tags: extractTags(`${row.title || ''} ${row.content || ''}`),
            likes: row.likes || 0,
            comments: row.comments || 0,
            shares: row.shares || 0,
            views: row.views || 0,
            engagement: (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.views || 0),
            createdAt: row.publishedAt || row.createdAt,
            updatedAt: row.updatedAt || row.publishedAt || row.createdAt,
        };
    });

    const documents = collaboration.documents.map((doc) => ({
        id: String(doc.id),
        type: 'document',
        title: safeText(doc.title) || 'Document',
        content: doc.content || '',
        description: doc.content || '',
        authorId: doc.userId ? String(doc.userId) : '',
        visibility: doc.visibility || 'public',
        category: normalizeText(doc.category || 'document'),
        tags: extractTags(`${doc.title || ''} ${doc.content || ''}`),
        likes: doc.likes || 0,
        comments: doc.comments || 0,
        shares: doc.shares || 0,
        views: doc.views || 0,
        engagement: (doc.likes || 0) + (doc.comments || 0) + (doc.shares || 0) + (doc.views || 0),
        createdAt: doc.createdAt || doc.updatedAt || new Date().toISOString(),
        updatedAt: doc.updatedAt || doc.createdAt || new Date().toISOString(),
    }));

    const wikis = collaboration.wikis.map((wiki) => ({
        id: String(wiki.id),
        type: 'wiki',
        title: safeText(wiki.title) || 'Wiki',
        content: wiki.content || '',
        description: wiki.content || '',
        authorId: wiki.userId ? String(wiki.userId) : '',
        visibility: wiki.visibility || 'public',
        category: normalizeText(wiki.category || 'wiki'),
        tags: extractTags(`${wiki.title || ''} ${wiki.content || ''}`),
        likes: wiki.likes || 0,
        comments: wiki.comments || 0,
        shares: wiki.shares || 0,
        views: wiki.views || 0,
        engagement: (wiki.likes || 0) + (wiki.comments || 0) + (wiki.shares || 0) + (wiki.views || 0),
        createdAt: wiki.createdAt || wiki.updatedAt || new Date().toISOString(),
        updatedAt: wiki.updatedAt || wiki.createdAt || new Date().toISOString(),
    }));

    return [...posts, ...blogs, ...documents, ...wikis];
};

const reindexAll = async () => {
    const elasticClient = getClient();
    if (!elasticClient) {
        return { available: false, indexed: 0, byType: {} };
    }

    if (reindexPromise) {
        return reindexPromise;
    }

    reindexPromise = (async () => {
        await elasticClient.ping();

        const exists = toExistsBoolean(await elasticClient.indices.exists({ index: ELASTICSEARCH_INDEX }));
        if (exists) {
            await elasticClient.indices.delete({ index: ELASTICSEARCH_INDEX });
        }
        indexEnsured = false;
        await ensureIndex();

        const documents = await collectIndexDocuments();
        if (documents.length > 0) {
            await elasticClient.bulk({
                refresh: true,
                operations: documents.flatMap((document) => [
                    { index: { _index: ELASTICSEARCH_INDEX, _id: buildElasticDocId(document.type, document.id) } },
                    document,
                ]),
            });
        }

        lastReindexAt = Date.now();

        const byType = documents.reduce((accumulator, document) => {
            const bucket = `${document.type}s`;
            accumulator[bucket] = (accumulator[bucket] || 0) + 1;
            return accumulator;
        }, {});

        return {
            available: true,
            indexed: documents.length,
            byType,
        };
    })();

    try {
        return await reindexPromise;
    } finally {
        reindexPromise = null;
    }
};

const maybeReindex = async () => {
    const elasticClient = await ensureIndex();
    if (!elasticClient) return;

    if (Date.now() - lastReindexAt < AUTO_REINDEX_TTL_MS) {
        return;
    }

    const countResponse = await elasticClient.count({ index: ELASTICSEARCH_INDEX });
    const count = countResponse?.count ?? countResponse?.body?.count ?? 0;
    if (count === 0) {
        await reindexAll();
    }
};

const mapSearchType = (type) => {
    switch (type) {
        case 'posts':
            return 'post';
        case 'blogs':
            return 'blog';
        case 'documents':
            return 'document';
        case 'wikis':
            return 'wiki';
        default:
            return type;
    }
};

const buildSnippet = (hit) => {
    const highlight = hit.highlight || {};
    return highlight.content?.[0] || highlight.description?.[0] || highlight.title?.[0] || hit._source.description || hit._source.content || hit._source.title || '';
};

const search = async ({
    query,
    type = 'all',
    limit = 20,
    offset = 0,
    sortBy = 'relevance',
    mode = 'keyword',
    dateFrom,
    dateTo,
    authorId,
    category,
}) => {
    const elasticClient = await ensureIndex();
    if (!elasticClient) {
        return { available: false, hits: [], total: 0, facets: { types: [], authors: [] } };
    }

    await elasticClient.ping();
    await maybeReindex();

    const must = [];
    if (safeText(query)) {
        must.push({
            multi_match: {
                query: safeText(query),
                fields: ['title^4', 'content^3', 'description^2', 'category^2', 'tags^2'],
                type: mode === 'semantic' ? 'most_fields' : 'best_fields',
                fuzziness: mode === 'semantic' ? 'AUTO' : undefined,
            },
        });
    } else {
        must.push({ match_all: {} });
    }

    const filters = [];
    if (type && type !== 'all') {
        filters.push({ term: { type: mapSearchType(type) } });
    }
    if (authorId) {
        filters.push({ term: { authorId: String(authorId) } });
    }
    if (category) {
        filters.push({ term: { category: normalizeText(category) } });
    }
    if (dateFrom || dateTo) {
        filters.push({
            range: {
                createdAt: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                },
            },
        });
    }

    const size = clamp(parseInt(limit, 10) || 20, 1, 100);
    const from = Math.max(parseInt(offset, 10) || 0, 0);

    const sort = sortBy === 'date'
        ? [{ createdAt: { order: 'desc' } }]
        : sortBy === 'popularity'
            ? [{ engagement: { order: 'desc' } }, { createdAt: { order: 'desc' } }]
            : ['_score', { createdAt: { order: 'desc' } }];

    const response = await elasticClient.search({
        index: ELASTICSEARCH_INDEX,
        from,
        size,
        query: {
            bool: {
                must,
                filter: filters,
            },
        },
        highlight: {
            pre_tags: ['[['],
            post_tags: [']]'],
            fields: {
                title: { number_of_fragments: 1 },
                content: { fragment_size: 180, number_of_fragments: 1 },
                description: { fragment_size: 180, number_of_fragments: 1 },
            },
        },
        aggs: {
            types: { terms: { field: 'type', size: 10 } },
            authors: { terms: { field: 'authorId', size: 10 } },
        },
        sort,
    });

    const body = response?.body || response;
    const hits = body?.hits?.hits || [];
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? hits.length;

    return {
        available: true,
        hits: hits.map((hit) => ({
            id: hit._source.id,
            type: hit._source.type,
            score: hit._score,
            highlight: hit.highlight || {},
            snippet: buildSnippet(hit),
            source: hit._source,
        })),
        total,
        facets: {
            types: (body?.aggregations?.types?.buckets || []).map((bucket) => ({ value: bucket.key, count: bucket.doc_count })),
            authors: (body?.aggregations?.authors?.buckets || []).map((bucket) => ({ userId: bucket.key, count: bucket.doc_count })),
        },
    };
};

module.exports = {
    isAvailable,
    reindexAll,
    search,
    ELASTICSEARCH_INDEX,
};
