package com.david.linkrail

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import org.json.JSONArray
import java.util.*
import java.util.concurrent.TimeUnit

class LinkWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        val interval = prefs.getInt("sync_interval", 15).toLong()
        scheduleWork(context, interval)
        for (id in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "ACTION_SYNC_WIDGET") {
            val syncRequest = OneTimeWorkRequestBuilder<WidgetSyncWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueue(syncRequest)
        }
    }

    companion object {
        fun scheduleWork(context: Context, intervalMinutes: Long, forceReplace: Boolean = false) {
            val finalInterval = if (intervalMinutes < 15) 15 else intervalMinutes
            val workRequest = PeriodicWorkRequestBuilder<WidgetSyncWorker>(finalInterval, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            
            val policy = if (forceReplace) ExistingPeriodicWorkPolicy.REPLACE else ExistingPeriodicWorkPolicy.UPDATE

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "WidgetSync",
                policy,
                workRequest
            )
        }

        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_layout)
                val prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
                
                views.setTextViewText(R.id.station_name, prefs.getString("station_name", "Link Arrivals"))

                val syncIntent = Intent(context, LinkWidgetProvider::class.java).apply {
                    action = "ACTION_SYNC_WIDGET"
                }
                val pendingIntent = PendingIntent.getBroadcast(context, 101, syncIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.sync_button, pendingIntent)

                val currentTime = System.currentTimeMillis()
                
                // Show last sync time if available
                val lastSync = prefs.getLong("last_sync_time", 0)
                if (lastSync > 0) {
                    val sdf = java.text.SimpleDateFormat("h:mm a", java.util.Locale.getDefault())
                    views.setTextViewText(R.id.last_updated, "Updated: ${sdf.format(java.util.Date(lastSync))}")
                    views.setViewVisibility(R.id.last_updated, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.last_updated, View.GONE)
                }

                val cacheStr = prefs.getString("arrivals_cache", "[]")
                val cache = JSONArray(cacheStr)
                val upcoming = mutableListOf<Triple<String, Long, String>>()
                
                for (i in 0 until cache.length()) {
                    val obj = cache.getJSONObject(i)
                    val epoch = obj.getLong("epoch")
                    if (epoch > currentTime - 30000) { 
                        upcoming.add(Triple(obj.getString("h"), epoch, obj.getString("l")))
                    }
                }

                if (upcoming.isNotEmpty()) {
                    val t1 = upcoming[0]
                    views.setViewVisibility(R.id.row_1, View.VISIBLE)
                    views.setTextViewText(R.id.headsign_1, t1.first)
                    val diff = Math.max(0, (t1.second - currentTime) / 60000)
                    views.setTextViewText(R.id.time_1, "${diff}m")
                    views.setTextViewText(R.id.line_1_badge, t1.third)
                    views.setInt(R.id.line_1_badge, "setBackgroundResource", if (t1.third == "2") R.drawable.badge_blue else R.drawable.badge_green)
                } else { views.setViewVisibility(R.id.row_1, View.GONE) }

                if (upcoming.size > 1) {
                    val t2 = upcoming[1]
                    views.setViewVisibility(R.id.row_2, View.VISIBLE)
                    views.setTextViewText(R.id.headsign_2, t2.first)
                    val diff = Math.max(0, (t2.second - currentTime) / 60000)
                    views.setTextViewText(R.id.time_2, "${diff}m")
                    views.setTextViewText(R.id.line_2_badge, t2.third)
                    views.setInt(R.id.line_2_badge, "setBackgroundResource", if (t2.third == "2") R.drawable.badge_blue else R.drawable.badge_green)
                } else { views.setViewVisibility(R.id.row_2, View.GONE) }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {}
        }
    }
}
