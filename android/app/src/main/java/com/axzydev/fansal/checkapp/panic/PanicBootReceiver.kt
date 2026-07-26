package com.axzydev.fansal.checkapp.panic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Se activa con BOOT_COMPLETED. Si el guardia tenía activado el servicio
 * de pánico antes del reinicio, lo reanuda automáticamente.
 */
class PanicBootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "PanicBootReceiver"
        const val PREFS_NAME = "panic_service_prefs"
        const val KEY_SERVICE_ACTIVE = "service_active"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val receivedAction = intent.action ?: return
        if (receivedAction != Intent.ACTION_BOOT_COMPLETED &&
            receivedAction != "android.intent.action.QUICKBOOT_POWERON" &&
            receivedAction != "android.intent.action.MY_PACKAGE_REPLACED"
        ) return

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val active = prefs.getBoolean(KEY_SERVICE_ACTIVE, false)
        if (!active) {
            Log.d(TAG, "Boot detectado pero servicio no estaba activo")
            return
        }

        Log.d(TAG, "Boot detectado - reactivando PanicForegroundService")
        val serviceIntent = Intent(context, PanicForegroundService::class.java).apply {
            setAction(PanicForegroundService.ACTION_START)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
