package com.axzydev.fansal.checkapp.panic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * ForegroundService que:
 * 1. Mantiene el proceso de la app vivo en background (requerido en Android 8+
 *    para que el PanicMediaButtonReceiver siga activo).
 * 2. Muestra una notificación persistente "low priority" (tipo servicio de música)
 *    para que el sistema no mate el proceso.
 * 3. Reacciona al ACTION_TRIGGERED del PanicMediaButtonReceiver trayendo la app
 *    al frente y abriendo la pantalla de pánico.
 *
 * Este servicio se inicia:
 * - Al login del guardia (desde JS vía PanicNativeModule.startPanicService)
 * - Al boot del dispositivo (desde PanicBootReceiver)
 */
class PanicForegroundService : Service() {

    companion object {
        const val TAG = "PanicService"
        const val CHANNEL_ID = "fansal_panic_service"
        const val NOTIFICATION_ID = 9999
        const val ACTION_TRIGGER_PANIC = "com.axzydev.fansal.checkapp.TRIGGER_PANIC"
        const val ACTION_START = "com.axzydev.fansal.checkapp.START_PANIC_SERVICE"
        const val ACTION_STOP = "com.axzydev.fansal.checkapp.STOP_PANIC_SERVICE"
    }

    private var triggerReceiver: BroadcastReceiver? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "onCreate")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        Log.d(TAG, "onStartCommand action=$action")

        when (action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                startForeground(NOTIFICATION_ID, buildNotification())
                registerTriggerReceiver()
            }
        }
        return START_STICKY
    }

    private fun registerTriggerReceiver() {
        if (triggerReceiver != null) return
        triggerReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == PanicMediaButtonReceiver.ACTION_TRIGGERED) {
                    Log.w(TAG, "Pánico recibido en service - abriendo app")
                    bringAppToFront(context)
                }
            }
        }
        val filter = IntentFilter(PanicMediaButtonReceiver.ACTION_TRIGGERED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(triggerReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(triggerReceiver, filter)
        }
    }

    private fun bringAppToFront(context: Context) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: return
        launchIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_CLEAR_TOP
        )
        context.startActivity(launchIntent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(NotificationManager::class.java) ?: return
        if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Servicio de seguridad",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Mantiene la detección de alertas de pánico activa"
            setShowBadge(false)
        }
        mgr.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FansalCheck activo")
            .setContentText("Detección de emergencia habilitada")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setContentIntent(pi)
            .build()
    }

    override fun onDestroy() {
        Log.d(TAG, "onDestroy")
        triggerReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {}
        }
        triggerReceiver = null
        super.onDestroy()
    }
}
