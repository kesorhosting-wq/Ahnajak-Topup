import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-500/30 m-4">
          <CardHeader>
            <CardTitle className="text-red-500">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-secondary/50 p-4 rounded overflow-auto max-h-64 mb-4">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
              Reload
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
