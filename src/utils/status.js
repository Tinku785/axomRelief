// Request lifecycle. Mirrors the check constraint in migration 0008.
export const STATUS_ORDER = ['looking', 'in_progress', 'resolved'];

// Outlined, not filled: an unanswered request has to look urgent without
// turning every card into a block of red. Resolved is the one that gets a
// tint, because "done" is the state you want to read as settled.
export const STATUS_META = {
  looking: {
    key: 'statusLooking', label: 'Looking for help',
    color: '#B23A3A', border: '#B23A3A', bg: 'transparent',
  },
  in_progress: {
    key: 'statusInProgress', label: 'In progress',
    color: 'var(--orange)', border: '#D9A07A', bg: 'transparent',
  },
  resolved: {
    key: 'statusResolved', label: 'Help received',
    color: 'var(--green)', border: '#9CC7AE', bg: 'var(--green-bg)',
  },
};

// A row written before 0008 has no status column value in cached data.
export function statusOf(request) {
  return STATUS_META[request.status] ? request.status : 'looking';
}

export const isResolved = (request) => statusOf(request) === 'resolved';
