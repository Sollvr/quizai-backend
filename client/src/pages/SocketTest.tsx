import React, { useEffect, useState } from 'react';
import { runSocketTests } from '../utils/socketTest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SocketTest() {
  const [testStatus, setTestStatus] = useState<string>('Not started');
  const [logs, setLogs] = useState<string[]>([]);

  // Override console.log to capture socket test outputs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.join(' ')]);
    };

    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleRunTests = async () => {
    setTestStatus('Running...');
    setLogs([]);
    try {
      await runSocketTests();
      setTestStatus('Completed');
    } catch (error) {
      setTestStatus('Failed');
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Socket.IO Connection Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleRunTests}>Run Tests</Button>
              <span>Status: {testStatus}</span>
            </div>
            <div className="bg-secondary p-4 rounded-lg max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap">
                {logs.map((log, i) => (
                  <div key={i} className="py-1">{log}</div>
                ))}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
