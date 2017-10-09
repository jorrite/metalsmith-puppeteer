// we would like you to use debug
const debug       = require('debug')('metalsmith-puppeteer');
const http        = require('http');
const puppeteer   = require('puppeteer');
const async       = require('async');

const defaults = {
  launchOpts: {
    ignoreHTTPSErrors: false,
    headless: true,
    slowMo: 0,
  }
}


// Expose `plugin`.
module.exports = plugin;


function plugin(opts){
  return function (files, metalsmith, done){

    var paths = Object.keys(files);
    var server = http.createServer(serveFiles(files));

    server.listen(0, '127.0.0.1', function(){
      debug("Started HTTP server on port %d", server.address().port);
      async.each(paths, makePdf.bind(null, opts, server.address(), files), function(){
        server.close();
        debug("Stopped HTTP server");
        done();
      });
    });
  };
}

function makePdf(opts, host, files, path, done) {

    
    (async () => {

      debug("Generating PDF from %s", path)
      var sourceUrl = "http://"+host.address+":"+host.port+"/"+path;

      const launchOpts = Object.assign({}, defaults.launchOpts, opts.launchOpts);
      const gotoOpts = Object.assign({}, opts.gotoOpts);

      const browser = await puppeteer.launch(launchOpts);
      const page = await browser.newPage();
      await page.goto(sourceUrl, gotoOpts);

      if(opts.screenshot){
        const buffer = await page.screenshot();
        var destPath = path.replace(/[^\.]*$/i, 'png');
        var destFile = {
            contents: buffer
        }
        files[destPath] = destFile;
        debug("Successfully generated screenshot %s", destPath);
      }

      if(opts.pdf){
        const buffer = await page.pdf();
        var destPath = path.replace(/[^\.]*$/i, 'pdf');
        var destFile = {
            contents: buffer
        }
        files[destPath] = destFile;
        debug("Successfully generated pdf %s", destPath);
      }

      delete files[path];
      
      browser.close();
      done();
    })();
}

function serveFiles(files) {
  return function(req, res) {
    debug("%s %s", req.method, req.url);
    if (req.method !== 'GET') {
      res.writeHead(405); // method not allowed
      return res.end();
    }
    var path = req.url.replace(/^\//, '');
    var file = files[path];
    if (!file) {
      res.writeHead(404); // file not found
      return res.end();
    }
    res.writeHead(200);
    res.end(file.contents);
  }
}