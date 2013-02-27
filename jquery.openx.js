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

  settings, _options, domain, id, node,

  count = 0,
  slots = {},
  queue = [],
  ads = [],
  output = [];


  /*
   * Configuration-Options for jQuery.openx
   *
   * Since the domain-name of the ad-server is the only required parameter,
   * jQuery.openx for convenience can be configured with only that one
   * parameter. For example: "jQuery.openx('openx.example.org');". If more
   * configuration-options are needed, they must be specified as an object.
   * For example: "jQuery.openx({'server': 'openx.example.org', ... });".
   *
   *
   * Server-Settings:
   *
   * server:        string  Name of the server, without protocol or port. For
   *                        example "openx.example.org". This option is
   *                        REQUIRED.
   * protocol:              Optional parameter.
   *                http:   All connections to the ad-server are made via HTTP.
   *                https:  All connections to the ad-server are made via HTTPS.
   *                        If empty, document.location.protocol will be used.
   * http_port:     number  Port-Number for HTTP-connections to the ad-server
   *                        (only needed, when it is not the default-value 80).
   * https_port:            Port-Number for HTTPS-connections to the ad-server
   *                        (only needed, when it is not the default-value 443).
   *
   *
   * Delivery-Options (for details and explanations see the see:
   * http://www.openx.com/docs/2.8/userguide/single%20page%20call):
   *
   * block:         1       Don't show the banner again on the same page.
   *                0       A Banner might be shown multiple times on the same
   *                        page (DEFAULT).
   * blockcampaign: 1       Don't show a banner from the same campaign again on
   *                        the same page.
   *                0       A Banner from the same campaign might be shown
   *                        muliple times on the same page (DEFAULT).
   * target:        string  The value is addes as the HTML TARGET attribute in
   *                        the ad code. Examples for sensible values: "_blank",
   *                        "_top".
   * withtext:      1       Show text below banner. Enter this text in the
   *			    Banner properties page.
   *                0       Ignore the text-field from the banner-properties
                            (DEFAULT).
   * charset:       string  Charset used, when delivering the banner-codes.
   *                        If empty, the charset is guessed by OpenX. Examples
   *                        for sensible values: "UTF-8", "ISO-8859-1".
   */
  $.openx = function( options ) {

    var name, src, errors = [], i;

    if (domain) {
      if (console.error) {
        console.error('jQuery.openx was already initialized!');
        console.log('Configured options: ', _options);
      }
      return;
    }

    /** Enable convenient-configuration */
    if (typeof(options) == 'string')
      options = { 'server': options };

    _options = options;

    if (!options.server)
      errors.push('Required option "server" is missing!');
    if (errors.length > 0) {
      if (console.error) {
        for (i=0; i<errors.length; i++)
          console.error('Required option "server" is missing!');
        console.log('options: ', options);
      }
      return;
    }

    settings = $.extend(
      {
        'protocol': document.location.protocol,
        'cache': true
      },
      options
      );

    domain = settings.protocol + '//';
    domain += settings.server;
    if (settings.protocol === 'http:' && settings.http_port)
      domain += ':' + settings.http_port;
    if (settings.protocol === 'https:' && settings.https_port)
      domain += ':' + settings.https_port;

    /**
     * Without this option, jQuery appends an timestamp to every URL, that
     * is fetched via $.getScript(). This can mess up badly written
     * third-party-ad-scripts, that assume that the called URL's are not
     * altered.
     */
    $.ajaxSetup({ 'cache': true });


    src = domain + '/www/delivery/spc.php';

    /**
     * jQuery.openx only works with "named zones", because it does not know,
     * which zones belong to which website. For mor informations about
     * "named zones" see:
     * http://www.openx.com/docs/2.8/userguide/single%20page%20call
     *
     * For convenience, jQuery.openx only fetches banners, that are really
     * included in the actual page. This way, you can configure jQuery.openx
     * with all zones available for your website - for example in a central
     * template - and does not have to worry about performance penalties due
     * to unnecessarily fetched banners.
     */
    src += '?zones=';
    for(name in OA_zones) {
      $('.oa').each(function() {
        var
        node = $(this),
        id;
        if (node.hasClass(name)) {
          id = 'oa_' + ++count;
          slots[id] = node;
          queue.push(id);
          src += escape(id + '=' + OA_zones[name] + "|");
        }
      });
    }
    src += '&nz=1'; // << We want to fetch named zones!

    /**
     * These are some additions to the URL of spc.php, that are originally
     * made in spcjs.php
     */
    src += '&r=' + Math.floor(Math.random()*99999999);
    if (window.location)   src += "&loc=" + escape(window.location);
    if (document.referrer) src += "&referer=" + escape(document.referrer);

    /** Add the configured options */
    if (settings.block === 1)
      src += '&block=1';
    if (settings.blockcampaign === 1)
      src += '&blockcampaign=1';
    if (settings.target)
      src += '&target=' + settings.target;
    if (settings.withtext === 1)
      src += '&withtext=1';
    if (settings.charset)
      src += '&charset=' + settings.charset;

    /** Add the source-code - if present */
    if (typeof OA_source !== 'undefined')
      src += "&source=" + escape(OA_source);

    /** Chain-load the scripts (next script to load is fl.js */
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
