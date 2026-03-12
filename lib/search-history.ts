const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10

export interface SearchHistoryItem {
  query: string
  timestamp: number
  type: 'products' | 'suppliers' | 'all'
}

export function addSearchHistory(query: string, type: 'products' | 'suppliers' | 'all' = 'all') {
  if (query.length < 2) return
  
  try {
    const history: SearchHistoryItem[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    
    // Remove existing same query
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase())
    
    // Add new
    const newItem: SearchHistoryItem = { query, timestamp: Date.now(), type }
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY)
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Search history save failed:', error)
  }
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Search history clear failed:', error)
  }
}

export function trackPopularSearches(query: string) {
  // Could send to /api/search/analytics for server tracking
  // For now, just local history
  addSearchHistory(query)
}

