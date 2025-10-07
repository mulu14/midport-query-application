import { NextRequest, NextResponse } from 'next/server';
import { SQLiteManager } from '@/lib/sqlite';

export async function GET() {
  try {
    // Get record counts from all tables
    const [customersCount, productsCount, ordersCount] = await Promise.all([
      SQLiteManager['apiGet']('SELECT COUNT(*) as count FROM customers').then(result => result[0].count),
      SQLiteManager['apiGet']('SELECT COUNT(*) as count FROM products').then(result => result[0].count),
      SQLiteManager['apiGet']('SELECT COUNT(*) as count FROM orders').then(result => result[0].count)
    ]);

    const tables = [
      { name: 'customers', record_count: customersCount },
      { name: 'products', record_count: productsCount },
      { name: 'orders', record_count: ordersCount }
    ];

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}
