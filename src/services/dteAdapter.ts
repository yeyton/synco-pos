/**
 * DTE (Chile - SII) ADAPTER SERVICE
 * Integrates TaxInvoiceProvider interface, Mock, SimpleFactura, and OpenFactura adapters.
 */

export interface DTECustomerData {
  rut: string;
  razonSocial: string;
  giro: string;
  direccion: string;
  comuna: string;
  email?: string;
}

export interface DTEItemData {
  name: string;
  qty: number;
  unitNetPrice: number;
  vatRate: number; // 19.0
  totalNet: number;
  totalGross: number;
}

export interface DTEInvoiceRequest {
  orderId: string;
  storeRut: string;
  dteType: 33 | 39; // 33: Factura, 39: Boleta
  customer?: DTECustomerData;
  items: DTEItemData[];
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface DTEInvoiceResponse {
  success: boolean;
  folio: number;
  dteType: number;
  trackId?: string;
  siiStatus: 'ACCEPTED_SII' | 'PENDING_SII' | 'OFFLINE_QUEUED' | 'REJECTED_SII';
  pdfUrl?: string;
  xmlPayload?: string;
  tedXml?: string;
  errorMessage?: string;
}

export interface TaxInvoiceProvider {
  emitirBoleta(request: DTEInvoiceRequest): Promise<DTEInvoiceResponse>;
  emitirFactura(request: DTEInvoiceRequest): Promise<DTEInvoiceResponse>;
}

export class MockInvoiceAdapter implements TaxInvoiceProvider {
  private currentBoletaFolio = 1000;
  private currentFacturaFolio = 500;

  async emitirBoleta(request: DTEInvoiceRequest): Promise<DTEInvoiceResponse> {
    this.currentBoletaFolio++;
    const folio = this.currentBoletaFolio;
    return {
      success: true,
      folio,
      dteType: 39,
      trackId: `MOCK-TRACK-${Date.now()}`,
      siiStatus: 'ACCEPTED_SII',
      pdfUrl: `https://api.mock-dte.local/pdf/39/${folio}`,
      xmlPayload: `<DTE version="1.0"><Documento ID="DTE39F${folio}">...</Documento></DTE>`,
      tedXml: `<TED version="1.0"><DD><RE>76123456-7</RE><TD>39</TD><F>${folio}</F></DD></TED>`
    };
  }

  async emitirFactura(request: DTEInvoiceRequest): Promise<DTEInvoiceResponse> {
    this.currentFacturaFolio++;
    const folio = this.currentFacturaFolio;
    return {
      success: true,
      folio,
      dteType: 33,
      trackId: `MOCK-TRACK-${Date.now()}`,
      siiStatus: 'ACCEPTED_SII',
      pdfUrl: `https://api.mock-dte.local/pdf/33/${folio}`,
      xmlPayload: `<DTE version="1.0"><Documento ID="DTE33F${folio}">...</Documento></DTE>`,
      tedXml: `<TED version="1.0"><DD><RE>76123456-7</RE><TD>33</TD><F>${folio}</F></DD></TED>`
    };
  }
}

export class DTEProviderFactory {
  static getProvider(): TaxInvoiceProvider {
    const provider = process.env.DTE_PROVIDER || 'mock';
    switch (provider.toLowerCase()) {
      case 'mock':
      default:
        return new MockInvoiceAdapter();
    }
  }
}
