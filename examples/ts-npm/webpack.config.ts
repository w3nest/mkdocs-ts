import * as path from 'path'
import pkgJson from './package.json'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

// This line is required to get type's definition of 'devServer' attribute.
import 'webpack-dev-server'

const WP_INPUTS = pkgJson.webpack
const ROOT = path.resolve(__dirname, WP_INPUTS.root)
const DESTINATION = path.resolve(__dirname, 'dist')

const webpackConfigApp = {
    context: ROOT,
    mode: 'production' as const,
    output: {
        path: DESTINATION,
        filename: '[name].[contenthash].js',
    },
    resolve: {
        extensions: ['.ts', 'tsx', '.js'],
        modules: [ROOT, 'node_modules'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{ loader: 'ts-loader' }],
                exclude: /node_modules/,
            },
            {
                enforce: 'pre',
                test: /\.js$/,
                use: 'source-map-loader',
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    entry: {
        main: WP_INPUTS.main,
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.[contenthash].css',
            insert: '#css-anchor',
        }),
        new HtmlWebpackPlugin({
            template: 'app/index.html',
            filename: 'index.html',
            baseHref:
                process.env.NODE_ENV == 'development'
                    ? '/'
                    : `/apps/${pkgJson.name}/${pkgJson.version}/dist/`,
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './bundle-analysis.html',
            openAnalyzer: false,
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
        },
        compress: true,
        port: '{{devServer.port}}',
        client: {
            overlay: false,
        },
    },
    devtool: 'source-map',
}

export default webpackConfigApp
