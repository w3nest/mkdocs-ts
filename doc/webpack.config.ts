import * as path from 'path'
import pkgJson from './package.json'
import * as webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

// This line is required to get type's definition of 'devServer' attribute.
import 'webpack-dev-server'
const WP_INPUTS = pkgJson.webpack
const ROOT = path.resolve(__dirname, WP_INPUTS.root)
const DESTINATION = path.resolve(__dirname, 'dist')
const ASSET_ID = btoa(pkgJson.name)
const EXTERNALS = Object.entries(WP_INPUTS.externals).reduce(
    (acc, [k, v]) => ({
        ...acc,
        [k]: v,
    }),
    {},
)
const base = {
    context: ROOT,
    mode: 'production' as const,
    output: {
        path: DESTINATION,
        publicPath: `/api/assets-gateway/webpm/resources/${ASSET_ID}/${pkgJson.version}/dist/`,
        libraryTarget: 'umd',
        umdNamedDefine: true,
        devtoolNamespace: `${pkgJson.name}_APIv${WP_INPUTS.apiVersion}`,
        filename: '[name].js',
        globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    resolve: {
        extensions: ['.ts', 'tsx', '.js'],
        modules: [ROOT, 'node_modules'],
    },
    externals: EXTERNALS,
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
            baseHref: `/apps/${pkgJson.name}/${pkgJson.version}/dist/`,
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

const webpackConfigSubModules: webpack.Configuration[] = Object.entries(
    WP_INPUTS.additionalEntries,
).map(([k, v]: [string, string]) => ({
    ...base,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: `./bundle-analysis-${k}.html`,
            openAnalyzer: false,
        }),
    ],
    entry: { [k]: v },
    output: {
        ...base.output,
        library: {
            root: [`${pkgJson.name}_APIv${WP_INPUTS.apiVersion}`, '[name]'],
            amd: '[name]',
            commonjs: '[name]',
        },
    },
}))

export default [webpackConfigApp, ...webpackConfigSubModules]
