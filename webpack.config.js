var webpack = require('webpack');

var plugins = [];

plugins.push(new webpack.optimize.UglifyJsPlugin({
    minimize: false,
    compress: { warnings: false }
}));

module.exports = {
    entry: './dist/index.js',
    
    output: {
        path: __dirname,
        filename: 'build/editorTools.js',
        libraryTarget: 'umd',
        library: ['RAML', 'Editor']
    },
    
    module: {
        loaders: [
            {test: /\.json$/, loader: "json"},
            {test: /\.css$/, loader: "css"},
            {test: /\.html$/, loader: "html"},
            {test: /\.woff$/, loader: "url"},
            {test: /\.ts$/, loader: 'ignore'}
        ]
    },

    externals: [
        {
            fs: true,
            socket: true
        }
    ]
};