/*
        AutoIntegrate GUI components.

Interface functions:

    See end of the file.

Interface objects:

    AutoIntegrateDialog

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2024 Jarmo Ruuth.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef NO_SOLVER_LIBRARY
#include "../AdP/SearchCoordinatesDialog.js"
#endif

function AutoIntegrateSelectStarsImageDialog( util )
{
      this.__base__ = Dialog;
      this.__base__();
      this.restyle();
   
      this.labelWidth = this.font.width( "Object identifier:M" );
      this.editWidth = this.font.width( 'M' )*40;

      this.starsImageLabel = new Label( this );
      this.starsImageLabel.text = "Select stars image:"
   
      this.starsImageComboBox = new ComboBox( this );
      this.starsImageComboBox.minItemCharWidth = 20;

      this.window_list = util.getWindowListReverse();
      if (this.window_list.length == 0) {
            this.name = "";
      } else {
            this.name = this.window_list[0];
            for (var i = 0; i < this.window_list.length; i++) {
                  this.starsImageComboBox.addItem( this.window_list[i] );
            }
      }

      this.starsImageComboBox.onItemSelected = function( itemIndex )
      {
            this.dialog.name = this.dialog.window_list[itemIndex];
      };

      // Common Buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = function()
      {
            this.dialog.ok();
      };

      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = function()
      {
            this.dialog.cancel();
      };

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );

      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      this.sizer.add( this.starsImageLabel );
      this.sizer.add( this.starsImageComboBox );
      this.sizer.add( this.buttons_Sizer );
   
      this.windowTitle = "Select stars image";
      this.adjustToContents();
      this.setFixedSize();
}

AutoIntegrateSelectStarsImageDialog.prototype = new Dialog;

function AutoIntegrateHueColors(par)
{
      this.__base__ = Frame;
      this.__base__();
   
      this.hueColorsBitmap = new Bitmap( File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ ) + "/hue.png" );

      function drawHueLine(g, bmp_startpos, bmp_width, bmp_height, hue)
      {
            // console.writeln("drawHueLine " + hue + " " + bmp_startpos + " " + bmp_width + " " + bmp_height);
            var line_x = bmp_startpos + hue * bmp_width;
            g.drawLine(line_x, 0, line_x, bmp_height);
      }

      this.onPaint = function(x0, y0, x1, y1) {
            // console.writeln("AutoIntegrateHueColors onPaint");
            var width = this.width;
            var height = this.height;
            var pos = 23;
            var bmp_width = (100 - pos) * width / 100;
            var bmp_startpos = pos * width / 100;

            var bmp = this.hueColorsBitmap.scaledTo(bmp_width, height);

            var graphics = new Graphics(this);
            graphics.drawBitmap(bmp_startpos, 0, bmp);
            graphics.pen = new Pen(0xFFFFFFFF,0);      // white
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_R_hue.val);
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_G_hue.val);
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_B_hue.val);
            graphics.end();
      }
}

AutoIntegrateHueColors.prototype = new Frame;

function AutoIntegrateNarrowbandSelectMultipleDialog(global, mappings_list)
{
      this.__base__ = Dialog;
      this.__base__();
      this.restyle();

      this.labelWidth = this.font.width( "Object identifier:M" );
      this.editWidth = this.font.width( 'M' )*40;

      this.names = mappings_list;
   
      this.narrowbandSelectMultipleLabel = new Label( this );
      this.narrowbandSelectMultipleLabel.text = "Select mappings:"

      this.select_Sizer = new VerticalSizer;
      this.select_Sizer.spacing = 6;

      var current_mappings = mappings_list.split(",");
      var checked_status = [];

      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            if (!global.narrowBandPalettes[i].checkable) {
                  continue;
            }
            var checked = false;
            for (var j = 0; j < current_mappings.length; j++) {
                  if (global.narrowBandPalettes[i].name == current_mappings[j].trim()) {
                        checked = true;
                        break;
                  }
            }
            checked_status[i] = checked

            var cb = new CheckBox( this );
            cb.text = global.narrowBandPalettes[i].name;
            cb.toolTip = "<p>R: " + global.narrowBandPalettes[i].R + ", G: " + global.narrowBandPalettes[i].G + ", B: " + global.narrowBandPalettes[i].B + "</p>";
            cb.checked = checked;
            cb.index = i;
            cb.onClick = function(checked) { 
                  checked_status[this.index] = checked;
            }

            this.select_Sizer.add( cb );
      }

      this.select_Sizer.addStretch();

      // Common Buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = function()
      {
            this.dialog.names = "";
            for (var i = 0; i < global.narrowBandPalettes.length; i++) {
                  if (checked_status[i]) {
                        if (this.dialog.names == "") {
                              this.dialog.names = global.narrowBandPalettes[i].name;
                        } else {
                              this.dialog.names = this.dialog.names + ", " + global.narrowBandPalettes[i].name;
                        }
                  }
            }
            this.dialog.ok();
      };

      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = function()
      {
            this.dialog.cancel();
      };

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );

      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      this.sizer.add( this.narrowbandSelectMultipleLabel );
      this.sizer.add( this.select_Sizer );
      this.sizer.add( this.buttons_Sizer );
   
      this.windowTitle = "Select Narrowband Mappings";
      this.adjustToContents();
      this.setFixedSize();
}

AutoIntegrateNarrowbandSelectMultipleDialog.prototype = new Dialog;

function AutoIntegrateGUI(global, util, engine)
{

this.__base__ = Object;
this.__base__();

var par = global.par;
var ppar = global.ppar;

var dialog_mode = 1;    // 0 = minimized, 1 = normal, 2 = maximized
var dialog_old_position = null;
var dialog_min_position = null;

var infoLabel;
var imageInfoLabel;
var windowPrefixHelpTips;              // For updating tooTip
var autoContinueWindowPrefixHelpTips; // For updating tooTip
var closeAllPrefixButton;              // For updating toolTip
var windowPrefixComboBox = null;       // For updating prefix name list
var autoContinueWindowPrefixComboBox = null; // For updating prefix name list
var outputDirEdit;                     // For updating output root directory
var tabPreviewControl = null;          // For updating preview window
var tabPreviewInfoLabel = null;        // For updating preview info text
var sidePreviewControl = null;         // For updating preview window
var tabHistogramControl = null;        // For updating histogram window
var sideHistogramControl = null;       // For updating histogram window
var mainTabBox = null;                 // For switching to preview tab
var sidePreviewInfoLabel = null;       // For updating preview info text
var stretchingComboBox = null;         // For disabling stretching method if Target type is selected

var use_hyperbolic = false;           // Use hyperbolic stretch, does not really work here so disbled
                                      // If enabled, add it to image_stretching_values and documentation

var current_histogramInfo = null;

var tab_preview_index = 1;
var is_some_preview = false;
var preview_size_changed = false;
var preview_keep_zoom = false;

var preview_image = null;
var preview_image_txt = null;
var preview_images = [];

var current_selected_file_name = null;
var current_selected_file_filter = null;

var extra_gui_info = { 
      undo_images: [],        // undo_images[0] == original image, { image: <Image>, keywords: <image keywords>, histogramInfo: <see getHistogramInfo>, extra_processing_info: [] }, see add_undo_image
      undo_images_pos: -1, 
      undo_button: null, 
      redo_button: null, 
      images_combobox: null,
      save_button: null
};

var monochrome_text = "Monochrome: ";

var blink_window = null;
var blink_zoom = false;
var blink_zoom_x = 0;
var blink_zoom_y = 0;

var extra_target_image_window_list = null;

var filterSectionbars = [];
var filterSectionbarcontrols = [];

var extract_channel_mapping_values = [ "None", "LRGB", "HSO", "HOS" ];
var RGBNB_mapping_values = [ 'H', 'S', 'O', '' ];
var use_weight_values = [ 'Generic', 'Noise', 'Stars', 'PSF Signal', 'PSF Signal scaled', 'FWHM scaled', 'Eccentricity scaled', 'SNR scaled', 'Star count' ];
var filter_limit_values = [ 'None', 'FWHM', 'Eccentricity', 'PSFSignal', 'PSFPower', 'SNR', 'Stars'];
var outliers_methods = [ 'Two sigma', 'One sigma', 'IQR' ];
var use_linear_fit_values = [ 'Luminance', 'Red', 'Green', 'Blue', 'No linear fit' ];
var image_stretching_values = [ 'Auto STF', 'Masked Stretch', 'Masked+Histogram Stretch', 'Histogram stretch', 'Arcsinh Stretch', 
                                'Logarithmic stretch', 'Asinh+Histogram stretch', 'Square root stretch', 'None' ];
var use_clipping_values = [ 'Auto1', 'Auto2', 'Percentile', 'Sigma', 'Averaged sigma', 'Winsorised sigma', 'Linear fit', 'ESD', 'None' ]; 
var narrowband_linear_fit_values = [ 'Auto', 'H', 'S', 'O', 'None' ];
var STF_linking_values = [ 'Auto', 'Linked', 'Unlinked' ];
var imageintegration_normalization_values = [ 'Additive', 'Adaptive', 'None' ];
var noise_reduction_strength_values = [ '0', '1', '2', '3', '4', '5', '6'];
var column_count_values = [ 'Auto', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
                            '11', '12', '13', '14', '15', '16', '17', '18', '19', '20' ];
var binning_values = [ 'None', 'Color', 'L and color'];
var starless_and_stars_combine_values = [ 'Add', 'Screen', 'Lighten' ];
var star_reduce_methods = [ 'None', 'Transfer', 'Halo', 'Star' ];
var extra_HDRMLT_color_values = [ 'None', 'Preserve hue', 'Color corrected' ];
var histogram_stretch_type_values = [ 'Median', 'Peak' ];
var spcc_white_reference_values = [ 'Average Spiral Galaxy', 'Photon Flux' ];
var target_binning_values = [ 'Auto', 'None',  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ];
var target_drizzle_values = [ 'Auto', 'None',  '2', '4' ];
var target_type_values = [ 'Default', 'Galaxy', 'Nebula' ];
var ABE_correction_values = [ 'Subtraction', 'Division' ];
var graxpert_correction_values = [ 'Subtraction', 'Division' ];
var graxpert_batch_size_values = [ '1', '2', '4', '8', '16', '32' ];
var Foraxx_palette_values = [ 'SHO', 'HOO' ];
var colorized_narrowband_preset_values = [ 'Default', 'North America', 'Eagle' ];
var narrowband_colorized_mapping_values = [ 'RGB', 'GRB', 'GBR', 'BRG', 'BGR', 'RBG' ];
var narrowband_colorized_combine_values = [ 'Channels', 'Screen', 'Sum', 'Mean', 'Max', 'Median' ];
var narrowband_colorized_method_values = [ 'Colourise', 'PixelMath' ];
var normalize_channels_reference_values = [ 'R', 'G', 'B' ];
var rotate_degrees_values = [ '90', '180', '-90' ];
var RGBHa_preset_values = [ 'Combine Continuum Subtract', 'SPCC Continuum Subtract', 'Max 0.7' ];
var RGBHa_prepare_method_values = [ 'Continuum Subtract', 'Basic',  ];
var RGBHa_combine_time_values = [ 'Stretched', 'SPCC linear', ];
var RGBHa_combine_method_values = [ 'Bright structure add', 'Max', 'Screen', 'Med subtract add', 'Add', 'None' ];
var signature_positions_values = [ 'Top left', 'Top middle', 'Top right', 'Bottom left', 'Bottom middle', 'Bottom right' ];
var color_calibration_time_values = [ 'auto', 'linear', 'nonlinear' ];

var adjust_type_values = [ 'Lights', 'Darks', 'All' ];

var screen_size = "Unknown";       // Screen wxh size as a string
var screen_width = 0;              // Screen width in pixels
var screen_height = 0;             // Screen height in pixels

var Foraxx_credit = "Foraxx and Dynamic palettes, credit https://thecoldestnights.com/2020/06/PixInsight-dynamic-narrowband-combinations-with-pixelmath/";

var stars_combine_operations_Tooltip =    "<p>Possible combine operations are:</p>" +
                                          "<ul>" + 
                                          "<li>Add - Use stars+starless formula in Pixelmath</li>" +
                                          "<li>Screen - Similar to screen in Photoshop</li>" +
                                          "<li>Lighten - Similar to lighten in Photoshop</li>" +
                                          "</ul>";

var unscreen_tooltip =                    "<p>Use unscreen method to get stars image as described by Russell Croman.</p>" +
                                          "<p>Unscreen method usually keeps star colors more correct than simple star removal. It is " + 
                                          "recommended to use Screen method when combining star and starless images back together.<p>";

var noiseReductionToolTipCommon =         "<p>By default noise reduction is done using a luminance mask to target noise reduction on darker areas of the image. " +
                                          "AI based noise reduction using NoiseXTerminator, GraXpert denoise or DeepSNR do not use a mask.</p> " +
                                          "<p>Bigger strength value means stronger noise reduction except with DeepSNR where is has a reverse effect. " +
                                          "Noise reduction uses MultiscaleLinerTransform, NoiseXTerminator, GraXpert denoise or DeepSNR.</p>" + 
                                          "<p>With MultiscaleLinerTransform the strength between 3 and 5 is the number of layers used to reduce noise. " + 
                                          "Strength values 1 and 2 are very mild three layer noise reductions and strength 6 is very aggressive five layer noise reduction.</p>" +
                                          "<p>With NoiseXTerminator the strength changes denoise and detail values. Strength value has the following mapping to denoise " + 
                                          "and detail:</p>" + 
                                          "<ul>" +
                                          "<li>Value: 1, Denoise: 0.60, Detail: 0.10</li>" +
                                          "<li>Value: 2, Denoise: 0.70, Detail: 0.15</li>" +
                                          "<li>Value: 3, Denoise: 0.80, Detail: 0.15</li>" +
                                          "<li>Value: 4, Denoise: 0.90, Detail: 0.15</li>" +
                                          "<li>Value: 5, Denoise: 0.90, Detail: 0.20</li>" +
                                          "<li>Value: 6, Denoise: 0.95, Detail: 0.20</li>" +
                                          "</ul>" +
                                          "<p>With DeepSNR the strength value has the following mapping:</p>" + 
                                          "<ul>" +
                                          "<li>Value: 1, Strength: 1.00</li>" +
                                          "<li>Value: 2, Strength: 0.90</li>" +
                                          "<li>Value: 3, Strength: 0.80</li>" +
                                          "<li>Value: 4, Strength: 0.70</li>" +
                                          "<li>Value: 5, Strength: 0.60</li>" +
                                          "<li>Value: 6, Strength: 0.50</li>" +
                                          "</ul>" +
                                          "<p>With GraXpert denoise the strength value is ignored.</p>";


var ACDNR_StdDev_tooltip =                "<p>A mild ACDNR noise reduction with StdDev value between 1.0 and 2.0 can be useful to smooth image and reduce black spots " + 
                                          "left from previous noise reduction.</p>";
var skip_reset_tooltip =                  "<p>Note that this parameter is not reset or saved to Json file.</p>";   
var adjust_type_toolTip =                 "<ul>" +
                                          "<li>Lights adjust only light parts of the image.</li>" +
                                          "<li>Darks adjust only dark parts of the image.</li>" +
                                          "<li>All adjust the whole image.</li>" +
                                          "</ul>";


// Settings for flowchart graph
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
            throwFatalError("flowchartGraphDrawChildsLine: loc != top or bottom, " + loc);
      }
}

// Iterate size of the flowchart childs graph
// position is themiddle position of the graph
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
function flowchartGraph(rootnode)
{
      if (par.flowchart_debug.val) {
            console.writeln("flowchart Graph");
      }

      if (rootnode == null) {
            console.writeln("No flowchart");
            return;
      }

      if (global.is_processing == global.processing_state.none) {
            engine.flowchartPrint(rootnode);
      }

      if (!global.use_preview) {
            return;
      }

      var fontsize = 8;
      var font = new Font( FontFamily_SansSerif, fontsize );

      var size = flowchartGraphIterate(rootnode, font, 0);

      var margin = 50;
      var width = size[0] + margin;
      var height = size[1] + margin;

      if (ppar.preview.side_preview_visible) {
            width = Math.max(width, ppar.preview.side_preview_width / 2);
            height = Math.max(height, ppar.preview.side_preview_height / 2);
      } else {
            width = Math.max(width, ppar.preview.preview_width);
            height = Math.max(height, ppar.preview.preview_height);
      }

      if (par.flowchart_debug.val) {
            console.writeln("flowchartGraph:width " + width + " height " + height);
      }

      if (preview_image != null && par.flowchart_background_image.val) {
            var bitmap = createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
            flowchart_is_background_image = true;
            var txt = preview_image_txt;
      } else {
            var bitmap = createEmptyBitmap(width, height, 0xffC0C0C0);  // gray background
            flowchart_is_background_image = false;
            var txt = null;
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
            if (bitmap.height != preview_image.height) {
                  var scale = preview_image.height / bitmap.height;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap = scaled_bitmap;
            }
            if (bitmap.width > preview_image.width) {
                  var scale = preview_image.width / bitmap.width;
                  var scaled_bitmap = bitmap.scaledTo(scale * bitmap.width, scale * bitmap.height);
                  bitmap = scaled_bitmap;
            }
            var background_image = new Image(preview_image);
            var background_bitmap = background_image.render();
            graphics = new Graphics(background_bitmap);
            // draw bitmnap to the middle of the image
            var x = (preview_image.width - bitmap.width) / 2;
            var y = (preview_image.height - bitmap.height) / 2;
            graphics.drawBitmap(x, y, bitmap);
            graphics.end();
            var flowchartImage = util.createImageFromBitmap(background_bitmap);
            background_image.free();
            background_image = null;
      } else {
            var flowchartImage = util.createImageFromBitmap(bitmap);
      }
      if (global.flowchart_image != null) {
            global.flowchart_image.free();
            global.flowchart_image = null;
      }
      global.flowchart_image = flowchartImage;

      tabPreviewControl.SetImage(flowchartImage, txt);
      sidePreviewControl.SetImage(flowchartImage, txt);

      util.runGarbageCollection();

      if (par.flowchart_debug.val) {
            console.writeln("flowchartGraph:end");
      }
}

function flowchartUpdated()
{
      if (par.show_flowchart.val && !global.get_flowchart_data) {
            // console.writeln("flowchartUpdated");
            try {
                  flowchartGraph(global.flowchartData);
            } catch (ex) {
                  console.writeln("flowchartUpdated: " + ex);
            }
      }
}

function copyFileNames(fileNames)
{
      if (fileNames == null) {
            return null;
      }

      var copy = [];
      for (var i = 0; i < fileNames.length; i++) {
            copy[i] = fileNames[i];
      }
      return copy;
}

function generateNewFlowchartData(parent)
{
      console.writeln("generateNewFlowchartData");

      getFilesFromTreebox(parent.dialog);

      if (global.lightFileNames == null) {
            console.criticalln("No files, cannot generate flowchart data");
            return false;
      }

      var succp = true;
      preview_image = null;
      preview_images = [];

      engine.flowchartReset();

      console.writeln("generateNewFlowchartData: copy file names");
      var lightFileNamesCopy = copyFileNames(global.lightFileNames);
      var darkFileNamesCopy = copyFileNames(global.darkFileNames);
      var biasFileNamesCopy = copyFileNames(global.biasFileNames);
      var flatdarkFileNamesCopy = copyFileNames(global.flatdarkFileNames);
      var flatFileNamesCopy = copyFileNames(global.flatFileNames);

      // Use prefix when running flowchart to avoid name conflicts
      var saved_win_prefix = ppar.win_prefix;
      ppar.win_prefix = "AutoIntegrateFlowchart_";

      // global.all_windows is a special case if we run the script multiple times
      var old_all_windows = global.all_windows;
      global.all_windows = [];

      util.fixAllWindowArrays(ppar.win_prefix);
      engine.closeAllWindows(false, false);

      global.get_flowchart_data = true;
      try {
            engine.autointegrateProcessingEngine(parent.dialog, false, false, "Generate flowchart data");
      } catch (x) {
            console.writeln( x );
            global.flowchartData = null;
            global.is_processing = global.processing_state.none;
            succp = false;
      }
      global.get_flowchart_data = false;

      // Close all windows with flowchart prefix
      util.fixAllWindowArrays(ppar.win_prefix);
      engine.closeAllWindows(false, false);

      // restore original prefix
      ppar.win_prefix = saved_win_prefix;
      util.fixAllWindowArrays(ppar.win_prefix);

      engine.closeAllWindowsFromArray(global.flowchartWindows);
      global.flowchartWindows = [];

      console.writeln("generateNewFlowchartData: restore original file names");
      global.lightFileNames = lightFileNamesCopy;
      global.darkFileNames = darkFileNamesCopy;
      global.biasFileNames = biasFileNamesCopy;
      global.flatdarkFileNames = flatdarkFileNamesCopy;
      global.flatFileNames = flatFileNamesCopy;
      global.all_windows = old_all_windows;
      
      console.writeln("generateNewFlowchartData done");
      util.runGarbageCollection();

      return succp;
}

function newVerticalSizer(margin, add_stretch, items)
{
      var sizer = new VerticalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
      if (margin > 0) {
            sizer.margin = margin;
      }
      sizer.spacing = 4;
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

function newHorizontalSizer(margin, add_stretch, items, spacing)
{
      var sizer = new HorizontalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
      sizer.margin = margin;
      if (spacing != null) {
            sizer.spacing = spacing;
      } else {
            sizer.spacing = 4;
      }
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

function getNarrowbandColorizedSizer(parent)
{
      var narrowbandColorizedtoolTipBase =
      "<p>RGB channels are extracted from the target color image, channel images are colorized and a new RGB image is created.</p>" + 
      "<p>The idea is to pick a color hue and saturation for each channel to change the final image colors. Also relative weight for each channel can be given.</p>" +
      "<p>Preview button can be used to show a mosaic preview of each colorized channel image and the final image.</p>" +
      "<p>Some presets are available to give a starting point for experimenting. Note that the target image Apply creates the final image, " +
      "preview image is always discarded.</p>" +
      "<p>Settings are briefly described below:</p>" +
      "<ul>" +
      "<li>Method gives choices on how colorization is done for channel images.</li>" +
      "<li>Combine selection gives a few options on how colorized channel images are combined to and RGB image.</li>" +
      "<li>With a mapping selection it is possible to change how channels are mapped in the final image. Works only with Channels combine method.</li>" +
      "<li>Optionally is it possible to run linear fit for channel images before colorizing.</li>" +
      "</ul>" +
      '<p>Colorizing is inspired by Steven Miller YouTube channel <a href="https://www.youtube.com/@enteringintospace4685">Entering Into Space</a>, ' + 
      "NBColourMapper script from Mike Cranfield and Adam Block, and CombineImages script by Dean Carr. Note that Colorizing does not replace " + 
      "or fully replicate their work.</p>";

      var narrowbandColorizedtoolTip = "<hr>" + narrowbandColorizedtoolTipBase;

      var narrowbandColorizedCheckBox = newCheckBox(parent, "Colorize narrowband", par.run_colorized_narrowband, 
            "<p>Enhance colors for narrowband and other images.</p>" + narrowbandColorizedtoolTip);

      if (par.debug.val) {    
            var narrowbandColorizedIntegratedImagesCheckBox = newCheckBox(parent, "D:Use integrated images", 
                                                                     par.colorized_integrated_images, 
                                                                     "<p>Use linear integrated images (Integration_[SHO]) for colorizing. " + 
                                                                     "If not selected then RGB channels are extracted from the target image.</p>" +
                                                                     narrowbandColorizedtoolTip);
      }
      var hue_width = 400;
      var sat_width = 150;
      var weight_width = 170;

      var hueColors = new AutoIntegrateHueColors(par);
      hueColors.setScaledFixedSize(hue_width,20);

      function updateHueColors()
      {
            // console.writeln("updateHueColors");
            hueColors.repaint();
      }
      
      var narrowbandColorizedPresetLabel = newLabel(parent, "Presets", narrowbandColorizedtoolTip);
      var narrowbandColorizedPresetComboBox = newComboBox(parent, par.colorized_narrowband_preset, colorized_narrowband_preset_values, narrowbandColorizedtoolTip);
      narrowbandColorizedPresetComboBox.onItemSelected = function( itemIndex )
      {
            switch (colorized_narrowband_preset_values[itemIndex]) {
                  case 'Default':
                        var hue = [ par.narrowband_colorized_R_hue.def, par.narrowband_colorized_G_hue.def, par.narrowband_colorized_B_hue.def ];
                        var sat = [ par.narrowband_colorized_R_sat.def, par.narrowband_colorized_G_sat.def, par.narrowband_colorized_B_sat.def ];
                        var weight = [ 1.0, 1.0, 1.0 ];
                        break;
                  case 'North America':
                        var hue = [ 0.04, 0.104, 0.6 ];
                        var sat = [ 0.5, 0.5, 0.5 ];
                        var weight = [ 1.0, 1.0, 1.0 ];
                        break;
                  case 'Eagle':
                        var hue = [ 0.067, 0.122, 0.572 ];
                        var sat = [ 0.5, 0.6, 0.5 ];
                        var weight = [ 0.7, 0.7, 0.7 ];
                        break;
                  default:
                        util.throwFatalError("Unknown preset " + colorized_narrowband_preset_values[itemIndex]);
                        break;
            }

            par.narrowband_colorized_R_hue.val = hue[0];
            par.narrowband_colorized_G_hue.val = hue[1];
            par.narrowband_colorized_B_hue.val = hue[2];

            par.narrowband_colorized_R_sat.val = sat[0];
            par.narrowband_colorized_G_sat.val = sat[1];
            par.narrowband_colorized_B_sat.val = sat[2];

            par.narrowband_colorized_R_weight.val = weight[0];
            par.narrowband_colorized_G_weight.val = weight[1];
            par.narrowband_colorized_B_weight.val = weight[2];

            par.narrowband_colorized_R_hue.reset();
            par.narrowband_colorized_G_hue.reset();
            par.narrowband_colorized_B_hue.reset();

            par.narrowband_colorized_R_sat.reset();
            par.narrowband_colorized_G_sat.reset();
            par.narrowband_colorized_B_sat.reset();

            par.narrowband_colorized_R_weight.reset();
            par.narrowband_colorized_G_weight.reset();
            par.narrowband_colorized_B_weight.reset();

            updateHueColors();
      };
      function narrowbandColorizedPreview(mosaic) {
            // make a copy if the current image
            if (global.extra_target_image == 'Auto') {
                  var extraWin = null;
                  var bitmap = createEmptyBitmap(2048, 2048, 0x80808080);
                  var originalWin = util.createWindowFromBitmap(bitmap, "AutoIntegrate_NoImage");
            } else {
                  var extraWin = ImageWindow.windowById(global.extra_target_image);
                  var originalWin = extraWin;
            }
            var copyWin = util.copyWindow(originalWin, originalWin.mainView.id + "_NBCpreview");

            // Process the copy and get channel images
            var channel_images = engine.extraColorizedNarrowbandImages(copyWin);

            if (mosaic) {
                  // Create a preview window
                  var previewWin = createCombinedMosaicPreviewWin([ channel_images[0], channel_images[1], channel_images[2], copyWin ]);
            } else {
                  var previewWin = createCombinedMosaicPreviewWin([ originalWin, copyWin ]);
            }

            // Show the preview window
            updatePreviewWin(previewWin);

            if (1) {
                  // Close windows
                  if (extraWin == null) {
                        util.forceCloseOneWindow(originalWin);
                  }
                  util.forceCloseOneWindow(copyWin);
                  util.forceCloseOneWindow(previewWin);
                  for (var i = 0; i < channel_images.length; i++) {
                        util.forceCloseOneWindow(channel_images[i]);
                  }
            }
            util.runGarbageCollection();
      }

      if (par.debug.val) {
            narrowband_colorized_method_values.push('D:Curves');
            narrowband_colorized_method_values.push('D:PixelMathChannels');
      }

      var narrowbandColorizedMethodLabel = newLabel(parent, "Method",  "<p>Method tells hoe channels are colorized.</p>" + 
                                                                       "<p>Colourize uses a built in process Colourise.</p>" + 
                                                                       "<p>PixelMath uses RGB color values derived from hue to create a colorized image.</p>" + 
                                                                       narrowbandColorizedtoolTip);
      var narrowbandColorizedMethodComboBox = newComboBox(parent, par.narrowband_colorized_method, narrowband_colorized_method_values, narrowbandColorizedMethodLabel.toolTip);

      var narrowbandColorizedCombineLabel = newLabel(parent, "Combine", "<p>Specifies how colorized channels are combined.</p>" + 
                                                                        "<p>Option Channels uses PixelMath. Each colorized channel is assigned to a separate RGB channel in PixelMath.</p>" + 
                                                                        "<p>Other options use a PixelMath formula combine channels. These options use a single PixelMath expression.</p>" + 
                                                                        narrowbandColorizedtoolTip);
      var narrowbandColorizedCombineComboBox = newComboBox(parent, par.narrowband_colorized_combine, narrowband_colorized_combine_values, narrowbandColorizedCombineLabel.toolTip);

      var narrowbandColorizedMappingLabel = newLabel(parent, "Mapping", "<p>Specifies how colorized channels are mapped in case of Channels combine method. Mapping tells how original RGB channel are ordered in the final image.</p>" + 
                                                             narrowbandColorizedtoolTip);
      var narrowbandColorizedMappingComboBox = newComboBox(parent, par.narrowband_colorized_mapping, narrowband_colorized_mapping_values, narrowbandColorizedMappingLabel.toolTip);


      var narrowbandColorizedLinerFitCheckBox = newCheckBox(parent, "Linear fit", par.narrowband_colorized_linear_fit, "<p>If set, channels are linear fit with R channel before colorize.</p>" + narrowbandColorizedtoolTip);

      var narrowbandColorizedPreviewButton = new PushButton( parent );
      narrowbandColorizedPreviewButton.text = "Preview";
      narrowbandColorizedPreviewButton.toolTip = "<p>Show a preview of original and final images.</p>" + 
                                                 "<p>Note that the preview image is always discarded after preview.</p>" +
                                                 narrowbandColorizedtoolTip;
      narrowbandColorizedPreviewButton.onClick = function() 
      {
            narrowbandColorizedPreview(false);
      };

      var narrowbandColorizedPreviewMosaicButton = new PushButton( parent );
      narrowbandColorizedPreviewMosaicButton.text = "Preview mosaic";
      narrowbandColorizedPreviewMosaicButton.toolTip = "<p>Show a preview mosaic with all channel images and the final image.</p>" + 
                                                       "<p>Note that the preview image is always discarded after preview.</p>" +
                                                       narrowbandColorizedtoolTip;
      narrowbandColorizedPreviewMosaicButton.onClick = function() 
      {
            narrowbandColorizedPreview(true);
      };

      var narrowbandColorizedHelpTips = new ToolButton( parent );
      narrowbandColorizedHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      narrowbandColorizedHelpTips.setScaledFixedSize( 20, 20 );
      narrowbandColorizedHelpTips.toolTip = narrowbandColorizedtoolTipBase;
      narrowbandColorizedHelpTips.onClick = function()
      {
            new MessageBox(narrowbandColorizedtoolTipBase, "Narrowband colorization", StdIcon_Information ).execute();
      }

      var hueToolTip = "<p>Color hue for the channel.</p>" + 
                       "<p>Hue values for basic colors:</p>" + 
                       "<ul>" +
                       "<li>Red 0.000 - 0.167</li>" +
                       "<li>Yellow 0.168 - 0.333</li>" +
                       "<li>Green 0.334 - 0.500</li>" +
                       "<li>Cyan 0.501 - 0.667</li>" +
                       "<li>Blue 0.668 - 0.833</li>" +
                       "<li>Magenta 0.833 - 1.000</li>" +
                       "</ul>" +
                       narrowbandColorizedtoolTip;

      var weightToolTip = "<p>Relative weight for the channel.</p>" +
                          "<p>Weight is used to adjust relative contribution of each channel to the final image when combining a colorized channel image.</p>" +
                          "<p>A smaller weight value means darker image and a bigger value means a lighter image.</p>" +
                          "<p>In case of Colourise combine method weight is used to calculate midtones value using a formula 1-weight/2. " + 
                          "Often it is necessary to reduce the weight value for example to 0.6</p>" +
                          "<p>In case of PixelMath combine method each colorized channel is multiplied by the weight value.</p>" +
                          narrowbandColorizedtoolTip;

      var SatToolTip = "<p>Color saturation for the channel.</p>" +
                       narrowbandColorizedtoolTip;

      var narrowbandColorized_R_HueControl = newNumericControl3(parent, "R hue", par.narrowband_colorized_R_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_R_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_R_SatControl = newNumericControl2(parent, "sat", par.narrowband_colorized_R_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_R_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_R_WeightControl = newNumericControl2(parent, "weight", par.narrowband_colorized_R_weight, 0, 2, weightToolTip);
      narrowbandColorized_R_WeightControl.setScaledFixedWidth(weight_width);
      
      var narrowbandColorized_G_HueControl = newNumericControl3(parent, "G hue", par.narrowband_colorized_G_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_G_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_G_SatControl = newNumericControl2(parent, "sat", par.narrowband_colorized_G_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_G_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_G_WeightControl = newNumericControl2(parent, "weight", par.narrowband_colorized_G_weight, 0, 2, weightToolTip);
      narrowbandColorized_G_WeightControl.setScaledFixedWidth(weight_width);
      
      var narrowbandColorized_B_HueControl = newNumericControl3(parent, "B hue", par.narrowband_colorized_B_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_B_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_B_SatControl = newNumericControl2(parent, "sat", par.narrowband_colorized_B_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_B_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_B_WeightControl = newNumericControl2(parent, "weight", par.narrowband_colorized_B_weight, 0, 2, weightToolTip);
      narrowbandColorized_B_WeightControl.setScaledFixedWidth(weight_width);

      var narrowbandColorized_R_hue_sizer = new HorizontalSizer;
      narrowbandColorized_R_hue_sizer.spacing = 8;
      narrowbandColorized_R_hue_sizer.add( narrowbandColorized_R_HueControl );
      narrowbandColorized_R_hue_sizer.add( narrowbandColorized_R_SatControl );
      narrowbandColorized_R_hue_sizer.add( narrowbandColorized_R_WeightControl );
      narrowbandColorized_R_hue_sizer.addStretch();

      var narrowbandColorized_G_hue_sizer = new HorizontalSizer;
      narrowbandColorized_G_hue_sizer.spacing = 8;
      narrowbandColorized_G_hue_sizer.add( narrowbandColorized_G_HueControl );
      narrowbandColorized_G_hue_sizer.add( narrowbandColorized_G_SatControl );
      narrowbandColorized_G_hue_sizer.add( narrowbandColorized_G_WeightControl );
      narrowbandColorized_G_hue_sizer.addStretch();

      var narrowbandColorized_B_hue_sizer = new HorizontalSizer;
      narrowbandColorized_B_hue_sizer.spacing = 8;
      narrowbandColorized_B_hue_sizer.add( narrowbandColorized_B_HueControl );
      narrowbandColorized_B_hue_sizer.add( narrowbandColorized_B_SatControl );
      narrowbandColorized_B_hue_sizer.add( narrowbandColorized_B_WeightControl );
      narrowbandColorized_B_hue_sizer.addStretch();

      var narrowbandColorized_sizer1 = new HorizontalSizer;
      narrowbandColorized_sizer1.spacing = 6;
      narrowbandColorized_sizer1.add( narrowbandColorizedCheckBox );
      if (par.debug.val) {    
            narrowbandColorized_sizer1.add( narrowbandColorizedIntegratedImagesCheckBox );
      }
      narrowbandColorized_sizer1.addSpacing( 12 );
      narrowbandColorized_sizer1.add( narrowbandColorizedPreviewButton );
      narrowbandColorized_sizer1.add( narrowbandColorizedPreviewMosaicButton );
      narrowbandColorized_sizer1.addSpacing( 12 );
      narrowbandColorized_sizer1.add( narrowbandColorizedHelpTips );
      narrowbandColorized_sizer1.addStretch();

      var narrowbandColorized_sizer2 = new HorizontalSizer;
      narrowbandColorized_sizer2.spacing = 4;
      narrowbandColorized_sizer2.add( narrowbandColorizedPresetLabel );
      narrowbandColorized_sizer2.add( narrowbandColorizedPresetComboBox );
      narrowbandColorized_sizer2.add( narrowbandColorizedMethodLabel );
      narrowbandColorized_sizer2.add( narrowbandColorizedMethodComboBox );
      narrowbandColorized_sizer2.add( narrowbandColorizedCombineLabel );
      narrowbandColorized_sizer2.add( narrowbandColorizedCombineComboBox );
      narrowbandColorized_sizer2.add( narrowbandColorizedMappingLabel );
      narrowbandColorized_sizer2.add( narrowbandColorizedMappingComboBox );
      narrowbandColorized_sizer2.add( narrowbandColorizedLinerFitCheckBox );
      narrowbandColorized_sizer2.addStretch();

      var narrowbandColorized_sizer = new VerticalSizer;
      narrowbandColorized_sizer.spacing = 4;
      narrowbandColorized_sizer.add( narrowbandColorized_sizer1 );
      narrowbandColorized_sizer.add( narrowbandColorized_sizer2 );
      narrowbandColorized_sizer.add( hueColors );
      narrowbandColorized_sizer.add( narrowbandColorized_R_hue_sizer );
      narrowbandColorized_sizer.add( narrowbandColorized_G_hue_sizer );
      narrowbandColorized_sizer.add( narrowbandColorized_B_hue_sizer );
      //narrowbandColorized_sizer.addStretch();

      return narrowbandColorized_sizer;
}

function extraProcessingGUI(parent)
{
      this.__base__ = Object;
      this.__base__();

      // Foraxx mapping
      this.narrowband_Foraxx_CheckBox = newCheckBox(parent, "Foraxx mapping", par.run_foraxx_mapping, 
            "<p>Use dynamic Foraxx palette on image.</p>" +
            "<p>Foraxx mapping can be done on SHO or HOO image. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a dynamic Foraxx palette image.</p>" +
            "<p>After Foraxx SHO mapping <i>Remove green cast</i> and <i>Orange/blue colors</i> are run for the image.</p>" +
            "<p>To run basic Foraxx SHO mapping use <i>SHO mapping</i> and select <i>Dynamic SHO</i>.</p>" +
            "<p>To run Foraxx palette during the normal processing you need to select Dynamic narrowband palatte like Dynamic SHO and " +
            "check the option <i>Narrowband mapping using non-linear data</i>.</p>" +
            "<p>" + Foraxx_credit + "</p>" );
      this.narrowband_Foraxx_palette_ComboBox = newComboBox(parent, par.foraxx_palette, Foraxx_palette_values, this.narrowband_Foraxx_CheckBox.toolTip);

      this.ForaxxSizer = new HorizontalSizer;
      this.ForaxxSizer.spacing = 4;
      this.ForaxxSizer.add( this.narrowband_Foraxx_CheckBox );
      this.ForaxxSizer.add( this.narrowband_Foraxx_palette_ComboBox );
      this.ForaxxSizer.addStretch();

      // SHO mapping
      this.extra_SHO_mapping_values = [];
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            if (global.narrowBandPalettes[i].sho_mappable) {
                  this.extra_SHO_mapping_values.push(global.narrowBandPalettes[i].name);
            }
      }
      this.extra_narrowband_mapping_CheckBox = newCheckBox(parent, "Narrowband mapping", par.run_extra_narrowband_mapping, 
            "<p>Map source narrowband image to a new narrowband palette.</p>" +
            "<p>Mapping can be done only on SHO or HOO images. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a new palette image.</p>");
      this.extra_narrowband_source_palette_ComboBox = newComboBox(parent, par.extra_narrowband_mapping_source_palette, Foraxx_palette_values, this.extra_narrowband_mapping_CheckBox.toolTip);
      this.extra_narrowband_target_mapping_Label = newLabel(parent, "to", this.extra_narrowband_mapping_CheckBox.toolTip);
      this.extra_narrowband_target_palette_ComboBox = newComboBox(parent, par.extra_narrowband_mapping_target_palette, this.extra_SHO_mapping_values, this.extra_narrowband_mapping_CheckBox.toolTip);

      this.extraSHOMappingSizer = new HorizontalSizer;
      this.extraSHOMappingSizer.spacing = 4;
      this.extraSHOMappingSizer.add( this.extra_narrowband_mapping_CheckBox );
      this.extraSHOMappingSizer.add( this.extra_narrowband_source_palette_ComboBox );
      this.extraSHOMappingSizer.add( this.extra_narrowband_target_mapping_Label );
      this.extraSHOMappingSizer.add( this.extra_narrowband_target_palette_ComboBox );
      this.extraSHOMappingSizer.addStretch();

      this.narrowband_orangeblue_colors_CheckBox = newCheckBox(parent, "Orange/blue colors", par.run_orangeblue_colors, 
            "<p>Enhance image by shifting red colors more to  orange and enhancing blues. Useful for example with Foraxx palette.</p>");

      this.fix_narrowband_star_color_CheckBox = newCheckBox(parent, "Fix star colors", par.fix_narrowband_star_color, 
            "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars.</p>" );
      // this.narrowband_less_green_hue_shift_CheckBox = newCheckBox(parent, "Hue shift for less green", par.run_less_green_hue_shift, 
      //       "<p>Do hue shift to shift green color to the yellow color. Useful with SHO color palette.</p>" );
      this.narrowband_orange_hue_shift_CheckBox = newCheckBox(parent, "Hue shift for more orange", par.run_orange_hue_shift, 
            "<p>Do hue shift to enhance orange color. Useful with SHO color palette.</p>" );
      this.narrowband_hue_shift_CheckBox = newCheckBox(parent, "Hue shift for SHO", par.run_hue_shift, 
            "<p>Do hue shift to enhance HSO colors. Useful with SHO color palette.</p>" );

      this.narrowbandColorized_sizer = getNarrowbandColorizedSizer(parent);

      this.narrowband_leave_some_green_CheckBox = newCheckBox(parent, "Leave some green", par.leave_some_green, 
            "<p>Leave some green color on image when running SCNR. Useful with SHO color palette. </p>");
      this.narrowband_leave_some_green_Edit = newNumericEdit(parent, "Amount", par.leave_some_green_amount, 0, 1, 
            "<p>Amount value 0 keeps all the green, value 1 removes all green.</p>");
      this.narrowband_leave_some_green_sizer = new HorizontalSizer;
      this.narrowband_leave_some_green_sizer.spacing = 4;
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_CheckBox );
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_Edit );
      this.narrowband_leave_some_green_sizer.addStretch();
      this.run_narrowband_SCNR_CheckBox = newCheckBox(parent, "Remove green cast", par.run_narrowband_SCNR, 
            "<p>Run SCNR to remove green cast. Useful with SHO color palette.</p>");
      this.no_star_fix_mask_CheckBox = newCheckBox(parent, "No mask when fixing star colors", par.skip_star_fix_mask, 
            "<p>Do not use star mask when fixing star colors</p>" );
      this.remove_magenta_color_CheckBox = newCheckBox(parent, "Remove magenta color", par.remove_magenta_color, 
            "<p>Remove magenta color from image.</p>" );

      this.narrowbandOptions1_sizer = new VerticalSizer;
      this.narrowbandOptions1_sizer.margin = 6;
      this.narrowbandOptions1_sizer.spacing = 4;
      this.narrowbandOptions1_sizer.add( this.ForaxxSizer );
      this.narrowbandOptions1_sizer.add( this.extraSHOMappingSizer );
      this.narrowbandOptions1_sizer.add( this.narrowband_orangeblue_colors_CheckBox );
      // this.narrowbandOptions1_sizer.add( this.narrowband_less_green_hue_shift_CheckBox );
      this.narrowbandOptions1_sizer.add( this.narrowband_orange_hue_shift_CheckBox );
      this.narrowbandOptions1_sizer.add( this.narrowband_hue_shift_CheckBox );

      this.narrowbandOptions2_sizer = new VerticalSizer;
      this.narrowbandOptions2_sizer.margin = 6;
      this.narrowbandOptions2_sizer.spacing = 4;
      this.narrowbandOptions2_sizer.add( this.run_narrowband_SCNR_CheckBox );
      this.narrowbandOptions2_sizer.add( this.narrowband_leave_some_green_sizer );
      this.narrowbandOptions2_sizer.add( this.remove_magenta_color_CheckBox );
      this.narrowbandOptions2_sizer.add( this.fix_narrowband_star_color_CheckBox );
      this.narrowbandOptions2_sizer.add( this.no_star_fix_mask_CheckBox );

      var narrowbandExtraLabeltoolTip = 
            "<p>" +
            "Extra processing options to be applied on narrowband images. "+
            "They are applied before other extra processing options in the following order:" +
            "</p>" +
            "<ol>" +
            "<li>Hue shift for less green</li>" +
            "<li>Hue shift for more orange</li>" +
            "<li>Hue shift for SHO</li>" +
            "<li>Colorized narrowband</li>" +
            "<li>Remove green cast/Leave some green</li>" +
            "<li>Remove magenta color</li>" +
            "<li>Fix star colors</li>" +
            "</ol>";
      this.narrowbandExtraOptionsSizer = new HorizontalSizer;
      //this.narrowbandExtraOptionsSizer.margin = 6;
      //this.narrowbandExtraOptionsSizer.spacing = 4;
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions1_sizer );
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions2_sizer );
      this.narrowbandExtraOptionsSizer.toolTip = narrowbandExtraLabeltoolTip;
      this.narrowbandExtraOptionsSizer.addStretch();

      // Extra processing
      var extraRemoveStars_Tooltip = 
            "<p>Run Starnet2 or StarXTerminator on image to generate a starless image and a separate image for the stars.</p>" + 
            "<p>When this is selected, extra processing is applied to the starless image. Smaller stars option is run on star images.</p>" + 
            "<p>At the end of the processing a combined image can be created from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            stars_combine_operations_Tooltip;
      this.extraRemoveStars_CheckBox = newCheckBox(parent, "Remove stars", par.extra_remove_stars, extraRemoveStars_Tooltip);
      this.extraUnscreenStars_CheckBox = newCheckBox(parent, "Unscreen", par.extra_unscreen_stars, unscreen_tooltip);
      this.extraRemoveStars_Sizer = new HorizontalSizer;
      this.extraRemoveStars_Sizer.spacing = 4;
      this.extraRemoveStars_Sizer.add( this.extraRemoveStars_CheckBox);
      this.extraRemoveStars_Sizer.add( this.extraUnscreenStars_CheckBox);
      this.extraRemoveStars_Sizer.toolTip = narrowbandExtraLabeltoolTip;
      this.extraRemoveStars_Sizer.addStretch();

      var extraCombineStarsReduce_Tooltip =
            "<p>With reduce selection it is possible to reduce stars while combining. " +
            "Star reduction uses PixelMath expressions created by Bill Blanshan.</p>" +
            "<p>Different methods are:</p>" +
            "<p>" +
            "None - No reduction<br>" +
            "Transfer - Method 1, Transfer method<br>" +
            "Halo - Method 2, Halo method<br>" +
            "Star - Method 3, Star method" +
            "</p>";
      var extraCombineStars_Tooltip = 
            "<p>Create a combined image from starless and star images. Combine operation can be " + 
            "selected from the combo box. To use combine you need to have starless image selected as the " + 
            "target image. Stars image must be open in the desktop.</p>" +
            "<p>Star image is searched using the following steps:</p>" +
            "<ol>" +
            "<li>All occurrences of text starless replaced with text stars</li>" +
            "<li>All occurrences of text starless_edit followed by a number (starless_edit[1-9]*) replaced with text stars</li>" +
            "<li>Text starless at the end replaced with text stars</li>" +
            "<li>Text starless and any text that follows it (starless.*) replaced with text stars</li>" +
            "<li>Text starless and any text that follows it (starless.*) replaced with text stars and any text after text stars " + 
            "is accepted (stars.*). So starless image <i>sameprefix</i>_starless_<i>whatever</i> is matched with stars image " + 
            "<i>sameprefix</i>_stars_<i>doesnotmatterwhatishere</i>.</li>" +
            "</ol>" +
            stars_combine_operations_Tooltip + 
            extraCombineStarsReduce_Tooltip;
      this.extraCombineStars_CheckBox = newCheckBox(parent, "Combine starless and stars", par.extra_combine_stars, extraCombineStars_Tooltip);
      this.extraCombineStars_ComboBox = newComboBox(parent, par.extra_combine_stars_mode, starless_and_stars_combine_values, extraCombineStars_Tooltip);
      
      this.extraCombineStars_Sizer1= new HorizontalSizer;
      this.extraCombineStars_Sizer1.spacing = 4;
      this.extraCombineStars_Sizer1.add( this.extraCombineStars_CheckBox);
      this.extraCombineStars_Sizer1.add( this.extraCombineStars_ComboBox);
      this.extraCombineStars_Sizer1.toolTip = narrowbandExtraLabeltoolTip;
      this.extraCombineStars_Sizer1.addStretch();

      this.extraCombineStarsReduce_Label = newLabel(parent, "Reduce stars", extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_ComboBox = newComboBox(parent, par.extra_combine_stars_reduce, star_reduce_methods, 
            extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_S_edit = newNumericEdit(parent, 'S', par.extra_combine_stars_reduce_S, 0.0, 1.0, 
            "<p>To reduce stars size more with Transfer and Halo, lower S value.<p>" + extraCombineStarsReduce_Tooltip);
      var extraCombineStarsReduce_M_toolTip = "<p>Star method mode; 1=Strong; 2=Moderate; 3=Soft reductions.</p>" + extraCombineStarsReduce_Tooltip;
      this.extraCombineStarsReduce_M_Label = newLabel(parent, "I", extraCombineStarsReduce_M_toolTip);
      this.extraCombineStarsReduce_M_SpinBox = newSpinBox(parent, par.extra_combine_stars_reduce_M, 1, 3, 
            extraCombineStarsReduce_M_toolTip);

      this.extraCombineStars_Sizer2 = new HorizontalSizer;
      this.extraCombineStars_Sizer2.spacing = 4;
      this.extraCombineStars_Sizer2.addSpacing(20);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_Label);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_ComboBox);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_S_edit);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_M_Label);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_M_SpinBox);
      this.extraCombineStars_Sizer2.toolTip = narrowbandExtraLabeltoolTip;
      this.extraCombineStars_Sizer2.addStretch();

      this.extraStarsImageLabel = newLabel(parent, "Starless image", "Text Auto or empty image uses default starless image.");
      this.extraStarsImageEdit = newTextEdit(parent, par.extra_combine_stars_image, this.extraStarsImageLabel.toolTip);
      var extraStarsImageEdit = this.extraStarsImageEdit;
      this.extraStarsImageSelectButton = new ToolButton(parent);
      this.extraStarsImageSelectButton.text = "Select";
      this.extraStarsImageSelectButton.icon = parent.scaledResource(":/icons/find.png");
      this.extraStarsImageSelectButton.toolTip = "<p>Select stars image manually from open images.</p>";
      this.extraStarsImageSelectButton.onClick = function()
      {
            let selectStars = new AutoIntegrateSelectStarsImageDialog(util);
            selectStars.windowTitle = "Select Stars Image";
            if (selectStars.execute()) {
                  if (selectStars.name == null) {
                        console.writeln("Stars image not selected");
                        return;
                  }
                  console.writeln("Stars image name " + selectStars.name);
                  extraStarsImageEdit.text = selectStars.name;
                  par.extra_combine_stars_image.val = selectStars.name;
            }
      };

      this.extraCombineStarsSelect_Sizer = new HorizontalSizer;
      this.extraCombineStarsSelect_Sizer.spacing = 4;
      this.extraCombineStarsSelect_Sizer.addSpacing(20);
      this.extraCombineStarsSelect_Sizer.add( this.extraStarsImageLabel);
      this.extraCombineStarsSelect_Sizer.add( this.extraStarsImageEdit);
      this.extraCombineStarsSelect_Sizer.add( this.extraStarsImageSelectButton);

      this.extraCombineStars_Sizer = new VerticalSizer;
      this.extraCombineStars_Sizer.spacing = 4;
      this.extraCombineStars_Sizer.add( this.extraCombineStars_Sizer1);
      this.extraCombineStars_Sizer.add( this.extraCombineStarsSelect_Sizer );
      this.extraCombineStars_Sizer.add( this.extraCombineStars_Sizer2);
      this.extraCombineStars_Sizer.toolTip = narrowbandExtraLabeltoolTip;
      this.extraCombineStars_Sizer.addStretch();

      this.extraRGBHamapping_CheckBox = newCheckBox(parent, "Ha to RGB mapping", par.extra_ha_mapping, 
            "<p>Run Ha to RGB mapping on the image.</p>" +
            "<p>Integratrion_H, Integration_H_crop or Integratrion_H_enhanced image must be loaded to the desktop.</p>" );
      this.extraDarkerBackground_CheckBox = newCheckBox(parent, "Darker background", par.extra_darker_background, 
            "<p>Make image background darker using a lightness mask.</p>" );
      this.extraDarkerHighlights_CheckBox = newCheckBox(parent, "Darker highlights", par.extra_darker_hightlights, 
            "<p>Make image highlights darker using a lightness mask.</p>" );
      this.extra_GC_CheckBox = newCheckBox(parent, "Gradient correction", par.extra_GC, 
            "<p>Do gradient correction to the image using ABE or GraXpert.</p>" );
      this.extraBandinReduction_CheckBox = newCheckBox(parent, "Banding reduction", par.extra_banding_reduction, 
            "<p>Run banding reduction on the image.</p>" );

      var extra_ET_tooltip = "<p>Run ExponentialTransform on image using a mask.</p>";
      this.extra_ET_CheckBox = newCheckBox(parent, "ExponentialTransform,", par.extra_ET, extra_ET_tooltip);
      this.extra_ET_order_edit = newNumericEdit(parent, 'Order', par.extra_ET_order, 0.1, 6, "Order value for ExponentialTransform.");
      this.extra_ET_adjust_label = newLabel(parent, "Adjust", "<p>Adjust type to be used with ExponentialTransform.</p>" +
                                                              "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                              adjust_type_toolTip);
      this.extra_ET_adjust_Combobox = newComboBox(parent, par.extra_ET_adjusttype, adjust_type_values, this.extra_ET_adjust_label.toolTip);

      this.extra_ET_Sizer = new HorizontalSizer;
      this.extra_ET_Sizer.spacing = 4;
      this.extra_ET_Sizer.add( this.extra_ET_CheckBox );
      this.extra_ET_Sizer.add( this.extra_ET_order_edit );
      this.extra_ET_Sizer.add( this.extra_ET_adjust_label );
      this.extra_ET_Sizer.add( this.extra_ET_adjust_Combobox );
      this.extra_ET_Sizer.toolTip = extra_ET_tooltip;
      this.extra_ET_Sizer.addStretch();

      var extra_HDRMLT_tooltip = "<p>Run HDRMultiscaleTransform on image using a mask.</p>" +
                                 "<p>Color option is used to select different methods to keep hue and saturation.</p> " + 
                                 "<ul>" +
                                 "<li>Option 'None' uses HDRMLT To lightness option.</li>" + 
                                 "<li>Option 'Preserve hue' uses HDRMLT preserve hue option.</li>" + 
                                 "<li>Option 'Color corrected' uses To Intensity instead of To lightness. It applies HSI transformation to the intensity component. " + 
                                 "In PixInsight 1.8.9-1 or older it uses a method described by Russell Croman</li>" + 
                                 "</ul>" +
                                 "<p>Layers selection specifies the layers value for HDRMLT.</p>";
      this.extra_HDRMLT_CheckBox = newCheckBox(parent, "HDRMultiscaleTransform", par.extra_HDRMLT, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Layers_Label = new Label( parent );
      this.extra_HDRMLT_Layers_Label.text = "Layers";
      this.extra_HDRMLT_Layers_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Layers_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_Layers_SpinBox = newSpinBox(parent, par.extra_HDRMLT_layers, 2, 10, extra_HDRMLT_tooltip);
      this.extra_HDRMLT_Overdrive_Edit = newNumericEditPrecision(parent, "Overdrive", par.extra_HDRMLT_overdrive, 0, 1, extra_HDRMLT_tooltip, 3);
      this.extra_HDRMLT_Iterations_Label = newLabel(parent, "Iterations", extra_HDRMLT_tooltip);
      this.extra_HDRMLT_Iterations_SpinBox = newSpinBox(parent, par.extra_HDRMLT_iterations, 1, 16, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Color_Label = new Label( parent );
      this.extra_HDRMLT_Color_Label.text = "Color";
      this.extra_HDRMLT_Color_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Color_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_color_ComboBox = newComboBox(parent, par.extra_HDRMLT_color, extra_HDRMLT_color_values, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Options_Sizer = new HorizontalSizer;
      this.extra_HDRMLT_Options_Sizer.spacing = 4;
      this.extra_HDRMLT_Options_Sizer.addSpacing(20);
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_SpinBox );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Iterations_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Iterations_SpinBox );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Overdrive_Edit );
      this.extra_HDRMLT_Options_Sizer.addStretch();

      this.extra_HDRMLT_Options_Sizer2 = new HorizontalSizer;
      this.extra_HDRMLT_Options_Sizer2.spacing = 4;
      this.extra_HDRMLT_Options_Sizer2.addSpacing(20);
      this.extra_HDRMLT_Options_Sizer2.add( this.extra_HDRMLT_Color_Label );
      this.extra_HDRMLT_Options_Sizer2.add( this.extra_HDRMLT_color_ComboBox );
      this.extra_HDRMLT_Options_Sizer2.addStretch();

      this.extra_HDRMLT_Sizer = new VerticalSizer;
      this.extra_HDRMLT_Sizer.spacing = 4;
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_CheckBox );
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_Options_Sizer );
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_Options_Sizer2 );
            
      var extra_LHE_tooltip = "<p>Run LocalHistogramEqualization on image using a mask.</p>";
      this.extra_LHE_CheckBox = newCheckBox(parent, "LocalHistogramEqualization,", par.extra_LHE, extra_LHE_tooltip);
      this.extra_LHE_kernelradius_edit = newNumericEdit(parent, 'Kernel Radius', par.extra_LHE_kernelradius, 16, 512, "<p>Kernel radius value for LocalHistogramEqualization.</p>");
      this.extra_LHE_contrastlimit_edit = newNumericEdit(parent, 'Contrast limit', par.extra_LHE_contrastlimit, 1, 64, 
                                                                  "<p>Contrast limit value for LocalHistogramEqualization.</p>" +
                                                                  "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      this.extra_LHE_adjust_label = newLabel(parent, "Adjust", "<p>Mask type to be used with LocalHistogramEqualization.</p>" +
                                                               "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                               adjust_type_toolTip +
                                                               "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      this.extra_LHE_adjust_Combobox = newComboBox(parent, par.extra_LHE_adjusttype, adjust_type_values, this.extra_LHE_adjust_label.toolTip);

      this.extra_LHE_sizer1 = new HorizontalSizer;
      this.extra_LHE_sizer1.spacing = 4;
      this.extra_LHE_sizer1.add( this.extra_LHE_CheckBox );
      this.extra_LHE_sizer1.add( this.extra_LHE_adjust_label );
      this.extra_LHE_sizer1.add( this.extra_LHE_adjust_Combobox );
      this.extra_LHE_sizer1.toolTip = extra_LHE_tooltip;
      this.extra_LHE_sizer1.addStretch();

      this.extra_LHE_sizer2 = new HorizontalSizer;
      this.extra_LHE_sizer2.spacing = 4;
      this.extra_LHE_sizer2.addSpacing(20);
      this.extra_LHE_sizer2.add( this.extra_LHE_kernelradius_edit );
      this.extra_LHE_sizer2.add( this.extra_LHE_contrastlimit_edit );
      this.extra_LHE_sizer2.toolTip = extra_LHE_tooltip;
      this.extra_LHE_sizer2.addStretch();

      this.extra_LHE_sizer = new VerticalSizer;
      this.extra_LHE_sizer.spacing = 4;
      this.extra_LHE_sizer.add( this.extra_LHE_sizer1 );
      this.extra_LHE_sizer.add( this.extra_LHE_sizer2 );
      this.extra_LHE_sizer.toolTip = extra_LHE_tooltip;
      this.extra_LHE_sizer.addStretch();

      this.extra_Contrast_CheckBox = newCheckBox(parent, "Add contrast", par.extra_contrast, 
            "<p>Run slight S shape curves transformation on image to add contrast.</p>" );
      this.contrastIterationsSpinBox = newSpinBox(parent, par.extra_contrast_iterations, 1, 5, "Number of iterations for contrast enhancement");
      this.contrastIterationsLabel = new Label( parent );
      this.contrastIterationsLabel.text = "iterations";
      this.contrastIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.contrastIterationsLabel.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.extraContrastSizer = new HorizontalSizer;
      this.extraContrastSizer.spacing = 4;
      this.extraContrastSizer.add( this.extra_Contrast_CheckBox );
      this.extraContrastSizer.add( this.contrastIterationsSpinBox );
      this.extraContrastSizer.add( this.contrastIterationsLabel );
      this.extraContrastSizer.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.extraContrastSizer.addStretch();

      var extraAutoContrastTooltip = "<p>Do automatic contrast enhancement. Works best with starless image.</p>";
      this.extraAutoContrastCheckBox = newCheckBox(parent, "Auto contrast,", par.extra_auto_contrast, extraAutoContrastTooltip);
      this.extraAutoContrastEditLow = newNumericEditPrecision(parent, 'low', par.extra_auto_contrast_limit_low, 0, 100, "Percentage of clipped low pixels.", 4);
      this.extraAutoContrastEditHigh = newNumericEditPrecision(parent, 'high', par.extra_auto_contrast_limit_high, 0, 100, "Percentage of preserved high pixels.", 4);
      this.extraAutoContrastChannelsCheckBox = newCheckBox(parent, "channels", par.extra_auto_contrast_channels, "Apply auto contrast separately for each channel.");
      this.extraAutoContrastSizer = new HorizontalSizer;
      this.extraAutoContrastSizer.spacing = 4;
      this.extraAutoContrastSizer.add( this.extraAutoContrastCheckBox );
      this.extraAutoContrastSizer.add( this.extraAutoContrastEditLow );
      this.extraAutoContrastSizer.add( this.extraAutoContrastEditHigh );
      this.extraAutoContrastSizer.add( this.extraAutoContrastChannelsCheckBox );
      this.extraAutoContrastSizer.toolTip = extraAutoContrastTooltip;
      this.extraAutoContrastSizer.addStretch();

      this.extra_stretch_CheckBox = newCheckBox(parent, "Auto stretch", par.extra_stretch, 
            "<p>Run automatic stretch on image. Can be helpful in some rare cases but it is most useful on testing stretching settings with Apply button.</p>" );
      this.extra_autostf_CheckBox = newCheckBox(parent, "AutoSTF", par.extra_autostf, 
            "<p>Run unlinked AutoSTF stretch on image. Can be helpful in balancing image.</p>" );

      this.extra_signature_CheckBox = newCheckBox(parent, "Signature", par.extra_signature, 
            "<p>Add signature to the image.</p>" );
      this.extra_signature_path_Edit = newTextEdit(parent, par.extra_signature_path, "Path to signature file.");
      this.extra_signature_path_Button = new ToolButton( parent );
      this.extra_signature_path_Button.icon = parent.scaledResource(":/icons/select-file.png");
      this.extra_signature_path_Button.toolTip = this.extra_signature_path_Edit.toolTip;
      this.extra_signature_path_Button.setScaledFixedSize( 20, 20 );
      var extra_signature_path_Edit = this.extra_signature_path_Edit;
      this.extra_signature_path_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            extra_signature_path_Edit.text = ofd.fileName;
            par.extra_signature_path.val = ofd.fileName;
            console.writeln("Signature file path: " + ofd.fileName);
      };
      this.extra_signature_scale_Label = newLabel(parent, "Scale", 
            "<p>Scale for signature image. Scale is the signature file height in percentages relative to main image. " +
            "For example scale 10 means that the signature file height will be 10% of the main image height. " +
            "Value zero means no scaling.</p>");
      this.extra_signature_scale_SpinBox = newSpinBox(parent, par.extra_signature_scale, 0, 100, this.extra_signature_scale_Label.toolTip);
      this.extra_signature_position_ComboBox = newComboBox(parent, par.extra_signature_position, signature_positions_values, "<p>Signature position.</p>");

      this.extra_force_new_mask_CheckBox = newCheckBox(parent, "New mask", par.extra_force_new_mask, 
            "<p>Do not use existing mask but create a new luminance or star mask when needed.</p>" );
      this.extra_range_mask_CheckBox = newCheckBox(parent, "range_mask", par.extra_range_mask, 
            "<p>Use a user created range mask. It is used as is, it is not for example inverted.</p>" +
            "<p>White selects, black protects.</p>" +
            "<p>Note that this option overwrites any adjust settings selected for an option.</p>");
      this.extra_auto_reset_CheckBox = newCheckBox(parent, "Auto reset", par.extra_auto_reset, 
            "<p>If using Apply button, uncheck options when they are applied.</p>" );

      var shadowclipTooltip = "<p>Run shadow clipping on image. Clip percentage tells how many shadow pixels are clipped.</p>";
      this.extra_shadowclip_CheckBox = newCheckBox(parent, "Clip shadows,", par.extra_shadowclipping, shadowclipTooltip);
      this.extra_shadowclipperc_edit = newNumericEditPrecision(parent, 'percent', par.extra_shadowclippingperc, 0, 100, shadowclipTooltip, 4);
      this.extra_shadowclip_Sizer = new HorizontalSizer;
      this.extra_shadowclip_Sizer.spacing = 4;
      this.extra_shadowclip_Sizer.add( this.extra_shadowclip_CheckBox );
      this.extra_shadowclip_Sizer.add( this.extra_shadowclipperc_edit );
      this.extra_shadowclip_Sizer.toolTip = shadowclipTooltip;
      this.extra_shadowclip_Sizer.addStretch();

      var extraEnhanceShadowsTooltip = "<p>Enhance shadows by using log function on each pixel.</p>";
      this.extraEnhanceShadowsCheckBox = newCheckBox(parent, "Enhance shadows", par.extra_shadow_enhance, extraEnhanceShadowsTooltip);
      this.extraEnhanceShadowsSizer = new HorizontalSizer;
      this.extraEnhanceShadowsSizer.spacing = 4;
      this.extraEnhanceShadowsSizer.add( this.extraEnhanceShadowsCheckBox );
      this.extraEnhanceShadowsSizer.toolTip = shadowclipTooltip;
      this.extraEnhanceShadowsSizer.addStretch();

      var extraEnhanceHighlightsTooltip = "<p>Enhance highlights by using exp function on each pixel.</p>";
      this.extraEnhanceHighlightsCheckBox = newCheckBox(parent, "Enhance highlights", par.extra_highlight_enhance, extraEnhanceHighlightsTooltip);
      this.extraEnhanceHighlightsSizer = new HorizontalSizer;
      this.extraEnhanceHighlightsSizer.spacing = 4;
      this.extraEnhanceHighlightsSizer.add( this.extraEnhanceHighlightsCheckBox );
      this.extraEnhanceHighlightsSizer.toolTip = shadowclipTooltip;
      this.extraEnhanceHighlightsSizer.addStretch();

      var extraGammaTooltip = "<p>Apply gamma correction to the image.</p>" +
                              "<p>Value below 1 will make image lighter. Value above 1 will make image darker.</p>";
      this.extraGammaCheckBox = newCheckBox(parent, "Gamma", par.extra_gamma, extraGammaTooltip);
      this.extraGammaEdit = newNumericEdit(parent, '', par.extra_gamma_value, 0, 2, extraGammaTooltip);
      this.extraGammaSizer = new HorizontalSizer;
      this.extraGammaSizer.spacing = 4;
      this.extraGammaSizer.add( this.extraGammaCheckBox );
      this.extraGammaSizer.add( this.extraGammaEdit );
      this.extraGammaSizer.toolTip = extraGammaTooltip;
      this.extraGammaSizer.addStretch();

      var smoothBackgroundTooltip = 
            "<p>Smoothen background below a given pixel value. Pixel value can be found for example " +
            "from the preview image using a mouse.</p>" +
            "<p>A limit value specifies below which the smoothing is done. " + 
            "The value should be selected so that no foreground data is lost.</p>" + 
            "<p>Smoothing sets a new relative value for pixels that are below the given limit value. " +
            "If factor is below 1, new pixel values will be higher than the old values. " +
            "If factor is above 1, new pixel values will be lower than the old values.</p>" +
            "<p>With a factor value below 1, smoothening can help gradient correction to clean up the background better in case of " + 
            "very uneven background.</p>" +
            "<p>With a factor value above 1, smoothening can make dark parts of the imake darker.</p>";

      this.extra_smoothBackground_CheckBox = newCheckBox(parent, "Smoothen background,", par.extra_smoothbackground, smoothBackgroundTooltip);
      this.extra_smoothBackgroundval_edit = newNumericEditPrecision(parent, 'value', par.extra_smoothbackgroundval, 0, 100, smoothBackgroundTooltip, 4);
      this.extra_smoothBackgroundfactor_edit = newNumericEditPrecision(parent, 'factor', par.extra_smoothbackgroundfactor, 0, 10, smoothBackgroundTooltip, 2);
      this.extra_smoothBackground_Sizer = new HorizontalSizer;
      this.extra_smoothBackground_Sizer.spacing = 4;
      this.extra_smoothBackground_Sizer.add( this.extra_smoothBackground_CheckBox );
      this.extra_smoothBackground_Sizer.add( this.extra_smoothBackgroundval_edit );
      this.extra_smoothBackground_Sizer.add( this.extra_smoothBackgroundfactor_edit );
      this.extra_smoothBackground_Sizer.toolTip = smoothBackgroundTooltip;
      this.extra_smoothBackground_Sizer.addStretch();

      this.extraNormalizeChannelsCheckBox = newCheckBox(parent, "Normalize channels,", par.extra_normalize_channels, 
                                                        "<p>Normalize black point and brightness on all channels based on a reference channel.<p>" +
                                                        "<p>Can be useful for example on narrowband images where Halpha data (typically on channel B) is much stronger than S or O.<p>" +
                                                        "<p>Normalization uses similar PixelMath expressions as Bill Blanshan in his <i>Narrowband Normalization using Pixnsight Pixelmath</i> " + 
                                                        "script. See more information in his YouTube channel AnotherAstroChannel.</p>");
      this.extraNormalizeChannelsReferenceLabel = newLabel(parent, "reference", "Reference channel for normalization." + this.extraNormalizeChannelsCheckBox.toolTip);
      this.extraNormalizeChannelsReferenceComboBox = newComboBox(parent, par.extra_normalize_channels_reference, normalize_channels_reference_values, this.extraNormalizeChannelsReferenceLabel.toolTip);
      this.extraNormalizeChannelsMaskCheckBox = newCheckBox(parent, "Mask", par.extra_normalize_channels_mask, 
                                                            "<p>Use a lightness mask when normalizing. It can help to avoid overstretching dark parts of the image.</p>" + 
                                                            this.extraNormalizeChannelsCheckBox.toolTip);
      this.extraNormalizeChannelsRescaleCheckBox = newCheckBox(parent, "Rescale", par.extra_normalize_channels_rescale, 
                                                            "<p>Rescales the image to [0, 1] during PixelMath operation. Can be useful if there is clipping in normalization.</p>" + 
                                                            this.extraNormalizeChannelsCheckBox.toolTip);

      this.extraNormalizeChannelsSizer = new HorizontalSizer;
      this.extraNormalizeChannelsSizer.spacing = 4;
      // this.extraNormalizeChannelsSizer.margin = 2;
      this.extraNormalizeChannelsSizer.add( this.extraNormalizeChannelsCheckBox );
      this.extraNormalizeChannelsSizer.add( this.extraNormalizeChannelsReferenceLabel );
      this.extraNormalizeChannelsSizer.add( this.extraNormalizeChannelsReferenceComboBox );
      this.extraNormalizeChannelsSizer.add( this.extraNormalizeChannelsMaskCheckBox );
      this.extraNormalizeChannelsSizer.add( this.extraNormalizeChannelsRescaleCheckBox );
      this.extraNormalizeChannelsSizer.addStretch();

      var extraAdjustChannelsToolTip = "<p>Adjust channels in PixelMath by multiplying them with a given value.</p>" + 
                                       "<p>If option Only K is checked then value R/K is used to adjust the whole image.</p>";

      this.extraAdjustChannelsCheckBox = newCheckBox(parent, "Adjust channels,", par.extra_adjust_channels, extraAdjustChannelsToolTip);
      this.extraAdjustChannelR = newNumericEdit(parent, "R/K", par.extra_adjust_R, 0, 100, extraAdjustChannelsToolTip);
      this.extraAdjustChannelG = newNumericEdit(parent, "G", par.extra_adjust_G, 0, 100, extraAdjustChannelsToolTip);
      this.extraAdjustChannelB = newNumericEdit(parent, "B", par.extra_adjust_B, 0, 100, extraAdjustChannelsToolTip);
      var extraAdjustChannelR = this.extraAdjustChannelR;
      var extraAdjustChannelG = this.extraAdjustChannelG;
      var extraAdjustChannelB = this.extraAdjustChannelB;

      this.extraAdjustChannelDefaultsButton = new ToolButton(parent);
      this.extraAdjustChannelDefaultsButton.icon = new Bitmap( ":/images/icons/reset.png" );
      this.extraAdjustChannelDefaultsButton.toolTip = 
            "<p>Reset channel adjust values to defaults.</p>";
      this.extraAdjustChannelDefaultsButton.onClick = function()
      {
            console.writeln("Reset channel adjust values to defaults.");
            par.extra_adjust_R.val = par.extra_adjust_R.def;
            par.extra_adjust_G.val = par.extra_adjust_G.def;
            par.extra_adjust_B.val = par.extra_adjust_B.def;
            extraAdjustChannelR.setValue(par.extra_adjust_R.val);
            extraAdjustChannelG.setValue(par.extra_adjust_G.val);
            extraAdjustChannelB.setValue(par.extra_adjust_B.val);
      };
      this.extraAdjustChannelsOnlyKCheckBox = newCheckBox(parent, "Only K", par.extra_adjust_channels_only_k, extraAdjustChannelsToolTip);

      this.extraAdjustChannelsSizer = new HorizontalSizer;
      this.extraAdjustChannelsSizer.spacing = 4;
      // this.extraAdjustChannelsSizer.margin = 2;
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelsCheckBox );
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelR );
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelG );
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelB );
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelsOnlyKCheckBox );
      this.extraAdjustChannelsSizer.add( this.extraAdjustChannelDefaultsButton );
      this.extraAdjustChannelsSizer.addStretch();

      this.extra_SmallerStars_CheckBox = newCheckBox(parent, "Smaller stars", par.extra_smaller_stars, 
            "<p>Make stars smaller on image.</p>" );
      this.smallerStarsIterationsSpinBox = newSpinBox(parent, par.extra_smaller_stars_iterations, 0, 10, 
            "Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection");
      this.smallerStarsIterationsLabel = new Label( parent );
      this.smallerStarsIterationsLabel.text = "iterations";
      this.smallerStarsIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.smallerStarsIterationsLabel.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.extraSmallerStarsSizer = new HorizontalSizer;
      this.extraSmallerStarsSizer.spacing = 4;
      this.extraSmallerStarsSizer.add( this.extra_SmallerStars_CheckBox );
      this.extraSmallerStarsSizer.add( this.smallerStarsIterationsSpinBox );
      this.extraSmallerStarsSizer.add( this.smallerStarsIterationsLabel );
      this.extraSmallerStarsSizer.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.extraSmallerStarsSizer.addStretch();

      var extra_noise_reduction_tooltip = "<p>Noise reduction on image.</p>" + noiseReductionToolTipCommon;
      this.extra_NoiseReduction_CheckBox = newCheckBox(parent, "Noise reduction", par.extra_noise_reduction, 
            extra_noise_reduction_tooltip);

      this.extraNoiseReductionStrengthComboBox = newComboBoxStrvalsToInt(parent, par.extra_noise_reduction_strength, noise_reduction_strength_values, extra_noise_reduction_tooltip);
      this.extraNoiseReductionStrengthLabel = new Label( parent );
      this.extraNoiseReductionStrengthLabel.text = "strength";
      this.extraNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraNoiseReductionStrengthLabel.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer = new HorizontalSizer;
      this.extraNoiseReductionStrengthSizer.spacing = 4;
      this.extraNoiseReductionStrengthSizer.add( this.extra_NoiseReduction_CheckBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthComboBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthLabel );
      this.extraNoiseReductionStrengthSizer.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer.addStretch();

      this.extra_ACDNR_CheckBox = newCheckBox(parent, "ACDNR noise reduction", par.extra_ACDNR, 
            "<p>Run ACDNR noise reduction on image using a lightness mask.</p><p>StdDev value is taken from noise reduction section.</p>" + ACDNR_StdDev_tooltip);
      this.extra_color_noise_CheckBox = newCheckBox(parent, "Color noise reduction", par.extra_color_noise, 
            "<p>Run color noise reduction on image.</p>" );
      this.extra_star_noise_reduction_CheckBox = newCheckBox(parent, "Star noise reduction", par.extra_star_noise_reduction, 
            "<p>Run star noise reduction on star image.</p>" );
      this.extra_color_calibration_CheckBox = newCheckBox(parent, "Color calibration", par.extra_color_calibration, 
            "<p>Run ColorCalibration on image.</p>" );
      this.extra_solve_image_CheckBox = newCheckBox(parent, "Solve image", par.extra_solve_image, 
            "<p>Solve image by running ImageSolver script.</p>" + 
            "<p>If image does not have correct coordinates or focal length embedded they can be given in Image solving section in the Processing tab.</p>");

      this.extra_solve_image_Button = new ToolButton( parent );
      this.extra_solve_image_Button.icon = parent.scaledResource(":/icons/select-file.png");
      this.extra_solve_image_Button.toolTip = "<p>Select file for copying astrometric solution to image.</p>";
      this.extra_solve_image_Button.setScaledFixedSize( 20, 20 );
      this.extra_solve_image_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            if (util.copyAstrometricSolutionFromFile(global.extra_target_image, ofd.fileName)) {
                  console.noteln("Astrometric solution copied from file: " + ofd.fileName);
            } else {
                  console.criticalln("Astrometric solution not copied from file: " + ofd.fileName);
            }
      };
      
      this.extra_annotate_image_CheckBox = newCheckBox(parent, "Annotate image", par.extra_annotate_image, 
            "<p>Use AnnotateImage script to annotate image.</p>" + 
            "<p>Note that image must have a correct astrometric solution embedded for annotate to work. " + 
            "When using SPCC color calibration astrometric solution is automatically added.</p>" +
            "<p>When used with the Run or AutoContinue button a new image with _Annotated postfix is created.</p>" );
      this.extra_annotate_scale_SpinBox = newSpinBox(parent, par.extra_annotate_image_scale, 1, 8, 
            "<p>Graphics scale for AnnotateImage script.</p>");

      var extra_sharpen_tooltip = "<p>Sharpening on image using a luminance mask.</p>" + 
                                  "<p>Number of iterations specifies how many times the sharpening is run.</p>" +
                                  "<p>If BlurXTerminator is used for sharpening then iterations parameter is ignored.</p>";
      this.extra_sharpen_CheckBox = newCheckBox(parent, "Sharpening", par.extra_sharpen, extra_sharpen_tooltip);

      this.extraSharpenIterationsSpinBox = newSpinBox(parent, par.extra_sharpen_iterations, 1, 10, extra_sharpen_tooltip);
      this.extraSharpenIterationsLabel = new Label( parent );
      this.extraSharpenIterationsLabel.text = "iterations";
      this.extraSharpenIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraSharpenIterationsLabel.toolTip = extra_sharpen_tooltip;
      this.extraSharpenIterationsSizer = new HorizontalSizer;
      this.extraSharpenIterationsSizer.spacing = 4;
      this.extraSharpenIterationsSizer.add( this.extra_sharpen_CheckBox );
      this.extraSharpenIterationsSizer.add( this.extraSharpenIterationsSpinBox );
      this.extraSharpenIterationsSizer.add( this.extraSharpenIterationsLabel );
      this.extraSharpenIterationsSizer.toolTip = extra_sharpen_tooltip;
      this.extraSharpenIterationsSizer.addStretch();

      var unsharpmask_tooltip = "Sharpen image using UnsharpMask and a luminance mask.";
      this.extra_unsharpmask_CheckBox = newCheckBox(parent, "UnsharpMask,", par.extra_unsharpmask, unsharpmask_tooltip);
      this.extraUnsharpMaskStdDevEdit = newNumericEdit(parent, "StdDev", par.extra_unsharpmask_stddev, 0.1, 250, unsharpmask_tooltip);
      this.extraUnsharpMaskAmountEdit = newNumericEdit(parent, "Amount", par.extra_unsharpmask_amount, 0.1, 1.00, unsharpmask_tooltip);
      this.extraUnsharpMaskSizer = new HorizontalSizer;
      this.extraUnsharpMaskSizer.spacing = 4;
      this.extraUnsharpMaskSizer.add( this.extra_unsharpmask_CheckBox );
      this.extraUnsharpMaskSizer.add( this.extraUnsharpMaskStdDevEdit );
      this.extraUnsharpMaskSizer.add( this.extraUnsharpMaskAmountEdit );
      this.extraUnsharpMaskSizer.addStretch();
      
      var extra_saturation_tooltip = "<p>Add saturation to the image using a luminance mask.</p>" + 
                                     "<p>Number of iterations specifies how many times add saturation is run.</p>";
      this.extra_saturation_CheckBox = newCheckBox(parent, "Saturation", par.extra_saturation, extra_saturation_tooltip);

      this.extraSaturationIterationsSpinBox = newSpinBox(parent, par.extra_saturation_iterations, 1, 20, extra_saturation_tooltip);
      this.extraSaturationIterationsLabel = new Label( parent );
      this.extraSaturationIterationsLabel.text = "iterations";
      this.extraSaturationIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraSaturationIterationsLabel.toolTip = extra_saturation_tooltip;
      this.extraSaturationIterationsSizer = new HorizontalSizer;
      this.extraSaturationIterationsSizer.spacing = 4;
      this.extraSaturationIterationsSizer.add( this.extra_saturation_CheckBox );
      this.extraSaturationIterationsSizer.add( this.extraSaturationIterationsSpinBox );
      this.extraSaturationIterationsSizer.add( this.extraSaturationIterationsLabel );
      this.extraSaturationIterationsSizer.toolTip = extra_saturation_tooltip;
      this.extraSaturationIterationsSizer.addStretch();

      var clarity_tooltip = "<p>Add clarity to the image using a luminance mask. Clarity is a local contrast enhancement.</p>" +
                            "<p>Clarity uses UnsharpMask process where stddev should be large and amount should be small.</p>" + 
                            "<p>If a mask is used then clarity is applied only to the light parts of the image.</p>";
      this.extra_clarity_CheckBox = newCheckBox(parent, "Clarity,", par.extra_clarity, clarity_tooltip);
      this.extraClarityStdDevEdit = newNumericEdit(parent, "StdDev", par.extra_clarity_stddev, 0.1, 250, clarity_tooltip);
      this.extraClarityAmountEdit = newNumericEdit(parent, "Amount", par.extra_clarity_amount, 0.1, 1.00, clarity_tooltip);
      this.extraClarityMaskCheckBox = newCheckBox(parent, "Mask", par.extra_clarity_mask, clarity_tooltip);
      this.extraClaritySizer = new HorizontalSizer;
      this.extraClaritySizer.spacing = 4;
      this.extraClaritySizer.add( this.extra_clarity_CheckBox );
      this.extraClaritySizer.add( this.extraClarityStdDevEdit );
      this.extraClaritySizer.add( this.extraClarityAmountEdit );
      this.extraClaritySizer.add( this.extraClarityMaskCheckBox );
      this.extraClaritySizer.addStretch();

      this.extraImageLabel = new Label( parent );
      this.extraImageLabel.text = "Target image";
      this.extraImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraImageLabel.toolTip = "<p>Target image for editing. By default edits are applied on a copy of target image. Copied " + 
            "is named as <target image>_edit.</p>" +
            "<p>Auto option is used when extra processing is done with Run or AutoContinue option.</p>";
      this.extraImageComboBox = new ComboBox( parent );
      this.extraImageComboBox.minItemCharWidth = 20;
      this.extraImageComboBox.onItemSelected = function( itemIndex )
      {
            if (global.extra_target_image == extra_target_image_window_list[itemIndex]) {
                  return;
            }
            close_undo_images();
            global.extra_target_image = extra_target_image_window_list[itemIndex];
            // console.writeln("global.extra_target_image " + global.extra_target_image);
            if (global.extra_target_image == "Auto") {
                  updatePreviewNoImage();
                  extra_gui_info.save_button.enabled = false;
            } else {
                  updatePreviewIdReset(global.extra_target_image, true);
                  extra_gui_info.save_button.enabled = true;
            }
      };
      extra_gui_info.images_combobox = this.extraImageComboBox;
      update_extra_target_image_window_list("Auto");
      global.extra_target_image = extra_target_image_window_list[0];

      var notetsaved_note = "<p>Note that edited image is not automatically saved to disk.</p>";
      this.extraApplyButton = new PushButton( parent );
      this.extraApplyButton.text = "Apply";
      this.extraApplyButton.toolTip = 
            "<p>Apply extra processing edits on the copy of the selected image. Auto option is used when extra processing is done with Run or AutoContinue option.</p>" +
            notetsaved_note;
      this.extraApplyButton.onClick = function()
      {
            if (!util.is_extra_option() && !util.is_narrowband_option()) {
                  console.criticalln("No extra processing option selected!");
            } else if (global.extra_target_image == null) {
                  console.criticalln("No image!");
            } else if (global.extra_target_image == "Auto") {
                  console.criticalln("Auto target image cannot be used with Apply button!");
            } else if (util.findWindow(global.extra_target_image) == null) {
                  console.criticalln("Could not find target image " + global.extra_target_image);
            } else {
                  if (extra_gui_info.undo_images.length == 0) {
                        global.extra_processing_info = [];   // First image, clear extra processing info
                        var saved_extra_target_image = global.extra_target_image;
                        if (!par.extra_apply_no_copy_image.val) {
                              // make copy of the original image
                              global.extra_target_image = copy_new_edit_image(global.extra_target_image);
                        }
                        var first_undo_image = create_undo_image(global.extra_target_image);
                        var first_undo_image_histogramInfo = current_histogramInfo;
                  } else {
                        var first_undo_image = null;
                  }
                  console.writeln("Apply extra processing edits on " + global.extra_target_image);
                  try {
                        engine.extraApply = true;
                        global.haveIconized = 0;

                        engine.extraProcessingEngine(parent.dialog, global.extra_target_image, util.is_narrowband_option());

                        if (extra_gui_info.undo_images.length == 0) {
                              // add first/original undo image
                              add_undo_image(first_undo_image, first_undo_image_histogramInfo);
                              // save copy of original image to the window list and make is current
                              update_extra_target_image_window_list(global.extra_target_image);
                        }
                        let undo_image = create_undo_image(global.extra_target_image);
                        add_undo_image(undo_image, current_histogramInfo);
                        console.noteln("Apply completed (" + extra_gui_info.undo_images.length + "/" + extra_gui_info.undo_images.length + ")");
                  } 
                  catch(err) {
                        if (first_undo_image != null) {
                              global.extra_target_image = saved_extra_target_image;
                        }
                        console.criticalln(err);
                        console.criticalln("Operation failed!");
                  }
                  engine.extraApply = false;
                  util.runGarbageCollection();
            }
      };   

      this.extraUndoButton = new ToolButton( parent );
      this.extraUndoButton.icon = new Bitmap( ":/icons/undo.png" );
      this.extraUndoButton.toolTip = 
            "<p>Undo last extra edit operation.</p>" + notetsaved_note;
      this.extraUndoButton.enabled = false;
      this.extraUndoButton.onClick = function()
      {
            apply_undo();
      };
      extra_gui_info.undo_button = this.extraUndoButton;

      this.extraRedoButton = new ToolButton( parent );
      this.extraRedoButton.icon = new Bitmap( ":/icons/redo.png" );
      this.extraRedoButton.toolTip = 
            "<p>Redo last extra edit operation.</p>" + notetsaved_note;
      this.extraRedoButton.enabled = false;
      this.extraRedoButton.onClick = function()
      {
            apply_redo();
      };
      extra_gui_info.redo_button = this.extraRedoButton;

      this.extraSaveButton = new ToolButton( parent );
      this.extraSaveButton.icon = new Bitmap( ":/icons/save-as.png" );
      this.extraSaveButton.toolTip = 
            "<p>Save current edited image to disk as a XISF image and as a 16-bit TIFF image.</p>" + notetsaved_note;
      this.extraSaveButton.enabled = false;
      this.extraSaveButton.onClick = function()
      {
            save_as_undo();
      };
      extra_gui_info.save_button = this.extraSaveButton;

      this.extraHistoryButton = new ToolButton( parent );
      this.extraHistoryButton.icon = new Bitmap( ":/history-explorer/history-explorer-window-icon.png" );
      this.extraHistoryButton.toolTip = "<p>Show extra processing history.</p>";
      this.extraHistoryButton.enabled = true;
      var extraHistoryButton = this.extraHistoryButton;
      this.extraHistoryButton.onClick = function()
      {
            if (extra_gui_info.undo_images.length <= 1) {
                  new MessageBox("No extra processing history", "Extra processing history", StdIcon_Information ).execute();
            } else {
                  var txt = "<p>Applied extra processing:</p><ul>";
                  for (var i = 1; i <= extra_gui_info.undo_images_pos; i++) {
                        for (var j = 0; j < extra_gui_info.undo_images[i].extra_processing_info.length; j++) {
                              txt += "<li>" + extra_gui_info.undo_images[i].extra_processing_info[j] + "</li>";
                        }
                  }
                  txt += "</ul>";
                  if (i < extra_gui_info.undo_images.length) {
                        txt += "<p><i>Not applied extra processing:</i></p><ul>";
                        for (; i < extra_gui_info.undo_images.length; i++) {
                              for (var j = 0; j < extra_gui_info.undo_images[i].extra_processing_info.length; j++) {
                                    txt += "<li><i>" + extra_gui_info.undo_images[i].extra_processing_info[j] + "</i></li>";
                              }
                        }
                        txt += "</ul>";
                  }
                  new MessageBox(txt, "Extra processing history", StdIcon_Information ).execute();
            }
      };
      this.metadataHistoryButton = new ToolButton(parent);
      this.metadataHistoryButton.icon = new Bitmap( ":/icons/document-edit.png" ); // :/toolbar/file-project-metadata.png
      this.metadataHistoryButton.toolTip = "<p>Print AutoIntegrate processing history information from image metadata to the Process Console.</p>";
      this.metadataHistoryButton.onClick = function()
      {
            var win = util.findWindow(global.extra_target_image);
            if (win == null) {
                  console.criticalln("No image");
                  return;
            }

            console.writeln("Image: " + win.mainView.id);
            var history = util.autointegrateProcessingHistory(win);
            if (history != null) {
                  console.noteln("AutoIntegrate processing history:");
                  for (var i = 0; i < history.AutoIntegrate.length; i++) {
                        console.writeln(history.AutoIntegrate[i][0] + " - " + history.AutoIntegrate[i][1]);
                  }
                  if (history.info.length > 0) {
                        console.noteln("Processing info:");
                        for (var i = 0; i < history.info.length; i++) {
                              console.writeln(" - "  + history.info[i][1]);
                        }
                  }
                  if (history.options.length > 0) {
                        console.noteln("Processing options:");
                        for (var i = 0; i < history.options.length; i++) {
                              console.writeln(" - "  + history.options[i][1]);
                        }
                  }
                  if (history.steps.length > 0) {
                        console.noteln("Processing steps:");
                        for (var i = 0; i < history.steps.length; i++) {
                              console.writeln(" - "  + history.steps[i][1]);
                        }
                  }
                  if (history.extra.length > 0) {
                        console.noteln("Extra processing info:");
                        for (var i = 0; i < history.extra.length; i++) {
                              console.writeln(" - "  + history.extra[i][1]);
                        }
                  }

            } else {
                  console.noteln("No AutoIntegrate processing history");
            }
      };

      var extraLabeltoolTip = 
            "<p>" +
            "In case of Run or AutoContinue " + 
            "extra processing options are always applied to a copy of the final image. " + 
            "A new image is created with _extra added to the name. " + 
            "For example if the final image is AutoLRGB then a new image AutoLRGB_extra is created. " + 
            "AutoContinue can be used to apply extra processing after the final image is created. " +
            "</p><p>" +
            "In case of Apply button extra processing is run directly on the selected image. " +
            "Apply button can be used to execute extra options one by one in custom order." +
            "</p><p>" +
            "Both extra processing options and narrowband processing options are applied to the image. If some of the " +
            "narrowband options are selected then image is assumed to be narrowband." +
            "</p><p>" +
            "If multiple extra processing options are selected they are executed in the order they are listed in the dialog." + 
            "</p>" +
            "<p>" +
            "Narrowband processing options are selected they are applied before extra processing options." +
            "</p>";

      this.extraHelpTips = new ToolButton( parent );
      this.extraHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      this.extraHelpTips.setScaledFixedSize( 20, 20 );
      this.extraHelpTips.toolTip = extraLabeltoolTip;
      var extraHelpTips = this.extraHelpTips;
      this.extraHelpTips.onClick = function()
      {
            new MessageBox(extraLabeltoolTip, "Extra processing", StdIcon_Information ).execute();
      }

      this.extraImageSizer = new HorizontalSizer;
      // this.extraImageSizer.margin = 6;
      this.extraImageSizer.spacing = 4;
      this.extraImageSizer.add( this.extraImageLabel );
      this.extraImageSizer.add( this.extraImageComboBox );
      this.extraImageSizer.add( this.extraApplyButton );
      this.extraImageSizer.add( this.extraUndoButton );
      this.extraImageSizer.add( this.extraRedoButton );
      this.extraImageSizer.add( this.extraHistoryButton );
      this.extraImageSizer.add( this.extraSaveButton );
      this.extraImageSizer.addStretch();
      this.extraImageSizer.add( this.metadataHistoryButton );
      this.extraImageSizer.add( this.extraHelpTips );

      this.extra_rotate_CheckBox = newCheckBox(parent, "Rotate", par.extra_rotate, 
            "<p>Rotate the image in clockwise direction.</p>" );
      this.extra_rotate_degrees_ComboBox = newComboBox(parent, par.extra_rotate_degrees, rotate_degrees_values, this.extra_rotate_CheckBox.toolTip);
      this.extra_image_no_copy_CheckBox = newCheckBox(parent, "No copy", par.extra_apply_no_copy_image, 
            "<p>Do not make a copy of the image for Apply.</p>" );

      this.extraImageOptionsSizer1 = new HorizontalSizer;
      this.extraImageOptionsSizer1.spacing = 4;
      this.extraImageOptionsSizer1.add( this.extra_rotate_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_rotate_degrees_ComboBox );
      this.extraImageOptionsSizer1.add( this.extra_color_calibration_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_image_no_copy_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_force_new_mask_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_range_mask_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_auto_reset_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_stretch_CheckBox );
      this.extraImageOptionsSizer1.add( this.extra_autostf_CheckBox );
      this.extraImageOptionsSizer1.addStretch();

      this.extraImageOptionsSizer2 = new HorizontalSizer;
      this.extraImageOptionsSizer2.spacing = 4;
      this.extraImageOptionsSizer2.add( this.extra_solve_image_CheckBox );
      this.extraImageOptionsSizer2.add( this.extra_solve_image_Button );
      this.extraImageOptionsSizer2.add( this.extra_annotate_image_CheckBox );
      this.extraImageOptionsSizer2.add( this.extra_annotate_scale_SpinBox );
      this.extraImageOptionsSizer2.add( this.extra_signature_CheckBox );
      this.extraImageOptionsSizer2.add( this.extra_signature_path_Edit );
      this.extraImageOptionsSizer2.add( this.extra_signature_path_Button );
      this.extraImageOptionsSizer2.add( this.extra_signature_scale_Label );
      this.extraImageOptionsSizer2.add( this.extra_signature_scale_SpinBox );
      this.extraImageOptionsSizer2.add( this.extra_signature_position_ComboBox );
      this.extraImageOptionsSizer2.addStretch();

      this.extraImageOptionsSizer = new VerticalSizer;
      this.extraImageOptionsSizer.margin = 6;
      this.extraImageOptionsSizer.spacing = 4;
      this.extraImageOptionsSizer.add( this.extraImageOptionsSizer1 );
      this.extraImageOptionsSizer.add( this.extraImageOptionsSizer2 );
      this.extraImageOptionsSizer.addStretch();

      this.extra1 = new VerticalSizer;
      this.extra1.margin = 6;
      this.extra1.spacing = 4;
      this.extra1.add( this.extraRemoveStars_Sizer );
      this.extra1.add( this.extraRGBHamapping_CheckBox );
      this.extra1.add( this.extra_smoothBackground_Sizer );
      this.extra1.add( this.extraBandinReduction_CheckBox );
      this.extra1.add( this.extra_GC_CheckBox );
      this.extra1.add( this.extra_shadowclip_Sizer );
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extraDarkerHighlights_CheckBox );
      this.extra1.add( this.extraEnhanceShadowsSizer );
      this.extra1.add( this.extraEnhanceHighlightsSizer );
      this.extra1.add( this.extraGammaSizer );
      this.extra1.add( this.extraNormalizeChannelsSizer );
      this.extra1.add( this.extraAdjustChannelsSizer );
      this.extra1.add( this.extra_ET_Sizer );
      this.extra1.add( this.extra_HDRMLT_Sizer );
      this.extra1.addStretch();

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extra_LHE_sizer );
      this.extra2.add( this.extraContrastSizer );
      this.extra2.add( this.extraAutoContrastSizer );
      this.extra2.add( this.extraNoiseReductionStrengthSizer );
      this.extra2.add( this.extra_ACDNR_CheckBox );
      this.extra2.add( this.extra_color_noise_CheckBox );
      this.extra2.add( this.extra_star_noise_reduction_CheckBox );
      this.extra2.add( this.extraUnsharpMaskSizer );
      this.extra2.add( this.extraSharpenIterationsSizer );
      this.extra2.add( this.extraSaturationIterationsSizer );
      this.extra2.add( this.extraClaritySizer );
      this.extra2.add( this.extraSmallerStarsSizer );
      this.extra2.add( this.extraCombineStars_Sizer );
      this.extra2.addStretch();

      this.extraGroupBoxSizer = new HorizontalSizer;
      //this.extraGroupBoxSizer.margin = 6;
      //this.extraGroupBoxSizer.spacing = 4;
      this.extraGroupBoxSizer.add( this.extra1 );
      this.extraGroupBoxSizer.add( this.extra2 );
      this.extraGroupBoxSizer.addStretch();

      this.extraImageControl = new Control( parent );
      this.extraImageControl.sizer = new VerticalSizer;
      this.extraImageControl.sizer.margin = 6;
      this.extraImageControl.sizer.spacing = 4;
      this.extraImageControl.sizer.add( this.extraImageSizer );
      this.extraImageControl.sizer.add( this.extraImageOptionsSizer );
      this.extraImageControl.sizer.addStretch();
      this.extraImageControl.visible = false;

      this.extraControl1 = new Control( parent );
      this.extraControl1.sizer = new VerticalSizer;
      this.extraControl1.sizer.margin = 6;
      this.extraControl1.sizer.spacing = 4;
      this.extraControl1.sizer.add( this.extraGroupBoxSizer );
      this.extraControl1.sizer.addStretch();
      this.extraControl1.visible = false;

      this.extraControl2 = new Control( parent );
      this.extraControl2.sizer = new VerticalSizer;
      this.extraControl2.sizer.margin = 6;
      this.extraControl2.sizer.spacing = 4;
      this.extraControl2.sizer.add( this.narrowbandExtraOptionsSizer );
      this.extraControl2.sizer.addStretch();
      this.extraControl2.visible = false;

      this.extraControl3 = new Control( parent );
      this.extraControl3.sizer = new VerticalSizer;
      this.extraControl3.sizer.margin = 6;
      this.extraControl3.sizer.spacing = 4;
      this.extraControl3.sizer.add( this.narrowbandColorized_sizer );
      this.extraControl3.sizer.addStretch();
      this.extraControl3.visible = false;

      this.getExtraGUIControls = function()
      {
            return [ this.extraImageControl, this.extraControl1, this.extraControl2, this.extraControl3 ];
      }
}

extraProcessingGUI.prototype = new Object;

function isbatchNarrowbandPaletteMode()
{
      return (par.custom_R_mapping.val == "All" && par.custom_G_mapping.val == "All" && par.custom_B_mapping.val == "All") ||
              par.use_narrowband_multiple_mappings.val;
}

function previewControlCleanup(control)
{
      control.zoomIn_Button.onClick = null;
      control.zoomOut_Button.onClick = null;
      control.zoom11_Button.onClick = null;
      control.zoomFit_Button.onClick = null;
      control.scrollbox.onHorizontalScrollPosUpdated = null;
      control.scrollbox.onVerticalScrollPosUpdated = null;
      control.forceRedraw = null;
      control.scrollbox.viewport.onMouseWheel = null;
      control.scrollbox.viewport.onClick = null;
      control.scrollbox.viewport.onMouseMove = null;
      control.scrollbox.viewport.onMouseRelease = null;
      control.scrollbox.viewport.onResize = null;
      control.scrollbox.viewport.onPaint = null;
      control.image = null;
      control.imgWin = null;
}

function previewCleanup(previewObj)
{
      previewControlCleanup(previewObj.control);
      previewObj.control = null;
      previewObj.infolabel = null;
      previewObj.statuslabel = null;
}

function variableCleanup()
{
      infoLabel = null;
      imageInfoLabel = null;
      windowPrefixHelpTips = null;
      closeAllPrefixButton = null;
      windowPrefixComboBox = null;
      outputDirEdit = null;
      tabPreviewControl = null;
      tabPreviewInfoLabel = null;
      sidePreviewControl = null;
      mainTabBox = null;
      sidePreviewInfoLabel = null;
}

function exitCleanup(dialog)
{
      console.writeln("exitCleanup");
      if (global.use_preview) {
            previewCleanup(dialog.tabPreviewObj);
            dialog.tabPreviewObj = null;
            previewCleanup(dialog.sidePreviewObj);
            dialog.sidePreviewObj = null;
      }
      variableCleanup();
      util.checkEvents();
}

// Create a table of known prefix names for toolTip
// Also update window prefix combo box list
function setWindowPrefixHelpTip(default_prefix)
{
      var prefix_list = "<table><tr><th>Col</th><th>Name</th><th>Icon count</th></tr>";
      if (ppar.prefixArray.length == 0) {
            prefix_list = prefix_list + "<tr><td></td><td><i>No prefixes</i></td><td></td></tr>";
      } else {
            for (var i = 0; i < ppar.prefixArray.length; i++) {
                  if (ppar.prefixArray[i] != null && ppar.prefixArray[i][1] != '-') {
                        prefix_list = prefix_list + "<tr><td>" + (ppar.prefixArray[i][0] + 1) + '</td><td>' + ppar.prefixArray[i][1] + '</td><td>' + ppar.prefixArray[i][2] + '</td></tr>';
                  }
            }
      }
      prefix_list = prefix_list + "</table>";
      windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p><p> " + prefix_list + "</p>";
      closeAllPrefixButton.toolTip = "<p>Close all windows that are created by this script using <b>all known prefixes</b> (which can be empty prefix).</p>" +
                                     "<p>Prefixes used to close windows are default empty prefix, prefix in the Window Prefix box and all saved window prefixes. " +
                                     "All saved prefix information is cleared after this operation.</p>" +
                                     "<p>To close windows with current prefix use Close all button.</p>" +
                                     windowPrefixHelpTips.toolTip;

      windowPrefixComboBox.clear();
      autoContinueWindowPrefixComboBox.clear();
      var pa = get_win_prefix_combobox_array(default_prefix);
      addArrayToComboBox(windowPrefixComboBox, pa);
      addArrayToComboBox(autoContinueWindowPrefixComboBox, pa);
      windowPrefixComboBox.editText = validateWindowPrefix(ppar.win_prefix);
      windowPrefixComboBox.currentItem = pa.indexOf(validateWindowPrefix(ppar.win_prefix));
}

function fix_win_prefix_array()
{
      var new_prefix_array = [];

      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] == null) {
                  continue;
            } else if (!Array.isArray(ppar.prefixArray[i])) {
                  // bug fix, mark as free
                  continue;
            } else if (ppar.prefixArray[i][1] != '-') {
                  new_prefix_array[new_prefix_array.length] = ppar.prefixArray[i];
            }
      }
      ppar.prefixArray = new_prefix_array;
}

function get_win_prefix_combobox_array(default_prefix)
{
      default_prefix = validateWindowPrefix(default_prefix);
      var name_array = [default_prefix];

      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] != null && ppar.prefixArray[i][1] != '-') {
                  var add_name = validateWindowPrefix(ppar.prefixArray[i][1]);
                  if (add_name != default_prefix) {
                        name_array[name_array.length] = add_name;
                  }
            }
      }
      return name_array;
}

// Find a prefix from the prefix array. Returns -1 if not
// found.
function findPrefixIndex(prefix)
{
      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i][1] == prefix) {
                  return i;
            }
      }
      return -1;
}

// Find a new free column position for a prefix. Prefix name '-'
// is used to mark a free position.
function findNewPrefixIndex(find_free_column)
{
      if (find_free_column) {
            /* First mark all reserved column positions. */
            var reserved_columns = [];
            for (var i = 0; i < ppar.prefixArray.length; i++) {
                  if (ppar.prefixArray[i][1] != '-') {
                        reserved_columns[ppar.prefixArray[i][0]] = true;
                  }
            }
            /* Then find first unused column position. */
            for (var i = 0; i < reserved_columns.length; i++) {
                  if (reserved_columns[i] != true) {
                        break;
                  }
            }
            var index = ppar.prefixArray.length;
            ppar.prefixArray[index] = [i, '-', 0];
            return index;
      } else {
            // Just return a new slot at the end of the array
            var index = ppar.prefixArray.length;
            ppar.prefixArray[index] = [0, '-', 0];
            return index;
      }
}

// Save persistent settings
function savePersistentSettings(from_exit)
{
      if (global.do_not_write_settings) {
            console.noteln("Do not save interface settings to persistent module settings.");
      } else {
            console.noteln("Save persistent settings");
            Settings.write (SETTINGSKEY + "/prefixName", DataType_String, ppar.win_prefix);
            Settings.write (SETTINGSKEY + "/prefixArray", DataType_String, JSON.stringify(ppar.prefixArray));
            if (par.use_manual_icon_column.val) {
                  Settings.write (SETTINGSKEY + "/global.columnCount", DataType_Int32, ppar.userColumnCount);
            }
            Settings.write (SETTINGSKEY + "/previewSettings", DataType_String, JSON.stringify(ppar.preview));
            Settings.write (SETTINGSKEY + "/useSingleColumn", DataType_Boolean, ppar.use_single_column);
            Settings.write (SETTINGSKEY + "/useMoreTabs", DataType_Boolean, ppar.use_more_tabs);
            Settings.write (SETTINGSKEY + "/filesInTab", DataType_Boolean, ppar.files_in_tab);
            Settings.write (SETTINGSKEY + "/showStartupImage", DataType_Boolean, ppar.show_startup_image);
            Settings.write (SETTINGSKEY + "/startupImageName", DataType_String, ppar.startup_image_name);
            Settings.write (SETTINGSKEY + "/savedVersion", DataType_String, global.autointegrate_version);
      }
      if (!from_exit) {
            setWindowPrefixHelpTip(ppar.win_prefix);
      }
}

function update_extra_target_image_window_list(current_item)
{
      var combobox = extra_gui_info.images_combobox;

      if (current_item == null) {
            // use item from dialog
            current_item = extra_target_image_window_list[combobox.currentItem];
      }

      extra_target_image_window_list = util.getWindowListReverse();
      extra_target_image_window_list.unshift("Auto");

      combobox.clear();
      for (var i = 0; i < extra_target_image_window_list.length; i++) {
            combobox.addItem( extra_target_image_window_list[i] );
      }

      // update dialog
      if (current_item)  {
            combobox.currentItem = extra_target_image_window_list.indexOf(current_item);
            if (!combobox.currentItem) {
                  combobox.currentItem = 0;
            }
            if (extra_target_image_window_list 
                && extra_target_image_window_list.length > 0
                && extra_target_image_window_list[combobox.currentItem]) 
            {
                  combobox.setItemText(combobox.currentItem, extra_target_image_window_list[combobox.currentItem]);
            }
      }
}

function forceNewHistogram(target_win)
{
      try {
            if (!target_win.mainView.deleteProperty("Histogram16")) {
                  console.writeln("Failed to delete property Histogram16");
            }
      } catch(err) {
            console.writeln("Failed to delete property Histogram16 : " + err);
      }
}

function update_undo_buttons()
{
      extra_gui_info.undo_button.enabled = extra_gui_info.undo_images.length > 0 && extra_gui_info.undo_images_pos > 0;
      extra_gui_info.redo_button.enabled = extra_gui_info.undo_images.length > 0 && extra_gui_info.undo_images_pos < extra_gui_info.undo_images.length - 1;
}

function copy_new_edit_image(id)
{
      var win = ImageWindow.windowById(id);
      var editcount = util.getKeywordValue(win, "AutoIntegrateEditCount");
      if (editcount == null) {
            editcount = 0;
            for (var x = 0; ; x++) {
                  if (x == 0) {
                        var copy_id = id + "_edit";
                  } else {
                        var copy_id = id +  "_" + x.toString() + "_edit";
                  }
                  if (util.findWindow(copy_id) == null
                      && util.findWindow(copy_id + "_starless") == null
                      && util.findWindow(copy_id + "_stars") == null) 
                  {
                        break;
                  }
                  // console.writeln(copy_id + " is use, retry");
            }
      } else {
            for (var x = 0; ; x++) {
                  editcount = parseInt(editcount);
                  if (editcount == 1) {
                        var endstr = "_edit";
                  } else {
                        var endstr = "_edit_" + editcount.toString();
                  }
                  console.writeln("id " + id +  " endstr " + endstr);
                  if (id.endsWith(endstr)) {
                        // Remove old edit count
                        var base_id = id.substring(0, id.length - endstr.length);
                  } else {
                        var base_id = id;
                  }
                  if (x == 0) {
                        var copy_id = base_id + "_edit_" + (editcount + 1).toString();
                  } else {
                        var copy_id = base_id +  "_" + x.toString() + "_edit_" + (editcount + 1).toString();
                  }
                  console.writeln("base_id " + base_id + " copy_id " + copy_id);
                  if (util.findWindow(copy_id) == null
                      && util.findWindow(copy_id + "_starless") == null
                      && util.findWindow(copy_id + "_stars") == null) 
                  {
                        break;
                  }
                  // console.writeln(copy_id + " in use, retry");
            }
      }
      var copy_win = util.copyWindowEx(win, copy_id, true);
      console.writeln("Copy image " + copy_win.mainView.id);
      util.setFITSKeyword(
            copy_win, 
            "AutoIntegrateEditCount", 
            (editcount + 1).toString(), 
            "AutoIntegrate image edit count");
      return copy_win.mainView.id;
}

function print_extra_processing_info(txt, info)
{
      if (txt) {
            console.noteln(txt);
      }
      if (info.length == 0) {
            console.writeln("- No extra processing");
      } else {
            for (var i = 0; i < info.length; i++) {
                  console.writeln("- " + info[i]);
            }
      }
}

function create_undo_image(id)
{
      var undo_win = ImageWindow.windowById(id);
      return { image: new Image( undo_win.mainView.image ), keywords: util.copyKeywords(undo_win) };
}

function add_undo_image(undo_image, histogramInfo)
{
      //console.writeln("add_undo_image");
      while (extra_gui_info.undo_images.length > extra_gui_info.undo_images_pos + 1) {
            extra_gui_info.undo_images.pop();
            console.writeln("Remove undo image " + extra_gui_info.undo_images.length);
      }
      extra_gui_info.undo_images_pos++;
      // console.writeln("undo_images_pos " + extra_gui_info.undo_images_pos);
      extra_gui_info.undo_images[extra_gui_info.undo_images_pos] = 
            { 
                  image: undo_image.image, 
                  keywords: undo_image.keywords,
                  histogramInfo: histogramInfo, 
                  extra_processing_info: global.extra_processing_info.concat() 
            };

      update_undo_buttons();

      print_extra_processing_info("Applied extra processing:", global.extra_processing_info);
}

function apply_undo()
{
       console.writeln("apply_undo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (extra_gui_info.undo_images_pos <= 0) {
            console.noteln("Nothing to undo");
            return;
      }
      console.noteln("Undo on image " + global.extra_target_image + " (" + extra_gui_info.undo_images_pos + "/" + extra_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(global.extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.extra_target_image);
            return;
      }
      let undo_pos = extra_gui_info.undo_images_pos - 1;
      let source_image = extra_gui_info.undo_images[undo_pos].image;
      let source_keywords = extra_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = extra_gui_info.undo_images[undo_pos].histogramInfo;
      let source_extra_processing_info = extra_gui_info.undo_images[undo_pos].extra_processing_info;

      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      print_extra_processing_info("Undo extra processing:", global.extra_processing_info);

      target_win.keywords = source_keywords;
      global.extra_processing_info = source_extra_processing_info;

      updatePreviewIdReset(global.extra_target_image, true, source_histogramInfo);
      
      extra_gui_info.undo_images_pos--;
       console.writeln("undo_images_pos " + extra_gui_info.undo_images_pos);
      update_undo_buttons();
}

function apply_redo()
{
       console.writeln("apply_redo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (extra_gui_info.undo_images_pos >= extra_gui_info.undo_images.length - 1) {
            console.noteln("Nothing to redo");
            return;
      }
      console.noteln("Redo on image " + global.extra_target_image + " (" + (extra_gui_info.undo_images_pos + 2) + "/" + extra_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(global.extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.extra_target_image);
            return;
      }
      let undo_pos = extra_gui_info.undo_images_pos + 1;
      let source_image = extra_gui_info.undo_images[undo_pos].image;
      let source_keywords = extra_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = extra_gui_info.undo_images[undo_pos].histogramInfo;
      let source_extra_processing_info = extra_gui_info.undo_images[undo_pos].extra_processing_info;

      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      target_win.keywords = source_keywords;
      global.extra_processing_info = source_extra_processing_info;
      
      updatePreviewIdReset(global.extra_target_image, true, source_histogramInfo);
      
      extra_gui_info.undo_images_pos++;
       console.writeln("undo_images_pos " + extra_gui_info.undo_images_pos);
      update_undo_buttons();

      print_extra_processing_info("Redo extra processing:", global.extra_processing_info);
}

function save_as_undo()
{
      //console.writeln("save_as_undo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }

      let saveFileDialog = new SaveFileDialog();
      saveFileDialog.caption = "Save As XISF and TIFF";
      if (global.outputRootDir == "") {
            var path = ppar.lastDir;
      } else {
            var path = global.outputRootDir;
      }
      if (path != "") {
            path = util.ensurePathEndSlash(path);
      }

      saveFileDialog.initialPath = path + global.extra_target_image + ".xisf";
      if (!saveFileDialog.execute()) {
            console.noteln("Image " + global.extra_target_image + " not saved");
            return;
      }
      var save_dir = File.extractDrive(saveFileDialog.fileName) + File.extractDirectory(saveFileDialog.fileName);
      var save_id = File.extractName(saveFileDialog.fileName);
      var save_win = ImageWindow.windowById(global.extra_target_image);

      /* Save as 16 bit TIFF.
       */
      var copy_win = util.copyWindow(save_win, util.ensure_win_prefix(save_win.mainView.id + "_savetmp"));
      if (copy_win.bitsPerSample != 16) {
            console.writeln("saveFinalImageWindow:set bits to 16");
            copy_win.setSampleFormat(16, false);
      }
      var filename = util.ensurePathEndSlash(save_dir) + save_id + ".tif";
      console.noteln("Save " + global.extra_target_image + " as " + filename);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(filename, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + filename);
      }
      util.forceCloseOneWindow(copy_win);

      /* Save as XISF.
       */
      var copy_win = util.copyWindow(save_win, util.ensure_win_prefix(save_win.mainView.id + "_savetmp"));
      var filename = util.ensurePathEndSlash(save_dir) + save_id + ".xisf";
      console.noteln("Save " + global.extra_target_image + " as " + filename);
      // Save image. No format options, no warning messages,
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(filename, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + filename);
      }
      util.forceCloseOneWindow(copy_win);

      util.saveLastDir(save_dir);
      update_undo_buttons();

      if (save_id != global.extra_target_image) {
            // Rename old image
            save_win.mainView.id = save_id;
            // Update preview name
            updatePreviewTxt(save_win);
            // Update target list
            update_extra_target_image_window_list(save_id);
      }
}

function close_undo_images()
{
      if (extra_gui_info.undo_images.length > 0) {
            console.writeln("Close undo images");
            extra_gui_info.undo_images = [];
            extra_gui_info.undo_images_pos = -1;
            update_undo_buttons();
      }
}

/***************************************************************************
 * 
 *    Dialog functions are below this point
 * 
 */
 function newCheckBoxEx( parent, checkboxText, param, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.text = checkboxText;
       cb.aiParam = param;
       try {
            cb.checked = cb.aiParam.val;
      } catch(err) {    
            console.criticalln("newCheckBoxEx: " + err);
            console.criticalln("Text: " + param.name);
            console.criticalln("Parameter name: " + checkboxText);
            console.criticalln("Parameter type: " + param.type);
            console.criticalln("Parameter value: " + param.val);
            console.criticalln("CheckBox value not set");
      }
       if (onClick != null) {
             cb.onClick = onClick;
       } else {
             cb.onClick = function(checked) { 
                  cb.aiParam.val = checked;
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) {
             cb.toolTip = util.formatToolTip(toolTip);
       }
 
       cb.aiParam.reset = function() {
             cb.checked = cb.aiParam.val;
       };
 
       return cb;
 }
 
 function newCheckBox( parent, checkboxText, param, toolTip )
 {
       return newCheckBoxEx(parent, checkboxText, param, toolTip, null);
 }
 function newGenericCheckBox( parent, checkboxText, param, val, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.aiParam = param;
       cb.text = checkboxText;
       cb.checked = val;
       cb.onClick = onClick;
       cb.toolTip = util.formatToolTip(toolTip);
 
       return cb;
 }
 
function newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = util.formatToolTip(toolTip);
      }

      return gb;
}

function Autorun(parent)
{
      console.writeln("AutoRun");
      var stopped = true;
      var first_step = true;
      var savedOutputRootDir = global.outputRootDir;
      var batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
      var batch_files = [];
      var substack_mode = par.substack_mode.val;
      var substack_files = [];
      var substack_size = global.lightFileNames ? global.lightFileNames.length / par.substack_count.val : 0;
      var substack_saved_lightFileNames = global.lightFileNames;
      var saved_integrate_only = par.integrate_only.val;

      if (substack_mode) {
            console.writeln("AutoRun substack size " + substack_size);
            for (var i = 0; i < global.lightFileNames.length; i += substack_size) {
                  substack_files[substack_files.length] = global.lightFileNames.slice(i, i + substack_size);
            }
            par.integrate_only.val = true;
      }
      global.substack_number = 0;

      if (par.batch_mode.val) {
            stopped = false;
            // Ask files before processing
            console.writeln("AutoRun in batch mode");
            for (var i = 0; ; i++) {
                  console.writeln("File names for batch " + (i + 1));
                  console.noteln("Click Cancel when all files are selected.");
                  var caption = "Select files for batch " + (i + 1) + ", Cancel ends the batch files";
                  if (par.open_directory.val) {
                        var lights = engine.openDirectoryFiles(caption, par.directory_files.val, true, true);
                  } else {
                        var lights = engine.openImageFiles(caption, true, false, true);
                  }
                  if (lights == null || lights.length == 0) {
                        break;
                  }
                  batch_files[batch_files.length] = lights;
            }
            if (batch_files.length == 0) {
                  console.writeln("No files selected for a batch. Stopped.");
                  return;
            }
            var txt = "Batch processing " + batch_files.length + " panels. Do you want to proceed?";
            var response = new MessageBox(txt, "AutoIntegrate", StdIcon_Question, StdButton_Yes, StdButton_No ).execute();
            if (response != StdButton_Yes) {
                  console.writeln("Batch processing not started.");
                  return;
            }
            global.lightFileNames = null; // Use files given here
      } else {
            console.writeln("AutoRun in normal mode");
      }
      do {  
            if (global.lightFileNames == null) {
                  if (par.batch_mode.val) {
                        global.lightFileNames = batch_files.shift();
                  } else if (par.open_directory.val) {
                        global.lightFileNames = engine.openDirectoryFiles("Lights", par.directory_files.val, true, false);
                  } else {
                        global.lightFileNames = engine.openImageFiles("Lights", true, false, false);
                  }
                  if (global.lightFileNames != null) {
                        parent.dialog.treeBox[global.pages.LIGHTS].clear();
                        addFilesToTreeBox(parent.dialog, global.pages.LIGHTS, global.lightFileNames);
                        updateInfoLabel(parent.dialog);
                  }
            }
            if (substack_mode) {
                  console.writeln("Get next substack");
                  if (substack_files.length == 0) {
                        console.writeln("AutoRun substack completed");
                        break;
                  }
                  global.lightFileNames = substack_files.shift();
                  console.writeln("AutoRun substack length " + global.lightFileNames.length + " files.");
                  if (global.lightFileNames == null || global.lightFileNames.length == 0) {
                        console.writeln("AutoRun substack completed");
                        break;
                  } else {
                        stopped = false;
                  }
            }  
            if (global.lightFileNames != null) {
                  if (batch_narrowband_palette_mode) {
                        var filteredFiles = engine.getFilterFiles(global.lightFileNames, global.pages.LIGHTS, '');
                        if (!filteredFiles.narrowband) {
                              batch_narrowband_palette_mode = false;
                        }
                  }
                  if (first_step) {
                        if (substack_mode) {
                              global.substack_number = 1;
                              console.writeln("AutoRun in substack mode, substack " + global.substack_number);
                        } else if (par.batch_mode.val) {
                              console.writeln("AutoRun in batch mode");
                        } else if (batch_narrowband_palette_mode) {
                              console.writeln("AutoRun in narrowband palette batch mode");
                        } else {
                              console.writeln("AutoRun");
                        }
                        first_step = false;
                  } else {
                        global.user_selected_reference_image = [];
                        if (substack_mode) {
                              global.substack_number++;
                              console.writeln("AutoRun in substack mode, substack " + global.substack_number);
                        }
                  }
                  engine.flowchartReset();
                  if (par.run_get_flowchart_data.val) {
                        if (substack_mode) {
                              console.writeln("Do not get flowchart data for substack mode");
                        } else if (batch_narrowband_palette_mode || par.batch_mode.val) {
                              console.writeln("Do not get flowchart data for batch mode");
                        } else {
                              generateNewFlowchartData(parent);
                        }
                  }
                  try {
                        if (batch_narrowband_palette_mode) {
                            engine.autointegrateNarrowbandPaletteBatch(parent.dialog, false);
                        } else {
                            engine.autointegrateProcessingEngine(parent.dialog, false, false, "AutoRun");
                        }
                        update_extra_target_image_window_list(null);
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        engine.writeProcessingStepsAndEndLog(null, false, null, true);
                        global.is_processing = global.processing_state.none;
                        stopped = true;
                  }
                  if (par.batch_mode.val) {
                        global.outputRootDir = savedOutputRootDir;
                        global.lightFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        engine.closeAllWindows(par.keep_integrated_images.val, true);
                  }
                  if (substack_mode) {
                        console.writeln("AutoRun in substack mode, close windows");
                        engine.closeAllWindows(par.keep_integrated_images.val, true);
                        console.writeln("AutoRun in substack mode, continue to next substack.");
                  }
            } else {
                  stopped = true;
            }
            if (global.cancel_processing) {
                  stopped = true;
                  console.writeln("Processing cancelled!");
            }
      } while (!stopped);

      global.outputRootDir = savedOutputRootDir;
      par.integrate_only.val = saved_integrate_only;
      global.lightFileNames = substack_saved_lightFileNames;
      global.substack_number = 0;
}

function newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function newLabel(parent, text, tip, align_left)
{
      var lbl = new Label( parent );
      lbl.text = text;
      if (align_left) {
            lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      } else {
            lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      }
      if (tip != null) {
            lbl.toolTip = util.formatToolTip(tip);
      }

      return lbl;
}

function newTextEdit(parent, param, tooltip)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.text = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.text = edt.aiParam.val;
      };
      return edt;
}

function newGenericTextEdit(parent, param, val, tooltip, onTextUpdated)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = onTextUpdated;
      edt.text = val;
      edt.toolTip = util.formatToolTip(tooltip);
      return edt;
}

function newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
      };
      edt.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      return newHorizontalSizer(0, true, [edt]);
}

function newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

function newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

function newNumericControlEx(parent, txt, param, prec, min, max, tooltip, updatedCallback)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.setRange(min, max);
      if (prec == 3) {
            edt.setPrecision(3);
            edt.slider.setRange(0.0, 1000.0);
      } else {
            edt.setPrecision(2);
            edt.slider.setRange(0.0, 100.0);
      }
      edt.aiParam = param;
      edt.setValue(edt.aiParam.val);
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value;
            // console.writeln("NumericControl " + txt + " " + value);
            if (updatedCallback != null) {
                  // console.writeln("NumericControl " + txt + " callback");
                  updatedCallback();
            }
      };
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      return edt;
}

function newNumericControl2(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 2, min, max, tooltip, updatedCallback)
}

function newNumericControl3(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 3, min, max, tooltip, updatedCallback)
}

function newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = function( value )
      {
            edt.aiParam.val = value;
      };

      edt.aiParam.reset = function() {
            edt.value = edt.aiParam.val;
      };

      return edt;
}

function newGenericSpinBox(parent, param, val, min, max, tooltip, onValueUpdated)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = onValueUpdated;

      return edt;
}

function addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

function newComboBox(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      addArrayToComboBox(cb, valarray);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      cb.currentItem = valarray.indexOf(cb.aiParam.val);
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = cb.aiValarray[itemIndex];
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val);
      }
      
      return cb;
}

function newComboBoxIndex(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = cb.aiParam.val;
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = itemIndex;
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiParam.val;
      }
      
      return cb;
}

function newComboBoxStrvalsToInt(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = valarray.indexOf(cb.aiParam.val.toString());
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = parseInt(cb.aiValarray[itemIndex]);
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val.toString());
      }
      
      return cb;
}

function newComboBoxpalette(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.enabled = true;
      cb.editEnabled = true;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.toolTip = util.formatToolTip(tooltip);
      cb.onEditTextUpdated = function() { 
            cb.aiParam.val = cb.editText.trim(); 
      };
      cb.aiParam.reset = function() {
            cb.editText = cb.aiParam.val;
      }
      return cb;
}

function filesOptionsSizer(parent, name, toolTip)
{
      var label = newSectionLabel(parent, name);
      parent.rootingArr.push(label);
      label.toolTip = util.formatToolTip(toolTip);
      var labelempty = new Label( parent );
      labelempty.text = " ";
      parent.rootingArr.push(labelempty);

      var sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;

      sizer.add( label );
      sizer.add( labelempty );

      return sizer;
}

function showOrHideFilterSectionBar(pageIndex)
{
      switch (pageIndex) {
            case global.pages.LIGHTS:
                  var show = par.lights_add_manually.val || par.skip_autodetect_filter.val;
                  break;
            case global.pages.FLATS:
                  var show = par.flats_add_manually.val || par.skip_autodetect_filter.val;
                  break;
            default:
                  util.throwFatalError("showOrHideFilterSectionBar bad pageIndex " + pageIndex);
      }
      if (show) {
            filterSectionbars[pageIndex].show();
            filterSectionbarcontrols[pageIndex].visible = true;
      } else {
            filterSectionbars[pageIndex].hide();
            filterSectionbarcontrols[pageIndex].visible = false;
      }
}

function lightsOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add light images", parent.filesToolTip[global.pages.LIGHTS]);

      var debayerLabel = new Label( parent );
      parent.rootingArr.push(debayerLabel);
      debayerLabel.text = "Debayer";
      debayerLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      debayerLabel.toolTip = "<p>Select bayer pattern for debayering color/OSC/RAW/DSLR files.</p>" +
                      "<p>Auto option tries to recognize debayer pattern from image metadata.</p>" +
                      "<p>If images are already debayered choose none which does not do debayering.</p>";

      var debayerCombobox = newComboBox(parent, par.debayer_pattern, global.debayerPattern_values, debayerLabel.toolTip);
      parent.rootingArr.push(debayerCombobox);

      var extractChannelsLabel = new Label( parent );
      parent.rootingArr.push(extractChannelsLabel);
      extractChannelsLabel.text = "Extract channels";
      extractChannelsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      extractChannelsLabel.toolTip = 
            "<p>Extract channels from color/OSC/RAW/DSLR files.</p>" +
            "<p>Channel extraction is done right after debayering. After channels are extracted " + 
            "processing continues as mono processing with separate filter files.</p>" +
            "<p>Option LRGB extract lightness channels as L and color channels as separate R, G and B files.</p>" +
            "<p>Option HOS extract channels as RGB=HOS and option HSO extract channels RGB=HSO. " + 
            "Resulting channels can then be mixed as needed using PixMath expressions in color " + 
            "palette section.</p>" +
            "<p>Channel files have a channel name (_L, _R, etc.) at the end of the file name. Script " + 
            "can then automatically recognize files as filter files.</p>"
            ;

      var extractChannelsCombobox = newComboBox(parent, par.extract_channel_mapping, extract_channel_mapping_values, extractChannelsLabel.toolTip);
      parent.rootingArr.push(extractChannelsCombobox);

      var add_manually_checkbox = newCheckBox(parent, "Add manually", par.lights_add_manually, 
            "<p>Add light files manually by selecting files for each filter.</p>" );
      parent.rootingArr.push(add_manually_checkbox);
      add_manually_checkbox.onClick = function(checked) { 
            add_manually_checkbox.aiParam.val = checked; 
            showOrHideFilterSectionBar(global.pages.LIGHTS);
      }
      var interated_lights_checkbox = newCheckBox(parent, "Integrated lights", par.integrated_lights, 
            "<p>If checked consider light files to be integrated files for AutoContinue.</p>" +
            "<p>It is useful for example when using integrated lights from WBPP as there is no need to rename images.</p>");
      parent.rootingArr.push(interated_lights_checkbox);

      var monochrome_image_CheckBox = newCheckBoxEx(parent, "Force monochrome", par.monochrome_image, 
            "<p>Force create of a monochrome image. All images are treated as Luminance files and stacked together. " + 
            "Quite a few processing steps are skipped with this option.</p>",
            function(checked) { 
                  monochrome_image_CheckBox.aiParam.val = checked;
                  updateSectionsInTreeBox(parent.treeBox[global.pages.LIGHTS]);
      });
      parent.rootingArr.push(monochrome_image_CheckBox);

      sizer.add(debayerLabel);
      sizer.add(debayerCombobox);
      sizer.add(extractChannelsLabel);
      sizer.add(extractChannelsCombobox);
      sizer.add(monochrome_image_CheckBox);
      sizer.add(add_manually_checkbox);
      sizer.add(interated_lights_checkbox);
      sizer.addStretch();

      return sizer;
}

function biasOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add bias images", parent.filesToolTip[global.pages.BIAS]);

      var checkbox = newCheckBox(parent, "SuperBias", par.create_superbias, 
            "<p>Create SuperBias from bias files.</p>" );
      var checkbox2 = newCheckBox(parent, "Master files", par.bias_master_files, 
            "<p>Files are master files.</p>" );

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.addStretch();

      return sizer;
}

function darksOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add dark images", parent.filesToolTip[global.pages.DARKS]);

      var checkbox = newCheckBox(parent, "Pre-calibrate", par.pre_calibrate_darks, 
            "<p>If checked darks are pre-calibrated with bias and not during ImageCalibration. " + 
            "Normally this is not recommended and it is better to calibrate darks during " + 
            "ImageCalibration.</p>" );
      var checkbox2 = newCheckBox(parent, "Optimize", par.optimize_darks, 
            "<p>If checked darks are optimized when calibrating lights." + 
            "</p><p>" +
            "Normally using optimize flag should not cause any problems. " +
            "With cameras without temperature control it can greatly improve the results. " +
            'With cameras that have "amplifier glow" dark optimization may give worse results. ' +
            "</p><p>" +
            "When Optimize is not checked bias frames are ignored and dark and flat file optimize " + 
            "and calibrate flags are disabled in light file calibration. " +
            "</p>" );
      var checkbox3 = newCheckBox(parent, "Master files", par.dark_master_files, 
            "<p>Files are master files.</p>" );

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.add(checkbox3);
      sizer.addStretch();

      return sizer;
}

function flatsOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add flat images", parent.filesToolTip[global.pages.FLATS]);

      var checkboxStars = newCheckBox(parent, "Stars in flats", par.stars_in_flats, 
            "<p>If you have stars in your flats then checking this option will lower percentile " + 
            "clip values and should help remove the stars.</p>" );
      parent.rootingArr.push(checkboxStars);
      var checkboxDarks = newCheckBox(parent, "Do not use darks", par.no_darks_on_flat_calibrate, 
            "<p>For some sensors darks should not be used to calibrate flats.  " + 
            "An example of such sensor is most CMOS sensors.</p>"  +
            "<p>If flat darks are selected then darks are not used " + 
            "to calibrate flats.</p>");
      parent.rootingArr.push(checkboxDarks);
      var checkboxManual = newCheckBox(parent, "Add manually", par.flats_add_manually, 
            "<p>Add flat files manually by selecting files for each filter.</p>" );
      parent.rootingArr.push(checkboxManual);
      checkboxManual.onClick = function(checked) {
            checkboxManual.aiParam.val = checked;
            showOrHideFilterSectionBar(global.pages.FLATS);
      }

      sizer.add(checkboxStars);
      sizer.add(checkboxDarks);
      sizer.add(checkboxManual);
      sizer.addStretch();

      return sizer;
}

function flatdarksOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add flat dark images", parent.filesToolTip[global.pages.FLAT_DARKS]);

      var checkbox = newCheckBox(parent, "Master files", par.flat_dark_master_files, 
            "<p>Files are master files.</p>" );
      parent.rootingArr.push(checkbox);

      sizer.add(checkbox);
      sizer.addStretch();
      
      return sizer;
}

function updatePreviewImage(updPreviewControl, imgWin, txt, histogramControl, histogramInfo)
{
      if (updPreviewControl == null) {
            return;
      }
      if ((is_some_preview && global.is_processing == global.processing_state.none) || preview_keep_zoom) {
            updPreviewControl.UpdateImage(imgWin.mainView.image, txt);
      } else {
            updPreviewControl.SetImage(imgWin.mainView.image, txt);
      }
      if (histogramControl != null && histogramInfo != null) {
            histogramControl.aiInfo = histogramInfo;
            histogramControl.repaint();
      }
}

function updatePreviewTxt(txt)
{
      txt = "Preview: " + txt;
      if (tabPreviewInfoLabel != null) {
            tabPreviewInfoLabel.text = txt;
      }
      if (sidePreviewInfoLabel != null) {
            sidePreviewInfoLabel.text = txt;
      }
      console.writeln(txt);
}

function setHistogramBitmapBackground(graphics, side_preview)
{
      if (side_preview) {
            var width = ppar.preview.side_preview_width;
            var height = ppar.preview.side_histogram_height;
      } else {
            var width = ppar.preview.preview_width;
            var height = ppar.preview.histogram_height;
      }
      graphics.antialiasing = true;
      graphics.pen = new Pen(0xffffffff,1);
      
      graphics.fillRect(0, 0, width, height, new Brush(0xff000000));

      graphics.pen = new Pen(0xFF808080,0);

      for (var i = 0.25; i < 1; i += 0.25) {
            graphics.drawLine(0, height*i, width, height*i);
            graphics.drawLine(width*i, 0, width*i, height);
      }
}

function getHistogramInfo(imgWin, side_preview)
{
      console.writeln("getHistogramInfo");
      var view = imgWin.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");
      var values = [];
      var maxvalue = 0;
      var maxvalue_channel = 0;
      var maxvalue_pos = 0;
      var maxchannels = histogramMatrix.rows;

      if (side_preview) {
            var width = ppar.preview.side_preview_width;
            var height = ppar.preview.side_histogram_height;
      } else {
            var width = ppar.preview.preview_width;
            var height = ppar.preview.histogram_height;
      }

      for (var channel = 0; channel < maxchannels; channel++) {
            values[channel] = [];
            for (var i = 0; i < width; i++) {
                  values[channel][i] = 0;
            }
      }
      console.writeln("getHistogramInfo: maxchannels ", maxchannels);
      for (var channel = 0; channel < maxchannels; channel++) {
            for (var col = 0; col < histogramMatrix.cols; col++) {
                  var i = parseInt(col / histogramMatrix.cols * width);
                  values[channel][i] += histogramMatrix.at(channel, col);
                  if (values[channel][i] > maxvalue) {
                        maxvalue = values[channel][i];
                        maxvalue_channel = channel;
                        maxvalue_pos = i;
                  }
            }
      }
      console.writeln("getHistogramInfo: maxvalue " + maxvalue + " maxvalue_channel " + maxvalue_channel + " maxvalue_pos " + maxvalue_pos);
      var cumulativeValues = [];
      for (var i = 0; i < width; i++) {
            var channels_values = 0;
            for (var channel = 0; channel < maxchannels; channel++) {
                  channels_values += values[channel][i];
            }
            if (i == 0) {
                  cumulativeValues[i] = channels_values;
            } else {
                  cumulativeValues[i] = cumulativeValues[i-1] + channels_values;
            }
      }
      var percentageValues = [];
      for (var i = 0; i < width; i++) {
            percentageValues[i] = cumulativeValues[i] / cumulativeValues[width-1] * 100;
      }

      console.writeln("getHistogramInfo: width " +  width + " height " + height);

      var bitmap = new Bitmap(width, height);
      var graphics = new VectorGraphics(bitmap);

      setHistogramBitmapBackground(graphics, side_preview);

      for (var channel = 0; channel < maxchannels; channel++) {
            var x1 = 0;
            var y1 = height;
            if (maxchannels == 1) {
                  graphics.pen = new Pen(0xFFD3D3D3,0);     // LightGray
            } else if (channel == 0) {
                  graphics.pen = new Pen(0xFFFF0000,0);     // Red
            } else if (channel == 1) {
                  graphics.pen = new Pen(0xFF008000,0);     // Green
            } else if (channel == 2) {
                  graphics.pen = new Pen(0xFF00BFFF,0);     // DeepSkyBlue
            }
            for (var i = 0; i < width; i++) {
                  var x0 = x1;
                  var y0 = y1;
                  x1 = i;
                  y1 = height - (values[channel][i] / maxvalue) * height;
                  graphics.drawLine(x0, y0, x1, y1);
            }
      }
      graphics.end();

      return { bitmap: bitmap, cumulativeValues: cumulativeValues, percentageValues: percentageValues };
}

function updatePreviewWinTxt(imgWin, txt, histogramInfo)
{
      if (global.use_preview && imgWin != null && !global.get_flowchart_data) {
            if (preview_size_changed) {
                  if (tabPreviewControl != null) {
                        tabPreviewControl.setSize(ppar.preview.preview_width, ppar.preview.preview_height);
                  }
                  if (sidePreviewControl != null) {
                        sidePreviewControl.setSize(ppar.preview.side_preview_width, ppar.preview.side_preview_height);
                  }
                  preview_size_changed = false;
            }
            if (histogramInfo) {
                  console.writeln("updatePreviewWinTxt:use existing histogramInfo");
                  current_histogramInfo = histogramInfo;
            } else {
                  if (tabHistogramControl != null && sideHistogramControl != null) {
                        console.writeln("updatePreviewWinTxt:get new histogramInfo");
                        forceNewHistogram(imgWin);
                        histogramInfo = getHistogramInfo(imgWin, ppar.preview.side_preview_visible);
                  } else {
                        console.writeln("updatePreviewWinTxt:no histogram");
                        histogramInfo = null;
                  }
                  current_histogramInfo = histogramInfo;
            }
            preview_images[0] = { image: new Image( imgWin.mainView.image ), txt: txt };
            if (global.is_processing == global.processing_state.processing
                && par.preview_autostf.val 
                && !util.findKeywordName(imgWin, "AutoIntegrateNonLinear")) 
            {
                  // Image is linear, run AutoSTF
                  util.closeOneWindow("AutoIntegrate_preview_tmp");
                  var copy_win = util.copyWindow(imgWin, "AutoIntegrate_preview_tmp");
                  engine.runHistogramTransformSTFex(copy_win, null, copy_win.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, true, null);
                  imgWin = copy_win;
                  txt = txt + " (AutoSTF)";
                  preview_images[1] = { image: new Image( copy_win.mainView.image ), txt: txt };
                  preview_image = preview_images[1].image;
                  preview_image_txt = preview_images[1].txt;
            } else {
                  preview_images[1] = preview_images[0];
                  var copy_win = null;
                  preview_image = preview_images[0].image;
                  preview_image_txt = preview_images[0].txt;
            }
            if (global.is_processing != global.processing_state.none) {
                  flowchartUpdated();
            }
            if (!par.show_flowchart.val || global.is_processing != global.processing_state.processing) {
                  if (ppar.preview.side_preview_visible) {
                        updatePreviewImage(sidePreviewControl, imgWin, txt, sideHistogramControl, histogramInfo);
                  } else {
                        updatePreviewImage(tabPreviewControl, imgWin, txt, tabHistogramControl, histogramInfo);
                  }
            }
            if (copy_win != null) {
                  util.forceCloseOneWindow(copy_win);
            }
            updatePreviewTxt(txt);
            console.noteln("Preview updated");
            is_some_preview = true;
            current_selected_file_name = null; // reset file name, it is set by caller if needed
      }
}

function updatePreviewWin(imgWin)
{
      updatePreviewWinTxt(imgWin, imgWin.mainView.id);
}

function updatePreviewFilenameAndInfo(filename, stf, update_info)
{
      console.writeln("updatePreviewFilenameAndInfo ", filename);

      if (!global.use_preview || global.get_flowchart_data) {
            return;
      }
      var imageWindows = ImageWindow.open(filename);
      if (imageWindows == null || imageWindows.length == 0) {
            return;
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            return;
      }

      if (stf) {
            engine.runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, false, null);
      }

      updatePreviewWinTxt(imageWindow, File.extractName(filename) + File.extractExtension(filename));
      if (update_info) {
            util.updateStatusInfoLabel("Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height);
      }

      imageWindow.forceClose();
}

function updatePreviewFilename(filename, stf)
{
      updatePreviewFilenameAndInfo(filename, stf, false);
}

function updatePreviewId(id)
{
      if (global.use_preview) {
            updatePreviewWinTxt(ImageWindow.windowById(id), id);
      }
}

function updatePreviewIdReset(id, keep_zoom, histogramInfo)
{
      if (global.use_preview && !global.get_flowchart_data) {
            preview_keep_zoom = keep_zoom;
            var win = ImageWindow.windowById(id);
            updatePreviewWinTxt(win, id, histogramInfo);
            util.updateStatusInfoLabel("Size: " + win.mainView.image.width + "x" + win.mainView.image.height);
            is_some_preview = false;
            global.is_processing = global.processing_state.none;
      }
}

function createEmptyBitmap(width, height, fill_color)
{
      var bitmap = new Bitmap(width, height);

      bitmap.fill(fill_color);

      return bitmap;
}

function updatePreviewNoImageInControl(control)
{
      let show_startup_image = ppar.show_startup_image;

      if (show_startup_image) {
            if (ppar.startup_image_name == global.default_startup_image_name) {
                  var startup_image_name = File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ ) + "/" + ppar.startup_image_name;
            } else {
                  var startup_image_name = ppar.startup_image_name;
            }
            try {
                  var bitmap = new Bitmap( startup_image_name );
            } catch (e) {
                  var bitmap = null;
            }
            if (!bitmap) {
                  console.noteln("Could not load startup image " + startup_image_name);
                  show_startup_image = false;
            } else {
                  // scale the bitmap
                  let scale = 1;
                  if (bitmap.height > 1080) {
                        scale = bitmap.height / 1080;
                  }
                  bitmap = bitmap.scaledTo(bitmap.width * scale, bitmap.height * scale);
            }
      }
      if (!show_startup_image) {
            let width;
            let height;
            if (ppar.preview.side_preview_visible) {
                  width = ppar.preview.side_preview_width ;
                  height = ppar.preview.side_preview_height;
            } else {
                  width = ppar.preview.preview_width;
                  height = ppar.preview.preview_height;
            }
            let ratio = width / height;
            height = 1080;
            width = height * ratio;
            var bitmap = createEmptyBitmap(width, height, 0xff808080);
      }

      var startup_text = [ global.autointegrate_version ];
      if (ppar.savedVersion != global.autointegrate_version) {
            // Started with a new version, show the version info
            startup_text.push("");
            for (var i = 0; i < global.autointegrate_version_info.length; i++) {
                  startup_text.push(global.autointegrate_version_info[i]);
            }
      } else if (show_startup_image) {
            // Do now show text with a startup image
            startup_text = null;
      }

      for (var fontsize = 24; fontsize > 0; fontsize -= 4) {   
            var graphics = new Graphics(bitmap);
            graphics.font = new Font( FontFamily_SansSerif, fontsize );
            graphics.transparentBackground = true;

            graphics.pen = new Pen(0xff000000, 4);
            graphics.font.bold = true;

            if (startup_text != null) {
                  var linecount = startup_text.length;
                  var maxrowlen = 0;
                  var maxtxt = "";
                  for (var i = 0; i < linecount; i++) {
                        if (startup_text[i].length > maxrowlen) {
                              maxrowlen = startup_text[i].length;
                              maxtxt = startup_text[i];
                        }
                  }

                  var txtWidth = graphics.font.width(maxtxt);
                  var lineheight = graphics.font.height + 4; 
                  var txtHeight = lineheight * linecount;

                  var startpos_x = bitmap.width / 2 - txtWidth / 2;
                  var startpos_y = bitmap.height / 2 - txtHeight / 2 + graphics.font.height / 2;
            } else {
                  var startpos_x = bitmap.width / 2;
                  var startpos_y = bitmap.height / 2;
                  var lineheight = 0;
            }

            if (startpos_x > 2 * lineheight && startpos_y > 2 * lineheight) {
                  if (show_startup_image) {
                        var textMargin = lineheight;
                        graphics.brush = new Brush( 0xffC0C0C0 );
                        // graphics.brush = new Brush( 0xff808080 );
                        graphics.drawRect(bitmap.width / 2 - txtWidth / 2 - textMargin, bitmap.height / 2 - txtHeight / 2 - textMargin, 
                                          bitmap.width / 2 + txtWidth / 2 + textMargin, bitmap.height / 2 + txtHeight / 2 + textMargin);
                  }
                  if (startup_text != null) {
                        for (var i = 0; i < linecount; i++) {
                              graphics.drawText(startpos_x, startpos_y + i * lineheight, startup_text[i]);
                        }
                  }
                  graphics.end();
                  break;

            } else {
                  // Try with a smaller font size
                  graphics.end();
            }
      }
      
      var startupImage = util.createImageFromBitmap(bitmap);

      control.SetImage(startupImage);

      startupImage.free();
}

function updatePreviewNoImage()
{
      if (global.use_preview) {
            updatePreviewNoImageInControl(tabPreviewControl);
            updatePreviewNoImageInControl(sidePreviewControl);
            updatePreviewTxt("No preview");
            util.updateStatusInfoLabel("No preview");
      }
}

// Create a combined mosaic image from a list of image windows.
function createCombinedMosaicPreviewWin(imgWinArr)
{
      console.writeln("createCombinedMosaicPreviewWin");

      if (imgWinArr.length == 0) {
            return null;
      }
      var width = imgWinArr[0].mainView.image.width;
      var height = imgWinArr[0].mainView.image.height;

      var combinedWindow = util.copyWindow(imgWinArr[0], "AutoIntegrate_combined_preview");

      var bitmap = new Bitmap(width, height);
      var graphics = new Graphics(bitmap);
      graphics.fillRect(0, 0, width, height, new Brush(0xff000000));
      //graphics.transparentBackground = true;

      if (imgWinArr.length == 2) {
            if (width < height) {
                  // Two images, rescale them to half size and put them side by side.
                  for (var i = 0, x = 0; i < imgWinArr.length; i++) {
                        // console.writeln("createCombinedMosaicPreviewWin, i " + i + " x " + x);
                        var imgWin = imgWinArr[i];
                        var bmp = getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
                        graphics.drawBitmap(x, height / 4, bmp);
                        x = width / 2;
                  }
            } else {
                  // Two images, rescale them to half size and put them on top of each other.
                  for (var i = 0, y = 0; i < imgWinArr.length; i++) {
                        // console.writeln("createCombinedMosaicPreviewWin, i " + i + " y " + y);
                        var imgWin = imgWinArr[i];
                        var bmp = getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
                        graphics.drawBitmap(width / 4, y, bmp);
                        y = height / 2;
                  }
            }
      } else {
            // Assume four images, rescale them to half size and put them into a mosaic.
            for (var i = 0, x = 0, y = 0; i < imgWinArr.length; i++) {
                  // console.writeln("createCombinedMosaicPreviewWin, i " + i + " x " + x + " y " + y);
                  var imgWin = imgWinArr[i];
                  var bmp = getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
                  graphics.drawBitmap(x, y, bmp);
                  if (x == 0) {
                        x = width / 2;
                  } else {
                        x = 0;
                  }
                  if (i >= 1) {
                        y = height / 2;
                  }
            }
      }
      graphics.end();
      
      combinedWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      combinedWindow.mainView.image.blend(bitmap);
      combinedWindow.mainView.endProcess();

      return combinedWindow;
}

function updateOutputDirEdit(path)
{
      global.outputRootDir = util.ensurePathEndSlash(path);
      console.writeln("updateOutputDirEdit, set global.outputRootDir ", global.outputRootDir);
      outputDirEdit.text = global.outputRootDir;
}

function getOutputDirEdit()
{
      return outputDirEdit.text;
}

function addOutputDir(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Output directory";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give output root directory.</p>" +
                    "<p>If no directory is given then the path to the " + 
                    "first light file is used as the output root directory.</p>" +
                    "<p>If a relative path is given then it will be appended " + 
                    "to the first light file path.</p>" +
                    "<p>If output directory is given with AutoContinue then output " + 
                    "goes to that directory and not into directory subtree.</p>" +
                    "<p>If directory does not exist it is created.</p>";
      outputDirEdit = new Edit( parent );
      outputDirEdit.text = global.outputRootDir;
      outputDirEdit.toolTip = lbl.toolTip;
      outputDirEdit.onEditCompleted = function() {
            global.outputRootDir = util.ensurePathEndSlash(outputDirEdit.text.trim());
            console.writeln("addOutputDir, set global.outputRootDir ", global.outputRootDir);
      };

      var dirbutton = new ToolButton( parent );
      dirbutton.icon = parent.scaledResource( ":/icons/select-file.png" );
      dirbutton.toolTip = "<p>Select output root directory.</p>";
      dirbutton.onClick = function() {
            var gdd = new GetDirectoryDialog;
            if (global.outputRootDir == "") {
                  gdd.initialPath = ppar.lastDir;
            } else {
                  gdd.initialPath = global.outputRootDir;
            }
            gdd.caption = "Select Output Directory";
            if (gdd.execute()) {
                  updateOutputDirEdit(gdd.directory);
            }
      };
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( outputDirEdit );
      outputdir_Sizer.add( dirbutton );

      return outputdir_Sizer;
}

function validateWindowPrefixCharacters(p)
{
      p = p.replace(/[^A-Za-z0-9]/gi,'_');
      //p = p.replace(/_+$/,'');
      if (p.match(/^\d/)) {
            // if user tries to start prefix with a digit, prepend an underscore
            p = "_" + p;
      }
      return p;
}

function validateWindowPrefix(p)
{
      p = validateWindowPrefixCharacters(p);
      if (p != "" && !p.endsWith("_")) {
            p = p + "_";
      }
      return p;
}

// Update window prefix before using it.
// Moved from windowPrefixComboBox.onEditTextUpdated
// is that function is called for every character.
function updateWindowPrefix()
{
      ppar.win_prefix = validateWindowPrefix(ppar.win_prefix);
      if (windowPrefixComboBox != null) {
            windowPrefixComboBox.editText = ppar.win_prefix;
      }
      console.writeln("updateWindowPrefix, set winPrefix '" + ppar.win_prefix + "'");
      util.fixAllWindowArrays(ppar.win_prefix);
}

function addWinPrefix(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Window Prefix";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give window prefix identifier.</p>" +
                    "<p>If specified, all AutoIntegrate windows will be " +
                    "prepended with the prefix and an underscore.</p>" +
                    "<p>This makes all generated window names unique " +
                    "for the current run and allows you run multiple times " +
                    "without closing or manually renaming all the windows from previous runs, " +
                    "as long as you change the prefix before each run." +
                    "<p>The window prefix will be saved across script invocations " +
                    "for convenience with the AutoContinue function.</p>";
      
      windowPrefixComboBox = new ComboBox( parent );
      windowPrefixComboBox.enabled = true;
      windowPrefixComboBox.editEnabled = true;
      windowPrefixComboBox.minItemCharWidth = 10;
      windowPrefixComboBox.toolTip = lbl.toolTip;
      var pa = get_win_prefix_combobox_array(ppar.win_prefix);
      addArrayToComboBox(windowPrefixComboBox, pa);
      windowPrefixComboBox.editText = ppar.win_prefix;
      windowPrefixComboBox.onEditTextUpdated = function() {
            // This function is called for every character edit so actions
            // are moved to function updateWindowPrefix
            ppar.win_prefix = validateWindowPrefixCharacters(windowPrefixComboBox.editText.trim());
            windowPrefixComboBox.editText = ppar.win_prefix;
      };

      // Add help button to show known prefixes. Maybe this should be in
      // label and edit box toolTips.
      windowPrefixHelpTips = new ToolButton( parent );
      windowPrefixHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      windowPrefixHelpTips.setScaledFixedSize( 20, 20 );
      windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p>";
      windowPrefixHelpTips.onClick = function()
      {
            new MessageBox(windowPrefixHelpTips.toolTip, "Current Window Prefixes", StdIcon_Information ).execute();
      }

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( lbl );
      winprefix_Sizer.add( windowPrefixComboBox );
      winprefix_Sizer.add( windowPrefixHelpTips );

      return winprefix_Sizer;
}

function addAutoContinueWinPrefix(parent)
{
      autoContinueWindowPrefixComboBox = new ComboBox( parent );
      autoContinueWindowPrefixComboBox.enabled = true;
      autoContinueWindowPrefixComboBox.editEnabled = true;
      autoContinueWindowPrefixComboBox.minItemCharWidth = 5;
      autoContinueWindowPrefixComboBox.toolTip = "<p>Give window prefix for AutoContinue start images.</p>";
      var pa = get_win_prefix_combobox_array("");
      addArrayToComboBox(autoContinueWindowPrefixComboBox, pa);
      autoContinueWindowPrefixComboBox.editText = "";
      autoContinueWindowPrefixComboBox.onEditTextUpdated = function() {
            // This function is called for every character edit so actions
            // are moved to function updateWindowPrefix
            ppar.autocontinue_win_prefix = validateWindowPrefixCharacters(autoContinueWindowPrefixComboBox.editText.trim());
            autoContinueWindowPrefixComboBox.editText = ppar.autocontinue_win_prefix;
      };

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( autoContinueWindowPrefixComboBox );

      return winprefix_Sizer;
}

function filenamesToTreeboxfiles(treeboxfiles, filenames, checked)
{
      for (var i = 0; i < filenames.length; i++) {
            treeboxfiles[treeboxfiles.length] =  [ filenames[i], checked, 0 ];
      }
}

function updateTreeBoxNodeToolTip(node)
{
      var toolTip = "<p>" + node.filename + "</p><p>exptime: " + node.exptime;
      if (node.ssweight > 0) {
            toolTip = toolTip + "<br>ssweight: " + node.ssweight.toFixed(10);
      }
      if (node.best_image) {
            toolTip = toolTip + "<br>Reference image for star align";
      }
      if (node.reference_image) {
            toolTip = toolTip + "<br>Reference image for image integration and local normalization";
      }
      var toolTip = toolTip + "</p>";

      node.setToolTip(0, toolTip);
}

function updateTreeBoxNodeFromFlags(parent, node)
{
      if (node.best_image && node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, both best image and reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item-ok.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else if (node.best_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, best image");
            node.setIcon(0, parent.scaledResource(":/icons/ok-button.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else if (node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else {
            //console.writeln("updateTreeBoxNodeFromFlags, normal image");
            node.setIcon(0, parent.scaledResource(""));
            updateTreeBoxNodeToolTip(node);
      }
}

function setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (best_image != null && util.compareReferenceFileNames(best_image, node.filename, filename_postfix)) {
                  //console.writeln("setBestImageInTreeBoxNode found best image");
                  // Invert the flag, either set or clear it
                  node.best_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  global.user_selected_best_image = node.filename;
            } else if (node.best_image) {
                  // Clear old best image flag
                  node.best_image = false;
                  updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  setBestImageInTreeBoxNode(parent, node.child(i), best_image, filename_postfix);
            }
      }
}

function setBestImageInTreeBox(parent, node, best_image, filename_postfix)
{
      //console.writeln("setBestImageInTreeBox " + best_image);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix);
      }
}

// Set user selected reference image to the array of reference images by filter.
// If filter already has reference image update the old one.
function set_user_selected_reference_image(reference_image, filter)
{
      for (var i = 0; i < global.user_selected_reference_image.length; i++) {
            if (global.user_selected_reference_image[i][1] == filter) {
                  console.writeln("set_user_selected_reference_image, update filter " + filter + " to image " + reference_image);
                  global.user_selected_reference_image[i][0] = reference_image;
                  break;
            }
      }
      if (i == global.user_selected_reference_image.length) {
            // not found, add new
            // console.writeln("set_user_selected_reference_image, add filter " + filter + " and image " + reference_image);
            global.user_selected_reference_image[global.user_selected_reference_image.length] = [ reference_image, filter ];
      }
}

function remove_user_selected_reference_image(reference_image, filter)
{
      for (var i = 0; i < global.user_selected_reference_image.length; i++) {
            if (global.user_selected_reference_image[i][0] == reference_image
                && (filter == null || global.user_selected_reference_image[i][1] == filter)) 
            {
                  // clear reference image
                  // console.writeln("remove_user_selected_reference_image, remove filter " + filter + " and image " + reference_image);
                  global.user_selected_reference_image.splice(i, 1);
                  return;
            }
      }
}

function setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter)
{
      if (node.numberOfChildren == 0 && (filter == null || node.filter == filter)) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (reference_image != null && util.compareReferenceFileNames(reference_image, node.filename, filename_postfix)) {
                  // console.writeln("setReferenceImageInTreeBoxNode found reference image");
                  // Invert the flag, either set or clear it
                  node.reference_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  set_user_selected_reference_image(node.filename, filter);
            } else if (node.reference_image) {
                  // console.writeln("setReferenceImageInTreeBoxNode clear old reference image " + node.filename);
                  // Clear old reference image flag
                  node.reference_image = false;
                  updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  setReferenceImageInTreeBoxNode(parent, node.child(i), reference_image, filename_postfix, filter);
            }
      }
}

function setReferenceImageInTreeBox(parent, node, reference_image, filename_postfix, filter)
{
      //console.writeln("setReferenceImageInTreeBox " + reference_image + " for filter " + filter);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter);
      }
}

// 1. Find image with biggest ssweight in treebox and update it in 
//    global.user_selected_best_image.
// 2. For each filter find image with biggest ssweight in treebox and 
//    update it in global.user_selected_reference_image.
function findBestImageFromTreeBoxFiles(treebox)
{
      if (treebox.numberOfChildren == 0) {
            console.writeln("findBestImageFromTreeBoxFiles, no files");
            return false;
      }
      util.addStatusInfo("Finding...");

      var checked_files = [];
      getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);

      // get array of [ filename, weight ]
      var ssWeights = engine.subframeSelectorMeasure(checked_files, false, false);

      // create treeboxfiles array of [ filename, checked, weight ]
      var treeboxfiles = [];
      for (var i = 0; i < ssWeights.length; i++) {
            treeboxfiles[treeboxfiles.length] = [ ssWeights[i][0], true, ssWeights[i][1] ];
      }

      // group files by filter
      var filteredFiles = engine.getFilterFiles(treeboxfiles, global.pages.LIGHTS, '');

      // go through all filters
      var globalBestSSWEIGHTvalue = 0;
      var globalBestSSWEIGHTfile = null;
      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {
            var files = filteredFiles.allfilesarr[i].files;
            if (files.length == 0) {
                  continue;
            }
            var filter = filteredFiles.allfilesarr[i].filter;
            var bestSSWEIGHTvalue = 0;
            var bestSSWEIGHTindex = -1;
            for (var j = 0; j < files.length; j++) {
                  var filePath = files[j].name;
                  var SSWEIGHT = files[j].ssweight;
                  if (SSWEIGHT > bestSSWEIGHTvalue) {
                        bestSSWEIGHTvalue = SSWEIGHT;
                        bestSSWEIGHTindex = j;
                        console.writeln("Filter " + filter + ", " + filePath + ", SSWEIGHT=" + SSWEIGHT + ", new best value");
                  } else {
                        console.writeln("Filter " + filter + ", " + filePath + ", SSWEIGHT=" + SSWEIGHT);
                  }
                  setTreeBoxSsweight(treebox, filePath, SSWEIGHT, "");
            }
            if (bestSSWEIGHTindex == -1) {
                  console.noteln("findBestImageFromTreeBoxFiles, no SSWEIGHT for filter " + filter);
            } else {
                  console.noteln("Filter " + filter + ", " + files[bestSSWEIGHTindex].name + ", best SSWEIGHT=" + bestSSWEIGHTvalue);
                  set_user_selected_reference_image(files[bestSSWEIGHTindex].name, filter);

                  if (bestSSWEIGHTvalue > globalBestSSWEIGHTvalue) {
                        globalBestSSWEIGHTvalue = bestSSWEIGHTvalue;
                        globalBestSSWEIGHTfile = files[bestSSWEIGHTindex].name;
                        console.writeln("All files, " + globalBestSSWEIGHTfile + ", SSWEIGHT=" + globalBestSSWEIGHTvalue + ", new best value");
                  }
            }
      }
      if (globalBestSSWEIGHTfile != null) {
            console.noteln("All files, " + globalBestSSWEIGHTfile + ", best SSWEIGHT=" + globalBestSSWEIGHTvalue);
            global.user_selected_best_image = globalBestSSWEIGHTfile;
      }
      util.addStatusInfo("Done.");
      return true;
}

function updateSectionsInTreeBoxNode(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            if (typeof node.text === "function") {
                  var txt = node.text(0);
                  var is_monochrome_txt = txt.search(monochrome_text) != -1;
                  if (par.monochrome_image.val) {
                        if (!is_monochrome_txt) {
                              node.setText(0, monochrome_text + txt);
                        }
                  } else {
                        if (is_monochrome_txt) {
                              node.setText(0, txt.replace(monochrome_text, ""));
                        }
                  }
            }
            for (var i = 0; i < node.numberOfChildren; i++) {
                  updateSectionsInTreeBoxNode(node.child(i));
            }
      }
}

function updateSectionsInTreeBox(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            updateSectionsInTreeBoxNode(node);
      }
}

function getTreeBoxNodeFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 1;
      } else {
            var cnt = 0;
            for (var i = 0; i < node.numberOfChildren; i++) {
                  cnt = cnt + getTreeBoxNodeFileCount(node.child(i));
            }
            return cnt;
      }
}

function getTreeBoxFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return getTreeBoxNodeFileCount(node);
      }
}

function checkAllTreeBoxNodeFiles(node)
{
      if (node.numberOfChildren == 0) {
            node.checked = true;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  checkAllTreeBoxNodeFiles(node.child(i));
            }
      }
}
function checkAllTreeBoxFiles(node)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return checkAllTreeBoxNodeFiles(node);
      }
}

function setTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            if (util.compareReferenceFileNames(filename, node.filename, filename_postfix)) {
                  node.ssweight = ssweight;
                  updateTreeBoxNodeToolTip(node);
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (setTreeBoxNodeSsweight(node.child(i), filename, ssweight, filename_postfix)) {
                        return true;
                  }
            }
      }
      return false;
}

function setTreeBoxSsweight(node, filename, ssweight, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            return false;
      } else {
            return setTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix);
      }
}

function getTreeBoxNodeFileNamesCheckedIf(node, filenames, checked)
{
      if (node.numberOfChildren == 0) {
            if (node.checked == checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeFileNamesCheckedIf(node.child(i), filenames, checked);
            }
      }
}

function getTreeBoxFileNamesCheckedIf(node, filenames, checked)
{
      if (node.numberOfChildren > 0) {
            getTreeBoxNodeFileNamesCheckedIf(node, filenames, checked);
      }
}

function getTreeBoxNodeFiles(node, treeboxfiles)
{
      if (node.numberOfChildren == 0) {
            if (node.lightsnode) {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked, node.ssweight, node.best_image, node.reference_image ];
            } else {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked ];
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeFiles(node.child(i), treeboxfiles);
            }
      }
}

function getTreeBoxNodeCheckedFileNames(node, filenames)
{
      if (node.numberOfChildren == 0) {
            if (node.checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeCheckedFileNames(node.child(i), filenames);
            }
      }
}

function findFileFromTreeBoxNode(node, filename)
{
      if (node.numberOfChildren == 0) {
            if (node.filename == filename) {
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (findFileFromTreeBoxNode(node.child(i), filename)) {
                        return true;
                  }
            }
      }
      return false;
}

function findFileFromTreeBox(node, filename)
{
      if (node.numberOfChildren == 0) {
            return false;
      } else {
            return findFileFromTreeBoxNode(node, filename);
      }
}

function setExpandedTreeBoxNode(node, expanded)
{
      if (node.numberOfChildren > 0) {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (node.collapsable) {
                        node.expanded = expanded;
                  }
                  setExpandedTreeBoxNode(node.child(i), expanded);
            }
      }
}

function filterTreeBoxFiles(parent, pageIndex)
{
      console.show();
      var treebox = parent.treeBox[pageIndex];
      if (treebox.numberOfChildren == 0) {
            console.writeln("filterTreeBoxFiles, no files");
            return;
      }

      util.addStatusInfo("Filtering...");

      console.writeln("filterTreeBoxFiles " + pageIndex);

      var checked_files = [];
      var unchecked_files = [];

      getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
      getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);

      // get treeboxfiles which is array of [ filename, checked, weight ]
      // sorted by weight
      var treeboxfiles = engine.subframeSelectorMeasure(checked_files, true, true);

      // add old unchecked files
      filenamesToTreeboxfiles(treeboxfiles, unchecked_files, false);

      console.writeln("filterTreeBoxFiles " + treeboxfiles.length + " files");

      // remove old files
      parent.treeBox[pageIndex].clear();

      // add new filtered file list
      addFilesToTreeBox(parent, pageIndex, treeboxfiles);

      console.writeln("filterTreeBoxFiles, this.addFilesToTreeBox done");

      var checked_count = 0;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (treeboxfiles[i][1]) {
                  checked_count++;
            }
      }

      console.noteln("AutoIntegrate filtering completed, " + checked_count + " checked, " + (treeboxfiles.length - checked_count) + " unchecked");
      util.updateStatusInfoLabel("Filtering completed");
}

function getFilesFromTreebox(parent)
{
      for (var pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
            var treeBox = parent.treeBox[pageIndex];
            if (treeBox.numberOfChildren == 0) {
                  var filenames = null;
            } else {
                  var filenames = [];
                  getTreeBoxNodeCheckedFileNames(treeBox, filenames);
            }

            switch (pageIndex) {
                  case global.pages.LIGHTS:
                        global.lightFileNames = filenames;
                        break;
                  case global.pages.BIAS:
                        global.biasFileNames = filenames;
                        break;
                  case global.pages.DARKS:
                        global.darkFileNames = filenames;
                        break;
                  case global.pages.FLATS:
                        global.flatFileNames = filenames;
                        break;
                  case global.pages.FLAT_DARKS:
                        global.flatdarkFileNames = filenames;
                        break;
                  default:
                        util.throwFatalError("getFilesFromTreebox bad pageIndex " + pageIndex);
            }
      }
}

function getNewTreeBoxFiles(parent, pageIndex, imageFileNames)
{
      console.writeln("getNewTreeBoxFiles " + pageIndex);

      var treeBox = parent.treeBox[pageIndex];
      var treeboxfiles = [];

      if (treeBox.numberOfChildren > 0) {
            getTreeBoxNodeFiles(treeBox, treeboxfiles);
      }

      for (var i = 0; i < imageFileNames.length; i++) {
            var obj = imageFileNames[i];
            if (Array.isArray(obj)) {
                  // we have treeboxfiles array
                  treeboxfiles[treeboxfiles.length] = obj;
            } else {
                  // we have file name list
                  treeboxfiles[treeboxfiles.length] = [ obj, true, 0 ];
            }
      }
      return treeboxfiles;
}

// in newImageFileNames we have file name list or
// treeboxfiles which is array of [ filename, checked, weight ]
function addFilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      console.writeln("addFilteredFilesToTreeBox " + pageIndex);

      // ensure we have treeboxfiles which is array of [ filename, checked, weight, best_image, reference_image ]
      var treeboxfiles = getNewTreeBoxFiles(parent, pageIndex, newImageFileNames);

      var filteredFiles = engine.getFilterFiles(treeboxfiles, pageIndex, '');
      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var rootnode = new TreeBoxNode(files_TreeBox);
      rootnode.expanded = true;
      if (filteredFiles.error_text != "") {
            rootnode.useRichText = true;
            var errortxt = "Files grouped by filter: " + filteredFiles.error_text;
            var font = rootnode.font( 0 );
            font.bold = true
            rootnode.setFont( 0, font );
            rootnode.setText( 0, errortxt);
      } else {
            rootnode.setText( 0, "Files grouped by filter" );
      }
      rootnode.nodeData_type = "FrameGroup";
      rootnode.collapsable = false;

      files_TreeBox.canUpdate = false;

      console.writeln("addFilteredFilesToTreeBox " + filteredFiles.allfilesarr.length + " files");

      var preview_file_name = null;
      var preview_file_filter = null;
      var filename_best_image = null;

      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {

            var filterFiles = filteredFiles.allfilesarr[i].files;
            var filterName = filteredFiles.allfilesarr[i].filter;

            if (filterFiles.length > 0) {
                  console.writeln("addFilteredFilesToTreeBox filterName " + filterName + ", " + filterFiles.length + " files");

                  var filternode = new TreeBoxNode(rootnode);
                  filternode.expanded = true;
                  filternode.setText( 0, filterName +  ' (' + filterFiles[0].filter + ') ' + filterFiles.length + ' files');
                  filternode.nodeData_type = "FrameGroup";
                  filternode.collapsable = true;
                  filternode.filename = "";

                  for (var j = 0; j < filterFiles.length; j++) {
                        if (findFileFromTreeBox(files_TreeBox, filterFiles[j].name)) {
                              console.writeln("Skipping duplicate file " + filterFiles[j].name);
                              continue;
                        }
                        var node = new TreeBoxNode(filternode);
                        var txt = File.extractName(filterFiles[j].name) + File.extractExtension(filterFiles[j].name);
                        if (pageIndex == global.pages.LIGHTS && par.monochrome_image.val) {
                              node.setText(0, monochrome_text + txt);
                        } else {
                              node.setText(0, txt);
                        }
                        node.filename = filterFiles[j].name;
                        node.nodeData_type = "";
                        node.checkable = true;
                        node.checked = filterFiles[j].checked;
                        node.collapsable = false;
                        node.ssweight = filterFiles[j].ssweight;
                        node.exptime = filterFiles[j].exptime;
                        node.filter = filterFiles[j].filter;
                        node.best_image = filterFiles[j].best_image;
                        node.reference_image = filterFiles[j].reference_image;
                        if (pageIndex == global.pages.LIGHTS) {
                              node.lightsnode = true;
                        } else {
                              node.lightsnode = false;
                        }
                        updateTreeBoxNodeToolTip(node);
                        if (pageIndex == global.pages.LIGHTS && filterFiles[j].name.indexOf("best_image") != -1) {
                              filename_best_image = filterFiles[j].name;
                        }
                        if (global.use_preview && preview_file_name == null) {
                              if (!is_some_preview || pageIndex == global.pages.LIGHTS) {
                                    preview_file_name = node.filename;
                                    preview_file_filter = node.filter;
                              }
                        }
                  }
            }
      }
      files_TreeBox.canUpdate = true;

      if (pageIndex == global.pages.LIGHTS) {
            if (global.user_selected_best_image != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], global.user_selected_best_image, "");
            } else if (filename_best_image != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], filename_best_image, "");
            }
            for (var i = 0; i < global.user_selected_reference_image.length; i++)  {
                  setReferenceImageInTreeBox(
                        parent, 
                        parent.treeBox[global.pages.LIGHTS], 
                        global.user_selected_reference_image[i][0],
                        "",
                        global.user_selected_reference_image[i][1]);
            }
      }

      if (preview_file_name != null) {
            updatePreviewFilenameAndInfo(preview_file_name, true, true);
            current_selected_file_name = preview_file_name;
            current_selected_file_filter = preview_file_filter;
      }
}

function addUnfilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      console.writeln("addUnfilteredFilesToTreeBox " + pageIndex);

      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var treeboxfiles = getNewTreeBoxFiles(parent, pageIndex, newImageFileNames);

      files_TreeBox.canUpdate = false;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (findFileFromTreeBox(files_TreeBox, treeboxfiles[i][0])) {
                  console.writeln("Skipping duplicate file " + treeboxfiles[i][0]);
                  continue;
            }
            var node = new TreeBoxNode(files_TreeBox);
            node.setText(0, File.extractName(treeboxfiles[i][0]) + File.extractExtension(treeboxfiles[i][0]));
            node.setToolTip(0, treeboxfiles[i][0]);
            node.filename = treeboxfiles[i][0];
            node.nodeData_type = "";
            node.checkable = true;
            node.checked = treeboxfiles[i][1];
            node.collapsable = false;
            node.filter = '';
            node.best_image = false;
            node.reference_image = false;
      }
      files_TreeBox.canUpdate = true;
}

function addFilesToTreeBox(parent, pageIndex, imageFileNames)
{
      switch (pageIndex) {
            case global.pages.LIGHTS:
            case global.pages.FLATS:
                  addFilteredFilesToTreeBox(parent, pageIndex, imageFileNames);
                  break;
            case global.pages.BIAS:
            case global.pages.DARKS:
            case global.pages.FLAT_DARKS:
                  addUnfilteredFilesToTreeBox(parent, pageIndex, imageFileNames);
                  break;
            default:
                  util.throwFatalError("addFilesToTreeBox bad pageIndex " + pageIndex);
      }
}

function loadJsonFile(parent)
{
      console.writeln("loadJsonFile");
      var pagearray = engine.openImageFiles("Json", false, true, false);
      if (pagearray == null) {
            return;
      }
      // page array of treebox files names
      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  addFilesToTreeBox(parent, i, pagearray[i]);
            }
      }
      updateInfoLabel(parent);
      if (par.show_flowchart.val && global.flowchartData != null) {
            flowchartUpdated();
      }
}

function addOneFilesButton(parent, filetype, pageIndex, toolTip)
{
      var filesAdd_Button = new PushButton( parent );
      parent.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = util.formatToolTip(toolTip);
      filesAdd_Button.onClick = function()
      {
            if (par.open_directory.val) {
                  var pagearray = engine.openDirectoryFiles(filetype, par.directory_files.val, false, false);
            } else {
                  var pagearray = engine.openImageFiles(filetype, false, false, false);
            }
            if (pagearray == null) {
                  return;
            }
            if (pagearray.length == 1) {
                  // simple list of file names
                  var imageFileNames = pagearray[0];
                  if (pageIndex == global.pages.LIGHTS && !par.skip_autodetect_imagetyp.val) {
                        var imagetypes = engine.getImagetypFiles(imageFileNames);
                        for (var i = 0; i < global.pages.END; i++) {
                              if (imagetypes[i].length > 0) {
                                    addFilesToTreeBox(parent, i, imagetypes[i]);
                              }
                        }
                  } else {
                        addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  }
            } else {
                  // page array of treebox files names
                  for (var i = 0; i < pagearray.length; i++) {
                        if (pagearray[i] != null) {
                              addFilesToTreeBox(parent, i, pagearray[i]);
                        }
                  }
            }
            updateInfoLabel(parent);
            parent.tabBox.currentPageIndex = pageIndex;
      };
      return filesAdd_Button;
}

function addTargetType(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Target";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give target type.</p>" +
                    "<p>If target type is given then image stretching settings are selected automatically.</p>" +
                    "<p>If no target type is given then current settings are used. They should work reasonably fine in many cases.</p>" +
                    "<p>Galaxy works well when target is a lot brighter than the background.</p>" +
                    "<p>Nebula works well when target fills the whole image or is not much brighter than the background.</p>" +
                    "<p>When non-default target type is selected then stretching option is disabled.</p>";
      
      var targetTypeComboBox = newComboBox(parent, par.target_type, target_type_values, lbl.toolTip);
      parent.rootingArr.push(targetTypeComboBox);
      targetTypeComboBox.onItemSelected = function(itemIndex) {
            targetTypeComboBox.aiParam.val = targetTypeComboBox.aiValarray[itemIndex];
            stretchingComboBox.enabled = itemIndex == 0;
      }

      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( targetTypeComboBox );
      outputdir_Sizer.addStretch();
      parent.rootingArr.push(outputdir_Sizer);

      return outputdir_Sizer;
}

function newTargetSizer(parent)
{
      var target_type_sizer = addTargetType(parent);

      var winprefix_sizer = addWinPrefix(parent);
      var outputdir_sizer = addOutputDir(parent);

      var filesButtons_Sizer2 = new HorizontalSizer;
      parent.rootingArr.push(filesButtons_Sizer2);

      filesButtons_Sizer2.spacing = 4;
      filesButtons_Sizer2.add( target_type_sizer );
      filesButtons_Sizer2.addStretch();
      filesButtons_Sizer2.addSpacing( 12 );
      filesButtons_Sizer2.add( winprefix_sizer );
      filesButtons_Sizer2.add( outputdir_sizer );

      return filesButtons_Sizer2;
}

function addFilesButtons(parent, targetSizer)
{
      var addLightsButton = addOneFilesButton(parent, "Lights", global.pages.LIGHTS, parent.filesToolTip[global.pages.LIGHTS]);
      var addBiasButton = addOneFilesButton(parent, "Bias", global.pages.BIAS, parent.filesToolTip[global.pages.BIAS]);
      var addDarksButton = addOneFilesButton(parent, "Darks", global.pages.DARKS, parent.filesToolTip[global.pages.DARKS]);
      var addFlatsButton = addOneFilesButton(parent, "Flats", global.pages.FLATS, parent.filesToolTip[global.pages.FLATS]);
      var addFlatDarksButton = addOneFilesButton(parent, "Flat Darks", global.pages.FLAT_DARKS, parent.filesToolTip[global.pages.FLAT_DARKS]);

      var directoryCheckBox = newCheckBox(parent, "Directory", par.open_directory, 
                  "<p>Open directory dialog instead of files dialog.</p>" + 
                  "<p>All files that match the file pattern will be added as image files.</p>" +
                  "<p>File pattern can have multiple file types separated by space.</p>");
      var directoryFilesEdit = newTextEdit(parent, par.directory_files, directoryCheckBox.toolTip);
      directoryFilesEdit.setFixedWidth(8 * parent.font.width( 'M' ));

      var filesButtons_Sizer1 = new HorizontalSizer;
      parent.rootingArr.push(filesButtons_Sizer1);
      filesButtons_Sizer1.spacing = 4;
      filesButtons_Sizer1.add( addLightsButton );
      filesButtons_Sizer1.add( addBiasButton );
      filesButtons_Sizer1.add( addDarksButton );
      filesButtons_Sizer1.add( addFlatsButton );
      filesButtons_Sizer1.add( addFlatDarksButton );
      filesButtons_Sizer1.addSpacing( 4 );
      filesButtons_Sizer1.add( directoryCheckBox );
      filesButtons_Sizer1.add( directoryFilesEdit );

      if (ppar.use_single_column || ppar.use_more_tabs) {
            var filesButtons_Sizer = new VerticalSizer;
            parent.rootingArr.push(filesButtons_Sizer);
            filesButtons_Sizer.add( filesButtons_Sizer1 );
            if (!ppar.files_in_tab) {
                  filesButtons_Sizer.add( targetSizer );
            }
            filesButtons_Sizer1.addStretch();
      } else {
            var filesButtons_Sizer = new HorizontalSizer;
            parent.rootingArr.push(filesButtons_Sizer);
            filesButtons_Sizer.add( filesButtons_Sizer1 );
            if ( !ppar.files_in_tab) {
                  filesButtons_Sizer.addSpacing( 12 );
                  filesButtons_Sizer.add( targetSizer );
            }
      }
      return filesButtons_Sizer;
}

function addOneFileManualFilterButton(parent, filetype, pageIndex)
{
      var filesAdd_Button = new PushButton( parent );
      parent.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      if (filetype == 'C') {
            filesAdd_Button.toolTip = "<p>Add color/OSC/DSLR files</p>";
      } else {
            filesAdd_Button.toolTip = "<p>Add " + filetype + " files</p>";
      }
      filesAdd_Button.onClick = function() {
            var imageFileNames = engine.openImageFiles(filetype, true, false, false);
            if (imageFileNames != null) {
                  var filterSet;
                  switch (pageIndex) {
                        case global.pages.LIGHTS:
                              if (global.lightFilterSet == null) {
                                    global.lightFilterSet = util.initFilterSets();
                              }
                              filterSet = util.findFilterSet(global.lightFilterSet, filetype);
                              break;
                        case global.pages.FLATS:
                              if (global.flatFilterSet == null) {
                                    global.flatFilterSet = util.initFilterSets();
                              }
                              filterSet = util.findFilterSet(global.flatFilterSet, filetype);
                              break;
                        default:
                              util.throwFatalError("addOneFileManualFilterButton bad pageIndex " + pageIndex);
                  }
                  console.writeln("addOneFileManualFilterButton add " + filetype + " files");
                  for (var i = 0; i < imageFileNames.length; i++) {
                        util.addFilterSetFile(filterSet, imageFileNames[i], filetype);
                  }
                  addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  updateInfoLabel(parent);
            }
      };
      return filesAdd_Button;
}

function addFileFilterButtons(parent, pageIndex)
{
      var buttonsControl = new Control(parent);
      buttonsControl.sizer = new HorizontalSizer;
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'L', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'R', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'G', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'B', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'H', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'S', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'O', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'C', pageIndex));
      buttonsControl.visible = false;
      return buttonsControl;
}

function addFileFilterButtonSectionBar(parent, pageIndex)
{
      var control = addFileFilterButtons(parent, pageIndex);

      var sb = new SectionBar(parent, "Add filter files manually");
      parent.rootingArr.push(sb);
      sb.setSection(control);
      sb.hide();
      sb.toolTip = "<p>Select manually files for each filter. Useful if filters are not recognized automatically.</p>";
      sb.onToggleSection = function(bar, beginToggle){
            parent.adjustToContents();
      };

      filterSectionbars[pageIndex] = sb;
      filterSectionbarcontrols[pageIndex] = control;

      var gb = new Control( parent );
      parent.rootingArr.push(gb);
      gb.sizer = new VerticalSizer;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

function blink_x(imageWindow, x)
{
      var overflow = false;
      var imageWidth = imageWindow.mainView.image.width;
      var viewportWidth = imageWindow.visibleViewportRect.width;
      var viewportWidth = imageWindow.width;
      var point_x = (imageWidth / 2) - (viewportWidth / 2) + (viewportWidth / 2) * (blink_zoom_x + x);
      if (point_x < 0) {
            point_x = 0;
            overflow = true;
      } else if (point_x > imageWidth) {
            point_x = imageWidth;
            overflow = true;
      }
      return { x: point_x, overflow: overflow, imageWidth: imageWidth, viewportWidth: viewportWidth};
}

function blink_y(imageWindow, y)
{
      var overflow = false;
      var imageHeight = imageWindow.mainView.image.height;
      var viewportHeight = imageWindow.visibleViewportRect.height;
      var viewportHeight = imageWindow.height;
      var point_y = (imageHeight) / 2 - (viewportHeight / 2) + (viewportHeight / 2) * (blink_zoom_y + y);
      if (point_y < 0) {
            point_y = 0;
            overflow = true;
      } else if (point_y > imageHeight) {
            point_y = imageHeight;
            overflow = true;
      }
      return { y: point_y, overflow: overflow, imageHeight: imageHeight, viewportHeight: viewportHeight};
}

function inside_image(imageWindow, x, y)
{
      var new_x = blink_x(imageWindow, x);
      if (new_x.overflow) {
            return false;
      }
      var new_y = blink_y(imageWindow, y);
      if (new_y.overflow) {
            return false;
      }
      return true;
}

function blinkWindowZoomedUpdate(imageWindow, x, y)
{
      console.writeln("blinkWindowZoomedUpdate, x=" + x + ", y=" + y);

      if (inside_image(imageWindow, 0, 0) || inside_image(imageWindow, x, y)) {
            // old or new position is inside image, update position
            blink_zoom_x = blink_zoom_x + x;
            blink_zoom_y = blink_zoom_y + y;
            console.writeln("blinkWindowZoomedUpdate, new blink_zoom_x=" + blink_zoom_x + ", blink_zoom_y=" + blink_zoom_y);
      } else {
            console.writeln("blinkWindowZoomedUpdate, use old blink_zoom_x=" + blink_zoom_x + ", blink_zoom_y=" + blink_zoom_y);
      }

      var point_x = blink_x(imageWindow, 0);
      var point_y = blink_y(imageWindow, 0);

      console.writeln("blinkWindowZoomedUpdate, image.width=" + point_x.imageWidth + ", image.height=" + point_y.imageHeight);
      console.writeln("blinkWindowZoomedUpdate, viewportWidth=" + point_x.viewportWidth + ", viewportHeight=" + point_y.viewportHeight);

      console.writeln("blinkWindowZoomedUpdate, point_x=" + point_x.x + ", point_y=" + point_y.y);
      
      var center = new Point(point_x.x, point_y.y);
      
      imageWindow.zoomFactor = 1;
      imageWindow.viewportPosition = center;
}

function switchtoPreviewTab()
{
      if (global.use_preview && !ppar.preview.side_preview_visible && mainTabBox != null) {
            mainTabBox.currentPageIndex = tab_preview_index;
      }
}

function filesTreeBox(parent, optionsSizer, pageIndex)
{
      parent.treeBoxRootingArr[pageIndex] = [];

      /* Tree box to show files. */
      var files_TreeBox = new TreeBox( parent );
      parent.rootingArr.push(files_TreeBox);
      files_TreeBox.multipleSelection = true;
      files_TreeBox.rootDecoration = false;
      files_TreeBox.alternateRowColor = true;
      files_TreeBox.setScaledMinSize( 150, 150 ); // we could use screen_height but since this is min size a small value should be good
      files_TreeBox.numberOfColumns = 1;
      files_TreeBox.headerVisible = false;
      files_TreeBox.onCurrentNodeUpdated = () =>
      {
            if (par.skip_blink.val) {
                  return;
            }
            try {
                  if (files_TreeBox.currentNode != null && files_TreeBox.currentNode.nodeData_type == "") {
                        // Show preview or "blink" window. 
                        // Note: Files are added by routine addFilteredFilesToTreeBox
                        if (!global.use_preview) {
                              console.hide();
                        } else {
                              updatePreviewTxt("Processing...");
                        }
                        console.writeln("files_TreeBox.onCurrentNodeUpdated " + files_TreeBox.currentNode.filename);
                        var imageWindows = ImageWindow.open(files_TreeBox.currentNode.filename);
                        if (imageWindows == null || imageWindows.length == 0) {
                              return;
                        }
                        var imageWindow = imageWindows[0];
                        if (!global.use_preview) {
                              if (blink_window != null) {
                                    imageWindow.position = blink_window.position;
                              } else {
                                    imageWindow.position = new Point(0, 0);
                              }
                        }
                        if (files_TreeBox.currentNode.hasOwnProperty("ssweight")) {
                              if (files_TreeBox.currentNode.ssweight == 0) {
                                    var ssweighttxt = "";
                              } else {
                                    var ssweighttxt = ", ssweight: " + files_TreeBox.currentNode.ssweight.toFixed(10);
                              }
                        } else {
                              var ssweighttxt = "";
                        }
                        if (files_TreeBox.currentNode.hasOwnProperty("exptime")) {
                              var exptimetxt = ", exptime: " + files_TreeBox.currentNode.exptime;
                        } else {
                              var exptimetxt = "";
                        }
                        var imageInfoTxt = "Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height +
                                             ssweighttxt + exptimetxt;
                        engine.runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, true, null);
                        if (!global.use_preview) {
                              updateImageInfoLabel(imageInfoTxt);
                              if (blink_zoom) {
                                    blinkWindowZoomedUpdate(imageWindow, 0, 0);
                              }
                              imageWindow.show();
                              if (blink_window != null) {
                                    blink_window.forceClose();
                              }
                              blink_window = imageWindow;
                        } else {
                              updatePreviewWinTxt(
                                    imageWindow, 
                                    File.extractName(files_TreeBox.currentNode.filename) + File.extractExtension(files_TreeBox.currentNode.filename));
                              util.updateStatusInfoLabel(imageInfoTxt);
                              imageWindow.forceClose();
                              switchtoPreviewTab();
                        }
                        current_selected_file_name = files_TreeBox.currentNode.filename;
                        current_selected_file_filter = files_TreeBox.currentNode.filter;
                  }
            } catch(err) {
                  console.show();
                  console.criticalln(err);
            }
      }
      parent.treeBox[pageIndex] = files_TreeBox;

      var filesControl = new Control(parent);
      parent.rootingArr.push(filesControl);
      filesControl.sizer = new VerticalSizer;
      filesControl.sizer.add(files_TreeBox);
      filesControl.sizer.addSpacing( 4 );
      if (pageIndex == global.pages.LIGHTS || pageIndex == global.pages.FLATS) {
            let obj = addFileFilterButtonSectionBar(parent, pageIndex);
            parent.rootingArr.push(obj);
            filesControl.sizer.add(obj);
      }

      var files_GroupBox = new GroupBox( parent );
      files_GroupBox.sizer = new HorizontalSizer;
      files_GroupBox.sizer.spacing = 4;
      files_GroupBox.sizer.add( filesControl, parent.textEditWidth );
      files_GroupBox.sizer.add( optionsSizer );

      return files_GroupBox;
}

function appendInfoTxt(txt, cnt, type)
{
      if (cnt == 0) {
            return txt;
      }
      var newtxt = cnt + " " + type + " files";
      if (txt == "") {
            return newtxt;
      } else {
            return txt + ", " + newtxt;
      }
}

function updateInfoLabel(parent)
{
      var txt = "";
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[global.pages.LIGHTS]), "light");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[global.pages.BIAS]), "bias");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[global.pages.DARKS]), "dark");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[global.pages.FLATS]), "flat");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[global.pages.FLAT_DARKS]), "flat dark");

      console.writeln(txt);

      infoLabel.text = txt;
}

function updateImageInfoLabel(txt)
{
      console.writeln(txt);

      imageInfoLabel.text = txt;
}

// Write default parameters to process icon
function saveParametersToProcessIcon()
{
      console.writeln("saveParametersToProcessIcon");
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  var name = util.mapBadChars(param.name);
                  console.writeln(name + "=" + param.val);
                  Parameters.set(name, param.val);
            }
      }
}

// Save default parameters to persistent module settings
function saveParametersToPersistentModuleSettings()
{
      if (global.do_not_write_settings) {
            console.writeln("Do not save parameter values persistent module settings");
            return;
      }
      console.writeln("saveParametersToPersistentModuleSettings");
      for (let x in par) {
            var param = par[x];
            var name = SETTINGSKEY + '/' + util.mapBadChars(param.name);
            if (param.val != param.def) {
                  // not a default value, save setting
                  console.writeln("AutoIntegrate: save to settings " + name + "=" + param.val);
                  switch (param.type) {
                        case 'S':
                              Settings.write(name, DataType_String, param.val);
                              break;
                        case 'B':
                              Settings.write(name, DataType_Boolean, param.val);
                              break;
                        case 'I':
                              Settings.write(name, DataType_Int32, param.val);
                              break;
                        case 'R':
                              Settings.write(name, DataType_Real32, param.val);
                              break;
                        default:
                              util.throwFatalError("Unknown type '" + param.type + '" for parameter ' + name);
                              break;
                  }
                  if (param.oldname != undefined) {
                        // remove old name
                        Settings.remove(SETTINGSKEY + '/' + util.mapBadChars(param.oldname));
                  }
            } else {
                  // default value, remove possible setting
                  Settings.remove(name);
            }
      }
}

function newPushOrToolButton(parent, icon, txt, tooltip, action, toolbutton)
{
      if (toolbutton) {
            var button = new ToolButton( parent );
      } else {
            var button = new PushButton( parent );
            button.text = txt;
      }
      button.onClick = action;
      if (icon) {
            button.icon = parent.scaledResource( icon );
      }
      button.toolTip = util.formatToolTip(tooltip);

      return button;
}

function runAction(parent)
{
      console.writeln("Run button pressed");
      exitFromDialog();
      if (global.ai_get_process_defaults) {
            engine.getProcessDefaultValues();
            return;
      }
      if (par.integrated_lights.val) {
            console.criticalln("Cannot use Run button with Integrated lights option, Autocontinue button must be used.");
            return;
      }
      preview_image = null;
      preview_images = [];
      updateWindowPrefix();
      getFilesFromTreebox(parent.dialog);
      global.haveIconized = 0;
      var index = findPrefixIndex(ppar.win_prefix);
      if (index == -1) {
            index = findNewPrefixIndex(ppar.userColumnCount == -1);
      }
      if (ppar.userColumnCount == -1) {
            global.columnCount = ppar.prefixArray[index][0];
            console.writeln('Using auto icon column ' + global.columnCount);
      } else {
            global.columnCount = ppar.userColumnCount;
            console.writeln('Using user icon column ' + global.columnCount);
      }
      global.iconStartRow = 0;
      global.write_processing_log_file = true;
      Autorun(parent);
      if (global.haveIconized) {
            // We have iconized something so update prefix array
            ppar.prefixArray[index] = [ global.columnCount, ppar.win_prefix, global.haveIconized ];
            fix_win_prefix_array();
            if (ppar.userColumnCount != -1 && par.use_manual_icon_column.val) {
                  ppar.userColumnCount = global.columnCount + 1;
                  parent.dialog.columnCountControlComboBox.currentItem = ppar.userColumnCount + 1;
            }
            savePersistentSettings(false);
      }
}

function newRunButton(parent, toolbutton)
{
      var local_run_action = function()
      {
            if (!global.get_flowchart_data) {
                  runAction(parent);
            }
      };
      return newPushOrToolButton(
                  parent,
                  ":/icons/power.png",
                  "Run",
                  "Run the script.",
                  local_run_action,
                  toolbutton
      );
}

function newExitButton(parent, toolbutton)
{
      var exit_action = function()
      {
            console.noteln("AutoIntegrate exiting");
            // save settings at the end
            savePersistentSettings(true);
            exitFromDialog();
            close_undo_images();
            exitCleanup(parent.dialog);
            console.noteln("Close dialog");
            parent.dialog.cancel();
      };

      return newPushOrToolButton(
                  parent,
                  ":/icons/close.png",
                  "Exit",
                  "<p>Exit the script and save interface settings.</p>" + 
                  "<p>Note that closing the script from top right corner close icon does not save interface settings.</p>",
                  exit_action,
                  toolbutton
      );
}

function newCancelButton(parent, toolbutton)
{
      var cancel_action = function()
      {
            if (global.is_processing != global.processing_state.none) {
                  console.noteln("Cancel requested...");
                  global.cancel_processing = true;
            }
      };

      return newPushOrToolButton(
                  parent,
                  ":/icons/cancel.png",
                  "Cancel",
                  "<p>Cancel the current script run.</p>" + 
                  "<p>Current processing is canceled as soon as control returns to the script.</p>",
                  cancel_action,
                  toolbutton
      );
}

function newAutoContinueButton(parent, toolbutton)
{
      var autocontinue_action = function()
      {
            exitFromDialog();
            console.writeln("Start AutoContinue");

            // Do not create subdirectory structure with AutoContinue

            preview_image = null;
            preview_images = [];
            util.clearDefaultDirs();
            getFilesFromTreebox(parent.dialog);
            if (isbatchNarrowbandPaletteMode() && engine.autocontinueHasNarrowband()) {
                  var batch_narrowband_palette_mode = true;
            } else {
                  var batch_narrowband_palette_mode = false;
            }
            
            global.haveIconized = 0;
            global.write_processing_log_file = true;
            try {
                  updateWindowPrefix();
                  global.run_auto_continue = true;
                  if (batch_narrowband_palette_mode) {

                        engine.autointegrateNarrowbandPaletteBatch(parent.dialog, true);

                  } else {
                        var index = findPrefixIndex(ppar.win_prefix);
                        if (index == -1) {
                              global.iconStartRow = 0;
                              index = findNewPrefixIndex(ppar.userColumnCount == -1);
                        } else {
                              // With AutoContinue start icons below current
                              // icons.
                              global.iconStartRow = ppar.prefixArray[index][2];
                        }
                        if (ppar.userColumnCount == -1) {
                              global.columnCount = ppar.prefixArray[index][0];
                              console.writeln('Using auto icon column ' + global.columnCount);
                        } else {
                              global.columnCount = ppar.userColumnCount;
                              global.iconStartRow = 11;
                              console.writeln('Using user icon column ' + global.columnCount);
                        }
                        engine.flowchartReset();

                        engine.autointegrateProcessingEngine(parent.dialog, true, util.is_narrowband_option(), "AutoContinue");

                  }
                  global.run_auto_continue = false;
                  util.setDefaultDirs();
                  update_extra_target_image_window_list(null);
                  if (global.haveIconized && !batch_narrowband_palette_mode) {
                        // We have iconized something so update prefix array
                        ppar.prefixArray[index] = [ global.columnCount, ppar.win_prefix, Math.max(global.haveIconized, global.iconStartRow) ];
                        fix_win_prefix_array();
                        //parent.columnCountControlComboBox.currentItem = global.columnCount + 1;
                        savePersistentSettings(false);
                  }
            }
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  engine.writeProcessingStepsAndEndLog(null, true, null, true);
                  global.run_auto_continue = false;
                  global.is_processing = global.processing_state.none;
                  util.setDefaultDirs();
                  fix_win_prefix_array();
            }
      };

      var autocontinueToolTip =
      "AutoContinue - Run automatic processing from previously created LRGB, narrowband or Color images." +
      "<p>Image check order is:</p>" +
      "<ol>" +
      "<li>AutoLRGB or AutoRGB - Final image for extra processing</li>" +
      "<li>L_HT + RGB_HT - Manually stretched L and RGB images.</li>" +
      "<li>RGB_HT - Manually stretched RGB image</li>" +
      "<li>Integration_<i>filter</i>_<i>GCext</i> - Gradient corrected integrated channel images</li>" +
      "<li>Integration_RGB_<i>GCext</i> - Gradient corrected integrated color RGB image</li>" +
      "<li>Integration_<i>filter</i> - Integrated channel images</li>" +
      "<li>Integration_RGB - Integrated RGB image</li>" +
      "</ol>" +
      "<p>" +
      "<i>filter</i> = Mono camera filter name, one of L, R, G, B, H, S or O.<br>" +
      "<i>GCext</i> = Gradient Corrected image, for example manual DBE or GraXpert is run on image. Postfix can be _CG _ABE, _DBE or _GraXpert." +
      "</p>" +
      "<p>" +
      "Note that it is possible to load integrated light images also to the file list. " +
      "File list images are used when:" +
      "<ul>" +
      "<li><i>Integrated lights</i> option in Files tab is checked</li>" +
      "<li>A filter has only one image</li>" +
      "<li>No matching desktop image is found</li>" +
      "</ul>" +
      "<p>" +
      "Using the file list can be useful for example when using integrated lights from WBPP as there is no need to rename images." +
      "</p>";


      return newPushOrToolButton(
            parent,
            ":/icons/goto-next.png",
            "AutoContinue",
            autocontinueToolTip,
            autocontinue_action,
            toolbutton
      );
}

function newAdjustToContentButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/toolbar/preview-reset.png" );
      button.toolTip = "<p>Adjust script window to content.</p>";
      button.onClick = function()
      {
            parent.adjustToContents();
      };
      return button;
}


var sectionBarControls = [];
var sectionBars = [];

function newCollapeSectionsButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/process-interface/contract-vert.png" );
      button.toolTip = "<p>Collapse all sections.</p>" + 
                       "<p>Useful when you have trouble to fit the dialog to the screen.</p>" + 
                       "<p>Note that to adjust script window to content you may need to click  " + 
                       "the separate Adjust button.</p>";
      button.onClick = function()
      {
            if (0) {
                  for (var i = 0; i < sectionBarControls.length; i++) {
                        sectionBarControls[i].hide();
                  }
                  parent.adjustToContents();
            } else {
                  for (var i = 0; i < sectionBars.length; i++) {
                        sectionBars[i].aiControl.hide();
                        if (!global.do_not_write_settings) {
                              Settings.write(sectionBars[i].aiName, DataType_Boolean, sectionBars[i].aiControl.visible);
                        }
                        parent.adjustToContents();
                  }
            }
      };
      return button;
}

function blinkArrowButton(parent, icon, x, y)
{
      var blinkArrowButton = new ToolButton( parent );
      parent.rootingArr.push(blinkArrowButton);
      blinkArrowButton.icon = parent.scaledResource(icon);
      blinkArrowButton.toolTip = "<p>Blink window move zoomed area</p>";
      blinkArrowButton.setScaledFixedSize( 20, 20 );
      blinkArrowButton.onClick = function()
      {
            if (par.skip_blink.val) {
                  return;
            }
            if (blink_window != null && blink_zoom) {
                  console.writeln("blinkArrowButton");
                  blinkWindowZoomedUpdate(blink_window, x, y);
            }
      };
      return blinkArrowButton;
}

function newJsonSizer(parent)
{
      // Load and save
      var jsonLabel = new Label( parent );
      parent.rootingArr.push(jsonLabel);
      jsonLabel.text = "Setup file";
      jsonLabel.toolTip = "<p>Reading script setup from a file, saving script setup to a file.</p>";
      jsonLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      
      var jsonLoadButton = new ToolButton( parent );
      parent.rootingArr.push(jsonLoadButton);
      jsonLoadButton.icon = parent.scaledResource(":/icons/select-file.png");
      jsonLoadButton.toolTip = "<p>Read script setup from a Json file.</p>";
      jsonLoadButton.setScaledFixedSize( 20, 20 );
      jsonLoadButton.onClick = function()
      {
            loadJsonFile(parent.dialog);
      };
      let add_jsonSaveButton = false;     // not used, save with settings button is always used
      if (add_jsonSaveButton) {
            var jsonSaveButton = new ToolButton( parent );
            parent.rootingArr.push(jsonSaveButton);
            jsonSaveButton.icon = parent.scaledResource(":/icons/save.png");
            jsonSaveButton.toolTip = "<p>Save file lists to a Json file including checked status.</p><p>Image names from all pages are saved including light and calibration files.</p>";
            jsonSaveButton.setScaledFixedSize( 20, 20 );
            jsonSaveButton.onClick = function()
            {
                  util.saveJsonFile(parent.dialog, false);
            };
      }
      var jsonSaveWithSettingsButton = new ToolButton( parent );
      parent.rootingArr.push(jsonSaveWithSettingsButton);
      jsonSaveWithSettingsButton.icon = parent.scaledResource(":/toolbar/file-project-save.png");
      jsonSaveWithSettingsButton.toolTip = "<p>Save current settings and file lists to a Json file. All non-default settings are saved. " + 
                                            "Current window prefix and output directory is also saved.</p>" + 
                                            "<p>Images names from all pages are saved including light and calibration files. Checked status for files is saved</p>";
      jsonSaveWithSettingsButton.setScaledFixedSize( 20, 20 );
      jsonSaveWithSettingsButton.onClick = function()
      {
            util.saveJsonFile(parent.dialog, true);
      };

      var jsonSizer = new HorizontalSizer;
      parent.rootingArr.push(jsonSizer);
      jsonSizer.add( jsonLabel );
      jsonSizer.add( jsonLoadButton );
      if (add_jsonSaveButton) {
            jsonSizer.add( jsonSaveButton );
      }
      jsonSizer.add( jsonSaveWithSettingsButton );

      return jsonSizer;
}

function newMaximizeDialogButton(parent)
{
      var maxDialogButton = new ToolButton( parent );
      maxDialogButton.icon = parent.scaledResource( ":/real-time-preview/full-view.png" );

      var maxDialogToolTip = "<p>Maximize dialog size to (almost) full screen.</p>" +
                             "<p>Note that the maximizing works best when the side preview is enabled in the Interface section.</p>";

      maxDialogButton.setScaledFixedSize( 20, 20 );
      maxDialogButton.toolTip = maxDialogToolTip;
      maxDialogButton.onClick = function()
      {
            if (dialog_mode == 0) {
                  // minimized, do nothing
                  return;
            }
            if (!global.use_preview) {
                  console.criticalln("No preview, cannot maximize.");
                  return;
            }
            if (dialog_mode == 2) {   // restore
                  maxDialogButton.icon = parent.scaledResource( ":/real-time-preview/full-view.png" );
                  maxDialogButton.toolTip = maxDialogToolTip;
                  if (ppar.preview.side_preview_visible) {
                        sidePreviewControl.setSize(ppar.preview.side_preview_width, ppar.preview.side_preview_height);
                  } else {
                        tabPreviewControl.setSize(ppar.preview.preview_width, ppar.preview.preview_height);
                  }
                  parent.dialog.move(dialog_old_position);
                  dialog_mode = 1;
            } else if (dialog_mode == 1) {
                  // maximize
                  // calculate starting point for maximized dialog size
                  maxDialogButton.icon = parent.scaledResource( ":/image-window/fit-view-active.png" );
                  maxDialogButton.toolTip = "Restore dialog to a normal size.";
                  if (ppar.preview.side_preview_visible) {
                        var preview_width = ppar.preview.side_preview_width;
                        var preview_height = ppar.preview.side_preview_height;
                        var preview_control_width = sidePreviewControl.width;
                        var preview_control_height = sidePreviewControl.height;
                  } else {
                        // tab preview
                        var preview_width = ppar.preview.preview_width;
                        var preview_height = ppar.preview.preview_height;
                        var preview_control_width = tabPreviewControl.width;
                        var preview_control_height = tabPreviewControl.height;
                  }
                  if (!ppar.preview.show_histogram) {
                        var histogram_control_height = 0;
                  } else if (ppar.preview.side_preview_visible) {
                        var histogram_control_height = sideHistogramControl.height;
                  } else {
                        var histogram_control_height = tabHistogramControl.height;
                  }

                  var emptyAreaHeight = mainTabBox.height - preview_control_height - histogram_control_height;
                  if (emptyAreaHeight < 0) {
                        emptyAreaHeight = 0;
                  }
                  var dialog_width = parent.dialog.width;
                  var dialog_height = parent.dialog.height;
                  var max_preview_width = preview_width + (screen_width - dialog_width) - (preview_control_width - preview_width) - 100;
                  var max_preview_height = preview_height + (screen_height - dialog_height) + emptyAreaHeight - (preview_control_height - preview_height) - 100;

                  var preview_size = util.adjustDialogToScreen(
                                          parent.dialog, 
                                          ppar.preview.side_preview_visible
                                                ? sidePreviewControl
                                                : tabPreviewControl,
                                          true,       // maximize
                                          max_preview_width, 
                                          max_preview_height);

                  dialog_old_position = parent.dialog.position;   // save old position so we can restore it
                  parent.dialog.move(10, 10);                     // move to top left corner
                  dialog_mode = 2;

                  // console.writeln("preview width overhead " + (preview_control_width - preview_width) + ", height overhead " + (preview_control_height - preview_height));
                  console.writeln("Maximize dialog: screen " + screen_width + "x" + screen_height + ", dialog " + dialog_width + "x" + dialog_height + ", preview " + preview_width + "x" + preview_height + 
                                  ", max preview " + preview_size.width + "x" + preview_size.height);

            }
            parent.dialog.adjustToContents();
            util.runGarbageCollection();
      };

      return maxDialogButton;
}

function newMinimizeDialogButton(parent)
{
      var minDialogButton = new ToolButton( parent );
      minDialogButton.icon = parent.scaledResource( ":/workspace/window-iconize.png" );

      minDialogButton.setScaledFixedSize( 20, 20 );
      var minDialogToolTip = "Minimize dialog to a minimum size.";
      minDialogButton.toolTip = minDialogToolTip;
      minDialogButton.onClick = function()
      {
            if (dialog_mode == 2) {
                  // maximized, do nothing
                  return;
            }
            if (dialog_mode == 0) {   // restore
                  dialog_min_position = parent.dialog.position;    // save old position so we can restore it
                  minDialogButton.icon = parent.scaledResource( ":/workspace/window-iconize.png" );
                  minDialogButton.toolTip = minDialogToolTip;
                  if (global.use_preview) {
                        if (ppar.preview.side_preview_visible) {
                              sidePreviewControl.show();
                              if (sideHistogramControl != null) {
                                    sideHistogramControl.show();
                              }
                        }
                  }
                  if (ppar.files_in_tab) {
                        parent.top2ndRowControl.show();
                  }
                  mainTabBox.show();
                  parent.dialog.move(dialog_old_position);
                  dialog_mode = 1;
            } else if (dialog_mode == 1) {
                  // minimize
                  minDialogButton.icon = parent.scaledResource( ":/workspace/window-maximize.png" );
                  minDialogButton.toolTip = "Restore dialog to normal size.";
                  dialog_old_position = parent.dialog.position;    // save old position so we can restore it
                  if (global.use_preview) {
                        if (ppar.preview.side_preview_visible) {
                              sidePreviewControl.hide();
                              if (sideHistogramControl != null) {
                                    sideHistogramControl.hide();
                              }
                        }
                  }
                  mainTabBox.hide();
                  if (ppar.files_in_tab) {
                        parent.top2ndRowControl.hide();
                  }
                  if (dialog_min_position == null) {
                        parent.dialog.move(Math.floor(screen_width / 2), Math.floor(screen_height / 2)); // move to center of screen
                  } else {
                        parent.dialog.move(dialog_min_position);
                  }
                  dialog_mode = 0;
            }
            minDialogButton.aiminDialogMode = !minDialogButton.aiminDialogMode;
            parent.dialog.adjustToContents();
            util.runGarbageCollection();
      };

      return minDialogButton;
}

function newActionSizer(parent)
{
      var actionsSizer = new HorizontalSizer;
      parent.rootingArr.push(actionsSizer);

      let obj = newLabel(parent, "Actions", "Script actions, these are the same as in the bottom row of the script.");
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = newCancelButton(parent, true);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = newAutoContinueButton(parent, true);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = newRunButton(parent, true);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );

      obj = newExitButton(parent, true);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 12 );

      obj = newCollapeSectionsButton(parent);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = newAdjustToContentButton(parent);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 12 );

      obj = newMinimizeDialogButton(parent);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );

      obj = newMaximizeDialogButton(parent);
      parent.rootingArr.push(obj);
      actionsSizer.add( obj );

      return actionsSizer;
}

function newPageButtonsSizer(parent, jsonSizer, actionSizer)
{
      if (!global.use_preview) {
            // Blink
            var blinkLabel = new Label( parent );
            parent.rootingArr.push(blinkLabel);
            blinkLabel.text = "Blink";
            blinkLabel.toolTip = "<p>Blink zoom control.</p><p>You can blink images by clicking them in the image list.</p>";
            blinkLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

            var blinkFitButton = new ToolButton( parent );
            parent.rootingArr.push(blinkFitButton);
            blinkFitButton.icon = parent.scaledResource(":/toolbar/view-zoom-optimal-fit.png");
            blinkFitButton.toolTip = "<p>Blink window zoom to optimal fit</p>";
            blinkFitButton.setScaledFixedSize( 20, 20 );
            blinkFitButton.onClick = function()
            {
                  if (par.skip_blink.val) {
                        return;
                  }
                  if (blink_window != null) {
                        blink_window.zoomToOptimalFit();
                        blink_zoom = false;
                  }
            };
            var blinkZoomButton = new ToolButton( parent );
            parent.rootingArr.push(blinkZoomButton);
            blinkZoomButton.icon = parent.scaledResource(":/icons/zoom-1-1.png");
            blinkZoomButton.toolTip = "<p>Blink window zoom to 1:1</p>";
            blinkZoomButton.setScaledFixedSize( 20, 20 );
            blinkZoomButton.onClick = function()
            {
                  if (par.skip_blink.val) {
                        return;
                  }
                  if (blink_window != null) {
                        blink_zoom = true;
                        blink_zoom_x = 0;
                        blink_zoom_y = 0;
                        blinkWindowZoomedUpdate(blink_window, 0, 0);
                  }
            };
            var blinkLeft = blinkArrowButton(parent, ":/icons/arrow-left.png", -1, 0);
            var blinkRight = blinkArrowButton(parent, ":/icons/arrow-right.png", 1, 0);
            var blinkUp = blinkArrowButton(parent, ":/icons/arrow-up.png", 0, -1);
            var blinkDown = blinkArrowButton(parent, ":/icons/arrow-down.png", 0, 1);
      }
      var currentPageLabel = new Label( parent );
      parent.rootingArr.push(currentPageLabel);
      currentPageLabel.text = "Current page";
      currentPageLabel.toolTip = "<p>Operations on the current page.</p>";
      currentPageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

      var currentPageCheckButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCheckButton);
      currentPageCheckButton.icon = parent.scaledResource(":/icons/check.png");
      currentPageCheckButton.toolTip = "<p>Mark all files in the current page as checked.</p>";
      currentPageCheckButton.setScaledFixedSize( 20, 20 );
      currentPageCheckButton.onClick = function()
      {
            checkAllTreeBoxFiles(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex]);
      };
      var currentPageClearButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageClearButton);
      currentPageClearButton.icon = parent.scaledResource(":/icons/clear.png");
      currentPageClearButton.toolTip = "<p>Clear the list of input images in the current page.</p>";
      currentPageClearButton.setScaledFixedSize( 20, 20 );
      currentPageClearButton.onClick = function()
      {
            var pageIndex = parent.tabBox.currentPageIndex;
            parent.treeBox[pageIndex].clear();
            updateInfoLabel(parent);
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS) {
                  global.user_selected_best_image = null;
                  global.user_selected_reference_image = [];
                  global.star_alignment_image = null;
                  global.lightFilterSet = null;
            }
            if (parent.tabBox.currentPageIndex == global.pages.FLATS) {
                  global.flatFilterSet = null;
            }
      };

      var currentPageRemoveSelectedButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageRemoveSelectedButton);
      currentPageRemoveSelectedButton.icon = parent.scaledResource(":/icons/remove.png");
      currentPageRemoveSelectedButton.toolTip = "<p>Remove unchecked images in the current page.</p>";
      currentPageRemoveSelectedButton.setScaledFixedSize( 20, 20 );
      currentPageRemoveSelectedButton.onClick = function()
      {
            var pageIndex = parent.tabBox.currentPageIndex;
            var treebox = parent.treeBox[pageIndex];
            // get checked files and unchecked files
            var checked_files = [];
            var unchecked_files = [];
            getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
            getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS) {
                  // find global.user_selected_best_image from unchecked files
                  if (global.user_selected_best_image != null) {
                        var index = unchecked_files.indexOf(global.user_selected_best_image);
                        if (index != -1) {
                              // clear best image
                              global.user_selected_best_image = null;
                        }
                  }
                  // remove unchecked files from global.user_selected_reference_image array
                  for (var i = 0; i < unchecked_files.length; i++) {
                        remove_user_selected_reference_image(unchecked_files[i], null);
                  }
                  // find global.star_alignment_image from unchecked files
                  if (global.star_alignment_image != null) {
                        var index = unchecked_files.indexOf(global.star_alignment_image);
                        if (index != -1) {
                              // clear star alignment image
                              global.star_alignment_image = null;
                        }
                  }
                  // find unchecked files from global.lightFilterSet
                  if (global.lightFilterSet != null) {
                        for (var i = 0; i < unchecked_files.length; i++) {
                              util.removeFilterFile(global.lightFilterSet, unchecked_files[i]);
                        }
                  }
            }
            if (parent.tabBox.currentPageIndex == global.pages.FLATS) {
                  // find unchecked files from global.flatFilterSet
                  if (global.flatFilterSet != null) {
                        for (var i = 0; i < unchecked_files.length; i++) {
                              util.removeFilterFile(global.flatFilterSet, unchecked_files[i]);
                        }
                  }
            }
            // add checked files back
            treebox.clear();
            var treeboxfiles = [];
            filenamesToTreeboxfiles(treeboxfiles, checked_files, true);
            addFilesToTreeBox(parent, pageIndex, treeboxfiles);
            updateInfoLabel(parent);
      };

      var currentPageCollapseButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCollapseButton);
      currentPageCollapseButton.icon = parent.scaledResource(":/browser/collapse.png");
      currentPageCollapseButton.toolTip = "<p>Collapse all sections in the current page.</p>";
      currentPageCollapseButton.setScaledFixedSize( 20, 20 );
      currentPageCollapseButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], false);
      };
      var currentPageExpandButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageExpandButton);
      currentPageExpandButton.icon = parent.scaledResource(":/browser/expand.png");
      currentPageExpandButton.toolTip = "<p>Expand all sections in the current page.</p>";
      currentPageExpandButton.setScaledFixedSize( 20, 20 );
      currentPageExpandButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], true);
      };
      var currentPageFilterButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageFilterButton);
      currentPageFilterButton.icon = parent.scaledResource(":/icons/filter.png");
      currentPageFilterButton.toolTip = "<p>Filter and sort files based on current weighting and filtering settings. Only checked files are used. " +
                                        "Without any filtering rules files are just sorted by weighting setting.</p>";
      currentPageFilterButton.setScaledFixedSize( 20, 20 );
      currentPageFilterButton.onClick = function()
      {
            filterTreeBoxFiles(parent.dialog, parent.dialog.tabBox.currentPageIndex);
      };

      var bestImageLabel = newLabel( parent, "Reference images", "Selecting the reference images for star alignment, image integration and local normalization.");

      var setBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(setBestImageButton);
      setBestImageButton.icon = parent.scaledResource(":/icons/ok-button.png");
      setBestImageButton.toolTip = "<p>Set current preview/selected image as the reference image for star alignment.</p>";
      setBestImageButton.setScaledFixedSize( 20, 20 );
      setBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS && current_selected_file_name != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], current_selected_file_name, "");
            }
      };

      var setReferenceImageButton = new ToolButton( parent );
      parent.rootingArr.push(setReferenceImageButton);
      setReferenceImageButton.icon = parent.scaledResource(":/icons/item.png");
      setReferenceImageButton.toolTip = "<p>Set current preview/selected image as the reference image for current filter for image integration and local normalization.</p>";
      setReferenceImageButton.setScaledFixedSize( 20, 20 );
      setReferenceImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS && current_selected_file_name != null) {
                  setReferenceImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], current_selected_file_name, "", current_selected_file_filter);
            }
      };

      var clearBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(clearBestImageButton);
      clearBestImageButton.icon = parent.scaledResource(":/browser/disable.png");
      clearBestImageButton.toolTip = "<p>Clear all reference image settings.</p>";
      clearBestImageButton.setScaledFixedSize( 20, 20 );
      clearBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS) {
                  setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], null, "");
                  setReferenceImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], null, "", null);
                  global.user_selected_best_image = null;
                  global.user_selected_reference_image = [];
                  global.star_alignment_image = null;
            }
      };

      var findBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(findBestImageButton);
      findBestImageButton.icon = parent.scaledResource(":/icons/find.png");
      findBestImageButton.toolTip = "<p>Find reference images based on SSWEIGHT.</p>" + 
                                    "<p>This will overwrite all current reference image selections.</p>";
      findBestImageButton.setScaledFixedSize( 20, 20 );
      findBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == global.pages.LIGHTS) {
                  if (findBestImageFromTreeBoxFiles(parent.treeBox[global.pages.LIGHTS])) {
                        // Best files are set into global.user_selected_best_image and global.user_selected_reference_image
                        setBestImageInTreeBox(
                              parent, 
                              parent.treeBox[global.pages.LIGHTS], 
                              global.user_selected_best_image,
                              "");
                        for (var i = 0; i < global.user_selected_reference_image.length; i++)  {
                              setReferenceImageInTreeBox(
                                    parent, 
                                    parent.treeBox[global.pages.LIGHTS], 
                                    global.user_selected_reference_image[i][0],
                                    "",
                                    global.user_selected_reference_image[i][1]);
                        }
                  }
            }
      };

      var buttonsSizer = new HorizontalSizer;
      parent.rootingArr.push(buttonsSizer);
      buttonsSizer.spacing = 4;

      if (!global.use_preview) {
            buttonsSizer.add( blinkLabel );
            buttonsSizer.add( blinkFitButton );
            buttonsSizer.add( blinkZoomButton );
            buttonsSizer.add( blinkLeft );
            buttonsSizer.add( blinkRight );
            buttonsSizer.add( blinkUp );
            buttonsSizer.add( blinkDown );
            buttonsSizer.addSpacing( 12 );
      }

      if (!ppar.files_in_tab) {
            buttonsSizer.add( jsonSizer );
            buttonsSizer.addSpacing( 12 );
      }

      buttonsSizer.add( currentPageLabel );
      buttonsSizer.add( currentPageCheckButton );
      buttonsSizer.add( currentPageClearButton );
      buttonsSizer.add( currentPageRemoveSelectedButton );
      buttonsSizer.add( currentPageCollapseButton );
      buttonsSizer.add( currentPageExpandButton );
      buttonsSizer.add( currentPageFilterButton );

      buttonsSizer.addSpacing( 12 );
      buttonsSizer.add( bestImageLabel );
      buttonsSizer.add( setBestImageButton );
      buttonsSizer.add( setReferenceImageButton );
      buttonsSizer.add( clearBestImageButton );
      buttonsSizer.add( findBestImageButton );

      buttonsSizer.addStretch();
      if (actionSizer) {
            buttonsSizer.add( actionSizer );
      }

      return buttonsSizer;
}

function getSectionVisible(name, control)
{
      if (global.do_not_read_settings) {
            return;
      }
      var tempSetting = Settings.read(name, DataType_Boolean);
      if (Settings.lastReadOK) {
            // console.writeln("AutoIntegrate: read from settings " + name + "=" + tempSetting);
            control.visible = tempSetting;
      }
}

function newGroupBoxSizer(parent)
{
      var gb = new newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 4;
      gb.sizer.spacing = 4;

      return gb;
}

function newSectionBarAdd(parent, groupbox, control, title, name)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!global.do_not_write_settings) {
                  Settings.write(name, DataType_Boolean, control.visible);
            }
            parent.adjustToContents();
      };
      sb.aiControl = control;
      sb.aiName = name;
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );

      sectionBarControls.push(control);
      sectionBars.push(sb);
}

function newSectionBarAddArray(parent, groupbox, title, name, objarray)
{
      var ProcessingControl = new Control( parent );
      ProcessingControl.sizer = new VerticalSizer;
      ProcessingControl.sizer.margin = 6;
      ProcessingControl.sizer.spacing = 4;
      for (var i = 0; i < objarray.length; i++) {
            ProcessingControl.sizer.add( objarray[i] );
      }
      // hide this section by default
      ProcessingControl.visible = false;

      parent.rootingArr.push(ProcessingControl);

      newSectionBarAdd(parent, groupbox, ProcessingControl, title, name);
}

function getWindowBitmap(imgWin)
{
      return util.getWindowBitmap(imgWin);
}

function newPreviewObj(parent, side_preview)
{
      if (side_preview) {
            var newPreviewControl = new AutoIntegratePreviewControl(parent, util, global, ppar.preview.side_preview_width, ppar.preview.side_preview_height);
      } else {
            var newPreviewControl = new AutoIntegratePreviewControl(parent, util, global, ppar.preview.preview_width, ppar.preview.preview_height);
      }

      var previewImageSizer = new Sizer();
      previewImageSizer.add(newPreviewControl);

      if (0) {
            var newPreviewInfoLabel = new Label( parent );
            newPreviewInfoLabel.text = "<b>Preview</b> No preview";
            newPreviewInfoLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            newPreviewInfoLabel.useRichText = true;
      } else {
            var newPreviewInfoLabel = null;
      }

      var newStatusInfoLabel = new Label( parent );
      newStatusInfoLabel.text = "";
      newStatusInfoLabel.textAlignment = TextAlign_VertCenter;

      var previewSizer = new VerticalSizer;
      previewSizer.margin = 6;
      previewSizer.spacing = 10;
      if (newPreviewInfoLabel) {
            previewSizer.add(newPreviewInfoLabel);
      }
      previewSizer.add(newStatusInfoLabel);
      previewSizer.add(previewImageSizer);

      // updatePreviewNoImageInControl(newPreviewControl); Done after adjustDialogToScreen

      return { control: newPreviewControl, infolabel: newPreviewInfoLabel, 
               statuslabel: newStatusInfoLabel, sizer: previewSizer };
}

function newHistogramControl(parent, side_preview)
{
      if (!ppar.preview.show_histogram) {
            return null;
      }
      if (side_preview) {
            var width = ppar.preview.side_preview_width;
            var height = ppar.preview.side_histogram_height;
      } else {
            var width = ppar.preview.preview_width;
            var height = ppar.preview.histogram_height;
      }
      var histogramViewControl = new Control(parent);
      histogramViewControl.scaledMinWidth = width;
      histogramViewControl.scaledMinHeight = height;

      var bitmap = new Bitmap(width, height);
      var graphics = new VectorGraphics(bitmap);
      setHistogramBitmapBackground(graphics, side_preview);
      graphics.end();
      histogramViewControl.aiInfo = { bitmap: bitmap, scaledValues: null, cumulativeValues: null, percentageValues: null };
      histogramViewControl.onPaint = function(x0, y0, x1, y1) {
            var graphics = new VectorGraphics(this);
            graphics.antialiasing = true;
            graphics.drawBitmap(0, 0, this.aiInfo.bitmap);
            graphics.end();
      };
      histogramViewControl.onMousePress = function(x, y, buttonState, modifiers) {
            // console.writeln("histogramViewControl.onMousePress " + x + ", " + y);
            if (x >= 0 && x < this.aiInfo.bitmap.width && y >= 0 && y < this.aiInfo.bitmap.height) {
                  this.aiLabelX.text = "x: " + (x / this.aiInfo.bitmap.width).toFixed(4);
                  this.aiLabelX.toolTip = "<p>X coordinate value.</p>";
                  this.aiLabelY.text = "y: " + (1 - y / this.aiInfo.bitmap.height).toFixed(4);
                  this.aiLabelY.toolTip = "<p>Y coordinate value.</p>";
                  if (this.aiInfo.cumulativeValues) {
                        this.aiLabelCnt.text = "Cnt: " + this.aiInfo.cumulativeValues[x];
                        this.aiLabelCnt.toolTip = "<p>Cumulative number of pixels with values less than or equal to the X coordinate value.</p>";
                        this.aiLabelPrc.text = "%: " + this.aiInfo.percentageValues[x].toFixed(4);
                        this.aiLabelPrc.toolTip = "<p>Percentage of pixels with values less than or equal to the X coordinate value.</p>";
                  }
            }
      };

      histogramViewControl.aiLabelX = newLabel(parent, "x:", "Click on histogram to get values");
      histogramViewControl.aiLabelY = newLabel(parent, "y:", "Click on histogram to get values");
      histogramViewControl.aiLabelCnt = newLabel(parent, "Cnt:", "Click on histogram to get values");
      histogramViewControl.aiLabelPrc = newLabel(parent, "%:", "Click on histogram to get values");
      histogramViewControl.sizer = new VerticalSizer;
      histogramViewControl.sizer.margin = 6;
      histogramViewControl.sizer.spacing = 4;
      histogramViewControl.sizer.add( histogramViewControl.aiLabelX );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelY );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelCnt );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelPrc );
      histogramViewControl.sizer.addStretch();

      histogramViewControl.repaint();

      return histogramViewControl;
}

function mainSizerTab(parent, sizer)
{
      var gb = new Control( parent );
      gb.sizer = new HorizontalSizer;
      gb.sizer.add( sizer );

      parent.rootingArr.push(gb);

      return gb;
}

function exitFromDialog()
{
      console.show();
      if (blink_window != null) {
            blink_window.forceClose();
            blink_window = null;
      }
      updateImageInfoLabel("");
}

function updateSidePreviewState()
{
      if (!global.use_preview || sidePreviewControl == null) {
            return;
      }
      if (ppar.preview.side_preview_visible) {
            if (sidePreviewInfoLabel) {
                  sidePreviewInfoLabel.show();
            }
            global.sideStatusInfoLabel.show();
            sidePreviewControl.show();
            if (sideHistogramControl != null) {
                  sideHistogramControl.show();
            }

            if (tabPreviewInfoLabel != null) {
                  tabPreviewInfoLabel.hide();
            }
            global.tabStatusInfoLabel.hide();
            tabPreviewControl.hide();
            if (tabHistogramControl != null) {
                  tabHistogramControl.hide();
            }

            if (!ppar.use_single_column && mainTabBox != null) {
                  mainTabBox.setPageLabel(tab_preview_index, "Extra processing");
            }

            ppar.preview.side_preview_visible = true;

      } else {
            if (sidePreviewInfoLabel) {
                  sidePreviewInfoLabel.hide();
            }
            global.sideStatusInfoLabel.hide();
            sidePreviewControl.hide();
            if (sideHistogramControl != null) {
                  sideHistogramControl.hide();
            }

            if (tabPreviewInfoLabel != null) {
                  tabPreviewInfoLabel.show();
            }
            global.tabStatusInfoLabel.show();
            tabPreviewControl.show();
            if (tabHistogramControl != null) {
                  tabHistogramControl.show();
            }

            if (!ppar.use_single_column && mainTabBox != null) {
                  mainTabBox.setPageLabel(tab_preview_index, "Preview and extra processing");
            }

            ppar.preview.side_preview_visible = false;
      }
}

function toggleSidePreview()
{
      if (!global.use_preview) {
            return;
      }

      ppar.preview.side_preview_visible = !ppar.preview.side_preview_visible;
      updateSidePreviewState();
}

function updatePreviewSize(w, h, hh, sw, sh, shh)
{
      preview_size_changed = true;

      if (w > 0) {
            ppar.preview.preview_width = w;
      }
      if (h > 0) {
            ppar.preview.preview_height = h;
      }
      if (hh > 0) {
            ppar.preview.histogram_height = hh;
      }
      if (sw > 0) {
            ppar.preview.side_preview_width = sw;
      }
      if (sh > 0) {
            ppar.preview.side_preview_height = sh;
      }
      if (shh > 0) {
            ppar.preview.side_histogram_height = shh;
      }

      for (var i = 0; i < ppar.preview.preview_sizes.length; i++) {
            if (ppar.preview.preview_sizes[i][0] == screen_size) {
                  /* Found, update existing size. */
                  if (w > 0) {
                        ppar.preview.preview_sizes[i][1] = w;
                  }
                  if (h > 0) {
                        ppar.preview.preview_sizes[i][2] = h;
                  }
                  if (hh > 0) {
                        ppar.preview.preview_sizes[i][3] = hh;
                  } else {
                        ppar.preview.preview_sizes[i][3] = ppar.preview.histogram_height;
                  }
                  if (sw > 0) {
                        ppar.preview.preview_sizes[i][4] = sw;
                  } else {
                        ppar.preview.preview_sizes[i][4] = ppar.preview.side_preview_width;
                  }
                  if (sh > 0) {
                        ppar.preview.preview_sizes[i][5] = sh;
                  } else {
                        ppar.preview.preview_sizes[i][5] = ppar.preview.side_preview_height;
                  }
                  if (shh > 0) {
                        ppar.preview.preview_sizes[i][6] = shh;
                  } else {
                        ppar.preview.preview_sizes[i][6] = ppar.preview.side_histogram_height;
                  }

                  console.writeln("Update existing preview size for screen size " + screen_size + " to " + ppar.preview.preview_sizes[i][1] + ", " + ppar.preview.preview_sizes[i][2] + ", " + ppar.preview.preview_sizes[i][3]);
                  return;
            }
      }
      /* Not found, add a new one. */
      ppar.preview.preview_sizes[ppar.preview.preview_sizes.length] = [ screen_size, ppar.preview.preview_width, ppar.preview.preview_height, ppar.preview.histogram_height,  
                                                                        ppar.preview.side_preview_width, ppar.preview.side_preview_height, ppar.preview.side_histogram_height];
      console.writeln("Add a new preview size for screen size " + screen_size + " as " + ppar.preview.preview_sizes[i][1] + ", " + ppar.preview.preview_sizes[i][2] + ", " + ppar.preview.preview_sizes[i][3] + ", " + 
                        ppar.preview.preview_sizes[i][4] + ", " + ppar.preview.preview_sizes[i][5] + ", " + ppar.preview.preview_sizes[i][6]);
}

function getPreviewSize()
{
      let use_old_preview_size = true;

      ppar.preview.preview_width = 0;
      ppar.preview.preview_height = 0;
      ppar.preview.histogram_height = 0;

      if (ppar.preview.preview_sizes == undefined) {
            ppar.preview.preview_sizes = [];
      }

      /* Try to find a saved screen size for this resolution. */
      for (var i = 0; i < ppar.preview.preview_sizes.length; i++) {
            if (ppar.preview.preview_sizes[i][0] == screen_size) {
                  ppar.preview.preview_width = ppar.preview.preview_sizes[i][1];
                  ppar.preview.preview_height = ppar.preview.preview_sizes[i][2];
                  if (ppar.preview.preview_sizes[i].length > 3) {
                        ppar.preview.histogram_height = ppar.preview.preview_sizes[i][3];
                  }
                  if (ppar.preview.preview_sizes[i].length > 4) {
                        ppar.preview.side_preview_width = ppar.preview.preview_sizes[i][4];
                        ppar.preview.side_preview_height = ppar.preview.preview_sizes[i][5];
                        ppar.preview.side_histogram_height = ppar.preview.preview_sizes[i][6];
                  }
            }
      }

      if (ppar.preview.preview_width == 0) {
            /* Preview size not set for this screen size.
             * Calculate preview size from screen size.
             * Use a small preview size as a default to ensure that it fits on screen. 
             */
            let preview_size = Math.floor(Math.min(screen_width * 0.25, screen_height * 0.25));
            preview_size = Math.min(preview_size, 400);
            ppar.preview.preview_width = preview_size;
            ppar.preview.preview_height = preview_size;
            ppar.preview.histogram_height = Math.floor(screen_height * 0.05);
            use_old_preview_size = false;
      }
      if (ppar.preview.histogram_height == 0) {
            /* Preview size not set for this screen size.
             * Calculate histogram height from screen size.
             * Use a small preview size as a default to ensure that it fits on screen. 
             */
            ppar.preview.histogram_height = Math.floor(screen_height * 0.05);
      }
      if (ppar.preview.side_preview_width == 0) {
            // Side preview size not set for this screen size.
            // Calculate side preview size from screen size.
            let preview_size = Math.floor(Math.min(screen_width * 0.4, screen_height * 0.4));
            preview_size = Math.min(preview_size, 500);
            ppar.preview.side_preview_width = preview_size;
            ppar.preview.side_preview_height = preview_size;
            ppar.preview.side_histogram_height = Math.floor(screen_height * 0.1);
      }
      // ppar.preview.side_preview_height = 1500;  // XXX testing

      return use_old_preview_size;
}

/***************************************************************************
 * 
 *    AutoIntegrateDialog
 * 
 */
function AutoIntegrateDialog()
{
      this.__base__ = Dialog;
      this.__base__();

      let sz = util.getScreenSize(this);
      let use_restored_preview_size = true;

      screen_width = sz[0];
      screen_height = sz[1];
      screen_size = screen_width + "x" + screen_height;

       if (ppar.preview.use_preview) {
            use_restored_preview_size = getPreviewSize();
      }

      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      this.rootingArr = [];    // for rooting objects

      var mainHelpTips = 
      "<p>" +
      "<b>" + global.autointegrate_version + " - Automatic image processing utility</b>" +
      "</p><p>" +
      "Script automates initial steps of image processing in PixInsight. "+ 
      "It can calibrate images or it can be used with already calibrated images. "+ 
      "Often you get the good results by running the script with default " +
      "settings and then continue processing in PixInsight." +
      "</p><p>"+
      global.getDirectoryInfo(false) +
      "</p><p>" +
      "Always remember to check you data with AutoIntegrate preview or Blink tool and remove all bad images." +
      "</p><p>" +
      "Mosaic/batch mode is intended to be used with mosaic images. In Batch mode script " +
      "automatically asks files for mosaic panels before processing. All mosaic panels are left open " +
      "and can be saved with Save batch result files buttons." +
      "</p><p>" +
      "When using color/OSC/RAW files it is recommended to set Pure RAW in PixInsight settings." +
      "</p><p>" +
      "For more details see:" +
      "</p>" +
      "<ul>" +
      '<li>Web site: <a href="' + global.autointegrateinfo_link + '">' + global.autointegrateinfo_link + '</a></li>' +
      '<li>Discussion forums: <a href="https://forums.ruuth.xyz">https://forums.ruuth.xyz</a></li>' +
      '<li>Discord: <a href="https://discord.gg/baqMqmKS3N">https://discord.gg/baqMqmKS3N</a></li>' +
      "</ul>" +
      "<p>" +
      "This product is based on software from the PixInsight project, developed " +
      "by Pleiades Astrophoto and its contributors (" +
      '<a href="https://pixinsight.com/">https://pixinsight.com/</a>)' + 
      "</p><p>" +
      "Copyright (c) 2018-2024 Jarmo Ruuth<br>" +
      "Copyright (c) 2022 Jean-Marc Lugrin<br>" +
      "Copyright (c) 2021 rob pfile<br>" +
      "Copyright (c) 2013 Andres del Pozo<br>" +
      "Copyright (c) 2019 Vicent Peris<br>" +
      "Copyright (c) 2003-2020 Pleiades Astrophoto S.L." +
      "</p>";

      var BXT_no_PSF_tip = "Sometimes on starless images PSF value can not be calculated. Then a manual value should be given or BlurXTerminator should not be used.";
      var comet_alignment_toolTip = 
            "<p>Below is the suggested workflow with comet processing in AutoIntegrate:</p>" +
            "<ul>" +
            "<li>Run a normal workflow to get correct stars and background objects.</li>" +
            "<li>Load star aligned *_r.xisf files as light files. Those can be found from the AutoOutput directory.</li>" + 
            "<li>Set a Window prefix to avoid overwriting files in the first step.</li>" + 
            "<li>Check <i>Comet align</i> in <i>Image processing parameters</i> in <i>Settings</i> tab.</li>" +
            "<li>Check <i>Remove stars from lights</i> in <i>Other parameters</i> in <i>Other</i> tab.</li>" +
            "<li>Check <i>No CosmeticCorrection</i> in <i>Other parameters</i> in <i>Other</i> tab.</li>" +
            "<li>Go to the <i>Processing 2 tab</i> and <i>CometAlignment</i> section.</li>" +
            "<li>Fill in first and last comet position coordinates. To get the coordinates click the " + 
                  "<i>Preview</i> button for the first or last image, go to preview, zoom " + 
                  "to 1:1 view and click the comet nucleus with the left mouse button. Note that the " + 
                  "first and last images are selected automatically based on image timestamps from the " + 
                  "DATE-OBS keyword when images are loaded.</li>" +
            "<li>Copy coordinates from the preview coordinates box and paste them to the comet coordinates box. There are arrow " + 
                  "buttons in the preview to automatically copy coordinates.</li>" +
            "<li>Use the <i>Run</i> button to process images.</li>" +
            "</ul>" + 
            "<p>Comet alignment will automatically skip star alignment and SCNR. Since already star aligned images (*_r.xisf) " + 
               "are used then Star alignment could invalidate coordinates given here and thus it is not used.</p>" +
            "<p>Note that using starless images may cause problems for example with ImageIntegration or BlurXTerminator. With missing PSF error in ImageIntegration " +
            "you can use an option <i>ImageIntegration use ssweight</i>. " + BXT_no_PSF_tip + "</p>" + 
            "<p>It is also possible to manually run the CometAlignment process. Below are the steps to use AutoIntegrate with manual comet alignment:</p>" + 
            "<ul>" + 
            "<li>Run normal workflow to get correct stars and background objects.</li>" +
            "<li>Manually run the CometAlignment on star aligned *_r.xisf files. This will create *_ca.xisf files.</li>" + 
            "<li>Remove stars from *_ca.xisf files. StarXTerminator has a batch mode that makes this easier.</li>" + 
            "<li>Load comet aligned files into AutoIntegrate as lights files.</li>" + 
            "<li>Check <i>Start from ImageIntegration</i> in <i>Other parameters</i>.</li>" +
            "<li>Use the <i>Run</i> button to process images.</li>" +
            "</ul>";

      this.helpTips = new ToolButton( this );
      this.helpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.helpTips.setScaledFixedSize( 20, 20 );
      this.helpTips.toolTip = mainHelpTips;
      this.helpTips.onClick = function()
      {
            new MessageBox(mainHelpTips, global.autointegrate_version, StdIcon_Information ).execute();
      }

      // Run, Exit and AutoContinue buttons
      this.run_Button = newRunButton(this, false);
      this.exit_Button = newExitButton(this, false);
      this.cancel_Button = newCancelButton(this, false);
      this.autoContinueButton = newAutoContinueButton(this, false);
      this.autoContinuePrefixSizer = addAutoContinueWinPrefix(this);
      
      this.filesToolTip = [];
      this.filesToolTip[global.pages.LIGHTS] = "<p>Add light files. If only lights are added " + 
                             "they are assumed to be already calibrated.</p>" +
                             "<p>If IMAGETYP is set on images script tries to automatically detect "+
                             "bias, dark flat and flat dark images. This can be disabled with No autodetect option.</p>";
      this.filesToolTip[global.pages.BIAS] = "<p>Add bias files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[global.pages.DARKS] = "<p>Add dark files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[global.pages.FLATS] = "<p>Add flat files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[global.pages.FLAT_DARKS] = "<p>Add flat dark image files. If only one file is added " + 
                             "it is assumed to be a master file. If flat dark files are selected " + 
                             "then master flat dark is used instead of master bias and master dark " + 
                             "is not used to calibrate flats.</p>";

      this.treeBox = [];
      this.treeBoxRootingArr = [];
      this.targetSizer = newTargetSizer(this);
      this.filesButtonsSizer = addFilesButtons(this, this.targetSizer);

      this.tabBox = new TabBox( this );

      let newFilesTreeBox = new filesTreeBox( this, lightsOptions(this), global.pages.LIGHTS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Lights" );

      newFilesTreeBox = new filesTreeBox( this, biasOptions(this), global.pages.BIAS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Bias" );

      newFilesTreeBox = new filesTreeBox( this, darksOptions(this), global.pages.DARKS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Darks" );

      newFilesTreeBox = new filesTreeBox( this, flatsOptions(this), global.pages.FLATS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flats" );

      newFilesTreeBox = new filesTreeBox( this, flatdarksOptions(this), global.pages.FLAT_DARKS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flat Darks" );

      /* Parameters check boxes. */
      this.useLocalNormalizationCheckBox = newCheckBox(this, "Local Normalization", par.local_normalization, 
            "<p>Use local normalization data for ImageIntegration</p>" );
      this.FixColumnDefectsCheckBox = newCheckBox(this, "Fix column defects", par.fix_column_defects, 
            "If checked, fix linear column defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixRowDefectsCheckBox = newCheckBox(this, "Fix row defects", par.fix_row_defects, 
            "If checked, fix linear row defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.CosmeticCorrectionCheckBox = newCheckBox(this, "No CosmeticCorrection", par.skip_cosmeticcorrection, 
            "<p>Do not run CosmeticCorrection on image files.</p>" +
            "<p>Can be useful when doing Comet align.</p>" );
      this.SubframeSelectorCheckBox = newCheckBox(this, "No SubframeSelector", par.skip_subframeselector, 
            "<p>Do not run SubframeSelector to get image weights.</p>" +
            "<p>When this option is used then the first image in the list is used as a reference image unless reference image is selected manually.</p>");
      this.CometAlignCheckBox = newCheckBox(this, "Comet align", par.comet_align, 
            "<p>If checked, run CometAlign process using settings in the <i>CometAlignment settings</i> section in <i>Processing 2</i> tab.</p>" +
            "<p>For more details see the help icon in <i>CometAlignment settings</i> section.</p>");
      this.fastIntegrationCheckBox = newCheckBox(this, "Fast integration", par.use_fastintegration, 
            "<p>If checked, use FastIntegration process instead of ImageIntegration process when integrating light images.</p>" +
            "<p>In <i>Processing 2</i> tab there are some settings for FastIntegration.</p>");
      this.CalibrateOnlyCheckBox = newCheckBox(this, "Calibrate only", par.calibrate_only, 
            "<p>Stop after image calibration step.</p>" );
      this.DebayerOnlyCheckBox = newCheckBox(this, "Debayer only", par.debayer_only, 
            "<p>Stop after Debayering step. Later it is possible to continue by selecting Debayered files " + 
            "and choosing None for Debayer.</p>" );
      this.ExtractChannelsOnlyCheckBox = newCheckBox(this, "Extract channels only", par.extract_channels_only, 
            "<p>Stop after Extract channels step. Later it is possible to continue by selecting extracted files " + 
            "and run a normal mono camera (LRGB/HSO) workflow.</p>" );
      this.BinningOnlyCheckBox = newCheckBox(this, "Binning only", par.binning_only, 
            "<p>Run only binning to create smaller files.</p>" );
      this.IntegrateOnlyCheckBox = newCheckBox(this, "Integrate only", par.integrate_only, 
            "<p>Run only image integration to create L,R,G,B or RGB files</p>" );
      this.CropInfoOnlyCheckBox = newCheckBox(this, "Crop info only", par.cropinfo_only, 
            "<p>Run only image integration on *_r.xisf files to create automatic cropping info.</p>" +
            "<p>Light file list should include all registered *_r.xisf files. The result will be LowRejectionMap_ALL.xisf file " +
            "that can be used to crop files to common area during AutoContinue.</p>" );
      this.imageWeightTestingCheckBox = newCheckBox(this, "Image weight testing ", par.image_weight_testing, 
            "<p>Run only SubframeSelector to output image weight information and outlier filtering into AutoIntegrate.log AutoWeights.json. " +
            "Json file can be loaded as input file list.</p>" +
            "<p>With this option no output image files are written.</p>" );
      this.earlyPSFCheckCheckBox = newCheckBox(this, "Early PSF check", par.early_PSF_check, 
            "<p>Checking this box will enable early PSF signal test. Then light files are filtered for PSF signal values below weight limit before any processing.</p>" +
            "<p>Weight limit is set in <i>filtering</i> section in <i>Processing</i> tab.</p>" );
      this.ChannelCombinationOnlyCheckBox = newCheckBox(this, "ChannelCombination only", par.channelcombination_only, 
            "<p>Run only channel combination to linear RGB file. No auto stretch or color calibration.</p>" );
      /* this.relaxedStartAlignCheckBox = newCheckBox(this, "Strict StarAlign", par.strict_StarAlign, 
            "<p>Use more strict StarAlign par. When set more files may fail to align.</p>" ); */
      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", par.keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.resetOnSetupLoadCheckBox = newCheckBox(this, "Reset on setup load", par.reset_on_setup_load, 
            "<p>Reset parameters toi default values before loading a setup. This ensures that only parameters from the setup file are set " + 
            "and user saved default parameters are not set.</p>" );
      this.keepTemporaryImagesCheckBox = newCheckBox(this, "Keep temporary images", par.keep_temporary_images, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.keepProcessedImagesCheckBox = newCheckBox(this, "Keep processed images", par.keep_processed_images, 
            "<p>Keep processed images after every step a PixInsight process is applied to them. They will have process name prefix.</p>" +
            "<p>Only images after image integration are kept. Images are not saved to disk.</p>" );
      this.debugCheckBox = newCheckBox(this, "Debug", par.debug, 
            "<p>Print some additional debug information to the log output files.</p>" );
      this.flowchartDebugCheckBox = newCheckBox(this, "Flowchart debug", par.flowchart_debug, 
            "<p>Print some additional debug information wher generating flowchart.</p>" );
      this.printProcessValuesCheckBox = newCheckBox(this, "Print process values", par.print_process_values, 
            "<p>Print PixInsight process values to the console and to the AutoIntegrate log file.</p>" );
      this.GC_before_channel_combination_CheckBox = newCheckBox(this, "Gradient correction on channel images", par.GC_before_channel_combination, 
            "<p>Use gradient correction on L, R, G and B images separately before channels are combined.</p>" );
      this.GC_on_lights_CheckBox = newCheckBox(this, "Gradient correction on light images", par.GC_on_lights, 
            "<p>Use gradient correction on all light images. It is run very early in the processing before cosmetic correction.</p>" );
      this.use_GC_L_RGB_CheckBox = newCheckBox(this, "Gradient correction on combined images", par.use_GC_on_L_RGB, 
            "<p>Use gradient correction on L and RGB images while image is still in linear mode.</p>" );
      this.use_GC_L_RGB_stretched_CheckBox = newCheckBox(this, "Gradient correction on stretched images", par.use_GC_on_L_RGB_stretched, 
            "<p>Use gradient correction on L and RGB images after they have been stretched to non-linear mode.</p>" +
            "<p>Note that thiis option should not be used with GradientCorrection process.</p>" );
      var remove_stars_Tooltip = "<p>Choose star image stretching and combining settings from Stretching settings section.</p>"
      this.remove_stars_before_stretch_CheckBox = newCheckBox(this, "Remove stars before stretch", par.remove_stars_before_stretch, 
            "<p>Remove stars from combined RGB or narrowband images just before stretching while it still is in linear stage. " + 
            "Stars are used only from RGB image, stars from L image are not used. " + 
            "This needs StarXTerminator.</p>" + 
            "<p>When stars are removed before stretching then a different stretching can be used for the stars and potentially " + 
            "get better star colors.</p>" + 
            "<p>For OSC data this may not work well. Separating channels might help.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_channel_CheckBox = newCheckBox(this, "Remove stars from channels", par.remove_stars_channel, 
            "<p>With LRGB or narrowband images remove stars from L, R, G, B, H, S and O channel images separately after image integration. " + 
            "while images are still in linear stage. Star images are then combined " +
            "to create a RGB star image. This needs StarXTerminator.</p>" +
            "<p>With color images (DSLR/OSC) remove stars after image integration while image is still in linear stage. " + 
            "This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_light_CheckBox = newCheckBox(this, "Remove stars from lights", par.remove_stars_light, 
            "<p>Remove stars from light image.</p>" + 
            "<p>Stars are removed after after star alignment.</p>" + 
            "<p>If comet alignment is chosen then stars are removed before comet align.</p>");
      this.remove_stars_stretched_CheckBox = newCheckBox(this, "Remove_stars after stretch", par.remove_stars_stretched, 
            "<p>Remove stars after image has been stretched to non-linear state. Start from RGB image are saved and they " + 
            "can be later added back to the image. This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      this.unscreen_stars_CheckBox = newCheckBox(this, "Unscreen stars", par.unscreen_stars, unscreen_tooltip);
      this.color_calibration_before_GC_CheckBox = newCheckBox(this, "Color calibration before gradient correction", par.color_calibration_before_GC, 
            "<p>Run ColorCalibration before gradient correction is run on RGB image</p>" );
      this.solve_image_CheckBox = newCheckBox(this, "Solve image", par.solve_image, 
            "<p>Solve image by running ImageSolver script.</p>" +
            "<p>Note that if <i>Color calibration using SPCC</i> is selected image is solved automatically with checking this box.</p>" +
            "<p>If image does not have correct coordinates or focal length embedded they can be given in Image solving section in the Processing tab.</p>" +
            "<p>Consider also using Drizzle with scale 1 or 2 when using SPCC.</p>");
      this.use_spcc_CheckBox = newCheckBox(this, "Color calibration using SPCC", par.use_spcc, 
            "<p>NOTE! Using SPCC will clear the dialog window. Everything still runs fine. This is a problem in the SPCC process which hopefully gets fixed soon.</p>" +
            "<p>Run color calibration using SpectrophotometricColorCalibration (SPCC). This requires image solving which is done automatically on " + 
            "Integration_RGB image if it is not already done.</p>" +
            "<p>If image does not have correct coordinates or focal length embedded they can be given in Image solving section in the Processing tab.</p>" +
            "<p>SPCC settings can be updated at Color calibration section in the Processing tab.</p>");
      this.use_background_neutralization_CheckBox = newCheckBox(this, "Use BackgroundNeutralization", par.use_background_neutralization, 
            "<p>Run BackgroundNeutralization before ColorCalibration</p>" );
      this.batch_mode_CheckBox = newCheckBox(this, "Batch/mosaic mode", par.batch_mode, 
            "<p>Run in batch mode, continue until all selected files are processed.</p>" +
            "<p>In batch mode, just click the Run button and the script will ask for files to process before starting.</p>" +
            "<p>Batch mode is intended for processing mosaic panels. " + 
            "When batch mode completes only final image windows are left visible.</p>" +
            "<p>Final images are renamed using the subdirectory name. It is " + 
            "recommended that each part of the batch is stored in a separate directory (like for example P1, P2, etc.).</p>" +
            "<p>Batch mode works only with calibrated light images.</p>");
      this.autodetect_imagetyp_CheckBox = newCheckBox(this, "Do not use IMAGETYP keyword", par.skip_autodetect_imagetyp, 
            "<p>If selected do not try to autodetect calibration files based on IMAGETYP keyword.</p>" );
      this.autodetect_filter_CheckBox = newCheckBoxEx(this, "Do not use FILTER keyword", par.skip_autodetect_filter, 
            "<p>If selected do not try to autodetect light and flat files based on FILTER keyword.</p>" +
            "<p>Selecting this enables manual adding of filter files for lights and flats.</p>",
            function(checked) { 
                  this.dialog.autodetect_filter_CheckBox.aiParam.val = checked; 
                  showOrHideFilterSectionBar(global.LIGHTS);
                  showOrHideFilterSectionBar(global.FLATS);
            });
      this.save_all_files_CheckBox = newCheckBox(this, "Save all files", par.save_all_files, 
            "<p>If selected save buttons will save all processed and iconized files and not just final image files. </p>" );
      this.select_all_files_CheckBox = newCheckBox(this, "Select all files", par.select_all_files, 
            "<p>If selected default file select pattern is all files (*.*) and not image files.</p>" );
      this.no_subdirs_CheckBox = newCheckBoxEx(this, "No subdirectories", par.no_subdirs, 
            "<p>If selected output files are not written into subdirectories</p>",
            function(checked) { 
                  this.dialog.no_subdirs_CheckBox.aiParam.val = checked;
                  if (this.dialog.no_subdirs_CheckBox.aiParam.val) {
                        util.clearDefaultDirs();
                  } else {
                        util.setDefaultDirs();
                  }
            });
      this.use_drizzle_CheckBox = newCheckBox(this, "Drizzle, scale", par.use_drizzle, 
            "<p>Use Drizzle integration</p>" +
            "<p>Drizzle scale 1 does not change the image size but may help with fine details like stars in the image.</p>" +
            "<p>Drizzle scale 2 doubles the image resolution and may help with small details in the image.</p>" +
            "<p>Consider using drizzle when selecting SPCC for color calibration.</p>" );
      this.drizzle_scale_SpinBox = newSpinBox(this, par.drizzle_scale, 1, 10, this.use_drizzle_CheckBox.toolTip);

      this.drizzleSizer = new HorizontalSizer;
      this.drizzleSizer.spacing = 2;
      this.drizzleSizer.add( this.use_drizzle_CheckBox );
      this.drizzleSizer.add( this.drizzle_scale_SpinBox );
      this.drizzleSizer.addStretch();

      this.imageintegration_ssweight_CheckBox = newCheckBox(this, "ImageIntegration use ssweight", par.use_imageintegration_ssweight, 
            "<p>Use SSWEIGHT weight keyword during ImageIntegration.</p>" );
      this.imageintegration_clipping_CheckBox = newCheckBox(this, "No ImageIntegration clipping", par.skip_imageintegration_clipping, 
            "<p>Do not use clipping in ImageIntegration</p>" );
      this.crop_to_common_area_CheckBox = newCheckBox(this, "Crop to common area", par.crop_to_common_area, 
            "<p>Crop all channels to area covered by all images</p>" );
      this.RRGB_image_CheckBox = newCheckBox(this, "RRGB image", par.RRGB_image, 
            "<p>RRGB image using R as Luminance.</p>" );
      this.synthetic_l_image_CheckBox = newCheckBox(this, "Synthetic L image", par.synthetic_l_image, 
            "<p>Create synthetic L image from all light images.</p>" );
      this.synthetic_missing_images_CheckBox = newCheckBox(this, "Synthetic missing image", par.synthetic_missing_images, 
            "<p>Create synthetic image for any missing image.</p>" );
      this.force_file_name_filter_CheckBox = newCheckBox(this, "Use file name for filters", par.force_file_name_filter, 
            "<p>Use file name for recognizing filters and ignore FILTER keyword.</p>" );
      this.unique_file_names_CheckBox = newCheckBox(this, "Use unique file names", par.unique_file_names, 
            "<p>Use unique file names by adding a timestamp when saving to disk.</p>" );
      this.skip_noise_reduction_CheckBox = newCheckBox(this, "No noise reduction", par.skip_noise_reduction, 
            "<p>Do not use noise reduction. This option disables all noise reduction regardless of what other noise reduction settings are selected.</p>" + 
            "<p>More fine grained noise reduction settings can be found in the Processing settings section.</p>" );
      this.skip_star_noise_reduction_CheckBox = newCheckBox(this, "No star noise reduction", par.skip_star_noise_reduction, 
            "<p>Do not use star noise reduction. Star noise reduction is used when stars are removed from image.</p>" );
      this.no_mask_contrast_CheckBox = newCheckBox(this, "No extra contrast on mask", par.skip_mask_contrast, 
            "<p>Do not add extra contrast on automatically created luminance mask.</p>" );
      this.no_sharpening_CheckBox = newCheckBox(this, "No sharpening", par.skip_sharpening, 
            "<p>Do not use sharpening on image. Sharpening uses a luminance and star mask to target light parts of the image.</p>" );
      this.shadowClip_CheckBox = newCheckBox(this, "Shadow clip", par.shadow_clip, 
            "<p>Clip shadows.</p>" +
            "<p>Clipping shadows increases contrast but clips out some data. Shadow clip clips " + global.shadow_clip_value + "% of shadows " +
            "after image is stretched.</p>");
      this.forceNewMask_CheckBox = newCheckBox(this, "New mask", par.force_new_mask, 
            "<p>Do not use an existing mask but always create a new mask.</p>");
      this.no_SCNR_CheckBox = newCheckBox(this, "No SCNR", par.skip_SCNR, 
            "<p>Do not use SCNR to remove green cast.</p>"  +
            "<p>SCNR is automatically skipped when processing narrowband images.</p>" +
            "<p>Skipping SCNR can be useful when processing for example comet images.</p>");
      this.skip_color_calibration_CheckBox = newCheckBox(this, "No color calibration", par.skip_color_calibration, 
            "<p>Do not run color calibration. Color calibration is run by default on RGB data.</p>" );
      this.use_StarXTerminator_CheckBox = newCheckBox(this, "Use StarXTerminator", par.use_starxterminator, 
            "<p>Use StarXTerminator to remove stars from an image.</p>" +
            "<p>You can change some StarXTerminator settings in the <i>StarXTerminator settings</i> section.</p>" );
      this.use_noisexterminator_CheckBox = newCheckBox(this, "Use NoiseXTerminator", par.use_noisexterminator, 
            "<p>Use NoiseXTerminator for noise reduction.</p>" );
      this.use_starnet2_CheckBox = newCheckBox(this, "Use StarNet2", par.use_starnet2, 
            "<p>Use StarNet2 to remove stars from an image.</p>" );
      this.use_deepsnr_CheckBox = newCheckBox(this, "Use DeepSNR", par.use_deepsnr, 
            "<p>Use DeepSNR for noise reduction.</p>" +
            "<p>Note that with DeepSNR increasing the noise reduction strength value will decrease the noise reduction.</p>" );
      this.use_blurxterminator_CheckBox = newCheckBox(this, "Use BlurXTerminator", par.use_blurxterminator, 
            "<p>Use BlurXTerminator for sharpening and deconvolution.</p>" +
            "<p>BlurXTerminator is applied on the linear image just before it is stretched to non-linear. Extra processing " +
            "option for sharpening can be used to apply BlurXTerminator on non-linear image.</p>" +
            "<p>Some options for BlurXTerminator can be adjusted in the sharpening section.</p>" +
            "<p>When using BlurXTerminator it is recommended to do noise reduction after BluxXTerminator " + 
            "by checking option <i>Combined image noise reduction</i> or <i>Non-linear noise reduction</i>. " + 
            "But it is always good to experiment what " +
            "is best for your own data.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>");
      if (global.is_gc_process) {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of GradientCorrection process to correct gradients in images.</p>";
      } else {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of AutomaticBackgroundExtractor (ABE) to correct gradients in images.</p>";
      }
      use_graxpert_toolTip += "</p>By default no gradient correction is done. To use GraXpert for gradient correction you need to also check one of " +
                              "the gradient correction options in the <i>Image processing parameters</i> section.</p>";
      
      this.use_graxpert_CheckBox = newCheckBox(this, "Use GraXpert", par.use_graxpert, 
            use_graxpert_toolTip + 
            "<p><b>NOTE!</b> A path to GraXpert file must be set in the GraXpert section before it can be used.</p>" +
            "<p><b>NOTE2!</b> You need to manually start GraXpert once to ensure that the correct AI model is loaded into your computer.</p>" +
            "<p>GraXpert always uses the AI background model. In the GraXpert section " +
            "it is possible to set correction and smoothing values.</p>");
      this.use_graxpert_denoise_CheckBox = newCheckBox(this, "Use GraXpert denoise", par.use_graxpert_denoise, 
            "<p>Use GraXpert for noise reduction.</p>" +
            "<p>In the GraXpert section it is possible to set smoothing values and batch size.</p>");
      if (global.is_gc_process) {
            this.use_abe_CheckBox = newCheckBox(this, "Use ABE", par.use_abe, 
            "<p>Use AutomaticBackgroundExtractor (ABE) instead of GradientCorrection process to correct gradients in images.</p>" +
            "</p>By default no gradient correction is done. To use ABE for gradient correction you need to also check one of " +
            "the gradient correction options in the <i>Image processing parameters</i> section.</p>");
      }
      this.win_prefix_to_log_files_CheckBox = newCheckBox(this, "Add window prefix to log files", par.win_prefix_to_log_files, 
            "<p>Add window prefix to AutoIntegrate.log and AutoContinue.log files.</p>" );
      this.start_from_imageintegration_CheckBox = newCheckBox(this, "Start from ImageIntegration", par.start_from_imageintegration, 
            "<p>Start processing from ImageIntegration. File list should include star aligned files (*_r.xisf).</p>" +
            "<p>This option can be useful for testing different processing like Local Normalization or Drizzle " + 
            "(if Generate .xdrz files is selected). This is also useful if there is a need to manually remove " + 
            "bad files after alignment.</p>" +
            "<p>This option is also useful when doing comet alignment. Then input files should be comet aligned *_ca.xisf files.</p>" +
            "<p>If filter type is not included in the file keywords it cannot be detected from the file name. In that case " + 
            "filter files must be added manually to the file list.</p>" );
      this.generate_xdrz_CheckBox = newCheckBox(this, "Generate .xdrz files", par.generate_xdrz, 
            "<p>Generate .xdrz files even if Drizzle integration is not used. It is useful if you want to try Drizzle " + 
            "integration later with Start from ImageIntegration option.</p>" );
      if (!global.use_preview) {
            this.blink_checkbox = newCheckBoxEx(this, "No blink", par.skip_blink, "<p>Disable blinking of files.</p>");
            var blink_checkbox = this.blink_checkbox;
            this.blink_checkbox.onClick = function(checked) { 
                  blink_checkbox.aiParam.val = checked;
                  if (blink_checkbox.aiParam.val) {
                        if (blink_window != null) {
                              blink_window.forceClose();
                              blink_window = null;
                        }
                  }
            };
      }
      this.StartWithEmptyWindowPrefixBox = newCheckBox(this, "Start with empty window prefix", par.start_with_empty_window_prefix, 
            "<p>Start the script with empty window prefix</p>" );
      this.ManualIconColumnBox = newCheckBox(this, "Manual icon column control", par.use_manual_icon_column, 
            "<p>Enable manual control of icon columns. Useful for example when using multiple Workspaces.</p>" +
            "<p>When this option is enabled the control for icon column is in the Interface settings section.</p>" +
            "<p>This setting is effective only after restart of the script.</p>" );
      this.AutoSaveSetupBox = newCheckBox(this, "Autosave setup", par.autosave_setup, 
            "<p>Save setup after successful processing into AutosaveSetup.json file. Autosave is done only after the Run command, " + 
            "it is not done after the AutoContinue command.</p>" +
            "<p>File is saved to the lights file directory, or to the user given output directory.</p>" +
            "<p>Setup can be later loaded into AutoIntegrate to see the settings or run the setup again possibly with different options.</p>");
      this.UseProcessedFilesBox = newCheckBox(this, "Use processed files", par.use_processed_files, 
            "<p>When possible use already processed files. This option can be useful when adding files to an already processed set of files. " +
            "Only files generated before image integration are reused.</p>" +
            "<p>Option works best with a Json setup file that is saved after processing or with Autosave generated AutosaveSetup.json file because " + 
            "then star alignment reference image and possible defect info is saved.</p>" +
            "<p>With image calibration it is possible to use previously generated master files by adding already processed master files " +
            "into calibration file lists. If only one calibration file is present then the script automatically uses it as a master file.</p>");
      this.saveCroppedImagesBox = newCheckBox(this, "Save cropped images", par.save_cropped_images, "Save cropped image files with _crop postfix.");

      // Image parameters set 1.
      this.imageParamsSet1 = new VerticalSizer;
      this.imageParamsSet1.margin = 6;
      this.imageParamsSet1.spacing = 4;
      this.imageParamsSet1.add( this.FixColumnDefectsCheckBox );
      this.imageParamsSet1.add( this.FixRowDefectsCheckBox );
      this.imageParamsSet1.add( this.CometAlignCheckBox );
      this.imageParamsSet1.add( this.fastIntegrationCheckBox );
      this.imageParamsSet1.add( this.imageintegration_ssweight_CheckBox );
      this.imageParamsSet1.add( this.crop_to_common_area_CheckBox );
      this.imageParamsSet1.add( this.use_background_neutralization_CheckBox );
      
      // Image parameters set 2.
      this.imageParamsSet2 = new VerticalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.useLocalNormalizationCheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_GC_CheckBox );
      this.imageParamsSet2.add( this.use_spcc_CheckBox );
      this.imageParamsSet2.add( this.GC_before_channel_combination_CheckBox );
      this.imageParamsSet2.add( this.use_GC_L_RGB_CheckBox );
      this.imageParamsSet2.add( this.use_GC_L_RGB_stretched_CheckBox );
      this.imageParamsSet2.add( this.drizzleSizer );

      //
      // Stretching choice
      //
      var histogramStretchToolTip = "Using a simple histogram transformation to get histogram median or peak to the target value. " + 
                                    "Works best with images that are processed with the Crop to common area option.";

      if (use_hyperbolic) {
            var Hyperbolic_tips = "<p>Generalized Hyperbolic Stretching (GHS) is most useful on bright targets where AutoSTF may not work well. " + 
                              "It often preserves background and stars well and also saturation is good. For very dim or small targets " + 
                              "the implementation in AutoIntegrate does not work that well.</p>" + 
                              "<p>It is recommended that dark background is as clean as possible from any gradients with GHS. " + 
                              "Consider using ABE or GraXpert on combined images and maybe also BackgroundNeutralization to clean image background. Local Normalization can be useful too.</p>" +
                              "<p>It is also recommended that Crop to common are option is used. It cleans the image from bad data and makes " + 
                              "finding the symmetry point more robust.</p>" + 
                              "<p>Generalized Hyperbolic Stretching is using PixelMath formulas from PixInsight forum member dapayne (David Payne).</p>";
            var Hyperbolic_li = "<li><p>Hyperbolic - Experimental, Generalized Hyperbolic Stretching using GeneralizedHyperbolicStretch process.</p>" + Hyperbolic_tips + "</li>";
      } else {
            var Hyperbolic_li = "";
      }

      var stretchingTootip = 
            "<p>Select how image is stretched from linear to non-linear.</p>" +
            "<ul>" +
            "<li><p>Auto STF - Use auto Screen Transfer Function to stretch image to non-linear.</p></li>" +
            "<li><p>Masked Stretch - Use MaskedStretch to stretch image to non-linear.<br>Useful when AutoSTF generates too bright images, like on some galaxies.</p></li>" +
            "<li><p>Masked+Histogram Stretch - Use MaskedStretch with a Histogram Stretch prestretch to stretch image to non-linear.<br>Prestretch help with stars that can be too pointlike with Masked Stretch.</p></li>" +
            "<li><p>Histogram stretch - " + histogramStretchToolTip + "</p></li>" +
            Hyperbolic_li +
            "<li><p>Arcsinh Stretch - Use ArcsinhStretch to stretch image to non-linear.<p>Can be useful when stretching stars to keep good star color.</p></li>" +
            "<li><p>Logarithmic stretch - Experimental stretch</p></li>" +
            "<li><p>None - No stretching, mainly for generating _HT files to be used with AutoContinue.</p></li>" +
            "</ul>" + 
            "<p>See Image stretching settings section in Processing 1 tab to set stretching specific parameters.</p>" +
            "<p>Note that when non-default <i>Target</i> type is selected then this option is disabled.</p>";
      this.stretchingComboBox = newComboBox(this, par.image_stretching, image_stretching_values, stretchingTootip);
      stretchingComboBox = this.stretchingComboBox;
      if (par.target_type.val != 'Default') {
            stretchingComboBox.enabled = false;
      }
      this.stretchingLabel = newLabel(this, "Stretching", stretchingTootip, true);
      this.stretchingSizer = newHorizontalSizer(4, true, [ this.stretchingLabel, this.stretchingComboBox ]);

      this.imageParamsControlSubSizer = newHorizontalSizer(4, true, [ this.imageParamsSet1, this.imageParamsSet2 ]);

      // Image group par.
      this.imageParamsControl = new Control( this );
      this.imageParamsControl.sizer = new VerticalSizer;
      this.imageParamsControl.sizer.margin = 6;
      this.imageParamsControl.sizer.spacing = 4;
      this.imageParamsControl.sizer.add( this.imageParamsControlSubSizer );
      this.imageParamsControl.sizer.add( this.stretchingSizer );
      this.imageParamsControl.visible = false;
      this.imageParamsControl.sizer.addStretch();

      // Image tools and batching set 1.
      this.imageToolsSet1 = new VerticalSizer;
      this.imageToolsSet1.margin = 6;
      this.imageToolsSet1.spacing = 4;
      if (global.is_gc_process) {
            this.imageToolsSet1.add( this.use_abe_CheckBox );
      }
      this.imageToolsSet1.add( this.use_graxpert_CheckBox );
      this.imageToolsSet1.add( this.use_StarXTerminator_CheckBox );
      this.imageToolsSet1.add( this.use_starnet2_CheckBox );
      
      // Image tools and batching set 2.
      this.imageToolsSet2 = new VerticalSizer;
      this.imageToolsSet2.margin = 6;
      this.imageToolsSet2.spacing = 4;
      this.imageToolsSet2.add( this.use_noisexterminator_CheckBox );
      this.imageToolsSet2.add( this.use_graxpert_denoise_CheckBox );
      this.imageToolsSet2.add( this.use_deepsnr_CheckBox );
      this.imageToolsSet2.add( this.use_blurxterminator_CheckBox );

      // Image tools and batching set 3.
      this.imageToolsSet3 = new VerticalSizer;
      this.imageToolsSet3.margin = 6;
      this.imageToolsSet3.spacing = 4;
      this.imageToolsSet3.add( this.batch_mode_CheckBox );
      this.imageToolsSet3.add( this.solve_image_CheckBox );
      
      // Image tools and batching par.
      this.imageToolsControl = new Control( this );
      this.imageToolsControl.sizer = new HorizontalSizer;
      this.imageToolsControl.sizer.margin = 6;
      this.imageToolsControl.sizer.spacing = 4;
      this.imageToolsControl.sizer.add( this.imageToolsSet1 );
      this.imageToolsControl.sizer.add( this.imageToolsSet2 );
      this.imageToolsControl.sizer.add( this.imageToolsSet3 );
      this.imageToolsControl.visible = false;
      this.imageToolsControl.sizer.addStretch();

      // Other parameters set 0.
      this.otherParamsSet01 = new VerticalSizer;
      this.otherParamsSet01.margin = 6;
      this.otherParamsSet01.spacing = 4;
      this.otherParamsSet01.add( this.CosmeticCorrectionCheckBox );
      this.otherParamsSet01.add( this.SubframeSelectorCheckBox );
      this.otherParamsSet01.add( this.imageintegration_clipping_CheckBox );
      this.otherParamsSet01.add( this.remove_stars_channel_CheckBox );
      this.otherParamsSet01.add( this.remove_stars_before_stretch_CheckBox );
      this.otherParamsSet01.add( this.remove_stars_stretched_CheckBox );
      this.otherParamsSet01.add( this.remove_stars_light_CheckBox );
      this.otherParamsSet01.add( this.unscreen_stars_CheckBox );
      this.otherParamsSet01.add( this.forceNewMask_CheckBox );

      this.otherParamsSet02 = new VerticalSizer;
      this.otherParamsSet02.margin = 6;
      this.otherParamsSet02.spacing = 4;
      this.otherParamsSet02.add( this.no_mask_contrast_CheckBox );
      this.otherParamsSet02.add( this.shadowClip_CheckBox );
      this.otherParamsSet02.add( this.no_SCNR_CheckBox );
      this.otherParamsSet02.add( this.no_sharpening_CheckBox );
      this.otherParamsSet02.add( this.skip_noise_reduction_CheckBox );
      this.otherParamsSet02.add( this.skip_star_noise_reduction_CheckBox );
      this.otherParamsSet02.add( this.skip_color_calibration_CheckBox );
      this.otherParamsSet02.add( this.GC_on_lights_CheckBox );

      this.otherParamsSet0 = new HorizontalSizer;
      this.otherParamsSet0.margin = 6;
      this.otherParamsSet0.spacing = 4;
      this.otherParamsSet0.add( this.otherParamsSet01 );
      this.otherParamsSet0.add( this.otherParamsSet02 );

      // Other parameters set 1.
      this.otherParamsSet11 = new VerticalSizer;
      this.otherParamsSet11.margin = 6;
      this.otherParamsSet11.spacing = 4;
      this.otherParamsSet11.add( this.CalibrateOnlyCheckBox );
      this.otherParamsSet11.add( this.DebayerOnlyCheckBox );
      this.otherParamsSet11.add( this.BinningOnlyCheckBox );
      this.otherParamsSet11.add( this.ExtractChannelsOnlyCheckBox );
      this.otherParamsSet11.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet11.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet11.add( this.CropInfoOnlyCheckBox );
      this.otherParamsSet11.add( this.imageWeightTestingCheckBox );
      this.otherParamsSet11.add( this.earlyPSFCheckCheckBox );

      this.otherParamsSet12 = new VerticalSizer;
      this.otherParamsSet12.margin = 6;
      this.otherParamsSet12.spacing = 4;
      this.otherParamsSet12.add( this.start_from_imageintegration_CheckBox );
      this.otherParamsSet12.add( this.RRGB_image_CheckBox );
      this.otherParamsSet12.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet12.add( this.synthetic_missing_images_CheckBox );
      this.otherParamsSet12.add( this.generate_xdrz_CheckBox );
      this.otherParamsSet12.add( this.force_file_name_filter_CheckBox );
      this.otherParamsSet12.add( this.autodetect_filter_CheckBox );
      this.otherParamsSet12.add( this.autodetect_imagetyp_CheckBox );

      this.otherParamsSet1 = new HorizontalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.otherParamsSet11 );
      this.otherParamsSet1.add( this.otherParamsSet12 );

      // System parameters set 2.
      this.systemParamsSet1 = new VerticalSizer;
      this.systemParamsSet1.margin = 6;
      this.systemParamsSet1.spacing = 4;
      this.systemParamsSet1.add( this.keepIntegratedImagesCheckBox );
      this.systemParamsSet1.add( this.save_all_files_CheckBox );
      this.systemParamsSet1.add( this.select_all_files_CheckBox );
      this.systemParamsSet1.add( this.unique_file_names_CheckBox );
      this.systemParamsSet1.add( this.win_prefix_to_log_files_CheckBox );
      this.systemParamsSet1.add( this.no_subdirs_CheckBox );

      this.systemParamsSet2 = new VerticalSizer;
      this.systemParamsSet2.margin = 6;
      this.systemParamsSet2.spacing = 4;
      if (!global.use_preview) {
            this.systemParamsSet2.add( this.blink_checkbox );
      }
      this.systemParamsSet2.add( this.StartWithEmptyWindowPrefixBox );
      this.systemParamsSet2.add( this.ManualIconColumnBox );
      this.systemParamsSet2.add( this.AutoSaveSetupBox );
      this.systemParamsSet2.add( this.UseProcessedFilesBox );
      this.systemParamsSet2.add( this.saveCroppedImagesBox );
      this.systemParamsSet2.add( this.resetOnSetupLoadCheckBox );

      this.systemParamsSet = new HorizontalSizer;
      this.systemParamsSet.margin = 6;
      this.systemParamsSet.spacing = 4;
      this.systemParamsSet.add( this.systemParamsSet1 );
      this.systemParamsSet.add( this.systemParamsSet2 );

      // Other Group par.
      this.otherParamsControl = new Control( this );
      this.otherParamsControl.sizer = new VerticalSizer;
      this.otherParamsControl.sizer.margin = 6;
      this.otherParamsControl.sizer.spacing = 4;
      this.otherParamsControl.sizer.add( newLabel(this, "Additional processing options", null, true) );
      this.otherParamsControl.sizer.add( this.otherParamsSet0 );
      this.otherParamsControl.sizer.add( newLabel(this, "Special processing", null, true) );
      this.otherParamsControl.sizer.add( this.otherParamsSet1 );
      this.otherParamsControl.visible = false;
      //this.otherParamsControl.sizer.addStretch();

      this.systemParamsControl = new Control( this );
      this.systemParamsControl.sizer = new VerticalSizer;
      this.systemParamsControl.sizer.margin = 6;
      this.systemParamsControl.sizer.spacing = 4;
      this.systemParamsControl.sizer.add( this.systemParamsSet );
      this.systemParamsControl.visible = false;
      //this.systemParamsControl.sizer.addStretch();
      
      
      // LRGBCombination selection
      this.LRGBCombinationLightnessControl = newNumericEdit(this, "Lightness", par.LRGBCombination_lightness, 0, 1, 
            "<p>LRGBCombination lightness setting. Smaller value gives more bright image. Usually should be left to the default value.</p>");

      this.LRGBCombinationSaturationControl = newNumericEdit(this, "Saturation", par.LRGBCombination_saturation, 0, 1, 
            "<p>LRGBCombination saturation setting. Smaller value gives more saturated image. Usually should be left to the default value.</p>");

      this.LRGBCombinationGroupBoxLabel = newSectionLabel(this, "LRGBCombination settings");
      this.LRGBCombinationGroupBoxLabel.toolTip = 
            "<p>LRGBCombination settings can be used to fine tune image. For relatively small " +
            "and bright objects like galaxies it may be useful to reduce brightness and increase saturation.</p>";
      this.LRGBCombinationSizer = newVerticalSizer(6, true, [this.LRGBCombinationGroupBoxLabel, this.LRGBCombinationLightnessControl, this.LRGBCombinationSaturationControl] );

      // StarAlignment selection
      var starAlignmentValuesToolTip = "<p>If star aligment fails you can try change values. Here is one suggestion of values that might help:<br>" +
                                       "- Sensitivity: 0.70<br>" + 
                                       "- Noise reduction<br>" + 
                                       "If you have very bad distortion then also increasing maximum distortion can help.</p>";
      this.sensitivityStarAlignmentControl = newNumericEdit(this, "Sensitivity", par.staralignment_sensitivity, 0, 1, 
            "<p>Sensitivity setting. Bigger value will detect fainter stars.</p>" + starAlignmentValuesToolTip);
      this.maxStarDistortionStarAlignmentControl = newNumericEdit(this, "Maximum distortion", par.staralignment_maxstarsdistortion, 0, 1, 
            "<p>Maximum star distortion setting. Bigger value will detect more irregular stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentLabel = newLabel(this, "Structure layers", "<p>Structure layers setting. Bigger value will detect more stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentControl = newSpinBox(this, par.staralignment_structurelayers, 1, 8, this.structureLayersStarAlignmentLabel.toolTip);
      this.noiseReductionFilterRadiusStarAlignmentLabel = newLabel(this, "Noise reduction", "<p>Noise reduction filter radius layers setting. Bigger value can help with very noisy images.</p>" + starAlignmentValuesToolTip);
      this.noiseReductionFilterRadiusStarAlignmentControl = newSpinBox(this, par.staralignment_noisereductionfilterradius, 0, 50, this.noiseReductionFilterRadiusStarAlignmentLabel.toolTip);

      this.StarAlignmentGroupBoxLabel = newSectionLabel(this, "StarAlignment settings");
      this.StarAlignmentGroupBoxLabel.toolTip = 
            "<p>StarAlignment settings can be used to fine tune star alignment to detect more stars if default values do not work.</p>" + starAlignmentValuesToolTip;
      this.StarAlignmentGroupBoxSizer = new HorizontalSizer;
      this.StarAlignmentGroupBoxSizer.margin = 6;
      this.StarAlignmentGroupBoxSizer.spacing = 4;
      this.StarAlignmentGroupBoxSizer.add( this.sensitivityStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.maxStarDistortionStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.structureLayersStarAlignmentLabel );
      this.StarAlignmentGroupBoxSizer.add( this.structureLayersStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.noiseReductionFilterRadiusStarAlignmentLabel );
      this.StarAlignmentGroupBoxSizer.add( this.noiseReductionFilterRadiusStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.addStretch();

      this.cometAlignmentGroupBoxLabel = newSectionLabel(this, "CometAlignment settings");
      this.cometAlignmentGroupBoxLabel.toolTip = 
            "<p>CometAlignment settings can be used to set values for comet alignment process.</p>" +
            comet_alignment_toolTip;

      var cometFirstImageAction = function() {
            if (engine.firstDateFileInfo == null) {
                  console.criticalln("No first image.");
            } else {
                  updatePreviewFilename(engine.firstDateFileInfo.name, true);
            }
      }
      var cometLastImageAction = function() {
            if (engine.lastDateFileInfo == null) {
                  console.criticalln("No last image.");
            } else {
                  updatePreviewFilename(engine.lastDateFileInfo.name, true);
            }
      }

      this.cometAlignFirstLabel = newLabel(this, "First image X₀,Y₀:", "<p>Coordinates for the first comet image.</p>" + comet_alignment_toolTip);
      this.cometAlignFirstXY = newTextEdit(this, par.comet_first_xy, this.cometAlignFirstLabel.toolTip);
      this.cometAlignFirstXYButton = newPushOrToolButton(this, null, "Preview", "<p>Show the first comet image in the preview tab.</p>" + comet_alignment_toolTip, cometFirstImageAction, false);
      this.cometAlignLastLabel = newLabel(this, "Last image X₁,Y₁:", "<p>Coordinates for the last comet image.</p>" + comet_alignment_toolTip);
      this.cometAlignLastXY = newTextEdit(this, par.comet_last_xy, this.cometAlignLastLabel.toolTip);
      this.cometAlignLastXYButton = newPushOrToolButton(this, null, "Preview", "<p>Show the last image in the preview tab.</p>" + comet_alignment_toolTip, cometLastImageAction, false);

      this.cometAlignHelpTips = new ToolButton( this );
      this.cometAlignHelpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.cometAlignHelpTips.setScaledFixedSize( 20, 20 );
      this.cometAlignHelpTips.toolTip = comet_alignment_toolTip;
      var cometAlignHelpTips = this.cometAlignHelpTips;
      this.cometAlignHelpTips.onClick = function()
      {
            new MessageBox(comet_alignment_toolTip, "Comet alignment", StdIcon_Information ).execute();
      }

      this.cometAlignmentGroupBoxSizer = new HorizontalSizer;
      this.cometAlignmentGroupBoxSizer.margin = 6;
      this.cometAlignmentGroupBoxSizer.spacing = 4;
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstLabel );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstXY );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstXYButton );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastLabel );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastXY );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastXYButton );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignHelpTips );
      this.cometAlignmentGroupBoxSizer.addStretch();

      // Saturation selection
      this.linearSaturationLabel = new Label( this );
      this.linearSaturationLabel.text = "Linear saturation increase";
      this.linearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.linearSaturationLabel.toolTip = "<p>Saturation increase in linear state using a mask.</p>";
      this.linearSaturationSpinBox = newSpinBox(this, par.linear_increase_saturation, 0, 10, this.linearSaturationLabel.toolTip);

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.nonLinearSaturationLabel.toolTip = "<p>Saturation increase in non-linear state using a mask.</p>";
      this.nonLinearSaturationSpinBox = newSpinBox(this, par.non_linear_increase_saturation, 0, 10, this.nonLinearSaturationLabel.toolTip);

      this.saturationGroupBoxLabel = newSectionLabel(this, "Saturation setting");
      this.saturationGroupBoxSizer = new HorizontalSizer;
      this.saturationGroupBoxSizer.margin = 6;
      this.saturationGroupBoxSizer.spacing = 4;
      this.saturationGroupBoxSizer.add( this.linearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.linearSaturationSpinBox );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationSpinBox );
      this.saturationGroupBoxSizer.addStretch();

      // Noise reduction
      this.noiseReductionStrengthLabel = new Label( this );
      this.noiseReductionStrengthLabel.text = "Noise reduction";
      this.noiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for color channel (R,G,B,H,S,O) or color images.</p>" + noiseReductionToolTipCommon;
      this.noiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.noiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.noise_reduction_strength, noise_reduction_strength_values, this.noiseReductionStrengthLabel.toolTip);

      this.luminanceNoiseReductionStrengthLabel = new Label( this );
      this.luminanceNoiseReductionStrengthLabel.text = "Luminance noise reduction";
      this.luminanceNoiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for luminance image.</p>" + noiseReductionToolTipCommon;
      this.luminanceNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.luminanceNoiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.luminance_noise_reduction_strength, noise_reduction_strength_values, this.luminanceNoiseReductionStrengthLabel.toolTip);

      this.noise_reduction_checkbox_label = newLabel(this, "Noise reduction on", 
                                                "Select when noise reduction is done. Multiple options can be selected. " +
                                                "When using BlurXTerminator it is recommended to use Combined image noise reduction.");
      this.auto_noise_reduction_CheckBox = newCheckBox(this, "Auto", par.auto_noise_reduction,
            "<p>Select automatically correct time for noise reduction.</p>" + 
            "<p>If GradientXTerminator is used, then combined image noise reduction is used. Otherwise channel noise reduction is used.</p>" + 
            "<p>This option enables also color/OSC image noise reduction.</p>");
      this.channel_noise_reduction_CheckBox = newCheckBox(this, "Channel image", par.channel_noise_reduction,
            "<p>Do noise reduction on each color channels and luminance image separately.</p><p>This option enables also color/OSC image noise reduction.</p>");
      this.combined_noise_reduction_CheckBox = newCheckBox(this, "Combined image", par.combined_image_noise_reduction,
            "<p>Do noise reduction on combined image and luminance image in linear stage instead of each color channels separately.</p><p>This option enables also color/OSC image noise reduction.</p>" );
      this.non_linear_noise_reduction_CheckBox = newCheckBox(this, "Non-linear image", par.non_linear_noise_reduction, 
            "<p>Do noise reduction in non-linear state after stretching on combined and luminance images.</p>" );
      this.color_noise_reduction_CheckBox = newCheckBox(this, "Color noise reduction", par.use_color_noise_reduction, 
            "<p>Do color noise reduction.</p>" );

      this.ACDNR_noise_reduction_Control = newNumericEdit(this, "ACDNR noise reduction", par.ACDNR_noise_reduction, 0, 5, 
            "<p>If non-zero, sets StdDev value and runs ACDNR noise reduction.</p>" +
            ACDNR_StdDev_tooltip);

      this.noiseReductionGroupBoxLabel = newSectionLabel(this, "Noise reduction settings");
      this.noiseReductionGroupBoxSizer1 = new HorizontalSizer;
      // this.noiseReductionGroupBoxSizer1.margin = 6;
      this.noiseReductionGroupBoxSizer1.spacing = 4;
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.addStretch();

      this.noiseReductionGroupBoxSizer11 = new HorizontalSizer;
      // this.noiseReductionGroupBoxSizer11.margin = 2;
      this.noiseReductionGroupBoxSizer11.spacing = 4;
      this.noiseReductionGroupBoxSizer11.add( this.color_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.ACDNR_noise_reduction_Control );
      this.noiseReductionGroupBoxSizer11.addStretch();

      this.noiseReductionGroupBoxSizer2 = new HorizontalSizer;
      // this.noiseReductionGroupBoxSizer2.margin = 2;
      this.noiseReductionGroupBoxSizer2.spacing = 4;
      this.noiseReductionGroupBoxSizer2.add( this.noise_reduction_checkbox_label );
      this.noiseReductionGroupBoxSizer2.add( this.auto_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.add( this.channel_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.add( this.combined_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.add( this.non_linear_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.addStretch();

      this.noiseReductionGroupBoxSizer = new VerticalSizer;
      this.noiseReductionGroupBoxSizer.margin = 6;
      this.noiseReductionGroupBoxSizer.spacing = 4;
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionGroupBoxSizer1 );
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionGroupBoxSizer11 );
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionGroupBoxSizer2 );
      this.noiseReductionGroupBoxSizer.addStretch();

      this.sharpeningGroupBoxLabel = newSectionLabel(this, "Sharpening settings for BlurXTerminator");

      this.bxtLabel = newLabel(this, "BlurXTerminator,", "Settings for BlurXTerminator. To use BlurXTerminator you need to check <i>Use BlurXTerminator</i> in <i>Tools and batching</i> section.");
      this.bxtSharpenStars = newNumericEdit(this, "Sharpen stars", par.bxt_sharpen_stars, 0, 0.50, "Amount to reduce the diameter of stars.  Use a value between 0.00 and 0.50.");
      this.bxtAdjustHalo = newNumericEdit(this, "Adjust star halos", par.bxt_adjust_halo, -0.50, 0.50, "Amount to adjust star halos. Use a value between -0.50 and 0.50.");
      this.bxtSharpenNonstellar = newNumericEdit(this, "Sharpen nonstellar", par.bxt_sharpen_nonstellar, 0, 1, "The amount to sharpen non-stellar image features. Use a value between 0.00 and 1.00.");

      this.sharpeningGroupBoxSizer1 = new HorizontalSizer;
      // this.sharpeningGroupBoxSizer1.margin = 6;
      this.sharpeningGroupBoxSizer1.spacing = 4;
      this.sharpeningGroupBoxSizer1.add( this.bxtLabel );
      this.sharpeningGroupBoxSizer1.add( this.bxtSharpenStars );
      this.sharpeningGroupBoxSizer1.add( this.bxtAdjustHalo );
      this.sharpeningGroupBoxSizer1.add( this.bxtSharpenNonstellar );
      this.sharpeningGroupBoxSizer1.addStretch();

      this.bxtPSF = newNumericEdit(this, "PSF", par.bxt_psf, 0, 8, "Manual PSF value if a non-zero value is given.");
      this.bxtImagePSF = newCheckBox(this, "Get PSF from image", par.bxt_image_psf, 
            "<p>Get PSF value from image using FWHM.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>" );
      this.bxtMedianPSF = newCheckBox(this, "Use median PSF", par.bxt_median_psf, 
            "<p>Use median FWHM from subframe selector as PSF value. It can be useful when PSF cannot be calculated from the image.</p>" + 
            "<p>Value is printed to the AutoIntegrate.log file with a name medianFWHM.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>" );
      this.bxtCorrectOnlyBeforeCC = newCheckBox(this, "Correct only before CC", par.bxt_correct_only_before_cc, 
            "<p>Run BlurXTerminator in correct only mode before color calibration.</p>" );

      this.sharpeningGroupBoxSizer2 = new HorizontalSizer;
      // this.sharpeningGroupBoxSizer2.margin = 2;
      this.sharpeningGroupBoxSizer2.spacing = 4;
      this.sharpeningGroupBoxSizer2.add( this.bxtPSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtImagePSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtMedianPSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtCorrectOnlyBeforeCC );
      this.sharpeningGroupBoxSizer2.addStretch();

      this.sharpeningGroupBoxSizer = new VerticalSizer;
      this.sharpeningGroupBoxSizer.margin = 6;
      this.sharpeningGroupBoxSizer.spacing = 4;
      this.sharpeningGroupBoxSizer.add( this.sharpeningGroupBoxSizer1 );
      this.sharpeningGroupBoxSizer.add( this.sharpeningGroupBoxSizer2 );
      this.sharpeningGroupBoxSizer.addStretch();

      function AImodelSizer(parent, name, param, toolTip) {
            var AImodelLabel = newLabel(parent, name, "<p>Select AI model for " + name + "</p>" + toolTip);
            var AImodelEdit = newTextEdit(parent, param, AImodelLabel.toolTip);
            var AImodelButton = new ToolButton( parent );
            AImodelButton.icon = parent.scaledResource(":/icons/select-file.png");
            AImodelButton.toolTip = AImodelLabel.toolTip;
            AImodelButton.setScaledFixedSize( 20, 20 );
            AImodelButton.onClick = function()
            {
                  var ofd = new OpenFileDialog;
                  ofd.multipleSelections = false;
                  if (!ofd.execute()) {
                        return;
                  }
                  AImodelEdit.text = File.extractName(ofd.fileName) + File.extractExtension(ofd.fileName);
                  param.val = AImodelEdit.text;
            };
            var AImodelSizer = newHorizontalSizer(0, true, [ AImodelLabel, AImodelEdit, AImodelButton ]);

            return AImodelSizer
      }

      var starxterminator_default_ai_model = "unknown";

      try {
            var P = new StarXTerminator;
            starxterminator_default_ai_model = P.ai_file
      } catch (e) {
      }

      this.StarXTerminatorAImodeSizer = AImodelSizer(this, "StarXTerminator", par.starxterminator_ai_model, 
                                                "<p>Select other than default AI model. Default AI model is " + starxterminator_default_ai_model + "</p>" +
                                                "<p>AI models are stored in PixInsight installation directory and have .pb extension. " + 
                                                "At least in Windows they are in PixInsight/library directory.</p>");
      this.StarXTerminatorLargeOverlapCheckBox = newCheckBox(this, "Large overlap", par.starxterminator_large_overlap, 
            "<p>Uses large overlap on tiles to avoid tiling artifacts</p>");

      this.StarXTerminatorSizer = new HorizontalSizer;
      this.StarXTerminatorSizer.margin = 6;
      this.StarXTerminatorSizer.spacing = 4;
      this.StarXTerminatorSizer.add( this.StarXTerminatorAImodeSizer );
      this.StarXTerminatorSizer.add( this.StarXTerminatorLargeOverlapCheckBox );
      this.StarXTerminatorSizer.addStretch();

      this.StarXTerminatorGroupBoxLabel = newSectionLabel(this, "StarXTerminator settings");
      this.StarXTerminatorGroupBoxSizer = new VerticalSizer;
      this.StarXTerminatorGroupBoxSizer.margin = 6;
      this.StarXTerminatorGroupBoxSizer.spacing = 4;
      this.StarXTerminatorGroupBoxSizer.add( this.StarXTerminatorGroupBoxLabel );
      this.StarXTerminatorGroupBoxSizer.add( this.StarXTerminatorSizer );
      this.StarXTerminatorGroupBoxSizer.addStretch();

      this.binningLabel = new Label( this );
      this.binningLabel.text = "Binning";
      this.binningLabel.toolTip = 
            "<p>Do binning for each light file. Binning is done first on calibrated light files before any other operations.<p>" +
            "<p>With Color option binning is done only for color channel files.<p>" +
            "<p>With L and Color option binning is done for both luminance and color channel files.<p>" +
            "<p>Binning uses IntegerResample process and should help to reduce noise at the cost of decreased resolution.<p>";
      this.binningLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      // Binning
      this.binningComboBox = newComboBoxIndex(this, par.binning, binning_values, this.binningLabel.toolTip);
      this.binningSpinBoxLabel = newLabel(this, "Resample factor", 
                                          "<p>Resample factor for binning.</p>" +
                                          this.binningLabel.toolTip);
      this.binningSpinBox = newSpinBox(this, par.binning_resample, 2, 4, this.binningSpinBoxLabel.toolTip);

      this.binningGroupBoxLabel = newSectionLabel(this, "Binning");
      this.binningGroupBoxSizer = new HorizontalSizer;
      this.binningGroupBoxSizer.margin = 6;
      this.binningGroupBoxSizer.spacing = 4;
      this.binningGroupBoxSizer.add( this.binningLabel );
      this.binningGroupBoxSizer.add( this.binningComboBox );
      this.binningGroupBoxSizer.add( this.binningSpinBoxLabel );
      this.binningGroupBoxSizer.add( this.binningSpinBox );
      this.binningGroupBoxSizer.addStretch();

      // Banding
      this.bandingCheckBox = newCheckBox(this, "Banding reduction", par.banding_reduction, 
            "<p>Do Canon banding reduction using the method in CanonBandingReduction script.</p>" +
            "<p>Banding reduction is run for each light file separately after cosmetic correction and possible debayering.</p>");
      this.bandingHighlightCheckBox = newCheckBox(this, "Protect highlights", par.banding_reduction_protect_highlights, 
            "Protection for highlights.");
      this.bandingAmountControl = newNumericEdit(this, "Amount", par.banding_reduction_amount, 0, 4, 
            "<p>Reduction amount. An amount less than 1.0 is often necessary with fainter banding. </p>");

      this.bandingGroupBoxLabel = newSectionLabel(this, "Banding");
      this.bandingGroupBoxSizer = new HorizontalSizer;
      this.bandingGroupBoxSizer.margin = 6;
      this.bandingGroupBoxSizer.spacing = 4;
      this.bandingGroupBoxSizer.add( this.bandingCheckBox );
      this.bandingGroupBoxSizer.add( this.bandingHighlightCheckBox );
      this.bandingGroupBoxSizer.addSpacing( 5 );
      this.bandingGroupBoxSizer.add( this.bandingAmountControl );
      this.bandingGroupBoxSizer.addStretch();

      this.targetNameLabel = newLabel(this, "Name", "Target name (optional).");
      this.targetNameEdit = newTextEdit(this, par.target_name, this.targetNameLabel.toolTip);

      this.targetRaDecLabel = newLabel(this, "RA DEC", "<p>Target RA DEC in decimal hours and degrees.</p>" + 
                                                       "<p>Should be given if target image does not contain coordinates.</p>" +
                                                       "<p>Search button can be used to search coordinates.</p>");
      this.targetRaDecEdit = newTextEdit(this, par.target_radec, this.targetRaDecLabel.toolTip);

      this.findTargetCoordinatesButton = new ToolButton(this);
      this.findTargetCoordinatesButton.text = "Search";
      this.findTargetCoordinatesButton.icon = this.scaledResource(":/icons/find.png");
      this.findTargetCoordinatesButton.toolTip = "<p>Search for target coordinates or add coordinates manually.</p>";
      this.findTargetCoordinatesButton.onClick = function()
      {
            let search = new SearchCoordinatesDialog(null, true, true);
            search.windowTitle = "Search Coordinates";
            if (search.execute()) {
                  if (search.object == null) {
                        console.writeln("Failed to search coordinates");
                        return;
                  }
                  console.writeln("name "+ search.object.name + ", ra " + search.object.posEq.x/15 + ", dec " + search.object.posEq.y);
                  this.dialog.targetNameEdit.text = search.object.name;
                  par.target_name.val = search.object.name;
                  this.dialog.targetRaDecEdit.text = (search.object.posEq.x/15).toFixed(5) + " " + search.object.posEq.y.toFixed(5);
                  par.target_radec.val = this.dialog.targetRaDecEdit.text;
            }
      };

      this.targetFocalLabel = newLabel(this, "Focal length mm", "Focal length in millimeters. Empty value uses image metadata.");
      this.targetFocalEdit = newTextEdit(this, par.target_focal, this.targetFocalLabel.toolTip);
      this.targetPixelSizeLabel = newLabel(this, "Pixel size μm", "Pixel size in μm. Empty value uses image metadata.");
      this.targetPixelSizeEdit = newTextEdit(this, par.target_pixel_size, this.targetPixelSizeLabel.toolTip);
      this.targetBinningLabel = newLabel(this, "Binning", "<p>Target binning. Binning multiplies the pixel size by the binning value.</p>" + 
                                                            "<ul>" +
                                                            "<li>Auto uses image metadata XBINNING value when available.</li>" +
                                                            "<li>None does not modify pixel size.</li>" +
                                                            "<li>Values 2 and 4 multiply the pixel size by those values.</li>" +
                                                            "</ul>");
      this.targetBinningComboBox = newComboBox(this, par.target_binning, target_binning_values, this.targetBinningLabel.toolTip);
      this.targetDrizzleLabel = newLabel(this, "Drizzle", "<p>Target drizzle. Drizzle divides the pixel size by the drizzle value.</p>" + 
                                                            "<ul>" +
                                                            "<li>Auto uses image metadata 'DrizzleIntegration.scale:' value when available.</li>" +
                                                            "<li>None does not modify pixel size.</li>" +
                                                            "<li>Numeric values divide the pixel size by those values.</li>" +
                                                            "</ul>");
      this.targetDrizzleComboBox = newComboBox(this, par.target_drizzle, target_drizzle_values, this.targetDrizzleLabel.toolTip);
      this.targetForceSolveCheckBox = newCheckBox(this, "Force solve", par.target_forcesolve, 
                                                      "<p>Force solving images even if it already solved.</p>" +
                                                      "<p>Can be useful for example when using old data with a newer SPCC version.</p>");

      this.imageSolvingGroupBoxSizer1 = new HorizontalSizer;
      // this.imageSolvingGroupBoxSizer1.margin = 6;
      this.imageSolvingGroupBoxSizer1.spacing = 4;
      this.imageSolvingGroupBoxSizer1.add( this.targetNameLabel );
      this.imageSolvingGroupBoxSizer1.add( this.targetNameEdit );
      this.imageSolvingGroupBoxSizer1.add( this.targetRaDecLabel );
      this.imageSolvingGroupBoxSizer1.add( this.targetRaDecEdit );
      this.imageSolvingGroupBoxSizer1.add( this.findTargetCoordinatesButton );
      this.imageSolvingGroupBoxSizer1.add( this.targetForceSolveCheckBox );
      this.imageSolvingGroupBoxSizer1.addStretch();

      this.imageSolvingGroupBoxSizer2 = new HorizontalSizer;
      // this.imageSolvingGroupBoxSizer2.margin = 2;
      this.imageSolvingGroupBoxSizer2.spacing = 4;
      this.imageSolvingGroupBoxSizer2.add( this.targetFocalLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetFocalEdit );
      this.imageSolvingGroupBoxSizer2.add( this.targetPixelSizeLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetPixelSizeEdit );
      this.imageSolvingGroupBoxSizer2.add( this.targetBinningLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetBinningComboBox );
      this.imageSolvingGroupBoxSizer2.add( this.targetDrizzleLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetDrizzleComboBox );
      this.imageSolvingGroupBoxSizer2.addStretch();

      this.imageSolvingGroupBoxLabel = newSectionLabel(this, "Image solving");
      this.imageSolvingGroupBoxSizer = new VerticalSizer;
      this.imageSolvingGroupBoxSizer.margin = 6;
      this.imageSolvingGroupBoxSizer.spacing = 4;
      this.imageSolvingGroupBoxSizer.add( this.imageSolvingGroupBoxSizer1 );
      this.imageSolvingGroupBoxSizer.add( this.imageSolvingGroupBoxSizer2 );
      this.imageSolvingGroupBoxSizer.addStretch();

      this.colorCalibrationGroupBoxLabel = newSectionLabel(this, "Color Calibration");

      this.colorCalibrationNarrowbandCheckBox = newCheckBox(this, "Use for narrowband", par.color_calibration_narrowband, 
            "Enable ColorCalibration for narrowband images.");

      this.colorCalibrationTimeLabel = newLabel(this, "When to run color calibration", 
                        "<p>When to run color calibration</p>" +
                        "<ul>" +
                        "<li>With auto when using ColorCalibation process color calibration run for linear and nonlinear phase. When using SPCC process color calibration run only in linear phase.</li>" + 
                        "<li>With linear color calibration is run only in linear phase.</li>" + 
                        "<li>With nonlinear color calibration is run only in nonlinear phase.</li>" + 
                        "</ul>");
      this.colorCalibrationTimeComboBox = newComboBox(this, par.color_calibration_time, color_calibration_time_values, this.colorCalibrationTimeLabel.toolTip);
      this.colorCalibrationTimeSizer = new HorizontalSizer;
      this.colorCalibrationTimeSizer.margin = 6;
      this.colorCalibrationTimeSizer.spacing = 4;
      this.colorCalibrationTimeSizer.add( this.colorCalibrationTimeLabel );
      this.colorCalibrationTimeSizer.add( this.colorCalibrationTimeComboBox );
      this.colorCalibrationTimeSizer.addStretch();

      this.colorCalibrationSizer = new VerticalSizer;
      this.colorCalibrationSizer.margin = 6;
      this.colorCalibrationSizer.spacing = 4;
      this.colorCalibrationSizer.add( this.colorCalibrationNarrowbandCheckBox );
      this.colorCalibrationSizer.add( this.colorCalibrationTimeSizer );
      this.colorCalibrationSizer.addStretch();

      this.spccDetectionScalesLabel = newLabel(this, "Detection scales", "Number of layers used for structure detection. Larger value detects larger stars for signal evaluation. If SPCC fails you can try increasing the value.");
      this.spccDetectionScalesSpinBox = newSpinBox(this, par.spcc_detection_scales, 1, 8, this.spccDetectionScalesLabel.toolTip);
      this.spccNoiseScalesLabel = newLabel(this, "Noise scales", "Number of layers used for noise reduction. If SPCC fails you can try increasing the value.");
      this.spccNoiseScalesSpinBox = newSpinBox(this, par.spcc_noise_scales, 0, 4, this.spccNoiseScalesLabel.toolTip);
      this.spccMinStructSizeLabel = newLabel(this, "Minimum structure size", "Minimum size for a detectable star structure. Can be increased to avoid detecting image artifacts as real stars.");
      this.spccMinStructSizeSpinBox = newSpinBox(this, par.spcc_min_struct_size, 0, 1000, this.spccMinStructSizeLabel.toolTip);
      this.spccLimitMagnitudeLabel = newLabel(this, "Limit magnitude", "Limit magnitude for catalog search. Can be changed from Auto to something like 20 or larger if SPCC fails. Maximum value is 30.");
      this.spccLimitMagnitudeEdit = newTextEdit(this, par.spcc_limit_magnitude, this.spccLimitMagnitudeLabel.toolTip);
      this.spccSaturationThresholdEdit = newNumericEdit(this, "Saturation threshold", par.spcc_saturation_threshold, 0, 1, 
                                                      "If SPCC fails you can try increasing this to for example 0.90.");
      this.spccMinSNREdit = newNumericEdit(this, "Min SNR", par.spcc_min_SNR, 0, 1000, 
                                                      "If SPCC fails you can try decreasing this value. You can for example try value 0.");

      this.spccWhiteReferenceLabel = newLabel(this, "White reference", "<p>Select white reference for SPCC.</p>" +
                                                                       "<p>Usually Average Spiral Galaxy is the best choice but for narrowband images Photon Flux should be used.</p>");
      this.spccWhiteReferenceComboBox = newComboBox(this, par.spcc_white_reference, spcc_white_reference_values, this.spccWhiteReferenceLabel.toolTip);

      this.spccGroupBoxLabel = newSectionLabel(this, "Spectrophotometric Color Calibration");

      this.spccGroupBoxSizer0 = new HorizontalSizer;
      // this.spccGroupBoxSizer0.margin = 6;
      this.spccGroupBoxSizer0.spacing = 4;
      this.spccGroupBoxSizer0.add( this.spccDetectionScalesLabel );
      this.spccGroupBoxSizer0.add( this.spccDetectionScalesSpinBox );
      this.spccGroupBoxSizer0.add( this.spccNoiseScalesLabel );
      this.spccGroupBoxSizer0.add( this.spccNoiseScalesSpinBox );
      this.spccGroupBoxSizer0.add( this.spccMinStructSizeLabel );
      this.spccGroupBoxSizer0.add( this.spccMinStructSizeSpinBox );
      this.spccGroupBoxSizer0.addStretch();

      this.spccGroupBoxSizer1 = new HorizontalSizer;
      // this.spccGroupBoxSizer1.margin = 6;
      this.spccGroupBoxSizer1.spacing = 4;
      this.spccGroupBoxSizer1.add( this.spccWhiteReferenceLabel );
      this.spccGroupBoxSizer1.add( this.spccWhiteReferenceComboBox );
      this.spccGroupBoxSizer1.add( this.spccLimitMagnitudeLabel );
      this.spccGroupBoxSizer1.add( this.spccLimitMagnitudeEdit );
      this.spccGroupBoxSizer1.addStretch();

      this.spccGroupBoxSizer11 = new HorizontalSizer;
      // this.spccGroupBoxSizer11.margin = 6;
      this.spccGroupBoxSizer11.spacing = 4;
      this.spccGroupBoxSizer11.add( this.spccSaturationThresholdEdit );
      this.spccGroupBoxSizer11.add( this.spccMinSNREdit );
      this.spccGroupBoxSizer11.addStretch();

      this.spccNarrowbandCheckBox = newCheckBox(this, "Narrowband mode", par.spcc_narrowband_mode, 
            "Enable SPCC for narrowband images and use narrowband filter values.");
      this.spccBackgroundNeutralizationCheckBox = newCheckBox(this, "Background neutralization", par.spcc_background_neutralization, 
            "Do background neutralization during SPCC.");
      this.spccAutoUpdateFiltersCheckBox = newCheckBox(this, "Narrowband auto mode", par.spcc_auto_narrowband, 
            "Automatically update narrowband mode, white reference and filters. Filters are selected automatically when a single filter is used.");

      this.spccGroupBoxSizerCheckBoxes = new HorizontalSizer;
      // this.spccGroupBoxSizerCheckBoxes.margin = 4;
      this.spccGroupBoxSizerCheckBoxes.spacing = 4;
      this.spccGroupBoxSizerCheckBoxes.add( this.spccAutoUpdateFiltersCheckBox );
      this.spccGroupBoxSizerCheckBoxes.add( this.spccNarrowbandCheckBox );
      this.spccGroupBoxSizerCheckBoxes.add( this.spccBackgroundNeutralizationCheckBox );
      this.spccGroupBoxSizerCheckBoxes.addStretch();

      var spccFilterTooTip = "<p>Wavelength and bandwidths for Red, Green and Blue filters with narrowband processing.</p>" +
                             "<p>Default values are for Astrodon LRGB 2GEN filters using SHO palette.</p>";

      this.spccRedFilterWavelength = newNumericEdit(this, "Narrowband Red Wavelength", par.spcc_red_wavelength, 0, 999999, spccFilterTooTip);
      this.spccRedFilterBandwidth = newNumericEdit(this, "Bandwidth", par.spcc_red_bandwidth, 0, 999999, spccFilterTooTip);
      this.spccGreenFilterWavelength = newNumericEdit(this, "Narrowband Green Wavelength", par.spcc_green_wavelength, 0, 999999, spccFilterTooTip);
      this.spccGreenFilterBandwidth = newNumericEdit(this, "Bandwidth", par.spcc_green_bandwidth, 0, 999999, spccFilterTooTip);
      this.spccBlueFilterWavelength = newNumericEdit(this, "Narrowband Blue Wavelength", par.spcc_blue_wavelength, 0, 999999, spccFilterTooTip);
      this.spccBlueFilterBandwidth = newNumericEdit(this, "Bandwidth", par.spcc_blue_bandwidth, 0, 999999, spccFilterTooTip);

      this.spccGroupBoxSizerR = new HorizontalSizer;
      // this.spccGroupBoxSizerR.margin = 2;
      this.spccGroupBoxSizerR.spacing = 4;
      this.spccGroupBoxSizerR.add( this.spccRedFilterWavelength );
      this.spccGroupBoxSizerR.add( this.spccRedFilterBandwidth );
      this.spccGroupBoxSizerR.addStretch();

      this.spccGroupBoxSizerG = new HorizontalSizer;
      // this.spccGroupBoxSizerG.margin = 2;
      this.spccGroupBoxSizerG.spacing = 4;
      this.spccGroupBoxSizerG.add( this.spccGreenFilterWavelength );
      this.spccGroupBoxSizerG.add( this.spccGreenFilterBandwidth );
      this.spccGroupBoxSizerG.addStretch();

      this.spccGroupBoxSizerB = new HorizontalSizer;
      // this.spccGroupBoxSizerB.margin = 2;
      this.spccGroupBoxSizerB.spacing = 4;
      this.spccGroupBoxSizerB.add( this.spccBlueFilterWavelength );
      this.spccGroupBoxSizerB.add( this.spccBlueFilterBandwidth );
      this.spccGroupBoxSizerB.addStretch();

      this.spccGroupBoxSizer2 = new VerticalSizer;
      // this.spccGroupBoxSizer2.margin = 2;
      this.spccGroupBoxSizer2.spacing = 2;
      this.spccGroupBoxSizer2.add( this.spccGroupBoxSizerCheckBoxes );
      this.spccGroupBoxSizer2.add( this.spccGroupBoxSizerR );
      this.spccGroupBoxSizer2.add( this.spccGroupBoxSizerG );
      this.spccGroupBoxSizer2.add( this.spccGroupBoxSizerB );
      this.spccGroupBoxSizer2.addStretch();

      this.spccGroupBoxSizer = new VerticalSizer;
      this.spccGroupBoxSizer.margin = 6;
      this.spccGroupBoxSizer.spacing = 4;
      this.spccGroupBoxSizer.add( this.spccGroupBoxSizer0 );
      this.spccGroupBoxSizer.add( this.spccGroupBoxSizer1 );
      this.spccGroupBoxSizer.add( this.spccGroupBoxSizer11 );
      this.spccGroupBoxSizer.add( this.spccGroupBoxSizer2 );
      this.spccGroupBoxSizer.addStretch();

      // Weight calculations
      var weightHelpToolTips =
            "<p>" +
            "Generic - Use both noise and stars for the weight calculation.<br>" +
            "Noise - More weight on image noise.<br>" +
            "Stars - More weight on stars.<br>" +
            "PSF Signal - Use PSF Signal value as is.<br>" +
            "PSF Signal scaled - PSF Signal value scaled by AutoIntegrate to 1-100.<br>" +
            "FWHM scaled - FWHM value scaled by AutoIntegrate to 1-100.<br>" +
            "Eccentricity scaled - Eccentricity value scaled by AutoIntegrate to 1-100.<br>" +
            "SNR scaled - SNR value scaled by AutoIntegrate to 1-100.<br>" +
            "Star count - Star count value.<br>" +
            "</p>" +
            "<p>" +
            "All values are scaled so that bigger value is better." +
            "</p>";

      this.weightLabel = new Label( this );
      this.weightLabel.text = "Weight calculation";
      this.weightLabel.toolTip = weightHelpToolTips;
      this.weightLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.weightComboBox = newComboBox(this, par.use_weight, use_weight_values, weightHelpToolTips);

      var weightLimitToolTip = "<p>Limit value for SSWEIGHT. If value for SSWEIGHT is below the limit " +
                               "it is not included in the set of processed images.</p>" + 
                               "<p>Not that the value is written to FITS hedaer using 10 digits. Smaller than 10 digit limit values should not be used " + 
                               "if using the SSWEIGHT value that is written to FITS header.</p>";
      this.weightLimitEdit = newNumericEditPrecision(this, "Limit", par.ssweight_limit, 0, 999999, weightLimitToolTip, 10);
      
      var filterLimitHelpToolTips= "Choose filter measure and value. FWHM and Eccentricity are filtered for too high values, and all others are filtered for too low values.";
      this.filterLimit1Label = newLabel(this, "Filter 1", filterLimitHelpToolTips);
      this.filterLimit1ComboBox = newComboBox(this, par.filter_limit1_type, filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit1Edit = newNumericEditPrecision(this, "Limit", par.filter_limit1_val, 0, 999999, filterLimitHelpToolTips, 4);
      this.filterLimit2Label = newLabel(this, "Filter 2", filterLimitHelpToolTips);
      this.filterLimit2ComboBox = newComboBox(this, par.filter_limit2_type, filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit2Edit = newNumericEditPrecision(this, "Limit", par.filter_limit2_val, 0, 999999, filterLimitHelpToolTips, 4);

      this.outlierMethodLabel = new Label( this );
      this.outlierMethodLabel.text = "Outlier method";
      this.outlierMethodLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.outlierMethodLabel.toolTip = 
            "<p>Different methods are available for detecting outliers.<p>" +
            "<p>Two sigma filters out outliers that are two sigmas away from mean value.</p>" +
            "<p>One sigma filters out outliers that are one sigmas away from mean value. This option filters "+ 
            "more outliers than the two other options.</p>" +
            "<p>Interquartile range (IQR) measurement is based on median calculations. It should be " + 
            "relatively close to two sigma method.</p>";
      this.outlierMethodComboBox = newComboBox(this, par.outliers_method, outliers_methods, this.outlierMethodLabel.toolTip);

      this.outlierMinMax_CheckBox = newCheckBox(this, "Min Max", par.outliers_minmax, 
            "<p>If checked outliers are filtered using both min and max outlier threshold values.</p>" + 
            "<p>By default FWHM and Eccentricity are filtered for too high values, and SNR and SSWEIGHT are filtered for too low values.</p>" );

      var outlier_filtering_tooltip = 
            "<p>Skipping outliers can be useful when processing very large data sets and manual " +
            "filtering gets too complicated</p>" +
            "<p>Option 'SSWEIGHT' will filter out outliers based on the calculated SSWEIGHT value. It is an alternative " + 
            "to using a fixed Limit value.</p>" + 
            "<p>All other options will filter out outliers based on individual values.</p>";
      this.outlierLabel = new Label( this );
      this.outlierLabel.text = "Outlier filtering";
      this.outlierLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.outlierLabel.toolTip = outlier_filtering_tooltip;
      this.outlier_ssweight_CheckBox = newCheckBox(this, "SSWEIGHT", par.outliers_ssweight, outlier_filtering_tooltip);
      this.outlier_fwhm_CheckBox = newCheckBox(this, "FWHM", par.outliers_fwhm, outlier_filtering_tooltip);
      this.outlier_ecc_CheckBox = newCheckBox(this, "Ecc", par.outliers_ecc, outlier_filtering_tooltip);
      this.outlier_snr_CheckBox = newCheckBox(this, "SNR", par.outliers_snr, outlier_filtering_tooltip);
      this.outlier_psfsignal_CheckBox = newCheckBox(this, "PSF Signal", par.outliers_psfsignal, outlier_filtering_tooltip);
      this.outlier_psfpower_CheckBox = newCheckBox(this, "PSF Power", par.outliers_psfpower, outlier_filtering_tooltip);
      this.outlier_stars_CheckBox = newCheckBox(this, "Stars", par.outliers_stars, outlier_filtering_tooltip);

      this.weightGroupBoxLabel = newSectionLabel(this, "Image weight calculation settings");

      this.weightGroupBoxSizer = new HorizontalSizer;
      this.weightGroupBoxSizer.margin = 6;
      this.weightGroupBoxSizer.spacing = 4;
      this.weightGroupBoxSizer.add( this.weightLabel );
      this.weightGroupBoxSizer.add( this.weightComboBox );
      this.weightGroupBoxSizer.add( this.weightLimitEdit );
      this.weightGroupBoxSizer.addStretch();

      this.filterGroupBoxSizer = new HorizontalSizer;
      this.filterGroupBoxSizer.margin = 6;
      this.filterGroupBoxSizer.spacing = 4;
      this.filterGroupBoxSizer.add( this.filterLimit1Label );
      this.filterGroupBoxSizer.add( this.filterLimit1ComboBox );
      this.filterGroupBoxSizer.add( this.filterLimit1Edit );
      this.filterGroupBoxSizer.add( this.filterLimit2Label );
      this.filterGroupBoxSizer.add( this.filterLimit2ComboBox );
      this.filterGroupBoxSizer.add( this.filterLimit2Edit );
      this.filterGroupBoxSizer.addStretch();

      this.weightGroupBoxSizer2 = new HorizontalSizer;
      this.weightGroupBoxSizer2.margin = 6;
      this.weightGroupBoxSizer2.spacing = 4;
      this.weightGroupBoxSizer2.add( this.outlierLabel );
      this.weightGroupBoxSizer2.add( this.outlier_ssweight_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_fwhm_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_ecc_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_snr_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_psfsignal_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_psfpower_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_stars_CheckBox );
      this.weightGroupBoxSizer2.addStretch();

      this.weightGroupBoxSizer3 = new HorizontalSizer;
      this.weightGroupBoxSizer3.margin = 6;
      this.weightGroupBoxSizer3.spacing = 4;
      this.weightGroupBoxSizer3.add( this.outlierMethodLabel );
      this.weightGroupBoxSizer3.add( this.outlierMethodComboBox );
      this.weightGroupBoxSizer3.add( this.outlierMinMax_CheckBox );
      this.weightGroupBoxSizer3.addStretch();

      this.weightSizer = new VerticalSizer;
      //this.weightSizer.margin = 6;
      //this.weightSizer.spacing = 4;
      this.weightSizer.add( this.weightGroupBoxLabel );
      this.weightSizer.add( this.weightGroupBoxSizer );
      this.weightSizer.add( this.filterGroupBoxSizer );
      this.weightSizer.add( this.weightGroupBoxSizer2 );
      this.weightSizer.add( this.weightGroupBoxSizer3 );

      // CosmeticCorrection Sigma values
      //
      this.cosmeticCorrectionSigmaGroupBoxLabel = newSectionLabel(this, "CosmeticCorrection Sigma values");
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "<p>Hot Sigma and Cold Sigma values for CosmeticCorrection</p>";

      this.cosmeticCorrectionHotSigmaGroupBoxLabel = newLabel(this, "Hot Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionHotSigmaSpinBox = newSpinBox(this, par.cosmetic_correction_hot_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColSigmaGroupBoxLabel = newLabel(this, "Cold Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColdSigmaSpinBox = newSpinBox(this, par.cosmetic_correction_cold_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionSigmaGroupBoxSizer = new HorizontalSizer;
      this.cosmeticCorrectionSigmaGroupBoxSizer.margin = 6;
      this.cosmeticCorrectionSigmaGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColdSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionSigmaGroupBoxSizer.addStretch();

      this.cosmeticCorrectionGroupBoxSizer = new VerticalSizer;
      //this.cosmeticCorrectionGroupBoxSizer.margin = 6;
      //this.cosmeticCorrectionGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxLabel );
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxSizer );
      this.cosmeticCorrectionGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionGroupBoxSizer.addStretch();

      // Linear Fit selection

      this.linearFitComboBox = newComboBox(this, par.use_linear_fit, use_linear_fit_values, 
            "<p>Choose how to do linear fit of images.</p>" +
            "<p>Default for linear fit is to use the luminance channel. If the luminance channel is not present then RGB images use a red channel.</p>" +
            "<p>For narrowband images linear fit settings are in the <i>Narrowband processing</i> section.</p>"
      );

      this.linearFitGroupBoxLabel = newSectionLabel(this, "Linear fit settings");
      this.linearFitSizer = newVerticalSizer(6, true, [this.linearFitGroupBoxLabel, this.linearFitComboBox]);

      if (global.is_gc_process) {
            this.gc_automatic_convergence_CheckBox = newCheckBox(this, "Automatic convergence", par.gc_automatic_convergence, "<p>Run multiple iterations until difference between two models is small enough.</p>");
            this.gc_output_background_model_CheckBox = newCheckBox(this, "Output background model", par.gc_output_background_model, "<p>If checked the backgroung model is output into an image with _model extension.</p>");
            this.gc_scale_Edit = newNumericEdit(this, "Scale", par.gc_scale, 1, 10, "<p>Model scale.</p><p>Higher values generate smoother models.</p>");
            this.gc_smoothness_Edit = newNumericEdit(this, "Smoothness", par.gc_smoothness, 0, 1, "<p>Model smoothness.</p>");
            this.GCGroupBoxSizer1 = newVerticalSizer(2, true, [this.gc_automatic_convergence_CheckBox, this.gc_output_background_model_CheckBox, this.gc_scale_Edit, this.gc_smoothness_Edit]);
            
            this.gc_structure_protection_CheckBox = newCheckBox(this, "Structure Protection", par.gc_structure_protection, "<p>Prevent overcorrecting on image structures.</p>");
            this.gc_protection_threshold_Edit = newNumericEdit(this, "Protection threshold", par.gc_protection_threshold, 0, 1, "<p>Decreasing this value prevents overcorrecting dimmer structures.</p>");
            this.gc_protection_amount_Edit = newNumericEdit(this, "Protection amount", par.gc_protection_amount, 0.1, 1, "<p>Increasing this value prevents overcorrecting significant structures.</p>");
            this.GCGroupBoxSizer2 = newVerticalSizer(2, true, [this.gc_structure_protection_CheckBox, this.gc_protection_threshold_Edit, this.gc_protection_amount_Edit]);

            this.gc_simplified_model_CheckBox = newCheckBox(this, "Simplified Model", par.gc_simplified_model, "<p>If checked use a simplified model that is extracted before multiscale model.</p>");
            this.gc_simplified_model_degree_Label = newLabel(this, "Simplified Model degree", "Model degree for simplified model.", true);
            this.gc_simplified_model_degree_SpinBox = newSpinBox(this, par.gc_simplified_model_degree, 1, 8, this.gc_simplified_model_degree_Label.toolTip);
            this.gc_simplified_model_degree_Sizer = newHorizontalSizer(2, true, [this.gc_simplified_model_degree_Label, this.gc_simplified_model_degree_SpinBox]);
            this.GCGroupBoxSizer3 = newVerticalSizer(2, true, [this.gc_simplified_model_CheckBox, this.gc_simplified_model_degree_Sizer]);

            this.GCGroupBoxSizer0 = newHorizontalSizer(6, true, [this.GCGroupBoxSizer1, this.GCGroupBoxSizer2, this.GCGroupBoxSizer3], 12);

            this.GCGroupBoxLabel = newSectionLabel(this, "GredientCorrection settings");
            this.GCGroupBoxSizer = newVerticalSizer(6, true, [this.GCGroupBoxLabel, this.GCGroupBoxSizer0]);
      }

      this.ABEDegreeLabel = newLabel(this, "Function degree", "Function degree can be changed if ABE results are not good enough.", true);
      this.ABEDegreeSpinBox = newSpinBox(this, par.ABE_degree, 0, 100, this.ABEDegreeLabel.toolTip);
      this.ABECorrectionLabel = newLabel(this, "Correction", "Correction method for ABE.", true);
      this.ABECorrectionComboBox = newComboBox(this, par.ABE_correction, ABE_correction_values, this.ABECorrectionLabel.toolTip);

      this.ABEDegreeSizer = newHorizontalSizer(0, true, [this.ABEDegreeLabel, this.ABEDegreeSpinBox]);
      this.ABECorrectionSizer = newHorizontalSizer(0, true, [this.ABECorrectionLabel, this.ABECorrectionComboBox]);

      this.ABEGroupBoxLabel = newSectionLabel(this, "ABE settings");
      this.ABEGMainSizer = newHorizontalSizer(2, true, [this.ABEDegreeSizer, this.ABECorrectionSizer]);
      this.ABEGroupBoxSizer = newVerticalSizer(6, true, [this.ABEGroupBoxLabel, this.ABEGMainSizer]);

      this.graxpertPathLabel = newLabel(this, "Path", 
            "<p>Path to GraXpert executable.</p>" +
            "<p><b>NOTE!</b> Remember to use the tools button on lower left corner to save the path to " + 
            "the persistent module settings. Then the value is automatically restored when the script starts.</p>" + 
            skip_reset_tooltip);
      this.graxpertPathEdit = newTextEdit(this, par.graxpert_path, this.graxpertPathLabel.toolTip);
      this.graxpertPathButton = new ToolButton( this );
      this.graxpertPathButton.icon = this.scaledResource(":/icons/select-file.png");
      this.graxpertPathButton.toolTip = this.graxpertPathLabel.toolTip;
      this.graxpertPathButton.setScaledFixedSize( 20, 20 );
      this.graxpertPathButton.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            this.dialog.graxpertPathEdit.text = ofd.fileName;
            par.graxpert_path.val = ofd.fileName;
      };
      this.graxpertPathSizer = newHorizontalSizer(2, true, [ this.graxpertPathLabel, this.graxpertPathEdit, this.graxpertPathButton ]);

      this.graxpertCorrectionLabel = newLabel(this, "Gradient correction", "Correction method for GraXpert.", true);
      this.graxpertCorrectionComboBox = newComboBox(this, par.graxpert_correction, graxpert_correction_values, this.graxpertCorrectionLabel.toolTip);
      this.graxpertSmoothingEdit = newNumericEdit(this, "Smoothing", par.graxpert_smoothing, 0, 1, "Smoothing for GraXpert gradient correction.");
      this.graxpertGradientCorrectionSizer = newHorizontalSizer(2, true, [this.graxpertCorrectionLabel, this.graxpertCorrectionComboBox, this.graxpertSmoothingEdit]);

      this.graxpertDenoiseStrengthEdit = newNumericEdit(this, "Denoise smoothing", par.graxpert_denoise_strength, 0, 1, "Strength for GraXpert denoise.");
      this.graxpertBatchSizeLabel = newLabel(this, "Batch size", "Batch size for GraXpert denoise.", true);
      this.graxpertDenoiseBatchSizeComboBox = newComboBox(this, par.graxpert_denoise_batch_size, graxpert_batch_size_values, this.graxpertBatchSizeLabel.toolTip);
      this.graxpertDenoiseSizer = newHorizontalSizer(2, true, [this.graxpertDenoiseStrengthEdit, this.graxpertBatchSizeLabel, this.graxpertDenoiseBatchSizeComboBox]);

      this.graxpertGroupBoxLabel = newSectionLabel(this, "GraXpert settings");
      this.graxpertGroupBoxSizer = newVerticalSizer(6, true, [this.graxpertGroupBoxLabel, this.graxpertPathSizer, this.graxpertGradientCorrectionSizer, this.graxpertDenoiseSizer]);

      this.CropToleranceLabel = newLabel(this, "Tolerance", "Number of consecutive bad pixels allowed before detecting crop edge.");
      this.CropToleranceSpinBox = newSpinBox(this, par.crop_tolerance, 0, 100, this.CropToleranceLabel.toolTip);
      this.cropUseRejectionLowCheckBox = newCheckBox(this, "Use rejection low", par.crop_use_rejection_low, "Use rejection_low from ImageIntegration instead of integrated data to calculate crop amount.");
      this.cropRejectionLowLimitEdit = newNumericEdit(this, "Limit", par.crop_rejection_low_limit, 0, 1, 
            "<p>Limit value for detecting crop edge. Values below the limit are considered to be inside the cropped area.</p>" +
            "<p>This value is used only if rejection low is selected.</p>");
      this.cropCheckLimitEdit = newNumericEdit(this, "Warning limit", par.crop_check_limit, 0, 100, 
            "<p>Warning limit value in percentages. If image is cropped more than the warning limit percentage a warning message is printed at the end of processing.</p>" +
            "<p>After a warning you should manually check the cropping area.</p>");

      this.CropToleranceSizer = newHorizontalSizer(0, true, [this.CropToleranceLabel, this.CropToleranceSpinBox]);

      this.CropToleranceGroupBoxLabel = newSectionLabel(this, "Crop settings");
      this.CropSizer = newVerticalSizer(6, true, [this.CropToleranceGroupBoxLabel, this.cropUseRejectionLowCheckBox, 
                                                  this.CropToleranceSizer, this.cropRejectionLowLimitEdit, this.cropCheckLimitEdit]);

      this.linearFitAndLRGBCombinationCropSizer = newHorizontalSizer(0, true, [this.linearFitSizer, this.LRGBCombinationSizer, this.CropSizer]);

      if (global.is_gc_process) {
            this.GCStarXSizer = newVerticalSizer(0, true, [this.GCGroupBoxSizer, this.ABEGroupBoxSizer, this.graxpertGroupBoxSizer, this.StarXTerminatorGroupBoxSizer]);
      } else {
            this.GCStarXSizer = newVerticalSizer(0, true, [this.ABEGroupBoxSizer, this.graxpertGroupBoxSizer, this.StarXTerminatorGroupBoxSizer]);
      }

      //
      // Stretching parameters
      //

      this.starsStretchingLabel = newLabel(this, "Stretching for Stars ", "Stretching for stars if stars are extracted from a linear image.");
      this.starsStretchingComboBox = newComboBox(this, par.stars_stretching, image_stretching_values, stretchingTootip);
      var stars_combine_Tooltip = "<p>Select how to combine star and starless image.</p>" + stars_combine_operations_Tooltip;
      this.starsCombineLabel = newLabel(this, " Combine ", stars_combine_Tooltip);
      this.starsCombineComboBox = newComboBox(this, par.stars_combine, starless_and_stars_combine_values, stars_combine_Tooltip);
      
      this.stretchingChoiceSizer = new HorizontalSizer;
      //this.stretchingChoiceSizer.margin = 6;
      this.stretchingChoiceSizer.spacing = 4;
      this.stretchingChoiceSizer.add( this.starsStretchingLabel );
      this.stretchingChoiceSizer.add( this.starsStretchingComboBox );
      this.stretchingChoiceSizer.add( this.starsCombineLabel );
      this.stretchingChoiceSizer.add( this.starsCombineComboBox );
      this.stretchingChoiceSizer.addStretch();

      this.STFLabel = new Label( this );
      this.STFLabel.text = "Link RGB channels";
      this.STFLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.STFLabel.toolTip = 
      "<p>" +
      "RGB channel linking in Screen Transfer Function and Histogram stretch." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband and OSC/DSLR images the default " +
      "is to use unlinked channels. But if linear fit or color calibration is done with narrowband images, then linked channels are used." +
      "</p>";
      this.STFComboBox = newComboBox(this, par.STF_linking, STF_linking_values, this.STFLabel.toolTip);

      this.STFTargetBackgroundControl = newNumericEdit(this, "Auto STF targetBackground", par.STF_targetBackground, 0, 1,
                                          "<p>STF targetBackground value. If you get too bright image lowering this value can help.</p>" +
                                          "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>");

      this.STFSizer = new HorizontalSizer;
      this.STFSizer.spacing = 4;
      this.STFSizer.toolTip = this.STFLabel.toolTip;
      this.STFSizer.add( this.STFTargetBackgroundControl );
      this.STFSizer.add( this.STFLabel );
      this.STFSizer.add( this.STFComboBox );
      this.STFSizer.addStretch();

      /* Masked.
       */
      this.MaskedStretchTargetBackgroundEdit = newNumericEdit(this, "Masked Stretch targetBackground", par.MaskedStretch_targetBackground, 0, 1,
            "<p>Masked Stretch targetBackground value. Usually values between 0.1 and 0.2 work best. Possible values are between 0 and 1.</p>");
      this.MaskedStretchPrestretchTargetEdit = newNumericEdit(this, "Prestretch target", par.MaskedStretch_targetBackground, 0, 1,
            "<p>Masked Stretch prestretch target value if Masked+Histogram Stretch is used.</p>" + 
            "<p>Target value is a target median value. Using a prestretch can help with too pointlike stars.</p>");

      this.MaskedStretchSizer = new HorizontalSizer;
      this.MaskedStretchSizer.spacing = 4;
      // this.MaskedStretchSizer.margin = 2;
      this.MaskedStretchSizer.add( this.MaskedStretchTargetBackgroundEdit );
      this.MaskedStretchSizer.add( this.MaskedStretchPrestretchTargetEdit );
      this.MaskedStretchSizer.addStretch();
      
      /* Arcsinh.
       */
      this.Arcsinh_stretch_factor_Edit = newNumericEdit(this, "Arcsinh Stretch Factor", par.Arcsinh_stretch_factor, 1, 1000,
            "<p>Arcsinh Stretch Factor value. Smaller values are usually better than really big ones.</p>" +
            "<p>For some smaller but bright targets like galaxies it may be useful to increase stretch factor and iterations. A good starting point could be 100 and 5.</p>" +
            "<p>Useful for stretching stars to keep star colors. Depending on the star combine method you may need to use a different values. For less stars you can use a smaller value.</p>");
      this.Arcsinh_black_point_Control = newNumericEditPrecision(this, "Black point value %", par.Arcsinh_black_point, 0, 99,
            "<p>Arcsinh Stretch black point value.</p>" + 
            "<p>The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>",
            4);
      var Arcsinh_iterations_tooltip = "Number of iterations used to get the requested stretch factor."
      this.Arcsinh_iterations_Label = newLabel(this, "Iterations", Arcsinh_iterations_tooltip);
      this.Arcsinh_iterations_SpinBox = newSpinBox(this, par.Arcsinh_iterations, 1, 10, Arcsinh_iterations_tooltip);

      this.ArcsinhSizer = new HorizontalSizer;
      this.ArcsinhSizer.spacing = 4;
      // this.ArcsinhSizer.margin = 2;
      this.ArcsinhSizer.add( this.Arcsinh_stretch_factor_Edit );
      this.ArcsinhSizer.add( this.Arcsinh_black_point_Control );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_Label );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_SpinBox );
      this.ArcsinhSizer.addStretch();

      if (use_hyperbolic) {
            /* Hyperbolic.
            */
            this.Hyperbolic_D_Control = newNumericEdit(this, "Hyperbolic Stretch D value", par.Hyperbolic_D, 1, 15,
                  "<p>Experimental, Hyperbolic Stretch factor D value, with 0 meaning no stretch/change at all.</p>" + 
                  "<p>This value is a starting value that we use for iteration. The value is decreased until histogram " +
                  "target is below the given limit.</p>" + Hyperbolic_tips);
            this.Hyperbolic_b_Control = newNumericEdit(this, "b value", par.Hyperbolic_b, 1, 15,
                  "<p>Experimental, Hyperbolic Stretch b value that can be thought of as the stretch intensity. For bigger b, the stretch will be greater " + 
                  "focused around a single intensity, while a lower b will spread the stretch around.</p>" + Hyperbolic_tips);
            this.Hyperbolic_SP_Control = newNumericEdit(this, "SP value %", par.Hyperbolic_SP, 0, 99,
                  "<p>Experimental, Hyperbolic Stretch symmetry point value specifying the pixel value around which the stretch is applied. " + 
                  "The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>" + 
                  "<p>As a general rule for small targets you should use relatively small value so SP stays on the left side of the histogram (for example 0.1 or 1). " + 
                  "For large targets that cover more of the image you should use a values that are closer to the histogram peak (maybe something between 40 and 50).</p>" +
                  Hyperbolic_tips);
            this.Hyperbolic_target_Control = newNumericEdit(this, "Hyperbolic histogram target", par.Hyperbolic_target, 0, 1,
                  "<p>Experimental, Hyperbolic Stretch histogram target value. Stops stretching when histogram peak is within 10% of this value. Value is given in scale of [0, 1].</p>" + Hyperbolic_tips);
            this.hyperbolicIterationsLabel = new Label(this);
            this.hyperbolicIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.hyperbolicIterationsLabel.text = "Iterations";
            this.hyperbolicIterationsLabel.toolTip = "<p>Experimental, Hyperbolic Stretch number of iterations.</p>" + Hyperbolic_tips;
            this.hyperbolicIterationsSpinBox = newSpinBox(this, par.Hyperbolic_iterations, 1, 20, this.hyperbolicIterationsLabel.toolTip);
            this.hyperbolicModeLabel = new Label(this);
            this.hyperbolicModeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.hyperbolicModeLabel.text = "Mode";
            this.hyperbolicModeLabel.toolTip = "<p>Experimental, Hyperbolic Stretch test mode.</p>" +
                                          "<ul>" +
                                          "<li>1 - Decrease D for every iteration</li>" +
                                          "<li>2 - Decrease D for every iteration, use histogram peak as symmetry point (ignore SP value %)</li>" +
                                          "</ul>" + Hyperbolic_tips;
            this.hyperbolicModeSpinBox = newSpinBox(this, par.Hyperbolic_mode, 1, 2, this.hyperbolicModeLabel.toolTip);
            
            this.hyperbolicSizer1 = new HorizontalSizer;
            this.hyperbolicSizer1.spacing = 4;
            // this.hyperbolicSizer1.margin = 2;
            this.hyperbolicSizer1.add( this.Hyperbolic_D_Control );
            this.hyperbolicSizer1.add( this.Hyperbolic_b_Control );
            this.hyperbolicSizer1.add( this.Hyperbolic_SP_Control );
            this.hyperbolicSizer1.addStretch();
            
            this.hyperbolicSizer2 = new HorizontalSizer;
            this.hyperbolicSizer2.spacing = 4;
            // this.hyperbolicSizer2.margin = 2;
            this.hyperbolicSizer2.add( this.Hyperbolic_target_Control );
            this.hyperbolicSizer2.add( this.hyperbolicIterationsLabel );
            this.hyperbolicSizer2.add( this.hyperbolicIterationsSpinBox );
            this.hyperbolicSizer2.add( this.hyperbolicModeLabel );
            this.hyperbolicSizer2.add( this.hyperbolicModeSpinBox );
            this.hyperbolicSizer2.addStretch();
            
            this.hyperbolicSizer = new VerticalSizer;
            this.hyperbolicSizer.spacing = 4;
            // this.hyperbolicSizer.margin = 2;
            this.hyperbolicSizer.add( this.hyperbolicSizer1 );
            this.hyperbolicSizer.add( this.hyperbolicSizer2 );
            this.hyperbolicSizer.addStretch();
      }

      this.histogramShadowClip_Control = newNumericEditPrecision(this, "Histogram stretch shadow clip", par.histogram_shadow_clip, 0, 99,
                                          "Percentage of shadows that are clipped with Histogram stretch.", 3);
      this.histogramTypeLabel = newLabel(this, "Target type", "Target type specifies what value calculated from histogram is tried to get close to Target value.");
      this.histogramTypeComboBox = newComboBox(this, par.histogram_stretch_type, histogram_stretch_type_values, this.histogramTypeLabel.toolTip);
      this.histogramTargetValue_Control = newNumericEdit(this, "Target value", par.histogram_stretch_target, 0, 1, 
            "<p>Target value specifies where we try to get the the value calculated using Target type.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>");

      this.histogramStretchingSizer = new HorizontalSizer;
      this.histogramStretchingSizer.spacing = 4;
      // this.histogramStretchingSizer.margin = 2;
      this.histogramStretchingSizer.add( this.histogramShadowClip_Control );
      this.histogramStretchingSizer.add( this.histogramTypeLabel );
      this.histogramStretchingSizer.add( this.histogramTypeComboBox );
      this.histogramStretchingSizer.add( this.histogramTargetValue_Control );
      this.histogramStretchingSizer.addStretch();

      this.smoothBackgroundEdit = newNumericEditPrecision(this, "Smoothen background %", par.smoothbackground, 0, 100, 
            "<p>Gives the limit value as percentage of shadows that is used for shadow " + 
            "smoothing. Smoothing is done before gradient correction.</p>" +
            "<p>Usually values below 50 work best. Possible values are between 0 and 100. " + 
            "Zero values does not do smoothing.</p>" +
            "<p>Smoothening should be used only in extreme cases with very uneven background " + 
            "because a lot of shadow detail may get lost.</p>",
            4);
      this.logarithmicTargetValue_Control = newNumericEdit(this, "Logarithmic target value", par.logarithmic_stretch_target, 0, 1, 
            "<p>Target value specifies where we try to get the the value calculated using Target type.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>");

      this.smoothBackgroundSizer = new HorizontalSizer;
      this.smoothBackgroundSizer.spacing = 4;
      // this.smoothBackgroundSizer.margin = 2;
      this.smoothBackgroundSizer.add( this.logarithmicTargetValue_Control );
      this.smoothBackgroundSizer.add( this.smoothBackgroundEdit );
      this.smoothBackgroundSizer.addStretch();

      /* Options.
       */
      this.StretchingOptionsSizer = new VerticalSizer;
      this.StretchingOptionsSizer.spacing = 4;
      // this.StretchingOptionsSizer.margin = 2;
      this.StretchingOptionsSizer.add( this.STFSizer );
      this.StretchingOptionsSizer.add( this.MaskedStretchSizer );
      this.StretchingOptionsSizer.add( this.ArcsinhSizer );
      this.StretchingOptionsSizer.addStretch();

      this.StretchingGroupBoxLabel = newSectionLabel(this, "Image stretching settings");
      this.StretchingGroupBoxLabel.toolTip = "<p>Settings for stretching linear image image to non-linear.</p>";
      this.StretchingGroupBoxSizer = new VerticalSizer;
      this.StretchingGroupBoxSizer.margin = 6;
      this.StretchingGroupBoxSizer.spacing = 4;
      this.StretchingGroupBoxSizer.add( this.stretchingChoiceSizer );
      this.StretchingGroupBoxSizer.add( this.StretchingOptionsSizer );
      this.StretchingOptionsSizer.add( this.histogramStretchingSizer );
      if (use_hyperbolic) {
            this.StretchingOptionsSizer.add( this.hyperbolicSizer );
      }
      this.StretchingOptionsSizer.add( this.smoothBackgroundSizer );
      this.StretchingGroupBoxSizer.addStretch();

      //
      // Image integration
      //
      // normalization
      this.ImageIntegrationNormalizationLabel = new Label( this );
      this.ImageIntegrationNormalizationLabel.text = "Normalization";
      this.ImageIntegrationNormalizationLabel.toolTip = "<p>Rejection normalization. This is value is ignored if local normalization is used.</p>";
      this.ImageIntegrationNormalizationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.ImageIntegrationNormalizationComboBox = newComboBox(this, par.imageintegration_normalization, imageintegration_normalization_values, this.ImageIntegrationNormalizationLabel.toolTip);
   
      this.ImageIntegrationNormalizationSizer = new HorizontalSizer;
      this.ImageIntegrationNormalizationSizer.spacing = 4;
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationLabel );
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationComboBox, 100 );

      // Pixel rejection algorithm/clipping
      var sigma_tips = "If you are not happy with the rejection result you can lower the High sigma for example to 2.8.";
      var winsorised_tips = "To remove satellite trails with Winsorised sigma use lower high sigma value like 2.2 or even 1.8.";
      var ESD_tips = "If you are not happy with the rejection result you can try higher ESD Significance like 0.2 and lower Low relaxation like 1.0.";
      var ImageIntegrationHelpToolTips = 
            "<p>" +
            "<b>Auto1</b><br>" + 
            "- Percentile clipping for 1-7 images<br>" +
            "- Sigma clipping otherwise." +
            "</p><p>" +
            "<b>Auto2</b><br>" + 
            "- Percentile clipping for 1-7 images<br>" +
            "- Sigma clipping for 8 - 19 images<br>" +
            "- Linear fit clipping for 20 - 24 images<br>" +
            "- ESD clipping for more than 25 images" +
            "</p><p>" +
            "<b>Percentile</b> - Percentile clip" +
            "</p><p>" +
            "<b>Sigma</b> - Sigma clipping. " + sigma_tips +
            "</p><p>" +
            "<b>Winsorised</b> - Winsorised sigma clipping. " + winsorised_tips +
            "</p><p>" +
            "<b>Averaged</b> - Averaged sigma clipping. " + sigma_tips +
            "</p><p>" +
            "<b>Linear</b> - Linear fit clipping" +
            "</p><p>" +
            "<b>ESD</b> - Extreme Studentized Deviate clipping. " + ESD_tips +
            "</p><p>" +
            "<b>None</b> - No rejection. Useful for example with blown out comet core." +
            "</p>";

      this.ImageIntegrationRejectionLabel = new Label( this );
      this.ImageIntegrationRejectionLabel.text = "Rejection";
      this.ImageIntegrationRejectionLabel.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationRejectionComboBox = newComboBox(this, par.use_clipping, use_clipping_values, ImageIntegrationHelpToolTips);
   
      // Image integration
      this.ImageIntegrationRejectionSizer = new HorizontalSizer;
      this.ImageIntegrationRejectionSizer.spacing = 4;
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionLabel );
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionComboBox, 100 );

      this.ImageIntegrationPercentileLow = newNumericEdit(this, 'Percentile Low', par.percentile_low, 0, 1, "<p>Percentile low clipping factor.</p>");
      this.ImageIntegrationPercentileHigh = newNumericEdit(this, 'High', par.percentile_high, 0, 1, "<p>Percentile high clipping factor.</p>");
      this.ImageIntegrationSigmaLow = newNumericEdit(this, 'Sigma Low', par.sigma_low, 0, 10, "<p>Sigma low clipping factor.</p>");
      this.ImageIntegrationSigmaHigh = newNumericEdit(this, 'High', par.sigma_high, 0, 10, "<p>Sigma high clipping factor.</p><p>" + sigma_tips + "</p><p>" + winsorised_tips + "</p>");
      this.ImageIntegrationWinsorisedCutoff = newNumericEdit(this, 'Winsorization cutoff', par.winsorised_cutoff, 3, 10, "<p>Cutoff point for Winsorised sigma clipping.</p>");
      this.ImageIntegrationLinearFitLow = newNumericEdit(this, 'Linear fit Low', par.linearfit_low, 0, 10, "<p>Tolerance of low values for linear fit low clipping.</p>");
      this.ImageIntegrationLinearFitHigh = newNumericEdit(this, 'High', par.linearfit_high, 0, 10, "<p>Tolerance of high values for linear fit low clipping.</p>");
      this.ImageIntegrationESDOutliers = newNumericEdit(this, 'ESD Outliers', par.ESD_outliers, 0, 1, "<p>ESD outliers.</p>");
      this.ImageIntegrationESDSignificance = newNumericEdit(this, 'Significance', par.ESD_significance, 0, 1, "<p>ESD significance.</p><p>" + ESD_tips + "</p>");

      this.ImageIntegrationRejectionSettingsSizer1 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer1.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer1.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionSettingsSizer1.add( this.ImageIntegrationNormalizationSizer );
      this.ImageIntegrationRejectionSettingsSizer1.add( this.ImageIntegrationRejectionSizer );
      this.ImageIntegrationRejectionSettingsSizer1.addStretch();

      this.ImageIntegrationRejectionSettingsSizer2 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer2.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationPercentileLow );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationPercentileHigh );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationSigmaLow );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationSigmaHigh );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationWinsorisedCutoff );
      this.ImageIntegrationRejectionSettingsSizer2.addStretch();

      this.ImageIntegrationRejectionSettingsSizer3 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer3.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationLinearFitLow );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationLinearFitHigh );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationESDOutliers );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationESDSignificance );
      this.ImageIntegrationRejectionSettingsSizer3.addStretch();

      this.ImageIntegrationSubstackCheckBox = newCheckBox(this, "Substack,", par.substack_mode, 
            "<p>Divide light files into <i>Number of substacks</i> substacks and stack them separately. Stacked files are named as Stack_<i>num</i>_Integration_RGB.</p>" +
            "<p>When this option is enabled only image integration is done and final images are not generated. The idea is to use substacks to generate the final image.</p>" +
            "<p>Note that this works only with color (OSC) files but no checks for that are done.</p>" );
      this.ImageIntegrationSubstackLabel = newLabel(this, 'Number of substacks', "<p>Number of substacks.</p>");
      this.ImageIntegrationSubstackSpinbox = newSpinBox(this, par.substack_count, 2, 999, this.ImageIntegrationSubstackLabel.toolTip);

      this.ImageIntegrationSubstackSettingsSizer = new HorizontalSizer;
      this.ImageIntegrationSubstackSettingsSizer.spacing = 4;
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackCheckBox );
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackLabel );
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackSpinbox );
      this.ImageIntegrationSubstackSettingsSizer.addStretch();

      this.clippingGroupBoxLabel = newSectionLabel(this, 'Image integration pixel rejection');
      this.clippingGroupBoxSizer = new VerticalSizer;
      this.clippingGroupBoxSizer.margin = 6;
      this.clippingGroupBoxSizer.spacing = 4;
      this.clippingGroupBoxSizer.toolTip = ImageIntegrationHelpToolTips;
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer1 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer2 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer3 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationSubstackSettingsSizer );
      //this.clippingGroupBoxSizer.addStretch();

      this.fastIntegrationIterationsLabel = newLabel(this, 'Iterations', 
                  "<p>Increase the value if you have a lot of drift between images.</p>");
      this.fastIntegrationIterationsSpinbox = newSpinBox(this, par.fastintegration_iterations, 1, 6, this.fastIntegrationIterationsLabel.toolTip);
      this.fastIntegrationFlux = newNumericEdit(this, 'Max relative flux', par.fastintegration_max_flux, 0, 0.5, 
                  "<p>Increase the value if you have a dense starfield. Smaller values can be used for sparse starfields.</p>");
      this.fastIntegrationErrorTolerance = newNumericEdit(this, 'Error tolerance', par.fastintegration_errortolerance, 0, 4, 
                  "<p>Alignment error tolerance. You can try increasing the value if alignment fails.</p>");
      this.fastIntegrationSubframeSelectorCheckBox = newCheckBox(this, "Fast SubframeSelector", par.fastintegration_fast_subframeselector, 
            "<p>Run SubframeSelector only to a subset of images when using FastIntegration. SubframeSelector is used only to find the reference image.</p>" +
            "<p>When this option is used then the first 10 images in the list are used to find the reference image unless reference image is selected manually.</p>");
      this.fastIntegrationCosmeticCorrectionCheckBox = newCheckBox(this, "Skip CosmeticCorrection", par.fastintegration_skip_cosmeticcorrection, 
            "<p>Do not run CosmeticCorrection when using FastIntegration.</p>" +
            "<p>With a very large number of files it usually should not be necessary.</p>" );
      
      this.fastIntegrationSettingsSizer1 = new HorizontalSizer;
      this.fastIntegrationSettingsSizer1.spacing = 4;
      this.fastIntegrationSettingsSizer1.toolTip = "Settings for FastIntegration.";
      this.fastIntegrationSettingsSizer1.add( this.fastIntegrationSubframeSelectorCheckBox );
      this.fastIntegrationSettingsSizer1.add( this.fastIntegrationCosmeticCorrectionCheckBox );
      this.fastIntegrationSettingsSizer1.addStretch();

      this.fastIntegrationSettingsSizer2 = new HorizontalSizer;
      this.fastIntegrationSettingsSizer2.spacing = 4;
      this.fastIntegrationSettingsSizer2.toolTip = "Settings for FastIntegration.";
      this.fastIntegrationSettingsSizer2.add( this.fastIntegrationIterationsLabel );
      this.fastIntegrationSettingsSizer2.add( this.fastIntegrationIterationsSpinbox );
      this.fastIntegrationSettingsSizer2.add( this.fastIntegrationFlux );
      this.fastIntegrationSettingsSizer2.add( this.fastIntegrationErrorTolerance );
      this.fastIntegrationSettingsSizer2.addStretch();

      this.fastIntegrationGroupBoxLabel = newSectionLabel(this, 'FastIntegration settings');
      this.fastIntegrationGroupBoxSizer = new VerticalSizer;
      this.fastIntegrationGroupBoxSizer.margin = 6;
      this.fastIntegrationGroupBoxSizer.spacing = 4;
      this.fastIntegrationGroupBoxSizer.toolTip = "Settings for FastIntegration.";
      this.fastIntegrationGroupBoxSizer.add( this.fastIntegrationSettingsSizer1 );
      this.fastIntegrationGroupBoxSizer.add( this.fastIntegrationSettingsSizer2 );

      this.localNormalizationMultiscaleCheckBox = newCheckBox(this, "Use multiscale analysis", par.use_localnormalization_multiscale, 
            "<p>During local normalization use multiscale analysis instead of PSF flux evaluation.</p>" +
            "<p>Using multiscale analysis may help if you get errors like <i>PSFScaleEstimator::EstimateScale(): Internal error: No reference image has been defined</i>.</p>" );

      this.localNormalizationSizer = new HorizontalSizer;
      this.localNormalizationSizer.margin = 6;
      this.localNormalizationSizer.spacing = 4;
      this.localNormalizationSizer.add( this.localNormalizationMultiscaleCheckBox );
      this.localNormalizationSizer.addStretch();
      
      this.localNormalizationGroupBoxLabel = newSectionLabel(this, 'Local normalization');
      this.localNormalizationGroupBoxSizer = new VerticalSizer;
      this.localNormalizationGroupBoxSizer.margin = 6;
      this.localNormalizationGroupBoxSizer.spacing = 4;
      this.localNormalizationGroupBoxSizer.toolTip = "<p>Local normalization settings.</p>";
      this.localNormalizationGroupBoxSizer.add( this.localNormalizationSizer );
      //this.localNormalizationGroupBoxSizer.addStretch();

      // Narrowband palette

      var narrowbandToolTip = 
      "<p>" +
      "Color palette used to map SII, Ha and OIII to R, G and B" +
      "</p><p>" +
      "There is a list of predefined mapping that can be used, some examples are below. For more details " +
      "see the tooltip for palette combo box." +
      "</p><p>" +
      "SHO - SII=R, Ha=G, OIII=B  (Hubble)<br>" +
      "HOS - Ha=R, OIII=G, SII=B (CFHT)<br>" +
      "HOO - Ha=R, OIII=G, OIII=B (if there is SII it is ignored)" +
      "</p><p>" +
      "Mapping formulas are editable and other palettes can use any combination of channel images." +
      "</p><p>" +
      "Special keywords H, S, O, R, G and B are recognized and replaced " +
      "with corresponding channel image names. Otherwise these formulas " +
      "are passed directly to PixelMath process." +
      "</p><p>" +
      "Option All runs all narrowband palettes in a batch mode and creates images with names Auto_+palette-name. You can use " +
      "extra options, then also images with name Auto_+palette-name+_extra are created. Images are saved as .xisf files. " +
      "Use Save batch result files buttons to save them all in a different format. " + 
      "To use All option all HSO filters must be available." +
      "</p>";

      this.narrowbandColorPaletteLabel = newSectionLabel(this, "Color palette");
      this.narrowbandColorPaletteLabel.toolTip = narrowbandToolTip;

      /* Narrowband mappings. 
       */
      this.narrowbandCustomPalette_ComboBox = new ComboBox( this );
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            this.narrowbandCustomPalette_ComboBox.addItem( global.narrowBandPalettes[i].name );
            if (global.narrowBandPalettes[i].name == par.narrowband_mapping.val) {
                  this.narrowbandCustomPalette_ComboBox.currentItem = i;
            }
      }
      this.narrowbandCustomPalette_ComboBox.toolTip = 
            "<p>" +
            "List of predefined color palettes. You can also edit mapping input boxes to create your own mapping." +
            "</p><p>" +
            "Dynamic palettes are the same as Foraxx options in Extra processing section. " + 
            "With Dynamic palettes it is recommended to use non-linear " + 
            "images by checking the option <i>Narrowband mapping using non-linear data</i>." +
            "</p><p>" +
            Foraxx_credit + 
            "</p><p>" +
            "L-eXtreme SHO palette was posted by Alessio Pariani to Astrobin forums. It is an example mapping for L-eXtreme filter." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_ComboBox.onItemSelected = function( itemIndex )
      {
            this.dialog.narrowbandCustomPalette_R_ComboBox.editText = global.narrowBandPalettes[itemIndex].R;
            this.dialog.narrowbandCustomPalette_G_ComboBox.editText = global.narrowBandPalettes[itemIndex].G;
            this.dialog.narrowbandCustomPalette_B_ComboBox.editText = global.narrowBandPalettes[itemIndex].B;

            par.narrowband_mapping.val = global.narrowBandPalettes[itemIndex].name;
            par.custom_R_mapping.val = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
            par.custom_G_mapping.val = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
            par.custom_B_mapping.val = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
      };
      var narrowbandCustomPalette_ComboBox = this.narrowbandCustomPalette_ComboBox;
      par.narrowband_mapping.reset = function() {
            for (var i = 0; i < global.narrowBandPalettes.length; i++) {
                  if (global.narrowBandPalettes[i].name == par.narrowband_mapping.val) {
                        narrowbandCustomPalette_ComboBox.currentItem = i;
                        break;
                  }
            }
      };

      /* Create Editable boxes for R, G and B mapping. 
       */
      this.narrowbandCustomPalette_R_Label = new Label( this );
      this.narrowbandCustomPalette_R_Label.text = "R";
      this.narrowbandCustomPalette_R_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_R_Label.toolTip = 
            "<p>" +
            "Mapping for R channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_R_ComboBox = newComboBoxpalette(this, par.custom_R_mapping, [par.custom_R_mapping.val, "0.75*H + 0.25*S"], this.narrowbandCustomPalette_R_Label.toolTip);

      this.narrowbandCustomPalette_G_Label = new Label( this );
      this.narrowbandCustomPalette_G_Label.text = "G";
      this.narrowbandCustomPalette_G_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_G_Label.toolTip = 
            "<p>" +
            "Mapping for G channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_G_ComboBox = newComboBoxpalette(this, par.custom_G_mapping, [par.custom_G_mapping.val, "0.50*S + 0.50*O"], this.narrowbandCustomPalette_G_Label.toolTip);

      this.narrowbandCustomPalette_B_Label = new Label( this );
      this.narrowbandCustomPalette_B_Label.text = "B";
      this.narrowbandCustomPalette_B_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_B_Label.toolTip = 
            "<p>" +
            "Mapping for B channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_B_ComboBox = newComboBoxpalette(this, par.custom_B_mapping, [par.custom_B_mapping.val, "0.30*H + 0.70*O"], this.narrowbandCustomPalette_B_Label.toolTip);

      this.narrowbandCustomPalette_Sizer = new HorizontalSizer;
      // this.narrowbandCustomPalette_Sizer.margin = 6;
      this.narrowbandCustomPalette_Sizer.spacing = 4;
      this.narrowbandCustomPalette_Sizer.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_ComboBox );
      this.narrowbandCustomPalette_Sizer.addStretch();

      this.force_narrowband_mapping_CheckBox = newCheckBox(this, "Force narrowband mapping", par.force_narrowband_mapping, 
            "<p>" +
            "Force narrowband mapping using formulas given in Color palette section." +
            "</p>" );
      this.mapping_on_nonlinear_data_CheckBox = newCheckBox(this, "Narrowband mapping using non-linear data", par.mapping_on_nonlinear_data, 
            "<p>" +
            "Do narrowband mapping using non-linear data. Before running PixelMath images are stretched to non-linear state. " +
            "</p>" );

      this.narrowbandLinearFit_Label = new Label( this );
      this.narrowbandLinearFit_Label.text = "Linear fit";
      this.narrowbandLinearFit_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandLinearFit_Label.toolTip = 
            "<p>" +
            "Linear fit setting before running PixelMath." +
            "</p><p>" +
            "None does not use linear fit.<br>" +
            "Auto uses linear fit and tries to choose a less bright channel, first O and then S.<br>" +
            "Other selections use linear fit with that channel image." +
            "</p>";
      this.narrowbandLinearFit_Label.margin = 6;
      this.narrowbandLinearFit_Label.spacing = 4;
      this.narrowbandLinearFit_ComboBox = newComboBox(this, par.narrowband_linear_fit, narrowband_linear_fit_values, this.narrowbandLinearFit_Label.toolTip);

      this.mapping_on_nonlinear_data_Sizer = new HorizontalSizer;
      // this.mapping_on_nonlinear_data_Sizer.margin = 2;
      this.mapping_on_nonlinear_data_Sizer.spacing = 4;
      this.mapping_on_nonlinear_data_Sizer.add( this.force_narrowband_mapping_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.add( this.mapping_on_nonlinear_data_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.addStretch();

      /* Luminance channel mapping.
       */
      this.narrowbandLuminancePalette_ComboBox = new ComboBox( this );
      this.narrowbandLuminancePalette_ComboBox.addItem( "" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "L" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "max(L, H)" );
      this.narrowbandLuminancePalette_ComboBox.toolTip = "<p>Mapping of Luminance channel with narrowband data if both RGB and narrowband data are available.</p>" +
                                                         "<p>With empty text no mapping is done.</p>";
      this.narrowbandLuminancePalette_ComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "";
                        break;
                  case 1:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "L";
                        break;
                  case 2:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "max(L, H)";
                        break;
            }
            par.custom_L_mapping.val = this.dialog.narrowbandCustomPalette_L_ComboBox.editText;
      };

      this.narrowbandCustomPalette_L_Label = new Label( this );
      this.narrowbandCustomPalette_L_Label.text = "L";
      this.narrowbandCustomPalette_L_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_L_Label.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;

      this.narrowbandCustomPalette_L_ComboBox = newComboBoxpalette(this, par.custom_L_mapping, [par.custom_L_mapping.val, "max(L, H)"], this.narrowbandLuminancePalette_ComboBox.toolTip);

      this.NbLuminanceLabel = new Label( this );
      this.NbLuminanceLabel.text = "Luminance mapping";
      this.NbLuminanceLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.NbLuminanceLabel.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;
      this.NbLuminanceSizer = new HorizontalSizer;
      // this.NbLuminanceSizer.margin = 2;
      this.NbLuminanceSizer.spacing = 4;
      this.NbLuminanceSizer.add( this.NbLuminanceLabel );
      this.NbLuminanceSizer.add( this.narrowbandLuminancePalette_ComboBox );
      this.NbLuminanceSizer.add( this.narrowbandCustomPalette_L_Label );
      this.NbLuminanceSizer.add( this.narrowbandCustomPalette_L_ComboBox );
      this.NbLuminanceSizer.add( this.narrowbandLinearFit_Label );
      this.NbLuminanceSizer.add( this.narrowbandLinearFit_ComboBox );
      this.NbLuminanceSizer.addStretch();

      this.narrowbandSelectMultipleCheckBox = newCheckBox(this, "Use multiple mappings", par.use_narrowband_multiple_mappings, "Use multiple narrowband mappings.");
      this.narrowbandSelectMultipleLabel = newLabel(this, "Mappings", "");
      this.narrowbandSelectMultipleEdit = newTextEdit(this, par.narrowband_multiple_mappings_list, "");
      this.narrowbandSelectMultipleEdit.setFixedWidth(32 * this.font.width( 'M' ));
      this.narrowbandSelectMultipleButton = new PushButton(this);
      this.narrowbandSelectMultipleButton.text = "Select";
      this.narrowbandSelectMultipleButton.icon = this.scaledResource(":/icons/find.png");
      this.narrowbandSelectMultipleButton.toolTip = "<p>Select narrowband mappings.</p>";
      this.narrowbandSelectMultipleButton.onClick = function()
      {
            let narrowbandSelectMultiple = new AutoIntegrateNarrowbandSelectMultipleDialog(global, par.narrowband_multiple_mappings_list.val);
            narrowbandSelectMultiple.windowTitle = "Select Narrowband Mappings";
            if (narrowbandSelectMultiple.execute()) {
                  if (narrowbandSelectMultiple.names == null) {
                        console.writeln("No mappings selected");
                        return;
                  }
                  console.writeln("Selected mappings " + narrowbandSelectMultiple.names);
                  this.dialog.narrowbandSelectMultipleEdit.text = narrowbandSelectMultiple.names;
                  par.narrowband_multiple_mappings_list.val = narrowbandSelectMultiple.names;
            }
      };

      this.narrowbandSelectMultipleSizer = new HorizontalSizer;
      // this.narrowbandSelectMultipleSizer.margin = 2;
      this.narrowbandSelectMultipleSizer.spacing = 4;
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleCheckBox );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleButton );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleLabel );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleEdit );
      this.narrowbandSelectMultipleSizer.addStretch();

      this.narrowbandControl = new Control( this );
      this.narrowbandControl.sizer = new VerticalSizer;
      this.narrowbandControl.sizer.margin = 6;
      this.narrowbandControl.sizer.spacing = 4;
      this.narrowbandControl.sizer.add( this.narrowbandColorPaletteLabel );
      this.narrowbandControl.sizer.add( this.narrowbandCustomPalette_Sizer );
      this.narrowbandControl.sizer.add( this.NbLuminanceSizer );
      this.narrowbandControl.sizer.add( this.mapping_on_nonlinear_data_Sizer );
      this.narrowbandControl.sizer.add( this.narrowbandSelectMultipleSizer );
      this.narrowbandControl.visible = false;

      /* RGBNB mapping.
       */
            var RGBNB_tooltip = 
            "<p>" +
            "A special processing is used for narrowband to (L)RGB image " +
            "mapping. It is used to enhance (L)RGB channels with narrowband data. " + 
            "</p><p>" +
            "This mapping cannot be used without RGB filters. " + 
            "</p><p>" +
            "This mapping is similar to NBRGBCombination script in PixInsight or " +
            "as described in Light Vortex Astronomy tutorial Combining LRGB with Narrowband. " +
            "You can find more details on parameters from those sources. " +
            "</p><p>" +
            "If narrowband RGB mapping is used then narrowband Color palette is not used." +
            "</p><p>" +
            "With narrowband RGB mapping you can choose:<br>" +
            "- Which narrowband channels mapped (L)RGB channels to enhance those.<br>" +
            "- Boost for (L)RGB channels.<br>" +
            "- Bandwidth for each filter.<br>" +
            "- Test the mapping with a test button" +
            "</p><p>" +
            "If there is no Luminance channel available then selections for L channel are ignored." +
            "</p><p>" + 
            "The following steps are done:" + 
            "</p>" +
            "<ul>" +
            "<li>Enhance narrowband channel using bandwidth values.</li>" +
            "<li>Add narrowband to RGB channel using formula: RGBch + (NBch - med(NBch)) * Boost</li>" +
            "<li>Optionally run linear fit on narrowband channel using RGB channel as a reference.</li>" +
            "<li>For the final mapped channel tame max(narrowband channel, RGB channel)</li>" +
            "</ul>" +
            "<p>" +
            "Information for processing and formulas are collected from multiple sources, including:" +
            "</p>" + 
            "<ul>" +
            "<li>Light Vortex Astronomy website</li>" +
            "<li>NBRGBCombination script</li>" +
            "</ul>" +
            "";
            
      this.useRGBNBmapping_CheckBox = newCheckBox(this, "Use Narrowband RGB mapping", par.use_RGBNB_Mapping, RGBNB_tooltip);
      this.RGBNB_gradient_correction_CheckBox = newCheckBox(this, "Gradient correction", par.RGBNB_gradient_correction, 
            "<p>Do gradient correction on narrowband image before mapping.</p>" );
      this.RGBNB_linear_fit_CheckBox = newCheckBox(this, "Linear fit", par.RGBNB_linear_fit, 
            "<p>Do linear fit on narrowband image before mapping. Not used with Add option.</p>" );
      this.useRGBbandwidth_CheckBox = newCheckBox(this, "Use RGB image", par.RGBNB_use_RGB_image, 
            "<p>" +
            "Use RGB image for bandwidth mapping instead of separate R, G and B channel images. " +
            "R channel bandwidth is then used for the RGB image." +
            "</p>" );
      this.useRGBNBmappingSizer = new HorizontalSizer;
      this.useRGBNBmappingSizer.margin = 6;
      this.useRGBNBmappingSizer.spacing = 4;
      this.useRGBNBmappingSizer.add( this.useRGBNBmapping_CheckBox );
      this.useRGBNBmappingSizer.add( this.RGBNB_gradient_correction_CheckBox );
      this.useRGBNBmappingSizer.add( this.RGBNB_linear_fit_CheckBox );
      this.useRGBNBmappingSizer.add( this.useRGBbandwidth_CheckBox );
      this.useRGBNBmappingSizer.addStretch();

      // Button to test narrowband mapping
      this.testNarrowbandMappingButton = new PushButton( this );
      this.testNarrowbandMappingButton.text = "Test";
      this.testNarrowbandMappingButton.toolTip = 
            "<p>" +
            "Test narrowband RGB mapping. This requires that you have opened:" +
            "</p><p>" +
            "- RGB files Integration_[RGB].<br>" +
            "- Those narrowband files Integration_[SHO] that are used in the mapping." +
            "</p><p>" +
            "To get required Integration_[RGB] and Integration_[SHO] files you can run a full workflow first." +
            "</p><p>" +
            "Result image will be in linear mode. " +
            "</p>" ;
      this.testNarrowbandMappingButton.onClick = function()
      {
            console.writeln("Test narrowband mapping");
            par.use_RGBNB_Mapping.val = true;
            util.clearDefaultDirs();
            try {
                  engine.testRGBNBmapping();
                  util.setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  engine.writeProcessingStepsAndEndLog(null, true, ppar.win_prefix + "AutoRGBNB", true);
                  util.setDefaultDirs();
            }
            par.use_RGBNB_Mapping.val = false;
      };   

      // channel mapping
      this.RGBNB_MappingLabel = newLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = newLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = newComboBox(this, par.RGBNB_L_mapping, RGBNB_mapping_values, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = newLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = newComboBox(this, par.RGBNB_R_mapping, RGBNB_mapping_values, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = newLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = newComboBox(this, par.RGBNB_G_mapping, RGBNB_mapping_values, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = newLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = newComboBox(this, par.RGBNB_B_mapping, RGBNB_mapping_values, this.RGBNB_MappingBLabel.toolTip);

      this.RGBNB_MappingSizer = new HorizontalSizer;
      // this.RGBNB_MappingSizer.margin = 6;
      this.RGBNB_MappingSizer.spacing = 4;
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingRLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingRValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingGLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingGValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingBLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingBValue );
      this.RGBNB_MappingSizer.addStretch();

      // Boost factor for LRGB
      var RGBNB_boost_common_tooltip = "<p>A bigger value will make the mapping more visible.</p>";
      this.RGBNB_BoostLabel = newLabel(this, 'Boost', "Select boost, or multiplication factor, for the channels.");
      this.RGBNB_BoostLValue = newRGBNBNumericEdit(this, 'L', par.RGBNB_L_BoostFactor, "<p>Boost, or multiplication factor, for the L channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostRValue = newRGBNBNumericEdit(this, 'R', par.RGBNB_R_BoostFactor, "<p>Boost, or multiplication factor, for the R channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostGValue = newRGBNBNumericEdit(this, 'G', par.RGBNB_G_BoostFactor, "<p>Boost, or multiplication factor, for the G channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostBValue = newRGBNBNumericEdit(this, 'B', par.RGBNB_B_BoostFactor, "<p>Boost, or multiplication factor, for the B channel.</p>" + RGBNB_boost_common_tooltip);

      this.RGBNB_BoostSizer = new HorizontalSizer;
      // this.RGBNB_BoostSizer.margin = 6;
      this.RGBNB_BoostSizer.spacing = 4;
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLabel );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostRValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostGValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostBValue );
      this.RGBNB_BoostSizer.addStretch();

      this.RGBNB_Sizer1 = new HorizontalSizer;
      this.RGBNB_Sizer1.spacing = 4;
      this.RGBNB_Sizer1.add(this.RGBNB_MappingSizer);
      this.RGBNB_Sizer1.add(this.RGBNB_BoostSizer);
      this.RGBNB_Sizer1.addStretch();

      // Bandwidth for different channels
      var RGBNB_bandwidth_common_tooltip = "<p>To make changes more visible you can lower the RGB bandwidths to something like 40 or 60.</p>";
      this.RGBNB_BandwidthLabel = newLabel(this, 'Bandwidth', "Select bandwidth (nm) for each filter.");
      this.RGBNB_BandwidthLValue = newRGBNBNumericEdit(this, 'L', par.RGBNB_L_bandwidth, "<p>Bandwidth (nm) for the L filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthRValue = newRGBNBNumericEdit(this, 'R', par.RGBNB_R_bandwidth, "<p>Bandwidth (nm) for the R filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthGValue = newRGBNBNumericEdit(this, 'G', par.RGBNB_G_bandwidth, "<p>Bandwidth (nm) for the G filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthBValue = newRGBNBNumericEdit(this, 'B', par.RGBNB_B_bandwidth, "<p>Bandwidth (nm) for the B filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthHValue = newRGBNBNumericEdit(this, 'H', par.RGBNB_H_bandwidth, "<p>Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthSValue = newRGBNBNumericEdit(this, 'S', par.RGBNB_S_bandwidth, "<p>Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthOValue = newRGBNBNumericEdit(this, 'O', par.RGBNB_O_bandwidth, "<p>Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);

      this.RGBNB_BandwidthSizer = new HorizontalSizer;
      // this.RGBNB_BandwidthSizer.margin = 6;
      this.RGBNB_BandwidthSizer.spacing = 4;
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthLabel );
      //this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthRGBValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthLValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthRValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthGValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthBValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthHValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthSValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthOValue );
      this.RGBNB_BandwidthSizer.add( this.testNarrowbandMappingButton );
      this.RGBNB_BandwidthSizer.addStretch();

      this.RGBNB_Sizer = new VerticalSizer;
      // this.RGBNB_Sizer.margin = 6;
      this.RGBNB_Sizer.spacing = 4;
      this.RGBNB_Sizer.toolTip = RGBNB_tooltip;
      this.RGBNB_Sizer.add(this.useRGBNBmappingSizer);
      this.RGBNB_Sizer.add(this.RGBNB_Sizer1);
      this.RGBNB_Sizer.add(this.RGBNB_BandwidthSizer);
      this.RGBNB_Sizer.addStretch();

      this.narrowbandRGBmappingControl = new Control( this );
      //this.narrowbandRGBmappingControl.title = "Narrowband to RGB mapping";
      this.narrowbandRGBmappingControl.sizer = new VerticalSizer;
      this.narrowbandRGBmappingControl.sizer.margin = 6;
      this.narrowbandRGBmappingControl.sizer.spacing = 4;
      this.narrowbandRGBmappingControl.sizer.add( this.RGBNB_Sizer );
      //this.narrowbandRGBmappingControl.sizer.add( this.narrowbandAutoContinue_sizer );
      // hide this section by default
      this.narrowbandRGBmappingControl.visible = false;

      /* RGBHa mapping.
       */
      var RGBHa_tooltip = 
            "<p>" +
            "A special processing is used to add Ha to RGB image." +
            "</p><p>" +
            "If Ha to RGB mapping is used then narrowband color palette is not used." +
            "</p><p>" +
            "Also a user processed Ha image can be used. " + 
            "In case of linear Ha image processing, if image Integration_H_enhanced_linear exists it use used. " +
            "In case of non-linear (stretched) Ha image processing, if image Integration_H_enhanced exists it use used." +
            "</p><p>" +
            "Information for processing and formulas are collected from multiple sources, including:" +
            "</p>" + 
            "<ul>" +
            "<li>Night Photons website</li>" +
            "<li>VisibleDark YouTube channel</li>" +
            "</ul>" +
            "";

      this.useRGBHamapping_CheckBox = newCheckBox(this, "Use Ha RGB mapping", par.use_RGBHa_Mapping, RGBHa_tooltip);

      this.RGBHaPresetLabel = newLabel(this, "Preset", "<p>Some useful combinations to try.</p>" + RGBHa_tooltip);
      this.RGBHaPresetComboBox = newComboBox(this, par.RGBHa_preset, RGBHa_preset_values, this.RGBHaPresetLabel.toolTip);
      this.RGBHaPresetComboBox.onItemSelected = function( itemIndex )
      {
            switch (RGBHa_preset_values[itemIndex]) {
                  case 'Combine Continuum Subtract':
                        par.RGBHa_prepare_method.val = 'Continuum Subtract';
                        par.RGBHa_combine_time.val = 'Stretched';
                        par.RGBHa_combine_method.val = 'Bright structure add';
                        par.RGBHa_Combine_BoostFactor.val = par.RGBHa_Combine_BoostFactor.def;
                        par.RGBHa_Combine_BoostFactor.reset();
                        break;
                  case 'SPCC Continuum Subtract':
                        par.RGBHa_prepare_method.val = 'Continuum Subtract';
                        par.RGBHa_combine_time.val = 'SPCC linear';
                        par.RGBHa_combine_method.val = 'Add';
                        par.RGBHa_Add_BoostFactor.val = par.RGBHa_Add_BoostFactor.def;
                        par.RGBHa_Add_BoostFactor.reset();
                        break;
                  case 'Max 0.7':
                        par.RGBHa_prepare_method.val = 'Basic';
                        par.RGBHa_combine_time.val = 'Stretched';
                        par.RGBHa_combine_method.val = 'Max';
                        par.RGBHa_Combine_BoostFactor.val = 0.7;
                        par.RGBHa_Combine_BoostFactor.reset();
                        break;
                  default:
                        util.throwFatalError("Unknown preset " + RGBHa_preset_values[itemIndex]);
                        break;
            }
            par.RGBHa_prepare_method.reset();
            par.RGBHa_combine_time.reset();
            par.RGBHa_combine_method.reset();
      }

      this.RGBHaPrepareMethodLabel = newLabel(this, "Prepare Ha", RGBHa_tooltip);
      this.RGBHaPrepareMethodComboBox = newComboBox(this, par.RGBHa_prepare_method, RGBHa_prepare_method_values, RGBHa_tooltip);
      this.RGBHaCombineTimeLabel = newLabel(this, "Combine time", RGBHa_tooltip);
      this.RGBHaCombineTimeComboBox = newComboBox(this, par.RGBHa_combine_time, RGBHa_combine_time_values, RGBHa_tooltip);
      this.RGBHaCombineMethodLabel = newLabel(this, "Combine method", RGBHa_tooltip);
      this.RGBHaCombineMethodComboBox = newComboBox(this, par.RGBHa_combine_method, RGBHa_combine_method_values, RGBHa_tooltip);
      
      this.useRGBHaMappingSizer = new HorizontalSizer;
      // this.useRGBHaMappingSizer.margin = 6;
      this.useRGBHaMappingSizer.spacing = 4;
      this.useRGBHaMappingSizer.add( this.useRGBHamapping_CheckBox );
      this.useRGBHaMappingSizer.addSpacing( 8 );
      this.useRGBHaMappingSizer.add( this.RGBHaPresetLabel );
      this.useRGBHaMappingSizer.add( this.RGBHaPresetComboBox );
      this.useRGBHaMappingSizer.addStretch();

      this.useRGBHaMethodSizer = new HorizontalSizer;
      // this.useRGBHaMethodSizer.margin = 6;
      this.useRGBHaMethodSizer.spacing = 4;
      this.useRGBHaMethodSizer.addSpacing( 8 );
      this.useRGBHaMethodSizer.add( this.RGBHaPrepareMethodLabel );
      this.useRGBHaMethodSizer.add( this.RGBHaPrepareMethodComboBox );
      this.useRGBHaMethodSizer.add( this.RGBHaCombineTimeLabel );
      this.useRGBHaMethodSizer.add( this.RGBHaCombineTimeComboBox );
      this.useRGBHaMethodSizer.add( this.RGBHaCombineMethodLabel );
      this.useRGBHaMethodSizer.add( this.RGBHaCombineMethodComboBox );
      this.useRGBHaMethodSizer.addStretch();

      // Button to test narrowband mapping
      this.testRGBHaMappingButton = new PushButton( this );
      this.testRGBHaMappingButton.text = "Test";
      this.testRGBHaMappingButton.toolTip = 
            "<p>" +
            "Test Ha RGB mapping. This requires that you have opened:" +
            "</p><p>" +
            "- RGB files Integration_[channel], channel = R, G and B.<br>" +
            "- Integration_H that is used in the mapping." +
            "</p><p>" +
            "To get required Integration_[R|G|B] and Integration_H files you can run a full workflow first." +
            "</p>" ;
      this.testRGBHaMappingButton.onClick = function()
      {
            console.writeln("Test Ha mapping");
            util.clearDefaultDirs();
            try {
                  engine.testRGBHaMapping();
                  util.setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  engine.writeProcessingStepsAndEndLog(null, true, ppar.win_prefix + "AutoRGBHa", true);
                  util.setDefaultDirs();
            }
      };   

      // Boost factor for RGB
      var RGBHa_boost_common_tooltip = "<p>A bigger value will make the mapping more visible.</p>";
      this.RGBHa_BoostLabel = newLabel(this, 'Boost:', "Select boost, or multiplication factor.");
      this.RGBHa_CombineBoostValue = newRGBNBNumericEdit(this, 'Combine', par.RGBHa_Combine_BoostFactor, 
                                                         "<p>Boost, or multiplication factor, for combing R and Ha.</p>" + 
                                                         "<p>A bigger value will make the mapping more visible by increasing the amount of Ha.</p>" +
                                                         "<p>This value is used  with all other methods except Add.</p>");
      this.RGBHa_SPCCBoostValue = newRGBNBNumericEdit(this, 'Add', par.RGBHa_Add_BoostFactor, 
                                                         "<p>Boost, or multiplication factor, for Ha channel with Add method.</p>" + 
                                                         "<p>For R channel a value 1-Boost will be used.</p>" +
                                                         "<p>Note that Add method really works well only with SPCC color calibration.</p>");

      this.RGBHa_BoostSizer = new HorizontalSizer;
      // this.RGBHa_BoostSizer.margin = 6;
      this.RGBHa_BoostSizer.spacing = 4;
      this.RGBHa_BoostSizer.addSpacing( 8 );
      this.RGBHa_BoostSizer.add( this.RGBHa_BoostLabel );
      this.RGBHa_BoostSizer.add( this.RGBHa_CombineBoostValue );
      this.RGBHa_BoostSizer.add( this.RGBHa_SPCCBoostValue );
      this.RGBHa_BoostSizer.addStretch();

      this.RGBHa_gradient_correction_CheckBox = newCheckBox(this, "Gradient correction", par.RGBHa_gradient_correction, 
            "<p>Do gradient correction on Ha image before mapping.</p>" );
      this.RGBHa_smoothen_background_CheckBox = newCheckBox(this, "Smoothen background %", par.RGBHa_smoothen_background, 
            "<p>Smoothen background which may help with gradient correction. Select a percentage value below which smoothing is done.</p>" +
            "<p>Usually values below 50 work best. Possible values are between 0 and 100.");

      this.RGBHa_smoothen_background_value_edit = newNumericEditPrecision(this, 'value', par.RGBHa_smoothen_background_value, 0, 100, this.RGBHa_smoothen_background_CheckBox.toolTip, 4);
      this.RGBHa_remove_stars_CheckBox = newCheckBox(this, "Remove stars", par.RGBHa_remove_stars, 
            "<p>Remove stars before combining Ha to RGB.</p>" );

      this.RGBHa_Sizer2 = new HorizontalSizer;
      // this.RGBHa_Sizer2.margin = 6;
      this.RGBHa_Sizer2.spacing = 4;
      this.RGBHa_Sizer2.add( this.RGBHa_gradient_correction_CheckBox );
      this.RGBHa_Sizer2.add( this.RGBHa_smoothen_background_CheckBox );
      this.RGBHa_Sizer2.add( this.RGBHa_smoothen_background_value_edit );
      this.RGBHa_Sizer2.add( this.RGBHa_remove_stars_CheckBox );
      this.RGBHa_Sizer2.add( this.testRGBHaMappingButton );
      this.RGBHa_Sizer2.addStretch();

      this.RGBHa_Sizer = new VerticalSizer;
      // this.RGBHa_Sizer.margin = 6;
      this.RGBHa_Sizer.spacing = 4;
      this.RGBHa_Sizer.toolTip = RGBHa_tooltip;
      this.RGBHa_Sizer.add(this.useRGBHaMappingSizer);
      this.RGBHa_Sizer.add(this.useRGBHaMethodSizer);
      this.RGBHa_Sizer.add(this.RGBHa_BoostSizer);
      this.RGBHa_Sizer.add(this.RGBHa_Sizer2);
      this.RGBHa_Sizer.addStretch();

      this.RGBHaMappingControl = new Control( this );
      this.RGBHaMappingControl.sizer = new VerticalSizer;
      this.RGBHaMappingControl.sizer.margin = 6;
      this.RGBHaMappingControl.sizer.spacing = 4;
      this.RGBHaMappingControl.sizer.add( this.RGBHa_Sizer );
      // hide this section by default
      this.RGBHaMappingControl.visible = false;

      // Narrowband extra processing

      this.extraProcessingGUI = new extraProcessingGUI(this);

      var extraGUIControls = this.extraProcessingGUI.getExtraGUIControls();

      this.extraImageControl = extraGUIControls[0];
      this.extraControl1 = extraGUIControls[1];
      this.extraControl2 = extraGUIControls[2];
      this.extraControl3 = extraGUIControls[3];

      // Button to close all windows
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close prefix";
      this.closeAllButton.icon = this.scaledResource( ":/icons/window-close.png" );
      this.closeAllButton.toolTip = "<p>Close all windows that are created by this script using the <b>current prefix</b> (including empty prefix).</p>" +
                                    "<p>If Window Prefix is used then all windows with that prefix are closed. " +
                                    "To close all windows with all prefixes use button Close all prefixes</p>";
      this.closeAllButton.onClick = function()
      {
            console.noteln("Close prefix");
            updateWindowPrefix();
            // Close all using the current ppar.win_prefix
            engine.closeAllWindows(par.keep_integrated_images.val, false);
            var index = findPrefixIndex(ppar.win_prefix);
            if (index != -1) {
                  // If prefix was found update array
                  if (par.keep_integrated_images.val) {
                        // If we keep integrated images then we can start
                        // from zero icon position
                        ppar.prefixArray[index][2] = 0;
                  } else {
                        // Mark closed position as empty/free
                        ppar.prefixArray[index] = [ 0, '-', 0 ];
                        fix_win_prefix_array();
                  }
                  ppar.win_prefix = "";

                  savePersistentSettings(false);
                  //this.columnCountControlComboBox.currentItem = global.columnCount + 1;
            }
            update_extra_target_image_window_list(null);
            console.writeln("Close prefix completed");
      };

      closeAllPrefixButton = new PushButton( this );
      closeAllPrefixButton.text = "Close all prefixes";
      closeAllPrefixButton.icon = this.scaledResource( ":/icons/window-close-all.png" );
      closeAllPrefixButton.toolTip = "<p>!!! See setWindowPrefixHelpTip !!!</p>";
      closeAllPrefixButton.onClick = function()
      {
            console.noteln("Close all prefixes");
            try {
                  updateWindowPrefix();
                  // Always close default/empty prefix
                  // For delete to work we need to update fixed window
                  // names with the prefix we use for closing
                  util.fixAllWindowArrays("");
                  console.writeln("Close default empty prefix");
                  engine.closeAllWindows(par.keep_integrated_images.val, false);
                  if (ppar.win_prefix != "" && findPrefixIndex(ppar.win_prefix) == -1) {
                        // Window prefix box has unsaved prefix, clear that too.
                        var prefix = validateWindowPrefix(ppar.win_prefix);
                        console.writeln("Close prefix '" + prefix + "'");
                        util.fixAllWindowArrays(prefix);
                        engine.closeAllWindows(par.keep_integrated_images.val, false);
                  }
                  // Go through the prefix list
                  for (var i = 0; i < ppar.prefixArray.length; i++) {
                        if (ppar.prefixArray[i][1] != '-') {
                              var prefix = validateWindowPrefix(ppar.prefixArray[i][1]);
                              console.writeln("Close prefix '" + prefix + "'");
                              util.fixAllWindowArrays(prefix);
                              engine.closeAllWindows(par.keep_integrated_images.val, false);
                              if (par.keep_integrated_images.val) {
                                    // If we keep integrated images then we can start
                                    // from zero icon position
                                    ppar.prefixArray[i][2] = 0;
                              } else {
                                    // Mark closed position as empty/free
                                    ppar.prefixArray[i] = [ 0, '-', 0 ];
                              }
                        }
                  }
                  if (par.use_manual_icon_column.val && ppar.userColumnCount != -1) {
                        ppar.userColumnCount = 0;
                  }
            }  catch (x) {
                  console.writeln( x );
            }
            fix_win_prefix_array();
            savePersistentSettings(false);
            // restore original prefix
            util.fixAllWindowArrays(ppar.win_prefix);
            update_extra_target_image_window_list(null);
            console.writeln("Close all prefixes completed");
      };

      var flowchartToolTip = "<p>Flowchart information is always generated during the processing. It is saved to the " + 
                             "setup file and AutosaveSetup file so it can be loaded later.</p>" +
                             "<p>A graphical version of the flowchart is printed to the preview window and " + 
                             "a text version is printed to the process console and AutoIntegrate log file.</p>";

      // New Flowchart button
      this.newFlowchartButton = new PushButton( this );
      this.newFlowchartButton.text = "New Flowchart";
      this.newFlowchartButton.toolTip = "<p>Create a new AutoIntegrate workflow flowchart using the current settings.</p>" +
                                        "<p>A partially simulated minimal workflow is run to generate the flowchart information.</p>";
                                        "<p>To run the simulated workflow all relevant files must be loaded to the Files tab.</p>" + 
                                        flowchartToolTip;
      this.newFlowchartButton.onClick = function()
      {
            if (global.is_processing != global.processing_state.none) {
                  return;
            }

            console.writeln("New flowchart");
            if (generateNewFlowchartData(this.parent)) {
                  flowchartGraph(global.flowchartData);
                  console.noteln("Flowchart updated");
            } else {
                  console.noteln("No flowchart data available");
            }
      };

      this.showFlowchartCheckBox = newCheckBoxEx(this, "Show Flowchart", par.show_flowchart, 
            "<p>Switch between flowchart and image view if flowchart is available.</p>" +
            "<p>Can be checked during processing. In that case live updates to the flowchart are shown.</p>" + 
            "<p>If Flowchart setting <i>Get flowchart data before processing</i> is checked then the live flowchart " + 
            "view uses full processing flowchart.</p>" + 
            skip_reset_tooltip,
            function(checked) { 
                  par.show_flowchart.val = checked;
                  if (checked) {
                        if (global.flowchartData != null) {
                              flowchartUpdated();
                        } else {
                              console.noteln("No flowchart data available");
                        }
                  } else {
                        if (preview_image != null) {
                              tabPreviewControl.SetImage(preview_image, preview_image_txt);
                              sidePreviewControl.SetImage(preview_image, preview_image_txt);
                        }
                  }
            });

      var showFlowchartToolTip = 
            "<h4>Generate Flowchart</h4>" +
            "<p>" +
            "Using the New Flowchart button the script will generate a flowchart of the processing workflow. " +
            "Flowchart uses the current settings and images. A partially simulated minimal workflow is run to " +
            "generate the flowchart information. To run the simulated workflow all relevant files must be loaded " +
            "to the <i>Files</i> tab. A graphical version of the flowchart is printed to the preview window and " +
            "a text version is printed to the process console." +
            "</p>" +
            "<p>" +
            "Full Flowchart is available after processing. It is saved to the AutosaveSetup file and also to the setup file " + 
            "when available so it can be loaded later. A text version of flowchart is also printed to the AutoIntegrate log file." +
            "</p>" +
            "<p>" +
            "Note that using the preview save button it is possible to save the flowchart image to a file." +
            "</p>" +
            "<h4>Live Flowchart</h4>" +
            "<p>" +
            "Flowchart information is always generated during processing. It can viewed using <i>Show Flowchart</i> " +
            "checkbox. During processing Flowchart is updated after each step. By checking and unchecking the <i>Show Flowchart</i> " +
            "checkbox it is possible to switch between the current preview image and flowchart." +
            "</p>" +
            "<p>" +
            "Flowchart settings are in the <i>Interface</i> tab. Note that Flowchart settings are saved to persistent module settings " +
            "but values are not reset with the Set default values button." +
            "</p>" +
            "<p>" +
            "By default <i>Flowchart settings</i> option <i>Flowchart show processed image</i> is selected. This options shows the processed image " +
            "in the preview window and the flowchart data is shown on top of the image. If this option is not selected then only the flowchart data " +
            "is shown." +
            "</p>" +
            "<p>" +
            "If <i>Flowchart settings</i> option <i>Get flowchart data before processing</i> is selected then flowchart data is collected " +
            "before processing. This is useful if you want to see the full flowchart during processing. Note that this option is not " +
            "selected by default. Full flowchart is not available with AutoContinue or batch processing. " +
            "</p>";

      this.showFlowchartHelpTips = new ToolButton( this );
      this.showFlowchartHelpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.showFlowchartHelpTips.setScaledFixedSize( 20, 20 );
      this.showFlowchartHelpTips.toolTip = showFlowchartToolTip;
      this.showFlowchartHelpTips.onClick = function()
      {
            new MessageBox(showFlowchartToolTip, "Show Flowchart", StdIcon_Information ).execute();
      }

      this.previewAutoSTFCheckBox = newCheckBoxEx(this, "AutoSTF", par.preview_autostf, 
            "<p>When checked preview image during processing always shown in a stretched (non-linear) format. " + 
            "Image name on top of the preview window has text AutoSTF when image is stretched for preview.</p>" + 
            "<p>When unchecked preview image is shown in original format.</p>" +
            "<p>Stretched format can be useful for visualizing the current processed image.</p>",
            function(checked) { 
                  par.preview_autostf.val = checked;
                  if (preview_image != null) {
                        if (checked) {
                              preview_image = preview_images[1].image;
                              preview_image_txt = preview_images[1].txt;
                        } else {
                              preview_image = preview_images[0].image;
                              preview_image_txt = preview_images[0].txt;
                        }
                  }
                  if (par.show_flowchart.val) {
                        if (global.flowchartData != null) {
                              flowchartUpdated();
                        } else {
                              // console.noteln("No flowchart data available");
                        }
                  } else {
                        if (preview_image != null) {
                              tabPreviewControl.SetImage(preview_image, preview_image_txt);
                              sidePreviewControl.SetImage(preview_image, preview_image_txt);
                        }
                  }
            });


      if (par.use_manual_icon_column.val) {
            this.columnCountControlLabel = new Label( this );
            this.columnCountControlLabel.text = "Icon Column ";
            this.columnCountControlLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.columnCountControlLabel.toolTip = "<p>Set Icon Column for next run.</p> " + 
                                                "<p>This keeps window icons from piling up on top of one another, " +
                                                "as you change prefixes and run again.</p>" +
                                                "<p>Set to 1 if you have removed all the icons " + 
                                                "created by AutoIntegrate or changed to a fresh workspace.</p>" + 
                                                "<p>Set to a free column if you have deleted a column of icons by hand.</p>" + 
                                                "<p>Left alone the script will manage the value, incrementing after each run, " +
                                                "decrementing if you close all windows, " +
                                                "and saving the value between script invocations.</p>";
            this.columnCountControlComboBox = new ComboBox( this );
            addArrayToComboBox(this.columnCountControlComboBox, column_count_values);
            if (ppar.userColumnCount == -1) {
                  this.columnCountControlComboBox.currentItem = 0;
            } else {
                  this.columnCountControlComboBox.currentItem = ppar.userColumnCount + 1;
            }
            this.columnCountControlComboBox.toolTip = this.columnCountControlLabel.toolTip;
            this.columnCountControlComboBox.onItemSelected = function( itemIndex )
            {
                  if (itemIndex == 0) {
                        // Auto
                        ppar.userColumnCount = -1;
                  } else {
                        // Combo box values start with one but in the code
                        // we want values to start with zero.
                        ppar.userColumnCount = parseInt(column_count_values[itemIndex]) - 1;
                  }
            };
      }

      // Buttons for saving final images in different formats
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSaveXisfButton.onClick = function()
      {
            console.writeln("Save XISF");
            util.saveAllFinalImageWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave16bitButton.onClick = function()
      {
            console.writeln("Save 16 bit TIFF");
            util.saveAllFinalImageWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave8bitButton.onClick = function()
      {
            console.writeln("Save 8 bit TIFF");
            util.saveAllFinalImageWindows(8);
      };   

      this.mosaicSaveControl = new Control( this );
      this.mosaicSaveControl.sizer = new HorizontalSizer;
      this.mosaicSaveControl.sizer.margin = 6;
      this.mosaicSaveControl.sizer.spacing = 4;
      this.mosaicSaveControl.sizer.add( this.mosaicSaveXisfButton );
      this.mosaicSaveControl.sizer.addSpacing( 4 );
      this.mosaicSaveControl.sizer.add( this.mosaicSave16bitButton );
      this.mosaicSaveControl.sizer.addSpacing( 4 );
      this.mosaicSaveControl.sizer.add( this.mosaicSave8bitButton );
      this.mosaicSaveControl.visible = false;

      /* Interface.
       */

      this.screenSizeLabel = newLabel(this, "Screen size: " + screen_size, "Screen size as reported by PixInsight.");

      this.preview0Sizer = new HorizontalSizer;
      this.preview0Sizer.margin = 6;
      this.preview0Sizer.spacing = 4;
      this.preview0Sizer.add( this.screenSizeLabel );
      this.preview0Sizer.addStretch();

      this.saveInterfaceButton = new PushButton( this );
      this.saveInterfaceButton.text = "Save";
      this.saveInterfaceButton.toolTip = 
            "<p>Save current interface settings.</p>" +
            "<p>Settings are saved by default when exiting the script. This button can be used " +
            "to save settings without exiting. It can be useful if the Exit button is not visible.</p>";
      this.saveInterfaceButton.onClick = function() {
            savePersistentSettings(false);
      };

      this.show_preview_CheckBox = newGenericCheckBox(this, "Enable preview", ppar, ppar.preview.use_preview, 
            "Enable image preview on script preview window. You need to restart the script before this setting is effective.",
            function(checked) { this.dialog.show_preview_CheckBox.aiParam.preview.use_preview = checked; });

      this.use_single_column_CheckBox = newGenericCheckBox(this, "Single column", ppar, ppar.use_single_column, 
            "Show all dialog settings in a single column. You need to restart the script before this setting is effective.",
            function(checked) { this.dialog.use_single_column_CheckBox.aiParam.use_single_column = checked; });

      this.use_more_tabs_CheckBox = newGenericCheckBox(this, "More tabs", ppar, ppar.use_more_tabs, 
            "<p>Use more tabs to show settings.</p>" +
            "<p>Can be useful when using the side preview.</p>",
            function(checked) { this.dialog.use_more_tabs_CheckBox.aiParam.use_more_tabs = checked; });

      this.use_large_preview_CheckBox = newGenericCheckBox(this, "Side preview", ppar, ppar.preview.use_large_preview, 
            "<p>Use a large preview window on the side of the main dialog.</p>",
            function(checked) { this.dialog.use_large_preview_CheckBox.aiParam.preview.use_large_preview = checked; });

      this.show_histogram_CheckBox = newGenericCheckBox(this, "Show histogram", ppar, ppar.preview.show_histogram, 
            "<p>Show image histogram.</p>",
            function(checked) { this.dialog.show_histogram_CheckBox.aiParam.preview.show_histogram = checked; });

      this.files_in_tab_CheckBox = newGenericCheckBox(this, "Files tab", ppar, ppar.files_in_tab, 
            "<p>File listing is in a separate tab instead of on top of the window.</p>",
            function(checked) { this.dialog.files_in_tab_CheckBox.aiParam.files_in_tab = checked; });

      this.show_startup_image_CheckBox = newGenericCheckBox(this, "Startup image", ppar, ppar.show_startup_image, 
            "<p>Show startup image in preview window.</p>",
            function(checked) { this.dialog.show_startup_image_CheckBox.aiParam.show_startup_image = checked; });
      this.startup_image_name_Edit = newGenericTextEdit(this, ppar, ppar.startup_image_name, 
            "<p>Startup image name.</p>" +
            "<p>You can set your own startup image here.</p>" + 
            "<p><b>NOTE!</b> Remember to use the Save button to save the name to persistent module settings.</p>",
            function(value) { ppar.startup_image_name = value; });
      this.startup_image_name_Button = new ToolButton( this );
      this.startup_image_name_Button.icon = this.scaledResource(":/icons/select-file.png");
      this.startup_image_name_Button.toolTip = this.startup_image_name_Edit.toolTip;
      this.startup_image_name_Button.setScaledFixedSize( 20, 20 );
      this.startup_image_name_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            this.dialog.startup_image_name_Edit.text = ofd.fileName;
            ppar.startup_image_name = ofd.fileName;
      };
      
      this.preview1Sizer = new HorizontalSizer;
      this.preview1Sizer.margin = 6;
      this.preview1Sizer.spacing = 4;
      this.preview1Sizer.add( this.show_preview_CheckBox );
      this.preview1Sizer.add( this.use_single_column_CheckBox );
      this.preview1Sizer.add( this.use_more_tabs_CheckBox );
      this.preview1Sizer.add( this.files_in_tab_CheckBox );
      this.preview1Sizer.add( this.use_large_preview_CheckBox );
      this.preview1Sizer.add( this.show_histogram_CheckBox );
      this.preview1Sizer.addStretch();

      this.preview11Sizer = new HorizontalSizer;
      this.preview11Sizer.margin = 6;
      this.preview11Sizer.spacing = 4;
      this.preview11Sizer.add( this.show_startup_image_CheckBox );
      this.preview11Sizer.add( this.startup_image_name_Edit );
      this.preview11Sizer.add( this.startup_image_name_Button );
      this.preview11Sizer.addStretch();

      this.preview_width_label = newLabel(this, 'Preview width', "Preview image width.");
      this.preview_width_edit = newGenericSpinBox(this, ppar, ppar.preview.preview_width, 100, 4000, 
            "Preview image width.",
            function(value) { 
                  updatePreviewSize(value, 0, 0, 0, 0); 
            }
      );
      this.preview_height_label = newLabel(this, 'height', "Preview image height.");
      this.preview_height_edit = newGenericSpinBox(this, ppar, ppar.preview.preview_height, 100, 4000, 
            "Preview image height.",
            function(value) { 
                  updatePreviewSize(0, value, 0, 0, 0); 
            }
      );

      this.side_preview_width_label = newLabel(this, 'Side preview width', "Side preview image width.");
      this.side_preview_width_edit = newGenericSpinBox(this, ppar, ppar.preview.side_preview_width, 100, 4000, 
            "Side preview image width.",
            function(value) { 
                  updatePreviewSize(0, 0, 0, value, 0); 
            }
      );
      this.side_preview_height_label = newLabel(this, 'height', "Side preview image height.");
      this.side_preview_height_edit = newGenericSpinBox(this, ppar, ppar.preview.side_preview_height, 100, 4000, 
            "Side preview image height.",
            function(value) { 
                  updatePreviewSize(0, 0, 0, 0, value); 
            }
      );

      this.preview2Sizer = new HorizontalSizer;
      this.preview2Sizer.margin = 6;
      this.preview2Sizer.spacing = 4;
      this.preview2Sizer.add( this.preview_width_label );
      this.preview2Sizer.add( this.preview_width_edit );
      this.preview2Sizer.add( this.preview_height_label );
      this.preview2Sizer.add( this.preview_height_edit );
      this.preview2Sizer.add( this.side_preview_width_label );
      this.preview2Sizer.add( this.side_preview_width_edit );
      this.preview2Sizer.add( this.side_preview_height_label );
      this.preview2Sizer.add( this.side_preview_height_edit );
      this.preview2Sizer.addStretch();
      this.preview2Sizer.add( this.saveInterfaceButton );

      this.histogram_height_label = newLabel(this, 'Histogram height', "Image histogram height.");
      this.histogram_height_edit = newGenericSpinBox(this, ppar, ppar.preview.histogram_height, 50, 2000, 
            this.histogram_height_label.toolTip,
            function(value) { 
                  updatePreviewSize(0, 0, value, 0, 0);
            }
      );

      this.side_histogram_height_label = newLabel(this, 'Side preview histogram height', "Image histogram height in side preview.");
      this.side_histogram_height_edit = newGenericSpinBox(this, ppar, ppar.preview.side_histogram_height, 50, 2000, 
            this.side_histogram_height_label.toolTip,
            function(value) { 
                  updatePreviewSize(0, 0, 0, 0, 0, value);
            }
      );

      this.preview3Sizer = new HorizontalSizer;
      this.preview3Sizer.margin = 6;
      this.preview3Sizer.spacing = 4;
      this.preview3Sizer.add( this.histogram_height_label );
      this.preview3Sizer.add( this.histogram_height_edit );
      this.preview3Sizer.add( this.side_histogram_height_label );
      this.preview3Sizer.add( this.side_histogram_height_edit );
      this.preview3Sizer.addStretch();
      this.preview3Sizer.add( this.saveInterfaceButton );

      this.processConsole_label = newLabel(this, 'Process console', "Show or hide process console.");

      this.hideProcessConsoleButton = new PushButton( this );
      this.hideProcessConsoleButton.text = "Hide";
      this.hideProcessConsoleButton.icon = this.scaledResource( ":/auto-hide/hide.png" );
      this.hideProcessConsoleButton.toolTip = "<p>Hide Process Console.</p>";
      this.hideProcessConsoleButton.onClick = function() {
            console.hide();
      };

      this.showProcessConsoleButton = new PushButton( this );
      this.showProcessConsoleButton.text = "Show";
      this.showProcessConsoleButton.icon = this.scaledResource( ":/toolbar/view-process-console.png" );
      this.showProcessConsoleButton.toolTip = "<p>Show Process Console.</p>";
      this.showProcessConsoleButton.onClick = function() {
            console.show();
      };

      this.interfaceSizer = new HorizontalSizer;
      this.interfaceSizer.margin = 6;
      this.interfaceSizer.spacing = 4;
      this.interfaceSizer.add( this.processConsole_label );
      this.interfaceSizer.add( this.showProcessConsoleButton );
      this.interfaceSizer.add( this.hideProcessConsoleButton );
      this.interfaceSizer.addStretch();

      if (par.use_manual_icon_column.val) {
            this.interfaceManualColumnSizer = new HorizontalSizer;
            this.interfaceManualColumnSizer.margin = 6;
            this.interfaceManualColumnSizer.spacing = 4;
            this.interfaceManualColumnSizer.add( this.columnCountControlLabel );
            this.interfaceManualColumnSizer.add( this.columnCountControlComboBox );
            this.interfaceManualColumnSizer.addStretch();
      }
      this.interfaceSizer2 = new HorizontalSizer;
      this.interfaceSizer2.margin = 6;
      this.interfaceSizer2.spacing = 4;
      if (global.use_preview) {
            this.previewToggleButton = new PushButton( this );
            this.previewToggleButton.text = "Toggle side preview";
            this.previewToggleButton.toolTip = "<p>Show/hide image preview on the side of the dialog.</p>" +
                                               "<p>Note that sometimes you need to adjust the screen manually or restart the script.</p>";
            this.previewToggleButton.onClick = function() {
                  toggleSidePreview();
                  this.dialog.adjustToContents();
            }
            this.interfaceSizer2.add( this.previewToggleButton );
      }
      this.interfaceSizer2.addStretch();
      this.processDefaultsButton = new PushButton( this );
      this.processDefaultsButton.text = "Print process defaults";
      this.processDefaultsButton.toolTip = "<p>Print process default values to the console. For debugging purposes.</p>";
      this.processDefaultsButton.onClick = function() {
            engine.getProcessDefaultValues();
      }
      this.interfaceSizer2.add( this.processDefaultsButton );

      this.interfaceControl = new Control( this );
      this.interfaceControl.sizer = new VerticalSizer;
      this.interfaceControl.sizer.margin = 6;
      this.interfaceControl.sizer.spacing = 4;
      this.interfaceControl.sizer.add( this.preview0Sizer );
      this.interfaceControl.sizer.add( this.preview1Sizer );
      this.interfaceControl.sizer.add( this.preview11Sizer );
      this.interfaceControl.sizer.add( this.preview2Sizer );
      this.interfaceControl.sizer.add( this.preview3Sizer );
      this.interfaceControl.sizer.add( this.interfaceSizer );
      if (par.use_manual_icon_column.val) {
            this.interfaceControl.sizer.add( this.interfaceManualColumnSizer );
      }
      this.interfaceControl.sizer.add( this.interfaceSizer2 );

      this.interfaceControl.sizer.addStretch();
      this.interfaceControl.visible = true;

      this.runGetFlowchartDataCheckBox = newCheckBox(this, "Get flowchart data before processing", par.run_get_flowchart_data, 
            "<p>Get the full flowchart data before processing when a normal processing is done using the Run button. This makes it possible to follow progress " +
            "in the complete flowchart if Show Flowchart is checked.</p>" +
            "<p>If this option is not checked or AutoContinue or batch processing is done, flowchart data is generated during processing.</p>" +
            skip_reset_tooltip);
      this.flowchartBackgroundImageCheckBox = newCheckBox(this, "Flowchart show processed image", par.flowchart_background_image, 
            "<p>If checked then the current processed image is shown in the flowchart background.</p>" +
            skip_reset_tooltip);
      this.flowchartTimeCheckBox = newCheckBox(this, "Flowchart show processing time", par.flowchart_time, 
            "<p>If checked then the operation processing time is shown in the flowchart.</p>" +
            skip_reset_tooltip);
      this.flowchartSaveImageCheckBox = newCheckBox(this, "Flowchart save image", par.flowchart_saveimage, 
            "<p>If checked then the flowchart image is saved into AutoProcessing directory after processing is complete.</p>" +
            skip_reset_tooltip);
                  
      this.flowchartControl = new Control( this );
      this.flowchartControl.sizer = new VerticalSizer;
      this.flowchartControl.sizer.margin = 6;
      this.flowchartControl.sizer.spacing = 4;
      this.flowchartControl.sizer.add( this.runGetFlowchartDataCheckBox );
      this.flowchartControl.sizer.add( this.flowchartBackgroundImageCheckBox );
      this.flowchartControl.sizer.add( this.flowchartTimeCheckBox );
      this.flowchartControl.sizer.add( this.flowchartSaveImageCheckBox );
      this.flowchartControl.sizer.addStretch();
      this.flowchartControl.visible = false;

      this.debugControl = new Control( this );
      this.debugControl.sizer = new VerticalSizer;
      this.debugControl.sizer.margin = 6;
      this.debugControl.sizer.spacing = 4;
      this.debugControl.sizer.add( this.printProcessValuesCheckBox );
      this.debugControl.sizer.add( this.debugCheckBox );
      this.debugControl.sizer.add( this.flowchartDebugCheckBox );
      this.debugControl.sizer.add( this.keepProcessedImagesCheckBox );
      this.debugControl.sizer.add( this.keepTemporaryImagesCheckBox );
      this.debugControl.sizer.addStretch();
      this.debugControl.visible = false;

      this.newInstance_Button = new ToolButton(this);
      this.newInstance_Button.icon = new Bitmap( ":/process-interface/new-instance.png" );
      this.newInstance_Button.toolTip = "<p>New Instance</p>";
      this.newInstance_Button.onClick = function()
      {
         this.hasFocus = true;
         saveParametersToProcessIcon();
         this.pushed = false;
         this.dialog.newInstance();
      };
      this.savedefaults_Button = new ToolButton(this);
      this.savedefaults_Button.icon = new Bitmap( ":/process-interface/edit-preferences.png" );
      this.savedefaults_Button.toolTip = 
            "<p>Save all current parameter values using the PixInsight persistent module settings mechanism. Saved parameter " + 
            "values are remembered and automatically restored when the script starts.</p> " +
            "<p>Persistent module settings are overwritten by any settings restored from process icon.</p>" +
            "<p>Set default button sets default values for all parameters.</p>";
      this.savedefaults_Button.onClick = function()
      {
            saveParametersToPersistentModuleSettings();
      };
      this.reset_Button = new ToolButton(this);
      this.reset_Button.icon = new Bitmap( ":/images/icons/reset.png" );
      this.reset_Button.toolTip = "<p>Set default values for all parameters.</p>";
      this.reset_Button.onClick = function()
      {
            util.setParameterDefaults();
      };
      this.changedParametersButton = new ToolButton(this);
      this.changedParametersButton.icon = new Bitmap( ":/icons/document-edit.png" );
      this.changedParametersButton.toolTip = "<p>Print non-default parameter values to the Process Console.</p>";
      this.changedParametersButton.onClick = function()
      {
            var processingOptions = engine.getChangedProcessingOptions();
            if (processingOptions.length > 0) {
                  console.noteln("Changed processing options:");
                  for (var i = 0; i < processingOptions.length; i++) {
                        console.writeln(processingOptions[i][0] + ": " + processingOptions[i][1]);
                  }
            } else {
                  console.noteln("Using default processing options");
            }
      };
      this.website_Button = new ToolButton(this);
      this.website_Button.icon = new Bitmap( ":/icons/internet.png" );
      this.website_Button.toolTip = "<p>Browse documentation on AutoIntegrate web site.</p>";
      this.website_Button.onClick = function()
      {
            Dialog.openBrowser(global.autointegrateinfo_link);
      };

      this.adjusttocontent_Button = newAdjustToContentButton(this);
   
      this.infoLabel = new Label( this );
      this.infoLabel.text = "";
      infoLabel = this.infoLabel;

      this.imageInfoLabel = new Label( this );
      this.imageInfoLabel.text = "";
      this.imageInfoLabel.textAlignment = TextAlign_VertCenter;
      imageInfoLabel = this.imageInfoLabel;

      this.info1_Sizer = new HorizontalSizer;
      this.info1_Sizer.spacing = 6;
      this.info1_Sizer.add( this.infoLabel );
      this.info1_Sizer.addSpacing( 6 );
      this.info1_Sizer.add( this.imageInfoLabel );
      this.info1_Sizer.addStretch();

      if (!global.use_preview) {
            this.tabStatusInfoLabel = new Label( this );
            this.tabStatusInfoLabel.text = "";
            this.tabStatusInfoLabel.textAlignment = TextAlign_VertCenter;
            global.tabStatusInfoLabel = this.tabStatusInfoLabel;

            this.info2_Sizer = new HorizontalSizer;
            this.info2_Sizer.spacing = 6;
            this.info2_Sizer.add( this.tabStatusInfoLabel );
            this.info2_Sizer.addStretch();
      }

      this.info_Sizer = new VerticalSizer;
      this.info_Sizer.add( this.info1_Sizer );
      if (!global.use_preview) {
            this.info_Sizer.add( this.info2_Sizer );
      }
      this.info_Sizer.addStretch();

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.add( this.newInstance_Button );
      this.buttons_Sizer.add( this.savedefaults_Button );
      this.buttons_Sizer.add( this.reset_Button );
      this.buttons_Sizer.add( this.changedParametersButton );
      this.buttons_Sizer.add( this.website_Button );
      this.buttons_Sizer.addSpacing( 6 );
      this.buttons_Sizer.add( this.adjusttocontent_Button );
      if (0) {
            this.buttons_Sizer.addSpacing( 6 );
            this.buttons_Sizer.add( this.info_Sizer );
      }
      this.buttons_Sizer.addSpacing( 48 );
      this.buttons_Sizer.add( this.newFlowchartButton );
      this.buttons_Sizer.add( this.showFlowchartCheckBox );
      this.buttons_Sizer.add( this.showFlowchartHelpTips );
      this.buttons_Sizer.add( this.previewAutoSTFCheckBox );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( closeAllPrefixButton );
      this.buttons_Sizer.addSpacing( 48 );
      this.buttons_Sizer.add( this.closeAllButton );
      this.buttons_Sizer.add( this.autoContinueButton );
      this.buttons_Sizer.add( this.autoContinuePrefixSizer);
      this.buttons_Sizer.add( this.cancel_Button );
      this.buttons_Sizer.addSpacing( 12 );
      this.buttons_Sizer.add( this.run_Button );
      this.buttons_Sizer.add( this.exit_Button );
      this.buttons_Sizer.add( this.helpTips );

      /* 
       * Collect all items into GroupBox objects.
       */

      // Settings left group box
      this.leftGroupBox = newGroupBoxSizer(this);

      newSectionBarAdd(this, this.leftGroupBox, this.imageParamsControl, "Image processing parameters", "Image1");
      newSectionBarAdd(this, this.leftGroupBox, this.imageToolsControl, "Tools and batching", "ImageTools");
      newSectionBarAdd(this, this.leftGroupBox, this.narrowbandControl, "Narrowband processing", "Narrowband1");
      this.leftGroupBox.sizer.addStretch();

      // Settings right group box
      this.rightGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.rightGroupBox, this.otherParamsControl, "Other parameters", "Other1");
      newSectionBarAdd(this, this.rightGroupBox, this.systemParamsControl, "System settings", "System1");
      newSectionBarAdd(this, this.rightGroupBox, this.mosaicSaveControl, "Save final image files", "Savefinalimagefiles");
      this.rightGroupBox.sizer.addStretch();

      // Left processing group box
      this.leftProcessingGroupBox = newGroupBoxSizer(this);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Stretching settings", "ps_stretching",
            [ this.StretchingGroupBoxLabel,
              this.StretchingGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Linear fit, LRGB combination, and Crop settings", "ps_linearfit_combination",
            [ this.linearFitAndLRGBCombinationCropSizer ]);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Gradient correction, GraXpert, ABE and StarXTerminator settings", "ps_ave_graxpert",
            [ this.GCStarXSizer ]);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Saturation, noise reduction and BlurXTerminator settings", "ps_saturation_noise",
            [ this.saturationGroupBoxLabel,
              this.saturationGroupBoxSizer,
              this.noiseReductionGroupBoxLabel,
              this.noiseReductionGroupBoxSizer,
              this.sharpeningGroupBoxLabel,
              this.sharpeningGroupBoxSizer ]);

      this.leftProcessingGroupBox.sizer.addStretch();

      // Right processing group box
      this.rightProcessingGroupBox = newGroupBoxSizer(this);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Image integration and local normalization settings", "ps_integration",
            [ this.clippingGroupBoxLabel,
              this.clippingGroupBoxSizer,
              this.fastIntegrationGroupBoxLabel,
              this.fastIntegrationGroupBoxSizer,
              this.localNormalizationGroupBoxLabel,
              this.localNormalizationGroupBoxSizer ]);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Star and comet alignment settings", "ps_alignment",
            [ this.StarAlignmentGroupBoxLabel,
              this.StarAlignmentGroupBoxSizer,
              this.cometAlignmentGroupBoxLabel,
              this.cometAlignmentGroupBoxSizer ]);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Weighting and filtering settings", "ps_weighting",
            [ this.weightSizer ]);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Banding, binning and cosmetic correction settings", "ps_binning_CC",
            [ this.bandingGroupBoxLabel,
              this.bandingGroupBoxSizer,
              this.binningGroupBoxLabel,
              this.binningGroupBoxSizer,
              this.cosmeticCorrectionGroupBoxSizer ]);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Image solving and color calibration", "ps_imagesolving",
            [ this.imageSolvingGroupBoxLabel,
              this.imageSolvingGroupBoxSizer,
              this.colorCalibrationGroupBoxLabel,
              this.colorCalibrationSizer,
              this.spccGroupBoxLabel,
              this.spccGroupBoxSizer ]);
      newSectionBarAdd(this, this.rightProcessingGroupBox, this.narrowbandRGBmappingControl, "Narrowband to RGB mapping", "NarrowbandRGB1");
      newSectionBarAdd(this, this.rightProcessingGroupBox, this.RGBHaMappingControl, "Ha to RGB mapping", "NarrowbandRGB2");
      this.rightProcessingGroupBox.sizer.addStretch();
        
      // Extra processing group box
      this.extraGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.extraGroupBox, this.extraImageControl, "Target image for extra processing", "ExtraTarget");
      newSectionBarAdd(this, this.extraGroupBox, this.extraControl2, "Narrowband extra processing", "Extra2");
      newSectionBarAdd(this, this.extraGroupBox, this.extraControl3, "Narrowband colorization", "Extra3");
      newSectionBarAdd(this, this.extraGroupBox, this.extraControl1, "Generic extra processing", "Extra1");
      this.extraGroupBox.sizer.addStretch();

      if (global.use_preview) {
            /* Create preview objects.
             */
            this.tabPreviewObj = newPreviewObj(this, false);
            tabHistogramControl = newHistogramControl(this, false);

            tabPreviewControl = this.tabPreviewObj.control;
            tabPreviewInfoLabel = this.tabPreviewObj.infolabel;
            global.tabStatusInfoLabel = this.tabPreviewObj.statuslabel;

            this.sidePreviewObj = newPreviewObj(this, true);
            sideHistogramControl = newHistogramControl(this, true);

            sidePreviewControl = this.sidePreviewObj.control;
            sidePreviewInfoLabel = this.sidePreviewObj.infolabel;
            global.sideStatusInfoLabel = this.sidePreviewObj.statuslabel;

            updateSidePreviewState();
      }

      this.interfaceGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.interfaceGroupBox, this.interfaceControl, "Interface settings", "interface");
      newSectionBarAdd(this, this.interfaceGroupBox, this.flowchartControl, "Flowchart settings", "Flowchart");
      newSectionBarAdd(this, this.interfaceGroupBox, this.debugControl, "Debug settings", "debugsettings");
      this.interfaceGroupBox.sizer.addStretch();

      /* ------------------------------- */
      /* Create tabs.                    */
      /* ------------------------------- */

      this.mainTabBox = new TabBox( this );
      mainTabBox = this.mainTabBox;
      let tab_index = 0;

      if (ppar.files_in_tab) {
            // Files in a tab
            this.pageButtonsSizer = newPageButtonsSizer(this);
            this.filesTabSizer = new VerticalSizer;
            this.filesTabSizer.margin = 6;
            this.filesTabSizer.spacing = 4;
            this.filesTabSizer.add( this.tabBox );
            this.filesTabSizer.add( this.filesButtonsSizer );
            this.filesTabSizer.add( this.pageButtonsSizer );
            this.mainTabBox.addPage( mainSizerTab(this, this.filesTabSizer), "Files" );
            tab_index++;
      }

      if (ppar.use_single_column) {
            /* Collect all into a single sizer.
             */
            this.singleColumnSizer = new VerticalSizer;
            this.singleColumnSizer.margin = 6;
            this.singleColumnSizer.spacing = 4;
            this.singleColumnSizer.add( this.leftGroupBox );
            this.singleColumnSizer.add( this.rightGroupBox );
            this.singleColumnSizer.add( this.leftProcessingGroupBox );
            this.singleColumnSizer.add( this.rightProcessingGroupBox );
            this.singleColumnSizer.add( this.extraGroupBox );
            this.singleColumnSizer.add( this.interfaceGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.singleColumnSizer), "Settings" );
            tab_index++;

            if (global.use_preview) {
                  this.mainTabBox.addPage( mainSizerTab(this, this.tabPreviewObj.sizer), "Preview" );
                  tab_preview_index = tab_index;
                  tab_index++;
                  if (tabHistogramControl != null) {
                        this.mainTabBox.addPage( mainSizerTab(this, tabHistogramControl), "Histogram" );
                        tab_index++;
                  }
            }
      } else if (ppar.use_more_tabs) {
            /* More tabs view. 
             */
            this.settingsSizer = new HorizontalSizer;
            this.settingsSizer.margin = 6;
            this.settingsSizer.spacing = 4;
            this.settingsSizer.add( this.leftGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.settingsSizer), "Settings" );
            tab_index++;

            this.settingsSizer2 = new HorizontalSizer;
            this.settingsSizer2.margin = 6;
            this.settingsSizer2.spacing = 4;
            this.settingsSizer2.add( this.rightGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.settingsSizer2), "Other" );
            tab_index++;

            this.processingsSizer = new HorizontalSizer;
            this.processingsSizer.margin = 6;
            this.processingsSizer.spacing = 4;
            this.processingsSizer.add( this.leftProcessingGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.processingsSizer), "Processing 1" );
            tab_index++;

            this.processingsSizer2 = new HorizontalSizer;
            this.processingsSizer2.margin = 6;
            this.processingsSizer2.spacing = 4;
            this.processingsSizer2.add( this.rightProcessingGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.processingsSizer2), "Processing 2" );
            tab_index++;

            this.previewSizer = new HorizontalSizer;
            this.previewSizer.margin = 6;
            this.previewSizer.spacing = 4;
            if (global.use_preview) {
                  this.previewSizer2 = new VerticalSizer;
                  this.previewSizer2.margin = 6;
                  this.previewSizer2.spacing = 4;
                  this.previewSizer2.add( this.tabPreviewObj.sizer );
                  if (tabHistogramControl != null) {
                        this.previewSizer2.add( tabHistogramControl );
                  }
                  this.previewSizer2.addStretch();
                  this.previewSizer.add( this.previewSizer2 );
            }
            this.previewSizer.add( this.extraGroupBox );
            let tabname;
            if (global.use_preview) {
                  if (ppar.preview.side_preview_visible) {
                        tabname = "Extra processing";
                  } else {
                        tabname = "Preview and extra processing";
                  }
            } else {
                  tabname = "Extra processing";
            }
            this.mainTabBox.addPage( mainSizerTab(this, this.previewSizer), tabname );
            tab_preview_index = tab_index;
            tab_index++;

            this.interfaceTabSizer = new HorizontalSizer;
            this.interfaceTabSizer.margin = 6;
            this.interfaceTabSizer.spacing = 4;
            this.interfaceTabSizer.add( this.interfaceGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.interfaceTabSizer), "Interface" );
            tab_index++;

      } else {
            /* Default view. 
             */
            this.settingsSizer = new HorizontalSizer;
            this.settingsSizer.margin = 6;
            this.settingsSizer.spacing = 4;
            this.settingsSizer.add( this.leftGroupBox );
            this.settingsSizer.add( this.rightGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.settingsSizer), "Settings" );
            tab_index++;

            this.processingsSizer = new HorizontalSizer;
            this.processingsSizer.margin = 6;
            this.processingsSizer.spacing = 4;
            this.processingsSizer.add( this.leftProcessingGroupBox );
            this.processingsSizer.add( this.rightProcessingGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.processingsSizer), "Processing" );
            tab_index++;

            this.previewSizer = new HorizontalSizer;
            this.previewSizer.margin = 6;
            this.previewSizer.spacing = 4;
            if (global.use_preview) {
                  this.previewSizer2 = new VerticalSizer;
                  this.previewSizer2.margin = 6;
                  this.previewSizer2.spacing = 4;
                  this.previewSizer2.add( this.tabPreviewObj.sizer );
                  if (tabHistogramControl != null) {
                        this.previewSizer2.add( tabHistogramControl );
                  }
                  this.previewSizer2.addStretch();
                  this.previewSizer.add( this.previewSizer2 );
            }
            this.previewSizer.add( this.extraGroupBox );
            let tabname;
            if (global.use_preview) {
                  if (ppar.preview.side_preview_visible) {
                        tabname = "Extra processing";
                  } else {
                        tabname = "Preview and extra processing";
                  }
            } else {
                  tabname = "Extra processing";
            }
            this.mainTabBox.addPage( mainSizerTab(this, this.previewSizer), tabname );
            tab_preview_index = tab_index;
            tab_index++;

            this.interfaceTabSizer = new HorizontalSizer;
            this.interfaceTabSizer.margin = 6;
            this.interfaceTabSizer.spacing = 4;
            this.interfaceTabSizer.add( this.interfaceGroupBox );
            this.mainTabBox.addPage( mainSizerTab(this, this.interfaceTabSizer), "Interface" );
            tab_index++;
      }

      this.mainTabsSizer = new HorizontalSizer;
      this.mainTabsSizer.margin = 6;
      this.mainTabsSizer.spacing = 4;

      if (global.use_preview && !ppar.preview.use_large_preview) {
            this.sidePreviewSizer = new VerticalSizer;
            this.sidePreviewSizer.margin = 6;
            this.sidePreviewSizer.spacing = 4;
            this.sidePreviewSizer.add( this.sidePreviewObj.sizer );
            if (sideHistogramControl != null) {
                  this.sidePreviewSizer.add( sideHistogramControl );
            }
            this.sidePreviewSizer.addStretch();
            this.mainTabsSizer.add( this.sidePreviewSizer );
      }
      this.mainTabsSizer.add( this.mainTabBox );
      //this.mainTabsSizer.addStretch();

      this.baseSizer = new VerticalSizer;
      this.baseSizer.margin = 6;
      this.baseSizer.spacing = 4;
      if (!ppar.files_in_tab) {
            this.baseSizer.add( this.tabBox);             // Files tabs
      }

      this.actionSizer = newActionSizer(this);
      this.jsonSizer = newJsonSizer(this);

      if (ppar.files_in_tab) {
            this.topButtonsSizer = new HorizontalSizer;
            this.topButtonsSizer.spacing = 4;
            this.topButtonsSizer.add( this.actionSizer );
            this.baseSizer.add( this.topButtonsSizer );

            this.topButtonsSizer2 = new HorizontalSizer;
            this.topButtonsSizer2.spacing = 4;
            this.topButtonsSizer2.add( this.jsonSizer );
            this.topButtonsSizer2.addSpacing( 12 );
            this.topButtonsSizer2.add( this.targetSizer );
            this.top2ndRowControl = new Control( this );
            this.top2ndRowControl.sizer = new HorizontalSizer;
            this.top2ndRowControl.sizer.add(this.topButtonsSizer2);
            this.baseSizer.add( this.top2ndRowControl );
      } else {
            this.pageButtonsSizer = newPageButtonsSizer(this, this.jsonSizer, this.actionSizer);
            this.baseSizer.add( this.pageButtonsSizer );
      }
      if (!ppar.files_in_tab) {
            this.baseSizer.add( this.filesButtonsSizer);  // Buttons row below files
      }
      this.baseSizer.add( this.mainTabsSizer );     // Main view with tabs
      this.baseSizer.add( this.info_Sizer );
      // this.baseSizer.add( this.buttons_Sizer );     // Buttons at the bottom

      this.sizer1 = new HorizontalSizer;
      //this.sizer1.margin = 6;
      //this.sizer1.spacing = 4;
      if (global.use_preview && ppar.preview.use_large_preview) {
            this.sidePreviewSizer = new VerticalSizer;
            this.sidePreviewSizer.margin = 6;
            this.sidePreviewSizer.spacing = 4;
            this.sidePreviewSizer.add( this.sidePreviewObj.sizer );
            if (sideHistogramControl != null) {
                  this.sidePreviewSizer.add( sideHistogramControl );
            }
            this.sidePreviewSizer.addStretch();
            this.sizer1.add( this.sidePreviewSizer);
      }
      this.sizer1.add( this.baseSizer);
      //this.sizer.addStretch();

      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      //this.sizer.spacing = 4;
      this.sizer.add( this.sizer1);
      this.sizer.add( this.buttons_Sizer );     // Buttons at the bottom

      // Version number
      this.windowTitle = global.autointegrate_version; 
      this.userResizable = true;
      this.adjustToContents();
      //this.setVariableSize();
      //this.files_GroupBox.setFixedHeight();

      setWindowPrefixHelpTip(ppar.win_prefix);
      util.updateStatusInfoLabel(global.autointegrate_version);

      console.show();

       if (ppar.preview.use_preview && !use_restored_preview_size) {
            // preview size not set, adjust to screen
            var preview_size = util.adjustDialogToScreen(
                                    this.dialog, 
                                    ppar.preview.side_preview_visible
                                          ? sidePreviewControl
                                          : tabPreviewControl,
                                    false,      // maxsize
                                    ppar.preview.side_preview_visible
                                          ? ppar.preview.side_preview_width
                                          : ppar.preview.preview_width,
                                    ppar.preview.side_preview_visible
                                          ? ppar.preview.side_preview_height
                                          : ppar.preview.preview_height);
            if (preview_size.changes) {
                  if (ppar.preview.side_preview_visible) {
                        // side preview
                        console.writeln("Adjusted side preview size from " + ppar.preview.side_preview_width + "x" + ppar.preview.side_preview_height + " to " + preview_size.width + "x" + preview_size.height);
                        ppar.preview.side_preview_width = preview_size.width;
                        ppar.preview.side_preview_height = preview_size.height;

                        console.writeln("Also adjusted tab preview size from " + ppar.preview.preview_width + "x" + ppar.preview.preview_height + " to " + Math.min(preview_size.width / 2, ppar.preview.preview_width) + "x" + Math.min(preview_size.height / 2, ppar.preview.preview_height));
                        ppar.preview.preview_width = Math.min(preview_size.width / 2, ppar.preview.preview_width);
                        ppar.preview.preview_height = Math.min(preview_size.height / 2, ppar.preview.preview_height);

                  } else {
                        // tab preview
                        console.writeln("Adjusted tab preview size from " + ppar.preview.preview_width + "x" + ppar.preview.preview_height + " to " + preview_size.width + "x" + preview_size.height);
                        ppar.preview.preview_width = preview_size.width;
                        ppar.preview.preview_height = preview_size.height;

                        console.writeln("Also adjusted side preview size from " + ppar.preview.side_preview_width + "x" + ppar.preview.side_preview_height + " to " + preview_size.width + "x" + preview_size.height);
                        ppar.preview.side_preview_width = preview_size.width;
                        ppar.preview.side_preview_height = preview_size.height;
                  }
            }
      }
      if (ppar.preview.use_preview) {
            updatePreviewNoImageInControl(sidePreviewControl);
            updatePreviewNoImageInControl(tabPreviewControl);
            console.writeln("Screen size " + screen_size +  
                            ", using preview size " + ppar.preview.preview_width + "x" + ppar.preview.preview_height + 
                            ", histogram height " + ppar.preview.histogram_height + 
                            ", side preview size " + ppar.preview.side_preview_width + "x" + ppar.preview.side_preview_height + 
                            ", side histogram height " + ppar.preview.side_histogram_height + 
                            ", dialog size " + this.width + "x" + this.height);
      }
}

AutoIntegrateDialog.prototype = new Dialog;

this.AutoIntegrateDialog = AutoIntegrateDialog;

/* Interface functions.
 */
this.updatePreviewWin = updatePreviewWin;
this.updatePreviewFilename = updatePreviewFilename;
this.updatePreviewId = updatePreviewId;
this.setBestImageInTreeBox = setBestImageInTreeBox;
this.setReferenceImageInTreeBox = setReferenceImageInTreeBox;
this.addFilesToTreeBox = addFilesToTreeBox;
this.updateInfoLabel = updateInfoLabel;
this.setTreeBoxSsweight = setTreeBoxSsweight;
this.close_undo_images = close_undo_images;
this.update_extra_target_image_window_list = update_extra_target_image_window_list;
this.fix_win_prefix_array = fix_win_prefix_array;
this.updateWindowPrefix = updateWindowPrefix;
this.updateOutputDirEdit = updateOutputDirEdit;
this.getOutputDirEdit = getOutputDirEdit;
this.getTreeBoxNodeFiles = getTreeBoxNodeFiles;
this.switchtoPreviewTab = switchtoPreviewTab;
this.flowchartUpdated = flowchartUpdated;

/* Exported data for testing.
 */
this.closeAllPrefixButton = closeAllPrefixButton;

}  /* AutoIntegrateGUI*/

AutoIntegrateGUI.prototype = new Object;
