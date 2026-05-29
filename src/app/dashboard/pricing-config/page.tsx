import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import { db } from '@/lib/db';
import PricingConfigClient from './pricing-config-client';

export default async function PricingConfigPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Server-side guard: chỉ ADMIN và MANAGER được truy cập
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return <Unauthorized />;
  }

  // Tải tất cả dữ liệu song song từ database
  const [materials, laminationPrices, dieCutPrices, pricingRules, fileHandlingFees] = await Promise.all([
    db.material.findMany({ orderBy: { materialCode: 'asc' } }),
    db.laminationPrice.findMany({ orderBy: { laminationType: 'asc' } }),
    db.dieCutPrice.findMany({ orderBy: { minSheets: 'asc' } }),
    db.pricingRule.findMany({ orderBy: { ruleCode: 'asc' } }),
    db.fileHandlingFee.findMany({ orderBy: { minQuantity: 'asc' } }),
  ]);

  return (
    <PricingConfigClient
      initialMaterials={materials}
      initialLaminationPrices={laminationPrices}
      initialDieCutPrices={dieCutPrices}
      initialPricingRules={pricingRules}
      initialFileHandlingFees={fileHandlingFees}
      userRole={user.role}
    />
  );
}
