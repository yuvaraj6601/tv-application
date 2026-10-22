# Start DigitalSignageTV when the TV boots

The main activity declares `MAIN` + `HOME` + `DEFAULT`, allowing Android to use
DigitalSignageTV as the TV's home screen. Selecting it as the default Home app is
a per-device setup step; installing the APK alone does not change that setting.
The existing boot receiver is a fallback, not a replacement for selecting Home.

## In-app setup

When the Android app starts and is not the effective default Home app, it asks
"Set as a launcher?". Choose **Yes** and approve DigitalSignageTV in Android's
system dialog. Android 10 and later use the Home role request when available;
other devices fall back to Home settings, then default-app settings.

On returning, the app checks which activity Android actually resolves for Home
rather than trusting the dialog result. If setup was cancelled or did not take
effect, it offers settings and explains that manufacturer restrictions may need
administrator setup. **Later** continues to the signage app. The prompt appears
once per activity session and is skipped when the app is already the default.

An ordinary installed APK cannot silently select itself, disable another launcher,
or guarantee automatic launcher setup on every Android TV. The ADB steps below
are for TVs whose firmware does not honor the user-selected Home app.

## Build and configure

Use a release build for unattended startup. It bundles JavaScript and does not
need Metro or an ADB reverse connection. The current release signing configuration
uses the same debug key as the development build, so `install -r` preserves app
data when updating that build.

```sh
cd mobileApplication/android
# This TV uses armeabi-v7a; omit the architecture option for other devices.
./gradlew :app:assembleRelease -PreactNativeArchitectures=armeabi-v7a
adb connect 192.168.1.4:5555

# Record the original home component before changing it.
adb -s 192.168.1.4:5555 shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME
adb -s 192.168.1.4:5555 install -r app/build/outputs/apk/release/app-release.apk
adb -s 192.168.1.4:5555 shell cmd package set-home-activity --user 0 com.digitalsignagetv/.MainActivity
adb -s 192.168.1.4:5555 shell input keyevent KEYCODE_HOME
```

Verify the resolved Home component is `com.digitalsignagetv/.MainActivity`, then
reboot and verify the app resumes automatically. The Home button also returns to
DigitalSignageTV. Manufacturer boot logos can still appear before Android starts;
power-on from standby can behave differently from a full reboot on some TVs.

On the MiTV-AXSO2, Google TV has Home intent priority 2 and overrides the saved
preference. After confirming the signage app launches successfully, disable the
stock launcher for user 0, then check Home resolution again:

```sh
adb -s 192.168.1.4:5555 shell pm disable-user --user 0 com.google.android.tvlauncher
adb -s 192.168.1.4:5555 shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME
adb -s 192.168.1.4:5555 reboot
```

## Restore the original home screen

The original Home component on the MiTV-AXSO2 at `192.168.1.4:5555` was
`com.google.android.tvlauncher/.MainActivity`. It remains installed, but is disabled
for user 0 to allow the signage launcher to take precedence. Restore it before
uninstalling the signage app:

```sh
adb -s 192.168.1.4:5555 shell pm enable --user 0 com.google.android.tvlauncher
adb -s 192.168.1.4:5555 shell cmd package set-home-activity --user 0 com.google.android.tvlauncher/.MainActivity
adb -s 192.168.1.4:5555 shell input keyevent KEYCODE_HOME
```

Use the recorded original component for other TV models.
