const path = require('path')

const CompressionPlugin = require('compression-webpack-plugin')

const isProduction = process.env.NODE_ENV === 'production'

const cdn = {
	css: [],
	js: []
}

module.exports = {
	publicPath: '/',
	lintOnSave: false,
	productionSourceMap: false,
	transpileDependencies: [],
	devServer: {
		port: 8080
	},
	css: {
		extract: true,
		loaderOptions: {
			sass: {
				sassOptions: {
					includePaths: ['./node_modules']
				}
			}
		}
	},
	configureWebpack: {
		plugins: [
			new CompressionPlugin({
				test: /\.(js|css|json|svg)$/, // 匹配文件名
				algorithm: 'gzip', // 使用gzip压缩
				minRatio: 0.8, // 压缩率小于0.8才会压缩
				threshold: 5 * 1024, // 对超过5k的数据压缩
				deleteOriginalAssets: false // 不删除源文件
			})
		]
	},
	chainWebpack: (config) => {
		// 删除预加载
		config.plugins.delete('preload')

		// 删除预取
		config.plugins.delete('prefetch')

		// 设置静态加载项
		config.plugin('html').tap((args) => {
			args[0].cdn = cdn
			return args
		})

		// 详情见官网：https://webpack.docschina.org/configuration/optimization/#optimizationruntimechunk
		config.optimization.runtimeChunk('single')

		// 资源路径require
		config.module
			.rule('vue')
			.use('vue-loader')
			.loader('vue-loader')
			.tap((options) => {
				options.transformAssetUrls = {
					img: 'src',
					image: 'xlink:href'
				}
				return options
			})

		// 生产配置
		if (isProduction) {
			// 压缩代码
			config.optimization.minimize(true)
			// 去掉调试信息
			config.optimization.minimizer('terser').tap((args) => {
				const terserOptions = args[0].terserOptions
				// 注释console.*
				terserOptions.compress.drop_console = true
				// remove debugger
				terserOptions.compress.drop_debugger = true
				// 移除 console.log
				terserOptions.compress.pure_funcs = ['console.log']
				// 去掉注释 如果需要看chunk-vendors公共部分插件，可以注释掉就可以看到注释了
				terserOptions.output = { comments: false }
				return args
			})
			// 代码分包
			config.optimization.splitChunks({
				chunks: 'all', // 拆所有, async, all, multile
				minSize: 200 * 1024, // 允许新拆出 chunk 的最小体积
				maxSize: 400 * 1024, // 允许新拆出 chunk 的最大体积
				maxAsyncRequests: 6, // 每个异步加载模块最多能被拆分的数量
				maxInitialRequests: 6, // 每个入口和它的同步依赖最多能被拆分的数量
				enforceSizeThreshold: 50000, // 强制执行拆分的体积阈值并忽略其他限制
				cacheGroups: {
					// node_modules
					modules: {
						test: /[\\/]node_modules[\\/]/,
						priority: 10
					},
					// 公共模块包
					commons: {
						minChunks: 2,
						priority: 0,
						reuseExistingChunk: true
					}
				}
			})
		}
	}
}
