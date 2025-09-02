import * as path from 'path'
import * as webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import pkgJson from './package.json'

const WP_INPUTS = pkgJson.webpack
const ROOT = path.resolve(__dirname, WP_INPUTS.root)
const DESTINATION = path.resolve(__dirname, 'dist')
const ASSET_ID = btoa(pkgJson.name)
const EXTERNALS = Object.entries(WP_INPUTS.externals).reduce(
    (acc, [k, v]) => ({
        ...acc,
        [k]: {
            commonjs: k,
            commonjs2: k,
            root: v,
        },
    }),
    {},
)
const base = {
    context: ROOT,
    mode: 'production' as const,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../tooling/bundle-analyzer/bundle-analysis.html',
            openAnalyzer: false,
        }),
    ],
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

const webpackConfigRoot: webpack.Configuration = {
    ...base,
    entry: {
        [pkgJson.name]: WP_INPUTS.main,
    },
    output: {
        ...base.output,
        library: `[name]_APIv${WP_INPUTS.apiVersion}`,
    },
}

const webpackConfigSubModules: webpack.Configuration = {
    ...base,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: `../tooling/bundle-analyzer/bundle-analysis-auxiliaries.html`,
            openAnalyzer: false,
        }),
    ],
    entry: WP_INPUTS.additionalEntries,
    output: {
        ...base.output,
        library: {
            root: [`${pkgJson.name}_APIv${WP_INPUTS.apiVersion}/[name]`],
            amd: '[name]',
            commonjs: '[name]',
        },
    },
}

export default [webpackConfigRoot, webpackConfigSubModules]
