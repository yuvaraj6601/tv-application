package com.digitalsignagetv.device

import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.NetworkInterface
import java.util.Collections

class DeviceIdentifierModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "DeviceIdentifierModule"

    @ReactMethod
    fun getDeviceUniqueId(promise: Promise) {
        try {
            val macAddress = getWifiMacAddress()
            if (!macAddress.isNullOrBlank() && macAddress != "02:00:00:00:00:00") {
                promise.resolve(macAddress.uppercase())
                return
            }

            val androidId = Settings.Secure.getString(reactApplicationContext.contentResolver, Settings.Secure.ANDROID_ID)
            promise.resolve(androidId ?: "")
        } catch (error: Exception) {
            promise.reject("DEVICE_ID_ERROR", "Failed to read device unique id", error)
        }
    }

    private fun getWifiMacAddress(): String? {
        val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
        for (networkInterface in interfaces) {
            if (!networkInterface.name.equals("wlan0", ignoreCase = true)) {
                continue
            }

            val macBytes = networkInterface.hardwareAddress ?: return null
            if (macBytes.isEmpty()) {
                return null
            }

            val builder = StringBuilder()
            for (byte in macBytes) {
                builder.append(String.format("%02X:", byte))
            }

            return builder.removeSuffix(":").toString()
        }

        return null
    }
}
