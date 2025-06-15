import { useState, useEffect } from 'react';
import { initDatabase } from '../database';

export const useDatabase = () => {
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
      } catch (e) {
        setDbError(e as Error);
      } finally {
        setIsDbLoading(false);
      }
    };
    setupDatabase();
  }, []);

  return { isDbLoading, dbError };
};