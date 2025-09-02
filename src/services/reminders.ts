// Stub de recordatorios: interfaz mínima para conectar con expo-notifications
export type ReminderPayload = {
  id: string;
  title: string;
  body: string;
  triggerDate: Date; // futuro: también por km
};

export async function scheduleReminder(_payload: ReminderPayload): Promise<string> {
  // Implementar con expo-notifications: Notifications.scheduleNotificationAsync(...)
  return 'stub-reminder-id';
}

export async function cancelReminder(_id: string): Promise<void> {
  // Implementar con expo-notifications: Notifications.cancelScheduledNotificationAsync(id)
}

