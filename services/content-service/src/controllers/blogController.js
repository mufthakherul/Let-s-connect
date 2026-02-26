const { Blog, BlogComment, BlogCategory, BlogTag } = require('../models');
const { AppError, catchAsync } = require('../../../shared/errorHandling');
const response = require('../../../shared/response-wrapper');

exports.createBlog = catchAsync(async (req, res, next) => {
    const { title, content, slug, category, tags } = req.body;
    const userId = req.header('x-user-id');

    const blog = await Blog.create({ userId, title, content, slug, category, tags, status: 'published', publishedAt: new Date() });
    response.success(res, blog, 'Blog published', 201);
});

exports.getBlogs = catchAsync(async (req, res, next) => {
    const blogs = await Blog.findAll({ where: { status: 'published' }, order: [['publishedAt', 'DESC']] });
    response.success(res, blogs);
});
