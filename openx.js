/** Optimized methods for fetching ad-banners via OpenX */

/** see: http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/ */

(function( openx, $, undefined ) {

  var body = document.getElementsByTagName('body')[0];

  var id;
  var node;

  var count = 0;
  var slots = {};
  var ads = [];


  openx.show_ads = function(server, zones) {

    document.write = render;
    document.writeln = render;

    var domain = document.location.protocol == 'https:' ? 'https://' + server + ':8443':'http://' + server;

    var spc = document.createElement('script');

    spc.type = 'text/javascript';
    spc.async = false;
    spc.defer = false;

    spc.src = domain;
    spc.src += "/www/delivery/spc.php?zones=";

    /** Only fetch banners, that are really included in this page */
    $('.oa').each(function() {
      var node = $(this);
      for(var name in zones) {
        if (node.hasClass(name)) {
          var id = 'oa_' + ++count;
          slots[id] = node;
          spc.src += escape(id + '=' + zones[name] + "|");
        }
      }
    });

    spc.src += "&nz=1&source=" + escape(OA_source);
    spc.src += "&r=" + Math.floor(Math.random()*99999999);
    spc.src += "&block=1&charset=UTF-8";

    if (window.location)   spc.src += "&loc=" + escape(window.location);
    if (document.referrer) spc.src += "&referer=" + escape(document.referrer);

    spc.onload = init_ads;

    body.appendChild(spc);


    var fl = document.createElement('script');

    fl.type = 'text/javascript';
    fl.async = false;
    fl.defer = false;

    fl.src = domain + '/www/delivery/fl.js';

    body.appendChild(fl);

  }

  function init_ads() {

    for (var id in slots) {
      if (typeof(OA_output[id]) != 'undefined' && OA_output[id] != '')
        ads.push(id);
    }

    render_ad();

  }

  function render_ad() {

    if (ads.length == 0) {
      id = undefined;
      node = undefined;
      return;
    }

    id = ads.pop();
    node = slots[id];

    // node.append(id + ": " + node.attr('class'));

    var result;
    var script;
    var src;
    var inline;

    while ((result = /<script/i.exec(OA_output[id])) != null) {
      node.append(OA_output[id].slice(0,result.index));
      /** Strip all text before "<script" from OA_output[id] */
      OA_output[id] = OA_output[id].slice(result.index,OA_output[id].length);
      result = /^([^>]*)>([\s\S]*?)<\\?\/script>/i.exec(OA_output[id]);
      if (result == null) {
        /** Invalid syntax in delivered banner-code: ignoring the rest of this banner-code! */
        // alert(OA_output[id]);
        OA_output[id] = "";
        render_ad();
        return;
      }
      /** Remember iinline-code, if present */
      src = result[1]
      inline = result[2];
      /** Strip all text up to and including "</script>" from OA_output[id] */
      OA_output[id] = OA_output[id].slice(result[0].length,OA_output[id].length);
      result = /src\s*=\s*['"]([^'"]*)['"]/i.exec(src);
      if (result == null) {
        /** script-tag with inline-code: execute inline-code! */
        eval(inline);
      }
      else {
        /** script-tag with src-URL! */
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = false;
        script.defer = false;
        script.src = result[1];
        script.onload = render_ad;
        /** The banner might not be rendered fully, or include more calls to document.write(). */
        ads.push(id);
        /** Load the script and halt all work until the script is loaded and executed... */
        body.appendChild(script); // << The onload-event is only fired when appendChild is used!
        return;
      }
    }
    node.append(OA_output[id]);
    OA_output[id] = "";

    /** This statement will only reached, when no script-element was rendered! */
    render_ad();

  }

  function render() {

    if (id == undefined)
      return;

    var str = "";
    for (var i=0; i < arguments.length; i++)
      str += arguments[i];

    OA_output[id] = str + OA_output[id];

  }

} ( window.openx = window.openx || {}, jQuery ));
