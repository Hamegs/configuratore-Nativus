export interface PackagingSku {
  sku_id: string;
  product_id: string;
  descrizione_sku: string;
  pack_size: number;
  pack_unit: string;
  componenti: string;
  note_packaging: string;
}

export interface ListinoSku {
  sku_id: string;
  prezzo_listino: number;
  valuta: string;
  valid_from: string;
  valid_to: string;
  note_prezzo: string;
}
