const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins')

/**
 * Injects the LiveKit screen-share flag into AndroidManifest.
 * The @livekit/react-native-expo-plugin stub reads this at runtime:
 * io.livekit.reactnative.expo.ENABLE_SCREEN_SHARE_SERVICE = true
 */
function withLiveKitScreenShare(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)

    application['meta-data'] = [
      ...(application['meta-data'] || []).filter(
        (item) =>
          item.$['android:name'] !==
          'io.livekit.reactnative.expo.ENABLE_SCREEN_SHARE_SERVICE'
      ),
      {
        $: {
          'android:name':
            'io.livekit.reactnative.expo.ENABLE_SCREEN_SHARE_SERVICE',
          'android:value': 'true',
        },
      },
    ]

    return config
  })
}

module.exports = withLiveKitScreenShare
