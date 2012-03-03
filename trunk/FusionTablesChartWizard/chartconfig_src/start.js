goog.provide('fetchColumns');
goog.provide('addremoveColumn');
goog.provide('addsummaryColumn');
goog.provide('addformattoColumn');
goog.provide('addnametoColumn');
goog.provide('updateChart');
goog.provide('openEditor');

goog.require('goog.ui.AnimatedZippy');

var col_list = {};
var col_type = {};
var wrapper;
var cwidth;
var cheight;
var hformat;
var vformat;
var dataSourceUrl;
var data;


function configureWrapper() {
  cwidth = document.getElementById('chartwidth').value ? document.getElementById('chartwidth').value : defaultWidth;
  cheight = document.getElementById('chartheight').value ? document.getElementById('chartheight').value : defaultHeight; 
  hformat = document.getElementById('haxisformat').value;
  vformat = document.getElementById('vaxisformat').value;

  wrapper.setOption( 'strictFirstColumnType',false);
  wrapper.setOption( 'width',cwidth);
  wrapper.setOption( 'height',cheight);
  wrapper.setOption( 'hAxis.format', hformat);
  wrapper.setOption( 'vAxis.format', vformat);
}

var editor;
openEditor = function() {
  function init() {
    dataSourceUrl = ft_baseurl + '/gvizdata?tq=';
    wrapper = new google.visualization.ChartWrapper({
      containerId: 'visualization',
      chartType: 'LineChart'
    });
  } 

  if (!(wrapper)) init();
  configureWrapper();

  // Handler for the "Open Editor" button.
  editor = new google.visualization.ChartEditor();
  google.visualization.events.addListener(editor, 'ok', function () {
    wrapper = editor.getChartWrapper();
    redrawChart();
  });
 
  var query = new google.visualization.Query( dataSourceUrl + buildQuery());
  query.send(handleQueryResponse);
  function handleQueryResponse(response) {
    if (response.isError()) {
      alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
      return;
    }
    data = response.getDataTable();
    formatData();
    wrapper.setDataTable( data);
    editor.openDialog(wrapper);
  }
}

// external function to update size of chart if wrapper exists
updateChart = function() {
  if (wrapper) redrawChart();
}
  
// redraw chart
function redrawChart( callbackfunction) { 
  configureWrapper();

  var query = new google.visualization.Query( dataSourceUrl + buildQuery());
  query.send(handleQueryResponse);

  // wait for data and now set up wrapper with data table
  function handleQueryResponse(response) {
    if (response.isError()) {
      alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
      return;
    }
    data = response.getDataTable();
    formatData();
    wrapper.setDataTable( data);
    wrapper.draw(document.getElementById('visualization')); 
    updateiframe( updateURL());
    updateHTML();
  }
}

// apply column format options to data table
function formatData() {
  var colx=0;
  for (colname in col_list) {
    if (col_list[colname].format) {
      switch (col_type[ colname]) {
      case 'number':
        var formatter = new google.visualization.NumberFormat({pattern: col_list[colname].format});
        formatter.format( data, colx); break;
      case 'datetime': 
    	var formatter = new google.visualization.DateFormat({pattern: col_list[colname].format});
        formatter.format( data, colx); break;
      }
    }
    colx++;
  }
}

// build FusionTables query
function buildQuery() {
  var select_text = document.getElementById('selectedColumns').value;

  var ftquery;
  var groupby_col = document.getElementById('groupbyColumn').value;
  var orderby_col = document.getElementById('orderbyColumn').value;
  var sumby_col = document.getElementById('sumbyColumn').value;

  // if group by and sumby columns present override column selection
  if (groupby_col && sumby_col) {
      ftquery = "select '" + groupby_col + "', " + sumtype + "('" + sumby_col + "')" + ' from ' + document.getElementById('tableid').value;
  } else {
    ftquery = 'select ' + select_text + ' from ' + document.getElementById('tableid').value;
  }

  var filter = document.getElementById('filter').value
  if (filter) {
    ftquery = ftquery + ' where ' + filter
  }

  // add group by
  if (groupby_col) {
    ftquery = ftquery + " group by " + "'" + groupby_col + "'";
  }

  // add order by
  if (orderby_col) {
    var orderby_coltext = "'" + orderby_col + "'";
    if (col_list[ orderby_col].sum) {
      // has summary applied to order by column
      orderby_coltext = col_list[ orderby_col].sum + "('" + orderby_col + "')";
    }
    if (document.getElementById('sortdesc').checked)
       ftquery = ftquery + " order by " + orderby_coltext + " DESC";
    else
       ftquery = ftquery + " order by " + orderby_coltext;
  }

  // add limit
  var limit = document.getElementById('limit').value;
  if (limit>0) {
    ftquery = ftquery + " limit " + limit;
  }

  console.log( ftquery);
  return ftquery;
}

function updateiframe( url) {
    var iframe_text = '<iframe width="' + cwidth + 'px" height="' + cheight + 'px" scrolling="no" frameborder="no" src="' + url + '"></iframe>';
    if ( url.slice(0,4) == 'http')
      document.getElementById('chartiframe').value = iframe_text;
    else
      document.getElementById('chartiframe').value = url;
}

function updateURL() {
    var url = ft_baseurl + "/embedviz?&containerId=gviz_canvas&viz=GVIZ&q=" + encodeURIComponent(buildQuery());
    var chartType = wrapper.getChartType();
    if (valid_embedviz_charts[ chartType]) {    
      // have valid chart type for embedviz
      url = url+"&t=" + chartType.toUpperCase().replace(/CHART$/,"");
      var options = wrapper.getOptions();
      for (var optx in options) {
          // if option in exclude list skip to next option
	  if (exclude_options[ optx])
	    continue;
          var opt_obj = options[ optx];
          if (typeof( opt_obj) === 'string') {
      	  url = url + "&gco_" + optx + "=" + encodeURIComponent(opt_obj);
          } else { 
            // recode arrays as object with properties 0:, 1:  (temporary fix)
      	    if (opt_obj instanceof Array && (!(typeof(opt_obj[0]) === 'string')) ) {
      	    var new_opt_obj = {};
              for (objx=0; objx<opt_obj.length; objx++)
      	       new_opt_obj[objx] = opt_obj[objx];
              opt_obj = new_opt_obj; 
	    }
      	    var option_text = JSON.stringify( opt_obj);
            option_text.replace(/\n/gm,"");
            url = url + "&gco_" + optx + "=" + encodeURIComponent( option_text);
          }
      }	  
      url = url+"&width=" + cwidth;
      url = url+"&height=" + cheight;
    } else {
      url = "Embedviz URL only works for these chart types: ";
      for (ctype in valid_embedviz_charts) {
	url = url + ctype + ", ";
      }
      url = url + "use HTML code below for other chart types";
    } 
    document.getElementById('chartURL').value = url;
    return url;
}
    
function updateHTML() {
  var sampleHTML = "<!--\n";
  sampleHTML = sampleHTML + "You are free to copy and use this sample in accordance with the terms of the\n";
  sampleHTML = sampleHTML + "Apache license (http://www.apache.org/licenses/LICENSE-2.0.html)\n";
  sampleHTML = sampleHTML + "-->\n";
  sampleHTML = sampleHTML + "\n";
  sampleHTML = sampleHTML + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n";
  sampleHTML = sampleHTML + "<html xmlns=\"http://www.w3.org/1999/xhtml\">\n";
  sampleHTML = sampleHTML + "  <head>\n";
  sampleHTML = sampleHTML + "    <meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\"/>\n";
  sampleHTML = sampleHTML + "    <title>\n";
  sampleHTML = sampleHTML + "      Google Visualization API Sample\n";
  sampleHTML = sampleHTML + "    </title>\n";
  sampleHTML = sampleHTML + "    <script type=\"text/javascript\" src=\"http://www.google.com/jsapi\"><\/script>\n";
  sampleHTML = sampleHTML + "    <script type=\"text/javascript\">\n";
  sampleHTML = sampleHTML + "      google.load('visualization', '1');\n";
  sampleHTML = sampleHTML + "    <\/script>\n";
  sampleHTML = sampleHTML + "    <script type=\"text/javascript\">\n";
  sampleHTML = sampleHTML + "      var winW = 500, winH = 300;\n";
  sampleHTML = sampleHTML + "      if (document.body && document.body.offsetWidth) {\n";
  sampleHTML = sampleHTML + "       winW = document.body.offsetWidth;\n";
  sampleHTML = sampleHTML + "       winH = document.body.offsetHeight;\n";
  sampleHTML = sampleHTML + "      }\n";
  sampleHTML = sampleHTML + "      if (document.compatMode=='CSS1Compat' &&\n";
  sampleHTML = sampleHTML + "          document.documentElement &&\n";
  sampleHTML = sampleHTML + "          document.documentElement.offsetWidth ) {\n";
  sampleHTML = sampleHTML + "       winW = document.documentElement.offsetWidth;\n";
  sampleHTML = sampleHTML + "       winH = document.documentElement.offsetHeight;\n";
  sampleHTML = sampleHTML + "      }\n";
  sampleHTML = sampleHTML + "      if (window.innerWidth && window.innerHeight) {\n";
  sampleHTML = sampleHTML + "       winW = window.innerWidth;\n";
  sampleHTML = sampleHTML + "       winH = window.innerHeight;\n";
  sampleHTML = sampleHTML + "      }\n";
  sampleHTML = sampleHTML + "      function drawVisualization() {\n";
  sampleHTML = sampleHTML + "        var query = new google.visualization.Query(" + '"' + dataSourceUrl;
  sampleHTML = sampleHTML + buildQuery() + '");\n';
  sampleHTML = sampleHTML + "        query.send(handleQueryResponse);\n";
  sampleHTML = sampleHTML + "        function handleQueryResponse(response) {\n";
  sampleHTML = sampleHTML + "          if (response.isError()) {\n";
  sampleHTML = sampleHTML + "            alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());\n";
  sampleHTML = sampleHTML + "             return;\n";
  sampleHTML = sampleHTML + "          }\n";
  sampleHTML = sampleHTML + "          var data = response.getDataTable();\n";
  var colx=0;
  for (var colname in col_list) {
    var pattern = col_list[colname].format;
      if (pattern) {
        switch( col_type[ colname]) {
          case 'number':
  sampleHTML = sampleHTML + "          var formatter = new google.visualization.NumberFormat({pattern:'" + pattern +"'});\n";
  sampleHTML = sampleHTML + "          formatter.format(data," + colx + ");\n"; break;
          case 'datetime':
  sampleHTML = sampleHTML + "          var formatter = new google.visualization.DateFormat({pattern:'" + pattern +"'});\n";
  sampleHTML = sampleHTML + "          formatter.format(data," + colx + ");\n"; break;
        }
     }
     colx++;
  }
  sampleHTML = sampleHTML + "          var wrapper = new google.visualization.ChartWrapper();\n";
  sampleHTML = sampleHTML + "          wrapper.setDataTable( data);\n";
  sampleHTML = sampleHTML + "          wrapper.setChartType("+ "'" + wrapper.getChartType() + "'" + ");\n";
  sampleHTML = sampleHTML + "          wrapper.setContainerId("+ "'" + wrapper.getContainerId() + "'" + ");\n";
  sampleHTML = sampleHTML + "          wrapper.setOptions(" + JSON.stringify( wrapper.getOptions(), undefined, 2).replace(/^/gm,'             ') + "\n";
  sampleHTML = sampleHTML + "          );\n";
  sampleHTML = sampleHTML + "          wrapper.setOption('width',winW-20);\n";
  sampleHTML = sampleHTML + "          wrapper.setOption('height',winH-20);\n";
  sampleHTML = sampleHTML + "          wrapper.setOption('strictFirstColumnType',false);\n";
  sampleHTML = sampleHTML + "          wrapper.draw();\n";
  sampleHTML = sampleHTML + "        }\n";
  sampleHTML = sampleHTML + "      }\n";
  sampleHTML = sampleHTML + "      google.setOnLoadCallback(drawVisualization);\n";
  sampleHTML = sampleHTML + "    <\/script>\n";
  sampleHTML = sampleHTML + "  <\/head>\n";
  sampleHTML = sampleHTML + "  <body style=\"font-family: Arial;border: 0 none;\">\n";
  sampleHTML = sampleHTML + "    <div id=\"visualization\"></div>\n";
  sampleHTML = sampleHTML + "  <\/body>\n";
  sampleHTML = sampleHTML + "<\/html>\n";
  document.getElementById('htmlCode').value = sampleHTML;
}

//remove child nodes from a menu
function removeChildren(menu) {
  if(menu.hasChildNodes()) {
    while (menu.childNodes.length > 2) {
      menu.removeChild(menu.lastChild);       
    } 
  }
}

//fill the select columns in the form after user enters table id
// column_selector_ids contains list of element ids in document that contain column selector
fetchColumns = function() {
  col_list = {};
  updateSelectText();
  for (var colSelId in column_selector_ids) {
    var menu = document.getElementById( colSelId);
    removeChildren (menu)
  }         
 
  var tableid = document.getElementById('tableid').value;
  if (tableid) {
    query = "DESCRIBE+" + document.getElementById('tableid').value;
    var script = document.createElement("script");
    script.setAttribute("src", ft_baseurl + "/api/query?sql=" + query + "&jsonCallback=configureSelectColumns");
    document.body.appendChild(script);
  }

  // clear all areas
  for (var textid in textarea_ids)
    document.getElementById( textid).value = "";

  // clear the visualization div
  var vizDiv = document.getElementById("visualization");  
  while ( vizDiv.firstChild ) vizDiv.removeChild( vizDiv.firstChild );
}

// actually add the columns from the table to the select columns in the form
var col_type = {};
function configureSelectColumns(response) {
  var table = response['table'];
  var rows = table['rows'];
  // save column types
  for (var r=0; r<rows.length; r++)
    col_type[ rows[r][1]] = rows[r][2];

  createColumnSelector();
}

function createColumnSelector() {
  for (var colSelectId in column_selector_ids) {
    var colSelectElem = document.getElementById( colSelectId);
    removeChildren ( colSelectElem)

    var colselProps = column_selector_ids[ colSelectId];
    for (var colname in col_type) {
      // create the option if the selector is marked as "default" (ie the main selector at the top of the page
      // the other selectors in the page should all show column names that have been selected and appear in col_list
      // further if the selector has a specific type associated with it ie 'number' then only columns of that type should be added
      if (colselProps == 'default' || (col_list[ colname] && (colselProps == 'all' || (colselProps == col_type[ colname])))) {
        var option = document.createElement("option");
        option.setAttribute("value",colname);
        option.innerHTML = colname; 
        colSelectElem.appendChild(option);
      }
    }
    colSelectElem.disabled = false;
  } 
}     




// handle adding or removing a column
addremoveColumn = function() {
  var colname = document.getElementById("selectColumns").value;
  document.getElementById("selectColumns").selectedIndex = 0;

  // if colname in list delete it
  if (col_list[ colname]) 
    delete col_list[ colname];
  else {
    col_list[ colname] = {};
  }

  createColumnSelector();
  updateformatText()
  updateSelectText();
}

// handle adding or removing a column
addformattoColumn = function() {
  var colname = document.getElementById("selectformatColumns").value;
  document.getElementById("selectformatColumns").selectedIndex = 0;

  // if colname update format string
  if (col_list[ colname]) {
    var format_str = document.getElementById("columnformat").value;
    if (format_str)
	col_list[ colname]['format'] = format_str;
    else
        delete col_list[ colname]['format'];
  }
  updateformatText();
  updateChart();
}

// handle setting summarization function on a column
addsummaryColumn = function() {
  var colname = document.getElementById("sumbyColumn").value;
  document.getElementById("sumbyColumn").selectedIndex = 0;

  // determine summarization type
  var sum_elems = document.getElementsByName('sumtype');
  var sum_func = "sum";
  for (sumx=0; sumx<sum_elems.length; sumx++) {
    if (sum_elems[sumx].checked) sum_func = sum_elems[sumx].value;
  }

  // if colname in list add summary
  if (col_list[ colname]) 
      col_list[ colname]["sum"] = sum_func;
  else {
      // generate error
  }

  updateSelectText();
}

// handle adding a column rename
addnametoColumn = function() {
  var colname = document.getElementById("selectrenameColumns").value;
  document.getElementById("selectrenameColumns").selectedIndex = 0;

  var rename = document.getElementById("columnrename").value;
  document.getElementById("columnrename").value = "";

  if (col_list[ colname]) {
    if (rename)
      col_list[ colname]["rename"] = rename;
    else
      delete col_list[ colname]["rename"];
  }
  else {
      // generate error
  }

  updateSelectText();
  updateChart();
}


function  updateformatText() {
  var format_text = "";
  // build format text
  for (colx in col_list) { 
    var col = col_list[colx];
    var pre_sep = "";
    if (format_text)
      pre_sep = ", ";
     
    if (col.format) {
      format_text = format_text + pre_sep + "'" + colx + "':{'format': '" + col.format + "'}";
    }
  }
  document.getElementById("formattedColumns").value = format_text; 
}

function  updateSelectText() {
  var select_text = "";
  // build select text
  for (colx in col_list) { 
    var col = col_list[colx];
    var pre_sep = "";
    if (select_text)
      pre_sep = ", ";
     
    if (col.sum) {
      select_text = select_text + pre_sep + col.sum + "('" + colx + "')";
    } else {
      select_text = select_text + pre_sep + "'" + colx + "'";
    }
    if (col.rename)
      select_text = select_text + " as '" + col.rename + "'";
  }
  document.getElementById("selectedColumns").value = select_text; 
}

// Ensures the symbol will be visible after compiler renaming.
goog.exportSymbol('fetchColumns', fetchColumns);
goog.exportSymbol('addremoveColumn', addremoveColumn);
goog.exportSymbol('addsummaryColumn', addsummaryColumn);
goog.exportSymbol('addformattoColumn', addformattoColumn);
goog.exportSymbol('addnametoColumn', addnametoColumn);
goog.exportSymbol('updateChart', updateChart);
goog.exportSymbol('openEditor', openEditor);
