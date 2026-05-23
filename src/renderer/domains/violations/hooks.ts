import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../../shared/errors';
import type { LogEntry } from '../../../shared/listing';
import type { ViolationMatch } from '../../../shared/violations';
import { violationsClient } from './client';

interface ScanResultSummary {
  scanned: number;
  total: number;
}

export function useViolationWorkflow(accountId: string) {
  const queryClient = useQueryClient();
  const wordsKey = ['violations', accountId, 'words'];
  const wordsQuery = useQuery({
    queryKey: wordsKey,
    enabled: !!accountId,
    queryFn: () => violationsClient.getWords(accountId),
    initialData: [],
  });
  const saveWordsMutation = useMutation({
    mutationFn: (words: string[]) => violationsClient.saveWords(accountId, words),
    onSuccess: (_result, words) => queryClient.setQueryData(wordsKey, words),
  });

  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [violations, setViolations] = useState<ViolationMatch[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [currentViolation, setCurrentViolation] = useState<(ViolationMatch & { scanned: number }) | null>(null);
  const [oneByOneScanning, setOneByOneScanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanResult, setScanResult] = useState<ScanResultSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const unsubscribeLogs = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const subscribeLogs = useCallback(() => {
    unsubscribeLogs();
    unsubscribeRef.current = violationsClient.onLog(accountId, (log: LogEntry) => {
      setLogs(prev => [...prev, log]);
    });
  }, [accountId, unsubscribeLogs]);

  const resetScanState = useCallback(() => {
    setViolations([]);
    setSelectedKeys([]);
    setScanResult(null);
    setLogs([]);
    setError(null);
  }, []);

  const captureError = useCallback((err: unknown) => {
    const message = getErrorMessage(err);
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const saveWords = useCallback(async (words: string[]) => {
    clearError();
    try {
      return await saveWordsMutation.mutateAsync(words);
    } catch (err: unknown) {
      captureError(err);
      throw err;
    }
  }, [captureError, clearError, saveWordsMutation]);

  const batchScan = useCallback(async (limit: number) => {
    setScanning(true);
    resetScanState();
    subscribeLogs();
    try {
      const result = await violationsClient.batchScan(accountId, limit);
      setViolations(result.violations);
      setScanResult({ scanned: result.scanned, total: result.violations.length });
      return result;
    } catch (err: unknown) {
      captureError(err);
      throw err;
    } finally {
      unsubscribeLogs();
      setScanning(false);
    }
  }, [accountId, captureError, resetScanState, subscribeLogs, unsubscribeLogs]);

  const batchDelete = useCallback(async (items: ViolationMatch[]) => {
    if (items.length === 0) return { deleted: 0, errors: 0, stopped: false };
    setDeleting(true);
    clearError();
    subscribeLogs();
    try {
      const result = await violationsClient.batchDelete(accountId, items);
      setSelectedKeys([]);
      setViolations(prev => prev.filter(item => !items.some(deleted => deleted.productId === item.productId)));
      setScanResult(prev => prev ? { ...prev, total: Math.max(0, prev.total - items.length) } : prev);
      return result;
    } catch (err: unknown) {
      captureError(err);
      throw err;
    } finally {
      unsubscribeLogs();
      setDeleting(false);
    }
  }, [accountId, captureError, clearError, subscribeLogs, unsubscribeLogs]);

  const handleStepResult = useCallback((result: Awaited<ReturnType<typeof violationsClient.scanStep>>) => {
    if (stoppedRef.current) return result;
    if (result.type === 'violation') {
      setCurrentViolation(result);
      return result;
    }
    setCurrentViolation(null);
    setOneByOneScanning(false);
    unsubscribeLogs();
    return result;
  }, [unsubscribeLogs]);

  const nextViolation = useCallback(async () => {
    if (stoppedRef.current) return { type: 'stopped', reason: '已停止' } as const;
    try {
      const result = await violationsClient.scanStep(accountId, 'next');
      return handleStepResult(result);
    } catch (err: unknown) {
      captureError(err);
      throw err;
    }
  }, [accountId, captureError, handleStepResult]);

  const startOneByOne = useCallback(async () => {
    setOneByOneScanning(true);
    stoppedRef.current = false;
    setCurrentViolation(null);
    setScanResult(null);
    setLogs([]);
    clearError();
    subscribeLogs();
    try {
      return await nextViolation();
    } catch (err: unknown) {
      setOneByOneScanning(false);
      unsubscribeLogs();
      throw err;
    }
  }, [clearError, nextViolation, subscribeLogs, unsubscribeLogs]);

  const deleteCurrentViolation = useCallback(async () => {
    if (!currentViolation || stoppedRef.current) return { type: 'stopped', reason: '已停止' } as const;
    clearError();
    try {
      const result = await violationsClient.scanStep(accountId, 'delete');
      if (result.type === 'stopped') return handleStepResult(result);
      setCurrentViolation(null);
      return await nextViolation();
    } catch (err: unknown) {
      captureError(err);
      throw err;
    }
  }, [accountId, captureError, clearError, currentViolation, handleStepResult, nextViolation]);

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    try {
      await violationsClient.stop(accountId);
    } catch (err: unknown) {
      captureError(err);
      throw err;
    } finally {
      setScanning(false);
      setOneByOneScanning(false);
      setCurrentViolation(null);
      unsubscribeLogs();
    }
  }, [accountId, captureError, unsubscribeLogs]);

  useEffect(() => {
    resetScanState();
    setScanning(false);
    setDeleting(false);
    setOneByOneScanning(false);
    setCurrentViolation(null);
    setError(null);
    stoppedRef.current = false;
    return unsubscribeLogs;
  }, [accountId, resetScanState, unsubscribeLogs]);

  return {
    words: wordsQuery.data || [],
    wordsLoading: wordsQuery.isLoading,
    saveWords,
    scanning,
    deleting,
    violations,
    selectedKeys,
    setSelectedKeys,
    currentViolation,
    oneByOneScanning,
    logs,
    scanResult,
    error,
    clearError,
    batchScan,
    batchDelete,
    startOneByOne,
    nextViolation,
    deleteCurrentViolation,
    stop,
  };
}
