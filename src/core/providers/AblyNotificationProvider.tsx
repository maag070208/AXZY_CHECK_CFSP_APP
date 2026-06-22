import * as Ably from 'ably';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../store/slices/toast.slice';
import { RootState } from '../store/redux.config';

const ABLY_KEY = '_iYGPA.fJVkAw:ix6oVHub7TpqllbX6JMdmfJgDoqKKEIoZ5wJNRo6Zlc';

export const AblyNotificationProvider = () => {
  const dispatch = useDispatch();
  const isSignedIn = useSelector((state: RootState) => state.userState.isSignedIn);

  useEffect(() => {
    if (!isSignedIn) return;

    const ably = new Ably.Realtime({ key: ABLY_KEY });

    ably.connection.on('connected', () => {
      console.log('[Ably] Conectado a notificaciones');
    });

    const globalChannel = ably.channels.get('global');

    globalChannel.subscribe('notification', (msg: any) => {
      const { title, message, type } = msg.data;
      dispatch(
        showToast({
          type: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info',
          message: `${title ? title + ': ' : ''}${message}`,
          hideMillis: type === 'error' ? 8000 : 5000,
        }),
      );
    });

    return () => {
      globalChannel.unsubscribe();
      ably.close();
    };
  }, [isSignedIn, dispatch]);

  return null;
};
