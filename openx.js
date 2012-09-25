/** Optimized methods for fetching ad-banners via OpenX */

/** see: http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/ */

(function( openx, $, undefined ) {

  var

  id,
  node,

  count = 0,
  slots = {},
  queue = [],
  ads = [],
  output = [];


  openx.show_ads = function(server, zones) {

    var
    domain = document.location.protocol == 'https:' ? 'https://' + server + ':8443':'http://' + server,
    name,
    src = domain;

    document.write = document_write;
    document.writeln = document_write;

    src += "/www/delivery/spc.php?zones=";

    /** Only fetch banners, that are really included in this page */
    for(name in zones) {
      $('.oa').each(function() {
        var
        node = $(this),
        id;
        if (node.hasClass(name)) {
          id = 'oa_' + ++count;
          slots[id] = node;
          queue.push(id);
          src += escape(id + '=' + zones[name] + "|");
        }
      });
    }

    src += "&nz=1&source=" + escape(OA_source);
    src += "&r=" + Math.floor(Math.random()*99999999);
    src += "&block=1&charset=UTF-8";

    if (window.location)   src += "&loc=" + escape(window.location);
    if (document.referrer) src += "&referer=" + escape(document.referrer);

    $.getScript(src, init_ads);

    src = domain + '/www/delivery/fl.js';
    $.getScript(src);

  }

  function init_ads() {

    var i, id;
    for (i=0; i<queue.length; i++) {
      id = queue[i];
      if (typeof(OA_output[id]) != 'undefined' && OA_output[id] != '')
        ads.push(id);
    }

    render_ads();

  }

  function render_ads() {

    while (ads.length > 0) {

      var result, src, inline, i;

      id = ads.shift();
      node = slots[id];

      node.slideDown();

      // node.append(id + ": " + node.attr('class'));

      /**
       * If output was added via document.write(), this output must be
       * rendered before other banner-code from the OpenX-server is rendered!
       */
      insert_output();

      while ((result = /<script/i.exec(OA_output[id])) != null) {
        node.append(OA_output[id].slice(0,result.index));
        /** Strip all text before "<script" from OA_output[id] */
        OA_output[id] = OA_output[id].slice(result.index,OA_output[id].length);
        result = /^([^>]*)>([\s\S]*?)<\\?\/script>/i.exec(OA_output[id]);
        if (result == null) {
          /** Invalid syntax in delivered banner-code: ignoring the rest of this banner-code! */
          // alert(OA_output[id]);
          OA_output[id] = "";
        }
        else {
          /** Remember iinline-code, if present */
          src = result[1]
          inline = result[2];
          /** Strip all text up to and including "</script>" from OA_output[id] */
          OA_output[id] = OA_output[id].slice(result[0].length,OA_output[id].length);
          result = /src\s*=\s*['"]([^'"]*)['"]/i.exec(src);
          if (result == null) {
            /** script-tag with inline-code: execute inline-code! */
            result = /^\s*<.*$/m.exec(inline);
            if (result != null) {
              /** Remove leading HTML-comments, because IE will stumble otherwise */
              inline = inline.slice(result[0].length,inline.length);
            }
            $.globalEval(inline);
            insert_output(); // << The executed inline-code might have called document.write()!
          }
          else {
            /** script-tag with src-URL! */
            ads.unshift(id); // << The banner might not be rendered fully, or include more calls to document.write().
            /** Load the script and halt all work until the script is loaded and executed... */
            $.getScript(result[1], render_ads); // << jQuery.getScript() generates onload-Handler for _all_ browsers ;)
            return;
          }
        }
      }

      node.append(OA_output[id]);
      OA_output[id] = "";
    }

    /** All entries from OA_output were rendered */

    id = undefined;
    node = undefined;
  }

  /** This function is used to overwrite document.write and document.writeln */
  function document_write() {

    for (var i=0; i<arguments.length; i++)
      output.push(arguments[i]);

    if (id != ads[0])
      /**
       * Re-Add the last banner-code to the working-queue, because included
       * scripts had added markup via document.write(), which is not
       * proccessed yet.
       * Otherwise the added markup would be falsely rendered together with
       * the markup from the following banner-code.
       */
      ads.unshift(id);

  }

  /**
   * This function prepends the collected output from calls to
   * document_write() to the current banner-code.
   */
  function insert_output() {

    if (output.length > 0) {
      output.push(OA_output[id]);
      OA_output[id] = "";
      for (i=0; i<output.length; i++)
        OA_output[id] += output[i];
      output = [];
    }

  }

} ( window.openx = window.openx || {}, jQuery ));

var OA_output = {}; // << Needed, because IE will complain loudly otherwise!
