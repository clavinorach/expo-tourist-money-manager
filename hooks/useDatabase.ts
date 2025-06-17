import { useState, useEffect } from 'react';
import { initDatabase } from '../database';

export const useDatabase = () => {
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupDatabase = async () => {
      try {
        await initDatabase();
        if (isMounted) {
          setIsDbLoading(false);
        }
      } catch (e) {
        console.error('Database initialization error:', e);
        if (isMounted) {
          setDbError(e as Error);
          setIsDbLoading(false);
        }
      }
    };

    setupDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isDbLoading, dbError };
};