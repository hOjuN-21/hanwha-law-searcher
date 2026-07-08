import { useState, useMemo } from 'react'
import { Search, Book, Calendar, X, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { fetchLawList, fetchLawDetailHtml, type LawItem } from './api/lawApi'
import * as XLSX from 'xlsx'
import './App.css'

const ITEMS_PER_PAGE = 25;

function App() {
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [laws, setLaws] = useState<LawItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  
  // Detail Modal State
  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null)
  const [detailHtml, setDetailHtml] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)

  // Filtering / Sorting State
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'promulDate' | 'enforceDate'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [promulStartDate, setPromulStartDate] = useState('')
  const [promulEndDate, setPromulEndDate] = useState('')
  const [enforceStartDate, setEnforceStartDate] = useState('')
  const [enforceEndDate, setEnforceEndDate] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setHasSearched(true)
    setCurrentPage(1)
    setLastQuery(query.trim())
    
    try {
      const result = await fetchLawList(query)
      setLaws(result)
    } catch (err) {
      setError('법령 정보를 불러오는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.')
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

    // 1. Type Filter
    if (typeFilter !== 'all') {
      result = result.filter(law => law.type.includes(typeFilter))
    }

    // 2. Promulgation Date Filter (공포일자)
    if (promulStartDate) {
      result = result.filter(law => law.promulDate.replace(/\D/g, '') >= promulStartDate.replace(/\D/g, ''))
    }
    if (promulEndDate) {
      result = result.filter(law => law.promulDate.replace(/\D/g, '') <= promulEndDate.replace(/\D/g, ''))
    }

    // 3. Enforcement Date Filter (시행일자)
    if (enforceStartDate) {
      result = result.filter(law => law.enforceDate.replace(/\D/g, '') >= enforceStartDate.replace(/\D/g, ''))
    }
    if (enforceEndDate) {
      result = result.filter(law => law.enforceDate.replace(/\D/g, '') <= enforceEndDate.replace(/\D/g, ''))
    }

    // 4. Sort
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
  }, [laws, typeFilter, sortBy, sortOrder, promulStartDate, promulEndDate, enforceStartDate, enforceEndDate])

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedLaws.length / ITEMS_PER_PAGE);
  const currentLaws = filteredAndSortedLaws.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Highlight Keyword
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="highlight">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Excel Export
  const exportToExcel = () => {
    if (filteredAndSortedLaws.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const excelData = filteredAndSortedLaws.map((law, index) => ({
      '순번': index + 1,
      '구분': law.type,
      '법령명': law.name,
      '공포일자': law.promulDate,
      '시행일자': law.enforceDate,
      '일련번호': law.id
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "법령검색결과");
    
    // Auto-size columns
    const wscols = [
      { wch: 5 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `법령검색결과_${lastQuery}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="glass-panel law-card skeleton-container">
        <div className="law-card-header">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-badge"></div>
        </div>
        <div className="law-meta">
          <div className="skeleton skeleton-meta"></div>
          <div className="skeleton skeleton-meta"></div>
        </div>
      </div>
    ))
  }

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

          <div className="type-tabs">
            {['all', '법령', '행정규칙', '자치법규', '별표'].map(type => (
              <button
                key={type}
                className={`type-tab ${typeFilter === (type === '별표' ? '별표/서식' : type) ? 'active' : ''}`}
                onClick={() => {
                  setTypeFilter(type === '별표' ? '별표/서식' : type);
                  setCurrentPage(1);
                }}
              >
                {type === 'all' ? '전체' : type}
              </button>
            ))}
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label>정렬:</label>
              <select 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem 1rem' }}
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
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
                  onClick={() => { setSortOrder(order => order === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                >
                  {sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
                </button>
              )}
            </div>
            
            <div className="filter-group">
              <label>공포일자:</label>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={promulStartDate}
                onChange={(e) => { setPromulStartDate(e.target.value); setCurrentPage(1); }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>~</span>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={promulEndDate}
                onChange={(e) => { setPromulEndDate(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="filter-group">
              <label>시행일자:</label>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={enforceStartDate}
                onChange={(e) => { setEnforceStartDate(e.target.value); setCurrentPage(1); }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>~</span>
              <input 
                type="date" 
                className="input-field" 
                style={{ width: 'auto', padding: '0.4rem' }}
                value={enforceEndDate}
                onChange={(e) => { setEnforceEndDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        <div className="results-section" style={{ marginTop: '2rem' }}>
          
          {hasSearched && !loading && !error && (
            <div className="results-header animate-fade-in">
              <span className="results-count">
                총 <strong>{filteredAndSortedLaws.length}</strong>건의 결과가 있습니다.
              </span>
              <button className="button-primary" style={{ padding: '0.5rem 1rem', background: '#10b981' }} onClick={exportToExcel}>
                <FileSpreadsheet size={18} />
                엑셀 다운로드
              </button>
            </div>
          )}

          {loading && (
             <div className="skeleton-wrapper">
               {renderSkeletons()}
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
              <p>검색 조건에 맞는 결과가 없습니다. 날짜나 필터를 변경해보세요.</p>
              <button className="button-primary" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.1)' }} onClick={() => {
                setTypeFilter('all');
                setPromulStartDate(''); setPromulEndDate('');
                setEnforceStartDate(''); setEnforceEndDate('');
              }}>필터 초기화</button>
            </div>
          )}

          {!loading && !error && currentLaws.map((law, index) => (
            <div 
              key={`${law.id}-${index}`} 
              className="glass-panel law-card animate-fade-in" 
              style={{ animationDelay: `${0.02 * index}s` }}
              onClick={() => openDetail(law)}
            >
              <div className="law-card-header">
                <h3 className="law-title">
                  {highlightText(law.name, lastQuery)}
                </h3>
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
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="pagination">
              <button 
                className="page-btn" 
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => {
                // Show limited page numbers around current page
                const pageNum = i + 1;
                if (
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button 
                      key={pageNum}
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 3 || 
                  pageNum === currentPage + 3
                ) {
                  return <span key={pageNum} style={{ color: 'var(--text-secondary)' }}>...</span>;
                }
                return null;
              })}

              <button 
                className="page-btn" 
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                &gt;
              </button>
            </div>
          )}

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
