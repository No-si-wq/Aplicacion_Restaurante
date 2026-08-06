export interface Business {
  id: string;
  companyId: string;
  razonSocial: string;
  rtn: string;
  direccion: string;
  nombreComercial: string | null;
  telefono: string | null;
  logoUrl: string | null;
}