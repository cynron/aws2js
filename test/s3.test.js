'use strict';

/*global describe: true, it: true, before: true, after: true*/

var http = require('http-request');
var xmlParser = require('libxml-to-js');
var assert = require('chai').assert;

describe('Tests executed on S3', function() {
	// define the credentials & service class
	var accessKeyId = process.env.AWS_ACCEESS_KEY_ID;
	var secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	var bucket = process.env.AWS2JS_S3_BUCKET;
	var S3 = require('../lib/load.js').S3;
	var STS = require('../lib/load.js').STS; // not enabled, yet

	describe('REMOTE S3 test for signUrl', function() {
		it('should generate a signed URL, test it with http-request', function(done) {
			var s3 = new S3(accessKeyId, secretAccessKey);
			s3.setBucket(bucket);

			http.get(s3.signUrl('https', 'GET', '/', s3.expires(3600)), function(err, res) {
				assert.ifError(err);

				xmlParser(res.buffer, function(err, res) {
					assert.ifError(err);

					assert.strictEqual(res.Name, bucket);
					assert.strictEqual(res.MaxKeys, '1000');

					done();
				});
			});
		});
	});

	describe('REMOTE S3 test for get with STS credentials', function() {
		it('should issue a signed request to the bucket list', function(done) {
			var sts = new STS(accessKeyId, secretAccessKey);
			sts.request('GetSessionToken', function(err, res) {
				assert.ifError(err);

				var credentials = res.GetSessionTokenResult.Credentials;

				var s3 = new S3(credentials.AccessKeyId, credentials.SecretAccessKey);
				s3.setSessionToken(credentials.SessionToken);

				s3.get('/', 'xml', function(err, res) {
					assert.ifError(err);

					var i, buckets = res.Buckets.Bucket;
					assert.isArray(buckets);

					var found = false;
					for (i = 0; i < buckets.length; i++) {
						if (buckets[i].Name === bucket) {
							found = true;
						}
					}
					assert.ok(found);

					done();
				});
			});
		});
	});

	describe('REMOTE S3 test with get bucket prefix', function() {
		it('should issue various get requests with different way of expressing the bucket prefix', function(done) {
			var handleResponse = function(err, res) {
				assert.ifError(err);

				assert.deepEqual(res.Name, bucket);
				assert.equal(res.MaxKeys, 1);
			};

			var s3 = new S3(accessKeyId, secretAccessKey);
			s3.setBucket(bucket);

			s3.get('/', {
				'max-keys': 1,
				prefix: '/'
			}, 'xml', function(err, res) {
				handleResponse(err, res);

				s3.get('/?max-keys=1&prefix=/', 'xml', function(err, res) {
					handleResponse(err, res);

					done();
				});
			});
		});
	});

	describe('REMOTE S3 test with get subresource', function() {
		it('should issue a succesful request to ?acl', function(done) {
			var s3 = new S3(accessKeyId, secretAccessKey);
			s3.setBucket(bucket);

			s3.get('?acl', 'xml', function(err, res) {
				assert.ifError(err);

				assert.ok(res.Owner.ID);
				assert.ok(res.Owner.DisplayName);
				assert.ok(res.AccessControlList);

				done();
			});
		});
	});

});
