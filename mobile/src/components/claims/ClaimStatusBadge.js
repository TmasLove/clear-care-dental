import React from 'react';
import Badge from '../common/Badge';

const statusConfig = {
  approved: { label: 'Approved', variant: 'approved' },
  pending: { label: 'Pending', variant: 'pending' },
  denied: { label: 'Denied', variant: 'denied' },
  paid: { label: 'Paid', variant: 'paid' },
  processing: { label: 'Processing', variant: 'pending' },
  submitted: { label: 'Submitted', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'pending' },
  appealed: { label: 'Appealed', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const ClaimStatusBadge = ({ status, size = 'medium', style }) => {
  const config = statusConfig[status?.toLowerCase()] || {
    label: status || 'Unknown',
    variant: 'default',
  };

  return (
    <Badge
      label={config.label}
      variant={config.variant}
      size={size}
      style={style}
    />
  );
};

export default ClaimStatusBadge;
