export default function (api: { cache: (b: boolean) => void }) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated plugin removed — not used in this project
  };
}
