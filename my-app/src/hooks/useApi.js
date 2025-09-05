import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      showSuccessToast = false, 
      successMessage = 'Operation completed successfully',
      showErrorToast = true 
    } = options;

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall();
      
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (showErrorToast) {
        const message = err.response?.data?.error?.message || 
                       err.response?.data?.message || 
                       err.message || 
                       'An error occurred';
        toast.error(message);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    execute,
  };
};

export const useAsyncState = (initialState = null) => {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (asyncFunction) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setState(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    state,
    loading,
    error,
    execute,
    setState,
  };
};

export default useApi;
