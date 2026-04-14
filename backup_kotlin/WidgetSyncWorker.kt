package com.david.linkrail

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class WidgetSyncWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        
        // 1. Determine which Stop ID is active right now
        val activeStop = findActiveStop(prefs) ?: return Result.success()
        val stopId = activeStop.getString("stopId")
        val stopName = activeStop.getString("stopName")
        
        val apiKey = "5654bb33-edab-4322-8688-94b9d262abe4"

        try {
            val url = URL("https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/$stopId.json?key=$apiKey")
            val connection = url.openConnection()
            val text = connection.getInputStream().bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            
            val arrivalsArray = json.getJSONObject("data").getJSONObject("entry").getJSONArray("arrivalsAndDepartures")
            val cache = JSONArray()
            
            for (i in 0 until Math.min(arrivalsArray.length(), 10)) {
                val t = arrivalsArray.getJSONObject(i)
                val arrival = JSONObject()
                arrival.put("h", t.getString("tripHeadsign"))
                arrival.put("epoch", t.optLong("predictedArrivalTime", t.getLong("scheduledArrivalTime")))
                arrival.put("l", t.getString("routeShortName"))
                cache.put(arrival)
            }
            
            val editor = prefs.edit()
            editor.putString("active_stop_id", stopId)
            editor.putString("station_name", stopName)
            editor.putString("arrivals_cache", cache.toString())
            editor.apply()

            refreshWidgets(applicationContext)
        } catch (e: Exception) {
            return Result.retry()
        }

        return Result.success()
    }

    private fun findActiveStop(prefs: android.content.SharedPreferences): JSONObject? {
        val allSchedulesStr = prefs.getString("all_schedules", "[]")
        val schedules = JSONArray(allSchedulesStr)
        if (schedules.length() == 0) return null

        val now = Calendar.getInstance()
        val currentTimeStr = SimpleDateFormat("HH:mm", Locale.US).format(now.time)
        val currentDay = now.get(Calendar.DAY_OF_WEEK) // 1 is Sunday

        // Convert JS day (0-6 Sun-Sat) to Calendar day (1-7 Sun-Sat)
        val jsDay = (currentDay - 1)

        for (i in 0 until schedules.length()) {
            val s = schedules.getJSONObject(i)
            val startTime = s.getString("startTime")
            val endTime = s.getString("endTime")
            
            // Check if current time is within window
            if (currentTimeStr >= startTime && currentTimeStr <= endTime) {
                return s
            }
        }

        // Fallback to first schedule if nothing matches the time window
        return schedules.getJSONObject(0)
    }

    private fun refreshWidgets(context: Context) {
        val providers = arrayOf(LinkWidgetProvider::class.java, LinkWidgetProviderTransparent::class.java)
        for (cls in providers) {
            val intent = Intent(context, cls)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, cls))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
