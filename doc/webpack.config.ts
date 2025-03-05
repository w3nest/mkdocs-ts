import * as path from 'path'
// Do not shorten following import, it will cause webpack.config file to not compile anymore
import { setup } from './src/auto-generated'
import * as webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

// This line is required to get type's definition of 'devServer' attribute.
import 'webpack-dev-server'

const ROOT = path.resolve(__dirname, 'src/app')
const DESTINATION = path.resolve(__dirname, 'dist')

const base = {
    context: ROOT,
    mode: 'production' as const,
    output: {
        path: DESTINATION,
        publicPath: `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}/dist/`,
        libraryTarget: 'umd',
        umdNamedDefine: true,
        devtoolNamespace: `${setup.name}_APIv${setup.apiVersion}`,
        filename: '[name].js',
        globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    resolve: {
        extensions: ['.ts', 'tsx', '.js'],
        modules: [ROOT, 'node_modules'],
    },
    externals: setup.externals,
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{ loader: 'ts-loader' }],
                exclude: /node_modules/,
            },
        ],
    },
    devtool: 'source-map',
}

const webpackConfigApp: webpack.Configuration = {
    ...base,
    entry: {
        main: './main.ts',
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.[contenthash].css',
            insert: '#css-anchor',
        }),
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: './index.html',
            baseHref: `/apps/${setup.name}/${setup.version}/dist/`,
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './bundle-analysis.html',
            openAnalyzer: false,
        }),
    ],
    output: {
        filename: '[name].[contenthash].js',
        path: DESTINATION,
    },
    externals: setup.externals,
    module: {
        rules: [
            ...base.module.rules,
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
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
        },
        compress: true,
        port: '{{devServer.port}}',
    },
}

const webpackConfigSubModules: webpack.Configuration[] = Object.values(
    setup.secondaryEntries,
).map((e) => ({
    ...base,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: `./bundle-analysis-${e.name}.html`,
            openAnalyzer: false,
        }),
    ],
    entry: { [e.name]: e.entryFile },
    output: {
        ...base.output,
        library: {
            root: [`${setup.name}_APIv${setup.apiVersion}`, '[name]'],
            amd: '[name]',
            commonjs: '[name]',
        },
    },
}))

export default [webpackConfigApp, ...webpackConfigSubModules]
