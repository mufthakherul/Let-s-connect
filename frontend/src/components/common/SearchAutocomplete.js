import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  InputAdornment,
  Paper,
  Popper,
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { debounce } from '../utils/helpers';

/**
 * Enhanced search bar with autocomplete, suggestions, and history
 * Can be used as a standalone component or integrated into navigation
 */
const SearchAutocomplete = ({ variant = 'outlined', size = 'small', fullWidth = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const navigate = useNavigate();

  // Load search history and trending searches
  useEffect(() => {
    loadSearchHistory();
    loadTrendingSearches();
  }, []);

  const loadSearchHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setSearchHistory(history.slice(0, 5)); // Last 5 searches
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      const response = await api.get('/content-service/search/trending');
      setTrendingSearches(response.data.trending || []);
    } catch (error) {
      // Fallback to mock trending searches if API fails
      setTrendingSearches([
        { query: 'React tutorials', count: 150 },
        { query: 'Web development', count: 120 },
        { query: 'JavaScript tips', count: 95 },
      ]);
    }
  };

  const saveToHistory = (query) => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const newHistory = [query, ...history.filter((item) => item !== query)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      setSearchHistory(newHistory.slice(0, 5));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // Debounced search suggestions fetch
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 2) {
        setOptions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get('/content-service/search/suggestions', {
          params: { query, limit: 8 },
        });
        
        const suggestions = response.data.suggestions || [];
        setOptions(suggestions.map((s) => ({
          label: s.text || s,
          type: s.type || 'suggestion',
          count: s.count,
        })));
      } catch (error) {
        // Fallback to local suggestions
        const localSuggestions = generateLocalSuggestions(query);
        setOptions(localSuggestions);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const generateLocalSuggestions = (query) => {
    const q = query.toLowerCase();
    const suggestions = [];

    // Add matching history items
    searchHistory.forEach((item) => {
      if (item.toLowerCase().includes(q)) {
        suggestions.push({ label: item, type: 'history' });
      }
    });

    // Add matching trending items
    trendingSearches.forEach((item) => {
      if (item.query.toLowerCase().includes(q)) {
        suggestions.push({ label: item.query, type: 'trending', count: item.count });
      }
    });

    return suggestions.slice(0, 8);
  };

  const handleInputChange = (event, value) => {
    setInputValue(value);
    
    if (value.trim().length >= 2) {
      fetchSuggestions(value);
    } else {
      // Show history and trending when no input
      const recentOptions = [
        ...searchHistory.map((item) => ({ label: item, type: 'history' })),
        ...trendingSearches.map((item) => ({ label: item.query, type: 'trending', count: item.count })),
      ].slice(0, 8);
      setOptions(recentOptions);
    }
  };

  const handleSearch = (event, value) => {
    if (value && typeof value === 'object' && value.label) {
      const query = value.label;
      saveToHistory(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setInputValue('');
    } else if (typeof value === 'string' && value.trim()) {
      saveToHistory(value);
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setInputValue('');
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      saveToHistory(inputValue);
      navigate(`/search?q=${encodeURIComponent(inputValue)}`);
      setInputValue('');
    }
  };

  const CustomPopper = (props) => {
    return <Popper {...props} placement="bottom-start" />;
  };

  return (
    <Autocomplete
      freeSolo
      options={options}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSearch}
      loading={loading}
      filterOptions={(x) => x} // Disable built-in filtering since we handle it
      PopperComponent={CustomPopper}
      renderInput={(params) => (
        <TextField
          {...params}
          variant={variant}
          size={size}
          placeholder="Search... (Cmd/Ctrl+K)"
          onKeyPress={handleKeyPress}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: fullWidth ? '100%' : 250,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
            },
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
            {option.type === 'history' && <HistoryIcon fontSize="small" color="action" />}
            {option.type === 'trending' && <TrendingIcon fontSize="small" color="primary" />}
            {option.type === 'suggestion' && <SearchIcon fontSize="small" color="action" />}
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2">{option.label}</Typography>
              {option.type === 'history' && (
                <Typography variant="caption" color="text.secondary">
                  Recent search
                </Typography>
              )}
            </Box>

            {option.count && (
              <Chip
                label={option.count}
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      )}
      PaperComponent={({ children, ...props }) => (
        <Paper {...props} elevation={8}>
          {children}
        </Paper>
      )}
      fullWidth={fullWidth}
    />
  );
};

export default SearchAutocomplete;
