require("babel-polyfill");

const debug       = require('debug')('metalsmith-puppeteer');
const http        = require('http');
const puppeteer   = require('puppeteer');
const async       = require('async');
const multimatch  = require('multimatch');

const defaults = {
  launchOpts: {
    ignoreHTTPSErrors: false,
    headless: true,
    slowMo: 0,
  },
  pdfOpts:{
    scale: 1,
    displayHeaderFooter: true,
    printBackground: true,
    landscape: false
  },
  screenshotOpts:{
    type: 'png'
  }
}


// Expose `plugin`.
module.exports = plugin;


function plugin(opts){
  return function (files, metalsmith, done){
    var paths = multimatch(Object.keys(files), "**/*.html");
    
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
        const screenshotOpts = Object.assign({}, defaults.screenshotOpts, opts.screenshotOpts);
        const buffer = await page.screenshot();
        var destPath = path.replace(/[^\.]*$/i, 'png');
        var destFile = {
            contents: buffer
        }
        files[destPath] = destFile;
        debug("Successfully generated screenshot %s", destPath);
      }

      if(opts.pdf){
        const pdfOpts = Object.assign({}, defaults.pdfOpts, opts.pdfOpts);
        const buffer = await page.pdf(pdfOpts);
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