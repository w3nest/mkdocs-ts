import * as path from 'path'
import * as webpack from 'webpack'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
// Do not shorten following import, it will cause webpack.config file to not compile anymore
import { setup } from './src/auto-generated'

const ROOT = path.resolve(__dirname, 'src')
const DESTINATION = path.resolve(__dirname, 'dist')

const base = {
    context: ROOT,
    mode: 'production' as const,
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './bundle-analysis.html',
            openAnalyzer: false,
        }),
    ],
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

const webpackConfigRoot: webpack.Configuration = {
    ...base,
    entry: {
        [setup.name]: './index.ts',
    },
    output: {
        ...base.output,
        library: `[name]_APIv${setup.apiVersion}`,
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

export default [webpackConfigRoot, ...webpackConfigSubModules]
