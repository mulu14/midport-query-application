import { SQLiteManager } from '@/lib/sqlite';

export interface ProductData {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

export class Product {
  static async list(): Promise<ProductData[]> {
    return await SQLiteManager.getProducts() as ProductData[];
  }

  static async findById(id: string): Promise<ProductData | null> {
    return await SQLiteManager.getProductById(id) as ProductData | null;
  }

  static async create(data: Omit<ProductData, 'id'>): Promise<ProductData> {
    return await SQLiteManager.createProduct(data) as ProductData;
  }
}
