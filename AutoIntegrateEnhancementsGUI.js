/*
      AutoIntegrate image enhancements module. Previously called extra processing.

Interface functions:

    See end of the file.

Interface objects:

    AutoIntegrateEnhancementsGUI

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEENHANCEMENTSGUI_JS
#define AUTOINTEGRATEENHANCEMENTSGUI_JS

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

function AutoIntegrateEnhancementsGUI(parent, guitools, util, global, engine, preview)
{

this.__base__ = Object;
this.__base__();

if (global.debug) console.writeln("AutoIntegrateEnhancementsGUI: constructor");

var self = this;
      
var par = global.par;
var ppar = global.ppar;

this.apply_completed_callback = null;

var Foraxx_palette_values = [ 'SHO', 'HOO' ];

var enhancements_gui_info = { 
      undo_images: [],        // undo_images[0] == original image, { image: <Image>, keywords: <image keywords>, histogramInfo: <see getHistogramInfo>, enhancements_info: [] }, see add_undo_image
      undo_images_pos: -1, 
      undo_button: null, 
      redo_button: null, 
      images_combobox: null,
      save_button: null
};

var enhancements_target_image_window_list = [];
var preview_control = null;

var adjust_type_values = [ 'Lights', 'Darks', 'All' ];
var star_reduce_methods = [ 'None', 'Transfer', 'Halo', 'Star' ];
var enhancements_gradient_correction_values = [ 'Auto', 'ABE', 'DBE', 'GradientCorrection', 'GraXpert' ];
var normalize_channels_reference_values = [ 'R', 'G', 'B' ];
var rotate_degrees_values = [ '90', '180', '-90' ];

var colorized_narrowband_preset_values = [ 'Default', 'North America', 'Eagle' ];
var narrowband_colorized_mapping_values = [ 'RGB', 'GRB', 'GBR', 'BRG', 'BGR', 'RBG' ];
var narrowband_colorized_combine_values = [ 'Channels', 'Screen', 'Sum', 'Mean', 'Max', 'Median' ];
var narrowband_colorized_method_values = [ 'PixelMath' ];
var signature_positions_values = [ 'Top left', 'Top middle', 'Top right', 'Bottom left', 'Bottom middle', 'Bottom right' ];
var highpass_sharpen_values = [ 'Default', 'MLT', 'UnsharpMask', 'BlurXTerminator', 'None' ];
var enhancements_HDRMLT_color_values = [ 'None', 'Preserve hue', 'Color corrected' ];

function update_enhancements_target_image_window_list(current_item)
{
      var combobox = enhancements_gui_info.images_combobox;

      if (current_item == null && enhancements_target_image_window_list.length > 0) {
            // use item from dialog
            current_item = enhancements_target_image_window_list[combobox.currentItem];
      }

      enhancements_target_image_window_list = util.getWindowListReverse();
#ifndef AUTOINTEGRATE_STANDALONE
      enhancements_target_image_window_list.unshift("Auto");
#endif

      combobox.clear();
      for (var i = 0; i < enhancements_target_image_window_list.length; i++) {
            combobox.addItem( enhancements_target_image_window_list[i] );
      }

      // update dialog
      if (current_item)  {
            combobox.currentItem = enhancements_target_image_window_list.indexOf(current_item);
            if (!combobox.currentItem) {
                  combobox.currentItem = 0;
            }
            if (enhancements_target_image_window_list 
            && enhancements_target_image_window_list.length > 0
            && enhancements_target_image_window_list[combobox.currentItem]) 
            {
                  combobox.setItemText(combobox.currentItem, enhancements_target_image_window_list[combobox.currentItem]);
            }
      }

      return enhancements_target_image_window_list;
}

function setPreviewControl(control)
{
      preview_control = control;
}

function update_undo_buttons()
{
      enhancements_gui_info.undo_button.enabled = enhancements_gui_info.undo_images.length > 0 && enhancements_gui_info.undo_images_pos > 0;
      enhancements_gui_info.redo_button.enabled = enhancements_gui_info.undo_images.length > 0 && enhancements_gui_info.undo_images_pos < enhancements_gui_info.undo_images.length - 1;
}

function getNumberAfterUnderscore(str) 
{
      const match = /_(\d+)$/.exec(str);
      return match ? parseInt(match[1], 10) : 0;
}

function removeUnderscoreNumber(str) 
{
      return str.replace(/_\d+$/, '');
}
function copy_new_edit_image(id)
{
      var copy_id = null;

      // Get edit count from file name
      var id_editcount = getNumberAfterUnderscore(id);
      console.writeln("copy_new_edit_image:id_editcount " + id_editcount);
      
      // Get edit count from image metadata
      var win = ImageWindow.windowById(id);
      id = util.getBaseWindowId(win);
      var editcount = util.getKeywordValue(win, "AutoIntegrateEditCount");
      if (editcount == null) {
            editcount = 0;
      } else {
            editcount = parseInt(editcount);
      }
      console.writeln("copy_new_edit_image:editcount " + editcount);

      if (id_editcount > 0) {
            // Check if next number is available
            var basename = removeUnderscoreNumber(id);
            console.writeln("copy_new_edit_image:basename " + basename);
            var next_id = basename + "_" + (id_editcount + 1).toString();
            console.writeln("copy_new_edit_image:next_id " + next_id);
            if (util.findWindow(next_id) == null) {
                  // Next id is free, use it
                  copy_id = next_id;
            }
      }
      if (copy_id == null) {
            // Next number used, create a new subversion
            // Try to find first free number
            for (var id_editcount = 1; ; id_editcount++) {
                  var next_id = id + "_" + id_editcount.toString();
                  if (util.findWindow(next_id) == null) {
                        copy_id = next_id;
                        break;
                  }
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

function print_enhancements_info(txt, info)
{
      if (txt) {
            console.noteln(txt);
      }
      if (info.length == 0) {
            console.writeln("- No enhancements applied");
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
      while (enhancements_gui_info.undo_images.length > enhancements_gui_info.undo_images_pos + 1) {
            enhancements_gui_info.undo_images.pop();
            console.writeln("Remove undo image " + enhancements_gui_info.undo_images.length);
      }
      enhancements_gui_info.undo_images_pos++;
      // console.writeln("undo_images_pos " + enhancements_gui_info.undo_images_pos);
      enhancements_gui_info.undo_images[enhancements_gui_info.undo_images_pos] = 
            { 
                  image: undo_image.image, 
                  keywords: undo_image.keywords,
                  histogramInfo: histogramInfo, 
                  enhancements_info: global.enhancements_info.concat() 
            };

      update_undo_buttons();

      print_enhancements_info("Applied enhancements:", global.enhancements_info);
}

function apply_undo()
{
      console.writeln("apply_undo");
      if (global.enhancements_target_image_id == null || global.enhancements_target_image_id == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (enhancements_gui_info.undo_images_pos <= 0) {
            console.noteln("Nothing to undo");
            return;
      }
      console.noteln("Undo on image " + global.enhancements_target_image_id + " (" + enhancements_gui_info.undo_images_pos + "/" + enhancements_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(global.enhancements_target_image_id);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.enhancements_target_image_id);
            return;
      }
      let undo_pos = enhancements_gui_info.undo_images_pos - 1;
      let source_image = enhancements_gui_info.undo_images[undo_pos].image;
      let source_keywords = enhancements_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = enhancements_gui_info.undo_images[undo_pos].histogramInfo;
      let source_enhancements_info = enhancements_gui_info.undo_images[undo_pos].enhancements_info;

      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      print_enhancements_info("Undo enhancements:", global.enhancements_info);

      target_win.keywords = source_keywords;
      global.enhancements_info = source_enhancements_info;

      preview.updatePreviewIdReset(global.enhancements_target_image_id, true, source_histogramInfo);
      
      enhancements_gui_info.undo_images_pos--;
      console.writeln("undo_images_pos " + enhancements_gui_info.undo_images_pos);
      update_undo_buttons();
}

function apply_redo()
{
      console.writeln("apply_redo");
      if (global.enhancements_target_image_id == null || global.enhancements_target_image_id == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (enhancements_gui_info.undo_images_pos >= enhancements_gui_info.undo_images.length - 1) {
            console.noteln("Nothing to redo");
            return;
      }
      console.noteln("Redo on image " + global.enhancements_target_image_id + " (" + (enhancements_gui_info.undo_images_pos + 2) + "/" + enhancements_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(global.enhancements_target_image_id);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.enhancements_target_image_id);
            return;
      }
      let undo_pos = enhancements_gui_info.undo_images_pos + 1;
      let source_image = enhancements_gui_info.undo_images[undo_pos].image;
      let source_keywords = enhancements_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = enhancements_gui_info.undo_images[undo_pos].histogramInfo;
      let source_enhancements_info = enhancements_gui_info.undo_images[undo_pos].enhancements_info;

      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      target_win.keywords = source_keywords;
      global.enhancements_info = source_enhancements_info;
      
      preview.updatePreviewIdReset(global.enhancements_target_image_id, true, source_histogramInfo);
      
      enhancements_gui_info.undo_images_pos++;
      console.writeln("undo_images_pos " + enhancements_gui_info.undo_images_pos);
      update_undo_buttons();

      print_enhancements_info("Redo enhancements:", global.enhancements_info);
}

function save_as_undo()
{
      //console.writeln("save_as_undo");
      if (global.enhancements_target_image_id == null || global.enhancements_target_image_id == "Auto") {
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

      saveFileDialog.initialPath = path + global.enhancements_target_image_id + ".xisf";
      if (!saveFileDialog.execute()) {
            console.noteln("Image " + global.enhancements_target_image_id + " not saved");
            return;
      }
      var save_dir = File.extractDrive(saveFileDialog.fileName) + File.enhancementsctDirectory(saveFileDialog.fileName);
      var save_id = File.enhancementsctName(saveFileDialog.fileName);
      var save_win = ImageWindow.windowById(global.enhancements_target_image_id);

      /* Save as 16 bit TIFF.
      */
      var copy_win = util.copyWindow(save_win, util.ensure_win_prefix(save_win.mainView.id + "_savetmp"));
      if (copy_win.bitsPerSample != 16) {
            console.writeln("saveFinalImageWindow:set bits to 16");
            copy_win.setSampleFormat(16, false);
      }
      var filename = util.ensurePathEndSlash(save_dir) + save_id + ".tif";
      console.noteln("Save " + global.enhancements_target_image_id + " as " + filename);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(filename, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + filename);
      }
      util.closeOneWindow(copy_win);

      /* Save as XISF.
      */
      var filename = util.ensurePathEndSlash(save_dir) + save_id + ".xisf";
      console.noteln("Save " + global.enhancements_target_image_id + " as " + filename);
      // Save image. No format options, no warning messages,
      // no strict mode, no overwrite checks.
      if (!save_win.saveAs(filename, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + filename);
      }

      util.saveLastDir(save_dir);
      update_undo_buttons();

      if (save_id != global.enhancements_target_image_id) {
            // Rename old image
            save_win.mainView.id = save_id;
            // Update preview name
            preview.updatePreviewTxt(save_win);
            // Update target list
            update_enhancements_target_image_window_list(save_id);
      }
}

function close_undo_images(at_exit = false)
{
      if (enhancements_gui_info.undo_images.length > 0) {
            console.writeln("Close undo images");
            enhancements_gui_info.undo_images = [];
            enhancements_gui_info.undo_images_pos = -1;
            if (!at_exit) {
                  update_undo_buttons();
            }
      }
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

      var narrowbandColorizedCheckBox = guitools.newCheckBox(parent, "Colorize narrowband", par.run_colorized_narrowband, 
            "<p>Enhance colors for narrowband and other images.</p>" + narrowbandColorizedtoolTip);

      if (par.debug.val) {    
            var narrowbandColorizedIntegratedImagesCheckBox = guitools.newCheckBox(parent, "D:Use integrated images", 
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
      
      var narrowbandColorizedPresetLabel = guitools.newLabel(parent, "Presets", narrowbandColorizedtoolTip);
      var narrowbandColorizedPresetComboBox = guitools.newComboBox(parent, par.colorized_narrowband_preset, colorized_narrowband_preset_values, narrowbandColorizedtoolTip);
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
            if (global.enhancements_target_image_id == 'Auto') {
                  var enhancementsWin = null;
                  var bitmap = util.createEmptyBitmap(2048, 2048, 0x80808080);
                  var originalWin = util.createWindowFromBitmap(bitmap, "AutoIntegrate_NoImage");
            } else {
                  var enhancementsWin = ImageWindow.windowById(global.enhancements_target_image_id);
                  var originalWin = enhancementsWin;
            }
            var copyWin = util.copyWindow(originalWin, originalWin.mainView.id + "_NBCpreview");

            // Process the copy and get channel images
            var channel_images = engine.enhancementsColorizedNarrowbandImages(copyWin);

            if (mosaic) {
                  // Create a preview window
                  var previewWin = preview.createCombinedMosaicPreviewWin([ channel_images[0], channel_images[1], channel_images[2], copyWin ]);
            } else {
                  var previewWin = preview.createCombinedMosaicPreviewWin([ originalWin, copyWin ]);
            }

            // Show the preview window
            preview.updatePreviewWin(previewWin);

            if (1) {
                  // Close windows
                  if (enhancementsWin == null) {
                        util.closeOneWindow(originalWin);
                  }
                  util.closeOneWindow(copyWin);
                  util.closeOneWindow(previewWin);
                  for (var i = 0; i < channel_images.length; i++) {
                        util.closeOneWindow(channel_images[i]);
                  }
            }
            util.runGarbageCollection();
      }

      if (par.debug.val) {
            narrowband_colorized_method_values.push('D:Curves');
            narrowband_colorized_method_values.push('D:PixelMathChannels');
      }

      var narrowbandColorizedMethodLabel = guitools.newLabel(parent, "Method",  "<p>Method tells how channels are colorized.</p>" + 
                                                                       "<p>PixelMath uses RGB color values derived from hue to create a colorized image.</p>" + 
                                                                       narrowbandColorizedtoolTip);
      var narrowbandColorizedMethodComboBox = guitools.newComboBox(parent, par.narrowband_colorized_method, narrowband_colorized_method_values, narrowbandColorizedMethodLabel.toolTip);

      var narrowbandColorizedCombineLabel = guitools.newLabel(parent, "Combine", "<p>Specifies how colorized channels are combined.</p>" + 
                                                                        "<p>Option Channels uses PixelMath. Each colorized channel is assigned to a separate RGB channel in PixelMath.</p>" + 
                                                                        "<p>Other options use a PixelMath formula combine channels. These options use a single PixelMath expression.</p>" + 
                                                                        narrowbandColorizedtoolTip);
      var narrowbandColorizedCombineComboBox = guitools.newComboBox(parent, par.narrowband_colorized_combine, narrowband_colorized_combine_values, narrowbandColorizedCombineLabel.toolTip);

      var narrowbandColorizedMappingLabel = guitools.newLabel(parent, "Mapping", "<p>Specifies how colorized channels are mapped in case of Channels combine method. Mapping tells how original RGB channels are ordered in the final image.</p>" + 
                                                             narrowbandColorizedtoolTip);
      var narrowbandColorizedMappingComboBox = guitools.newComboBox(parent, par.narrowband_colorized_mapping, narrowband_colorized_mapping_values, narrowbandColorizedMappingLabel.toolTip);


      var narrowbandColorizedLinerFitCheckBox = guitools.newCheckBox(parent, "Linear fit", par.narrowband_colorized_linear_fit, "<p>If set, channels are linear fit with R channel before colorize.</p>" + narrowbandColorizedtoolTip);

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
            new MessageBox(narrowbandColorizedtoolTipBase, "Narrowband colorization", StdIcon_Information).execute();
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
                          "Often it is necessary to reduce the weight value for example to 0.6</p>" +
                          "<p>In case of PixelMath combine method each colorized channel is multiplied by the weight value.</p>" +
                          narrowbandColorizedtoolTip;

      var SatToolTip = "<p>Color saturation for the channel.</p>" +
                       narrowbandColorizedtoolTip;

      var narrowbandColorized_R_HueControl = guitools.newNumericControl3(parent, "R hue", par.narrowband_colorized_R_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_R_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_R_SatControl = guitools.newNumericControl2(parent, "sat", par.narrowband_colorized_R_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_R_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_R_WeightControl = guitools.newNumericControl2(parent, "weight", par.narrowband_colorized_R_weight, 0, 2, weightToolTip);
      narrowbandColorized_R_WeightControl.setScaledFixedWidth(weight_width);
      
      var narrowbandColorized_G_HueControl = guitools.newNumericControl3(parent, "G hue", par.narrowband_colorized_G_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_G_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_G_SatControl = guitools.newNumericControl2(parent, "sat", par.narrowband_colorized_G_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_G_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_G_WeightControl = guitools.newNumericControl2(parent, "weight", par.narrowband_colorized_G_weight, 0, 2, weightToolTip);
      narrowbandColorized_G_WeightControl.setScaledFixedWidth(weight_width);
      
      var narrowbandColorized_B_HueControl = guitools.newNumericControl3(parent, "B hue", par.narrowband_colorized_B_hue, 0, 1, hueToolTip, updateHueColors);
      narrowbandColorized_B_HueControl.setScaledFixedWidth(hue_width);
      var narrowbandColorized_B_SatControl = guitools.newNumericControl2(parent, "sat", par.narrowband_colorized_B_sat, 0, 1, narrowbandColorizedtoolTip);
      narrowbandColorized_B_SatControl.setScaledFixedWidth(sat_width);
      var narrowbandColorized_B_WeightControl = guitools.newNumericControl2(parent, "weight", par.narrowband_colorized_B_weight, 0, 2, weightToolTip);
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

function createEnhancementsControls(parent)
{
      // Foraxx mapping
      self.narrowband_Foraxx_CheckBox = guitools.newCheckBox(parent, "Foraxx mapping", par.run_foraxx_mapping, 
            "<p>Use dynamic Foraxx palette on image.</p>" +
            "<p>Foraxx mapping can be done on a SHO or HOO image. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a dynamic Foraxx palette image.</p>" +
            "<p>After Foraxx SHO mapping <i>Remove green cast</i> and <i>Orange/blue colors</i> are run for the image.</p>" +
            "<p>To run basic Foraxx SHO mapping use <i>SHO mapping</i> and select <i>Dynamic SHO</i>.</p>" +
            "<p>To run Foraxx palette during the normal processing you need to select Dynamic narrowband palette like Dynamic SHO and " +
            "check the option <i>Narrowband mapping using non-linear data</i>.</p>" +
            "<p>" + guitools.Foraxx_credit + "</p>" );
      self.narrowband_Foraxx_palette_ComboBox = guitools.newComboBox(parent, par.foraxx_palette, Foraxx_palette_values, self.narrowband_Foraxx_CheckBox.toolTip);

      self.ForaxxSizer = new HorizontalSizer;
      self.ForaxxSizer.spacing = 4;
      self.ForaxxSizer.add( self.narrowband_Foraxx_CheckBox );
      self.ForaxxSizer.add( self.narrowband_Foraxx_palette_ComboBox );
      self.ForaxxSizer.addStretch();

      // SHO mapping
      self.enhancements_SHO_mapping_values = [];
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            if (global.narrowBandPalettes[i].sho_mappable) {
                  self.enhancements_SHO_mapping_values.push(global.narrowBandPalettes[i].name);
            }
      }
      self.enhancements_narrowband_mapping_CheckBox = guitools.newCheckBox(parent, "Narrowband mapping", par.run_enhancements_narrowband_mapping, 
            "<p>Map source narrowband image to a new narrowband palette.</p>" +
            "<p>Mapping can be done only on SHO or HOO images. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a new palette image.</p>");
      self.enhancements_narrowband_source_palette_ComboBox = guitools.newComboBox(parent, par.enhancements_narrowband_mapping_source_palette, Foraxx_palette_values, self.enhancements_narrowband_mapping_CheckBox.toolTip);
      self.enhancements_narrowband_target_mapping_Label = guitools.newLabel(parent, "to", self.enhancements_narrowband_mapping_CheckBox.toolTip);
      self.enhancements_narrowband_target_palette_ComboBox = guitools.newComboBox(parent, par.enhancements_narrowband_mapping_target_palette, self.enhancements_SHO_mapping_values, self.enhancements_narrowband_mapping_CheckBox.toolTip);

      self.enhancementsSHOMappingSizer = new HorizontalSizer;
      self.enhancementsSHOMappingSizer.spacing = 4;
      self.enhancementsSHOMappingSizer.add( self.enhancements_narrowband_mapping_CheckBox );
      self.enhancementsSHOMappingSizer.add( self.enhancements_narrowband_source_palette_ComboBox );
      self.enhancementsSHOMappingSizer.add( self.enhancements_narrowband_target_mapping_Label );
      self.enhancementsSHOMappingSizer.add( self.enhancements_narrowband_target_palette_ComboBox );
      self.enhancementsSHOMappingSizer.addStretch();

      self.narrowband_orangeblue_colors_CheckBox = guitools.newCheckBox(parent, "Orange/blue colors", par.run_orangeblue_colors, 
            "<p>Enhance image by shifting red colors more to  orange and enhancing blues. Useful for example with Foraxx palette.</p>");

      self.fix_narrowband_star_color_CheckBox = guitools.newCheckBox(parent, "Fix star colors", par.fix_narrowband_star_color, 
            "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars.</p>" );
      // self.narrowband_less_green_hue_shift_CheckBox = guitools.newCheckBox(parent, "Hue shift for less green", par.run_less_green_hue_shift, 
      //       "<p>Do hue shift to shift green color to the yellow color. Useful with SHO color palette.</p>" );
      self.narrowband_orange_hue_shift_CheckBox = guitools.newCheckBox(parent, "Hue shift for more orange", par.run_orange_hue_shift, 
            "<p>Do hue shift to enhance orange color. Useful with SHO color palette.</p>" );
      self.narrowband_hue_shift_CheckBox = guitools.newCheckBox(parent, "Hue shift for SHO", par.run_hue_shift, 
            "<p>Do hue shift to enhance HSO colors. Useful with SHO color palette.</p>" );

      self.narrowbandColorized_sizer = getNarrowbandColorizedSizer(parent);

      self.narrowband_leave_some_green_CheckBox = guitools.newCheckBox(parent, "Leave some green", par.leave_some_green, 
            "<p>Leave some green color on image when running SCNR. Useful with SHO color palette. </p>");
      self.narrowband_leave_some_green_Edit = guitools.newNumericEdit(parent, "Amount", par.leave_some_green_amount, 0, 1, 
            "<p>Amount value 0 keeps all the green, value 1 removes all green.</p>");
      self.narrowband_leave_some_green_sizer = new HorizontalSizer;
      self.narrowband_leave_some_green_sizer.spacing = 4;
      self.narrowband_leave_some_green_sizer.add( self.narrowband_leave_some_green_CheckBox );
      self.narrowband_leave_some_green_sizer.add( self.narrowband_leave_some_green_Edit );
      self.narrowband_leave_some_green_sizer.addStretch();
      self.run_narrowband_SCNR_CheckBox = guitools.newCheckBox(parent, "Remove green cast", par.run_narrowband_SCNR, 
            "<p>Run SCNR to remove green cast. Useful with SHO color palette.</p>");
      self.no_star_fix_mask_CheckBox = guitools.newCheckBox(parent, "No mask when fixing star colors", par.skip_star_fix_mask, 
            "<p>Do not use star mask when fixing star colors</p>" );
      self.remove_magenta_color_CheckBox = guitools.newCheckBox(parent, "Remove magenta color", par.remove_magenta_color, 
            "<p>Remove magenta color from image.</p>" );

      self.narrowbandOptions1_sizer = new VerticalSizer;
      self.narrowbandOptions1_sizer.margin = 6;
      self.narrowbandOptions1_sizer.spacing = 4;
      self.narrowbandOptions1_sizer.add( self.ForaxxSizer );
      self.narrowbandOptions1_sizer.add( self.enhancementsSHOMappingSizer );
      self.narrowbandOptions1_sizer.add( self.narrowband_orangeblue_colors_CheckBox );
      // self.narrowbandOptions1_sizer.add( self.narrowband_less_green_hue_shift_CheckBox );
      self.narrowbandOptions1_sizer.add( self.narrowband_orange_hue_shift_CheckBox );
      self.narrowbandOptions1_sizer.add( self.narrowband_hue_shift_CheckBox );

      self.narrowbandOptions2_sizer = new VerticalSizer;
      self.narrowbandOptions2_sizer.margin = 6;
      self.narrowbandOptions2_sizer.spacing = 4;
      self.narrowbandOptions2_sizer.add( self.run_narrowband_SCNR_CheckBox );
      self.narrowbandOptions2_sizer.add( self.narrowband_leave_some_green_sizer );
      self.narrowbandOptions2_sizer.add( self.remove_magenta_color_CheckBox );
      self.narrowbandOptions2_sizer.add( self.fix_narrowband_star_color_CheckBox );
      self.narrowbandOptions2_sizer.add( self.no_star_fix_mask_CheckBox );

      var narrowbandEnhancementsLabeltoolTip = 
            "<p>" +
            "Enhancements options to be applied on narrowband images. "+
            "They are applied before other enhancements options in the following order:" +
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
      self.narrowbandEnhancementsOptionsSizer = new HorizontalSizer;
      //self.narrowbandEnhancementsOptionsSizer.margin = 6;
      //self.narrowbandEnhancementsOptionsSizer.spacing = 4;
      self.narrowbandEnhancementsOptionsSizer.add( self.narrowbandOptions1_sizer );
      self.narrowbandEnhancementsOptionsSizer.add( self.narrowbandOptions2_sizer );
      self.narrowbandEnhancementsOptionsSizer.toolTip = narrowbandEnhancementsLabeltoolTip;
      self.narrowbandEnhancementsOptionsSizer.addStretch();

      // enhancements
      var enhancementsRemoveStars_Tooltip = 
            "<p>Run Starnet2 or StarXTerminator on image to generate a starless image and a separate image for the stars.</p>" + 
            "<p>When this is selected, enhancements are applied to the starless image. Smaller stars option is run on star images.</p>" + 
            "<p>At the end of the processing a combined image can be created from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            guitools.stars_combine_operations_Tooltip;
      self.enhancementsRemoveStars_CheckBox = guitools.newCheckBox(parent, "Remove stars", par.enhancements_remove_stars, enhancementsRemoveStars_Tooltip);
      self.enhancementsUnscreenStars_CheckBox = guitools.newCheckBox(parent, "Unscreen", par.enhancements_unscreen_stars, guitools.unscreen_tooltip);
      self.enhancementsRemoveStars_Sizer = new HorizontalSizer;
      self.enhancementsRemoveStars_Sizer.spacing = 4;
      self.enhancementsRemoveStars_Sizer.add( self.enhancementsRemoveStars_CheckBox);
      self.enhancementsRemoveStars_Sizer.add( self.enhancementsUnscreenStars_CheckBox);
      self.enhancementsRemoveStars_Sizer.toolTip = narrowbandEnhancementsLabeltoolTip;
      self.enhancementsRemoveStars_Sizer.addStretch();

      self.enhancementsFixStarCores_CheckBox = guitools.newCheckBox(parent, "Fix star cores", par.enhancements_fix_star_cores, 
            "<p>Fix star cores by applying a slight blur to then using a star mask.</p>");

      var enhancementsCombineStarsReduce_Tooltip =
            "<p>With reduce selection it is possible to reduce stars while combining. " +
            "Star reduction uses PixelMath expressions created by Bill Blanshan.</p>" +
            "<p>Different methods are:</p>" +
            "<p>" +
            "None - No reduction<br>" +
            "Transfer - Method 1, Transfer method<br>" +
            "Halo - Method 2, Halo method<br>" +
            "Star - Method 3, Star method" +
            "</p>";
      var enhancementsCombineStars_Tooltip = 
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
            guitools.stars_combine_operations_Tooltip + 
            enhancementsCombineStarsReduce_Tooltip;
      self.enhancementsCombineStars_CheckBox = guitools.newCheckBox(parent, "Combine starless and stars", par.enhancements_combine_stars, enhancementsCombineStars_Tooltip);
      self.enhancementsCombineStars_ComboBox = guitools.newComboBox(parent, par.enhancements_combine_stars_mode, guitools.starless_and_stars_combine_values, enhancementsCombineStars_Tooltip);

      self.enhancementsCombineStars_Sizer1= new HorizontalSizer;
      self.enhancementsCombineStars_Sizer1.spacing = 4;
      self.enhancementsCombineStars_Sizer1.add( self.enhancementsCombineStars_CheckBox);
      self.enhancementsCombineStars_Sizer1.add( self.enhancementsCombineStars_ComboBox);
      self.enhancementsCombineStars_Sizer1.toolTip = narrowbandEnhancementsLabeltoolTip;
      self.enhancementsCombineStars_Sizer1.addStretch();

      self.enhancementsCombineStarsReduce_Label = guitools.newLabel(parent, "Reduce stars", enhancementsCombineStarsReduce_Tooltip);
      self.enhancementsCombineStarsReduce_ComboBox = guitools.newComboBox(parent, par.enhancements_combine_stars_reduce, star_reduce_methods, 
            enhancementsCombineStarsReduce_Tooltip);
      self.enhancementsCombineStarsReduce_S_edit = guitools.newNumericEdit(parent, 'S', par.enhancements_combine_stars_reduce_S, 0.0, 1.0, 
            "<p>To reduce stars size more with Transfer and Halo, lower S value.<p>" + enhancementsCombineStarsReduce_Tooltip);
      var enhancementsCombineStarsReduce_M_toolTip = "<p>Star method mode; 1=Strong; 2=Moderate; 3=Soft reductions.</p>" + enhancementsCombineStarsReduce_Tooltip;
      self.enhancementsCombineStarsReduce_M_Label = guitools.newLabel(parent, "I", enhancementsCombineStarsReduce_M_toolTip);
      self.enhancementsCombineStarsReduce_M_SpinBox = guitools.newSpinBox(parent, par.enhancements_combine_stars_reduce_M, 1, 3, 
            enhancementsCombineStarsReduce_M_toolTip);

      self.enhancementsCombineStars_Sizer2 = new HorizontalSizer;
      self.enhancementsCombineStars_Sizer2.spacing = 4;
      self.enhancementsCombineStars_Sizer2.addSpacing(20);
      self.enhancementsCombineStars_Sizer2.add( self.enhancementsCombineStarsReduce_Label);
      self.enhancementsCombineStars_Sizer2.add( self.enhancementsCombineStarsReduce_ComboBox);
      self.enhancementsCombineStars_Sizer2.add( self.enhancementsCombineStarsReduce_S_edit);
      self.enhancementsCombineStars_Sizer2.add( self.enhancementsCombineStarsReduce_M_Label);
      self.enhancementsCombineStars_Sizer2.add( self.enhancementsCombineStarsReduce_M_SpinBox);
      self.enhancementsCombineStars_Sizer2.toolTip = narrowbandEnhancementsLabeltoolTip;
      self.enhancementsCombineStars_Sizer2.addStretch();

      self.enhancementsStarsImageLabel = guitools.newLabel(parent, "Starless image", "Text Auto or empty image uses default starless image.");
      self.enhancementsStarsImageEdit = guitools.newTextEdit(parent, par.enhancements_combine_stars_image, self.enhancementsStarsImageLabel.toolTip);
      var enhancementsStarsImageEdit = self.enhancementsStarsImageEdit;
      self.enhancementsStarsImageSelectButton = new ToolButton(parent);
      self.enhancementsStarsImageSelectButton.text = "Select";
      self.enhancementsStarsImageSelectButton.icon = parent.scaledResource(":/icons/find.png");
      self.enhancementsStarsImageSelectButton.toolTip = "<p>Select stars image manually from open images.</p>";
      self.enhancementsStarsImageSelectButton.onClick = function()
      {
            let selectStars = new AutoIntegrateSelectStarsImageDialog(util);
            selectStars.windowTitle = "Select Stars Image";
            if (selectStars.execute()) {
                  if (selectStars.name == null) {
                        console.writeln("Stars image not selected");
                        return;
                  }
                  console.writeln("Stars image name " + selectStars.name);
                  enhancementsStarsImageEdit.text = selectStars.name;
                  par.enhancements_combine_stars_image.val = selectStars.name;
            }
      };

      self.enhancementsCombineStarsSelect_Sizer = new HorizontalSizer;
      self.enhancementsCombineStarsSelect_Sizer.spacing = 4;
      self.enhancementsCombineStarsSelect_Sizer.addSpacing(20);
      self.enhancementsCombineStarsSelect_Sizer.add( self.enhancementsStarsImageLabel);
      self.enhancementsCombineStarsSelect_Sizer.add( self.enhancementsStarsImageEdit);
      self.enhancementsCombineStarsSelect_Sizer.add( self.enhancementsStarsImageSelectButton);

      self.enhancementsCombineStars_Sizer = new VerticalSizer;
      self.enhancementsCombineStars_Sizer.spacing = 4;
      self.enhancementsCombineStars_Sizer.add( self.enhancementsCombineStars_Sizer1);
      self.enhancementsCombineStars_Sizer.add( self.enhancementsCombineStarsSelect_Sizer );
      self.enhancementsCombineStars_Sizer.add( self.enhancementsCombineStars_Sizer2);
      self.enhancementsCombineStars_Sizer.toolTip = narrowbandEnhancementsLabeltoolTip;
      self.enhancementsCombineStars_Sizer.addStretch();

      self.enhancementsRGBHamapping_CheckBox = guitools.newCheckBox(parent, "Ha to RGB mapping", par.enhancements_ha_mapping, 
            "<p>Run Ha to RGB mapping on the image.</p>" +
            "<p>Integratrion_H, Integration_H_crop or Integration_H_enhanced image must be loaded to the desktop.</p>" );
      self.enhancementsDarkerBackground_CheckBox = guitools.newCheckBox(parent, "Darker background", par.enhancements_darker_background, 
            "<p>Make image background darker using a lightness mask.</p>" );
      self.enhancementsDarkerHighlights_CheckBox = guitools.newCheckBox(parent, "Darker highlights", par.enhancements_darker_highlights, 
            "<p>Make image highlights darker using a lightness mask.</p>" );

      self.enhancements_backgroundneutralization_CheckBox = guitools.newCheckBox(parent, "Background neutralization", par.enhancements_backgroundneutralization, 
            "<p>Run background neutralization to the image.</p>" );

      self.enhancements_GC_CheckBox = guitools.newCheckBox(parent, "Gradient correction", par.enhancements_GC, 
            "<p>Do gradient correction to the image using the selected gradient correction method.</p>" );
      self.enhancements_GC_values_ComboBox = guitools.newComboBox(parent, par.enhancements_GC_method, enhancements_gradient_correction_values, 
            "<p>Gradient correction method to be used.</p>"
#ifndef AUTOINTEGRATE_STANDALONE
            + "<p>Auto uses the selected gradient correction method from <i>Setting</i> tab.</p>"
#endif
      );
      self.enhancements_GC_Sizer = new HorizontalSizer;
      self.enhancements_GC_Sizer.spacing = 4;
      self.enhancements_GC_Sizer.add( self.enhancements_GC_CheckBox );
      self.enhancements_GC_Sizer.add( self.enhancements_GC_values_ComboBox );
      self.enhancements_GC_Sizer.addStretch();

      self.enhancementsBandinReduction_CheckBox = guitools.newCheckBox(parent, "Banding reduction", par.enhancements_banding_reduction, 
            "<p>Run banding reduction on the image.</p>" );

      var enhancements_ET_tooltip = "<p>Run ExponentialTransform on image using a mask.</p>";
      self.enhancements_ET_CheckBox = guitools.newCheckBox(parent, "ExponentialTransform,", par.enhancements_ET, enhancements_ET_tooltip);
      self.enhancements_ET_order_edit = guitools.newNumericEdit(parent, 'Order', par.enhancements_ET_order, 0.1, 6, "Order value for ExponentialTransform.");
      self.enhancements_ET_adjust_label = guitools.newLabel(parent, "Adjust", "<p>Adjust type to be used with ExponentialTransform.</p>" +
                                                                  "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                                  guitools.adjust_type_toolTip);
      self.enhancements_ET_adjust_Combobox = guitools.newComboBox(parent, par.enhancements_ET_adjusttype, adjust_type_values, self.enhancements_ET_adjust_label.toolTip);

      self.enhancements_ET_Sizer = new HorizontalSizer;
      self.enhancements_ET_Sizer.spacing = 4;
      self.enhancements_ET_Sizer.add( self.enhancements_ET_CheckBox );
      self.enhancements_ET_Sizer.add( self.enhancements_ET_order_edit );
      self.enhancements_ET_Sizer.add( self.enhancements_ET_adjust_label );
      self.enhancements_ET_Sizer.add( self.enhancements_ET_adjust_Combobox );
      self.enhancements_ET_Sizer.toolTip = enhancements_ET_tooltip;
      self.enhancements_ET_Sizer.addStretch();

      var enhancements_HDRMLT_tooltip = "<p>Run HDRMultiscaleTransform on image using a mask.</p>" +
                                    "<p>Color option is used to select different methods to keep hue and saturation.</p> " + 
                                    "<ul>" +
                                    "<li>Option 'None' uses HDRMLT To lightness option.</li>" + 
                                    "<li>Option 'Preserve hue' uses HDRMLT preserve hue option.</li>" + 
                                    "<li>Option 'Color corrected' uses To Intensity instead of To lightness. It applies HSI transformation to the intensity component. " + 
#ifndef AUTOINTEGRATE_STANDALONE
                                    "In PixInsight 1.8.9-1 or older it uses a method described by Russell Croman." + 
#endif
                                    "</li>" + 
                                    "</ul>" +
                                    "<p>Layers selection specifies the layers value for HDRMLT.</p>";
      self.enhancements_HDRMLT_CheckBox = guitools.newCheckBox(parent, "HDRMultiscaleTransform", par.enhancements_HDRMLT, enhancements_HDRMLT_tooltip);

      self.enhancements_HDRMLT_Layers_Label = new Label( parent );
      self.enhancements_HDRMLT_Layers_Label.text = "Layers";
      self.enhancements_HDRMLT_Layers_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.enhancements_HDRMLT_Layers_Label.toolTip = enhancements_HDRMLT_tooltip;
      self.enhancements_HDRMLT_Layers_SpinBox = guitools.newSpinBox(parent, par.enhancements_HDRMLT_layers, 2, 10, enhancements_HDRMLT_tooltip);
      self.enhancements_HDRMLT_Overdrive_Edit = guitools.newNumericEditPrecision(parent, "Overdrive", par.enhancements_HDRMLT_overdrive, 0, 1, enhancements_HDRMLT_tooltip, 3);
      self.enhancements_HDRMLT_Iterations_Label = guitools.newLabel(parent, "Iterations", enhancements_HDRMLT_tooltip);
      self.enhancements_HDRMLT_Iterations_SpinBox = guitools.newSpinBox(parent, par.enhancements_HDRMLT_iterations, 1, 16, enhancements_HDRMLT_tooltip);

      self.enhancements_HDRMLT_Color_Label = new Label( parent );
      self.enhancements_HDRMLT_Color_Label.text = "Color";
      self.enhancements_HDRMLT_Color_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.enhancements_HDRMLT_Color_Label.toolTip = enhancements_HDRMLT_tooltip;
      self.enhancements_HDRMLT_color_ComboBox = guitools.newComboBox(parent, par.enhancements_HDRMLT_color, enhancements_HDRMLT_color_values, enhancements_HDRMLT_tooltip);

      self.enhancements_HDRMLT_Options_Sizer = new HorizontalSizer;
      self.enhancements_HDRMLT_Options_Sizer.spacing = 4;
      self.enhancements_HDRMLT_Options_Sizer.addSpacing(20);
      self.enhancements_HDRMLT_Options_Sizer.add( self.enhancements_HDRMLT_Layers_Label );
      self.enhancements_HDRMLT_Options_Sizer.add( self.enhancements_HDRMLT_Layers_SpinBox );
      self.enhancements_HDRMLT_Options_Sizer.add( self.enhancements_HDRMLT_Iterations_Label );
      self.enhancements_HDRMLT_Options_Sizer.add( self.enhancements_HDRMLT_Iterations_SpinBox );
      self.enhancements_HDRMLT_Options_Sizer.add( self.enhancements_HDRMLT_Overdrive_Edit );
      self.enhancements_HDRMLT_Options_Sizer.addStretch();

      self.enhancements_HDRMLT_Options_Sizer2 = new HorizontalSizer;
      self.enhancements_HDRMLT_Options_Sizer2.spacing = 4;
      self.enhancements_HDRMLT_Options_Sizer2.addSpacing(20);
      self.enhancements_HDRMLT_Options_Sizer2.add( self.enhancements_HDRMLT_Color_Label );
      self.enhancements_HDRMLT_Options_Sizer2.add( self.enhancements_HDRMLT_color_ComboBox );
      self.enhancements_HDRMLT_Options_Sizer2.addStretch();

      self.enhancements_HDRMLT_Sizer = new VerticalSizer;
      self.enhancements_HDRMLT_Sizer.spacing = 4;
      self.enhancements_HDRMLT_Sizer.add( self.enhancements_HDRMLT_CheckBox );
      self.enhancements_HDRMLT_Sizer.add( self.enhancements_HDRMLT_Options_Sizer );
      self.enhancements_HDRMLT_Sizer.add( self.enhancements_HDRMLT_Options_Sizer2 );

      var enhancements_LHE_tooltip = "<p>Run LocalHistogramEqualization on image using a mask.</p>";
      self.enhancements_LHE_CheckBox = guitools.newCheckBox(parent, "LocalHistogramEqualization,", par.enhancements_LHE, enhancements_LHE_tooltip);
      self.enhancements_LHE_kernelradius_edit = guitools.newNumericEdit(parent, 'Kernel Radius', par.enhancements_LHE_kernelradius, 16, 512, "<p>Kernel radius value for LocalHistogramEqualization.</p>");
      self.enhancements_LHE_contrastlimit_edit = guitools.newNumericEdit(parent, 'Contrast limit', par.enhancements_LHE_contrastlimit, 1, 64, 
                                                                  "<p>Contrast limit value for LocalHistogramEqualization.</p>" +
                                                                  "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      self.enhancements_LHE_adjust_label = guitools.newLabel(parent, "Adjust", "<p>Mask type to be used with LocalHistogramEqualization.</p>" +
                                                                  "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                                  guitools.adjust_type_toolTip +
                                                                  "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      self.enhancements_LHE_adjust_Combobox = guitools.newComboBox(parent, par.enhancements_LHE_adjusttype, adjust_type_values, self.enhancements_LHE_adjust_label.toolTip);

      self.enhancements_LHE_sizer1 = new HorizontalSizer;
      self.enhancements_LHE_sizer1.spacing = 4;
      self.enhancements_LHE_sizer1.add( self.enhancements_LHE_CheckBox );
      self.enhancements_LHE_sizer1.add( self.enhancements_LHE_adjust_label );
      self.enhancements_LHE_sizer1.add( self.enhancements_LHE_adjust_Combobox );
      self.enhancements_LHE_sizer1.toolTip = enhancements_LHE_tooltip;
      self.enhancements_LHE_sizer1.addStretch();

      self.enhancements_LHE_sizer2 = new HorizontalSizer;
      self.enhancements_LHE_sizer2.spacing = 4;
      self.enhancements_LHE_sizer2.addSpacing(20);
      self.enhancements_LHE_sizer2.add( self.enhancements_LHE_kernelradius_edit );
      self.enhancements_LHE_sizer2.add( self.enhancements_LHE_contrastlimit_edit );
      self.enhancements_LHE_sizer2.toolTip = enhancements_LHE_tooltip;
      self.enhancements_LHE_sizer2.addStretch();

      self.enhancements_LHE_sizer = new VerticalSizer;
      self.enhancements_LHE_sizer.spacing = 4;
      self.enhancements_LHE_sizer.add( self.enhancements_LHE_sizer1 );
      self.enhancements_LHE_sizer.add( self.enhancements_LHE_sizer2 );
      self.enhancements_LHE_sizer.toolTip = enhancements_LHE_tooltip;
      self.enhancements_LHE_sizer.addStretch();

      self.enhancements_Contrast_CheckBox = guitools.newCheckBox(parent, "Add contrast", par.enhancements_contrast, 
            "<p>Run slight S shape curves transformation on image to add contrast.</p>" );
      self.contrastIterationsSpinBox = guitools.newSpinBox(parent, par.enhancements_contrast_iterations, 1, 5, "Number of iterations for contrast enhancement");
      self.contrastIterationsLabel = new Label( parent );
      self.contrastIterationsLabel.text = "iterations";
      self.contrastIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.contrastIterationsLabel.toolTip = self.contrastIterationsSpinBox.toolTip;
      self.enhancementsContrastSizer = new HorizontalSizer;
      self.enhancementsContrastSizer.spacing = 4;
      self.enhancementsContrastSizer.add( self.enhancements_Contrast_CheckBox );
      self.enhancementsContrastSizer.add( self.contrastIterationsSpinBox );
      self.enhancementsContrastSizer.add( self.contrastIterationsLabel );
      self.enhancementsContrastSizer.toolTip = self.contrastIterationsSpinBox.toolTip;
      self.enhancementsContrastSizer.addStretch();

      var enhancementsAutoContrastTooltip = "<p>Do automatic contrast enhancement. Works best with starless image.</p>";
      self.enhancementsAutoContrastCheckBox = guitools.newCheckBox(parent, "Auto contrast,", par.enhancements_auto_contrast, enhancementsAutoContrastTooltip);
      self.enhancementsAutoContrastEditLow = guitools.newNumericEditPrecision(parent, 'low', par.enhancements_auto_contrast_limit_low, 0, 100, "Percentage of clipped low pixels.", 4);
      self.enhancementsAutoContrastEditHigh = guitools.newNumericEditPrecision(parent, 'high', par.enhancements_auto_contrast_limit_high, 0, 100, "Percentage of preserved high pixels.", 4);
      self.enhancementsAutoContrastChannelsCheckBox = guitools.newCheckBox(parent, "channels", par.enhancements_auto_contrast_channels, "Apply auto contrast separately for each channel.");
      self.enhancementsAutoContrastSizer = new HorizontalSizer;
      self.enhancementsAutoContrastSizer.spacing = 4;
      self.enhancementsAutoContrastSizer.add( self.enhancementsAutoContrastCheckBox );
      self.enhancementsAutoContrastSizer.add( self.enhancementsAutoContrastEditLow );
      self.enhancementsAutoContrastSizer.add( self.enhancementsAutoContrastEditHigh );
      self.enhancementsAutoContrastSizer.add( self.enhancementsAutoContrastChannelsCheckBox );
      self.enhancementsAutoContrastSizer.toolTip = enhancementsAutoContrastTooltip;
      self.enhancementsAutoContrastSizer.addStretch();

#ifndef AUTOINTEGRATE_STANDALONE
      self.enhancements_stretch_CheckBox = guitools.newCheckBox(parent, "Auto stretch", par.enhancements_stretch, 
            "<p>Run automatic stretch on image. Can be helpful in some rare cases but it is most useful on testing stretching settings with Apply button.</p>" );
      self.enhancements_autostf_CheckBox = guitools.newCheckBox(parent, "AutoSTF", par.enhancements_autostf, 
            "<p>Run unlinked AutoSTF stretch on image. Can be helpful in balancing image.</p>" );
#endif 

      self.enhancements_signature_CheckBox = guitools.newCheckBox(parent, "Signature", par.enhancements_signature, 
            "<p>Add signature to the image.</p>" );
      self.enhancements_signature_path_Edit = guitools.newTextEdit(parent, par.enhancements_signature_path, "Path to signature file.");
      self.enhancements_signature_path_Button = new ToolButton( parent );
      self.enhancements_signature_path_Button.icon = parent.scaledResource(":/icons/select-file.png");
      self.enhancements_signature_path_Button.toolTip = self.enhancements_signature_path_Edit.toolTip;
      self.enhancements_signature_path_Button.setScaledFixedSize( 20, 20 );
      var enhancements_signature_path_Edit = self.enhancements_signature_path_Edit;
      self.enhancements_signature_path_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            enhancements_signature_path_Edit.text = ofd.fileName;
            par.enhancements_signature_path.val = ofd.fileName;
            console.writeln("Signature file path: " + ofd.fileName);
      };
      self.enhancements_signature_scale_Label = guitools.newLabel(parent, "Scale", 
            "<p>Scale for signature image. Scale is the signature file height in percentages relative to the main image. " +
            "For example scale 10 means that the signature file height will be 10% of the main image height. " +
            "Value zero means no scaling.</p>");
      self.enhancements_signature_scale_SpinBox = guitools.newSpinBox(parent, par.enhancements_signature_scale, 0, 100, self.enhancements_signature_scale_Label.toolTip);
      self.enhancements_signature_position_ComboBox = guitools.newComboBox(parent, par.enhancements_signature_position, signature_positions_values, "<p>Signature position.</p>");

      self.enhancements_force_new_mask_CheckBox = guitools.newCheckBox(parent, "New mask", par.enhancements_force_new_mask, 
            "<p>Do not use existing mask but create a new luminance or star mask when needed.</p>" );
      self.enhancements_range_mask_CheckBox = guitools.newCheckBox(parent, "range_mask", par.enhancements_range_mask, 
            "<p>Use a user created range mask. It is used as is, it is not for example inverted.</p>" +
            "<p>White selects, black protects.</p>" +
            "<p>Note that this option overwrites any adjust settings selected for an option.</p>");
      self.enhancements_auto_reset_CheckBox = guitools.newCheckBox(parent, "Auto reset", par.enhancements_auto_reset, 
            "<p>If using Apply button, uncheck options when they are applied.</p>" );

      var shadowclipTooltip = "<p>Adjust shadows in the image. Adjust percentage tells how much shadow pixels are clipped.</p>" +
                              "<p>With a value of 0, no shadow pixels are clipped but histogram, is moved to the left.</p>";
      self.enhancements_shadowclip_CheckBox = guitools.newCheckBox(parent, "Adjust shadows,", par.enhancements_shadowclipping, shadowclipTooltip);
      self.enhancements_shadowclipperc_edit = guitools.newNumericEditPrecision(parent, '%', par.enhancements_shadowclippingperc, 0, 100, shadowclipTooltip, 4);
      self.enhancements_shadowclip_Sizer = new HorizontalSizer;
      self.enhancements_shadowclip_Sizer.spacing = 4;
      self.enhancements_shadowclip_Sizer.add( self.enhancements_shadowclip_CheckBox );
      self.enhancements_shadowclip_Sizer.add( self.enhancements_shadowclipperc_edit );
      self.enhancements_shadowclip_Sizer.toolTip = shadowclipTooltip;
      self.enhancements_shadowclip_Sizer.addStretch();

      var enhancementsEnhanceShadowsTooltip = "<p>Enhance shadows by using log function on each pixel.</p>";
      self.enhancementsEnhanceShadowsCheckBox = guitools.newCheckBox(parent, "Enhance shadows", par.enhancements_shadow_enhance, enhancementsEnhanceShadowsTooltip);
      self.enhancementsEnhanceShadowsSizer = new HorizontalSizer;
      self.enhancementsEnhanceShadowsSizer.spacing = 4;
      self.enhancementsEnhanceShadowsSizer.add( self.enhancementsEnhanceShadowsCheckBox );
      self.enhancementsEnhanceShadowsSizer.toolTip = shadowclipTooltip;
      self.enhancementsEnhanceShadowsSizer.addStretch();

      var enhancementsEnhanceHighlightsTooltip = "<p>Enhance highlights by using exp function on each pixel.</p>";
      self.enhancementsEnhanceHighlightsCheckBox = guitools.newCheckBox(parent, "Enhance highlights", par.enhancements_highlight_enhance, enhancementsEnhanceHighlightsTooltip);
      self.enhancementsEnhanceHighlightsSizer = new HorizontalSizer;
      self.enhancementsEnhanceHighlightsSizer.spacing = 4;
      self.enhancementsEnhanceHighlightsSizer.add( self.enhancementsEnhanceHighlightsCheckBox );
      self.enhancementsEnhanceHighlightsSizer.toolTip = shadowclipTooltip;
      self.enhancementsEnhanceHighlightsSizer.addStretch();

      var enhancementsGammaTooltip = "<p>Apply gamma correction to the image.</p>" +
                              "<p>Value below 1 will make the image lighter. Value above 1 will make image darker.</p>";
      self.enhancementsGammaCheckBox = guitools.newCheckBox(parent, "Gamma", par.enhancements_gamma, enhancementsGammaTooltip);
      self.enhancementsGammaEdit = guitools.newNumericEdit(parent, '', par.enhancements_gamma_value, 0, 2, enhancementsGammaTooltip);
      self.enhancementsGammaSizer = new HorizontalSizer;
      self.enhancementsGammaSizer.spacing = 4;
      self.enhancementsGammaSizer.add( self.enhancementsGammaCheckBox );
      self.enhancementsGammaSizer.add( self.enhancementsGammaEdit );
      self.enhancementsGammaSizer.toolTip = enhancementsGammaTooltip;
      self.enhancementsGammaSizer.addStretch();

      var smoothBackgroundTooltip = 
            "<p>Smoothen background below a given pixel value. Pixel value can be found for example " +
            "from the preview image using a mouse.</p>" +
            "<p>A limit value specifies below which the smoothing is done. " + 
            "The value should be selected so that no foreground data is lost.</p>" + 
            "<p>Smoothing sets a new relative value for pixels that are below the given limit value. " +
            "If the factor is below 1, new pixel values will be higher than the old values. " +
            "If factor is above 1, new pixel values will be lower than the old values.</p>" +
            "<p>With a factor value below 1, smoothening can help gradient correction to clean up the background better in case of " + 
            "very uneven background.</p>" +
            "<p>With a factor value above 1, smoothening can make dark parts of the image darker.</p>";

      self.enhancements_smoothBackground_CheckBox = guitools.newCheckBox(parent, "Smoothen background,", par.enhancements_smoothbackground, smoothBackgroundTooltip);
      self.enhancements_smoothBackgroundval_edit = guitools.newNumericEditPrecision(parent, 'value', par.enhancements_smoothbackgroundval, 0, 100, smoothBackgroundTooltip, 4);
      self.enhancements_smoothBackgroundfactor_edit = guitools.newNumericEditPrecision(parent, 'factor', par.enhancements_smoothbackgroundfactor, 0, 10, smoothBackgroundTooltip, 2);
      self.enhancements_smoothBackground_Sizer = new HorizontalSizer;
      self.enhancements_smoothBackground_Sizer.spacing = 4;
      self.enhancements_smoothBackground_Sizer.add( self.enhancements_smoothBackground_CheckBox );
      self.enhancements_smoothBackground_Sizer.add( self.enhancements_smoothBackgroundval_edit );
      self.enhancements_smoothBackground_Sizer.add( self.enhancements_smoothBackgroundfactor_edit );
      self.enhancements_smoothBackground_Sizer.toolTip = smoothBackgroundTooltip;
      self.enhancements_smoothBackground_Sizer.addStretch();

      self.enhancementsNormalizeChannelsCheckBox = guitools.newCheckBox(parent, "Normalize channels,", par.enhancements_normalize_channels, 
                                                            "<p>Normalize black point and brightness on all channels based on a reference channel.<p>" +
                                                            "<p>Can be useful for example on narrowband images where Halpha data (typically on channel B) is much stronger than S or O.<p>" +
                                                            "<p>Normalization uses similar PixelMath expressions as Bill Blanshan in his <i>Narrowband Normalization using Pixnsight Pixelmath</i> " + 
                                                            "script. See more information in his YouTube channel AnotherAstroChannel.</p>");
      self.enhancementsNormalizeChannelsReferenceLabel = guitools.newLabel(parent, "reference", "Reference channel for normalization." + self.enhancementsNormalizeChannelsCheckBox.toolTip);
      self.enhancementsNormalizeChannelsReferenceComboBox = guitools.newComboBox(parent, par.enhancements_normalize_channels_reference, normalize_channels_reference_values, self.enhancementsNormalizeChannelsReferenceLabel.toolTip);
      self.enhancementsNormalizeChannelsMaskCheckBox = guitools.newCheckBox(parent, "Mask", par.enhancements_normalize_channels_mask, 
                                                            "<p>Use a lightness mask when normalizing. It can help to avoid overstretching dark parts of the image.</p>" + 
                                                            self.enhancementsNormalizeChannelsCheckBox.toolTip);
      self.enhancementsNormalizeChannelsRescaleCheckBox = guitools.newCheckBox(parent, "Rescale", par.enhancements_normalize_channels_rescale, 
                                                            "<p>Rescales the image to [0, 1] during PixelMath operation. Can be useful if there is clipping in normalization.</p>" + 
                                                            self.enhancementsNormalizeChannelsCheckBox.toolTip);

      self.enhancementsNormalizeChannelsSizer = new HorizontalSizer;
      self.enhancementsNormalizeChannelsSizer.spacing = 4;
      // self.enhancementsNormalizeChannelsSizer.margin = 2;
      self.enhancementsNormalizeChannelsSizer.add( self.enhancementsNormalizeChannelsCheckBox );
      self.enhancementsNormalizeChannelsSizer.add( self.enhancementsNormalizeChannelsReferenceLabel );
      self.enhancementsNormalizeChannelsSizer.add( self.enhancementsNormalizeChannelsReferenceComboBox );
      self.enhancementsNormalizeChannelsSizer.add( self.enhancementsNormalizeChannelsMaskCheckBox );
      self.enhancementsNormalizeChannelsSizer.add( self.enhancementsNormalizeChannelsRescaleCheckBox );
      self.enhancementsNormalizeChannelsSizer.addStretch();

      var enhancementsAdjustChannelsToolTip = "<p>Adjust channels in PixelMath by multiplying them with a given value.</p>" + 
                                          "<p>If option Only K is checked then value R/K is used to adjust the whole image.</p>";

      self.enhancementsAdjustChannelsCheckBox = guitools.newCheckBox(parent, "Adjust channels,", par.enhancements_adjust_channels, enhancementsAdjustChannelsToolTip);
      self.enhancementsAdjustChannelR = guitools.newNumericEdit(parent, "R/K", par.enhancements_adjust_R, 0, 100, enhancementsAdjustChannelsToolTip);
      self.enhancementsAdjustChannelG = guitools.newNumericEdit(parent, "G", par.enhancements_adjust_G, 0, 100, enhancementsAdjustChannelsToolTip);
      self.enhancementsAdjustChannelB = guitools.newNumericEdit(parent, "B", par.enhancements_adjust_B, 0, 100, enhancementsAdjustChannelsToolTip);
      var enhancementsAdjustChannelR = self.enhancementsAdjustChannelR;
      var enhancementsAdjustChannelG = self.enhancementsAdjustChannelG;
      var enhancementsAdjustChannelB = self.enhancementsAdjustChannelB;

      self.enhancementsAdjustChannelDefaultsButton = new ToolButton(parent);
      self.enhancementsAdjustChannelDefaultsButton.icon = new Bitmap( ":/images/icons/reset.png" );
      self.enhancementsAdjustChannelDefaultsButton.toolTip = 
            "<p>Reset channel adjust values to defaults.</p>";
      self.enhancementsAdjustChannelDefaultsButton.onClick = function()
      {
            console.writeln("Reset channel adjust values to defaults.");
            par.enhancements_adjust_R.val = par.enhancements_adjust_R.def;
            par.enhancements_adjust_G.val = par.enhancements_adjust_G.def;
            par.enhancements_adjust_B.val = par.enhancements_adjust_B.def;
            enhancementsAdjustChannelR.setValue(par.enhancements_adjust_R.val);
            enhancementsAdjustChannelG.setValue(par.enhancements_adjust_G.val);
            enhancementsAdjustChannelB.setValue(par.enhancements_adjust_B.val);
      };
      self.enhancementsAdjustChannelsOnlyKCheckBox = guitools.newCheckBox(parent, "Only K", par.enhancements_adjust_channels_only_k, enhancementsAdjustChannelsToolTip);

      self.enhancementsAdjustChannelsSizer = new HorizontalSizer;
      self.enhancementsAdjustChannelsSizer.spacing = 4;
      // self.enhancementsAdjustChannelsSizer.margin = 2;
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelsCheckBox );
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelR );
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelG );
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelB );
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelsOnlyKCheckBox );
      self.enhancementsAdjustChannelsSizer.add( self.enhancementsAdjustChannelDefaultsButton );
      self.enhancementsAdjustChannelsSizer.addStretch();

      self.enhancements_SmallerStars_CheckBox = guitools.newCheckBox(parent, "Smaller stars", par.enhancements_smaller_stars, 
            "<p>Make stars smaller on image.</p>" );
      self.smallerStarsIterationsSpinBox = guitools.newSpinBox(parent, par.enhancements_smaller_stars_iterations, 0, 10, 
            "Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection");
      self.smallerStarsIterationsLabel = new Label( parent );
      self.smallerStarsIterationsLabel.text = "iterations";
      self.smallerStarsIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.smallerStarsIterationsLabel.toolTip = self.smallerStarsIterationsSpinBox.toolTip;
      self.enhancementsSmallerStarsSizer = new HorizontalSizer;
      self.enhancementsSmallerStarsSizer.spacing = 4;
      self.enhancementsSmallerStarsSizer.add( self.enhancements_SmallerStars_CheckBox );
      self.enhancementsSmallerStarsSizer.add( self.smallerStarsIterationsSpinBox );
      self.enhancementsSmallerStarsSizer.add( self.smallerStarsIterationsLabel );
      self.enhancementsSmallerStarsSizer.toolTip = self.smallerStarsIterationsSpinBox.toolTip;
      self.enhancementsSmallerStarsSizer.addStretch();

      var enhancements_noise_reduction_tooltip = "<p>Noise reduction on image.</p>" + guitools.noiseReductionToolTipCommon;
      self.enhancements_NoiseReduction_CheckBox = guitools.newCheckBox(parent, "Noise reduction", par.enhancements_noise_reduction, 
            enhancements_noise_reduction_tooltip);

      self.enhancementsNoiseReductionStrengthSizer = new HorizontalSizer;
      self.enhancementsNoiseReductionStrengthSizer.spacing = 4;
      self.enhancementsNoiseReductionStrengthSizer.add( self.enhancements_NoiseReduction_CheckBox );
      self.enhancementsNoiseReductionStrengthSizer.toolTip = enhancements_noise_reduction_tooltip;
      self.enhancementsNoiseReductionStrengthSizer.addStretch();

      self.enhancements_ACDNR_CheckBox = guitools.newCheckBox(parent, "ACDNR noise reduction", par.enhancements_ACDNR, 
            "<p>Run ACDNR noise reduction on image using a lightness mask.</p>"
#ifndef AUTOINTEGRATE_STANDALONE
            + "<p>StdDev value is taken from <i>Processing1 / noise reduction</i> section.</p>" + guitools.ACDNR_StdDev_tooltip
#endif
            );
      self.enhancements_color_noise_CheckBox = guitools.newCheckBox(parent, "Color noise reduction", par.enhancements_color_noise, 
            "<p>Run color noise reduction on image.</p>" );
      self.enhancements_star_noise_reduction_CheckBox = guitools.newCheckBox(parent, "Star noise reduction", par.enhancements_star_noise_reduction, 
            "<p>Run star noise reduction on star image.</p>" );
      self.enhancements_color_calibration_CheckBox = guitools.newCheckBox(parent, "Color calibration", par.enhancements_color_calibration, 
            "<p>Run ColorCalibration on image.</p>" );

#ifndef AUTOINTEGRATE_STANDALONE
      self.enhancements_solve_image_CheckBox = guitools.newCheckBox(parent, "Solve", par.enhancements_solve_image, 
            "<p>Solve image by running ImageSolver script.</p>" + 
            "<p>If image does not have correct coordinates or focal length embedded they can be given in <i>Postprocessing / Image solving</i> section.</p>");

      self.enhancements_solve_image_Button = new ToolButton( parent );
      self.enhancements_solve_image_Button.icon = parent.scaledResource(":/icons/select-file.png");
      self.enhancements_solve_image_Button.toolTip = "<p>Select file for copying astrometric solution to image.</p>";
      self.enhancements_solve_image_Button.setScaledFixedSize( 20, 20 );
      self.enhancements_solve_image_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            if (util.copyAstrometricSolutionFromFile(global.enhancements_target_image_id, ofd.fileName)) {
                  console.noteln("Astrometric solution copied from file: " + ofd.fileName);
            } else {
                  console.criticalln("Astrometric solution not copied from file: " + ofd.fileName);
            }
      };

      self.enhancements_annotate_image_CheckBox = guitools.newCheckBox(parent, "Annotate", par.enhancements_annotate_image, 
            "<p>Use AnnotateImage script to annotate image.</p>" + 
            "<p>Note that image must have a correct astrometric solution embedded for annotate to work. " + 
            "When using SPCC color calibration astrometric solution is automatically added.</p>" +
            "<p>When used with the Run or AutoContinue button a new image with _Annotated postfix is created.</p>");
      self.enhancements_annotate_scale_SpinBox = guitools.newSpinBox(parent, par.enhancements_annotate_image_scale, 1, 8, 
            "<p>Graphics scale for AnnotateImage script.</p>");

#endif // AUTOINTEGRATE_STANDALONE

      self.enhancementsClippedPixelsLabel = guitools.newLabel( parent, "Clipped", guitools.clippedPixelsToolTip);
      self.enhancementsSetClippedPixelsButton = new ToolButton( parent );
      self.enhancementsSetClippedPixelsButton.icon = parent.scaledResource(":/icons/clap.png");
      self.enhancementsSetClippedPixelsButton.toolTip = guitools.clippedPixelsToolTip;
      self.enhancementsSetClippedPixelsButton.setScaledFixedSize( 20, 20 );
      self.enhancementsSetClippedPixelsButton.onClick = function()
      {
            preview_control.showClippedImage();
      };

      var enhancements_sharpen_tooltip = "<p>Sharpening on image using a luminance mask.</p>" + 
                                    "<p>Number of iterations specifies how many times the sharpening is run.</p>" +
                                    "<p>If BlurXTerminator or GraXpert is used for sharpening then iterations parameter is ignored.</p>";
      self.enhancements_sharpen_CheckBox = guitools.newCheckBox(parent, "Sharpening", par.enhancements_sharpen, enhancements_sharpen_tooltip);

      self.enhancementsSharpenIterationsSpinBox = guitools.newSpinBox(parent, par.enhancements_sharpen_iterations, 1, 10, enhancements_sharpen_tooltip);
      self.enhancementsSharpenIterationsLabel = new Label( parent );
      self.enhancementsSharpenIterationsLabel.text = "iterations";
      self.enhancementsSharpenIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.enhancementsSharpenIterationsLabel.toolTip = enhancements_sharpen_tooltip;
      self.enhancementsSharpenIterationsSizer = new HorizontalSizer;
      self.enhancementsSharpenIterationsSizer.spacing = 4;
      self.enhancementsSharpenIterationsSizer.add( self.enhancements_sharpen_CheckBox );
      self.enhancementsSharpenIterationsSizer.add( self.enhancementsSharpenIterationsSpinBox );
      self.enhancementsSharpenIterationsSizer.add( self.enhancementsSharpenIterationsLabel );
      self.enhancementsSharpenIterationsSizer.toolTip = enhancements_sharpen_tooltip;
      self.enhancementsSharpenIterationsSizer.addStretch();

      var unsharpmask_tooltip = "Sharpen image using UnsharpMask and a luminance mask.";
      self.enhancements_unsharpmask_CheckBox = guitools.newCheckBox(parent, "UnsharpMask,", par.enhancements_unsharpmask, unsharpmask_tooltip);
      self.enhancementsUnsharpMaskStdDevEdit = guitools.newNumericEdit(parent, "StdDev", par.enhancements_unsharpmask_stddev, 0.1, 250, unsharpmask_tooltip);
      self.enhancementsUnsharpMaskAmountEdit = guitools.newNumericEdit(parent, "Amount", par.enhancements_unsharpmask_amount, 0.1, 1.00, unsharpmask_tooltip);
      self.enhancementsUnsharpMaskSizer = new HorizontalSizer;
      self.enhancementsUnsharpMaskSizer.spacing = 4;
      self.enhancementsUnsharpMaskSizer.add( self.enhancements_unsharpmask_CheckBox );
      self.enhancementsUnsharpMaskSizer.add( self.enhancementsUnsharpMaskStdDevEdit );
      self.enhancementsUnsharpMaskSizer.add( self.enhancementsUnsharpMaskAmountEdit );
      self.enhancementsUnsharpMaskSizer.addStretch();

      var highpass_sharpen_tooltip = "<p>Sharpen image using high pass filter and a luminance mask.</p>" +
                                          "<p>High pass sharpen should be used only for starless images.</p>";
      self.enhancements_highpass_sharpen_CheckBox = guitools.newCheckBox(parent, "High pass sharpen", par.enhancements_highpass_sharpen, highpass_sharpen_tooltip);
      self.enhancements_highpass_sharpen_ComboBox = guitools.newComboBox(parent, par.enhancements_highpass_sharpen_method, highpass_sharpen_values, 
            "<p>High pass sharpen type to sharpen the high pass image before combining it back to original image.</p>" +
            "<ul>" +
            "<li>Option 'Default' uses MultiscaleLinearTransform sharpening on high pass image. See below for settings.</li>" +
            "<li>Option 'MLT' uses MultiscaleLinearTransform sharpening on high pass image. " + 
#ifndef AUTOINTEGRATE_STANDALONE
            "Settings for iterations are taken from the <i>Enhancements / Generic enhancements</i> section <i>Sharpening</i> options." + 
#endif
            "</li>" +
            "<li>Option 'UnsharpMask' uses UnsharpMask on a high pass image. Settings are taken from the <i>Generic enhancements</i> section.</li>" +
            "<li>Option 'BlurXTerminator' uses BlurXTerminator on a high pass image." + 
#ifndef AUTOINTEGRATE_STANDALONE
            " Settings are taken from the <i>Tools / BlurXTerminator</i> section." + 
#endif
            "</li>" +
            "</ul>"
      );
      self.enhancements_highpass_sharpen_Label = guitools.newLabel(parent, "Layers", "<p>Number of layers used to blur the original image.</p>");
      self.enhancements_highpass_sharpen_SpinBox = guitools.newSpinBox(parent, par.enhancements_highpass_sharpen_layers, 1, 7, self.enhancements_highpass_sharpen_Label.toolTip);

      self.enhancementsHighPassSharpenSizer1 = new HorizontalSizer;
      self.enhancementsHighPassSharpenSizer1.spacing = 4;
      self.enhancementsHighPassSharpenSizer1.add( self.enhancements_highpass_sharpen_CheckBox );
      self.enhancementsHighPassSharpenSizer1.add( self.enhancements_highpass_sharpen_ComboBox );
      self.enhancementsHighPassSharpenSizer1.add( self.enhancements_highpass_sharpen_Label );
      self.enhancementsHighPassSharpenSizer1.add( self.enhancements_highpass_sharpen_SpinBox );
      self.enhancementsHighPassSharpenSizer1.addStretch();

      self.enhancements_highpass_sharpen_noise_reduction_CheckBox = guitools.newCheckBox(parent, "Noise reduction", par.enhancements_highpass_sharpen_noise_reduction, 
            "<p>Do noise reduction on high pass image before sharpening.</p>");
      self.enhancements_highpass_sharpen_keep_images_CheckBox = guitools.newCheckBox(parent, "Keep images", par.enhancements_highpass_sharpen_keep_images, 
            "<p>Do not delete low pass and high pass images.</p>");
      self.enhancements_highpass_sharpen_combine_only_CheckBox = guitools.newCheckBox(parent, "Combine only", par.enhancements_highpass_sharpen_combine_only, 
            "<p>Combine only high pass sharpened image with low pass image. Image is assumed to have a _lowpass or _highpass postfix.</p>");

      self.enhancementsHighPassSharpenSizer2 = new HorizontalSizer;
      self.enhancementsHighPassSharpenSizer2.spacing = 4;
      self.enhancementsHighPassSharpenSizer2.addSpacing(20);
      self.enhancementsHighPassSharpenSizer2.add( self.enhancements_highpass_sharpen_noise_reduction_CheckBox );
      self.enhancementsHighPassSharpenSizer2.add( self.enhancements_highpass_sharpen_keep_images_CheckBox );
      self.enhancementsHighPassSharpenSizer2.add( self.enhancements_highpass_sharpen_combine_only_CheckBox );
      self.enhancementsHighPassSharpenSizer2.addStretch();

      self.enhancementsHighPassSharpenSizer = new VerticalSizer;
      self.enhancementsHighPassSharpenSizer.spacing = 4;
      self.enhancementsHighPassSharpenSizer.add( self.enhancementsHighPassSharpenSizer1 );
      self.enhancementsHighPassSharpenSizer.add( self.enhancementsHighPassSharpenSizer2 );
      self.enhancementsHighPassSharpenSizer.addStretch();

      var enhancements_saturation_tooltip = "<p>Add saturation to the image using a luminance mask.</p>" + 
                                          "<p>Number of iterations specifies how many times add saturation is run.</p>";
      self.enhancements_saturation_CheckBox = guitools.newCheckBox(parent, "Saturation", par.enhancements_saturation, enhancements_saturation_tooltip);
      self.enhancements_less_saturation_CheckBox = guitools.newCheckBox(parent, "Less", par.enhancements_less_saturation, "If checked saturation is reduced instead of increased.");

      self.enhancementsSaturationIterationsSpinBox = guitools.newSpinBox(parent, par.enhancements_saturation_iterations, 1, 20, enhancements_saturation_tooltip);
      self.enhancementsSaturationIterationsLabel = new Label( parent );
      self.enhancementsSaturationIterationsLabel.text = "iterations";
      self.enhancementsSaturationIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.enhancementsSaturationIterationsLabel.toolTip = enhancements_saturation_tooltip;
      self.enhancementsSaturationIterationsSizer = new HorizontalSizer;
      self.enhancementsSaturationIterationsSizer.spacing = 4;
      self.enhancementsSaturationIterationsSizer.add( self.enhancements_saturation_CheckBox );
      self.enhancementsSaturationIterationsSizer.add( self.enhancementsSaturationIterationsSpinBox );
      self.enhancementsSaturationIterationsSizer.add( self.enhancementsSaturationIterationsLabel );
      self.enhancementsSaturationIterationsSizer.add( self.enhancements_less_saturation_CheckBox );
      self.enhancementsSaturationIterationsSizer.toolTip = enhancements_saturation_tooltip;
      self.enhancementsSaturationIterationsSizer.addStretch();

      var clarity_tooltip = "<p>Add clarity to the image using a luminance mask. Clarity is a local contrast enhancement.</p>" +
                              "<p>Clarity uses UnsharpMask process where stddev should be large and amount should be small.</p>" + 
                              "<p>If a mask is used then clarity is applied only to the light parts of the image.</p>";
      self.enhancements_clarity_CheckBox = guitools.newCheckBox(parent, "Clarity,", par.enhancements_clarity, clarity_tooltip);
      self.enhancementsClarityStdDevEdit = guitools.newNumericEdit(parent, "StdDev", par.enhancements_clarity_stddev, 0.1, 250, clarity_tooltip);
      self.enhancementsClarityAmountEdit = guitools.newNumericEdit(parent, "Amount", par.enhancements_clarity_amount, 0.1, 1.00, clarity_tooltip);
      self.enhancementsClarityMaskCheckBox = guitools.newCheckBox(parent, "Mask", par.enhancements_clarity_mask, clarity_tooltip);
      self.enhancementsClaritySizer = new HorizontalSizer;
      self.enhancementsClaritySizer.spacing = 4;
      self.enhancementsClaritySizer.add( self.enhancements_clarity_CheckBox );
      self.enhancementsClaritySizer.add( self.enhancementsClarityStdDevEdit );
      self.enhancementsClaritySizer.add( self.enhancementsClarityAmountEdit );
      self.enhancementsClaritySizer.add( self.enhancementsClarityMaskCheckBox );
      self.enhancementsClaritySizer.addStretch();


      self.enhancements_rotate_CheckBox = guitools.newCheckBox(parent, "Rotate", par.enhancements_rotate, 
            "<p>Rotate the image in clockwise direction.</p>" );
      self.enhancements_rotate_degrees_ComboBox = guitools.newComboBox(parent, par.enhancements_rotate_degrees, rotate_degrees_values, self.enhancements_rotate_CheckBox.toolTip);
      self.enhancements_image_no_copy_CheckBox = guitools.newCheckBox(parent, "No copy", par.enhancements_apply_no_copy_image, 
            "<p>Do not make a copy of the image for Apply.</p>" );

      self.enhancementsImageOptionsSizer1 = new HorizontalSizer;
      self.enhancementsImageOptionsSizer1.spacing = 4;
      self.enhancementsImageOptionsSizer1.add( self.enhancements_rotate_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_rotate_degrees_ComboBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_color_calibration_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_image_no_copy_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_force_new_mask_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_range_mask_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_auto_reset_CheckBox );
#ifndef AUTOINTEGRATE_STANDALONE
      self.enhancementsImageOptionsSizer1.add( self.enhancements_stretch_CheckBox );
      self.enhancementsImageOptionsSizer1.add( self.enhancements_autostf_CheckBox );
#endif // AUTOINTEGRATE_STANDALONE
      self.enhancementsImageOptionsSizer1.addStretch();

      self.enhancementsImageOptionsSizer2 = new HorizontalSizer;
      self.enhancementsImageOptionsSizer2.spacing = 4;
#ifndef AUTOINTEGRATE_STANDALONE
      self.enhancementsImageOptionsSizer2.add( self.enhancements_solve_image_CheckBox );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_solve_image_Button );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_annotate_image_CheckBox );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_annotate_scale_SpinBox );
#endif // AUTOINTEGRATE_STANDALONE
      self.enhancementsImageOptionsSizer2.add( self.enhancementsClippedPixelsLabel );
      self.enhancementsImageOptionsSizer2.add( self.enhancementsSetClippedPixelsButton );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_CheckBox );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_path_Edit );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_path_Button );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_scale_Label );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_scale_SpinBox );
      self.enhancementsImageOptionsSizer2.add( self.enhancements_signature_position_ComboBox );
      self.enhancementsImageOptionsSizer2.addStretch();

      self.enhancementsImageOptionsSizer = new VerticalSizer;
      self.enhancementsImageOptionsSizer.margin = 6;
      self.enhancementsImageOptionsSizer.spacing = 4;
      self.enhancementsImageOptionsSizer.add( self.enhancementsImageOptionsSizer1 );
      self.enhancementsImageOptionsSizer.add( self.enhancementsImageOptionsSizer2 );
      self.enhancementsImageOptionsSizer.addStretch();

      self.enhancements1 = new VerticalSizer;
      self.enhancements1.margin = 6;
      self.enhancements1.spacing = 4;
      self.enhancements1.add( self.enhancementsRemoveStars_Sizer );
      self.enhancements1.add( self.enhancementsFixStarCores_CheckBox );
      self.enhancements1.add( self.enhancementsRGBHamapping_CheckBox );
      self.enhancements1.add( self.enhancements_smoothBackground_Sizer );
      self.enhancements1.add( self.enhancementsBandinReduction_CheckBox );
      self.enhancements1.add( self.enhancements_backgroundneutralization_CheckBox );
      self.enhancements1.add( self.enhancements_GC_Sizer );
      self.enhancements1.add( self.enhancements_shadowclip_Sizer );
      self.enhancements1.add( self.enhancementsDarkerBackground_CheckBox );
      self.enhancements1.add( self.enhancementsDarkerHighlights_CheckBox );
      self.enhancements1.add( self.enhancementsEnhanceShadowsSizer );
      self.enhancements1.add( self.enhancementsEnhanceHighlightsSizer );
      self.enhancements1.add( self.enhancementsGammaSizer );
      self.enhancements1.add( self.enhancementsNormalizeChannelsSizer );
      self.enhancements1.add( self.enhancementsAdjustChannelsSizer );
      self.enhancements1.add( self.enhancements_ET_Sizer );
      self.enhancements1.add( self.enhancements_HDRMLT_Sizer );

      self.enhancements1.addStretch();

      self.enhancements2 = new VerticalSizer;
      self.enhancements2.margin = 6;
      self.enhancements2.spacing = 4;
      self.enhancements2.add( self.enhancements_LHE_sizer );
      self.enhancements2.add( self.enhancementsContrastSizer );
      self.enhancements2.add( self.enhancementsAutoContrastSizer );
      self.enhancements2.add( self.enhancementsNoiseReductionStrengthSizer );
      self.enhancements2.add( self.enhancements_ACDNR_CheckBox );
      self.enhancements2.add( self.enhancements_color_noise_CheckBox );
      self.enhancements2.add( self.enhancements_star_noise_reduction_CheckBox );
      self.enhancements2.add( self.enhancementsUnsharpMaskSizer );
      self.enhancements2.add( self.enhancementsSharpenIterationsSizer );
      self.enhancements2.add( self.enhancementsHighPassSharpenSizer );
      self.enhancements2.add( self.enhancementsSaturationIterationsSizer );
      self.enhancements2.add( self.enhancementsClaritySizer );
      self.enhancements2.add( self.enhancementsSmallerStarsSizer );
      self.enhancements2.add( self.enhancementsCombineStars_Sizer );
      self.enhancements2.addStretch();

      self.enhancementsGroupBoxSizer = new HorizontalSizer;
      //self.enhancementsGroupBoxSizer.margin = 6;
      //self.enhancementsGroupBoxSizer.spacing = 4;
      self.enhancementsGroupBoxSizer.add( self.enhancements1 );
      self.enhancementsGroupBoxSizer.add( self.enhancements2 );
      self.enhancementsGroupBoxSizer.addStretch();

      self.targetOptionsControl = new Control( parent );
      self.targetOptionsControl.sizer = new VerticalSizer;
      self.targetOptionsControl.sizer.margin = 6;
      self.targetOptionsControl.sizer.spacing = 4;
      self.targetOptionsControl.sizer.add( self.enhancementsImageOptionsSizer );
      self.targetOptionsControl.sizer.addStretch();
      self.targetOptionsControl.visible = false;

      self.genericControl = new Control( parent );
      self.genericControl.sizer = new VerticalSizer;
      self.genericControl.sizer.margin = 6;
      self.genericControl.sizer.spacing = 4;
      self.genericControl.sizer.add( self.enhancementsGroupBoxSizer );
      self.genericControl.sizer.addStretch();
      self.genericControl.visible = true;

      self.narrowbandControl = new Control( parent );
      self.narrowbandControl.sizer = new VerticalSizer;
      self.narrowbandControl.sizer.margin = 6;
      self.narrowbandControl.sizer.spacing = 4;
      self.narrowbandControl.sizer.add( self.narrowbandEnhancementsOptionsSizer );
      self.narrowbandControl.sizer.addStretch();
      self.narrowbandControl.visible = false;

      self.narrowbandColorizationControl = new Control( parent );
      self.narrowbandColorizationControl.sizer = new VerticalSizer;
      self.narrowbandColorizationControl.sizer.margin = 6;
      self.narrowbandColorizationControl.sizer.spacing = 4;
      self.narrowbandColorizationControl.sizer.add( self.narrowbandColorized_sizer );
      self.narrowbandColorizationControl.sizer.addStretch();
      self.narrowbandColorizationControl.visible = false;
}

function createTargetImageSizer(parent)
{
      if (global.debug) console.writeln("createTargetImageSizer");

      self.enhancementsImageLabel = new Label( parent );
      self.enhancementsImageLabel.text = "Target image";
      self.enhancementsImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      self.enhancementsImageLabel.toolTip = "<p>Target image for editing. By default edits are applied on a copy of the target image. Copied " + 
            "is named as <target image>_edit.</p>" +
            "<p>Auto option is used when enhancements are done with Run or AutoContinue option.</p>";
      self.enhancementsImageComboBox = new ComboBox( parent );
      var minItemCharWidthStr = "testxyz_Integration_RGB_processed_12"; // long name to have enough width for image names
      self.enhancementsImageComboBox.minItemCharWidth = minItemCharWidthStr.length;
      self.enhancementsImageComboBox.onItemSelected = function( itemIndex )
      {
            if (global.enhancements_target_image_id == enhancements_target_image_window_list[itemIndex]) {
                  return;
            }
            if (global.debug) console.writeln("enhancementsImageComboBox:selected target image index: " + itemIndex);
            close_undo_images();
            global.enhancements_target_image_id = enhancements_target_image_window_list[itemIndex];
            if (global.debug) console.writeln("global.enhancements_target_image_id " + global.enhancements_target_image_id);
            if (global.enhancements_target_image_id == "Auto" || global.enhancements_target_image_id == null) {
                  preview.updatePreviewNoImage();
                  enhancements_gui_info.save_button.enabled = false;
            } else {
                  preview.setPreviewIdReset(global.enhancements_target_image_id, false);
                  enhancements_gui_info.save_button.enabled = true;
            }
      };
      enhancements_gui_info.images_combobox = self.enhancementsImageComboBox;

      update_enhancements_target_image_window_list(null);

      if (enhancements_target_image_window_list.length == 0 ||
          enhancements_target_image_window_list[0] == "Auto" ) 
      {
            global.enhancements_target_image_id = null;
            preview.updatePreviewNoImage();
      } else {
            global.enhancements_target_image_id = enhancements_target_image_window_list[0];
            preview.setPreviewIdReset(global.enhancements_target_image_id, false);
      }

      self.enhancementsLoadTargetImageButton = new ToolButton( parent );
      self.enhancementsLoadTargetImageButton.icon = parent.scaledResource(":/icons/select-file.png");
      self.enhancementsLoadTargetImageButton.toolTip = "<p>Select file as target image.</p>";
      self.enhancementsLoadTargetImageButton.setScaledFixedSize( 20, 20 );
      self.enhancementsLoadTargetImageButton.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  console.writeln("No file selected.");
                  return;
            }
            var imageWindows = ImageWindow.open(ofd.fileName);
            if (imageWindows == null || imageWindows.length == 0) {
                  console.criticalln("Could not open image " + ofd.fileName);
                  return;
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  console.criticalln("Could not open image " + ofd.fileName);
                  return;
            }
            imageWindow.show();
            console.writeln("Opened image " + ofd.fileName);
            close_undo_images();
            console.writeln("updatePreviewWinTxt");
            preview.updatePreviewWinTxt(imageWindow, File.extractName(ofd.fileName) + File.extractExtension(ofd.fileName));
            console.writeln("util.updateStatusInfoLabel");
            util.updateStatusInfoLabel("Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height);
            global.enhancements_target_image_id = imageWindow.mainView.id;
            console.writeln("global.enhancements_target_image_id " + global.enhancements_target_image_id);
            enhancements_gui_info.save_button.enabled = true;
            update_enhancements_target_image_window_list(global.enhancements_target_image_id);
      };

      var notetsaved_note = "<p>Note that edited image is not automatically saved to disk.</p>";
      self.enhancementsApplyButton = new PushButton( parent );
      self.enhancementsApplyButton.text = "Apply";
      self.enhancementsApplyButton.toolTip = 
            "<p>Apply enhancements edits on the copy of the selected image. Auto option is used when enhancements are done with Run or AutoContinue option.</p>" +
            notetsaved_note;
      self.enhancementsApplyButton.onClick = function()
      {
            if (global.enhancements_target_image_id == null) {
                  console.criticalln("No target image selected!");
            } else if (!util.is_enhancements_option() && !util.is_narrowband_option()) {
                  console.criticalln("No enhancements option selected!");
            } else if (global.enhancements_target_image_id == null) {
                  console.criticalln("No image!");
            } else if (global.enhancements_target_image_id == "Auto") {
                  console.criticalln("Auto target image cannot be used with Apply button!");
            } else if (util.findWindow(global.enhancements_target_image_id) == null) {
                  console.criticalln("Could not find target image " + global.enhancements_target_image_id);
            } else {
                  if (enhancements_gui_info.undo_images.length == 0) {
                        global.enhancements_info = [];   // First image, clear enhancements info
                        var saved_enhancements_target_image = global.enhancements_target_image_id;
                        if (!par.enhancements_apply_no_copy_image.val) {
                              // make copy of the original image
                              global.enhancements_target_image_id = copy_new_edit_image(global.enhancements_target_image_id);
                        }
                        var first_undo_image = create_undo_image(global.enhancements_target_image_id);
                        var first_undo_image_histogramInfo = global.enhancements_target_histogram_info;
                  } else {
                        var first_undo_image = null;
                  }
                  console.writeln("Apply enhancements edits on " + global.enhancements_target_image_id);
                  let apply_ok = false;
                  try {
                        engine.enhancementsApply = true;
                        global.haveIconized = 0;

                        engine.enhancementsProcessingEngine(parent.dialog, global.enhancements_target_image_id, util.is_narrowband_option());

                        if (enhancements_gui_info.undo_images.length == 0) {
                              // add first/original undo image
                              add_undo_image(first_undo_image, first_undo_image_histogramInfo);
                              // save copy of original image to the window list and make is current
                              update_enhancements_target_image_window_list(global.enhancements_target_image_id);
                        }
                        let undo_image = create_undo_image(global.enhancements_target_image_id);
                        add_undo_image(undo_image, global.enhancements_target_histogram_info);
#ifdef AUTOINTEGRATE_STANDALONE
                        preview.updatePreviewIdReset(global.enhancements_target_image_id);
#endif
                        console.noteln("Apply completed (" + enhancements_gui_info.undo_images.length + "/" + enhancements_gui_info.undo_images.length + ")");
                        apply_ok = true;
                  } 
                  catch(err) {
                        if (first_undo_image != null) {
                              global.enhancements_target_image_id = saved_enhancements_target_image;
                        }
                        console.criticalln(err);
                        console.criticalln("Operation failed!");
                  }
                  engine.enhancementsApply = false;
                  util.runGarbageCollection();
                  if (self.apply_completed_callback != null) {
                        self.apply_completed_callback(apply_ok);
                  }
            }
      };   

      self.enhancementsUndoButton = new ToolButton( parent );
      self.enhancementsUndoButton.icon = new Bitmap( ":/icons/undo.png" );
      self.enhancementsUndoButton.toolTip = 
            "<p>Undo last enhancements edit operation.</p>" + notetsaved_note;
      self.enhancementsUndoButton.enabled = false;
      self.enhancementsUndoButton.onClick = function()
      {
            apply_undo();
      };
      enhancements_gui_info.undo_button = self.enhancementsUndoButton;

      self.enhancementsRedoButton = new ToolButton( parent );
      self.enhancementsRedoButton.icon = new Bitmap( ":/icons/redo.png" );
      self.enhancementsRedoButton.toolTip = 
            "<p>Redo last enhancements edit operation.</p>" + notetsaved_note;
      self.enhancementsRedoButton.enabled = false;
      self.enhancementsRedoButton.onClick = function()
      {
            apply_redo();
      };
      enhancements_gui_info.redo_button = self.enhancementsRedoButton;

      self.enhancementsSaveButton = new ToolButton( parent );
      self.enhancementsSaveButton.icon = new Bitmap( ":/icons/save-as.png" );
      self.enhancementsSaveButton.toolTip = 
            "<p>Save current edited image to disk as a XISF image and as a 16-bit TIFF image.</p>" + notetsaved_note;
      self.enhancementsSaveButton.enabled = false;
      self.enhancementsSaveButton.onClick = function()
      {
            save_as_undo();
      };
      enhancements_gui_info.save_button = self.enhancementsSaveButton;

      self.enhancementsHistoryButton = new ToolButton( parent );
      self.enhancementsHistoryButton.icon = new Bitmap( ":/history-explorer/history-explorer-window-icon.png" );
      self.enhancementsHistoryButton.toolTip = "<p>Show enhancements history.</p>";
      self.enhancementsHistoryButton.enabled = true;
      self.enhancementsHistoryButton.onClick = function()
      {
            if (enhancements_gui_info.undo_images.length <= 1) {
                  new MessageBox("No enhancements history", "Enhancements history", StdIcon_Information ).execute();
            } else {
                  var txt = "<p>Applied enhancements:</p><ul>";
                  for (var i = 1; i <= enhancements_gui_info.undo_images_pos; i++) {
                        for (var j = 0; j < enhancements_gui_info.undo_images[i].enhancements_info.length; j++) {
                              txt += "<li>" + enhancements_gui_info.undo_images[i].enhancements_info[j] + "</li>";
                        }
                  }
                  txt += "</ul>";
                  if (i < enhancements_gui_info.undo_images.length) {
                        txt += "<p><i>Not applied enhancements:</i></p><ul>";
                        for (; i < enhancements_gui_info.undo_images.length; i++) {
                              for (var j = 0; j < enhancements_gui_info.undo_images[i].enhancements_info.length; j++) {
                                    txt += "<li><i>" + enhancements_gui_info.undo_images[i].enhancements_info[j] + "</i></li>";
                              }
                        }
                        txt += "</ul>";
                  }
                  new MessageBox(txt, "Enhancements history", StdIcon_Information ).execute();
            }
      };
      self.metadataHistoryButton = new ToolButton(parent);
      self.metadataHistoryButton.icon = new Bitmap( ":/icons/document-edit.png" ); // :/toolbar/file-project-metadata.png
      self.metadataHistoryButton.toolTip = "<p>Print AutoIntegrate processing history information from image metadata to the Process Console.</p>";
      self.metadataHistoryButton.onClick = function()
      {
            var win = util.findWindow(global.enhancements_target_image_id);
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
                  if (history.enhancements.length > 0) {
                        console.noteln("Enhancements info:");
                        for (var i = 0; i < history.enhancements.length; i++) {
                              console.writeln(" - "  + history.enhancements[i][1]);
                        }
                  }

            } else {
                  console.noteln("No AutoIntegrate processing history");
            }
      };

#ifdef AUTOINTEGRATE_STANDALONE
      var enhancementsLabeltoolTip = 
            "<p>" +
            "This dialog is used to apply different enhancements on the selected image. " +
            "A new image is created with a number added to the name, original image is not modified. " +
            "Undo and redo button can be used to check the effects of enhancements. " +
            "</p>" +
            "<ul>" +
            "<li>Choose target image.</li>" + 
            "<li>Select enhancement.</li>" + 
            "<li>Click Apply.</li>" + 
            "</ul>";
#else
      var enhancementsLabeltoolTip = 
            "<p>" +
            "In case of Run or AutoContinue " + 
            "enhancements options are always applied to a copy of the final image. " + 
            "A new image is created with _enh added to the name. " + 
            "For example if the final image is AutoLRGB then a new image AutoLRGB_enh is created. " + 
            "AutoContinue can be used to apply enhancements after the final image is created. " +
            "</p><p>" +
            "In the case of the Apply button enhancements are run directly on the selected image. " +
            "The apply button can be used to execute enhancements options one by one in custom order." +
            "</p><p>" +
            "Both enhancements options and narrowband processing options are applied to the image. If some of the " +
            "narrowband options are selected then the image is assumed to be narrowband." +
            "</p><p>" +
            "If multiple enhancements options are selected they are executed in the order they are listed in the dialog." + 
            "</p>" +
            "<p>" +
            "If narrowband processing options are selected they are applied before enhancements options." +
            "</p>";
#endif // AUTOINTEGRATE_STANDALONE

      self.enhancementsHelpTips = new ToolButton( parent );
      self.enhancementsHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      self.enhancementsHelpTips.setScaledFixedSize( 20, 20 );
      self.enhancementsHelpTips.toolTip = enhancementsLabeltoolTip;
      self.enhancementsHelpTips.onClick = function()
      {
            new MessageBox(enhancementsLabeltoolTip, "Enhancements", StdIcon_Information ).execute();
      }

      self.enhancementsImageSizer = new HorizontalSizer;
      self.enhancementsImageSizer.margin = 6;
      self.enhancementsImageSizer.spacing = 4;
      self.enhancementsImageSizer.add( self.enhancementsImageLabel );
      self.enhancementsImageSizer.add( self.enhancementsImageComboBox );
      self.enhancementsImageSizer.add( self.enhancementsLoadTargetImageButton );
      self.enhancementsImageSizer.add( self.enhancementsApplyButton );
      self.enhancementsImageSizer.add( self.enhancementsUndoButton );
      self.enhancementsImageSizer.add( self.enhancementsRedoButton );
      self.enhancementsImageSizer.add( self.enhancementsHistoryButton );
      self.enhancementsImageSizer.add( self.enhancementsSaveButton );
      self.enhancementsImageSizer.addStretch();
      self.enhancementsImageSizer.add( self.metadataHistoryButton );
      self.enhancementsImageSizer.add( self.enhancementsHelpTips );

      return self.enhancementsImageSizer;
}

function createEnhancementsGUIControls(parent)
{
      self.enhancementsImageSizer = createTargetImageSizer(parent);

      self.targetImageControl = new Control( parent );
      self.targetImageControl.sizer = new VerticalSizer;
      self.targetImageControl.sizer.margin = 6;
      self.targetImageControl.sizer.spacing = 4;
      self.targetImageControl.sizer.add( self.enhancementsImageSizer );
      self.targetImageControl.sizer.addStretch();
      self.targetImageControl.visible = true;

      createEnhancementsControls(parent);

      return {
             targetImageControl: self.targetImageControl, 
             optionsControl: self.targetOptionsControl, 
             genericControl: self.genericControl, 
             narrowbandControl: self.narrowbandControl, 
             narrowbandColorizationControl: self.narrowbandColorizationControl 
      };
}

this.createTargetImageSizer = createTargetImageSizer;
this.createEnhancementsGUIControls = createEnhancementsGUIControls;

this.update_enhancements_target_image_window_list = update_enhancements_target_image_window_list;
this.close_undo_images = close_undo_images;
this.setPreviewControl = setPreviewControl;

}

AutoIntegrateEnhancementsGUI.prototype = new Object;

#endif // AUTOINTEGRATE_ENHANCEMENTS_GUI_JS
