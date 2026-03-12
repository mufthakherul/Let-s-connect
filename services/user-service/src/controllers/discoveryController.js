const { Op } = require('sequelize');
const { User, Profile, Page, Friend } = require('../models');

const parseIntSafe = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const overlapScore = (a = [], b = []) => {
    const setA = new Set((a || []).map((v) => normalizeText(v)).filter(Boolean));
    const setB = new Set((b || []).map((v) => normalizeText(v)).filter(Boolean));

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const value of setA) {
        if (setB.has(value)) intersection += 1;
    }

    return intersection / new Set([...setA, ...setB]).size;
};

exports.searchUsers = async (req, res) => {
    try {
        const query = String(req.query.query || '').trim();
        const limit = clamp(parseIntSafe(req.query.limit, 20), 1, 100);

        if (!query || query.length < 2) {
            return res.json({ users: [] });
        }

        const users = await User.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { username: { [Op.iLike]: `%${query}%` } },
                    { firstName: { [Op.iLike]: `%${query}%` } },
                    { lastName: { [Op.iLike]: `%${query}%` } },
                    { bio: { [Op.iLike]: `%${query}%` } }
                ]
            },
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio', 'createdAt'],
            include: [{ model: Profile, attributes: ['headline', 'city', 'country', 'interests', 'skills'], required: false }],
            order: [['createdAt', 'DESC']],
            limit
        });

        res.json({ users });
    } catch (error) {
        console.error('[user search] failed:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};

exports.searchPages = async (req, res) => {
    try {
        const query = String(req.query.query || '').trim();
        const category = String(req.query.category || '').trim();
        const verified = String(req.query.verified || '').trim().toLowerCase();
        const limit = clamp(parseIntSafe(req.query.limit, 20), 1, 100);

        const where = {};

        if (query) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } },
                { category: { [Op.iLike]: `%${query}%` } }
            ];
        }

        if (category) {
            where.category = { [Op.iLike]: `%${category}%` };
        }

        if (verified === 'true' || verified === 'false') {
            where.isVerified = verified === 'true';
        }

        const pages = await Page.findAll({
            where,
            order: [['followers', 'DESC'], ['createdAt', 'DESC']],
            limit
        });

        res.json({ pages });
    } catch (error) {
        console.error('[page search] failed:', error);
        res.status(500).json({ error: 'Failed to search pages' });
    }
};

exports.discoverPeople = async (req, res) => {
    try {
        const requesterId = req.header('x-user-id');
        const limit = clamp(parseIntSafe(req.query.limit, 12), 1, 50);
        const interestsParam = String(req.query.interests || req.query.interest || '').trim();
        const explicitInterests = interestsParam
            ? interestsParam.split(',').map((v) => normalizeText(v)).filter(Boolean)
            : [];

        const requesterProfile = requesterId
            ? await Profile.findOne({ where: { userId: requesterId } })
            : null;

        const requesterInterests = [
            ...explicitInterests,
            ...(requesterProfile?.interests || []),
            ...(requesterProfile?.skills || [])
        ].map((v) => normalizeText(v)).filter(Boolean);

        const friendships = requesterId
            ? await Friend.findAll({ where: { userId: requesterId }, attributes: ['friendId'] })
            : [];

        const excludedIds = new Set(friendships.map((f) => f.friendId));
        if (requesterId) excludedIds.add(requesterId);

        const users = await User.findAll({
            where: {
                isActive: true,
                ...(excludedIds.size > 0 ? { id: { [Op.notIn]: [...excludedIds] } } : {})
            },
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar', 'bio', 'createdAt'],
            include: [{ model: Profile, attributes: ['headline', 'city', 'country', 'interests', 'skills'], required: false }],
            limit: limit * 4,
            order: [['createdAt', 'DESC']]
        });

        const ranked = users
            .map((user) => {
                const profile = user.Profile || {};
                const userInterests = [
                    ...(profile.interests || []),
                    ...(profile.skills || [])
                ];

                const similarity = overlapScore(requesterInterests, userInterests);
                const freshness = Math.max(0, 1 - ((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 90)));
                const score = (similarity * 0.75) + (freshness * 0.25);

                return {
                    ...user.toJSON(),
                    recommendationScore: Number(score.toFixed(4)),
                    reason: similarity > 0
                        ? 'Shared interests and skills'
                        : 'Active member you may know'
                };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, limit);

        res.json({ people: ranked });
    } catch (error) {
        console.error('[discover people] failed:', error);
        res.status(500).json({ error: 'Failed to fetch people recommendations' });
    }
};

// GET /discovery/search/suggestions?q=...&limit=8 — autocomplete suggestions for global search bar
exports.searchSuggestions = async (req, res) => {
    try {
        const { q = '', limit: limitStr = '8' } = req.query;
        const limit = Math.min(20, parseInt(limitStr, 10) || 8);
        const term = q.trim();
        if (!term || term.length < 2) return res.json({ suggestions: [] });

        const [users, pages] = await Promise.all([
            User.findAll({
                where: { username: { [Op.iLike]: `${term}%` } },
                attributes: ['id', 'username'],
                limit: Math.ceil(limit / 2)
            }),
            Page ? Page.findAll({
                where: { name: { [Op.iLike]: `${term}%` } },
                attributes: ['id', 'name', 'category'],
                limit: Math.ceil(limit / 2)
            }).catch(() => []) : Promise.resolve([])
        ]);

        const suggestions = [
            ...users.map(u => ({ type: 'user', id: u.id, label: u.username })),
            ...pages.map(p => ({ type: 'page', id: p.id, label: p.name, category: p.category }))
        ].slice(0, limit);

        res.json({ suggestions });
    } catch (error) {
        console.error('[search suggestions] failed:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
};
