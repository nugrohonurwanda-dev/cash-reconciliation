// src/types/shift.ts

export type Tab = "esb" | "fisik" | "special" | "submit";

export type TransactionLine = {
  kategori: string;
  nilai: string;
  catatan: string;
};

export type SpecialLog = {
  tipe: "VOID" | "DISCOUNT" | "DEPOSIT" | "OTHER_COST";
  nomor_bill?: string;
  alasan?: string;
  nama_member?: string;
  metode?: string;
  nomor_referensi?: string;
  kategori_biaya?: string;
  keterangan?: string;
  nominal: string;
};

export type KategoriSummary = {
  kategori: string;
  esb: string;
  fisik: string;
  selisih: string;
};

export type ShiftTotals = {
  total_deposit_fisik: string;
  total_esb: string;
  total_fisik: string;
  total_selisih: string;
  total_fisik_sales: string;       // ← tambah
  total_esb_sales: string;         // ← tambah
  total_deposit_esb: string; 
  per_kategori: KategoriSummary[];
  is_variance_exceeded: boolean;
};

export type DailyAccumulation = {
  shift_1: ShiftTotals | null;
  shift_2: ShiftTotals | null;
  combined: {
    total_esb: string;
    total_fisik: string;
    total_selisih: string;
    per_kategori: KategoriSummary[];
  };
};

export type Shift = {
  id: string;
  shift_date: string;
  opened_at: string;
  modal_awal: string;
  status: string;
  shift_period: "SHIFT_1" | "SHIFT_2";
  variance_note?: string;
  opener?: { full_name: string };
  reconciliation?: ShiftTotals;       
  transaction_lines?: any[];
  special_logs?: any[];
  approvals?: any[];
  daily_accumulation?: DailyAccumulation | null;
};

export type SubmitTotals = {
  totalEsb: number;
  totalFisik: number;
  totalSelisih: number;
  isVarianceExceeded: boolean;
};

