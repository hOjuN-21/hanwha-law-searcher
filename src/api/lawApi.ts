import axios from 'axios';

// Get API Key from environment variables
const API_KEY = import.meta.env.VITE_LAW_API_KEY || 'test';
const BASE_URL = 'https://www.law.go.kr/DRF';

export interface LawItem {
  id: string; // 법령일련번호 (lawSeq)
  name: string; // 법령명 (lawName)
  promulDate: string; // 공포일자 (promulDate)
  enforceDate: string; // 시행일자 (enforceDate)
  type: string; // 법령구분명
  detailLink: string; // 상세조회 링크
}

export const fetchLawList = async (query: string): Promise<LawItem[]> => {
  const targets = ['law', 'admrul', 'ordin', 'byl'];
  const allLaws: LawItem[] = [];

  const fetchTarget = async (target: string) => {
    // search=2 enables searching within the body of the law, not just the title
    const maxPages = 5; // Fetch up to 5 pages (500 items max per target)
    
    const fetchPage = async (page: number) => {
      const url = `${BASE_URL}/lawSearch.do?OC=${API_KEY}&target=${target}&type=XML&query=${encodeURIComponent(query)}&display=100&page=${page}&search=2`;
      try {
        const response = await axios.get(url);
        return response.data;
      } catch (e) {
        console.error(`Error fetching target ${target} page ${page}:`, e);
        return null;
      }
    };

    try {
      const firstPageData = await fetchPage(1);
      if (!firstPageData) return;

      const parser = new DOMParser();
      const parseAndAdd = (xmlStr: string) => {
        const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
        let tag = 'law';
        if (target === 'admrul') tag = 'admrul';
        if (target === 'byl') tag = 'byl';
        
        const laws = xmlDoc.getElementsByTagName(tag);
        for (let i = 0; i < laws.length; i++) {
          const law = laws[i];
          let id = ''; let name = ''; let promulDate = ''; let enforceDate = ''; let type = '';
          
          if (target === 'law') {
            id = law.getElementsByTagName('법령일련번호')[0]?.textContent || '';
            name = law.getElementsByTagName('법령명kr')[0]?.textContent || law.getElementsByTagName('법령명')[0]?.textContent || '';
            promulDate = law.getElementsByTagName('공포일자')[0]?.textContent || '';
            enforceDate = law.getElementsByTagName('시행일자')[0]?.textContent || '';
            type = law.getElementsByTagName('법령구분명')[0]?.textContent || '법령';
          } else if (target === 'admrul') {
            id = law.getElementsByTagName('행정규칙일련번호')[0]?.textContent || '';
            name = law.getElementsByTagName('행정규칙명')[0]?.textContent || '';
            promulDate = law.getElementsByTagName('발령일자')[0]?.textContent || '';
            enforceDate = law.getElementsByTagName('시행일자')[0]?.textContent || '';
            type = law.getElementsByTagName('행정규칙종류')[0]?.textContent || '행정규칙';
          } else if (target === 'ordin') {
            id = law.getElementsByTagName('자치법규일련번호')[0]?.textContent || '';
            name = law.getElementsByTagName('자치법규명')[0]?.textContent || '';
            promulDate = law.getElementsByTagName('공포일자')[0]?.textContent || '';
            enforceDate = law.getElementsByTagName('시행일자')[0]?.textContent || '';
            type = law.getElementsByTagName('자치법규종류')[0]?.textContent || '자치법규';
          } else if (target === 'byl') {
            id = law.getElementsByTagName('별표일련번호')[0]?.textContent || law.getElementsByTagName('별표번호')[0]?.textContent || '';
            name = law.getElementsByTagName('별표서식명')[0]?.textContent || law.getElementsByTagName('별표명')[0]?.textContent || '';
            promulDate = law.getElementsByTagName('공포일자')[0]?.textContent || '';
            enforceDate = law.getElementsByTagName('시행일자')[0]?.textContent || '';
            type = '별표/서식';
          }

          // Check to avoid duplicates in allLaws
          if (id && name && !allLaws.find(l => l.id === `${target}:${id}`)) {
            allLaws.push({
              id: `${target}:${id}`, name, promulDate, enforceDate, type, detailLink: ''
            });
          }
        }
        
        return xmlDoc;
      };

      const firstXml = parseAndAdd(firstPageData);
      const totalCntNode = firstXml?.getElementsByTagName('totalCnt')[0];
      if (totalCntNode && totalCntNode.textContent) {
        const totalCnt = parseInt(totalCntNode.textContent, 10);
        const neededPages = Math.min(maxPages, Math.ceil(totalCnt / 100));
        
        if (neededPages > 1) {
          const promises = [];
          for (let p = 2; p <= neededPages; p++) {
            promises.push(fetchPage(p));
          }
          const results = await Promise.all(promises);
          results.forEach(res => {
            if (res) parseAndAdd(res);
          });
        }
      }
    } catch (error) {
      console.error(`Error processing target ${target}:`, error);
    }
  };

  await Promise.all(targets.map(fetchTarget));
  return allLaws;
};

export const fetchLawDetailHtml = async (idParam: string): Promise<string> => {
  // Parse target and id
  const parts = idParam.split(':');
  const target = parts.length > 1 ? parts[0] : 'law';
  const lawId = parts.length > 1 ? parts[1] : idParam;

  // param name for ID varies by target
  let idField = 'MST';
  if (target === 'admrul') idField = 'ADM_NO';
  if (target === 'ordin') idField = 'ORDIN_SEQ';

  const url = `${BASE_URL}/lawService.do?OC=${API_KEY}&target=${target}&${idField}=${lawId}&type=HTML`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching law detail:', error);
    throw error;
  }
};
