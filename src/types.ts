export interface TariffRow {
  s_no: string;
  procedure: string;
  system: string;
  inclusions: string;
  exclusions: string;
  rates: string[];
}

export interface TariffData {
  hospital_name: string;
  rohini_id?: string;
  room_categories: string[];
  tariffs: TariffRow[];
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
}
