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

#include "AutoIntegrateSelectiveColor.js"

class AutoIntegrateSelectStarsImageDialog extends Dialog
{
    constructor(util) {
        super();

      this.util = util;
      this.restyle();
   
      this.labelWidth = this.font.width( "Object identifier:M" );
      this.editWidth = this.font.width( 'M' )*40;

      this.starsImageLabel = new Label( this );
      this.starsImageLabel.text = "Select stars image:"
   
      this.starsImageComboBox = new ComboBox( this );
      this.starsImageComboBox.minItemCharWidth = 20;

      this.window_list = this.util.getWindowListReverse();
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
      this.ensureLayoutUpdated();
      this.adjustToContents();
} // constructor
}

class AutoIntegrateHueColors extends Frame
{
      constructor(par) {
            super();

      this.par = par;
      this.hueColorsBitmap = new Bitmap( File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ ) + "/hue.png" );

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
            this.drawHueLine(graphics, bmp_startpos, bmp_width, height, this.par.narrowband_colorized_R_hue.val);
            this.drawHueLine(graphics, bmp_startpos, bmp_width, height, this.par.narrowband_colorized_G_hue.val);
            this.drawHueLine(graphics, bmp_startpos, bmp_width, height, this.par.narrowband_colorized_B_hue.val);
            graphics.end();
      }
      } // constructor

      drawHueLine(g, bmp_startpos, bmp_width, bmp_height, hue)
      {
            // console.writeln("drawHueLine " + hue + " " + bmp_startpos + " " + bmp_width + " " + bmp_height);
            var line_x = bmp_startpos + hue * bmp_width;
            g.drawLine(line_x, 0, line_x, bmp_height);
      }
}

class AutoIntegrateEnhancementsGUI extends Object
{
    constructor(parent, guitools, util, global, engine, preview) {
        super();

if (global.debug) console.writeln("AutoIntegrateEnhancementsGUI: constructor");

this.parent = parent;
this.guitools = guitools;
this.util = util;
this.global = global;
this.engine = engine;
this.preview = preview;

this.par = global.par;
this.ppar = global.ppar;

this.apply_completed_callback = null;
this.target_image_selected_callback = null;

this.Foraxx_palette_values = [ 'SHO', 'HOO' ];

this.enhancements_gui_info = { 
      undo_images: [],        // undo_images[0] == original image, { image: <Image>, keywords: <image keywords>, histogramInfo: <see getHistogramInfo>, enhancements_info: [] }, see add_undo_image
      undo_images_pos: -1, 
      undo_button: null, 
      redo_button: null, 
      images_combobox: null,
      save_button: null
};

this.enhancements_target_image_window_list = [];
this.preview_control = null;

this.adjust_type_values = [ 'Lights', 'Darks', 'All' ];
this.star_reduce_methods = [ 'None', 'Transfer', 'Halo', 'Star' ];
this.normalize_channels_reference_values = [ 'R', 'G', 'B' ];
this.rotate_degrees_values = [ '90', '180', '-90' ];

this.colorized_narrowband_preset_values = [ 'Default', 'North America', 'Eagle' ];
this.narrowband_colorized_mapping_values = [ 'RGB', 'GRB', 'GBR', 'BRG', 'BGR', 'RBG' ];
this.narrowband_colorized_combine_values = [ 'Channels', 'Screen', 'Sum', 'Mean', 'Max', 'Median' ];
this.narrowband_colorized_method_values = [ 'PixelMath' ];
this.signature_positions_values = [ 'Top left', 'Top middle', 'Top right', 'Bottom left', 'Bottom middle', 'Bottom right' ];
this.highpass_sharpen_values = [ 'Default', 'MLT', 'UnsharpMask', 'BlurXTerminator', 'None' ];
this.enhancements_HDRMLT_color_values = [ 'None', 'Preserve hue', 'Color corrected' ];

} // constructor

update_enhancements_target_image_window_list(current_item)
{
      var combobox = this.enhancements_gui_info.images_combobox;

      if (current_item == null && this.enhancements_target_image_window_list.length > 0) {
            // use item from dialog
            current_item = this.enhancements_target_image_window_list[combobox.currentItem];
      }

      this.enhancements_target_image_window_list = this.util.getWindowListReverse();
#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements_target_image_window_list.unshift("Auto");
#endif

      combobox.clear();
      for (var i = 0; i < this.enhancements_target_image_window_list.length; i++) {
            combobox.addItem( this.enhancements_target_image_window_list[i] );
      }

      // update dialog
      if (current_item)  {
            combobox.currentItem = this.enhancements_target_image_window_list.indexOf(current_item);
            if (!combobox.currentItem) {
                  combobox.currentItem = 0;
            }
            if (this.enhancements_target_image_window_list 
                && this.enhancements_target_image_window_list.length > 0
                && this.enhancements_target_image_window_list[combobox.currentItem]) 
            {
                  combobox.setItemText(combobox.currentItem, this.enhancements_target_image_window_list[combobox.currentItem]);
            }
      }

      return this.enhancements_target_image_window_list;
}

setPreviewControl(control)
{
      this.preview_control = control;
      this.guitools.preview_control = control;
}

update_undo_buttons()
{
      this.enhancements_gui_info.undo_button.enabled = this.enhancements_gui_info.undo_images.length > 0 && this.enhancements_gui_info.undo_images_pos > 0;
      this.enhancements_gui_info.redo_button.enabled = this.enhancements_gui_info.undo_images.length > 0 && this.enhancements_gui_info.undo_images_pos < this.enhancements_gui_info.undo_images.length - 1;
}

getNumberAfterUnderscore(str) 
{
      const match = /_(\d+)$/.exec(str);
      return match ? parseInt(match[1], 10) : 0;
}

removeUnderscoreNumber(str) 
{
      return str.replace(/_\d+$/, '');
}
copy_new_edit_image(id)
{
      var copy_id = null;

      // Get edit count from file name
      var id_editcount = this.getNumberAfterUnderscore(id);
      if (this.global.debug) console.writeln("copy_new_edit_image:id_editcount " + id_editcount);
      
      // Get edit count from image metadata
      var win = ImageWindow.windowById(id);
      id = this.util.getBaseWindowId(win);
      var editcount = this.util.getKeywordValue(win, "AutoIntegrateEditCount");
      if (editcount == null) {
            editcount = 0;
      } else {
            editcount = parseInt(editcount);
      }
      if (this.global.debug) console.writeln("copy_new_edit_image:editcount " + editcount);

      if (id_editcount > 0) {
            // Check if next number is available
            var basename = this.removeUnderscoreNumber(id);
            if (this.global.debug) console.writeln("copy_new_edit_image:basename " + basename);
            var next_id = basename + "_" + (id_editcount + 1).toString();
            if (this.global.debug) console.writeln("copy_new_edit_image:next_id " + next_id);
            if (this.util.findWindow(next_id) == null) {
                  // Next id is free, use it
                  copy_id = next_id;
            }
      }
      if (copy_id == null) {
            // Next number used, create a new subversion
            // Try to find first free number
            for (var id_editcount = 1; ; id_editcount++) {
                  var next_id = id + "_" + id_editcount.toString();
                  if (this.util.findWindow(next_id) == null) {
                        copy_id = next_id;
                        break;
                  }
            }
      }
      var copy_win = this.util.copyWindowEx(win, copy_id, true);
      if (this.global.debug) console.writeln("Copy image " + copy_win.mainView.id);
      this.util.setFITSKeyword(
            copy_win, 
            "AutoIntegrateEditCount", 
            (editcount + 1).toString(), 
            "AutoIntegrate image edit count");
      return copy_win.mainView.id;
}

print_enhancements_info(txt, info)
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

create_undo_image(id)
{
      var undo_win = ImageWindow.windowById(id);
      return { image: new Image( undo_win.mainView.image ), keywords: this.util.copyKeywords(undo_win) };
}

add_undo_image(undo_image, histogramInfo)
{
      //console.writeln("add_undo_image");
      while (this.enhancements_gui_info.undo_images.length > this.enhancements_gui_info.undo_images_pos + 1) {
            this.enhancements_gui_info.undo_images.pop();
            console.writeln("Remove undo image " + this.enhancements_gui_info.undo_images.length);
      }
      this.enhancements_gui_info.undo_images_pos++;
      // console.writeln("undo_images_pos " + this.enhancements_gui_info.undo_images_pos);
      this.enhancements_gui_info.undo_images[this.enhancements_gui_info.undo_images_pos] = 
            { 
                  image: undo_image.image, 
                  keywords: undo_image.keywords,
                  histogramInfo: histogramInfo, 
                  enhancements_info: this.global.enhancements_info.concat() 
            };

      this.update_undo_buttons();

      this.print_enhancements_info("Applied enhancements:", this.global.enhancements_info);
}

apply_undo()
{
      console.writeln("apply_undo");
      if (this.global.enhancements_target_image_id == null || this.global.enhancements_target_image_id == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (this.enhancements_gui_info.undo_images_pos <= 0) {
            console.noteln("Nothing to undo");
            return;
      }
      console.noteln("Undo on image " + this.global.enhancements_target_image_id + " (" + this.enhancements_gui_info.undo_images_pos + "/" + this.enhancements_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(this.global.enhancements_target_image_id);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + this.global.enhancements_target_image_id);
            return;
      }
      let undo_pos = this.enhancements_gui_info.undo_images_pos - 1;
      let source_image = this.enhancements_gui_info.undo_images[undo_pos].image;
      let source_keywords = this.enhancements_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = this.enhancements_gui_info.undo_images[undo_pos].histogramInfo;
      let source_enhancements_info = this.enhancements_gui_info.undo_images[undo_pos].enhancements_info;

      target_win.mainView.beginProcess(UndoFlag.NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      this.print_enhancements_info("Undo enhancements:", this.global.enhancements_info);

      target_win.keywords = source_keywords;
      this.global.enhancements_info = source_enhancements_info;

      this.preview.updatePreviewIdReset(this.global.enhancements_target_image_id, true, source_histogramInfo);

      this.enhancements_gui_info.undo_images_pos--;
      console.writeln("undo_images_pos " + this.enhancements_gui_info.undo_images_pos);
      this.update_undo_buttons();
}

apply_redo()
{
      console.writeln("apply_redo");
      if (this.global.enhancements_target_image_id == null || this.global.enhancements_target_image_id == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (this.enhancements_gui_info.undo_images_pos >= this.enhancements_gui_info.undo_images.length - 1) {
            console.noteln("Nothing to redo");
            return;
      }
      console.noteln("Redo on image " + this.global.enhancements_target_image_id + " (" + (this.enhancements_gui_info.undo_images_pos + 2) + "/" + this.enhancements_gui_info.undo_images.length + ")");
      var target_win = ImageWindow.windowById(this.global.enhancements_target_image_id);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + this.global.enhancements_target_image_id);
            return;
      }
      let undo_pos = this.enhancements_gui_info.undo_images_pos + 1;
      let source_image = this.enhancements_gui_info.undo_images[undo_pos].image;
      let source_keywords = this.enhancements_gui_info.undo_images[undo_pos].keywords;
      let source_histogramInfo = this.enhancements_gui_info.undo_images[undo_pos].histogramInfo;
      let source_enhancements_info = this.enhancements_gui_info.undo_images[undo_pos].enhancements_info;

      target_win.mainView.beginProcess(UndoFlag.NoSwapFile);
      target_win.mainView.image.assign( source_image );
      target_win.mainView.endProcess();

      target_win.keywords = source_keywords;
      this.global.enhancements_info = source_enhancements_info;
      
      this.preview.updatePreviewIdReset(this.global.enhancements_target_image_id, true, source_histogramInfo);
      
      this.enhancements_gui_info.undo_images_pos++;
      console.writeln("undo_images_pos " + this.enhancements_gui_info.undo_images_pos);
      this.update_undo_buttons();

      this.print_enhancements_info("Redo enhancements:", this.global.enhancements_info);
}

save_as_undo()
{
      console.writeln("Save image as XISF and TIFF");
      if (this.global.enhancements_target_image_id == null || this.global.enhancements_target_image_id == "Auto") {
            console.criticalln("No target image!");
            return;
      }

      let saveFileDialog = new SaveFileDialog();
      saveFileDialog.caption = "Save As XISF and TIFF";
      if (this.global.outputRootDir == "") {
            var path = this.ppar.lastDir;
      } else {
            var path = this.global.outputRootDir;
      }
      if (path != "") {
            path = this.util.ensurePathEndSlash(path);
      }

      saveFileDialog.initialPath = path + this.global.enhancements_target_image_id + ".xisf";
      if (!saveFileDialog.execute()) {
            console.noteln("Image " + this.global.enhancements_target_image_id + " not saved");
            return;
      }
      var save_dir = File.extractDrive(saveFileDialog.fileName) + File.extractDirectory(saveFileDialog.fileName);
      var save_id = File.extractName(saveFileDialog.fileName);
      var save_win = ImageWindow.windowById(this.global.enhancements_target_image_id);

      /* Save as 16 bit TIFF.
      */
      var copy_win = this.util.copyWindow(save_win, this.util.ensure_win_prefix(save_win.mainView.id + "_savetmp"));
      if (copy_win.bitsPerSample != 16) {
            console.writeln("saveFinalImageWindow:set bits to 16");
            copy_win.setSampleFormat(16, false);
      }
      var filename = this.util.ensurePathEndSlash(save_dir) + save_id + ".tif";
      console.noteln("Save " + this.global.enhancements_target_image_id + " as " + filename);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(filename, false, false, false, false)) {
            this.util.throwFatalError("Failed to save image: " + filename);
      }
      this.util.closeOneWindow(copy_win);

      /* Save as XISF.
      */
      var filename = this.util.ensurePathEndSlash(save_dir) + save_id + ".xisf";
      console.noteln("Save " + this.global.enhancements_target_image_id + " as " + filename);
      // Save image. No format options, no warning messages,
      // no strict mode, no overwrite checks.
      if (!save_win.saveAs(filename, false, false, false, false)) {
            this.util.throwFatalError("Failed to save image: " + filename);
      }

      this.util.saveLastDir(save_dir);
      this.update_undo_buttons();

      if (save_id != this.global.enhancements_target_image_id) {
            // Rename old image
            save_win.mainView.id = save_id;
            // Update this.preview name
            this.preview.updatePreviewTxt(save_win);
            // Update target list
            this.update_enhancements_target_image_window_list(save_id);
      }
}

close_undo_images(at_exit = false)
{
      if (this.enhancements_gui_info.undo_images.length > 0) {
            console.writeln("Close undo images");
            this.enhancements_gui_info.undo_images = [];
            this.enhancements_gui_info.undo_images_pos = -1;
            if (!at_exit) {
                  this.update_undo_buttons();
            }
      }
}

createEnhancementsControls(parent)
{
      // Foraxx mapping
      this.narrowband_Foraxx_CheckBox = this.guitools.newCheckBox(parent, "Foraxx mapping", this.par.run_foraxx_mapping, 
            "<p>Use dynamic Foraxx palette on image.</p>" +
            "<p>Foraxx mapping can be done on a SHO or HOO image. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a dynamic Foraxx palette image.</p>" +
            "<p>After Foraxx SHO mapping <i>Remove green cast</i> and <i>Orange/blue colors</i> are run for the image.</p>" +
            "<p>To run basic Foraxx SHO mapping use <i>SHO mapping</i> and select <i>Dynamic SHO</i>.</p>" +
            "<p>To run Foraxx palette during the normal processing you need to select Dynamic narrowband palette like Dynamic SHO and " +
            "check the option <i>Narrowband mapping using non-linear data</i>.</p>" +
            "<p>" + this.guitools.Foraxx_credit + "</p>" );
      this.narrowband_Foraxx_palette_ComboBox = this.guitools.newComboBox(parent, this.par.foraxx_palette, this.Foraxx_palette_values, this.narrowband_Foraxx_CheckBox.toolTip);

      this.ForaxxSizer = new HorizontalSizer;
      this.ForaxxSizer.spacing = 4;
      this.ForaxxSizer.add( this.narrowband_Foraxx_CheckBox );
      this.ForaxxSizer.add( this.narrowband_Foraxx_palette_ComboBox );
      this.ForaxxSizer.addStretch();

      // SHO mapping
      this.enhancements_SHO_mapping_values = [];
      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            if (this.global.narrowBandPalettes[i].sho_mappable) {
                  this.enhancements_SHO_mapping_values.push(this.global.narrowBandPalettes[i].name);
            }
      }
      this.enhancements_narrowband_mapping_CheckBox = this.guitools.newCheckBox(parent, "Narrowband mapping", this.par.run_enhancements_narrowband_mapping, 
            "<p>Map source narrowband image to a new narrowband palette.</p>" +
            "<p>Mapping can be done only on SHO or HOO images. Channels are extracted from the SHO or HOO " + 
            "image and mapped again to create a new palette image.</p>");
      this.enhancements_narrowband_source_palette_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_narrowband_mapping_source_palette, this.Foraxx_palette_values, this.enhancements_narrowband_mapping_CheckBox.toolTip);
      this.enhancements_narrowband_target_mapping_Label = this.guitools.newLabel(parent, "to", this.enhancements_narrowband_mapping_CheckBox.toolTip);
      this.enhancements_narrowband_target_palette_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_narrowband_mapping_target_palette, this.enhancements_SHO_mapping_values, this.enhancements_narrowband_mapping_CheckBox.toolTip);

      this.enhancementsSHOMappingSizer = new HorizontalSizer;
      this.enhancementsSHOMappingSizer.spacing = 4;
      this.enhancementsSHOMappingSizer.add( this.enhancements_narrowband_mapping_CheckBox );
      this.enhancementsSHOMappingSizer.add( this.enhancements_narrowband_source_palette_ComboBox );
      this.enhancementsSHOMappingSizer.add( this.enhancements_narrowband_target_mapping_Label );
      this.enhancementsSHOMappingSizer.add( this.enhancements_narrowband_target_palette_ComboBox );
      this.enhancementsSHOMappingSizer.addStretch();

      this.narrowband_orangeblue_colors_CheckBox = this.guitools.newCheckBox(parent, "Orange/blue colors", this.par.run_orangeblue_colors, 
            "<p>Enhance image by shifting red colors more to  orange and enhancing blues. Useful for example with Foraxx palette.</p>");

      this.fix_narrowband_star_color_CheckBox = this.guitools.newCheckBox(parent, "Fix star colors", this.par.fix_narrowband_star_color, 
            "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars.</p>" );
      this.narrowband_orange_hue_shift_CheckBox = this.guitools.newCheckBox(parent, "Hue shift for more orange", this.par.run_orange_hue_shift, 
            "<p>Do hue shift to enhance orange color. Useful with SHO color palette.</p>" );
      this.narrowband_hue_shift_CheckBox = this.guitools.newCheckBox(parent, "Hue shift for SHO", this.par.run_hue_shift, 
            "<p>Do hue shift to enhance HSO colors. Useful with SHO color palette.</p>" );

      this.selectiveColor = new AutoIntegrateSelectiveColor(this.guitools, this.util, this.global, this.preview);
      this.selectiveColorEngine = this.selectiveColor.createSelectiveColorEngine();
      this.selectiveColorSizer = this.selectiveColor.createSelectiveColorSizer(parent, this.selectiveColorEngine);

      this.engine.selectiveColorEngine = this.selectiveColorEngine;

      this.narrowband_leave_some_green_CheckBox = this.guitools.newCheckBox(parent, "Leave some green", this.par.leave_some_green, 
            "<p>Leave some green color on image when running SCNR. Useful with SHO color palette. </p>");
      this.narrowband_leave_some_green_Edit = this.guitools.newNumericEdit(parent, "Amount", this.par.leave_some_green_amount, 0, 1, 
            "<p>Amount value 0 keeps all the green, value 1 removes all green.</p>");
      this.narrowband_leave_some_green_sizer = new HorizontalSizer;
      this.narrowband_leave_some_green_sizer.spacing = 4;
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_CheckBox );
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_Edit );
      this.narrowband_leave_some_green_sizer.addStretch();
      this.run_narrowband_SCNR_CheckBox = this.guitools.newCheckBox(parent, "Remove green cast", this.par.run_narrowband_SCNR, 
            "<p>Run SCNR to remove green cast. Useful with SHO color palette.</p>");
      this.no_star_fix_mask_CheckBox = this.guitools.newCheckBox(parent, "No mask when fixing star colors", this.par.skip_star_fix_mask, 
            "<p>Do not use star mask when fixing star colors</p>" );
      this.remove_magenta_color_CheckBox = this.guitools.newCheckBox(parent, "Remove magenta color", this.par.remove_magenta_color, 
            "<p>Remove magenta color from image.</p>" );

      this.narrowbandOptions1_sizer = new VerticalSizer;
      this.narrowbandOptions1_sizer.margin = 6;
      this.narrowbandOptions1_sizer.spacing = 4;
      this.narrowbandOptions1_sizer.add( this.ForaxxSizer );
      this.narrowbandOptions1_sizer.add( this.enhancementsSHOMappingSizer );
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
      this.narrowbandEnhancementsOptionsSizer = new HorizontalSizer;
      //this.narrowbandEnhancementsOptionsSizer.margin = 6;
      //this.narrowbandEnhancementsOptionsSizer.spacing = 4;
      this.narrowbandEnhancementsOptionsSizer.add( this.narrowbandOptions1_sizer );
      this.narrowbandEnhancementsOptionsSizer.add( this.narrowbandOptions2_sizer );
      this.narrowbandEnhancementsOptionsSizer.toolTip = narrowbandEnhancementsLabeltoolTip;
      this.narrowbandEnhancementsOptionsSizer.addStretch();

      // enhancements
      var enhancementsRemoveStars_Tooltip = 
            "<p>Run Starnet2 or StarXTerminator on image to generate a starless image and a separate image for the stars.</p>" + 
            "<p>When this is selected, enhancements are applied to the starless image. Smaller stars option is run on star images.</p>" + 
            "<p>At the end of the processing a combined image can be created from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            this.guitools.stars_combine_operations_Tooltip;
      this.enhancementsRemoveStars_CheckBox = this.guitools.newCheckBox(parent, "Remove stars", this.par.enhancements_remove_stars, enhancementsRemoveStars_Tooltip);
      this.enhancementsUnscreenStars_CheckBox = this.guitools.newCheckBox(parent, "Unscreen", this.par.enhancements_unscreen_stars, this.guitools.unscreen_tooltip);
      this.enhancementsRemoveStars_Sizer = new HorizontalSizer;
      this.enhancementsRemoveStars_Sizer.spacing = 4;
      this.enhancementsRemoveStars_Sizer.add( this.enhancementsRemoveStars_CheckBox);
      this.enhancementsRemoveStars_Sizer.add( this.enhancementsUnscreenStars_CheckBox);
      this.enhancementsRemoveStars_Sizer.addStretch();

      this.enhancementsFixStarCores_CheckBox = this.guitools.newCheckBox(parent, "Fix star cores", this.par.enhancements_fix_star_cores, 
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
            this.guitools.stars_combine_operations_Tooltip + 
            enhancementsCombineStarsReduce_Tooltip;
      this.enhancementsCombineStars_CheckBox = this.guitools.newCheckBox(parent, "Combine starless and stars", this.par.enhancements_combine_stars, enhancementsCombineStars_Tooltip);
      this.enhancementsCombineStars_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_combine_stars_mode, this.guitools.starless_and_stars_combine_values, enhancementsCombineStars_Tooltip);

      this.enhancementsCombineStars_Sizer1= new HorizontalSizer;
      this.enhancementsCombineStars_Sizer1.spacing = 4;
      this.enhancementsCombineStars_Sizer1.add( this.enhancementsCombineStars_CheckBox);
      this.enhancementsCombineStars_Sizer1.add( this.enhancementsCombineStars_ComboBox);
      this.enhancementsCombineStars_Sizer1.toolTip = narrowbandEnhancementsLabeltoolTip;
      this.enhancementsCombineStars_Sizer1.addStretch();

      this.enhancementsCombineStarsReduce_Label = this.guitools.newLabel(parent, "Reduce stars", enhancementsCombineStarsReduce_Tooltip);
      this.enhancementsCombineStarsReduce_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_combine_stars_reduce, this.star_reduce_methods, 
            enhancementsCombineStarsReduce_Tooltip);
      this.enhancementsCombineStarsReduce_S_edit = this.guitools.newNumericEdit(parent, 'S', this.par.enhancements_combine_stars_reduce_S, 0.0, 1.0, 
            "<p>To reduce stars size more with Transfer and Halo, lower S value.<p>" + enhancementsCombineStarsReduce_Tooltip);
      var enhancementsCombineStarsReduce_M_toolTip = "<p>Star method mode; 1=Strong; 2=Moderate; 3=Soft reductions.</p>" + enhancementsCombineStarsReduce_Tooltip;
      this.enhancementsCombineStarsReduce_M_Label = this.guitools.newLabel(parent, "I", enhancementsCombineStarsReduce_M_toolTip);
      this.enhancementsCombineStarsReduce_M_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_combine_stars_reduce_M, 1, 3, 
            enhancementsCombineStarsReduce_M_toolTip);

      this.enhancementsCombineStars_Sizer2 = new HorizontalSizer;
      this.enhancementsCombineStars_Sizer2.spacing = 4;
      this.enhancementsCombineStars_Sizer2.addSpacing(20);
      this.enhancementsCombineStars_Sizer2.add( this.enhancementsCombineStarsReduce_Label);
      this.enhancementsCombineStars_Sizer2.add( this.enhancementsCombineStarsReduce_ComboBox);
      this.enhancementsCombineStars_Sizer2.add( this.enhancementsCombineStarsReduce_S_edit);
      this.enhancementsCombineStars_Sizer2.add( this.enhancementsCombineStarsReduce_M_Label);
      this.enhancementsCombineStars_Sizer2.add( this.enhancementsCombineStarsReduce_M_SpinBox);
      this.enhancementsCombineStars_Sizer2.toolTip = narrowbandEnhancementsLabeltoolTip;
      this.enhancementsCombineStars_Sizer2.addStretch();

      this.enhancementsStarsImageLabel = this.guitools.newLabel(parent, "Starless image", "Text Auto or empty image uses default starless image.");
      this.enhancementsStarsImageEdit = this.guitools.newTextEdit(parent, this.par.enhancements_combine_stars_image, this.enhancementsStarsImageLabel.toolTip);
      var enhancementsStarsImageEdit = this.enhancementsStarsImageEdit;
      this.enhancementsStarsImageSelectButton = new ToolButton(parent);
      this.enhancementsStarsImageSelectButton.text = "Select";
      this.enhancementsStarsImageSelectButton.icon = parent.scaledResource(":/icons/find.png");
      this.enhancementsStarsImageSelectButton.toolTip = "<p>Select stars image manually from open images.</p>";
      this.enhancementsStarsImageSelectButton.onClick = function()
      {
            let selectStars = new AutoIntegrateSelectStarsImageDialog(this.util);
            selectStars.windowTitle = "Select Stars Image";
            if (selectStars.execute()) {
                  if (selectStars.name == null) {
                        console.writeln("Stars image not selected");
                        return;
                  }
                  console.writeln("Stars image name " + selectStars.name);
                  enhancementsStarsImageEdit.text = selectStars.name;
                  this.par.enhancements_combine_stars_image.val = selectStars.name;
            }
      };

      this.enhancementsCombineStarsSelect_Sizer = new HorizontalSizer;
      this.enhancementsCombineStarsSelect_Sizer.spacing = 4;
      this.enhancementsCombineStarsSelect_Sizer.addSpacing(20);
      this.enhancementsCombineStarsSelect_Sizer.add( this.enhancementsStarsImageLabel);
      this.enhancementsCombineStarsSelect_Sizer.add( this.enhancementsStarsImageEdit);
      this.enhancementsCombineStarsSelect_Sizer.add( this.enhancementsStarsImageSelectButton);

      this.enhancementsCombineStars_Sizer = new VerticalSizer;
      this.enhancementsCombineStars_Sizer.spacing = 4;
      this.enhancementsCombineStars_Sizer.add( this.enhancementsCombineStars_Sizer1);
      this.enhancementsCombineStars_Sizer.add( this.enhancementsCombineStarsSelect_Sizer );
      this.enhancementsCombineStars_Sizer.add( this.enhancementsCombineStars_Sizer2);
      this.enhancementsCombineStars_Sizer.toolTip = narrowbandEnhancementsLabeltoolTip;
      this.enhancementsCombineStars_Sizer.addStretch();

#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancementsRGBHamapping_CheckBox = this.guitools.newCheckBox(parent, "Ha to RGB mapping", this.par.enhancements_ha_mapping, 
            "<p>Run Ha to RGB mapping on the image.</p>" +
            "<p>Integratrion_H, Integration_H_crop or Integration_H_enhanced image must be loaded to the desktop.</p>" );
#endif // AUTOINTEGRATE_STANDALONE
      this.enhancementsDarkerBackground_CheckBox = this.guitools.newCheckBox(parent, "Darker background", this.par.enhancements_darker_background, 
            "<p>Make image background darker using a lightness mask.</p>" );
      this.enhancementsDarkerHighlights_CheckBox = this.guitools.newCheckBox(parent, "Darker highlights", this.par.enhancements_darker_highlights, 
            "<p>Make image highlights darker using a lightness mask.</p>" );

      this.enhancements_backgroundneutralization_CheckBox = this.guitools.newCheckBox(parent, "Background neutralization", this.par.enhancements_backgroundneutralization, 
            "<p>Run background neutralization to the image.</p>" );

#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements_GC_CheckBox = this.guitools.newCheckBox(parent, "Gradient correction", this.par.enhancements_GC, 
            "<p>Do gradient correction to the image using the selected gradient correction method.</p>" );
      this.enhancements_GC_values_Sizer = this.guitools.createGradientCorrectionChoiceSizer(parent);
      this.enhancements_GC_Sizer = new HorizontalSizer;
      this.enhancements_GC_Sizer.spacing = 4;
      this.enhancements_GC_Sizer.add( this.enhancements_GC_CheckBox );
      this.enhancements_GC_Sizer.add( this.enhancements_GC_values_Sizer );
      this.enhancements_GC_Sizer.addStretch();
#endif

      this.enhancementsBandinReduction_CheckBox = this.guitools.newCheckBox(parent, "Banding reduction", this.par.enhancements_banding_reduction, 
            "<p>Run banding reduction on the image.</p>" );

      var enhancements_ET_tooltip = "<p>Run ExponentialTransform on image using a mask.</p>";
      this.enhancements_ET_CheckBox = this.guitools.newCheckBox(parent, "ExponentialTransform,", this.par.enhancements_ET, enhancements_ET_tooltip);
      this.enhancements_ET_order_edit = this.guitools.newNumericEdit(parent, 'Order', this.par.enhancements_ET_order, 0.1, 6, "Order value for ExponentialTransform.");
      this.enhancements_ET_adjust_label = this.guitools.newLabel(parent, "Adjust", "<p>Adjust type to be used with ExponentialTransform.</p>" +
                                                                  "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                                  this.guitools.adjust_type_toolTip);
      this.enhancements_ET_adjust_Combobox = this.guitools.newComboBox(parent, this.par.enhancements_ET_adjusttype, this.adjust_type_values, this.enhancements_ET_adjust_label.toolTip);

      this.enhancements_ET_Sizer = new HorizontalSizer;
      this.enhancements_ET_Sizer.spacing = 4;
      this.enhancements_ET_Sizer.add( this.enhancements_ET_CheckBox );
      this.enhancements_ET_Sizer.add( this.enhancements_ET_order_edit );
      this.enhancements_ET_Sizer.add( this.enhancements_ET_adjust_label );
      this.enhancements_ET_Sizer.add( this.enhancements_ET_adjust_Combobox );
      this.enhancements_ET_Sizer.toolTip = enhancements_ET_tooltip;
      this.enhancements_ET_Sizer.addStretch();

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
      this.enhancements_HDRMLT_CheckBox = this.guitools.newCheckBox(parent, "HDRMultiscaleTransform", this.par.enhancements_HDRMLT, enhancements_HDRMLT_tooltip);

      this.enhancements_HDRMLT_Layers_Label = new Label( parent );
      this.enhancements_HDRMLT_Layers_Label.text = "Layers";
      this.enhancements_HDRMLT_Layers_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.enhancements_HDRMLT_Layers_Label.toolTip = enhancements_HDRMLT_tooltip;
      this.enhancements_HDRMLT_Layers_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_HDRMLT_layers, 2, 10, enhancements_HDRMLT_tooltip);
      this.enhancements_HDRMLT_Overdrive_Edit = this.guitools.newNumericEditPrecision(parent, "Overdrive", this.par.enhancements_HDRMLT_overdrive, 0, 1, enhancements_HDRMLT_tooltip, 3);
      this.enhancements_HDRMLT_Iterations_Label = this.guitools.newLabel(parent, "Iterations", enhancements_HDRMLT_tooltip);
      this.enhancements_HDRMLT_Iterations_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_HDRMLT_iterations, 1, 16, enhancements_HDRMLT_tooltip);

      this.enhancements_HDRMLT_Color_Label = new Label( parent );
      this.enhancements_HDRMLT_Color_Label.text = "Color";
      this.enhancements_HDRMLT_Color_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.enhancements_HDRMLT_Color_Label.toolTip = enhancements_HDRMLT_tooltip;
      this.enhancements_HDRMLT_color_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_HDRMLT_color, this.enhancements_HDRMLT_color_values, enhancements_HDRMLT_tooltip);

      this.enhancements_HDRMLT_Options_Sizer = new HorizontalSizer;
      this.enhancements_HDRMLT_Options_Sizer.spacing = 4;
      this.enhancements_HDRMLT_Options_Sizer.addSpacing(20);
      this.enhancements_HDRMLT_Options_Sizer.add( this.enhancements_HDRMLT_Layers_Label );
      this.enhancements_HDRMLT_Options_Sizer.add( this.enhancements_HDRMLT_Layers_SpinBox );
      this.enhancements_HDRMLT_Options_Sizer.add( this.enhancements_HDRMLT_Iterations_Label );
      this.enhancements_HDRMLT_Options_Sizer.add( this.enhancements_HDRMLT_Iterations_SpinBox );
      this.enhancements_HDRMLT_Options_Sizer.add( this.enhancements_HDRMLT_Overdrive_Edit );
      this.enhancements_HDRMLT_Options_Sizer.addStretch();

      this.enhancements_HDRMLT_Options_Sizer2 = new HorizontalSizer;
      this.enhancements_HDRMLT_Options_Sizer2.spacing = 4;
      this.enhancements_HDRMLT_Options_Sizer2.addSpacing(20);
      this.enhancements_HDRMLT_Options_Sizer2.add( this.enhancements_HDRMLT_Color_Label );
      this.enhancements_HDRMLT_Options_Sizer2.add( this.enhancements_HDRMLT_color_ComboBox );
      this.enhancements_HDRMLT_Options_Sizer2.addStretch();

      this.enhancements_HDRMLT_Sizer = new VerticalSizer;
      this.enhancements_HDRMLT_Sizer.spacing = 4;
      this.enhancements_HDRMLT_Sizer.add( this.enhancements_HDRMLT_CheckBox );
      this.enhancements_HDRMLT_Sizer.add( this.enhancements_HDRMLT_Options_Sizer );
      this.enhancements_HDRMLT_Sizer.add( this.enhancements_HDRMLT_Options_Sizer2 );

      var enhancements_LHE_tooltip = "<p>Run LocalHistogramEqualization on image using a mask.</p>";
      this.enhancements_LHE_CheckBox = this.guitools.newCheckBox(parent, "LocalHistogramEqualization,", this.par.enhancements_LHE, enhancements_LHE_tooltip);
      this.enhancements_LHE_kernelradius_edit = this.guitools.newNumericEdit(parent, 'Kernel Radius', this.par.enhancements_LHE_kernelradius, 16, 512, "<p>Kernel radius value for LocalHistogramEqualization.</p>");
      this.enhancements_LHE_contrastlimit_edit = this.guitools.newNumericEdit(parent, 'Contrast limit', this.par.enhancements_LHE_contrastlimit, 1, 64, 
                                                                  "<p>Contrast limit value for LocalHistogramEqualization.</p>" +
                                                                  "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      this.enhancements_LHE_adjust_label = this.guitools.newLabel(parent, "Adjust", "<p>Mask type to be used with LocalHistogramEqualization.</p>" +
                                                                  "<p>Lightness mask is used to get the desired adjustment.</p>" +
                                                                  this.guitools.adjust_type_toolTip +
                                                                  "<p>With darks adjust usually you should increase the contrast limit value, for example 2.5.</p>");
      this.enhancements_LHE_adjust_Combobox = this.guitools.newComboBox(parent, this.par.enhancements_LHE_adjusttype, this.adjust_type_values, this.enhancements_LHE_adjust_label.toolTip);

      this.enhancements_LHE_sizer1 = new HorizontalSizer;
      this.enhancements_LHE_sizer1.spacing = 4;
      this.enhancements_LHE_sizer1.add( this.enhancements_LHE_CheckBox );
      this.enhancements_LHE_sizer1.add( this.enhancements_LHE_adjust_label );
      this.enhancements_LHE_sizer1.add( this.enhancements_LHE_adjust_Combobox );
      this.enhancements_LHE_sizer1.toolTip = enhancements_LHE_tooltip;
      this.enhancements_LHE_sizer1.addStretch();

      this.enhancements_LHE_sizer2 = new HorizontalSizer;
      this.enhancements_LHE_sizer2.spacing = 4;
      this.enhancements_LHE_sizer2.addSpacing(20);
      this.enhancements_LHE_sizer2.add( this.enhancements_LHE_kernelradius_edit );
      this.enhancements_LHE_sizer2.add( this.enhancements_LHE_contrastlimit_edit );
      this.enhancements_LHE_sizer2.toolTip = enhancements_LHE_tooltip;
      this.enhancements_LHE_sizer2.addStretch();

      this.enhancements_LHE_sizer = new VerticalSizer;
      this.enhancements_LHE_sizer.spacing = 4;
      this.enhancements_LHE_sizer.add( this.enhancements_LHE_sizer1 );
      this.enhancements_LHE_sizer.add( this.enhancements_LHE_sizer2 );
      this.enhancements_LHE_sizer.toolTip = enhancements_LHE_tooltip;
      this.enhancements_LHE_sizer.addStretch();

      this.enhancements_Contrast_CheckBox = this.guitools.newCheckBox(parent, "Add contrast", this.par.enhancements_contrast, 
            "<p>Run slight S shape curves transformation on image to add contrast.</p>" );
      this.contrastIterationsSpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_contrast_iterations, 1, 5, "Number of iterations for contrast enhancement");
      this.contrastIterationsLabel = new Label( parent );
      this.contrastIterationsLabel.text = "iterations";
      this.contrastIterationsLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.contrastIterationsLabel.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.enhancementsContrastSizer = new HorizontalSizer;
      this.enhancementsContrastSizer.spacing = 4;
      this.enhancementsContrastSizer.add( this.enhancements_Contrast_CheckBox );
      this.enhancementsContrastSizer.add( this.contrastIterationsSpinBox );
      this.enhancementsContrastSizer.add( this.contrastIterationsLabel );
      this.enhancementsContrastSizer.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.enhancementsContrastSizer.addStretch();

      var enhancementsAutoContrastTooltip = "<p>Do automatic contrast enhancement. Works best with starless image.</p>";
      this.enhancementsAutoContrastCheckBox = this.guitools.newCheckBox(parent, "Auto contrast,", this.par.enhancements_auto_contrast, enhancementsAutoContrastTooltip);
      this.enhancementsAutoContrastEditLow = this.guitools.newNumericEditPrecision(parent, 'low', this.par.enhancements_auto_contrast_limit_low, 0, 100, "Percentage of clipped low pixels.", 4);
      this.enhancementsAutoContrastEditHigh = this.guitools.newNumericEditPrecision(parent, 'high', this.par.enhancements_auto_contrast_limit_high, 0, 100, "Percentage of preserved high pixels.", 4);
      this.enhancementsAutoContrastChannelsCheckBox = this.guitools.newCheckBox(parent, "channels", this.par.enhancements_auto_contrast_channels, "Apply auto contrast separately for each channel.");
      this.enhancementsAutoContrastSizer = new HorizontalSizer;
      this.enhancementsAutoContrastSizer.spacing = 4;
      this.enhancementsAutoContrastSizer.add( this.enhancementsAutoContrastCheckBox );
      this.enhancementsAutoContrastSizer.add( this.enhancementsAutoContrastEditLow );
      this.enhancementsAutoContrastSizer.add( this.enhancementsAutoContrastEditHigh );
      this.enhancementsAutoContrastSizer.add( this.enhancementsAutoContrastChannelsCheckBox );
      this.enhancementsAutoContrastSizer.toolTip = enhancementsAutoContrastTooltip;
      this.enhancementsAutoContrastSizer.addStretch();

#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements_stretch_CheckBox = this.guitools.newCheckBox(parent, "Auto stretch", this.par.enhancements_stretch, 
            "<p>Run automatic stretch on image. Can be helpful in some rare cases but it is most useful on testing stretching settings with Apply button.</p>" );
      this.enhancements_autostf_CheckBox = this.guitools.newCheckBox(parent, "AutoSTF", this.par.enhancements_autostf, 
            "<p>Run unlinked AutoSTF stretch on image. Can be helpful in balancing image.</p>" );
#endif 

      this.enhancements_signature_CheckBox = this.guitools.newCheckBox(parent, "Signature", this.par.enhancements_signature, 
            "<p>Add signature to the image.</p>" );
      this.enhancements_signature_path_Edit = this.guitools.newTextEdit(parent, this.par.enhancements_signature_path, "Path to signature file.");
      this.enhancements_signature_path_Button = new ToolButton( parent );
      this.enhancements_signature_path_Button.icon = parent.scaledResource(":/icons/select-file.png");
      this.enhancements_signature_path_Button.toolTip = this.enhancements_signature_path_Edit.toolTip;
      this.enhancements_signature_path_Button.setScaledFixedSize( 20, 20 );
      var enhancements_signature_path_Edit = this.enhancements_signature_path_Edit;
      this.enhancements_signature_path_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            enhancements_signature_path_Edit.text = ofd.fileName;
            this.par.enhancements_signature_path.val = ofd.fileName;
            console.writeln("Signature file path: " + ofd.fileName);
      };
      this.enhancements_signature_scale_Label = this.guitools.newLabel(parent, "Scale", 
            "<p>Scale for signature image. Scale is the signature file height in percentages relative to the main image. " +
            "For example scale 10 means that the signature file height will be 10% of the main image height. " +
            "Value zero means no scaling.</p>");
      this.enhancements_signature_scale_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_signature_scale, 0, 100, this.enhancements_signature_scale_Label.toolTip);
      this.enhancements_signature_position_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_signature_position, this.signature_positions_values, "<p>Signature position.</p>");

      this.enhancements_force_new_mask_CheckBox = this.guitools.newCheckBox(parent, "New mask", this.par.enhancements_force_new_mask, 
            "<p>Do not use existing mask but create a new luminance or star mask when needed.</p>" );
      this.enhancements_range_mask_CheckBox = this.guitools.newCheckBox(parent, "range_mask", this.par.enhancements_range_mask, 
            "<p>Use a user created range mask. It is used as is, it is not for example inverted.</p>" +
            "<p>White selects, black protects.</p>" +
            "<p>Note that this option overwrites any adjust settings selected for an option.</p>");
      this.enhancements_auto_reset_CheckBox = this.guitools.newCheckBox(parent, "Auto reset", this.par.enhancements_auto_reset, 
            "<p>If using Apply button, uncheck options when they are applied.</p>" );

      var shadowclipTooltip = "<p>Adjust shadows in the image. Adjust percentage tells how much shadow pixels are clipped.</p>" +
                              "<p>With a value of 0, no shadow pixels are clipped but histogram, is moved to the left.</p>" +
                              "<p>You can use the Enhnacements / Misc options clipped tool to see clipped pixels.</p>";
      this.enhancements_shadowclip_CheckBox = this.guitools.newCheckBox(parent, "Adjust shadows,", this.par.enhancements_shadowclipping, shadowclipTooltip);
      this.enhancements_shadowclipperc_edit = this.guitools.newNumericEditPrecision(parent, '%', this.par.enhancements_shadowclippingperc, 0, 100, shadowclipTooltip, 4);
      this.enhancements_shadowclip_Sizer = new HorizontalSizer;
      this.enhancements_shadowclip_Sizer.spacing = 4;
      this.enhancements_shadowclip_Sizer.add( this.enhancements_shadowclip_CheckBox );
      this.enhancements_shadowclip_Sizer.add( this.enhancements_shadowclipperc_edit );
      this.enhancements_shadowclip_Sizer.toolTip = shadowclipTooltip;
      this.enhancements_shadowclip_Sizer.addStretch();

      var enhancementsEnhanceShadowsTooltip = "<p>Enhance shadows by using log on each pixel.</p>";
      this.enhancementsEnhanceShadowsCheckBox = this.guitools.newCheckBox(parent, "Enhance shadows", this.par.enhancements_shadow_enhance, enhancementsEnhanceShadowsTooltip);
      this.enhancementsEnhanceShadowsSizer = new HorizontalSizer;
      this.enhancementsEnhanceShadowsSizer.spacing = 4;
      this.enhancementsEnhanceShadowsSizer.add( this.enhancementsEnhanceShadowsCheckBox );
      this.enhancementsEnhanceShadowsSizer.toolTip = shadowclipTooltip;
      this.enhancementsEnhanceShadowsSizer.addStretch();

      var enhancementsEnhanceHighlightsTooltip = "<p>Enhance highlights by using exp on each pixel.</p>";
      this.enhancementsEnhanceHighlightsCheckBox = this.guitools.newCheckBox(parent, "Enhance highlights", this.par.enhancements_highlight_enhance, enhancementsEnhanceHighlightsTooltip);
      this.enhancementsEnhanceHighlightsSizer = new HorizontalSizer;
      this.enhancementsEnhanceHighlightsSizer.spacing = 4;
      this.enhancementsEnhanceHighlightsSizer.add( this.enhancementsEnhanceHighlightsCheckBox );
      this.enhancementsEnhanceHighlightsSizer.toolTip = shadowclipTooltip;
      this.enhancementsEnhanceHighlightsSizer.addStretch();

      var enhancementsGammaTooltip = "<p>Apply gamma correction to the image.</p>" +
                              "<p>Value below 1 will make the image lighter. Value above 1 will make image darker.</p>";
      this.enhancementsGammaCheckBox = this.guitools.newCheckBox(parent, "Gamma", this.par.enhancements_gamma, enhancementsGammaTooltip);
      this.enhancementsGammaEdit = this.guitools.newNumericEdit(parent, '', this.par.enhancements_gamma_value, 0, 2, enhancementsGammaTooltip);
      this.enhancementsGammaSizer = new HorizontalSizer;
      this.enhancementsGammaSizer.spacing = 4;
      this.enhancementsGammaSizer.add( this.enhancementsGammaCheckBox );
      this.enhancementsGammaSizer.add( this.enhancementsGammaEdit );
      this.enhancementsGammaSizer.toolTip = enhancementsGammaTooltip;
      this.enhancementsGammaSizer.addStretch();

      var smoothBackgroundTooltip = 
            "<p>Smoothen background below a given pixel value. Pixel value can be found for example " +
            "from the this.preview image using a mouse.</p>" +
            "<p>A limit value specifies below which the smoothing is done. " + 
            "The value should be selected so that no foreground data is lost.</p>" + 
            "<p>Smoothing sets a new relative value for pixels that are below the given limit value. " +
            "If the factor is below 1, new pixel values will be higher than the old values. " +
            "If factor is above 1, new pixel values will be lower than the old values.</p>" +
            "<p>With a factor value below 1, smoothening can help gradient correction to clean up the background better in case of " + 
            "very uneven background.</p>" +
            "<p>With a factor value above 1, smoothening can make dark parts of the image darker.</p>";

      this.enhancements_smoothBackground_CheckBox = this.guitools.newCheckBox(parent, "Smoothen background,", this.par.enhancements_smoothbackground, smoothBackgroundTooltip);
      this.enhancements_smoothBackgroundval_edit = this.guitools.newNumericEditPrecision(parent, 'value', this.par.enhancements_smoothbackgroundval, 0, 100, smoothBackgroundTooltip, 4);
      this.enhancements_smoothBackgroundfactor_edit = this.guitools.newNumericEditPrecision(parent, 'factor', this.par.enhancements_smoothbackgroundfactor, 0, 10, smoothBackgroundTooltip, 2);
      this.enhancements_smoothBackground_Sizer = new HorizontalSizer;
      this.enhancements_smoothBackground_Sizer.spacing = 4;
      this.enhancements_smoothBackground_Sizer.add( this.enhancements_smoothBackground_CheckBox );
      this.enhancements_smoothBackground_Sizer.add( this.enhancements_smoothBackgroundval_edit );
      this.enhancements_smoothBackground_Sizer.add( this.enhancements_smoothBackgroundfactor_edit );
      this.enhancements_smoothBackground_Sizer.toolTip = smoothBackgroundTooltip;
      this.enhancements_smoothBackground_Sizer.addStretch();

      this.enhancementsNormalizeChannelsCheckBox = this.guitools.newCheckBox(parent, "Normalize channels,", this.par.enhancements_normalize_channels, 
                                                            "<p>Normalize black point and brightness on all channels based on a reference channel.<p>" +
                                                            "<p>Can be useful for example on narrowband images where Halpha data (typically on channel B) is much stronger than S or O.<p>" +
                                                            "<p>Normalization uses similar PixelMath expressions as Bill Blanshan in his <i>Narrowband Normalization using Pixnsight Pixelmath</i> " + 
                                                            "script. See more information in his YouTube channel AnotherAstroChannel.</p>");
      this.enhancementsNormalizeChannelsReferenceLabel = this.guitools.newLabel(parent, "reference", "Reference channel for normalization." + this.enhancementsNormalizeChannelsCheckBox.toolTip);
      this.enhancementsNormalizeChannelsReferenceComboBox = this.guitools.newComboBox(parent, this.par.enhancements_normalize_channels_reference, this.normalize_channels_reference_values, this.enhancementsNormalizeChannelsReferenceLabel.toolTip);
      this.enhancementsNormalizeChannelsMaskCheckBox = this.guitools.newCheckBox(parent, "Mask", this.par.enhancements_normalize_channels_mask, 
                                                            "<p>Use a lightness mask when normalizing. It can help to avoid overstretching dark parts of the image.</p>" + 
                                                            this.enhancementsNormalizeChannelsCheckBox.toolTip);
      this.enhancementsNormalizeChannelsRescaleCheckBox = this.guitools.newCheckBox(parent, "Rescale", this.par.enhancements_normalize_channels_rescale, 
                                                            "<p>Rescales the image to [0, 1] during PixelMath operation. Can be useful if there is clipping in normalization.</p>" + 
                                                            this.enhancementsNormalizeChannelsCheckBox.toolTip);

      this.enhancementsNormalizeChannelsSizer = new HorizontalSizer;
      this.enhancementsNormalizeChannelsSizer.spacing = 4;
      // this.enhancementsNormalizeChannelsSizer.margin = 2;
      this.enhancementsNormalizeChannelsSizer.add( this.enhancementsNormalizeChannelsCheckBox );
      this.enhancementsNormalizeChannelsSizer.add( this.enhancementsNormalizeChannelsReferenceLabel );
      this.enhancementsNormalizeChannelsSizer.add( this.enhancementsNormalizeChannelsReferenceComboBox );
      this.enhancementsNormalizeChannelsSizer.add( this.enhancementsNormalizeChannelsMaskCheckBox );
      this.enhancementsNormalizeChannelsSizer.add( this.enhancementsNormalizeChannelsRescaleCheckBox );
      this.enhancementsNormalizeChannelsSizer.addStretch();

      var enhancementsAdjustChannelsToolTip = "<p>Adjust channels in PixelMath by multiplying them with a given value.</p>" + 
                                          "<p>If option Only K is checked then value R/K is used to adjust the whole image.</p>";

      this.enhancementsAdjustChannelsCheckBox = this.guitools.newCheckBox(parent, "Adjust channels,", this.par.enhancements_adjust_channels, enhancementsAdjustChannelsToolTip);
      this.enhancementsAdjustChannelR = this.guitools.newNumericEdit(parent, "R/K", this.par.enhancements_adjust_R, 0, 100, enhancementsAdjustChannelsToolTip);
      this.enhancementsAdjustChannelG = this.guitools.newNumericEdit(parent, "G", this.par.enhancements_adjust_G, 0, 100, enhancementsAdjustChannelsToolTip);
      this.enhancementsAdjustChannelB = this.guitools.newNumericEdit(parent, "B", this.par.enhancements_adjust_B, 0, 100, enhancementsAdjustChannelsToolTip);
      var enhancementsAdjustChannelR = this.enhancementsAdjustChannelR;
      var enhancementsAdjustChannelG = this.enhancementsAdjustChannelG;
      var enhancementsAdjustChannelB = this.enhancementsAdjustChannelB;

      this.enhancementsAdjustChannelDefaultsButton = new ToolButton(parent);
      this.enhancementsAdjustChannelDefaultsButton.icon = new Bitmap( ":/images/icons/reset.png" );
      this.enhancementsAdjustChannelDefaultsButton.toolTip = 
            "<p>Reset channel adjust values to defaults.</p>";
      this.enhancementsAdjustChannelDefaultsButton.onClick = function()
      {
            console.writeln("Reset channel adjust values to defaults.");
            this.par.enhancements_adjust_R.val = this.par.enhancements_adjust_R.def;
            this.par.enhancements_adjust_G.val = this.par.enhancements_adjust_G.def;
            this.par.enhancements_adjust_B.val = this.par.enhancements_adjust_B.def;
            enhancementsAdjustChannelR.setValue(this.par.enhancements_adjust_R.val);
            enhancementsAdjustChannelG.setValue(this.par.enhancements_adjust_G.val);
            enhancementsAdjustChannelB.setValue(this.par.enhancements_adjust_B.val);
      };
      this.enhancementsAdjustChannelsOnlyKCheckBox = this.guitools.newCheckBox(parent, "Only K", this.par.enhancements_adjust_channels_only_k, enhancementsAdjustChannelsToolTip);

      this.enhancementsAdjustChannelsSizer = new HorizontalSizer;
      this.enhancementsAdjustChannelsSizer.spacing = 4;
      // this.enhancementsAdjustChannelsSizer.margin = 2;
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelsCheckBox );
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelR );
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelG );
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelB );
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelsOnlyKCheckBox );
      this.enhancementsAdjustChannelsSizer.add( this.enhancementsAdjustChannelDefaultsButton );
      this.enhancementsAdjustChannelsSizer.addStretch();

      this.enhancements_SmallerStars_CheckBox = this.guitools.newCheckBox(parent, "Smaller stars", this.par.enhancements_smaller_stars, 
            "<p>Make stars smaller on image.</p>" );
      this.smallerStarsIterationsSpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_smaller_stars_iterations, 0, 10, 
            "Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection");
      this.smallerStarsIterationsLabel = new Label( parent );
      this.smallerStarsIterationsLabel.text = "iterations";
      this.smallerStarsIterationsLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.smallerStarsIterationsLabel.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.enhancementsSmallerStarsSizer = new HorizontalSizer;
      this.enhancementsSmallerStarsSizer.spacing = 4;
      this.enhancementsSmallerStarsSizer.add( this.enhancements_SmallerStars_CheckBox );
      this.enhancementsSmallerStarsSizer.add( this.smallerStarsIterationsSpinBox );
      this.enhancementsSmallerStarsSizer.add( this.smallerStarsIterationsLabel );
      this.enhancementsSmallerStarsSizer.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.enhancementsSmallerStarsSizer.addStretch();

      var enhancements_noise_reduction_tooltip = "<p>Noise reduction on image.</p>" + this.guitools.noiseReductionToolTipCommon;
      this.enhancements_NoiseReduction_CheckBox = this.guitools.newCheckBox(parent, "Noise reduction", this.par.enhancements_noise_reduction, 
            enhancements_noise_reduction_tooltip);

      this.enhancementsNoiseReductionStrengthSizer = new HorizontalSizer;
      this.enhancementsNoiseReductionStrengthSizer.spacing = 4;
      this.enhancementsNoiseReductionStrengthSizer.add( this.enhancements_NoiseReduction_CheckBox );
      this.enhancementsNoiseReductionStrengthSizer.toolTip = enhancements_noise_reduction_tooltip;
      this.enhancementsNoiseReductionStrengthSizer.addStretch();

      this.enhancements_ACDNR_CheckBox = this.guitools.newCheckBox(parent, "ACDNR noise reduction", this.par.enhancements_ACDNR, 
            "<p>Run ACDNR noise reduction on image using a lightness mask.</p>"
#ifndef AUTOINTEGRATE_STANDALONE
            + "<p>StdDev value is taken from <i>Processing1 / noise reduction</i> section.</p>" + this.guitools.ACDNR_StdDev_tooltip
#endif
            );
      this.enhancements_color_noise_CheckBox = this.guitools.newCheckBox(parent, "Color noise reduction", this.par.enhancements_color_noise, 
            "<p>Run color noise reduction on image.</p>" );
      this.enhancements_star_noise_reduction_CheckBox = this.guitools.newCheckBox(parent, "Star noise reduction", this.par.enhancements_star_noise_reduction, 
            "<p>Run star noise reduction on star image.</p>" );
      this.enhancements_color_calibration_CheckBox = this.guitools.newCheckBox(parent, "Color calibration", this.par.enhancements_color_calibration, 
            "<p>Run ColorCalibration on image.</p>" );

#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements_solve_image_CheckBox = this.guitools.newCheckBox(parent, "Solve", this.par.enhancements_solve_image, 
            "<p>Solve image by running ImageSolver script.</p>" + 
            "<p>If image does not have correct coordinates or focal length embedded they can be given in <i>Postprocessing / Image solving</i> section.</p>");

      this.enhancements_solve_image_Button = new ToolButton( parent );
      this.enhancements_solve_image_Button.icon = parent.scaledResource(":/icons/select-file.png");
      this.enhancements_solve_image_Button.toolTip = "<p>Select file for copying astrometric solution to image.</p>";
      this.enhancements_solve_image_Button.setScaledFixedSize( 20, 20 );
      this.enhancements_solve_image_Button.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            if (this.util.copyAstrometricSolutionFromFile(this.global.enhancements_target_image_id, ofd.fileName)) {
                  console.noteln("Astrometric solution copied from file: " + ofd.fileName);
            } else {
                  console.criticalln("Astrometric solution not copied from file: " + ofd.fileName);
            }
      };

      this.enhancements_annotate_image_CheckBox = this.guitools.newCheckBox(parent, "Annotate", this.par.enhancements_annotate_image, 
            "<p>Use AnnotateImage script to annotate image.</p>" + 
            "<p>Note that image must have a correct astrometric solution embedded for annotate to work. " + 
            "When using SPCC color calibration astrometric solution is automatically added.</p>" +
            "<p>When used with the Run or AutoContinue button a new image with _Annotated postfix is created.</p>");
      this.enhancements_annotate_scale_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_annotate_image_scale, 1, 8, 
            "<p>Graphics scale for AnnotateImage script.</p>");

#endif // AUTOINTEGRATE_STANDALONE

      this.enhancementsSetClippedPixelsSizer = this.guitools.createClippedSizer(parent, this.preview_control);

      var enhancements_sharpen_tooltip = "<p>Sharpening on image using a luminance mask.</p>" + 
                                    "<p>Number of iterations specifies how many times the sharpening is run.</p>" +
                                    "<p>If BlurXTerminator or GraXpert is used for sharpening then iterations parameter is ignored.</p>";
      this.enhancements_sharpen_CheckBox = this.guitools.newCheckBox(parent, "Sharpening", this.par.enhancements_sharpen, enhancements_sharpen_tooltip);

      this.enhancementsSharpenIterationsSpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_sharpen_iterations, 1, 10, enhancements_sharpen_tooltip);
      this.enhancementsSharpenIterationsLabel = new Label( parent );
      this.enhancementsSharpenIterationsLabel.text = "iterations";
      this.enhancementsSharpenIterationsLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.enhancementsSharpenIterationsLabel.toolTip = enhancements_sharpen_tooltip;
      this.enhancementsSharpenIterationsSizer = new HorizontalSizer;
      this.enhancementsSharpenIterationsSizer.spacing = 4;
      this.enhancementsSharpenIterationsSizer.add( this.enhancements_sharpen_CheckBox );
      this.enhancementsSharpenIterationsSizer.add( this.enhancementsSharpenIterationsSpinBox );
      this.enhancementsSharpenIterationsSizer.add( this.enhancementsSharpenIterationsLabel );
      this.enhancementsSharpenIterationsSizer.toolTip = enhancements_sharpen_tooltip;
      this.enhancementsSharpenIterationsSizer.addStretch();

      var unsharpmask_tooltip = "Sharpen image using UnsharpMask and a luminance mask.";
      this.enhancements_unsharpmask_CheckBox = this.guitools.newCheckBox(parent, "UnsharpMask,", this.par.enhancements_unsharpmask, unsharpmask_tooltip);
      this.enhancementsUnsharpMaskStdDevEdit = this.guitools.newNumericEdit(parent, "StdDev", this.par.enhancements_unsharpmask_stddev, 0.1, 250, unsharpmask_tooltip);
      this.enhancementsUnsharpMaskAmountEdit = this.guitools.newNumericEdit(parent, "Amount", this.par.enhancements_unsharpmask_amount, 0.1, 1.00, unsharpmask_tooltip);
      this.enhancementsUnsharpMaskSizer = new HorizontalSizer;
      this.enhancementsUnsharpMaskSizer.spacing = 4;
      this.enhancementsUnsharpMaskSizer.add( this.enhancements_unsharpmask_CheckBox );
      this.enhancementsUnsharpMaskSizer.add( this.enhancementsUnsharpMaskStdDevEdit );
      this.enhancementsUnsharpMaskSizer.add( this.enhancementsUnsharpMaskAmountEdit );
      this.enhancementsUnsharpMaskSizer.addStretch();

      var highpass_sharpen_tooltip = "<p>Sharpen image using high pass filter and a luminance mask.</p>" +
                                          "<p>High pass sharpen should be used only for starless images.</p>";
      this.enhancements_highpass_sharpen_CheckBox = this.guitools.newCheckBox(parent, "High pass sharpen", this.par.enhancements_highpass_sharpen, highpass_sharpen_tooltip);
      this.enhancements_highpass_sharpen_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_highpass_sharpen_method, this.highpass_sharpen_values, 
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
      this.enhancements_highpass_sharpen_Label = this.guitools.newLabel(parent, "Layers", "<p>Number of layers used to blur the original image.</p>");
      this.enhancements_highpass_sharpen_SpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_highpass_sharpen_layers, 1, 7, this.enhancements_highpass_sharpen_Label.toolTip);

      this.enhancementsHighPassSharpenSizer1 = new HorizontalSizer;
      this.enhancementsHighPassSharpenSizer1.spacing = 4;
      this.enhancementsHighPassSharpenSizer1.add( this.enhancements_highpass_sharpen_CheckBox );
      this.enhancementsHighPassSharpenSizer1.add( this.enhancements_highpass_sharpen_ComboBox );
      this.enhancementsHighPassSharpenSizer1.add( this.enhancements_highpass_sharpen_Label );
      this.enhancementsHighPassSharpenSizer1.add( this.enhancements_highpass_sharpen_SpinBox );
      this.enhancementsHighPassSharpenSizer1.addStretch();

      this.enhancements_highpass_sharpen_noise_reduction_CheckBox = this.guitools.newCheckBox(parent, "Noise reduction", this.par.enhancements_highpass_sharpen_noise_reduction, 
            "<p>Do noise reduction on high pass image before sharpening.</p>");
      this.enhancements_highpass_sharpen_keep_images_CheckBox = this.guitools.newCheckBox(parent, "Keep images", this.par.enhancements_highpass_sharpen_keep_images, 
            "<p>Do not delete low pass and high pass images.</p>");
      this.enhancements_highpass_sharpen_combine_only_CheckBox = this.guitools.newCheckBox(parent, "Combine only", this.par.enhancements_highpass_sharpen_combine_only, 
            "<p>Combine only high pass sharpened image with low pass image. Image is assumed to have a _lowpass or _highpass postfix.</p>");

      this.enhancementsHighPassSharpenSizer2 = new HorizontalSizer;
      this.enhancementsHighPassSharpenSizer2.spacing = 4;
      this.enhancementsHighPassSharpenSizer2.addSpacing(20);
      this.enhancementsHighPassSharpenSizer2.add( this.enhancements_highpass_sharpen_noise_reduction_CheckBox );
      this.enhancementsHighPassSharpenSizer2.add( this.enhancements_highpass_sharpen_keep_images_CheckBox );
      this.enhancementsHighPassSharpenSizer2.add( this.enhancements_highpass_sharpen_combine_only_CheckBox );
      this.enhancementsHighPassSharpenSizer2.addStretch();

      this.enhancementsHighPassSharpenSizer = new VerticalSizer;
      this.enhancementsHighPassSharpenSizer.spacing = 4;
      this.enhancementsHighPassSharpenSizer.add( this.enhancementsHighPassSharpenSizer1 );
      this.enhancementsHighPassSharpenSizer.add( this.enhancementsHighPassSharpenSizer2 );
      this.enhancementsHighPassSharpenSizer.addStretch();

      var enhancements_saturation_tooltip = "<p>Add saturation to the image using a luminance mask.</p>" + 
                                          "<p>Number of iterations specifies how many times add saturation is run.</p>";
      this.enhancements_saturation_CheckBox = this.guitools.newCheckBox(parent, "Saturation", this.par.enhancements_saturation, enhancements_saturation_tooltip);
      this.enhancements_less_saturation_CheckBox = this.guitools.newCheckBox(parent, "Less", this.par.enhancements_less_saturation, "If checked saturation is reduced instead of increased.");

      this.enhancementsSaturationIterationsSpinBox = this.guitools.newSpinBox(parent, this.par.enhancements_saturation_iterations, 1, 20, enhancements_saturation_tooltip);
      this.enhancementsSaturationIterationsLabel = new Label( parent );
      this.enhancementsSaturationIterationsLabel.text = "iterations";
      this.enhancementsSaturationIterationsLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.enhancementsSaturationIterationsLabel.toolTip = enhancements_saturation_tooltip;
      this.enhancementsSaturationIterationsSizer = new HorizontalSizer;
      this.enhancementsSaturationIterationsSizer.spacing = 4;
      this.enhancementsSaturationIterationsSizer.add( this.enhancements_saturation_CheckBox );
      this.enhancementsSaturationIterationsSizer.add( this.enhancementsSaturationIterationsSpinBox );
      this.enhancementsSaturationIterationsSizer.add( this.enhancementsSaturationIterationsLabel );
      this.enhancementsSaturationIterationsSizer.add( this.enhancements_less_saturation_CheckBox );
      this.enhancementsSaturationIterationsSizer.toolTip = enhancements_saturation_tooltip;
      this.enhancementsSaturationIterationsSizer.addStretch();

      var clarity_tooltip = "<p>Add clarity to the image using a luminance mask. Clarity is a local contrast enhancement.</p>" +
                              "<p>Clarity uses UnsharpMask process where stddev should be large and amount should be small.</p>" + 
                              "<p>If a mask is used then clarity is applied only to the light parts of the image.</p>";
      this.enhancements_clarity_CheckBox = this.guitools.newCheckBox(parent, "Clarity,", this.par.enhancements_clarity, clarity_tooltip);
      this.enhancementsClarityStdDevEdit = this.guitools.newNumericEdit(parent, "StdDev", this.par.enhancements_clarity_stddev, 0.1, 250, clarity_tooltip);
      this.enhancementsClarityAmountEdit = this.guitools.newNumericEdit(parent, "Amount", this.par.enhancements_clarity_amount, 0.1, 1.00, clarity_tooltip);
      this.enhancementsClarityMaskCheckBox = this.guitools.newCheckBox(parent, "Mask", this.par.enhancements_clarity_mask, clarity_tooltip);
      this.enhancementsClaritySizer = new HorizontalSizer;
      this.enhancementsClaritySizer.spacing = 4;
      this.enhancementsClaritySizer.add( this.enhancements_clarity_CheckBox );
      this.enhancementsClaritySizer.add( this.enhancementsClarityStdDevEdit );
      this.enhancementsClaritySizer.add( this.enhancementsClarityAmountEdit );
      this.enhancementsClaritySizer.add( this.enhancementsClarityMaskCheckBox );
      this.enhancementsClaritySizer.addStretch();


      this.enhancements_rotate_CheckBox = this.guitools.newCheckBox(parent, "Rotate", this.par.enhancements_rotate, 
            "<p>Rotate the image in clockwise direction.</p>" );
      this.enhancements_rotate_degrees_ComboBox = this.guitools.newComboBox(parent, this.par.enhancements_rotate_degrees, this.rotate_degrees_values, this.enhancements_rotate_CheckBox.toolTip);
      this.enhancements_image_no_copy_CheckBox = this.guitools.newCheckBox(parent, "No copy", this.par.enhancements_apply_no_copy_image, 
            "<p>Do not make a copy of the image for Apply.</p>" );

      this.enhancementsImageOptionsSizer1 = new HorizontalSizer;
      this.enhancementsImageOptionsSizer1.spacing = 4;
      this.enhancementsImageOptionsSizer1.add( this.enhancements_auto_reset_CheckBox );
      this.enhancementsImageOptionsSizer1.add( this.enhancements_image_no_copy_CheckBox );
      this.enhancementsImageOptionsSizer1.add( this.enhancements_force_new_mask_CheckBox );
      this.enhancementsImageOptionsSizer1.add( this.enhancements_range_mask_CheckBox );
#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancementsImageOptionsSizer1.add( this.enhancements_stretch_CheckBox );
      this.enhancementsImageOptionsSizer1.add( this.enhancements_autostf_CheckBox );
#endif // AUTOINTEGRATE_STANDALONE
      this.enhancementsImageOptionsSizer1.addStretch();

      this.enhancementsImageOptionsSizer11 = new HorizontalSizer;
      this.enhancementsImageOptionsSizer11.spacing = 4;
      this.enhancementsImageOptionsSizer11.add( this.enhancements_rotate_CheckBox );
      this.enhancementsImageOptionsSizer11.add( this.enhancements_rotate_degrees_ComboBox );
      this.enhancementsImageOptionsSizer11.add( this.enhancements_color_calibration_CheckBox );
#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancementsImageOptionsSizer11.add( this.enhancements_solve_image_CheckBox );
      this.enhancementsImageOptionsSizer11.add( this.enhancements_solve_image_Button );
      this.enhancementsImageOptionsSizer11.add( this.enhancements_annotate_image_CheckBox );
      this.enhancementsImageOptionsSizer11.add( this.enhancements_annotate_scale_SpinBox );
#endif // AUTOINTEGRATE_STANDALONE
      this.enhancementsImageOptionsSizer11.addStretch();

      this.enhancementsImageOptionsSizer2 = new HorizontalSizer;
      this.enhancementsImageOptionsSizer2.spacing = 4;
      this.enhancementsImageOptionsSizer2.add( this.enhancementsSetClippedPixelsSizer );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_CheckBox );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_path_Edit );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_path_Button );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_scale_Label );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_scale_SpinBox );
      this.enhancementsImageOptionsSizer2.add( this.enhancements_signature_position_ComboBox );
      this.enhancementsImageOptionsSizer2.addStretch();

      this.enhancementsImageOptionsSizer = new VerticalSizer;
      this.enhancementsImageOptionsSizer.margin = 6;
      this.enhancementsImageOptionsSizer.spacing = 4;
      this.enhancementsImageOptionsSizer.add( this.enhancementsImageOptionsSizer1 );
      this.enhancementsImageOptionsSizer.add( this.enhancementsImageOptionsSizer11 );
      this.enhancementsImageOptionsSizer.add( this.enhancementsImageOptionsSizer2 );
      this.enhancementsImageOptionsSizer.addStretch();

      this.enhancements1 = new VerticalSizer;
      this.enhancements1.margin = 6;
      this.enhancements1.spacing = 4;
#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements1.add( this.enhancementsRGBHamapping_CheckBox );
#endif // AUTOINTEGRATE_STANDALONE
      this.enhancements1.add( this.enhancements_smoothBackground_Sizer );
      this.enhancements1.add( this.enhancementsBandinReduction_CheckBox );
      this.enhancements1.add( this.enhancements_backgroundneutralization_CheckBox );
#ifndef AUTOINTEGRATE_STANDALONE
      this.enhancements1.add( this.enhancements_GC_Sizer );
#endif // AUTOINTEGRATE_STANDALONE
      this.enhancements1.add( this.enhancements_shadowclip_Sizer );
      this.enhancements1.add( this.enhancementsDarkerBackground_CheckBox );
      this.enhancements1.add( this.enhancementsDarkerHighlights_CheckBox );
      this.enhancements1.add( this.enhancementsEnhanceShadowsSizer );
      this.enhancements1.add( this.enhancementsEnhanceHighlightsSizer );
      this.enhancements1.add( this.enhancementsGammaSizer );
      this.enhancements1.add( this.enhancementsNormalizeChannelsSizer );
      this.enhancements1.add( this.enhancementsAdjustChannelsSizer );
      this.enhancements1.add( this.enhancements_ET_Sizer );
      this.enhancements1.add( this.enhancements_HDRMLT_Sizer );

      this.enhancements1.addStretch();

      this.enhancements2 = new VerticalSizer;
      this.enhancements2.margin = 6;
      this.enhancements2.spacing = 4;
      this.enhancements2.add( this.enhancements_LHE_sizer );
      this.enhancements2.add( this.enhancementsContrastSizer );
      this.enhancements2.add( this.enhancementsAutoContrastSizer );
      this.enhancements2.add( this.enhancementsNoiseReductionStrengthSizer );
      this.enhancements2.add( this.enhancements_ACDNR_CheckBox );
      this.enhancements2.add( this.enhancements_color_noise_CheckBox );
      this.enhancements2.add( this.enhancementsUnsharpMaskSizer );
      this.enhancements2.add( this.enhancementsSharpenIterationsSizer );
      this.enhancements2.add( this.enhancementsHighPassSharpenSizer );
      this.enhancements2.add( this.enhancementsSaturationIterationsSizer );
      this.enhancements2.add( this.enhancementsClaritySizer );
      this.enhancements2.addStretch();

      this.enhancementsStarsOptions1_sizer = new VerticalSizer;
      this.enhancementsStarsOptions1_sizer.margin = 6;
      this.enhancementsStarsOptions1_sizer.spacing = 4;
      this.enhancementsStarsOptions1_sizer.add( this.enhancementsRemoveStars_Sizer );
      this.enhancementsStarsOptions1_sizer.add( this.enhancementsFixStarCores_CheckBox );
      this.enhancementsStarsOptions1_sizer.add( this.enhancements_star_noise_reduction_CheckBox );
      this.enhancementsStarsOptions1_sizer.add( this.enhancementsSmallerStarsSizer );
      this.enhancementsStarsOptions1_sizer.addStretch();

      this.enhancementsStarsOptions2_sizer = new VerticalSizer;
      this.enhancementsStarsOptions2_sizer.margin = 6;
      this.enhancementsStarsOptions2_sizer.spacing = 4;
      this.enhancementsStarsOptions2_sizer.add( this.enhancementsCombineStars_Sizer );
      this.enhancementsStarsOptions2_sizer.addStretch();

      this.enhancementsStarsOptionsSizer = new HorizontalSizer;
      this.enhancementsStarsOptionsSizer.add( this.enhancementsStarsOptions1_sizer );
      this.enhancementsStarsOptionsSizer.add( this.enhancementsStarsOptions2_sizer );
      this.enhancementsStarsOptionsSizer.addStretch();

      this.enhancementsGroupBoxSizer = new HorizontalSizer;
      //this.enhancementsGroupBoxSizer.margin = 6;
      //this.enhancementsGroupBoxSizer.spacing = 4;
      this.enhancementsGroupBoxSizer.add( this.enhancements1 );
      this.enhancementsGroupBoxSizer.add( this.enhancements2 );
      this.enhancementsGroupBoxSizer.addStretch();

      this.enhancementsTargetOptionsControl = new Control( parent );
      this.enhancementsTargetOptionsControl.sizer = new VerticalSizer;
      this.enhancementsTargetOptionsControl.sizer.margin = 6;
      this.enhancementsTargetOptionsControl.sizer.spacing = 4;
      this.enhancementsTargetOptionsControl.sizer.add( this.enhancementsImageOptionsSizer );
      this.enhancementsTargetOptionsControl.sizer.addStretch();
      this.enhancementsTargetOptionsControl.visible = false;

      this.enhancementsGenericControl = new Control( parent );
      this.enhancementsGenericControl.sizer = new VerticalSizer;
      this.enhancementsGenericControl.sizer.margin = 6;
      this.enhancementsGenericControl.sizer.spacing = 4;
      this.enhancementsGenericControl.sizer.add( this.enhancementsGroupBoxSizer );
      this.enhancementsGenericControl.sizer.addStretch();
      this.enhancementsGenericControl.visible = true;

      this.echancementsNarrowbandControl = new Control( parent );
      this.echancementsNarrowbandControl.sizer = new VerticalSizer;
      this.echancementsNarrowbandControl.sizer.margin = 6;
      this.echancementsNarrowbandControl.sizer.spacing = 4;
      this.echancementsNarrowbandControl.sizer.add( this.narrowbandEnhancementsOptionsSizer );
      this.echancementsNarrowbandControl.sizer.addStretch();
      this.echancementsNarrowbandControl.visible = false;

      this.enhancementsStarsControl = new Control( parent );
      this.enhancementsStarsControl.sizer = new VerticalSizer;
      this.enhancementsStarsControl.sizer.margin = 6;
      this.enhancementsStarsControl.sizer.spacing = 4;
      this.enhancementsStarsControl.sizer.add( this.enhancementsStarsOptionsSizer );
      this.enhancementsStarsControl.sizer.addStretch();
      this.enhancementsStarsControl.visible = false;

      this.selectiveColorControl = new Control( parent );
      this.selectiveColorControl.sizer = new VerticalSizer;
      this.selectiveColorControl.sizer.margin = 6;
      this.selectiveColorControl.sizer.spacing = 4;
      this.selectiveColorControl.sizer.add( this.selectiveColorSizer );
      this.selectiveColorControl.sizer.addStretch();
      this.selectiveColorControl.visible = false;
}

enhancementsApplyButtonOnClick()
{
            if (this.global.enhancements_target_image_id == null) {
                  console.criticalln("No target image selected!");
            } else if (!this.util.is_enhancements_option() && !this.util.is_narrowband_option()) {
                  console.criticalln("No enhancements option selected!");
            } else if (this.global.enhancements_target_image_id == null) {
                  console.criticalln("No image!");
            } else if (this.global.enhancements_target_image_id == "Auto") {
                  console.criticalln("Auto target image cannot be used with Apply button!");
            } else if (this.util.findWindow(this.global.enhancements_target_image_id) == null) {
                  console.criticalln("Could not find target image " + this.global.enhancements_target_image_id);
            } else {
                  if (this.enhancements_gui_info.undo_images.length == 0) {
                        this.global.enhancements_info = [];   // First image, clear enhancements info
                        var saved_enhancements_target_image = this.global.enhancements_target_image_id;
                        if (!this.par.enhancements_apply_no_copy_image.val) {
                              // make copy of the original image
                              this.global.enhancements_target_image_id = this.copy_new_edit_image(this.global.enhancements_target_image_id);
                        }
                        var first_undo_image = this.create_undo_image(this.global.enhancements_target_image_id);
                        var first_undo_image_histogramInfo = this.global.enhancements_target_histogram_info;
                  } else {
                        var first_undo_image = null;
                  }
                  console.writeln("Apply enhancements edits on " + this.global.enhancements_target_image_id);
                  let apply_ok = false;
                  try {
                        this.engine.enhancementsApply = true;
                        this.global.haveIconized = 0;

                        this.engine.enhancementsProcessingEngine(this.dialog, this.global.enhancements_target_image_id, this.util.is_narrowband_option());

                        if (this.enhancements_gui_info.undo_images.length == 0) {
                              // add first/original undo image
                              this.add_undo_image(first_undo_image, first_undo_image_histogramInfo);
                              // save copy of original image to the window list and make is current
                              this.update_enhancements_target_image_window_list(this.global.enhancements_target_image_id);
                        }
                        let undo_image = this.create_undo_image(this.global.enhancements_target_image_id);
                        this.add_undo_image(undo_image, this.global.enhancements_target_histogram_info);
#ifdef AUTOINTEGRATE_STANDALONE
                        this.preview.updatePreviewIdReset(this.global.enhancements_target_image_id);
#endif
                        console.noteln("Apply completed (" + this.enhancements_gui_info.undo_images.length + "/" + this.enhancements_gui_info.undo_images.length + ")");
                        apply_ok = true;
                  } 
                  catch(err) {
                        if (first_undo_image != null) {
                              this.global.enhancements_target_image_id = saved_enhancements_target_image;
                        }
                        console.criticalln(err);
                        console.criticalln("Operation failed!");
                  }
                  this.engine.enhancementsApply = false;
                  this.util.runGarbageCollection();
                  if (this.apply_completed_callback != null) {
                        this.apply_completed_callback(apply_ok);
                  }
            }
}

createTargetImageSizerOnItemSelected(image_id)
{
      if (this.global.enhancements_target_image_id == image_id) {
            if (this.global.debug) console.writeln("createTargetImageSizerOnItemSelected: image_id " + image_id + " already selected");
            return;
      }
      this.close_undo_images();
      this.global.enhancements_target_image_id = image_id;
      if (this.global.debug) console.writeln("this.global.enhancements_target_image_id " + this.global.enhancements_target_image_id);
      if (this.target_image_selected_callback != null) {
            this.target_image_selected_callback(this.global.enhancements_target_image_id);
      }
      if (this.global.enhancements_target_image_id == "Auto" || this.global.enhancements_target_image_id == null) {
            this.preview.updatePreviewNoImage();
            this.enhancements_gui_info.save_button.enabled = false;
      } else {
            this.preview.setPreviewIdReset(this.global.enhancements_target_image_id, false);
            this.enhancements_gui_info.save_button.enabled = true;
      }
}

createTargetImageSizer(parent)
{
      if (this.global.debug) console.writeln("createTargetImageSizer");

      this.enhancementsImageLabel = new Label( parent );
      this.enhancementsImageLabel.text = "Target image";
      this.enhancementsImageLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.enhancementsImageLabel.toolTip = "<p>Target image for editing. By default edits are applied on a copy of the target image. Copied " + 
            "is named as <target image>_edit.</p>" +
            "<p>Auto option is used when enhancements are done with Run or AutoContinue option.</p>";
      this.enhancementsImageComboBox = new ComboBox( parent );
      var minItemCharWidthStr = "testxyz_Integration_RGB_processed_12"; // long name to have enough width for image names
      this.enhancementsImageComboBox.minItemCharWidth = minItemCharWidthStr.length;
      var self = this;
      this.enhancementsImageComboBox.onItemSelected = function( itemIndex )
      {
            self.createTargetImageSizerOnItemSelected(self.enhancements_target_image_window_list[itemIndex]);
      };
      this.enhancements_gui_info.images_combobox = this.enhancementsImageComboBox;

      this.update_enhancements_target_image_window_list(null);

      if (this.enhancements_target_image_window_list.length == 0 ||
          this.enhancements_target_image_window_list[0] == "Auto" ) 
      {
            this.global.enhancements_target_image_id = null;
            this.preview.updatePreviewNoImage();
      } else {
            this.global.enhancements_target_image_id = this.enhancements_target_image_window_list[0];
            this.preview.setPreviewIdReset(this.global.enhancements_target_image_id, false);
      }
      if (this.target_image_selected_callback != null) {
            this.target_image_selected_callback(this.global.enhancements_target_image_id);
      }

      this.enhancementsLoadTargetImageButton = new ToolButton( parent );
      this.enhancementsLoadTargetImageButton.icon = parent.scaledResource(":/icons/select-file.png");
      this.enhancementsLoadTargetImageButton.toolTip = "<p>Select file as target image.</p>";
      this.enhancementsLoadTargetImageButton.setScaledFixedSize( 20, 20 );
      this.enhancementsLoadTargetImageButton.onClick = function()
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

            self.createTargetImageSizerOnItemSelected(imageWindow.mainView.id);

            if (self.global.debug)console.writeln("this.util.updateStatusInfoLabel");
            self.util.updateStatusInfoLabel("Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height);
            self.update_enhancements_target_image_window_list(self.global.enhancements_target_image_id);
      };

      var notetsaved_note = "<p>Note that edited image is not automatically saved to disk.</p>";
      this.enhancementsApplyButton = new PushButton( parent );
      this.enhancementsApplyButton.text = "Apply";
      this.enhancementsApplyButton.toolTip = 
            "<p>Apply enhancements edits on the copy of the selected image. Auto option is used when enhancements are done with Run or AutoContinue option.</p>" +
            notetsaved_note;
      this.enhancementsApplyButton.onClick = function()
      {
            self.enhancementsApplyButtonOnClick();
      };   

      this.enhancementsUndoButton = new ToolButton( parent );
      this.enhancementsUndoButton.icon = new Bitmap( ":/icons/undo.png" );
      this.enhancementsUndoButton.toolTip = 
            "<p>Undo last enhancements edit operation.</p>" + notetsaved_note;
      this.enhancementsUndoButton.enabled = false;
      this.enhancementsUndoButton.onClick = function()
      {
            self.apply_undo();
      };
      this.enhancements_gui_info.undo_button = this.enhancementsUndoButton;

      this.enhancementsRedoButton = new ToolButton( parent );
      this.enhancementsRedoButton.icon = new Bitmap( ":/icons/redo.png" );
      this.enhancementsRedoButton.toolTip = 
            "<p>Redo last enhancements edit operation.</p>" + notetsaved_note;
      this.enhancementsRedoButton.enabled = false;
      this.enhancementsRedoButton.onClick = function()
      {
            self.apply_redo();
      };
      this.enhancements_gui_info.redo_button = this.enhancementsRedoButton;

      this.enhancementsSaveButton = new ToolButton( parent );
      this.enhancementsSaveButton.icon = new Bitmap( ":/icons/save-as.png" );
      this.enhancementsSaveButton.toolTip = 
            "<p>Save current edited image to disk as a XISF image and as a 16-bit TIFF image.</p>" + notetsaved_note;
      this.enhancementsSaveButton.enabled = false;
      this.enhancementsSaveButton.onClick = function()
      {
            self.save_as_undo();
      };
      this.enhancements_gui_info.save_button = this.enhancementsSaveButton;

      this.enhancementsHistoryButton = new ToolButton( parent );
      this.enhancementsHistoryButton.icon = new Bitmap( ":/history-explorer/history-explorer-window-icon.png" );
      this.enhancementsHistoryButton.toolTip = "<p>Show enhancements history.</p>";
      this.enhancementsHistoryButton.enabled = true;
      this.enhancementsHistoryButton.onClick = function()
      {
            if (this.enhancements_gui_info.undo_images.length <= 1) {
                  new MessageBox("No enhancements history", "Enhancements history", StdIcon.Information ).execute();
            } else {
                  var txt = "<p>Applied enhancements:</p><ul>";
                  for (var i = 1; i <= this.enhancements_gui_info.undo_images_pos; i++) {
                        for (var j = 0; j < this.enhancements_gui_info.undo_images[i].enhancements_info.length; j++) {
                              txt += "<li>" + this.enhancements_gui_info.undo_images[i].enhancements_info[j] + "</li>";
                        }
                  }
                  txt += "</ul>";
                  if (i < this.enhancements_gui_info.undo_images.length) {
                        txt += "<p><i>Not applied enhancements:</i></p><ul>";
                        for (; i < this.enhancements_gui_info.undo_images.length; i++) {
                              for (var j = 0; j < this.enhancements_gui_info.undo_images[i].enhancements_info.length; j++) {
                                    txt += "<li><i>" + this.enhancements_gui_info.undo_images[i].enhancements_info[j] + "</i></li>";
                              }
                        }
                        txt += "</ul>";
                  }
                  new MessageBox(txt, "Enhancements history", StdIcon.Information ).execute();
            }
      };
      this.metadataHistoryButton = new ToolButton(parent);
      this.metadataHistoryButton.icon = new Bitmap( ":/icons/document-edit.png" ); // :/toolbar/file-project-metadata.png
      this.metadataHistoryButton.toolTip = "<p>Print AutoIntegrate processing history information from image metadata to the Process Console.</p>";
      this.metadataHistoryButton.onClick = function()
      {
            var win = this.util.findWindow(this.global.enhancements_target_image_id);
            if (win == null) {
                  console.criticalln("No image");
                  return;
            }

            console.writeln("Image: " + win.mainView.id);
            var history = this.util.autointegrateProcessingHistory(win);
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

      this.enhancementsHelpTips = new ToolButton( parent );
      this.enhancementsHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      this.enhancementsHelpTips.setScaledFixedSize( 20, 20 );
      this.enhancementsHelpTips.toolTip = enhancementsLabeltoolTip;
      this.enhancementsHelpTips.onClick = function()
      {
            new MessageBox(enhancementsLabeltoolTip, "Enhancements", StdIcon.Information ).execute();
      }

      this.enhancementsImageSizer = new HorizontalSizer;
      this.enhancementsImageSizer.margin = 6;
      this.enhancementsImageSizer.spacing = 4;
      this.enhancementsImageSizer.add( this.enhancementsImageLabel );
      this.enhancementsImageSizer.add( this.enhancementsImageComboBox );
      this.enhancementsImageSizer.add( this.enhancementsLoadTargetImageButton );
      this.enhancementsImageSizer.add( this.enhancementsApplyButton );
      this.enhancementsImageSizer.add( this.enhancementsUndoButton );
      this.enhancementsImageSizer.add( this.enhancementsRedoButton );
      this.enhancementsImageSizer.add( this.enhancementsHistoryButton );
      this.enhancementsImageSizer.add( this.enhancementsSaveButton );
      this.enhancementsImageSizer.addStretch();
      this.enhancementsImageSizer.add( this.metadataHistoryButton );
      this.enhancementsImageSizer.add( this.enhancementsHelpTips );

      return this.enhancementsImageSizer;
}

createEnhancementsGUIControls(parent)
{
      this.enhancementsImageSizer = this.createTargetImageSizer(parent);

      this.enhancementsTargetImageControl = new Control( parent );
      this.enhancementsTargetImageControl.sizer = new VerticalSizer;
      this.enhancementsTargetImageControl.sizer.margin = 6;
      this.enhancementsTargetImageControl.sizer.spacing = 4;
      this.enhancementsTargetImageControl.sizer.add( this.enhancementsImageSizer );
      this.enhancementsTargetImageControl.sizer.addStretch();
      this.enhancementsTargetImageControl.visible = true;

      this.createEnhancementsControls(parent);

      return {
             targetImageControl: this.enhancementsTargetImageControl, 
             optionsControl: this.enhancementsTargetOptionsControl, 
             genericControl: this.enhancementsGenericControl, 
             narrowbandControl: this.echancementsNarrowbandControl, 
             starsControl: this.enhancementsStarsControl,
             selectiveColorControl: this.selectiveColorControl 
      };
}

/* Interface functions.

this.createTargetImageSizer = createTargetImageSizer;

this.createTargetImageSizerOnItemSelected = createTargetImageSizerOnItemSelected;   // For testing purposes
this.enhancementsApplyButtonOnClick = enhancementsApplyButtonOnClick;   // For testing purposes

this.createEnhancementsGUIControls = createEnhancementsGUIControls;

this.update_enhancements_target_image_window_list = update_enhancements_target_image_window_list;
this.close_undo_images = close_undo_images;
this.setPreviewControl = setPreviewControl;

*/

}

#endif // AUTOINTEGRATE_ENHANCEMENTS_GUI_JS
