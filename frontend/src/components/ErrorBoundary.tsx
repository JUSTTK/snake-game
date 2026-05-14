import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('错误边界捕获到异常:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="w-full max-w-lg rounded-lg p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="mb-4 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <svg
                  className="h-10 w-10"
                  style={{ color: 'var(--accent-red)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>页面发生错误</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                应用运行时遇到了异常。你可以尝试刷新页面，或者返回上一步重新进入。
              </p>
            </div>

            {this.state.error && (
              <div className="mb-4 rounded-md p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <p className="mb-2 text-sm font-medium" style={{ color: 'var(--accent-red)' }}>错误信息：</p>
                <pre className="overflow-x-auto text-xs" style={{ color: 'var(--accent-red)' }}>
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm" style={{ color: 'var(--text-muted)' }}>
                  查看详细堆栈
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-md p-3 text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent-cyan)', color: '#ffffff' }}
              >
                刷新页面
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}
              >
                返回上一页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
