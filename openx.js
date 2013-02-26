/** Optimized methods for fetching ad-banners via OpenX */

/** see: http://enterprisejquery.com/2010/10/how-good-c-habits-can-encourage-bad-javascript-habits-part-1/ */

(function( openx, $, undefined ) {

  var count = 0;
  var slots = {};
  var ads = new Array();


  openx.fetch_ads = function(server, zones) {

    var spc;

    spc  = "<script type='text/javascript' src='";
    spc += location.protocol == 'https:' ? 'https://' + server + ':8443':'http://' + server;
    spc += "/www/delivery/spc.php?zones=";

    /** Only fetch banners, that are really included in this page */
    $('.oa').each(function() {
      var node = $(this);
      for(var name in zones) {
        if (node.hasClass(name)) {
          var id = 'oa_' + ++count;
          slots[id] = node;
          spc += escape(id + '=' + zones[name] + "|");
        }
      }
    });

    spc += "&amp;nz=1&amp;source=" + escape(OA_source);
    spc += "&amp;r=" + Math.floor(Math.random()*99999999);
    spc += "&amp;block=1&amp;charset=UTF-8";

    if (window.location)   spc += "&amp;loc=" + escape(window.location);
    if (document.referrer) spc += "&amp;referer=" + escape(document.referrer);

    spc+="'></script>";

    document.write(spc);
    document.write("<script type='text/javascript' src='http://" + server + "/www/delivery/fl.js'></script>");
  }


  openx.render_ads = function() {

    /** Render the fetched ad-banners... */
    for (var id in slots) {
      // alert(id + ": " + OA_output[id]);
      if (typeof(OA_output[id]) != 'undefined' && OA_output[id] != '') {
        document.write("<div id='" + id + "'>");
        document.write(OA_output[id]);
        document.write("</div>");
        ads.push(id);
        // alert('Banner ' + id + ': ' + OA_output[id]);
      }
    }

  }

  openx.show_ads = function() {

    /** Show the rendered banners */
    for (var i=0; i<ads.length; i++) {
      var ad = $('#'+ads[i]).detach();
      slots[ads[i]].append(ad);
    }
  }

} ( window.openx = window.openx || {}, jQuery ));
