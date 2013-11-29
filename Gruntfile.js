/*
 * grunt-flexcombo
 * 
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    flexcombo: {
      default_options: {
        options: {
        },
        files: {
          'tmp/default_options': ['test/fixtures/testing', 'test/fixtures/123'],
        },
      },
	  /*
      custom_options: {
        options: {
          separator: ': ',
          punctuation: ' !!!',
        },
        files: {
          'tmp/custom_options': ['test/fixtures/testing', 'test/fixtures/123'],
        },
      },
	  */
    },


	bbb_server:{
				   options: {},
		files: {
	      'dest/default_options': ['src/testing', 'src/123'],
	  }

	}

  });




  grunt.loadNpmTasks('grunt-bbb-server');

  // Actually load this plugin's task(s).
  // grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.

  // By default, lint and run all tests.
  grunt.registerTask('default', ['bbb_server']);

};
