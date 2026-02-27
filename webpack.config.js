const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'cheap-module-source-map',
  entry: {
    'content/content': './src/content/content.js',
    'background/background': './src/background/background.js',
    'popup/popup': './src/popup/popup.js',
    'live/live': './src/live/live.js',
    'summary/summary': './src/summary/summary.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    chrome: '100',
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/live/live.html', to: 'live/live.html' },
        { from: 'src/live/live.css', to: 'live/live.css' },
        { from: 'src/summary/summary.html', to: 'summary/summary.html' },
        { from: 'src/summary/summary.css', to: 'summary/summary.css' },
        { from: 'icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
  ],
};
