import { SQLiteManager } from '@/lib/sqlite';

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export class Customer {
  static async list(): Promise<CustomerData[]> {
    return await SQLiteManager.getCustomers() as CustomerData[];
  }

  static async findById(id: string): Promise<CustomerData | null> {
    return await SQLiteManager.getCustomerById(id) as CustomerData | null;
  }

  static async create(data: Omit<CustomerData, 'id'>): Promise<CustomerData> {
    return await SQLiteManager.createCustomer(data) as CustomerData;
  }
}
