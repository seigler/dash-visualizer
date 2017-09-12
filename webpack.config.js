const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: './src/app.js',
  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      "node_modules"
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                plugins: function () {
                  return [autoprefixer('last 3 versions')];
                }
              }
            },
            {
              loader: 'less-loader',
              options: {
                paths: [
                  path.resolve(__dirname, 'src'),
                ],
                plugins: [
                  require('less-plugin-glob')
                ]
              }
            }
          ]
        })
      },
      {
        test: /\.(jpe?g|gif|png|svg)$/,
        loader: 'file-loader?emitFile=false&name=[path][name].[ext]'
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('style.css')
  ]
};
