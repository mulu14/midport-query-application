/**
 * @fileoverview Customer entity interface and data access layer
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { SQLiteManager } from '@/lib/sqlite';

/**
 * Represents customer data structure
 * @interface CustomerData
 */
export interface CustomerData {
  /** Unique customer identifier */
  id: string;
  /** Customer full name */
  name: string;
  /** Customer email address */
  email: string;
  /** Customer phone number */
  phone: string;
}

/**
 * Customer data access class
 * Provides CRUD operations for customer entities
 * @class Customer
 */
export class Customer {
  /**
   * Retrieves all customers
   * @static
   * @async
   * @returns {Promise<CustomerData[]>} Array of customer objects
   * @throws {Error} If database query fails
   */
  static async list(): Promise<CustomerData[]> {
    return await SQLiteManager.getCustomers() as CustomerData[];
  }

  /**
   * Finds a customer by ID
   * @static
   * @async
   * @param {string} id - Customer ID to search for
   * @returns {Promise<CustomerData|null>} Customer object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id: string): Promise<CustomerData | null> {
    return await SQLiteManager.getCustomerById(id) as CustomerData | null;
  }

  /**
   * Creates a new customer record
   * @static
   * @async
   * @param {Omit<CustomerData, 'id'>} data - Customer data without ID (auto-generated)
   * @returns {Promise<CustomerData>} Created customer object with generated ID
   * @throws {Error} If customer creation fails
   */
  static async create(data: Omit<CustomerData, 'id'>): Promise<CustomerData> {
    return await SQLiteManager.createCustomer(data) as CustomerData;
  }
}
