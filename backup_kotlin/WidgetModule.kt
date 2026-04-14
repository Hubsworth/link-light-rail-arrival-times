package com.david.linkrail

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updatePreferences(prefsJson: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("all_schedules", prefsJson).apply()
        
        // Trigger an immediate sync to apply new schedules
        val intent = Intent(context, LinkWidgetProvider::class.java).apply {
            action = "ACTION_SYNC_WIDGET"
        }
        context.sendBroadcast(intent)
    }

    @ReactMethod
    fun updateWidget(stopId: String, station: String, cacheJson: String, syncInterval: Int) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        
        editor.putString("active_stop_id", stopId)
        editor.putString("station_name", station)
        editor.putString("arrivals_cache", cacheJson)
        editor.putInt("sync_interval", syncInterval)
        editor.apply()

        LinkWidgetProvider.scheduleWork(context, syncInterval.toLong())

        updateWidgetProvider(context, LinkWidgetProvider::class.java)
        updateWidgetProvider(context, LinkWidgetProviderTransparent::class.java)
    }

    private fun updateWidgetProvider(context: Context, cls: Class<*>) {
        val intent = Intent(context, cls)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(ComponentName(context, cls))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
