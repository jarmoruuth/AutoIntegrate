/*

    AutoIntegrate Flowchart functions.

    Sections
    - Draw flowchart Preview Image
    - Collect flowchart data from processing engine

*/

#ifndef AUTOINTEGRATEFLOWCHART_JS
#define AUTOINTEGRATEFLOWCHART_JS

class AutoIntegrateFlowchart
{

constructor(global, util) {
      this.global = global;
      this.util = util;

      this.gui = null;

      this.par = this.global.par;
      this.ppar = this.global.ppar;

      // Globals for section: Collect flowchart data from processing engine

      this.flowchart_active = false;
      this.flowchartCurrent = null;
      this.flowchartStack = [];
      this.flowchartOperationList = [];
      this.flowchart_operation_level = 0;

      // Globals for section: Draw flowchart Preview Image

      this.flowchart_text_margin = 4;                                                // Margin between box and text
      this.flowchart_box_margin = 4;                                                 // Margin outside of the box
      this.flowchart_line_margin = 12;                                               // Margin for lines with child nodes
      this.flowchart_margin = 2 * (this.flowchart_text_margin + this.flowchart_box_margin);    // Margin for elements in the graph

      // light orange 0xffffd7b5
      // light orange 0xffFFD580
      // light red 0xffffb3b3
      // red       0xffff0000
      //                          blue        green       orange      magenta     cyan        yellow      black
      this.flowchart_colors =    [ 0xffb3d1ff, 0xffc2f0c2, 0xffffd7b5, 0xffffb3ff, 0xffb3f0ff, 0xffffffb3, 0xff000000 ];      // For background
      this.flowchart_active_id_color = 0xffff0000;      // For active node, red
      this.flowchart_inactive_id_color = 0xFFD3D3D3;    // For inactive node, light gray

      this.flowchart_is_background_image = false;
      this.flowchart_garbagecollection_ctr = 0;

} // constructor end

setGUI(aigui) {
      this.gui = aigui;
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

node_get_txt(node)
{
      if (this.par.flowchart_time.val) {
            return node.txt + this.util.get_node_execute_time_str(node);
      } else {
            return node.txt;
      }
}

// Iterate size of the flowchart childs graph
flowchartGraphIterateChilds(parent, font, level)
{
      if (this.global.debug) console.writeln("flowchartGraphIterateChilds: level " + level);
      parent.level = level;
      var list = parent.list;
      var width = 0;
      var height = 0;
      var node_boxwidth = 0;
      // iterate childs to get size
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (this.par.flowchart_debug.val) {
                  console.writeln("flowchartGraphIterateChilds: " + node.type + " " + this.node_get_txt(node));
            }
            node.width = font.width(this.node_get_txt(node)) + this.flowchart_margin;
            node.height = font.height + this.flowchart_margin;
            node_boxwidth = Math.max(node_boxwidth, node.width);

            var size = this.flowchartGraphIterate(node, font, level);  // Iterate childs, parent node is a dummy node
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
flowchartGraphIterate(parent, font, level)
{
      if (this.global.debug) console.writeln("flowchartGraphIterateChilds: level " + level);
      parent.level = level;
      var list = parent.list;
      var width = 0;
      var height = 0;
      var node_boxwidth = 0;
      // iterate childs to get size
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (this.par.flowchart_debug.val) {
                  console.writeln("flowchartGraphIterate: " + node.type + " " + this.node_get_txt(node));
            }
            node.width = font.width(this.node_get_txt(node)) + this.flowchart_margin;
            node.height = font.height + this.flowchart_margin;
            node_boxwidth = Math.max(node_boxwidth, node.width);
            if (node.type == "header") {
                  if (node.list.length > 0) {
                        var size = this.flowchartGraphIterate(node, font, level + 1);
                        node.width = Math.max(size[0], node.width);
                        node.height += size[1];
                  }
            } else if (node.type == "parent") {
                  if (node.list.length > 0) {
                        var size = this.flowchartGraphIterateChilds(node, font, level + 1);
                        node.width = Math.max(size[0], node.width);
                        node.height = size[1];
                        if (node.list.length > 1) {
                              // parent has no text but add space for connecting lines
                              node.height += 2 * this.flowchart_line_margin;
                        }
                  }
            } else if (node.type == "mask") {
                  // Ignore process steps to create a mask in graph
                  if (0 && node.list.length > 0) {
                        var size = this.flowchartGraphIterate(node, font, level + 1);
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

flowchartLineColor()
{
      if (this.flowchart_is_background_image) {
            return 0xffffffff;      // white
      } else {
            return 0xff000000;      // black
      }
}

flowchartDrawText(graphics, x, y, node)
{
      if (!node.boxwidth) {
            this.util.throwFatalError("flowchartDrawText: boxwidth == null");
      }

      if (this.par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: " + node.type + " " + this.node_get_txt(node) + " in: " + x + " " + y);
      }

      var drawbox = (node.type == "process" || node.type == "mask");

      var x0 = x + this.flowchart_box_margin;
      var y0 = y + this.flowchart_box_margin;
      var x1 = x + node.boxwidth - this.flowchart_box_margin;
      if (drawbox) {
            var y1 = y + node.height - this.flowchart_box_margin;
      } else {
            var y1 = y + graphics.font.height + 2 * this.flowchart_text_margin;
      }

      if (this.par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: " + node.type + " " + this.node_get_txt(node) + " rect:" + x0 + " " + y0 + " " + x1 + " " + y1);
      }

      if (node.id && drawbox && this.global.flowchartActiveId > 0) {
            var check_special_color = true;
      } else {
            var check_special_color = false;
      }

      if (this.par.flowchart_debug.val) {
            console.writeln("flowchartDrawText: node.id " + node.id + ", flowchartActiveId " + this.global.flowchartActiveId);
      }
      if (check_special_color && node.id == this.global.flowchartActiveId) {
            graphics.brush = new Brush( this.flowchart_active_id_color );
            graphics.pen = new Pen(0xffffffff, 1);       // white
      } else if (check_special_color && node.id > this.global.flowchartActiveId) {
            graphics.brush = new Brush( this.flowchart_inactive_id_color );
            graphics.pen = new Pen(0xff000000, 1);       // black
      } else {
            graphics.brush = new Brush( this.flowchart_colors[node.level % this.flowchart_colors.length] );
            graphics.pen = new Pen(drawbox ? 0xff000000 : this.flowchartLineColor(), 1);       // black
      }
      if (drawbox) {
            graphics.drawRect(x0, y0, x1, y1);
      }
      graphics.drawTextRect(x0, y0, x1, y1, this.node_get_txt(node), TextAlignment.Center | TextAlignment.VertCenter);
      graphics.pen = new Pen(this.flowchartLineColor(), 1);
}

// draw vertical lines for each child position
// lines are always drawn to down direction
// position is the top left corner of the graph
flowchartGraphDrawChildsConnectLines(parent, pos, graphics)
{
      var list = parent.list;
      var p = pos;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (this.par.flowchart_debug.val) {
                  console.writeln("flowchartGraphDrawChildsConnectLines: " + node.type + " " + this.node_get_txt(node) + " " + p.x + " " + p.y);
            }
            graphics.drawLine(p.x + node.width / 2, p.y, p.x + node.width / 2, p.y + this.flowchart_line_margin / 2);
            p.x += node.width;
      }
}

// draw a line connecting child nodes
// position is the top left corner of the graph
flowchartGraphDrawChildsLine(parent, pos, graphics, loc)
{
      if (this.global.debug) console.writeln("flowchartGraphDrawChildsLine");
      var p = pos;

      p.y += this.flowchart_line_margin / 2;

      var childlen1 = parent.list[0].width;
      var childlen2 = parent.list[parent.list.length - 1].width;

      // draw horizontal line connecting child nodes
      graphics.drawLine(p.x + childlen1 / 2, p.y, p.x + parent.width - childlen2 / 2, p.y);

      if (loc == "top") {
            this.flowchartGraphDrawChildsConnectLines(parent, { x: p.x, y: p.y }, graphics);
      } else if (loc == "bottom") {
            this.flowchartGraphDrawChildsConnectLines(parent, { x: p.x, y: p.y -  + this.flowchart_line_margin / 2 }, graphics);
      } else {
            this.util.throwFatalError("flowchartGraphDrawChildsLine: loc != top or bottom, " + loc);
      }
}

// Iterate size of the flowchart childs graph
// position is the middle position of the graph
flowchartGraphDrawChilds(parent, pos, graphics)
{
      if (this.global.debug) console.writeln("flowchartGraphDrawChilds");
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
                  this.util.throwFatalError("flowchartGraphDrawChilds: node.type != child, type " + node.type + ", txt " + this.node_get_txt(node));
            }
            if (node.list.length == 0) {
                  continue;
            }
            var middle_x = p.x + node.width / 2;
            var x = middle_x - node.boxwidth / 2;
            var y = p.y;
            if (this.par.flowchart_debug.val) {
                  console.writeln("flowchartGraphDraw: " + node.type + " " + this.node_get_txt(node) + " " + x + " " + y);
            }
            this.flowchartDrawText(graphics, x, y, node);
            this.flowchartGraphDraw(node, { x: middle_x, y: p.y + graphics.font.height + this.flowchart_margin }, graphics);
            p.x += node.width;
      }
}

// Iterate size of the flowchart graph
// pos is middle position of the node
flowchartGraphDraw(parent, pos, graphics)
{
      if (this.global.debug) console.writeln("flowchartGraphDraw");
      var list = parent.list;
      var p = pos;
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header") {
                  if (node.list.length > 0) {
                        var x = p.x - node.boxwidth / 2;
                        var y = p.y;
                        if (this.par.flowchart_debug.val) {
                              console.writeln("flowchartGraphDraw: " + node.type + " " + this.node_get_txt(node) + " " + x + " " + y);
                        }
                        this.flowchartDrawText(graphics, x, y, node);
                        this.flowchartGraphDraw(node, { x: p.x, y: p.y + graphics.font.height + this.flowchart_margin }, graphics);
                  }
            } else if (node.type == "parent") {
                  if (this.par.flowchart_debug.val) {
                        console.writeln("flowchartGraphDraw: " + node.type + " " + node.type + " " + this.node_get_txt(node));
                  }
                  if (node.list.length > 0) {
                        if (node.list.length > 1) {
                              var parent_margin = this.flowchart_line_margin;
                              this.flowchartGraphDrawChildsLine(node, { x: p.x - node.width / 2, y: p.y }, graphics, "top");
                        } else {
                              var parent_margin = 0;
                        }
                        this.flowchartGraphDrawChilds(node, { x: p.x, y: p.y + parent_margin }, graphics);
                        if (node.list.length > 1) {
                              this.flowchartGraphDrawChildsLine(node, { x: p.x - node.width / 2, y: p.y + node.height - parent_margin }, graphics, "bottom");
                        }
                  }
            } else {
                  // process or mask
                  var x = p.x - node.boxwidth / 2;
                  var y = p.y;
                  if (this.par.flowchart_debug.val) {
                        console.writeln("flowchartGraphDraw: " + node.type + " " + this.node_get_txt(node) + " " + x + " " + y);
                  }
                  this.flowchartDrawText(graphics, x, y, node);
            }
            p.y += node.height;
      }
}

// Draw a graphical version of the workflow
flowchartGraph(rootnode, current_preview_image, txt)
{
      if (this.par.flowchart_debug.val) {
            console.writeln("flowchart Graph");
      }
      if (rootnode == null) {
            console.writeln("No flowchart");
            return null;
      }
      if (this.global.is_processing == this.global.processing_state.none) {
            this.flowchartPrint(rootnode);
      }
      if (!this.global.use_preview) {
            return null;
      }
      if (!this.global.interactiveMode) {
            return null;
      }
      if (this.gui == null || this.gui.previewControl == null) {
            return null;
      }

      if (this.global.debug) console.writeln("flowchartGraph:" + (current_preview_image == null ? "no current preview image" : "current preview image " + current_preview_image.width + "x" + current_preview_image.height));

      var fontsize = 8;
      var font = new Font( FontFamily.SansSerif, fontsize );

      var size = this.flowchartGraphIterate(rootnode, font, 0);

      var margin = 50;
      var width = size[0] + margin;
      var height = size[1] + margin;

      // We have " / 2" below to keep text size readable
      width = Math.max(width, this.ppar.preview.side_preview_width / 2);
      height = Math.max(height, this.ppar.preview.side_preview_height / 2);

      if (this.par.flowchart_debug.val || this.par.debug.val) {
            console.writeln("flowchartGraph:background bitmap " + width + "x" + height);
      }

      if (current_preview_image != null && this.par.flowchart_background_image.val) {
            var bitmap = this.util.createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
            this.flowchart_is_background_image = true;
      } else {
            var bitmap = this.util.createEmptyBitmap(width, height, 0xffC0C0C0);  // gray background
            this.flowchart_is_background_image = false;
            txt = null;
      }

      var graphics = new Graphics(bitmap);
      graphics.font = font;
      graphics.transparentBackground = true;
      graphics.pen = new Pen(this.flowchartLineColor(), 1);

      this.flowchartGraphDraw(rootnode, { x: width / 2, y: margin / 2 }, graphics, font);

      graphics.end();

      if (this.par.flowchart_debug.val) {
            console.writeln("flowchartGraph:show bitmap");
      }

      if (this.flowchart_is_background_image) {
            // Scale bitmap to image size
            if (this.global.debug) console.writeln("flowchartGraph:draw background image");
            if (this.par.flowchart_debug.val || this.par.debug.val) {
                  console.writeln("flowchartGraph:image " + current_preview_image.width + "x" + current_preview_image.height);
            }
            if (bitmap.height != current_preview_image.height) {
                  var scale = current_preview_image.height / bitmap.height;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap.clear();
                  bitmap = scaled_bitmap;
            }
            if (bitmap.width > current_preview_image.width) {
                  var scale = current_preview_image.width / bitmap.width;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap.clear();
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
            bitmap.clear();
            bitmap = background_bitmap;
      } else {
            if (this.global.debug) console.writeln("flowchartGraph:no background image");
      }

      if (0 && this.global.flowchart_image != null && this.global.flowchart_image.width == bitmap.width && this.global.flowchart_image.height == bitmap.height) {
            if (this.global.debug) console.writeln("flowchartGraph:use existing flowchart image and blend");
            this.global.flowchart_image.blend(bitmap);
      } else {
            if (this.global.debug) console.writeln("flowchartGraph:create new flowchart image");
            if (this.global.flowchart_image != null) {
                  this.global.flowchart_image.free();
            }
            this.global.flowchart_image = this.util.createImageFromBitmap(bitmap);
      }
      bitmap.clear();
      if (this.flowchart_garbagecollection_ctr++ > 5) {
            this.util.runGarbageCollection();
            this.flowchart_garbagecollection_ctr = 0;
      }

      if (this.par.flowchart_debug.val) {
            console.writeln("flowchartGraph:end");
      }

      return { image: this.global.flowchart_image, text: txt };
}

// =============================================================================
// Section: Collect flowchart data from processing engine
// =============================================================================

flowchartNewNode(type, txt)
{
      return { type: type, txt: txt, list: [], id: this.global.flowchartActiveId, start_time: null, end_time: null };
}

flowchartCheckOperationList(type, txt)
{
      if (this.global.debug) console.writeln("flowchartCheckOperationList");
      var node = null;
      var nodepos = this.global.flowchartActiveId;
      this.global.flowchartActiveId++;
      if (this.global.flowchartOperationList.length > 0) {
            if (nodepos < this.global.flowchartOperationList.length
                && txt == this.global.flowchartOperationList[nodepos].txt) 
            {
                  if (this.par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:match " + txt + ", flowchartOperationList[" + this.global.flowchartActiveId + "] " + this.global.flowchartOperationList[this.global.flowchartActiveId]);
                  // Use previously created node
                  node = this.global.flowchartOperationList[nodepos];
            } else {
                  if (this.par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:mismatch " + txt + ", flowchartOperationList[" + this.global.flowchartActiveId + "] " + this.global.flowchartOperationList[this.global.flowchartActiveId]);
            }
      } else {
            if (this.par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:flowchartOperationList is empty, txt " + txt);
      }
      if (node == null) {
            node = this.flowchartNewNode(type, txt);
      }
      this.flowchartOperationList.push(node);

      return node;
}

flowchartOperation(txt)
{
      if (!this.flowchart_active) {
            return null;
      }
      this.flowchart_operation_level++;
      console.writeln("Process begin " + txt);
      if (this.par.flowchart_debug.val) console.writeln("flowchartOperation " + txt + ", flowchart_operation_level: " + this.flowchart_operation_level);
      var node = this.flowchartCheckOperationList("process", txt);
      this.flowchartCurrent.list.push( node );
      this.gui.flowchartUpdated();
      node.start_time = Date.now();
      return node;
}

flowchartOperationEnd(node)
{
        if (this.par.flowchart_debug.val) console.writeln("engine_end_process " + node.txt + ", flowchart.flowchart_operation_level: " + this.flowchart_operation_level);
        this.flowchart_operation_level--;
        node.end_time = Date.now();
}

// Special handling for new mask since we want to
// hide suboperations when creating a mask.
flowchartMaskBegin(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartMaskBegin " + txt);
      }
      var node = this.flowchartCheckOperationList("mask", txt);
      this.flowchartStack.push(this.flowchartCurrent);
      var newFlowchartCurrent = node;
      this.flowchartCurrent.list.push(newFlowchartCurrent);
      this.flowchartCurrent = newFlowchartCurrent;
}

flowchartMaskEnd(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartMaskEnd " + (txt != null ? txt : "null"));
      }
      this.flowchartCurrent = this.flowchartStack.pop();
}

flowchartParentBegin(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartParentBegin " + txt);
      }
      this.flowchartStack.push(this.flowchartCurrent);
      var newFlowchartCurrent = this.flowchartNewNode("parent", txt);
      this.flowchartCurrent.list.push(newFlowchartCurrent);
      this.flowchartCurrent = newFlowchartCurrent;
}

flowchartParentEnd(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartParentEnd " + (txt != null ? txt : "null"));
      }
      if (this.flowchartCurrent.type != "parent") {
            this.util.addWarningStatus("flowchartParentEnd, current node type " + this.flowchartCurrent.type + " is not parent, node txt:" + this.flowchartCurrent.txt);
            this.flowchartCancel();
            return;
      }
      this.flowchartCurrent = this.flowchartStack.pop();
      this.flowchartCleanup(this.flowchartCurrent);
}

flowchartChildBegin(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartChildBegin " + txt);
      }
      if (this.flowchartCurrent.type != "parent" && this.flowchartCurrent.type != "child") {
            this.util.addWarningStatus("flowchartChildBegin, current node type " + this.flowchartCurrent.type + " is not parent or child, node txt:" + this.flowchartCurrent.txt);
            this.flowchartCancel();
            return;
      }
      this.flowchartStack.push(this.flowchartCurrent);
      var newFlowchartCurrent = this.flowchartNewNode("child", txt);
      this.flowchartCurrent.list.push(newFlowchartCurrent);
      this.flowchartCurrent = newFlowchartCurrent;
      this.gui.flowchartUpdated();
}

flowchartChildEnd(txt)
{
      if (!this.flowchart_active) {
            return;
      }
      if (this.global.get_flowchart_data) {
            if (this.par.flowchart_debug.val) console.writeln("flowchartChildEnd " + (txt != null ? txt : "null"));
      }
      if (this.flowchartCurrent.type != "child") {
            this.util.addWarningStatus("flowchartChildEnd, current node type " + this.flowchartCurrent.type + " is not child, node txt:" + this.flowchartCurrent.txt);
            this.flowchartCancel();
            return;
      }
      this.flowchartCurrent = this.flowchartStack.pop();
      this.gui.flowchartUpdated();
}

// Remove empty nodes
flowchartCleanupChilds(parent)
{
      if (this.global.debug) console.writeln("flowchartCleanupChilds");
      var removed = false;
      var list = parent.list;
      var newlist = [];

      // filter list first
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (this.par.debug.val) {
                  console.writeln("flowchartCleanupChilds: " + node.txt);
            }
            if (node.type != "child") {
                  this.util.addWarningStatus("flowchartCleanupChilds: node.type " + node.type + " is not child, node txt:" + node.txt);
                  parent.list = [];
                  return false;
            }
            if (node.list.length == 0) {
                  if (node.type == "process") {
                        this.util.addWarningStatus("flowchartCleanupChilds: node.type == process, node txt:" + node.txt);
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
            if (this.flowchartCleanup(node)) {
                  removed = true;
            }
      }
      return removed;
}

// Remove empty nodes
flowchartCleanup(parent)
{
      if (this.global.debug) console.writeln("flowchartCleanup");
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
                  if (this.flowchartCleanup(node)) {
                        removed = true;
                  }
            } else if (node.type == "parent") {
                  if (this.flowchartCleanupChilds(node)) {
                        removed = true;
                  }
            } else if (node.type == "mask") {
                  if (this.flowchartCleanup(node)) {
                        removed = true;
                  }
            }
      }
      return removed;
}

flowchartPrintList(list, indent, testmode = false)
{
      if (this.global.debug) console.writeln("flowchartPrintList");
      for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var txt = indent + item.txt;
            if (testmode) {
                  this.global.testmode_log += txt + "\n";
            } else {
                  console.writeln(txt + this.util.get_node_execute_time_str(item));
            }
            if (item.type == "header") {
                  this.flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "child") {
                  this.flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "parent") {
                  this.flowchartPrintList(item.list, indent + "  ", testmode);
            } else if (item.type == "mask") {
                  this.flowchartPrintList(item.list, indent + "  ", testmode);
            }
      }
}

flowchartPrint(rootnode, testmode = false)
{
      if (rootnode == null) {
            console.writeln("No flowchart");
            return;
      }
      if (!testmode) {
            console.noteln("Flowchart:");
      }
      this.flowchartPrintList(rootnode.list, "  ", testmode);
}

flowchartReset()
{
      console.writeln("flowchartReset");
      this.flowchart_active = false;
      this.flowchartCurrent = null;
      this.flowchartStack = [];
      this.flowchartOperationList = [];

      this.global.flowchartData = null;
      this.global.flowchartActiveId = 0;
      this.global.flowchartOperationList = [];

      this.flowchart_operation_level = 0;
}

flowchartCancel()
{
      console.writeln("flowchartCancel");
      this.flowchartReset();
}

flowchartInit(txt)
{
      console.writeln("flowchartInit");
      this.flowchartCurrent = this.flowchartNewNode("header", txt);
      this.flowchartStack = [];
      this.flowchartOperationList = [];
      if (this.global.flowchartOperationList.length == 0) {
            // No previous flowchart data, use current flowchart
            console.writeln("flowchartInit, no previous flowchart data");
            this.global.flowchartData = this.flowchartCurrent;
      } else {
            // Use previous flowchart data
            console.writeln("flowchartInit, use previous flowchart data");
      }

      this.global.flowchartActiveId = 0;
      this.flowchart_operation_level = 0;

      this.flowchart_active = true;
}

flowchartDone()
{
      if (!this.flowchart_active) {
            return;
      }
      console.writeln("flowchartDone");
      this.flowchart_active = false;
      this.global.flowchartActiveId = 0;
      this.global.flowchartData = this.flowchartCurrent;
      this.global.flowchartOperationList = this.flowchartOperationList;

      // Iterate cleanup to remove empty nodes
      for (var i = 0; i < 10; i++) {
            if (!this.flowchartCleanup(this.global.flowchartData)) {
                  break;
            }
      }
      
      this.gui.flowchartUpdated();
}

/*

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

*/

}  /* AutoIntegrateFlowchart*/

#endif  /* AUTOINTEGRATEFLOWCHART_JS */
