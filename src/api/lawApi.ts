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
    // 200 items per target to allow deep client-side filtering and pagination
    const url = `${BASE_URL}/lawSearch.do?OC=${API_KEY}&target=${target}&type=XML&query=${encodeURIComponent(query)}&numOfRows=200`;
    
    try {
      const response = await axios.get(url);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      
      // Determine the element tag name based on target
      let tag = 'law';
      if (target === 'admrul') tag = 'admrul';
      if (target === 'byl') tag = 'byl';
      // ordin uses <law> according to testing
      
      const laws = xmlDoc.getElementsByTagName(tag);
      
      for (let i = 0; i < laws.length; i++) {
        const law = laws[i];
        
        let id = '';
        let name = '';
        let promulDate = '';
        let enforceDate = '';
        let type = '';
        
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

        if (id && name) {
          allLaws.push({
            id: `${target}:${id}`, // Prefix id with target to distinguish in fetchLawDetailHtml
            name,
            promulDate,
            enforceDate,
            type,
            detailLink: ''
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching target ${target}:`, error);
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
