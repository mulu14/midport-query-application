import { SQLiteManager } from '@/lib/sqlite';

export interface OrderData {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  order_date: string;
  status: string;
}

export interface OrderWithDetails extends OrderData {
  customer_name: string;
  product_name: string;
  price: number;
}

export class Order {
  static async list(): Promise<OrderWithDetails[]> {
    return await SQLiteManager.getOrders() as OrderWithDetails[];
  }

  static async findById(id: string): Promise<OrderWithDetails | null> {
    return await SQLiteManager.getOrderById(id) as OrderWithDetails | null;
  }

  static async create(data: Omit<OrderData, 'id'>): Promise<OrderWithDetails> {
    return await SQLiteManager.createOrder(data) as OrderWithDetails;
  }
}
