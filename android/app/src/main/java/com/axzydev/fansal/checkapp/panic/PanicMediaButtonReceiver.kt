package com.axzydev.fansal.checkapp.panic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.KeyEvent

/**
 * BroadcastReceiver que escucha los MEDIA_BUTTON intents (botones de volumen)
 * incluso con la app cerrada o en background. Acumula presses en SharedPreferences
 * y al detectar 5 presses dentro de la ventana de tiempo, lanza la alerta.
 *
 * REGISTRADO EN EL MANIFEST. No requiere que la app esté corriendo.
 */
class PanicMediaButtonReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "PanicReceiver"
        const val ACTION_TRIGGERED = "com.axzydev.fansal.checkapp.PANIC_TRIGGERED"
        const val PREFS_NAME = "panic_prefs"
        const val KEY_PRESS_COUNT = "press_count"
        const val KEY_FIRST_PRESS_AT = "first_press_at"
        const val KEY_LAST_TRIGGER_AT = "last_trigger_at"
        const val KEY_LAST_DIRECTION = "last_direction"

        const val REQUIRED_PRESSES = 5
        const val PRESS_WINDOW_MS = 4000L

        fun resetState(prefs: SharedPreferences) {
            prefs.edit()
                .remove(KEY_PRESS_COUNT)
                .remove(KEY_FIRST_PRESS_AT)
                .remove(KEY_LAST_DIRECTION)
                .apply()
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_MEDIA_BUTTON) return

        val event: KeyEvent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT)
        } ?: return

        // Solo nos importan los KEY_DOWN (ignoramos KEY_UP para no duplicar)
        if (event.action != KeyEvent.ACTION_DOWN) return

        val keyCode = event.keyCode
        if (keyCode != KeyEvent.KEYCODE_VOLUME_UP &&
            keyCode != KeyEvent.KEYCODE_VOLUME_DOWN
        ) return

        val direction = if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) "UP" else "DOWN"
        Log.d(TAG, "MEDIA_BUTTON presionado: $direction")

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()

        // Evitar triggers duplicados en ventana corta
        val lastTrigger = prefs.getLong(KEY_LAST_TRIGGER_AT, 0L)
        if (now - lastTrigger < 10_000L) {
            Log.d(TAG, "Trigger reciente ignorado (cooldown 10s)")
            return
        }

        var pressCount = prefs.getInt(KEY_PRESS_COUNT, 0)
        var firstPressAt = prefs.getLong(KEY_FIRST_PRESS_AT, 0L)
        val lastDirection = prefs.getString(KEY_LAST_DIRECTION, null)

        // Si cambia la dirección, resetear. La alerta requiere consistencia
        // (5 UP consecutivas O 5 DOWN consecutivas).
        if (lastDirection != null && lastDirection != direction) {
            Log.d(TAG, "Dirección cambió ($lastDirection -> $direction), reseteando contador")
            pressCount = 0
            firstPressAt = 0L
        }

        if (pressCount == 0 || now - firstPressAt > PRESS_WINDOW_MS) {
            pressCount = 1
            firstPressAt = now
        } else {
            pressCount += 1
        }

        prefs.edit()
            .putInt(KEY_PRESS_COUNT, pressCount)
            .putLong(KEY_FIRST_PRESS_AT, firstPressAt)
            .putString(KEY_LAST_DIRECTION, direction)
            .apply()

        Log.d(TAG, "Press acumulado: $pressCount / $REQUIRED_PRESSES (dir=$direction)")

        // Haptic feedback en cada press
        vibrate(context, isAlert = false)

        if (pressCount >= REQUIRED_PRESSES) {
            prefs.edit()
                .putLong(KEY_LAST_TRIGGER_AT, now)
                .remove(KEY_PRESS_COUNT)
                .remove(KEY_FIRST_PRESS_AT)
                .remove(KEY_LAST_DIRECTION)
                .apply()

            Log.w(TAG, "ALERTA DE PÁNICO DISPARADA - 5 PRESSES DETECTADOS (dir=$direction)")
            vibrate(context, isAlert = true)
            triggerPanic(context)
        }
    }

    private fun triggerPanic(context: Context) {
        // 1) Iniciar el ForegroundService para mantener el proceso vivo
        //    y mostrar notificación persistente
        val serviceIntent = Intent(context, PanicForegroundService::class.java).apply {
            action = PanicForegroundService.ACTION_TRIGGER_PANIC
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }

        // 2) Enviar broadcast para que el PanicForegroundService (si ya corre)
        //    o cualquier listener JS reaccione
        val triggeredIntent = Intent(ACTION_TRIGGERED).apply {
            setPackage(context.packageName)
        }
        context.sendBroadcast(triggeredIntent)
    }

    private fun vibrate(context: Context, isAlert: Boolean) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE)
                    as? VibratorManager
                val vibrator = vm?.defaultVibrator ?: return
                if (isAlert) {
                    vibrator.vibrate(
                        VibrationEffect.createWaveform(
                            longArrayOf(0, 120, 80, 120, 80, 200),
                            -1
                        )
                    )
                } else {
                    vibrator.vibrate(VibrationEffect.createOneShot(60, VibrationEffect.DEFAULT_AMPLITUDE))
                }
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    ?: return
                if (isAlert) {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(longArrayOf(0, 120, 80, 120, 80, 200), -1)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(60)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibrate falló: ${e.message}")
        }
    }
}
