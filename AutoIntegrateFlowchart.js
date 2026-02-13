/*

    AutoIntegrate Flowchart functions.

    Sections
    - Draw flowchart Preview Image
    - Collect flowchart data from processing engine

*/

#ifndef AUTOINTEGRATEFLOWCHART_JS
#define AUTOINTEGRATEFLOWCHART_JS

function AutoIntegrateFlowchart(global, util)
{

this.__base__ = Object;
this.__base__();

var gui = null;

var par = global.par;
var ppar = global.ppar;

// Globals for section: Collect flowchart data from processing engine

var flowchart_active = false;
var flowchartCurrent = null;
var flowchartStack = [];
var flowchartOperationList = [];
var flowchart_operation_level = 0;

// Globals for section: Draw flowchart Preview Image

var flowchart_text_margin = 4;                                                // Margin between box and text
var flowchart_box_margin = 4;                                                 // Margin outside of the box
var flowchart_line_margin = 12;                                               // Margin for lines with child nodes
var flowchart_margin = 2 * (flowchart_text_margin + flowchart_box_margin);    // Margin for elements in the graph

// light orange 0xffffd7b5
// light orange 0xffFFD580
// light red 0xffffb3b3
// red       0xffff0000
//                          blue        green       orange      magenta     cyan        yellow      black
var flowchart_colors =    [ 0xffb3d1ff, 0xffc2f0c2, 0xffffd7b5, 0xffffb3ff, 0xffb3f0ff, 0xffffffb3, 0xff000000 ];      // For background
var flowchart_active_id_color = 0xffff0000;      // For active node, red
var flowchart_inactive_id_color = 0xFFD3D3D3;    // For inactive node, light gray

var flowchart_is_background_image = false;
var flowchart_garbagecollection_ctr = 0;

function setGUI(aigui) {
      gui = aigui;
}

// =============================================================================
// Section: Draw flowchart Preview Image
// =============================================================================

// Node structure elements for flowchart graph
// txt: text to be displayed
// type: "header", "parent", "child", "process", "mask"
// list: list of child nodes
// width: width of the node including margins for text and box
// height: height of the node including margins for text and box
// level: level in the graph
// boxwidth: width of the box, this is max box width in the level

function node_get_txt(node)
{
      if (par.flowchart_time.val) {
            return node.txt + util.get_node_execute_time_str(node);
      } else {
            return node.txt;
      }
}

// Iterate size of the flowchart childs graph
function flowchartGraphIterateChilds(parent, font, level)
{
      parent.level = level;
      var list = parent.list;
      var width = 0;
      var height = 0;
      var node_boxwidth = 0;
      // iterate childs to get size
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (par.flowchart_debug.val) {
                  console.writeln("flowchartGraphIterateChilds: " + node.type + " " + node_get_txt(node));
            }
            node.width = font.width(node_get_txt(node)) + flowchart_margin;
            node.height = font.height + flowchart_margin;
            node_boxwidth = Math.max(node_boxwidth, node.width);

            var size = flowchartGraphIterate(node, font, level);  // Iterate childs, parent node is a dummy node
            node.width = Math.max(size[0], node.width);
            node.height += size[1];

            width += node.width;
            height = Math.max(height, node.height);
      }
      for (var i = 0; i < list.length; i++) {
            if (list[i].type == "process" || list[i].type == "mask") {
                  list[i].level = parent.level;
            }
            list[i].boxwidth = node_boxwidth;
      }
      return [ width, height ];
}

// Iterate size of the flowchart graph
function flowchartGraphIterate(parent, font, level)
{
      parent.level = level;
      var list = parent.list;
      var width = 0;
      var height = 0;
      var node_boxwidth = 0;
      // iterate childs to get size
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (par.flowchart_debug.val) {
                  console.writeln("flowchartGraphIterate: " + node.type + " " + node_get_txt(node));
            }
            node.width = font.width(node_get_txt(node)) + flowchart_margin;
            node.height = font.height + flowchart_margin;
            node_boxwidth = Math.max(node_boxwidth, node.width);
            if (node.type == "header") {
                  if (node.list.length > 0) {
                        var size = flowchartGraphIterate(node, font, level + 1);
                        node.width = Math.max(size[0], node.width);
                        node.height += size[1];
                  }
            } else if (node.type == "parent") {
                  if (node.list.length > 0) {
                        var size = flowchartGraphIterateChilds(node, font, level + 1);
                        node.width = Math.max(size[0], node.width);
                        node.height = size[1];
                        if (node.list.length > 1) {
                              // parent has no text but add space for connecting lines
                              node.height += 2 * flowchart_line_margin;
                        }
                  }
            } else if (node.type == "mask") {
                  // Ignore process steps to create a mask in graph
                  if (0 && node.list.length > 0) {
                        var size = flowchartGraphIterate(node, font, level + 1);
                        node.width = Math.max(size[0], node.width);
                        node.height += size[1];
                  }
            }
            width = Math.max(width, node.width);
            height += node.height;
      }
      for (var i = 0; i < list.length; i++) {
            if (list[i].type == "process" || list[i].type == "mask") {
                  list[i].level = parent.level;
            }
            list[i].boxwidth = node_boxwidth;
      }
      return [ width, height ];
}

function flowchartLineColor()
{
      if (flowchart_is_background_image) {
            return 0xffffffff;      // white
      } else {
            return 0xff000000;      // black
      }
}

function flowchartDrawText(graphics, x, y, node)
{
      if (!node.boxwidth) {
            util.throwFatalError("flowchartDrawText: boxwidth == null");
      }

      if (par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: " + node.type + " " + node_get_txt(node) + " in: " + x + " " + y);
      }

      var drawbox = (node.type == "process" || node.type == "mask");

      var x0 = x + flowchart_box_margin;
      var y0 = y + flowchart_box_margin;
      var x1 = x + node.boxwidth - flowchart_box_margin;
      if (drawbox) {
            var y1 = y + node.height - flowchart_box_margin;
      } else {
            var y1 = y + graphics.font.height + 2 * flowchart_text_margin;
      }

      if (par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: " + node.type + " " + node_get_txt(node) + " rect:" + x0 + " " + y0 + " " + x1 + " " + y1);
      }

      if (node.id && drawbox && global.flowchartActiveId > 0) {
            var check_special_color = true;
      } else {
            var check_special_color = false;
      }

      if (par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: node.id " + node.id + ", global.flowchartActiveId " + global.flowchartActiveId);
      }
      if (check_special_color && node.id == global.flowchartActiveId) {
            graphics.brush = new Brush( flowchart_active_id_color );
            graphics.pen = new Pen(0xffffffff, 1);       // white
      } else if (check_special_color && node.id > global.flowchartActiveId) {
            graphics.brush = new Brush( flowchart_inactive_id_color );
            graphics.pen = new Pen(0xff000000, 1);       // black
      } else {
            graphics.brush = new Brush( flowchart_colors[node.level % flowchart_colors.length] );
            graphics.pen = new Pen(drawbox ? 0xff000000 : flowchartLineColor(), 1);       // black
      }
      if (drawbox) {
            graphics.drawRect(x0, y0, x1, y1);
      }
      graphics.drawTextRect(x0, y0, x1, y1, node_get_txt(node), TextAlign_Center | TextAlign_VertCenter);
      graphics.pen = new Pen(flowchartLineColor(), 1);
}

// draw vertical lines for each child position
// lines are always drawn to down direction
// position is the top left corner of the graph
function flowchartGraphDrawChildsConnectLines(parent, pos, graphics)
{
      var list = parent.list;
      var p = pos;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (par.flowchart_debug.val) {
                  console.writeln("flowchartGraphDrawChildsConnectLines: " + node.type + " " + node_get_txt(node) + " " + p.x + " " + p.y);
            }
            graphics.drawLine(p.x + node.width / 2, p.y, p.x + node.width / 2, p.y + flowchart_line_margin / 2);
            p.x += node.width;
      }
}

// draw a line connecting child nodes
// position is the top left corner of the graph
function flowchartGraphDrawChildsLine(parent, pos, graphics, loc)
{
      var p = pos;

      p.y += flowchart_line_margin / 2;

      var childlen1 = parent.list[0].width;
      var childlen2 = parent.list[parent.list.length - 1].width;

      // draw horizontal line connecting child nodes
      graphics.drawLine(p.x + childlen1 / 2, p.y, p.x + parent.width - childlen2 / 2, p.y);

      if (loc == "top") {
            flowchartGraphDrawChildsConnectLines(parent, { x: p.x, y: p.y }, graphics);
      } else if (loc == "bottom") {
            flowchartGraphDrawChildsConnectLines(parent, { x: p.x, y: p.y -  + flowchart_line_margin / 2 }, graphics);
      } else {
            util.throwFatalError("flowchartGraphDrawChildsLine: loc != top or bottom, " + loc);
      }
}

// Iterate size of the flowchart childs graph
// position is the middle position of the graph
function flowchartGraphDrawChilds(parent, pos, graphics)
{
      var list = parent.list;
      var p = pos;
      // calculate child width
      var width = 0;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            width += node.width;
      }
      // Calculate lest start position
      p.x -= width / 2;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type != "child") {
                  util.throwFatalError("flowchartGraphDrawChilds: node.type != child, type " + node.type + ", txt " + node_get_txt(node));
            }
            if (node.list.length == 0) {
                  continue;
            }
            var middle_x = p.x + node.width / 2;
            var x = middle_x - node.boxwidth / 2;
            var y = p.y;
            if (par.flowchart_debug.val) {
                  console.writeln("flowchartGraphDraw: " + node.type + " " + node_get_txt(node) + " " + x + " " + y);
            }
            flowchartDrawText(graphics, x, y, node);
            flowchartGraphDraw(node, { x: middle_x, y: p.y + graphics.font.height + flowchart_margin }, graphics);
            p.x += node.width;
      }
}

// Iterate size of the flowchart graph
// pos is middle position of the node
function flowchartGraphDraw(parent, pos, graphics)
{
      var list = parent.list;
      var p = pos;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header") {
                  if (node.list.length > 0) {
                        var x = p.x - node.boxwidth / 2;
                        var y = p.y;
                        if (par.flowchart_debug.val) {
                              console.writeln("flowchartGraphDraw: " + node.type + " " + node_get_txt(node) + " " + x + " " + y);
                        }
                        flowchartDrawText(graphics, x, y, node);
                        flowchartGraphDraw(node, { x: p.x, y: p.y + graphics.font.height + flowchart_margin }, graphics);
                  }
            } else if (node.type == "parent") {
                  if (par.flowchart_debug.val) {
                        console.writeln("flowchartGraphDraw: " + node.type + " " + node.type + " " + node_get_txt(node));
                  }
                  if (node.list.length > 0) {
                        if (node.list.length > 1) {
                              var parent_margin = flowchart_line_margin;
                              flowchartGraphDrawChildsLine(node, { x: p.x - node.width / 2, y: p.y }, graphics, "top");
                        } else {
                              var parent_margin = 0;
                        }
                        flowchartGraphDrawChilds(node, { x: p.x, y: p.y + parent_margin }, graphics);
                        if (node.list.length > 1) {
                              flowchartGraphDrawChildsLine(node, { x: p.x - node.width / 2, y: p.y + node.height - parent_margin }, graphics, "bottom");
                        }
                  }
            } else {
                  // process or mask
                  var x = p.x - node.boxwidth / 2;
                  var y = p.y;
                  if (par.flowchart_debug.val) {
                        console.writeln("flowchartGraphDraw: " + node.type + " " + node_get_txt(node) + " " + x + " " + y);
                  }
                  flowchartDrawText(graphics, x, y, node);
            }
            p.y += node.height;
      }
}

// Draw a graphical version of the workflow
function flowchartGraph(rootnode, current_preview_image, txt)
{
      if (par.flowchart_debug.val) {
            console.writeln("flowchart Graph");
      }

      if (rootnode == null) {
            console.writeln("No flowchart");
            return null;
      }

      if (global.is_processing == global.processing_state.none) {
            flowchartPrint(rootnode);
      }

      if (!global.use_preview) {
            return null;
      }

      var fontsize = 8;
      var font = new Font( FontFamily_SansSerif, fontsize );

      var size = flowchartGraphIterate(rootnode, font, 0);

      var margin = 50;
      var width = size[0] + margin;
      var height = size[1] + margin;

      // We have " / 2" below to keep text size readable
      width = Math.max(width, ppar.preview.side_preview_width / 2);
      height = Math.max(height, ppar.preview.side_preview_height / 2);

      if (par.flowchart_debug.val || par.debug.val) {
            console.writeln("flowchartGraph:background bitmap " + width + "x" + height);
      }

      if (current_preview_image != null && par.flowchart_background_image.val) {
            var bitmap = util.createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
            flowchart_is_background_image = true;
      } else {
            var bitmap = util.createEmptyBitmap(width, height, 0xffC0C0C0);  // gray background
            flowchart_is_background_image = false;
            txt = null;
      }

      var graphics = new Graphics(bitmap);
      graphics.font = font;
      graphics.transparentBackground = true;
      graphics.pen = new Pen(flowchartLineColor(), 1);

      flowchartGraphDraw(rootnode, { x: width / 2, y: margin / 2 }, graphics, font);

      graphics.end();

      if (par.flowchart_debug.val) {
            console.writeln("flowchartGraph:show bitmap");
      }

      if (flowchart_is_background_image) {
            // Scale bitmap to image size
            if (par.flowchart_debug.val || par.debug.val) {
                  console.writeln("flowchartGraph:image " + current_preview_image.width + "x" + current_preview_image.height);
            }
            if (bitmap.height != current_preview_image.height) {
                  var scale = current_preview_image.height / bitmap.height;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap = scaled_bitmap;
            }
            if (bitmap.width > current_preview_image.width) {
                  var scale = current_preview_image.width / bitmap.width;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap = scaled_bitmap;
            }
            // A new Image should not be needed
            // var background_image = new Image(current_preview_image);
            // var background_bitmap = background_image.render();
            var background_bitmap = current_preview_image.render();
            graphics = new Graphics(background_bitmap);
            // draw bitmap to the middle of the image
            var x = (current_preview_image.width - bitmap.width) / 2;
            var y = (current_preview_image.height - bitmap.height) / 2;
            graphics.drawBitmap(x, y, bitmap);
            graphics.end();
            var flowchartImage = util.createImageFromBitmap(background_bitmap);
            // background_image.free();
            // background_image = null;
      } else {
            var flowchartImage = util.createImageFromBitmap(bitmap);
      }
      if (global.flowchart_image != null) {
            global.flowchart_image.free();
            global.flowchart_image = null;
      }
      global.flowchart_image = flowchartImage;

      if (flowchart_garbagecollection_ctr++ > 5) {
            util.runGarbageCollection();
            flowchart_garbagecollection_ctr = 0;
      }

      if (par.flowchart_debug.val) {
            console.writeln("flowchartGraph:end");
      }

      return { image: flowchartImage, text: txt };
}

// =============================================================================
// Section: Collect flowchart data from processing engine
// =============================================================================

function flowchartNewNode(type, txt)
{
      return { type: type, txt: txt, list: [], id: global.flowchartActiveId, start_time: null, end_time: null };
}

function flowchartCheckOperationList(type, txt)
{
      var node = null;
      var nodepos = global.flowchartActiveId;
      global.flowchartActiveId++;
      if (global.flowchartOperationList.length > 0) {
            if (nodepos < global.flowchartOperationList.length
                && txt == global.flowchartOperationList[nodepos].txt) 
            {
                  if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:match " + txt + ", global.flowchartOperationList[" + global.flowchartActiveId + "] " + global.flowchartOperationList[global.flowchartActiveId]);
                  // Use previously created node
                  node = global.flowchartOperationList[nodepos];
            } else {
                  if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:mismatch " + txt + ", global.flowchartOperationList[" + global.flowchartActiveId + "] " + global.flowchartOperationList[global.flowchartActiveId]);
            }
      } else {
            if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:flowchartOperationList is empty, txt " + txt);
      }
      if (node == null) {
            node = flowchartNewNode(type, txt);
      }
      flowchartOperationList.push(node);

      return node;
}

function flowchartOperation(txt)
{
      if (!flowchart_active) {
            return null;
      }
      flowchart_operation_level++;
      console.writeln("Process begin " + txt);
      if (par.flowchart_debug.val) console.writeln("flowchartOperation " + txt + ", flowchart_operation_level: " + flowchart_operation_level);
      var node = flowchartCheckOperationList("process", txt);
      flowchartCurrent.list.push( node );
      gui.flowchartUpdated();
      node.start_time = Date.now();
      return node;
}

function flowchartOperationEnd(node)
{
        if (par.flowchart_debug.val) console.writeln("engine_end_process " + node.txt + ", flowchart.flowchart_operation_level: " + flowchart_operation_level);
        flowchart_operation_level--;
        node.end_time = Date.now();
}

// Special handling for new mask since we want to
// hide suboperations when creating a mask.
function flowchartMaskBegin(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartMaskBegin " + txt);
      }
      var node = flowchartCheckOperationList("mask", txt);
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = node;
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
}

function flowchartMaskEnd(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartMaskEnd " + (txt != null ? txt : "null"));
      }
      flowchartCurrent = flowchartStack.pop();
}

function flowchartParentBegin(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartParentBegin " + txt);
      }
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = flowchartNewNode("parent", txt);
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
}

function flowchartParentEnd(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartParentEnd " + (txt != null ? txt : "null"));
      }
      if (flowchartCurrent.type != "parent") {
            util.addWarningStatus("flowchartParentEnd, current node type " + flowchartCurrent.type + " is not parent, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartCurrent = flowchartStack.pop();
      flowchartCleanup(flowchartCurrent);
}

function flowchartChildBegin(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartChildBegin " + txt);
      }
      if (flowchartCurrent.type != "parent" && flowchartCurrent.type != "child") {
            util.addWarningStatus("flowchartChildBegin, current node type " + flowchartCurrent.type + " is not parent or child, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = flowchartNewNode("child", txt);
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
      gui.flowchartUpdated();
}

function flowchartChildEnd(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartChildEnd " + (txt != null ? txt : "null"));
      }
      if (flowchartCurrent.type != "child") {
            util.addWarningStatus("flowchartChildEnd, current node type " + flowchartCurrent.type + " is not child, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartCurrent = flowchartStack.pop();
      gui.flowchartUpdated();
}

// Remove empty nodes
function flowchartCleanupChilds(parent)
{
      var removed = false;
      var list = parent.list;
      var newlist = [];

      // filter list first
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (par.debug.val) {
                  console.writeln("flowchartCleanupChilds: " + node.txt);
            }
            if (node.type != "child") {
                  util.addWarningStatus("flowchartCleanupChilds: node.type " + node.type + " is not child, node txt:" + node.txt);
                  parent.list = [];
                  return false;
            }
            if (node.list.length == 0) {
                  if (node.type == "process") {
                        util.addWarningStatus("flowchartCleanupChilds: node.type == process, node txt:" + node.txt);
                        parent.list = [];
                        return false;
                  }
                  removed = true;
                  continue;
            }
            newlist.push(node);
      }
      parent.list = newlist;
      list = newlist;
      
      // cleanup child nodes
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (flowchartCleanup(node)) {
                  removed = true;
            }
      }
      return removed;
}

// Remove empty nodes
function flowchartCleanup(parent)
{
      var removed = false;
      var list = parent.list;

      // filter list first
      var newlist = [];
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header" && node.list.length == 0) {
                  removed = true;
                  continue;
            } else if (node.type == "parent" && node.list.length == 0) {
                  removed = true;
                  continue;
            } else if (node.type == "mask" && node.list.length == 0) {
                  removed = true;
                  continue;
            }
            newlist.push(node);
      }
      parent.list = newlist;
      list = newlist;

      // cleanup child nodes
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header") {
                  if (flowchartCleanup(node)) {
                        removed = true;
                  }
            } else if (node.type == "parent") {
                  if (flowchartCleanupChilds(node)) {
                        removed = true;
                  }
            } else if (node.type == "mask") {
                  if (flowchartCleanup(node)) {
                        removed = true;
                  }
            }
      }
      return removed;
}

function flowchartPrintList(list, indent, testmode = false)
{
      for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var txt = indent + item.txt;
            if (testmode) {
                  global.testmode_log += txt + "\n";
            } else {
                  console.writeln(txt + util.get_node_execute_time_str(item));
            }
            if (item.type == "header") {
                  flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "child") {
                  flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "parent") {
                  flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "mask") {
                  flowchartPrintList(item.list, indent + "  ", testmode);
            }
      }
}

function flowchartPrint(rootnode, testmode = false)
{
      if (rootnode == null) {
            console.writeln("No flowchart");
            return;
      }
      if (!testmode) {
            console.noteln("Flowchart:");
      }
      flowchartPrintList(rootnode.list, "  ", testmode);
}

function flowchartReset()
{
      console.writeln("flowchartReset");
      flowchart_active = false;
      flowchartCurrent = null;
      flowchartStack = [];
      flowchartOperationList = [];

      global.flowchartData = null;
      global.flowchartActiveId = 0;
      global.flowchartOperationList = [];

      flowchart_operation_level = 0;
}

function flowchartCancel()
{
      console.writeln("flowchartCancel");
      flowchartReset();
}

function flowchartInit(txt)
{
      console.writeln("flowchartInit");
      flowchartCurrent = flowchartNewNode("header", txt);
      flowchartStack = [];
      flowchartOperationList = [];
      if (global.flowchartOperationList.length == 0) {
            // No previous flowchart data, use current flowchart
            console.writeln("flowchartInit, no previous flowchart data");
            global.flowchartData = flowchartCurrent;
      } else {
            // Use previous flowchart data
            console.writeln("flowchartInit, use previous flowchart data");
      }

      global.flowchartActiveId = 0;
      flowchart_operation_level = 0;

      flowchart_active = true;
}

function flowchartDone()
{
      if (!flowchart_active) {
            return;
      }
      console.writeln("flowchartDone");
      flowchart_active = false;
      global.flowchartActiveId = 0;
      global.flowchartData = flowchartCurrent;
      global.flowchartOperationList = flowchartOperationList;

      // Iterate cleanup to remove empty nodes
      for (var i = 0; i < 10; i++) {
            if (!flowchartCleanup(global.flowchartData)) {
                  break;
            }
      }
      
      gui.flowchartUpdated();
}

this.setGUI = setGUI;

this.flowchartGraph = flowchartGraph;

this.flowchartOperation = flowchartOperation;
this.flowchartOperationEnd = flowchartOperationEnd;
this.flowchartParentBegin = flowchartParentBegin;
this.flowchartParentEnd = flowchartParentEnd;
this.flowchartChildBegin = flowchartChildBegin;
this.flowchartChildEnd = flowchartChildEnd;
this.flowchartMaskBegin = flowchartMaskBegin;
this.flowchartMaskEnd = flowchartMaskEnd;
this.flowchartInit = flowchartInit;
this.flowchartDone = flowchartDone;
this.flowchartReset = flowchartReset;
this.flowchartPrint = flowchartPrint;

}  /* AutoIntegrateFlowchart*/

AutoIntegrateFlowchart.prototype = new Object;

#endif  /* AUTOINTEGRATEFLOWCHART_JS */
