# Link Light Rail Arrivals 🚆🔋

An ultra-efficient, highly-customizable Android application and home screen widget for tracking Sound Transit Link light rail arrivals in the Seattle metro area. 

Built specifically to give commuters real-time, instantly visible transit data directly from their home screens without draining their battery or forcing them to open an app.

## ✨ Features

- **Autonomous Background Syncing**: The Android widgets utilize native Kotlin `WorkManager` instead of aggressive system clock loops (`updatePeriodMillis="0"`). This ensures perfect background synchronization using batched constraints to minimize battery hit.
- **Clock Drift Protection**: Solves the common transit app problem where the user's phone clock is slightly misaligned with the transit server. The background worker handshakes with the OneBusAway API to calculate a "Server Offset," ensuring the countdowns are exact to the second.
- **Smart Time Schedules**: Enter the times of your daily commute in the main app (e.g., "Northbound at 07:00," "Southbound at 17:00"). The widget automatically switches to pulling the correct station and direction at the exact time you need it.
- **Dynamic Line Recognition**: The widget is perfectly capable of differentiating between trains sharing platforms, smartly flipping the custom-designed badges to **Link Blue (Line 2)**, or **Link Green (1 Line)** based on incoming trains.
- **Resilient Memory Recovery**: Even if a schedule goes corrupt, the widget is built to self-heal missing `stopId` configurations, guaranteeing you always have live predictions.
- **Two Beautiful Widgets**: Choose between the Standard (Solid) widget or a sleek, modern Transparent aesthetic. Both widgets can be resized down to an ultra-compact `2x1` configuration or expanded for full visibility.

## 🛠 Tech Stack

- **Frontend Application**: React Native (Expo SDK) utilizing `react-native-paper` for MD3 material styling.
- **Time Parsing Engine**: Javascript `date-fns` handles reliable wrapping of user schedules.
- **Android Native Layer**: Custom Android home screen widgets coded in Kotlin.
- **State Processing**: Uses `SharedPreferences` to seamlessly pass React Native state payloads into Native Android worker scopes.
- **Data Source**: Puget Sound OneBusAway API. 

## 🚀 Building & Deployment

This project includes streamlined bash scripts to easily build and flash your personal device using `gradle` and `adb`.

**Prerequisites:**
You must have Java 17 and Android `platform-tools` (specifically `adb`) accessible in your environment path.

To build the release APK and push it directly to your connected Android device:

```bash
npm run build && npm run deploy
```

> **Note:** Due to Android's strict background execution limits, you must run the release build (rather than a development server) to properly see the widget `WorkManager` update in the background.

## ⚙️ How It Works (Behind the Scenes)

1. **The Schedules UI**: Inside the app window, you assign arrival nodes by linking your desired stations, directions, and the specific timeframes they should be active.
2. **React to Android Handshake**: `WidgetModule.kt` is exposed to React Native methods to instantly broadcast layout UI packages and write schedule lists to Android's persistent native `SharedPreferences`.
3. **The Coroutine Worker**: Every 15 minutes (using batched framework policies to avoid wake-locks), `WidgetSyncWorker.kt` compares your phone's time against your schedule thresholds. It grabs the relevant `stopId`, connects to the Puget Sound transit servers, grabs the nearest incoming trains, and pushes them out to both widgets.
4. **Resiliency over Redundancy**: If network towers are unavailable, the widget stops syncing quietly and Android's exponentially-backed-off network retry handles it gracefully later. Tapping the widget background is explicitly nullified from opening the heavy React UI unless intentional, but tapping the small "refresh" icon queues a forced `OneTimeWorkRequestBuilder` to fetch the trains manually.

## 📝 License & Open Source Notice
This project interfaces with the open OneBusAway API. Data is supplied by Sound Transit and the greater Puget Sound transit network.
