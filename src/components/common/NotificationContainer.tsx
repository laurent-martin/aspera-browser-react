import { ToastNotification } from '@carbon/react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import './NotificationContainer.css';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          kind={notification.type}
          title={notification.title}
          subtitle={notification.subtitle}
          timeout={notification.timeout}
          onClose={() => removeNotification(notification.id)}
          lowContrast
        />
      ))}
    </div>
  );
}

