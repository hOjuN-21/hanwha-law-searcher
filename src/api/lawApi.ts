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
  const url = `${BASE_URL}/lawSearch.do?OC=${API_KEY}&target=law&type=XML&query=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(url);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    
    const laws = xmlDoc.getElementsByTagName('law');
    const result: LawItem[] = [];
    
    for (let i = 0; i < laws.length; i++) {
      const law = laws[i];
      result.push({
        id: law.getElementsByTagName('법령일련번호')[0]?.textContent || '',
        name: law.getElementsByTagName('법령명kr')[0]?.textContent || law.getElementsByTagName('법령명')[0]?.textContent || '',
        promulDate: law.getElementsByTagName('공포일자')[0]?.textContent || '',
        enforceDate: law.getElementsByTagName('시행일자')[0]?.textContent || '',
        type: law.getElementsByTagName('법령구분명')[0]?.textContent || '',
        detailLink: law.getElementsByTagName('법령상세링크')[0]?.textContent || '',
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching law list:', error);
    throw error;
  }
};

export const fetchLawDetailHtml = async (lawId: string): Promise<string> => {
  // Use HTML type for direct rendering
  const url = `${BASE_URL}/lawService.do?OC=${API_KEY}&target=law&MST=${lawId}&type=HTML`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching law detail:', error);
    throw error;
  }
};
