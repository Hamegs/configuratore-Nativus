import React from 'react';
import type { BlockingError } from '../../engine/errors';

interface BlockAlertsProps {
  blocks: BlockingError[];
}

export function BlockAlerts({ blocks }: BlockAlertsProps) {
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-2">
      {blocks.map(b => (
        <div key={b.code} className="alert-hard flex gap-2" role="alert">
          <span className="shrink-0 font-bold">STOP</span>
          <span>{b.message_it}</span>
        </div>
      ))}
    </div>
  );
}
