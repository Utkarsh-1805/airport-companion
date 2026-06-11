import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Airport Companion render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="runtime-error">
          <h1>Preview error</h1>
          <p>{this.state.error.message}</p>
          <small>Open DevTools Console for the full stack trace.</small>
        </div>
      );
    }

    return this.props.children;
  }
}
