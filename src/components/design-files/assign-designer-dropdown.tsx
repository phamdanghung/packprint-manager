'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { assignDesigner } from '@/lib/design-file-actions';

export default function AssignDesignerDropdown({ fileId, designers }: { fileId: string, designers: any[] }) {
  const router = useRouter();

  const handleAssign = async (designerId: string) => {
    if (!designerId) return;
    const res = await assignDesigner(fileId, designerId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Lỗi gán designer');
    }
  };

  return (
    <select 
      className="border rounded p-1 text-xs"
      onChange={e => handleAssign(e.target.value)}
      defaultValue=""
    >
      <option value="" disabled>Gán designer</option>
      {designers.map(d => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  );
}
