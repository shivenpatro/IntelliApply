import { Component, lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react';

const MatchOrb = lazy(() => import('../three/MatchOrb'));
const query = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};

class DecorationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function DecorativeOrb() {
  const enabled = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
  if (!enabled) return null;
  return <DecorationBoundary><Suspense fallback={null}><MatchOrb /></Suspense></DecorationBoundary>;
}
