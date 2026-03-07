import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Schedule, ThumbUp, Comment, AccessTime } from '@mui/icons-material';
import axios from 'axios';

function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [myBlogs, setMyBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Blog editor state
  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    status: 'draft',
    featuredImage: '',
    metaTitle: '',
    metaDescription: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPublicBlogs();
    fetchCategories();
    if (user.id && token) {
      fetchMyBlogs();
    }
  }, [selectedCategory]);

  const fetchPublicBlogs = async () => {
    try {
      const params = {};
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const response = await axios.get('/api/content/blogs/public', { params });
      setBlogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    }
  };

  const fetchMyBlogs = async () => {
    try {
      const response = await axios.get(`/api/content/blogs/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyBlogs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch my blogs:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/content/blogs/categories/all');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const openBlogView = async (slug) => {
    try {
      const response = await axios.get(`/api/content/blogs/public/${slug}`);
      setSelectedBlog(response.data);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch blog:', err);
      setError('Failed to load blog post');
    }
  };

  const openEditor = (blog = null) => {
    if (blog) {
      setBlogForm({
        id: blog.id,
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt || '',
        category: blog.category || '',
        tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
        status: blog.status,
        featuredImage: blog.featuredImage || '',
        metaTitle: blog.metaTitle || '',
        metaDescription: blog.metaDescription || ''
      });
    } else {
      setBlogForm({
        title: '',
        content: '',
        excerpt: '',
        category: '',
        tags: '',
        status: 'draft',
        featuredImage: '',
        metaTitle: '',
        metaDescription: ''
      });
    }
    setEditorOpen(true);
  };

  const saveBlog = async () => {
    if (!user.id || !token) {
      setError('Please log in to create blogs');
      return;
    }

    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      const tagsArray = (blogForm.tags || '').split(',').map(t => t.trim()).filter(t => t);
      
      const payload = {
        title: blogForm.title,
        content: blogForm.content,
        excerpt: blogForm.excerpt,
        category: blogForm.category,
        tags: tagsArray,
        status: blogForm.status,
        featuredImage: blogForm.featuredImage,
        metaTitle: blogForm.metaTitle,
        metaDescription: blogForm.metaDescription
      };

      if (blogForm.id) {
        // Update existing blog
        await axios.put(
          `/api/content/blogs/${blogForm.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Blog updated successfully!');
      } else {
        // Create new blog
        await axios.post(
          '/api/content/blogs',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Blog created successfully!');
      }

      setEditorOpen(false);
      setTimeout(() => setSuccess(''), 3000);
      fetchPublicBlogs();
      if (user.id) fetchMyBlogs();
    } catch (err) {
      console.error('Failed to save blog:', err);
      setError(err.response?.data?.error || 'Failed to save blog');
    }
  };

  const deleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) {
      return;
    }

    try {
      await axios.delete(`/api/content/blogs/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Blog deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMyBlogs();
      fetchPublicBlogs();
    } catch (err) {
      console.error('Failed to delete blog:', err);
      setError('Failed to delete blog');
    }
  };

  const likeBlog = async (blogId) => {
    if (!user.id || !token) {
      setError('Please log in to like blogs');
      return;
    }

    try {
      await axios.post(
        `/api/content/blogs/${blogId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Blog liked!');
      setTimeout(() => setSuccess(''), 2000);
      fetchPublicBlogs();
    } catch (err) {
      console.error('Failed to like blog:', err);
      setError('Failed to like blog');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'default';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return <Visibility />;
      case 'draft': return <Schedule />;
      case 'archived': return <Delete />;
      default: return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Blog
        </Typography>
        {user.id && token && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openEditor()}
          >
            Write Article
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 3 }}>
        <Tab label="All Articles" />
        {user.id && token && <Tab label="My Articles" />}
      </Tabs>

      {/* Filter by Category */}
      {tabValue === 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Filter by Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Public Blogs */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {blogs.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">
                    No blog posts published yet.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            blogs.map((blog) => (
              <Grid item xs={12} md={6} key={blog.id}>
                <Card>
                  {blog.featuredImage && (
                    <Box
                      component="img"
                      src={blog.featuredImage}
                      alt={blog.title}
                      sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      {blog.category && (
                        <Chip label={blog.category} size="small" />
                      )}
                      <Chip
                        icon={<AccessTime />}
                        label={`${blog.readingTime} min read`}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="h5" gutterBottom sx={{ cursor: 'pointer' }} onClick={() => openBlogView(blog.slug)}>
                      {blog.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {blog.excerpt || blog.content?.substring(0, 150)}...
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(blog.publishedAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • {blog.views} views
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • {blog.likes} likes
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button size="small" onClick={() => openBlogView(blog.slug)}>
                        Read More
                      </Button>
                      <IconButton size="small" onClick={() => likeBlog(blog.id)}>
                        <ThumbUp fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* My Blogs */}
      {tabValue === 1 && user.id && token && (
        <Grid container spacing={3}>
          {myBlogs.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">
                    You haven't written any blog posts yet. Click "Write Article" to get started!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            myBlogs.map((blog) => (
              <Grid item xs={12} key={blog.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip
                            icon={getStatusIcon(blog.status)}
                            label={blog.status}
                            color={getStatusColor(blog.status)}
                            size="small"
                          />
                          {blog.category && (
                            <Chip label={blog.category} size="small" />
                          )}
                        </Box>
                        
                        <Typography variant="h6" gutterBottom>
                          {blog.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {blog.excerpt?.substring(0, 100) || blog.content?.substring(0, 100)}...
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(blog.createdAt).toLocaleDateString()}
                          {blog.publishedAt && ` • Published: ${new Date(blog.publishedAt).toLocaleDateString()}`}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <IconButton onClick={() => openEditor(blog)}>
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => deleteBlog(blog.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Blog View Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedBlog && (
          <>
            <DialogContent>
              {selectedBlog.featuredImage && (
                <Box
                  component="img"
                  src={selectedBlog.featuredImage}
                  alt={selectedBlog.title}
                  sx={{ width: '100%', height: 300, objectFit: 'cover', mb: 2, borderRadius: 1 }}
                />
              )}
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {selectedBlog.category && (
                  <Chip label={selectedBlog.category} size="small" />
                )}
                <Chip
                  icon={<AccessTime />}
                  label={`${selectedBlog.readingTime} min read`}
                  size="small"
                />
              </Box>
              
              <Typography variant="h4" gutterBottom>
                {selectedBlog.title}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedBlog.publishedAt).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedBlog.views} views
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedBlog.likes} likes
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedBlog.content}
              </Typography>
              
              {selectedBlog.tags && selectedBlog.tags.length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedBlog.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              <Button
                startIcon={<ThumbUp />}
                onClick={() => {
                  likeBlog(selectedBlog.id);
                  setDialogOpen(false);
                }}
              >
                Like
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Blog Editor Dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {blogForm.id ? 'Edit Article' : 'Write New Article'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={blogForm.title}
            onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Content"
            value={blogForm.content}
            onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
            margin="normal"
            multiline
            rows={10}
            required
            placeholder="Write your article content here..."
          />
          
          <TextField
            fullWidth
            label="Excerpt (Optional)"
            value={blogForm.excerpt}
            onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            helperText="Short summary of your article"
          />
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={blogForm.status}
                  label="Status"
                  onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={blogForm.tags}
            onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
            margin="normal"
            placeholder="technology, javascript, tutorial"
          />
          
          <TextField
            fullWidth
            label="Featured Image URL (Optional)"
            value={blogForm.featuredImage}
            onChange={(e) => setBlogForm({ ...blogForm, featuredImage: e.target.value })}
            margin="normal"
          />
          
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            SEO Metadata (Optional)
          </Typography>
          
          <TextField
            fullWidth
            label="Meta Title"
            value={blogForm.metaTitle}
            onChange={(e) => setBlogForm({ ...blogForm, metaTitle: e.target.value })}
            margin="normal"
            size="small"
          />
          
          <TextField
            fullWidth
            label="Meta Description"
            value={blogForm.metaDescription}
            onChange={(e) => setBlogForm({ ...blogForm, metaDescription: e.target.value })}
            margin="normal"
            size="small"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveBlog}>
            {blogForm.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Blog;
