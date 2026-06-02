import React from 'react';
import { getInventoryPageData, getInventoryItems } from '@/lib/inventory-actions';
import InventoryClient from './inventory-client';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Quản lý kho vật tư - PackPrint Manager',
};

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user || ['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) {
    redirect('/dashboard');
  }

  const data = await getInventoryPageData();
  const initialItems = await getInventoryItems();

  return (
    <InventoryClient 
      initialData={data} 
      initialItems={initialItems} 
      userRole={user.role} 
    />
  );
}
