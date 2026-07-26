package com.axzydev.fansal.checkapp.panic

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge nativo a React Native. Expone:
 * - startPanicService(): arranca el ForegroundService + registra el receiver
 * - stopPanicService(): detiene todo
 * - isServiceRunning(): estado actual
 * - getPressState(): presión acumulada en SharedPreferences (para sincronizar UI JS)
 * - resetPressState(): reset del contador
 *
 * Emite eventos a JS:
 * - "PanicTriggered" cuando se dispara la alerta (app cerrada o background)
 */
class PanicModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PanicModule"
        const val NAME = "PanicModule"
        const val SERVICE_PREFS = "panic_service_prefs"
        const val KEY_SERVICE_ACTIVE = "service_active"
    }

    private var triggerReceiver: BroadcastReceiver? = null

    override fun getName(): String = NAME

    @ReactMethod
    fun startPanicService(promise: Promise) {
        try {
            val ctx = reactContext.applicationContext
            ctx.getSharedPreferences(SERVICE_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_SERVICE_ACTIVE, true)
                .apply()

            val intent = Intent(ctx, PanicForegroundService::class.java).apply {
                action = PanicForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }

            registerTriggerReceiver()
            Log.d(TAG, "PanicForegroundService iniciado")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error iniciando servicio", e)
            promise.reject("PANIC_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopPanicService(promise: Promise) {
        try {
            val ctx = reactContext.applicationContext
            ctx.getSharedPreferences(SERVICE_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_SERVICE_ACTIVE, false)
                .apply()

            val intent = Intent(ctx, PanicForegroundService::class.java).apply {
                action = PanicForegroundService.ACTION_STOP
            }
            ctx.startService(intent)

            unregisterTriggerReceiver()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PANIC_STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(
            reactContext.getSharedPreferences(SERVICE_PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_SERVICE_ACTIVE, false)
        )
    }

    @ReactMethod
    fun getPressState(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(
            PanicMediaButtonReceiver.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        val now = System.currentTimeMillis()
        val firstAt = prefs.getLong(PanicMediaButtonReceiver.KEY_FIRST_PRESS_AT, 0L)
        val pressCount = prefs.getInt(PanicMediaButtonReceiver.KEY_PRESS_COUNT, 0)
        val expired = firstAt > 0L && now - firstAt > PanicMediaButtonReceiver.PRESS_WINDOW_MS
        val map: WritableMap = Arguments.createMap()
        map.putInt("pressCount", if (expired) 0 else pressCount)
        map.putLong("firstPressAt", firstAt)
        map.putBoolean("windowExpired", expired)
        promise.resolve(map)
    }

    @ReactMethod
    fun resetPressState(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(
            PanicMediaButtonReceiver.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        PanicMediaButtonReceiver.resetState(prefs)
        promise.resolve(true)
    }

    private fun registerTriggerReceiver() {
        if (triggerReceiver != null) return
        triggerReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == PanicMediaButtonReceiver.ACTION_TRIGGERED) {
                    val params = Arguments.createMap()
                    params.putDouble("timestamp", System.currentTimeMillis().toDouble())
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("PanicTriggered", params)
                }
            }
        }
        val filter = IntentFilter(PanicMediaButtonReceiver.ACTION_TRIGGERED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(
                triggerReceiver,
                filter,
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(triggerReceiver, filter)
        }
    }

    private fun unregisterTriggerReceiver() {
        triggerReceiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: Exception) {}
        }
        triggerReceiver = null
    }

    override fun onCatalystInstanceDestroy() {
        unregisterTriggerReceiver()
        super.onCatalystInstanceDestroy()
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Requerido por RCTDeviceEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Requerido por RCTDeviceEventEmitter
    }
}
