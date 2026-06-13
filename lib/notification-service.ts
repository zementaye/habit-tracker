// Notification service utility - place in lib/notification-service.ts

import { createClient } from '@/lib/supabase'

export class NotificationService {
  private supabase = createClient()

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') return true
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return
    try {
      await navigator.serviceWorker.register('/service-worker.js')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  async scheduleRoutineNotifications(routineId: string, tasks: any[]) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    const { data: settings } = await this.supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!settings?.reminder_enabled) return

    // Schedule notifications for each task in the routine
    tasks.forEach(task => {
      const [hours, minutes] = task.scheduled_time.split(':').map(Number)
      this.scheduleNotification(
        task.icon + ' ' + task.task_name,
        `Time to ${task.task_name.toLowerCase()}`,
        new Date(new Date().setHours(hours, minutes, 0, 0))
      )
    })
  }

  async scheduleStreakAlert(habitName: string) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    const { data: settings } = await this.supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!settings?.streak_alerts) return

    // Schedule alert 2 hours before midnight
    const now = new Date()
    const alertTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0)
    
    this.scheduleNotification(
      '🔥 Streak at risk!',
      `Don't break your ${habitName} streak — log it now`,
      alertTime
    )
  }

  async scheduleDailyReminder(reminderTime: string) {
    const [hours, minutes] = reminderTime.split(':').map(Number)
    const scheduledTime = new Date(new Date().setHours(hours, minutes, 0, 0))

    // If time has passed today, schedule for tomorrow
    if (scheduledTime < new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1)
    }

    this.scheduleNotification(
      '✅ Time to log your habits',
      'Check off today\'s habits and keep your streaks alive',
      scheduledTime
    )
  }

  private scheduleNotification(title: string, body: string, scheduledTime: Date) {
    const now = new Date()
    const delay = scheduledTime.getTime() - now.getTime()

    if (delay > 0) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'routine-' + Date.now(),
            requireInteraction: true,
          })
        }
      }, delay)
    }
  }

  sendInstantNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'instant-' + Date.now(),
      })
    }
  }
}

export const notificationService = new NotificationService()