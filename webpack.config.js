const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    odr: './src/odr.js',
    odr_spreadsheet: './src/odr_spreadsheet.js',

    rtf: './src/rtf.js',
    zip: './src/zip.js',
    pdf: './src/pdf.js',
    image: './src/image.js',
  },
  module: {
    rules: [
      {
        test: /.s?css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          output: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
            },
          ],
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      chunks: ['rtf'],
      filename: 'rtf.html',
      template: 'src/rtf.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['zip'],
      filename: 'zip.html',
      template: 'src/zip.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['pdf'],
      filename: 'pdf.html',
      template: 'src/pdf.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['image'],
      filename: 'image.html',
      template: 'src/image.html',
    }),
  ]
};
