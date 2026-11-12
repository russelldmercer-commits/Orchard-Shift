const { withAndroidManifest } = require('@expo/config-plugins');

// Google payment methods can leave the app temporarily; singleTask can cancel that flow.
module.exports = function withStorePurchases(config) {
  return withAndroidManifest(config, (result) => {
    const applications = result.modResults.manifest.application || [];
    for (const application of applications) {
      for (const activity of application.activity || []) {
        if (activity.$?.['android:name'] === '.MainActivity') activity.$['android:launchMode'] = 'singleTop';
      }
    }
    return result;
  });
};
