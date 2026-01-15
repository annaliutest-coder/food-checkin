
export interface CrmEntry {
  nickname: string;
  favoriteCountry: string;
  selectedTags: string[];
  feedback: string;
  eventDay: string;
  timestamp: string;
  id: string;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
