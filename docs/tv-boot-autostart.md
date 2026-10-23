# Startup without replacing the TV launcher

This variant keeps the normal TV Home app. It has no HOME intent filter and does
not request the Home role or disable the manufacturer's launcher.

Install the standalone release APK, open it once, and choose **Enable** on the
startup prompt. On Android 10+, allow **Display over other apps** for
DigitalSignageTV. This permission is Android's documented exception for background
activity starts; the app does not create an overlay window. Returning from
settings checks the actual permission instead of trusting the result code.
Choose **Later** to keep using the app manually; the prompt returns in a new
activity session if permission is still missing.

After a full reboot and user unlock, `BOOT_COMPLETED` starts the main activity.
Locked boot is intentionally excluded because React Native and the playlist use
credential-protected storage. On Android 10+, the receiver skips startup if the
permission is absent. Older Android versions do not require this exception.
Google TV remains available using the Home button and normal Settings shortcuts.

The boot receiver requests priority 999 to reduce time spent behind other apps
in the ordered boot broadcast queue on older Android versions. On the tested
Android 11 Mi TV, the original priority-0 receiver process started about 59 seconds
after boot broadcast dispatch began. This priority is a best-effort optimization:
Android 16 does not guarantee broadcast ordering across different processes.

## Build and install

```sh
cd mobileApplication/android
./gradlew :app:assembleRelease
adb connect 192.168.1.5:5555
adb -s 192.168.1.5:5555 install -r app/build/outputs/apk/release/app-release.apk
adb -s 192.168.1.5:5555 shell am start -n com.digitalsignagetv/.MainActivity
```

If migrating from the launcher-based variant, restore the original launcher first
(these components are for the tested MiTV-AXSO2):

```sh
adb -s 192.168.1.5:5555 shell pm enable --user 0 com.google.android.tvlauncher
adb -s 192.168.1.5:5555 shell cmd package set-home-activity --user 0 com.google.android.tvlauncher/.MainActivity
```

For administrator-managed devices whose firmware hides the permission UI, grant
the declared permission through ADB, then restart to test actual firmware behavior:

```sh
adb -s 192.168.1.5:5555 shell appops set com.digitalsignagetv SYSTEM_ALERT_WINDOW allow
adb -s 192.168.1.5:5555 reboot
```

Check `dumpsys activity activities` for the resumed signage activity, verify Home
still resolves to the stock launcher, and inspect `adb logcat -d -s SignageBoot
AndroidRuntime`. Revoke the permission through special app access (or set its app
op to `default`) to disable this background-start exception on Android 10+.

## Limits

- The TV home screen may appear before boot completes. This is not a replacement
  launcher and cannot guarantee that the home screen is never visible.
- This handles full boots, not waking from standby.
- Install alone is insufficient: open the app once and grant startup access.
  Force-stopping the app can prevent boot broadcasts until it is opened again.
- Firmware-specific auto-start or power restrictions can still block startup.
- Use a release APK with bundled JavaScript; a normal debug APK needs Metro.

Reference: [Android background activity start restrictions](https://developer.android.com/guide/components/activities/background-starts).
