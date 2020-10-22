const path = require('path')
const webpack = require('webpack')

const mode = process.env.NODE_ENV || 'production'

module.exports = {
  output: {
    filename: `worker.${mode}.js`,
    path: path.join(__dirname, 'dist'),
  },
  mode,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.handlebars'],
    plugins: [],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }]
      },
      {
        test: /\.handlebars$/,
        loader: 'handlebars-loader'
      }
    ],
  },
}
