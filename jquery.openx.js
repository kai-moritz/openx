/*
 * (C) Copyright 2012 juplo (http://juplo.de/).
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 3.0 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-3.0.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 * - Kai Moritz
 */

/*
 * See http://coding.smashingmagazine.com/2011/10/11/essential-jquery-plugin-patterns/
 * for detailed explanations for the applied best practices.
 *
 * The semicolon guides our code for poorly written concatenated scripts.
 */
;(function( $, window, document, undefined ) {

  var

  settings, _zones, _options, domain, id, node,

  count = 0,
  slots = {},
  queue = [],
  ads = [],
  output = [];


  $.openx = function( zones, options ) {

    if (domain) {
      if (console.error) {
        console.error('jQuery.openx was already initialized!');
        console.log('Configured zones: ', _zones);
        console.log('Configured options: ', _options);
      }
      return;
    }

    _zones = zones;
    _options = options;

    settings = $.extend(
      {
        'protocol': document.location.protocol,
        'server': 'localhost'
      },
      options
      );

    domain = settings.protocol + '//';
    domain += settings.server;
    if (settings.protocol === 'http:' && settings.http_port)
      domain += ':' + settings.http_port;
    if (settings.protocol === 'https:' && settings.https_port)
      domain += ':' + settings.https_port;

    var
    name,
    src = domain;

    /**
     * Without this option, jQuery appends an timestamp to every URL, that
     * is fetched via $.getScript(). This can mess up badly written
     * third-party-ad-scripts, that assume that the called URL's are not
     * altered.
     */
    $.ajaxSetup({ cache: true });

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

    if (typeof OA_source !== 'undefined')
      src += "&source=" + escape(OA_source);
    src += "&nz=1&r=" + Math.floor(Math.random()*99999999);
    src += "&block=1&charset=UTF-8";

    if (window.location)   src += "&loc=" + escape(window.location);
    if (document.referrer) src += "&referer=" + escape(document.referrer);

    $.getScript(src, load_flash);

  }

  function load_flash() {

    $.getScript(domain + '/www/delivery/fl.js', init_ads);

  }

  function init_ads() {

    var i, id;
    for (i=0; i<queue.length; i++) {
      id = queue[i];
      if (typeof(OA_output[id]) != 'undefined' && OA_output[id] != '')
        ads.push(id);
    }

    document.write = document_write;
    document.writeln = document_write;

    render_ads();

  }

  function render_ads() {

    while (ads.length > 0) {

      var result, src, inline;

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
          src = result[1] + ' ' // << simplifies the following regular expression: the string ends with a space in any case, so that the src-URL cannot be followed by the end of the string emediately!
          inline = result[2];
          /** Strip all text up to and including "</script>" from OA_output[id] */
          OA_output[id] = OA_output[id].slice(result[0].length,OA_output[id].length);
          result = /src\s*=\s*['"]?([^'"]*)['"]?\s/i.exec(src);
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
            if (OA_output[id].length > 0)
              /** The banner-code was not rendered completely yet! */
              ads.unshift(id);
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

    if (id == undefined)
      return;

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

})( jQuery, window, document );

var OA_output = {}; // << Needed, because IE will complain loudly otherwise!
