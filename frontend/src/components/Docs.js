import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Stack,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  Paper,
  Tooltip
} from '@mui/material';
import {
  History,
  Restore,
  Edit,
  Visibility,
  Add,
  Category
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Projects from './Projects';

function Docs({ user }) {
  const [tab, setTab] = useState(0);
  const [docs, setDocs] = useState([]);
  const [wikiPages, setWikiPages] = useState([]);
  
  // Phase 2: Document versioning
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docVersions, setDocVersions] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [editingDoc, setEditingDoc] = useState(false);
  const [editDocForm, setEditDocForm] = useState({
    title: '',
    content: '',
    changeDescription: ''
  });

  // Phase 2: Wiki history and categories
  const [selectedWiki, setSelectedWiki] = useState(null);
  const [wikiHistory, setWikiHistory] = useState([]);
  const [showWikiHistory, setShowWikiHistory] = useState(false);
  const [selectedWikiRevision, setSelectedWikiRevision] = useState(null);
  const [editingWiki, setEditingWiki] = useState(false);
  const [editWikiForm, setEditWikiForm] = useState({
    title: '',
    content: '',
    editSummary: '',
    categories: []
  });
  const [newCategory, setNewCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    fetchDocs();
    fetchWiki();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await api.get('/collaboration/public/docs');
      setDocs(response.data);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
      toast.error('Failed to load docs');
    }
  };

  const fetchWiki = async () => {
    try {
      const response = await api.get('/collaboration/public/wiki');
      setWikiPages(response.data);
      // Extract unique categories
      const cats = new Set();
      response.data.forEach(page => {
        if (page.categories) {
          page.categories.forEach(cat => cats.add(cat));
        }
      });
      setAllCategories(Array.from(cats));
    } catch (err) {
      console.error('Failed to fetch wiki:', err);
      toast.error('Failed to load wiki');
    }
  };

  // ========== PHASE 2: Document Versioning Handlers ==========

  const fetchDocumentVersions = async (docId) => {
    if (!user) return;
    try {
      const response = await api.get(`/collaboration/documents/${docId}/versions`);
      setDocVersions(response.data);
      setShowVersionHistory(true);
    } catch (err) {
      console.error('Failed to fetch document versions:', err);
      toast.error('Failed to load version history');
    }
  };

  const viewDocumentVersion = async (docId, versionNumber) => {
    if (!user) return;
    try {
      const response = await api.get(`/collaboration/documents/${docId}/versions/${versionNumber}`);
      setSelectedVersion(response.data);
    } catch (err) {
      console.error('Failed to load version:', err);
      toast.error('Failed to load version');
    }
  };

  const restoreDocumentVersion = async (docId, versionNumber) => {
    if (!user) return;
    try {
      await api.post(`/collaboration/documents/${docId}/versions/${versionNumber}/restore`);
      toast.success('Document restored to previous version');
      fetchDocs();
      setShowVersionHistory(false);
      setSelectedVersion(null);
    } catch (err) {
      console.error('Failed to restore version:', err);
      toast.error('Failed to restore version');
    }
  };

  const handleEditDocument = (doc) => {
    setSelectedDoc(doc);
    setEditDocForm({
      title: doc.title,
      content: doc.content || '',
      changeDescription: ''
    });
    setEditingDoc(true);
  };

  const handleSaveDocument = async () => {
    if (!user || !selectedDoc) return;
    try {
      await api.put(`/collaboration/documents/${selectedDoc.id}`, editDocForm);
      toast.success('Document updated successfully');
      setEditingDoc(false);
      fetchDocs();
    } catch (err) {
      console.error('Failed to update document:', err);
      toast.error('Failed to update document');
    }
  };

  // ========== PHASE 2: Wiki History & Categories Handlers ==========

  const fetchWikiHistory = async (wikiId) => {
    try {
      const response = await api.get(`/collaboration/wiki/${wikiId}/history`);
      setWikiHistory(response.data);
      setShowWikiHistory(true);
    } catch (err) {
      console.error('Failed to fetch wiki history:', err);
      toast.error('Failed to load wiki history');
    }
  };

  const viewWikiRevision = async (wikiId, historyId) => {
    try {
      const response = await api.get(`/collaboration/wiki/${wikiId}/history/${historyId}`);
      setSelectedWikiRevision(response.data);
    } catch (err) {
      console.error('Failed to load revision:', err);
      toast.error('Failed to load revision');
    }
  };

  const restoreWikiRevision = async (wikiId, historyId) => {
    if (!user) return;
    try {
      await api.post(`/collaboration/wiki/${wikiId}/history/${historyId}/restore`);
      toast.success('Wiki restored to previous revision');
      fetchWiki();
      setShowWikiHistory(false);
      setSelectedWikiRevision(null);
    } catch (err) {
      console.error('Failed to restore revision:', err);
      toast.error('Failed to restore revision');
    }
  };

  const handleEditWiki = (wiki) => {
    setSelectedWiki(wiki);
    setEditWikiForm({
      title: wiki.title,
      content: wiki.content || '',
      editSummary: '',
      categories: wiki.categories || []
    });
    setEditingWiki(true);
  };

  const handleSaveWiki = async () => {
    if (!user || !selectedWiki) return;
    try {
      await api.put(`/collaboration/wiki/${selectedWiki.id}`, editWikiForm);
      toast.success('Wiki updated successfully');
      setEditingWiki(false);
      fetchWiki();
    } catch (err) {
      console.error('Failed to update wiki:', err);
      toast.error('Failed to update wiki');
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (!editWikiForm.categories.includes(newCategory)) {
      setEditWikiForm({
        ...editWikiForm,
        categories: [...editWikiForm.categories, newCategory]
      });
    }
    setNewCategory('');
  };

  const handleRemoveCategory = (category) => {
    setEditWikiForm({
      ...editWikiForm,
      categories: editWikiForm.categories.filter(c => c !== category)
    });
  };

  const filterWikiByCategory = (category) => {
    setFilterCategory(category);
  };

  const getFilteredWikiPages = () => {
    if (!filterCategory) return wikiPages;
    return wikiPages.filter(page => 
      page.categories && page.categories.includes(filterCategory)
    );
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Docs & Wiki" />
        <Tab label="Projects" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Typography variant="h4" gutterBottom>
            Documentation & Wiki
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {user ? 'Manage documents and wiki pages with version history' : 'Read documentation without signing up'}
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Public Documents
          </Typography>
          <List>
            {docs.map((doc) => (
              <Card key={doc.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <ListItem>
                      <ListItemText
                        primary={doc.title}
                        secondary={`Version ${doc.version} • Last updated: ${new Date(doc.updatedAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                    {user && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View History">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedDoc(doc);
                              fetchDocumentVersions(doc.id);
                            }}
                          >
                            <History />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditDocument(doc)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Wiki Pages
          </Typography>
          
          {/* Phase 2: Category Filter */}
          {allCategories.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Filter by Category:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  label="All" 
                  onClick={() => setFilterCategory('')}
                  color={!filterCategory ? 'primary' : 'default'}
                  variant={!filterCategory ? 'filled' : 'outlined'}
                />
                {allCategories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    onClick={() => filterWikiByCategory(cat)}
                    color={filterCategory === cat ? 'primary' : 'default'}
                    variant={filterCategory === cat ? 'filled' : 'outlined'}
                    icon={<Category />}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <List>
            {getFilteredWikiPages().map((page) => (
              <Card key={page.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <ListItem>
                        <ListItemText 
                          primary={page.title} 
                          secondary={`Slug: ${page.slug}`} 
                        />
                      </ListItem>
                      {/* Phase 2: Show categories */}
                      {page.categories && page.categories.length > 0 && (
                        <Box sx={{ pl: 2, pb: 1 }}>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {page.categories.map(cat => (
                              <Chip key={cat} label={cat} size="small" />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                    {user && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View History">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedWiki(page);
                              fetchWikiHistory(page.id);
                            }}
                          >
                            <History />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditWiki(page)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {!user && (
            <Card>
              <CardContent>
                <Typography variant="h6">Login required</Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects, issues, milestones, and board management need authentication.
                </Typography>
              </CardContent>
            </Card>
          )}
          {user && <Projects user={user} />}
        </Stack>
      )}

      {/* ========== PHASE 2: Document Version History Dialog ========== */}
      <Dialog 
        open={showVersionHistory} 
        onClose={() => setShowVersionHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Document Version History
          {selectedDoc && <Typography variant="caption" display="block">{selectedDoc.title}</Typography>}
        </DialogTitle>
        <DialogContent>
          <List>
            {docVersions.map((version) => (
              <Card key={version.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">
                        Version {version.versionNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {version.changeDescription}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(version.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        startIcon={<Visibility />}
                        onClick={() => viewDocumentVersion(selectedDoc.id, version.versionNumber)}
                      >
                        View
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<Restore />}
                        onClick={() => restoreDocumentVersion(selectedDoc.id, version.versionNumber)}
                      >
                        Restore
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
          {selectedVersion && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
              <Typography variant="h6" gutterBottom>Version {selectedVersion.versionNumber} Content</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedVersion.content}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ========== PHASE 2: Edit Document Dialog ========== */}
      <Dialog 
        open={editingDoc} 
        onClose={() => setEditingDoc(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editDocForm.title}
              onChange={(e) => setEditDocForm({ ...editDocForm, title: e.target.value })}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={10}
              value={editDocForm.content}
              onChange={(e) => setEditDocForm({ ...editDocForm, content: e.target.value })}
            />
            <TextField
              label="Change Description"
              fullWidth
              placeholder="What did you change?"
              value={editDocForm.changeDescription}
              onChange={(e) => setEditDocForm({ ...editDocForm, changeDescription: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDoc(false)}>Cancel</Button>
          <Button onClick={handleSaveDocument} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* ========== PHASE 2: Wiki Edit History Dialog ========== */}
      <Dialog 
        open={showWikiHistory} 
        onClose={() => setShowWikiHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Wiki Edit History
          {selectedWiki && <Typography variant="caption" display="block">{selectedWiki.title}</Typography>}
        </DialogTitle>
        <DialogContent>
          <List>
            {wikiHistory.map((revision) => (
              <Card key={revision.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">
                        {revision.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {revision.editSummary || 'No edit summary'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(revision.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        startIcon={<Visibility />}
                        onClick={() => viewWikiRevision(selectedWiki.id, revision.id)}
                      >
                        View
                      </Button>
                      {user && (
                        <Button 
                          size="small" 
                          startIcon={<Restore />}
                          onClick={() => restoreWikiRevision(selectedWiki.id, revision.id)}
                        >
                          Restore
                        </Button>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
          {selectedWikiRevision && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
              <Typography variant="h6" gutterBottom>{selectedWikiRevision.title}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {selectedWikiRevision.content}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWikiHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ========== PHASE 2: Edit Wiki Dialog ========== */}
      <Dialog 
        open={editingWiki} 
        onClose={() => setEditingWiki(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Wiki Page</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editWikiForm.title}
              onChange={(e) => setEditWikiForm({ ...editWikiForm, title: e.target.value })}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={10}
              value={editWikiForm.content}
              onChange={(e) => setEditWikiForm({ ...editWikiForm, content: e.target.value })}
            />
            <TextField
              label="Edit Summary"
              fullWidth
              placeholder="Briefly describe your changes"
              value={editWikiForm.editSummary}
              onChange={(e) => setEditWikiForm({ ...editWikiForm, editSummary: e.target.value })}
            />
            
            {/* Phase 2: Categories Management */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Categories
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddCategory}
                >
                  Add
                </Button>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {editWikiForm.categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    onDelete={() => handleRemoveCategory(cat)}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingWiki(false)}>Cancel</Button>
          <Button onClick={handleSaveWiki} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Docs;
