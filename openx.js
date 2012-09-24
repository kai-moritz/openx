/** Optimized methods for fetching ad-banners via OpenX */

/** see: http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/ */

(function( openx, $, undefined ) {

  var

  id,
  node,

  count = 0,
  slots = {},
  ads = [];


  openx.show_ads = function(server, zones) {

    var
    domain = document.location.protocol == 'https:' ? 'https://' + server + ':8443':'http://' + server,
    src = domain;

    document.write = document_write;
    document.writeln = document_write;

    src += "/www/delivery/spc.php?zones=";

    /** Only fetch banners, that are really included in this page */
    $('.oa').each(function() {
      var
      node = $(this),
      name, id;
      for(name in zones) {
        if (node.hasClass(name)) {
          id = 'oa_' + ++count;
          slots[id] = node;
          src += escape(id + '=' + zones[name] + "|");
        }
      }
    });

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

    for (var id in slots) {
      if (typeof(OA_output[id]) != 'undefined' && OA_output[id] != '')
        ads.push(id);
    }

    render_ads();

  }

  function render_ads() {

    while (ads.length > 0) {

      id = ads.pop();
      node = slots[id];

      // node.append(id + ": " + node.attr('class'));

      var result, src, inline;

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
          }
          else {
            /** script-tag with src-URL! */
            ads.push(id); // << The banner might not be rendered fully, or include more calls to document.write().
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

  function document_write() {

    if (id == undefined)
      return;

    var
    str = "",
    i;

    for (i=0; i < arguments.length; i++)
      str += arguments[i];

    OA_output[id] = str + OA_output[id];

  }

} ( window.openx = window.openx || {}, jQuery ));

var OA_output = {}; // << Needed, because IE will complain loudly otherwise!
