import { useEffect } from 'react';
import styles from './ComingSoonModal.module.css';

const FEATURE_INFO = {
  grpc: {
    title: 'gRPC Workspace (WIP)',
    summary: 'Unary RPC requests, metadata editing, and proto-based request builders are in progress.',
    items: [
      'Proto upload and service explorer',
      'Metadata and auth presets',
      'Streaming support after unary foundation',
    ],
  },
  graphql: {
    title: 'GraphQL Workspace (WIP)',
    summary: 'Schema-aware query editing and operation history are currently being built.',
    items: [
      'Schema introspection and docs panel',
      'Variables and headers editor',
      'Saved operations and collections integration',
    ],
  },
  websocket: {
    title: 'WebSocket Workspace (WIP)',
    summary: 'Realtime message testing is planned after gRPC and GraphQL base features.',
    items: [
      'Connect/disconnect sessions',
      'Live message timeline',
      'Reusable message templates',
    ],
  },
};

export function ComingSoonModal({ feature = 'grpc', onClose }) {
  const details = FEATURE_INFO[feature] || FEATURE_INFO.grpc;

  useEffect(() => {
    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label={details.title}>
        <header className={styles.header}>
          <h2>{details.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close coming soon dialog">
            Close
          </button>
        </header>

        <div className={styles.content}>
          <p className={styles.summary}>{details.summary}</p>
          <ul className={styles.list}>
            {details.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose}>
            Back to REST
          </button>
        </footer>
      </section>
    </div>
  );
}
