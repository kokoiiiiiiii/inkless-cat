import type { ReactNode } from 'react';
import { Component } from 'react';

type LazyChunkBoundaryProps = {
  children: ReactNode;
  renderError: (reload: () => void) => ReactNode;
};

type LazyChunkBoundaryState = {
  hasError: boolean;
};

/** Gives failed, on-demand feature chunks a visible recovery route. */
export class LazyChunkBoundary extends Component<LazyChunkBoundaryProps, LazyChunkBoundaryState> {
  state: LazyChunkBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyChunkBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.renderError(() => globalThis.location.reload());
    }
    return this.props.children;
  }
}
