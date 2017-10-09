var Metalsmith  = require('metalsmith');
var markdown    = require('metalsmith-markdown');
var layouts     = require('metalsmith-layouts');
var puppeteer   = require('..');

describe('metalsmith-drafts', function(){
  it('should remove drafts from output', function(done){
    Metalsmith('test/fixture')
      .use(markdown())
      .use(layouts({
        engine: 'handlebars'
      }))
      .use(puppeteer({
        pdf: true
      }))
      .build(function(err){
        if (err) return done(err);
        done();
      });
  });
});