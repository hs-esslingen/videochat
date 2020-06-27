// Work around for https://github.com/angular/angular-cli/issues/7200

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'none',
  entry: {
    server: './src-server/server.ts',
  },
  devtool: 'eval-source-map',
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: false,
    nodeEnv: false,
  },
  output: {
    // Puts the output at the root of the dist folder
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    noParse: /polyfills-.*\.js/,
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {},
      },
    ],
  },
  node: {
    __dirname: false,
  },
  plugins: [
    new webpack.ContextReplacementPlugin(
      // fixes WARNING Critical dependency: the request of a dependency is an expression
      /(.+)?express(\\|\/)(.+)?/,
      path.join(__dirname, 'src-server'),
      {}
    ),
    new webpack.DefinePlugin({
      'process.env.MEDIASOUP_WORKER_BIN': 'worker/mediasoup-worker',
    }),
    new CopyPlugin({patterns: [{from: 'node_modules/mediasoup/worker/out/Release', to: 'worker'}]}),
  ],
};
