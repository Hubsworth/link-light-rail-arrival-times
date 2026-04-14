fun main() {
    val currentTimeStr = "08:30"
    val startTime = "07:00"
    val endTime = "09:00"
    
    val currentParts = currentTimeStr.split(":")
    val startParts = startTime.split(":")
    val endParts = endTime.split(":")
    
    val currentMins = currentParts[0].toInt() * 60 + currentParts[1].toInt()
    val startMins = startParts[0].toInt() * 60 + startParts[1].toInt()
    val endMins = endParts[0].toInt() * 60 + endParts[1].toInt()
    
    val isActive = if (startMins <= endMins) {
        currentMins in startMins until endMins
    } else {
        currentMins >= startMins || currentMins < endMins
    }
    println(isActive)
}
