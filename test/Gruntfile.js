module.exports = function(grunt) {
	var task = grunt.task;
    grunt.initConfig({
		// FlexCombo服务配置
		// https://npmjs.org/package/grunt-flexcombo
		flexcombo:{
			// 无线H5项目调试，可打开host配置，用法参照
			// https://speakerdeck.com/lijing00333/grunt-flexcombo
			demo:{
				options:{
					proxyport:8080,
					target:'src/',
					urls:'/test',
					proxyHosts:'demo.com',
					port:'81',
					servlet:'?',
					separator:',',
					charset:'utf-8', // 输出文件的编码
					// 默认将"-min"文件映射到源文件
					filter:{
						'-min\\.js':'.js'
					}
				}
			}
		},
		// 监听JS、CSS、LESS文件的修改
        watch: {
            'all': {
                files: ['src/**/*'],
                tasks: [ 'build' ]
            }
		},
        // 打包后压缩文件
        // 压缩文件和入口文件一一对应
        uglify: {
            options: {
                beautify: {
                    ascii_only: true
                }
            },
            base: {
                files: [{
					expand: true,
					cwd: 'src/',
					src: ['**/*.js','!**/*-min.js'],
					dest: 'src/',
					ext: '-min.js'
                }]
            }
        }
    });

    // 使用到的任务，可以增加其他任务
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-flexcombo');

	grunt.registerTask('build', '默认构建任务', function() {
		task.run(['uglify']);
	});

	// 启动Debug调试时的本地服务
	grunt.registerTask('demo', '开启debug模式', function() {
		task.run(['flexcombo:demo','watch:all']);
	});

    return grunt.registerTask('default', '',function(type){
		if (!type) {
			task.run(['build']);
		}
	});
};
