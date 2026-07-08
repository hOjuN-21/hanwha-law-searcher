import { useState, useMemo } from 'react'
import { Search, Book, Calendar, X, AlertCircle } from 'lucide-react'
import { fetchLawList, fetchLawDetailHtml, type LawItem } from './api/lawApi'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [laws, setLaws] = useState<LawItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  
  // Detail Modal State
  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null)
  const [detailHtml, setDetailHtml] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

  // Filtering / Sorting State
  const [sortBy, setSortBy] = useState<'relevance' | 'promulDate' | 'enforceDate'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setHasSearched(true)
    
    try {
      const result = await fetchLawList(query)
      setLaws(result)
    } catch (err) {
      setError('법령 정보를 불러오는 중 오류가 발생했습니다. API 키나 네트워크 연결을 확인해주세요.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (law: LawItem) => {
    setSelectedLaw(law)
    setDetailLoading(true)
    setDetailHtml('')
    try {
      const html = await fetchLawDetailHtml(law.id)
      setDetailHtml(html)
    } catch (err) {
      setDetailHtml('<div class="empty-state">본문을 불러오는 중 오류가 발생했습니다.</div>')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedLaw(null)
    setDetailHtml('')
  }

  // Filter and sort the laws
  const filteredAndSortedLaws = useMemo(() => {
    let result = [...laws];

    // Filter by dates if provided (using promulDate as the primary filter date here, or enforceDate)
    // To make it comprehensive, let's filter if EITHER date falls in range, or we can just stick to promulDate.
    if (startDate) {
      result = result.filter(law => {
        const pDate = law.promulDate.replace(/\D/g, '');
        const eDate = law.enforceDate.replace(/\D/g, '');
        const sDate = startDate.replace(/\D/g, '');
        return pDate >= sDate || eDate >= sDate;
      })
    }
    if (endDate) {
      result = result.filter(law => {
        const pDate = law.promulDate.replace(/\D/g, '');
        const eDate = law.enforceDate.replace(/\D/g, '');
        const eDateFilter = endDate.replace(/\D/g, '');
        return pDate <= eDateFilter || eDate <= eDateFilter;
      })
    }

    // Sort
    if (sortBy !== 'relevance') {
      result.sort((a, b) => {
        const valA = (sortBy === 'promulDate' ? a.promulDate : a.enforceDate).replace(/\D/g, '')
        const valB = (sortBy === 'promulDate' ? b.promulDate : b.enforceDate).replace(/\D/g, '')
        
        if (sortOrder === 'desc') {
          return valB.localeCompare(valA)
        }
        return valA.localeCompare(valB)
      })
    }

    return result;
  }, [laws, sortBy, sortOrder, startDate, endDate])

  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <h1>국가법령 검색기</h1>
        <p>대한민국의 모든 법령을 쉽고 빠르게 검색하세요</p>
      </header>

      <main>
        <div className="glass-panel search-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSearch} className="search-bar-row">
            <div className="input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="법령명을 입력하세요 (예: 민법, 도로교통법)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </button>
          </form>

          <div className="filters-row">
            <div className="filter-group">
              <label>정렬 방식:</label>
              <select 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem 1rem' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="relevance">관련도순</option>
                <option value="promulDate">공포일자순</option>
                <option value="enforceDate">시행일자순</option>
              </select>
              
              {sortBy !== 'relevance' && (
                <button 
                  type="button"
                  className="button-primary"
                  style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)' }}
                  onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
                </button>
              )}
            </div>
            
            <div className="filter-group" style={{ marginLeft: 'auto' }}>
              <label>날짜 필터 (공포/시행):</label>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span>~</span>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="results-section" style={{ marginTop: '2rem' }}>
          {loading && (
            <div className="loading-state">
              <div className="loader"></div>
              <p>법령 정보를 불러오는 중입니다...</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && hasSearched && filteredAndSortedLaws.length === 0 && (
            <div className="empty-state animate-fade-in">
              <Book size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>검색 결과가 없습니다. 다른 검색어나 필터를 적용해보세요.</p>
            </div>
          )}

          {!loading && !error && filteredAndSortedLaws.map((law, index) => (
            <div 
              key={law.id} 
              className="glass-panel law-card animate-fade-in" 
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              onClick={() => openDetail(law)}
            >
              <div className="law-card-header">
                <h3 className="law-title">{law.name}</h3>
                <span className="badge">{law.type}</span>
              </div>
              <div className="law-meta">
                <div className="law-meta-item">
                  <Calendar size={16} />
                  <span>공포일자: {law.promulDate}</span>
                </div>
                <div className="law-meta-item">
                  <Calendar size={16} />
                  <span>시행일자: {law.enforceDate}</span>
                </div>
                <div className="law-meta-item">
                  <span style={{ color: 'var(--text-secondary)' }}>일련번호: {law.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedLaw && (
        <div className="modal-overlay animate-fade-in" onClick={closeDetail}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedLaw.name}</h2>
              <button className="close-btn" onClick={closeDetail}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div className="loading-state">
                  <div className="loader"></div>
                  <p>본문을 불러오는 중입니다...</p>
                </div>
              ) : (
                <div 
                  className="law-html-container"
                  dangerouslySetInnerHTML={{ __html: detailHtml }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
