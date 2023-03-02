/*
        AutoIntegrate GUI components.

Interface functions:

    See end of the file.

Interface objects:

    AutoIntegrateDialog

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2022 Jarmo Ruuth.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

Copyright (c) 2018-2022 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#include "../AdP/SearchCoordinatesDialog.js"

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
            cb.toolTip = "R: " + global.narrowBandPalettes[i].R + ", G: " + global.narrowBandPalettes[i].G + ", B: " + global.narrowBandPalettes[i].B;
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

var infoLabel;
var imageInfoLabel;
var windowPrefixHelpTips;              // For updating tooTip
var closeAllPrefixButton;              // For updating toolTip
var windowPrefixComboBox = null;       // For updating prefix name list
var outputDirEdit;                     // For updating output root directory
var tabPreviewControl = null;          // For updating preview window
var tabPreviewInfoLabel = null;        // For updating preview info text
var sidePreviewControl = null;         // For updating preview window
var mainTabBox = null;                 // For switching to preview tab
var sidePreviewInfoLabel = null;       // For updating preview info text

var tab_preview_index = 1;
var is_some_preview = false;
var preview_size_changed = false;
var preview_keep_zoom = false;

var current_selected_file_name = null;
var current_selected_file_filter = null;

var undo_images = [];
var undo_images_pos = -1;

var monochrome_text = "Monochrome: ";

var blink_window = null;
var blink_zoom = false;
var blink_zoom_x = 0;
var blink_zoom_y = 0;

var batch_narrowband_palette_mode = false;

var extra_target_image_window_list = null;

var filterSectionbars = [];
var filterSectionbarcontrols = [];

var extract_channel_mapping_values = [ "None", "LRGB", "HSO", "HOS" ];
var RGBNB_mapping_values = [ 'H', 'S', 'O', '' ];
var use_weight_values = [ 'Generic', 'Noise', 'Stars', 'PSF Signal', 'PSF Signal scaled', 'FWHM scaled', 'Eccentricity scaled', 'SNR scaled', 'Star count' ];
var filter_limit_values = [ 'None', 'FWHM', 'Eccentricity', 'PSFSignal', 'PSFPower', 'SNR', 'Stars'];
var outliers_methods = [ 'Two sigma', 'One sigma', 'IQR' ];
var use_linear_fit_values = [ 'Luminance', 'Red', 'Green', 'Blue', 'No linear fit' ];
var image_stretching_values = [ 'Auto STF', 'Masked Stretch', 'Arcsinh Stretch', 'Histogram stretch', 'Hyperbolic'];
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

var screen_size = "Unknown";       // Screen wxh size as a string

function isbatchNarrowbandPaletteMode()
{
      return (par.custom_R_mapping.val == "All" && par.custom_G_mapping.val == "All" && par.custom_B_mapping.val == "All") ||
              par.use_narrowband_multiple_mappings.val;
}

function previewControlCleanup(control)
{
      control.zoomIn_Button.onMousePress = null;
      control.zoomOut_Button.onMousePress = null;
      control.zoom11_Button.onMousePress = null;
      control.zoomFit_Button.onMousePress = null;
      control.scrollbox.onHorizontalScrollPosUpdated = null;
      control.scrollbox.onVerticalScrollPosUpdated = null;
      control.forceRedraw = null;
      control.scrollbox.viewport.onMouseWheel = null;
      control.scrollbox.viewport.onMousePress = null;
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
      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] != null && ppar.prefixArray[i][1] != '-') {
                  prefix_list = prefix_list + "<tr><td>" + (ppar.prefixArray[i][0] + 1) + '</td><td>' + ppar.prefixArray[i][1] + '</td><td>' + ppar.prefixArray[i][2] + '</td></tr>';
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
      var pa = get_win_prefix_combobox_array(default_prefix);
      addArrayToComboBox(windowPrefixComboBox, pa);
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
      }
      if (!from_exit) {
            setWindowPrefixHelpTip(ppar.win_prefix);
      }
}

function update_extra_target_image_window_list(parent, current_item)
{
      if (current_item == null) {
            // use item from dialog
            current_item = extra_target_image_window_list[parent.extraImageComboBox.currentItem];
      }

      extra_target_image_window_list = util.getWindowListReverse();
      extra_target_image_window_list.unshift("Auto");

      parent.extraImageComboBox.clear();
      for (var i = 0; i < extra_target_image_window_list.length; i++) {
            parent.extraImageComboBox.addItem( extra_target_image_window_list[i] );
      }

      // update dialog
      if (current_item)  {
            parent.extraImageComboBox.currentItem = extra_target_image_window_list.indexOf(current_item);
            parent.extraImageComboBox.setItemText(parent.extraImageComboBox.currentItem, extra_target_image_window_list[parent.extraImageComboBox.currentItem]);
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

function update_undo_buttons(parent)
{
      parent.extraUndoButton.enabled = undo_images.length > 0 && undo_images_pos > 0;
      parent.extraRedoButton.enabled = undo_images.length > 0 && undo_images_pos < undo_images.length - 1;
}

function copy_undo_edit_image(id)
{
      var copy_id = id + "_edit";
      var copy_win = util.copyWindowEx(ImageWindow.windowById(id), copy_id, true);
      console.writeln("Copy image " + copy_win.mainView.id);
      return copy_win.mainView.id;
}

function create_undo_image(id)
{
      var undo_id = id + "_undo_tmp";
      var undo_win = util.copyWindowEx(ImageWindow.windowById(id), undo_id, true);
      console.writeln("Create undo image " + undo_win.mainView.id);
      return undo_win.mainView.id;
}

function remove_undo_image(id)
{
      console.writeln("Remove undo image " + id);
      util.closeOneWindow(id);
}

function add_undo_image(parent, original_id, undo_id)
{
      console.writeln("add_undo_image");
      while (undo_images.length > undo_images_pos + 1) {
            var removed = undo_images.pop();
            console.writeln("Remove undo image " + removed);
            util.closeOneWindow(removed);
      }
      undo_images_pos++;
      console.writeln("undo_images_pos " + undo_images_pos);
      var new_undo_id = original_id + "_undo" + undo_images_pos;
      util.windowRenameKeepifEx(undo_id, new_undo_id, false, true);
      console.writeln("Add undo image " + new_undo_id);
      undo_images[undo_images_pos] = new_undo_id;
      update_undo_buttons(parent);
}

function apply_undo(parent)
{
      console.writeln("apply_undo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (undo_images_pos <= 0) {
            console.noteln("Nothing to undo");
            return;
      }
      console.noteln("Apply undo on image " + global.extra_target_image);
      var target_win = ImageWindow.windowById(global.extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.extra_target_image);
            return;
      }
      var source_win = ImageWindow.windowById(undo_images[undo_images_pos - 1]);
      if (source_win == null) {
            console.criticalln("Failed to find undo image " + undo_images[undo_images_pos - 1]);
            return;
      }
      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_win.mainView.image );
      target_win.mainView.endProcess();

      forceNewHistogram(target_win);
      
      updatePreviewIdReset(global.extra_target_image, true);
      
      undo_images_pos--;
      console.writeln("undo_images_pos " + undo_images_pos);
      update_undo_buttons(parent);
}

function apply_redo(parent)
{
      console.writeln("apply_redo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (undo_images_pos >= undo_images.length - 1) {
            console.noteln("Nothing to redo");
            return;
      }
      console.noteln("Apply redo on image " + global.extra_target_image);
      var target_win = ImageWindow.windowById(global.extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + global.extra_target_image);
            return;
      }
      var source_win = ImageWindow.windowById(undo_images[undo_images_pos + 1]);
      if (source_win == null) {
            console.criticalln("Failed to find redo image " + undo_images[undo_images_pos + 1]);
            return;
      }
      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_win.mainView.image );
      target_win.mainView.endProcess();
      updatePreviewIdReset(global.extra_target_image, true);
      undo_images_pos++;
      console.writeln("undo_images_pos " + undo_images_pos);
      update_undo_buttons(parent);
}

function save_as_undo(parent)
{
      console.writeln("save_as_undo");
      if (global.extra_target_image == null || global.extra_target_image == "Auto" || undo_images.length == 0) {
            console.criticalln("No target image!");
            return;
      }

      let saveFileDialog = new SaveFileDialog();
      saveFileDialog.caption = "Save As";
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
      var copy_id = File.extractName(saveFileDialog.fileName);
      var save_win = ImageWindow.windowById(global.extra_target_image);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      var filename = saveFileDialog.fileName;
      if (File.extractExtension(filename) == "") {
            filename = filename + ".xisf";
      }
      console.noteln("Save " + global.extra_target_image + " as " + filename);
      if (!save_win.saveAs(filename, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + filename);
      }
      update_undo_buttons(parent);
      if (copy_id != global.extra_target_image) {
            // Rename old image
            save_win.mainView.id = copy_id;
            // Update preview name
            updatePreviewTxt(copy_id);
            // Update target list
            update_extra_target_image_window_list(parent, copy_id);
      }
}

function close_undo_images(parent)
{
      if (undo_images.length > 0) {
            console.writeln("Close undo images");
            for (var i = 0; i < undo_images.length; i++) {
                  util.closeOneWindow(undo_images[i]);
            }
            undo_images = [];
            undo_images_pos = -1;
            update_undo_buttons(parent);
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
       cb.checked = cb.aiParam.val;
       if (onClick != null) {
             cb.onClick = onClick;
       } else {
             cb.onClick = function(checked) { 
                  cb.aiParam.val = checked;
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
             cb.toolTip = toolTip; 
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
       cb.toolTip = toolTip; 
 
       return cb;
 }
 
function newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = toolTip; 
      }

      return gb;
}

function Autorun(parent)
{
      var stopped = true;
      var savedOutputRootDir = global.outputRootDir;
      batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
      if (par.batch_mode.val) {
            stopped = false;
            console.writeln("AutoRun in batch mode");
      } else if (batch_narrowband_palette_mode) {
            console.writeln("AutoRun in narrowband palette batch mode");
      } else {
            console.writeln("AutoRun");
      }
      do {
            if (global.lightFileNames == null) {
                  global.lightFileNames = engine.openImageFiles("Light", true, false);
                  if (global.lightFileNames != null) {
                        parent.dialog.treeBox[global.pages.LIGHTS].clear();
                        addFilesToTreeBox(parent.dialog, global.pages.LIGHTS, global.lightFileNames);
                        updateInfoLabel(parent.dialog);
                  }
            }
            if (global.lightFileNames != null) {
                  try {
                        if (batch_narrowband_palette_mode) {
                            engine.autointegrateNarrowbandPaletteBatch(parent.dialog, false);
                        } else {
                            engine.autointegrateProcessingEngine(parent.dialog, false, false);
                        }
                        update_extra_target_image_window_list(parent.dialog, null);
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        engine.writeProcessingSteps(null, false, null);
                  }
                  if (par.batch_mode.val) {
                        global.outputRootDir = savedOutputRootDir;
                        global.lightFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        engine.closeAllWindows(par.keep_integrated_images.val, true);
                  }
            } else {
                  stopped = true;
            }
      } while (!stopped);
      global.outputRootDir = savedOutputRootDir;
}

function newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function newLabel(parent, text, tip)
{
      var lbl = new Label( parent );
      lbl.text = text;
      lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      lbl.toolTip = tip;

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
      edt.toolTip = tooltip;
      edt.aiParam.reset = function() {
            edt.text = edt.aiParam.val;
      };
      return edt;
}

function newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = tooltip;
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
      };
      return edt;
}

function newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

function newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

function newNumericControl(parent, txt, param, min, max, tooltip)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.setRange(min, max);
      edt.setPrecision(3);
      edt.aiParam = param;
      edt.setValue(edt.aiParam.val);
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.toolTip = tooltip;
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
      };
      return edt;
}

function newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = tooltip;
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
      edt.toolTip = tooltip;
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
      cb.toolTip = tooltip;
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
      cb.toolTip = tooltip;
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
      cb.toolTip = tooltip;
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
      cb.toolTip = tooltip;
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
      label.toolTip = toolTip;
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

function updatePreviewImageBmp(updPreviewControl, imgWin, bmp)
{
      if (updPreviewControl == null) {
            return;
      }
      if ((is_some_preview && !global.is_processing) || preview_keep_zoom) {
            updPreviewControl.UpdateImage(imgWin, bmp);
      } else {
            updPreviewControl.SetImage(imgWin, bmp);
      }
}

function updatePreviewTxt(txt)
{
      txt = "<b>Preview</b> " + txt;
      if (tabPreviewInfoLabel != null) {
            tabPreviewInfoLabel.text = txt;
      }
      if (sidePreviewInfoLabel != null) {
            sidePreviewInfoLabel.text = txt;
      }
}

function updatePreviewWinTxt(imgWin, txt)
{
      if (global.use_preview && imgWin != null) {
            if (preview_size_changed) {
                  if (tabPreviewControl != null) {
                        tabPreviewControl.setSize(ppar.preview.preview_width, ppar.preview.preview_height);
                  }
                  if (sidePreviewControl != null) {
                        sidePreviewControl.setSize(ppar.preview.preview_width, ppar.preview.preview_height);
                  }
                  preview_size_changed = false;
            }
            var bmp = getWindowBitmap(imgWin);
            updatePreviewImageBmp(tabPreviewControl, imgWin, bmp);
            updatePreviewImageBmp(sidePreviewControl, imgWin, bmp);
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
      if (!global.use_preview) {
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
            engine.runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, false);
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

function updatePreviewIdReset(id, keep_zoom)
{
      if (global.use_preview) {
            preview_keep_zoom = keep_zoom;
            var win = ImageWindow.windowById(id);
            updatePreviewWinTxt(win, id);
            util.updateStatusInfoLabel("Size: " + win.mainView.image.width + "x" + win.mainView.image.height);
            is_some_preview = false;
            global.is_processing = false;
      }
}

function updatePreviewNoImageInControl(control)
{
      var bitmap = new Bitmap(ppar.preview.preview_width - ppar.preview.preview_width/10, ppar.preview.preview_height - ppar.preview.preview_height/10);
      bitmap.fill(0xff808080);

      var graphics = new Graphics(bitmap);
      graphics.transparentBackground = true;

      graphics.pen = new Pen(0xff000000, 4);
      graphics.font.bold = true;
      var txt = global.autointegrate_version;
      var txtLen = graphics.font.width(txt);
      graphics.drawText(bitmap.width / 2 - txtLen / 2, bitmap.height / 2, txt);

      graphics.end();
      
      var startupWindow = new ImageWindow(
                                    bitmap.width,
                                    bitmap.height,
                                    1,
                                    32,
                                    true,
                                    false,
                                    "AutoIntegrate_startup_preview");

      startupWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      startupWindow.mainView.image.blend(bitmap);
      startupWindow.mainView.endProcess();

      control.UpdateImage(startupWindow, getWindowBitmap(startupWindow));

      startupWindow.forceClose();
}

function updatePreviewNoImage()
{
      if (global.use_preview) {
            updatePreviewNoImageInControl(tabPreviewControl);
            updatePreviewNoImageInControl(sidePreviewControl);
            updatePreviewTxt("No preview");
            util.updateStatusInfoLabel("");
      }
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

function validateWindowPrefix(p)
{
      p = p.replace(/[^A-Za-z0-9]/gi,'_');
      //p = p.replace(/_+$/,'');
      if (p.match(/^\d/)) {
            // if user tries to start prefix with a digit, prepend an underscore
            p = "_" + p;
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
      if (ppar.win_prefix != "" && !ppar.win_prefix.endsWith("_")) {
            ppar.win_prefix = ppar.win_prefix + "_";
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
            ppar.win_prefix = validateWindowPrefix(windowPrefixComboBox.editText.trim());
            windowPrefixComboBox.editText = ppar.win_prefix;
      };

      // Add help button to show known prefixes. Maybe this should be in
      // label and edit box toolTips.
      windowPrefixHelpTips = new ToolButton( parent );
      windowPrefixHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      windowPrefixHelpTips.setScaledFixedSize( 20, 20 );
      windowPrefixHelpTips.toolTip = "Current Window Prefixes:";

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( lbl );
      winprefix_Sizer.add( windowPrefixComboBox );
      winprefix_Sizer.add( windowPrefixHelpTips );

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
            toolTip = toolTip + "<br>ssweight: " + node.ssweight;
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
                  node.best_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  global.user_selected_best_image = node.filename;
            } else if (node.best_image) {
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
            console.writeln("set_user_selected_reference_image, add filter " + filter + " and image " + reference_image);
            global.user_selected_reference_image[global.user_selected_reference_image.length] = [ reference_image, filter ];
      }
}

function setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter)
{
      if (node.numberOfChildren == 0 && (filter == null || node.filter == filter)) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (reference_image != null && util.compareReferenceFileNames(reference_image, node.filename, filename_postfix)) {
                  //console.writeln("setReferenceImageInTreeBoxNode found reference image");
                  node.reference_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  set_user_selected_reference_image(node.filename, filter);
            } else if (node.reference_image) {
                  //console.writeln("setReferenceImageInTreeBoxNode clear old reference image " + node.filename);
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
      var pagearray = engine.openImageFiles("Json", false, true);
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
}

function addOneFilesButton(parent, filetype, pageIndex, toolTip)
{
      var filesAdd_Button = new PushButton( parent );
      parent.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = toolTip;
      filesAdd_Button.onClick = function()
      {
            var pagearray = engine.openImageFiles(filetype, false, false);
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
      lbl.text = "Target type";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give target type.</p>" +
                    "<p>If target type is given then image stretching settings are selected automatically.</p>" +
                    "<p>If no target type is given then current settings are used. They should work reasonably fine in many cases.</p>";
      var galaxyCheckBox = newCheckBox(parent, "Galaxy", par.target_type_galaxy, "<p>Target is galaxy. Works well when target is a lot brighter than the background.</p>" );
      var nebulaCheckBox = newCheckBox(parent, "Nebula", par.target_type_nebula, "<p>Target is nebula. Works well when target fills the whole image or is not much brighter than the background.</p>" );
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( galaxyCheckBox );
      outputdir_Sizer.add( nebulaCheckBox );

      return outputdir_Sizer;
}


function addFilesButtons(parent)
{
      var addLightsButton = addOneFilesButton(parent, "Lights", global.pages.LIGHTS, parent.filesToolTip[global.pages.LIGHTS]);
      var addBiasButton = addOneFilesButton(parent, "Bias", global.pages.BIAS, parent.filesToolTip[global.pages.BIAS]);
      var addDarksButton = addOneFilesButton(parent, "Darks", global.pages.DARKS, parent.filesToolTip[global.pages.DARKS]);
      var addFlatsButton = addOneFilesButton(parent, "Flats", global.pages.FLATS, parent.filesToolTip[global.pages.FLATS]);
      var addFlatDarksButton = addOneFilesButton(parent, "Flat Darks", global.pages.FLAT_DARKS, parent.filesToolTip[global.pages.FLAT_DARKS]);

      var target_type_sizer = addTargetType(parent);

      var winprefix_sizer = addWinPrefix(parent);
      var outputdir_sizer = addOutputDir(parent);

      var filesButtons_Sizer1 = new HorizontalSizer;
      parent.rootingArr.push(filesButtons_Sizer1);
      filesButtons_Sizer1.spacing = 4;
      filesButtons_Sizer1.add( addLightsButton );
      filesButtons_Sizer1.add( addBiasButton );
      filesButtons_Sizer1.add( addDarksButton );
      filesButtons_Sizer1.add( addFlatsButton );
      filesButtons_Sizer1.add( addFlatDarksButton );

      var filesButtons_Sizer2 = new HorizontalSizer;
      parent.rootingArr.push(filesButtons_Sizer2);
      filesButtons_Sizer1.spacing = 4;
      filesButtons_Sizer1.margin = 4;
      filesButtons_Sizer2.add( target_type_sizer );
      filesButtons_Sizer2.addStretch();
      filesButtons_Sizer2.addSpacing( 12 );
      filesButtons_Sizer2.add( winprefix_sizer );
      filesButtons_Sizer2.add( outputdir_sizer );

      if (ppar.use_single_column || ppar.use_more_tabs) {
            var filesButtons_Sizer = new VerticalSizer;
            parent.rootingArr.push(filesButtons_Sizer);
            filesButtons_Sizer.add( filesButtons_Sizer1 );
            filesButtons_Sizer.add( filesButtons_Sizer2 );
            filesButtons_Sizer1.addStretch();
      } else {
            var filesButtons_Sizer = new HorizontalSizer;
            parent.rootingArr.push(filesButtons_Sizer);
            filesButtons_Sizer.add( filesButtons_Sizer1 );
            filesButtons_Sizer.addSpacing( 12 );
            filesButtons_Sizer.add( filesButtons_Sizer2 );
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
            filesAdd_Button.toolTip = "Add color/OSC/DSLR files";
      } else {
            filesAdd_Button.toolTip = "Add " + filetype + " files";
      }
      filesAdd_Button.onClick = function() {
            var imageFileNames = engine.openImageFiles(filetype, true, false);
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
      sb.toolTip = "Select manually files for each filter. Useful if filters are not recognized automatically.";
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
      // files_TreeBox.setScaledMinSize( 300, 150 );
      files_TreeBox.setScaledMinSize( 150, 150 );
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
                                    var ssweighttxt = " ssweight: " + files_TreeBox.currentNode.ssweight.toFixed(5);
                              }
                        } else {
                              var ssweighttxt = "";
                        }
                        if (files_TreeBox.currentNode.hasOwnProperty("exptime")) {
                              var exptimetxt = " exptime: " + files_TreeBox.currentNode.exptime;
                        } else {
                              var exptimetxt = "";
                        }
                        var imageInfoTxt = "Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height +
                                             ssweighttxt + exptimetxt;
                        engine.runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, true);
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
                              updatePreviewWin(imageWindow);
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
      let obj = newPageButtonsSizer(parent);
      parent.rootingArr.push(obj);
      filesControl.sizer.add(obj);
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
      global.saved_measurements = null;    // files changed, we need to make new measurements

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
            } else {
                  // default value, remove possible setting
                  Settings.remove(name);
            }
      }
}

function newPushorToolButton(parent, icon, txt, tooltip, action, toolbutton)
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
      button.toolTip = tooltip;

      return button;
}

function newRunButton(parent, toolbutton)
{
      var run_action = function()
      {
            exitFromDialog();
            if (global.ai_get_process_defaults) {
                  engine.getProcessDefaultValues();
                  return;
            }     
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
      };
      return newPushorToolButton(
                  parent,
                  ":/icons/power.png",
                  "Run",
                  "Run the script.",
                  run_action,
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
            close_undo_images(parent.dialog);
            exitCleanup(parent.dialog);
            console.noteln("Close dialog");
            parent.dialog.cancel();
      };

      return newPushorToolButton(
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
            if (global.is_processing) {
                  console.noteln("Cancel requested...");
                  global.cancel_processing = true;
            }
      };

      return newPushorToolButton(
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

            util.clearDefaultDirs();
            getFilesFromTreebox(parent.dialog);
            batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
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
                        engine.autointegrateProcessingEngine(parent.dialog, true, util.is_narrowband_option());
                  }
                  global.run_auto_continue = false;
                  util.setDefaultDirs();
                  update_extra_target_image_window_list(parent.dialog, null);
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
                  engine.writeProcessingSteps(null, true, null);
                  global.run_auto_continue = false;
                  util.setDefaultDirs();
                  fix_win_prefix_array();
            }
      };

      return newPushorToolButton(
            parent,
            ":/icons/goto-next.png",
            "AutoContinue",
            "AutoContinue - Run automatic processing from previously created LRGB, narrowband or Color images." +
            "<p>Image check order is:</p>" +
            "<ol>" +
            "<li>AutoLRGB, AutoRGB, AutoRRGB or AutoMono - Final image for extra processing</li>" +
            "<li>L_HT + RGB_HT - Manually stretched L and RGB images</li>" +
            "<li>RGB_HT - Manually stretched RGB image</li>" +
            "<li>Integration_L_DBE + Integration_RGB_DBE - Background extracted L and RGB images</li>" +
            "<li>Integration_RGB_DBE - Background extracted RGB image</li>" +
            "<li>Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE -  Background extracted channel images</li>" +
            "<li>Integration_H_DBE + Integration_S_DBE + Integration_O_DBE -  Background extracted channel images</li>" +
            "<li>Light file list - Integrated channel/RGB images if only one image for a filter</li>" +
            "<li>Integration_RGB_color - Integrated Color RGB image</li>" +
            "<li>Integration_RGB_narrowband - Integrated narrowband RGB image</li>" +
            "<li>Integration_<i>channel</i>_processed - <i>channel</i> can be LRGBHSO</li>" +
            "<li>Integration_H + Integration_S + Integration_O - Integrated channel images</li>" +
            "<li>Integration_L + Integration_R + Integration_G + Integration_B - Integrated channel images</li>" +
            "<li>Integration_L_start + Integration_RGB_start - Integrated L and RGB image</li>" +
            "<li>Integration_RGB_start - Integrated RGB image</li>" +
            "</ol>" +
            "<p>" +
            "Not all images must be present, for example L image can be missing.<br>" +
            "RGB = Combined image, can be RGB or HSO.<br>" +
            "HT = Histogram Transformation, image is manually stretched to non-liner state.<br>" +
            "DBE = Background Extracted, for example manual DBE is run on image.<br>" +
            "Integration = Individual light images are integrated into one image.<br>" +
            "</p>",
            autocontinue_action,
            toolbutton
      );
}

function newAdjustToContentButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/toolbar/preview-reset.png" );
      button.toolTip = "Adjust script window to content.";
      button.onMousePress = function()
      {
            parent.adjustToContents();
      };
      return button;
}

function blinkArrowButton(parent, icon, x, y)
{
      var blinkArrowButton = new ToolButton( parent );
      parent.rootingArr.push(blinkArrowButton);
      blinkArrowButton.icon = parent.scaledResource(icon);
      blinkArrowButton.toolTip = "Blink window move zoomed area";
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

function newPageButtonsSizer(parent)
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
            blinkFitButton.toolTip = "Blink window zoom to optimal fit";
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
            blinkZoomButton.toolTip = "Blink window zoom to 1:1";
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
      // Load and save
      var jsonLabel = new Label( parent );
      parent.rootingArr.push(jsonLabel);
      jsonLabel.text = "Setup file";
      jsonLabel.toolTip = "Restoring script setup from a file, saving script setup to a file.";
      jsonLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      
      var jsonLoadButton = new ToolButton( parent );
      parent.rootingArr.push(jsonLoadButton);
      jsonLoadButton.icon = parent.scaledResource(":/icons/select-file.png");
      jsonLoadButton.toolTip = "Restore script setup from a Json file.";
      jsonLoadButton.setScaledFixedSize( 20, 20 );
      jsonLoadButton.onClick = function()
      {
            loadJsonFile(parent.dialog);
      };
      var jsonSaveButton = new ToolButton( parent );
      parent.rootingArr.push(jsonSaveButton);
      jsonSaveButton.icon = parent.scaledResource(":/icons/save.png");
      jsonSaveButton.toolTip = "<p>Save file lists to a Json file including checked status.</p><p>Image names from all pages are saved including light and calibration files.</p>";
      jsonSaveButton.setScaledFixedSize( 20, 20 );
      jsonSaveButton.onClick = function()
      {
            util.saveJsonFile(parent.dialog, false);
      };
      var jsonSaveWithSewttingsButton = new ToolButton( parent );
      parent.rootingArr.push(jsonSaveWithSewttingsButton);
      jsonSaveWithSewttingsButton.icon = parent.scaledResource(":/toolbar/file-project-save.png");
      jsonSaveWithSewttingsButton.toolTip = "<p>Save current settings and file lists to a Json file. All non-default settings are saved. " + 
                                            "Current window prefix and output directory is also saved.</p>" + 
                                            "<p>Images names from all pages are saved including light and calibration files. Checked status for files is saved</p>";
      jsonSaveWithSewttingsButton.setScaledFixedSize( 20, 20 );
      jsonSaveWithSewttingsButton.onClick = function()
      {
            util.saveJsonFile(parent.dialog, true);
      };
      
      var currentPageLabel = new Label( parent );
      parent.rootingArr.push(currentPageLabel);
      currentPageLabel.text = "Current page";
      currentPageLabel.toolTip = "Operations on the current page.";
      currentPageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

      var currentPageCheckButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCheckButton);
      currentPageCheckButton.icon = parent.scaledResource(":/icons/check.png");
      currentPageCheckButton.toolTip = "Mark all files in the current page as checked.";
      currentPageCheckButton.setScaledFixedSize( 20, 20 );
      currentPageCheckButton.onClick = function()
      {
            checkAllTreeBoxFiles(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex]);
      };
      var currentPageClearButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageClearButton);
      currentPageClearButton.icon = parent.scaledResource(":/icons/clear.png");
      currentPageClearButton.toolTip = "Clear the list of input images in the current page.";
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
            }
      };
      var currentPageCollapseButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCollapseButton);
      currentPageCollapseButton.icon = parent.scaledResource(":/browser/collapse.png");
      currentPageCollapseButton.toolTip = "Collapse all sections in the current page.";
      currentPageCollapseButton.setScaledFixedSize( 20, 20 );
      currentPageCollapseButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], false);
      };
      var currentPageExpandButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageExpandButton);
      currentPageExpandButton.icon = parent.scaledResource(":/browser/expand.png");
      currentPageExpandButton.toolTip = "Expand all sections in the current page.";
      currentPageExpandButton.setScaledFixedSize( 20, 20 );
      currentPageExpandButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], true);
      };
      var currentPageFilterButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageFilterButton);
      currentPageFilterButton.icon = parent.scaledResource(":/icons/filter.png");
      currentPageFilterButton.toolTip = "Filter and sort files based on current weighting and filtering settings. Only checked files are used. " +
                                        "Without any filtering rules files are just sorted by weighting setting.";
      currentPageFilterButton.setScaledFixedSize( 20, 20 );
      currentPageFilterButton.onClick = function()
      {
            filterTreeBoxFiles(parent.dialog, parent.dialog.tabBox.currentPageIndex);
      };

      var bestImageLabel = newLabel( parent, "Reference images", "Selecting the reference images for star alignment, image integration and local normalization.");

      var setBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(setBestImageButton);
      setBestImageButton.icon = parent.scaledResource(":/icons/ok-button.png");
      setBestImageButton.toolTip = "Set current preview/selected image as the reference image for star alignment.";
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
      setReferenceImageButton.toolTip = "Set current preview/selected image as the reference image for current filter for image integration and local normalization.";
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
      clearBestImageButton.toolTip = "Clear all reference image settings.";
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
      }
      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( jsonLabel );
      buttonsSizer.add( jsonLoadButton );
      buttonsSizer.add( jsonSaveButton );
      buttonsSizer.add( jsonSaveWithSewttingsButton );

      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( currentPageLabel );
      buttonsSizer.add( currentPageCheckButton );
      buttonsSizer.add( currentPageClearButton );
      buttonsSizer.add( currentPageCollapseButton );
      buttonsSizer.add( currentPageExpandButton );
      buttonsSizer.add( currentPageFilterButton );

      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( bestImageLabel );
      buttonsSizer.add( setBestImageButton );
      buttonsSizer.add( setReferenceImageButton );
      buttonsSizer.add( clearBestImageButton );
      buttonsSizer.add( findBestImageButton );

      buttonsSizer.addStretch();
      let obj = newLabel(parent, "Actions", "Script actions, these are the same as in the bottom row of the script.");
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      buttonsSizer.addSpacing( 6 );
      obj = newCancelButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      buttonsSizer.addSpacing( 6 );
      obj = newAutoContinueButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      buttonsSizer.addSpacing( 6 );
      obj = newRunButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      obj = newExitButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );

      buttonsSizer.addSpacing( 6 );
      obj = newAdjustToContentButton(parent);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );

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
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );
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
      var bmp = new Bitmap(imgWin.mainView.image.width, imgWin.mainView.image.height);
      bmp.assign(imgWin.mainView.image.render());
      return bmp;
}

function newPreviewObj(parent)
{
      var newPreviewControl = new AutoIntegratePreviewControl(parent, par, ppar.preview.preview_width, ppar.preview.preview_height);

      var previewImageSizer = new Sizer();
      previewImageSizer.add(newPreviewControl);

      var newPreviewInfoLabel = new Label( parent );
      newPreviewInfoLabel.text = "<b>Preview</b> No preview";
      newPreviewInfoLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      newPreviewInfoLabel.useRichText = true;

      var newStatusInfoLabel = new Label( parent );
      newStatusInfoLabel.text = "";
      newStatusInfoLabel.textAlignment = TextAlign_VertCenter;

      var previewSizer = new VerticalSizer;
      previewSizer.margin = 6;
      previewSizer.spacing = 10;
      previewSizer.add(newPreviewInfoLabel);
      previewSizer.add(newStatusInfoLabel);
      previewSizer.add(previewImageSizer);

      updatePreviewNoImageInControl(newPreviewControl);

      return { control: newPreviewControl, infolabel: newPreviewInfoLabel, 
               statuslabel: newStatusInfoLabel, sizer: previewSizer };
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
            sidePreviewInfoLabel.show();
            global.sideStatusInfoLabel.show();
            sidePreviewControl.show();

            tabPreviewInfoLabel.hide();
            global.tabStatusInfoLabel.hide();
            tabPreviewControl.hide();

            if (!ppar.use_single_column && mainTabBox != null) {
                  mainTabBox.setPageLabel(tab_preview_index, "Extra processing");
            }

            ppar.preview.side_preview_visible = true;

      } else {      
            sidePreviewInfoLabel.hide();
            global.sideStatusInfoLabel.hide();
            sidePreviewControl.hide();

            tabPreviewInfoLabel.show();
            global.tabStatusInfoLabel.show();
            tabPreviewControl.show();

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

function updatePreviewSize(w, h)
{
      preview_size_changed = true;

      if (w > 0) {
            ppar.preview.preview_width = w;
      }
      if (h > 0) {
            ppar.preview.preview_height = h;
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
                  console.writeln("Update existing preview size for screen size " + screen_size + " to " + ppar.preview.preview_sizes[i][1] + ", " + ppar.preview.preview_sizes[i][2]);
                  return;
            }
      }
      /* Not found, add a new one. */
      ppar.preview.preview_sizes[ppar.preview.preview_sizes.length] = [ screen_size, ppar.preview.preview_width, ppar.preview.preview_height ];
      console.writeln("Add a new preview size for screen size " + screen_size + " as " + ppar.preview.preview_sizes[i][1] + ", " + ppar.preview.preview_sizes[i][2]);
}

function getPreviewSize(availableScreenRect)
{
      ppar.preview.preview_width = 0;
      ppar.preview.preview_height = 0;

      if (ppar.preview.preview_sizes == undefined) {
            ppar.preview.preview_sizes = [];
      }

      /* Try to find a saved screen size for this resolution. */
      for (var i = 0; i < ppar.preview.preview_sizes.length; i++) {
            if (ppar.preview.preview_sizes[i][0] == screen_size) {
                  ppar.preview.preview_width = ppar.preview.preview_sizes[i][1];
                  ppar.preview.preview_height = ppar.preview.preview_sizes[i][2];
            }
      }

      if (ppar.preview.preview_width == 0 || ppar.preview.preview_width == 0) {
            /* Preview size not set for this screen size. */
            if (availableScreenRect != undefined) {
                  /* Calculate preview size from screen size.
                   * Use a small preview size as a default to ensure that it fits on screen. 
                   */
                  let preview_size = Math.floor(Math.min(availableScreenRect.width * 0.3, availableScreenRect.height * 0.3));
                  preview_size = Math.min(preview_size, 400);
                  ppar.preview.preview_width = preview_size;
                  ppar.preview.preview_height = preview_size;
            } else {
                  /* Use a default size. 
                   */
                  console.writeln("Could not get screen size, use a default preview size.");
                  ppar.preview.preview_width = 300;
                  ppar.preview.preview_height = 300;
            }
      }
      console.writeln("Screen size " + screen_size +  ", using preview size " + ppar.preview.preview_width + "x" + ppar.preview.preview_height);
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

       if (this.availableScreenRect != undefined) {
            screen_size = this.availableScreenRect.width + "x" + this.availableScreenRect.height;
       }

       if (ppar.preview.use_preview) {
            getPreviewSize(this.availableScreenRect);
      }

      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      this.rootingArr = [];    // for rooting objects

      var mainHelpTips = 
      "<p>" +
      "<b>AutoIntegrate - Automatic image processing utility</b>" +
      "</p><p>" +
      "Script automates initial steps of image processing in PixInsight. "+ 
      "It can calibrate images or it can be used with already calibrated images. "+ 
      "Most often you get the best results by running the script with default " +
      "settings and then continue processing in PixInsight." +
      "</p><p>"+
      global.directoryInfo +
      "</p><p>" +
      "User can give output root directory which can be relative or absolute path." +
      "</p><p>"+
      "Always remember to check you data with Blink tool and remove all bad images." +
      "</p><p>" +
      "Batch mode is intended to be used with mosaic images. In Batch mode script " +
      "automatically asks files for the next mosaic panel. All mosaic panels are left open " +
      "and can be saved with Save batch result files buttons." +
      "</p><p>" +
      "When using color/OSC/RAW files it is recommended to set Pure RAW in PixInsight settings." +
      "</p><p>" +
      "For more details see:" +
      "</p>" +
      "<ul>" +
      "<li>Web site: https://ruuth.xyz/AutoIntegrateInfo.html</ul>" +
      "<li>Discussion forums: https://forums.ruuth.xyz<>" +
      "<li>Discord: https://discord.gg/baqMqmKS3N</ul>" +
      "</ul>" +
      "<p>" +
      "This product is based on software from the PixInsight project, developed " +
      "by Pleiades Astrophoto and its contributors (https://pixinsight.com/)." +
      "</p><p>" +
      "Copyright (c) 2018-2022 Jarmo Ruuth<br>" +
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
            "<li>Load star aligned *_r.xisf files as light files.</li>" + 
            "<li>Set Window prefix to avoid overwriting files in the first step.</li>" + 
            "<li>Check <i>Comet align</i> in <i>Image processing parameters</i>.</li>" +
            "<li>Check <i>Remove stars from lights</i> in <i>Image processing parameters</i>.</li>" +
            "<li>Check <i>No CosmetiCorrection</i> in <i>Image processing parameters</i>.</li>" +
            "<li>Go to the <i>Processing tab</i> and <i>CometAlignment</i> section.</li>" +
            "<li>Fill first and last comet position coordinates. Note that the first and last images " + 
                "are selected automatically based on image timestamps from the DATE-OBS keyword when images are loaded.</li>" +
            "<li>To get the coordinates click the <i>Preview</i> button for the image, go to preview image tab, zoom " + 
                  "to 1:1 view and click the comet nucleus with the left mouse button.</li>" + 
            "<li>Copy coordinates from the preview coordinates box and paste them to the comet coordinates box.</li>" +
            "<li>Use the <i>Run</i> button to process images.</li>" +
            "</ul>" + 
            "<p>Comet alignment will automatically skip star alignment and SCNR. If you are not using already star aligned images " + 
               "then Star alignment may invalidate coordinates given here so it is not used.</p>" +
            "<p>Note that using starless images may cause problems for example with ImageIntegration or BlurXTerminator. With missing PSF error in ImageIntegration " +
            "you can use an option <i>ImageIntegration use ssweight</i>. " + BXT_no_PSF_tip + "</p>" + 
            "<p>It is possible to manually run the CometAlignment process. Below are the steps to use AutoIntegrate with manual comet alignment:</p>" + 
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

      // Run, Exit and AutoContinue buttons
      this.run_Button = newRunButton(this, false);
      this.exit_Button = newExitButton(this, false);
      this.cancel_Button = newCancelButton(this, false);
      this.autoContinueButton = newAutoContinueButton(this, false);
      
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
      this.filesButtonsSizer = addFilesButtons(this);

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
            "<p>Do not run CosmeticCorrection on image files</p>" );
      this.SubframeSelectorCheckBox = newCheckBox(this, "No SubframeSelector", par.skip_subframeselector, 
            "<p>Do not run SubframeSelector to get image weights</p>" );
      this.CometAlignCheckBox = newCheckBox(this, "Comet align", par.comet_align, 
            "<p>If checked, run CometAlign process using settings in the <i>CometAlignment settings</i> section in <i>Processing</i> tab.</p>" +
            comet_alignment_toolTip);
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
            "that can be used to crop files to common are during AutoContinue.</p>" );
      this.imageWeightTestingCheckBox = newCheckBox(this, "Image weight testing ", par.image_weight_testing, 
            "<p>Run only SubframeSelector to output image weight information and outlier filtering into AutoIntegrate.log AutoWeights.json. " +
            "Json file can be loaded as input file list.</p>" +
            "<p>With this option no output image files are written.</p>" );
      this.ChannelCombinationOnlyCheckBox = newCheckBox(this, "ChannelCombination only", par.channelcombination_only, 
            "<p>Run only channel combination to linear RGB file. No autostretch or color calibration.</p>" );
      /* this.relaxedStartAlignCheckBox = newCheckBox(this, "Strict StarAlign", par.strict_StarAlign, 
            "<p>Use more strict StarAlign par. When set more files may fail to align.</p>" ); */
      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", par.keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.resetOnSetupLoadCheckBox = newCheckBox(this, "Reset on setup load", par.reset_on_setup_load, 
            "<p>Reset parameters toi default values before loading a setup. This ensures that only parametrers from the setup file are set " + 
            "and user saved default parameters are not set.</p>" );
      this.keepTemporaryImagesCheckBox = newCheckBox(this, "Keep temporary images", par.keep_temporary_images, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.ABE_before_channel_combination_CheckBox = newCheckBox(this, "Use ABE on channel images", par.ABE_before_channel_combination, 
            "<p>Use AutomaticBackgroundExtractor on L, R, G and B images separately before channels are combined.</p>" );
      this.ABE_on_lights_CheckBox = newCheckBox(this, "Use ABE on light images", par.ABE_on_lights, 
            "<p>Use AutomaticBackgroundExtractor on all light images. It is run very early in the processing before cosmetic correction.</p>" );
      this.useABE_L_RGB_CheckBox = newCheckBox(this, "Use ABE on combined images", par.use_ABE_on_L_RGB, 
            "<p>Use AutomaticBackgroundExtractor on L and RGB images while image is still in linear mode.</p>" );
      this.useABE_L_RGB_stretched_CheckBox = newCheckBox(this, "Use ABE on stretched images", par.use_ABE_on_L_RGB_stretched, 
            "<p>Use AutomaticBackgroundExtractor on L and RGB images after they have been stretched to non-linear mode.</p>" );
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
            "<p>Remove stars from light image. Stars are removed after after star alignment. If comet alignmet is chosen then stars are removed before comet align.</p>");
      this.remove_stars_stretched_CheckBox = newCheckBox(this, "Remove_stars after stretch", par.remove_stars_stretched, 
            "<p>Remove stars after image has been stretched to non-linear state. Start from RGB image are saved and they " + 
            "can be later added back to the image. This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      var unscreen_tooltip = "<p>Use unscreen method to get stars image as described by Russell Croman.</p>" +
                             "<p>Unscreen method usually keeps star colors more correct than simple star removal. It is " + 
                             "recommended to use Screen method when combining star and starless images back together.<p>";
      this.unscreen_stars_CheckBox = newCheckBox(this, "Unscreen stars", par.unscreen_stars, unscreen_tooltip);
      this.color_calibration_before_ABE_CheckBox = newCheckBox(this, "Color calibration before ABE", par.color_calibration_before_ABE, 
            "<p>Run ColorCalibration before AutomaticBackgroundExtractor in run on RGB image</p>" );
      this.use_spcc_CheckBox = newCheckBox(this, "Color calibration using SPCC", par.use_spcc, 
            "<p>NOTE! Using SPCC will clear the dialog window. Everything still runs fine. This is a problem in the SPCC process which hopefully gets fixed soon.</p>" +
            "<p>Run ColorCalibration using SpectrophotometricColorCalibration. This requires image solving which is done automatically on " + 
            "Integration_RGB image if it is not already done.</p>" +
            "<p>If image does not have correct coordinates or focal length embedded they can be given in Image solving section in the Processing tab.</p>" +
            "<p>SpectrophotometricColorCalibration is run only on RGB images, it is not run on narrowband images.</p>");
      this.use_background_neutralization_CheckBox = newCheckBox(this, "Use BackgroundNeutralization", par.use_background_neutralization, 
            "<p>Run BackgroundNeutralization before ColorCalibration</p>" );
      this.batch_mode_CheckBox = newCheckBox(this, "Batch/mosaic mode", par.batch_mode, 
            "<p>Run in batch mode, continue until no files are given.</p>" +
            "<p>Batch mode is intended for processing mosaic panels. When one set of files " + 
            "is processed, batch mode will automatically ask for the next set of files. " + 
            "In batch mode only final image windows are left visible. </p>" +
            "<p>Final images are renamed using the subdirectory name. It is " + 
            "recommended that each part of the batch is stored in a separate directory. </p>");
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
      this.save_processed_channel_images_CheckBox = newCheckBox(this, "Save processed channel images", par.save_processed_channel_images, 
            "<p>If selected save also processed channel images for AutoContinue and iconize them to the desktop.</p>" +
            "<p>Processed channel images may make it faster to try different stretching " + 
            "or narrowband combinations.</p>" );
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
      this.use_drizzle_CheckBox = newCheckBox(this, "Drizzle", par.use_drizzle, 
            "<p>Use Drizzle integration</p>" );
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
            "<p>Do not use an existing mask but always create a new mask.</p>)");
      this.no_SCNR_CheckBox = newCheckBox(this, "No SCNR", par.skip_SCNR, 
            "<p>Do not use SCNR to remove green cast.</p>"  +
            "<p>SCNR is automatically skipped when processing narrowband images.</p>" +
            "<p>Skipping SCNR can be useful when processing for example comet images.</p>");
      this.skip_color_calibration_CheckBox = newCheckBox(this, "No color calibration", par.skip_color_calibration, 
            "<p>Do not run color calibration. Color calibration is run by default on RGB data.</p>" );
      this.use_starxterminator_CheckBox = newCheckBox(this, "Use StarXTerminator", par.use_starxterminator, 
            "<p>Use StarXTerminator instead of StarNet to remove stars from an image.</p>" );
      this.use_noisexterminator_CheckBox = newCheckBox(this, "Use NoiseXTerminator", par.use_noisexterminator, 
            "<p>Use NoiseXTerminator for noise reduction.</p>" );
      this.use_starnet2_CheckBox = newCheckBox(this, "Use StarNet2", par.use_starnet2, 
            "<p>Use StarNet2 instead of StarNet to remove stars from an image.</p>" );
      this.use_blurxterminator_CheckBox = newCheckBox(this, "Use BlurXTerminator", par.use_blurxterminator, 
            "<p>Use BlurXTerminator for sharpening and deconvolution.</p>" +
            "<p>BlurXTerminator is applied on the linear image just before it is stetched to non-linear. Extra processing " +
            "option for sharpening can be used to apply BlurXTerminator on non-linear image.</p>" +
            "<p>Some options for BlurXTerminator can be adjusted in the sharpening section.</p>" +
            "<p>When using BlurXTerminator it is recommended to do noise reduction after BluxXTerminator " + 
            "by checking option <i>Combined image noise reduction</i> or <i>Non-linear noise reduction</i>. " + 
            "But it is always good to experiment what " +
            "is best for your own data.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>");
      this.win_prefix_to_log_files_CheckBox = newCheckBox(this, "Add window prefix to log files", par.win_prefix_to_log_files, 
            "<p>Add window prefix to AutoIntegrate.log and AutoContinue.log files.</p>" );
      this.start_from_imageintegration_CheckBox = newCheckBox(this, "Start from ImageIntegration", par.start_from_imageintegration, 
            "<p>Start processing from ImageIntegration. File list should include star aligned files (*_r.xisf).</p>" +
            "<p>This option can be useful for testing different processing like Local Normalization or Drizzle " + 
            "(if Generate .xdrz files is selected). This is also useful if there is a need to manually remove " + 
            "bad files after alignment.</p>" +
            "<p>This moption is also useful when doing comet alignment. Then input files should be comet aligned *_ca.xisf files.</p>" +
            "<p>If filter type is not included in the file keywords it cannot be detected from the file name. In that case " + 
            "filter files must be added manually to the file list.</p>" );
      this.generate_xdrz_CheckBox = newCheckBox(this, "Generate .xdrz files", par.generate_xdrz, 
            "<p>Generate .xdrz files even if Drizzle integration is not used. It is useful if you want to try Drizzle " + 
            "integration later with Start from ImageIntegration option.</p>" );
      this.blink_checkbox = newCheckBoxEx(this, "No blink", par.skip_blink, 
            "<p>Disable blinking of files.</p>",
            function(checked) { 
                  this.dialog.blink_checkbox.aiParam.val = checked;
                  if (this.dialog.blink_checkbox.aiParam.val) {
                        if (blink_window != null) {
                              blink_window.forceClose();
                              blink_window = null;
                        }
                  }
            });
      this.StartWithEmptyWindowPrefixBox = newCheckBox(this, "Start with empty window prefix", par.start_with_empty_window_prefix, 
            "<p>Start the script with empty window prefix</p>" );
      this.ManualIconColumnBox = newCheckBox(this, "Manual icon column control", par.use_manual_icon_column, 
            "<p>Enable manual control of icon columns. Useful for example when using multiple Workspaces.</p>" +
            "<p>When this option is enabled the control for icon column is in the Interface settings section.</p>" +
            "<p>This setting is effective only after restart of the script.</p>" );
      this.AutoSaveSetupBox = newCheckBox(this, "Autosave setup", par.autosave_setup, 
            "<p>Save setup after successful processing into AutosaveSetup.json file. Autosave is done only after the Run command, " + 
            "it is not done after the Autocontinue command.</p>" +
            "<p>File is saved to the lights file directory, or to the user given output directory.</p>" +
            "<p>Setup can be later loaded into AutoIntegrate to see the settings or run the setup again possibly with different options.</p>");
      this.UseProcessedFilesBox = newCheckBox(this, "Use processed files", par.use_processed_files, 
            "<p>When possible use already processed files. This option can be useful when adding files to an already processed set of files. " +
            "Only files generated before image integration are reused.</p>" +
            "<p>Option works best with a json setup file that is saved after processing or with Autosave generated AutosaveSetup.json file because " + 
            "then star alignment reference image and possible defect info is saved.</p>" +
            "<p>With image calibration it is possible to use previously generated master files by adding already processed master files " +
            "into calibration file lists. If only one calibration file is present then the script automatically uses it as a master file.</p>");
      this.saveCroppedImagesBox = newCheckBox(this, "Save cropped files", par.save_cropped_images, "Save cropped image files with _crop postfix.");

      // Image parameters set 1.
      this.imageParamsSet1 = new VerticalSizer;
      this.imageParamsSet1.margin = 6;
      this.imageParamsSet1.spacing = 4;
      this.imageParamsSet1.add( this.FixColumnDefectsCheckBox );
      this.imageParamsSet1.add( this.FixRowDefectsCheckBox );
      this.imageParamsSet1.add( this.CosmeticCorrectionCheckBox );
      this.imageParamsSet1.add( this.SubframeSelectorCheckBox );
      this.imageParamsSet1.add( this.CometAlignCheckBox );
      /* this.imageParamsSet1.add( this.relaxedStartAlignCheckBox); */
      this.imageParamsSet1.add( this.imageintegration_ssweight_CheckBox );
      this.imageParamsSet1.add( this.imageintegration_clipping_CheckBox );
      this.imageParamsSet1.add( this.crop_to_common_area_CheckBox );
      this.imageParamsSet1.add( this.no_mask_contrast_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_light_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_channel_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_before_stretch_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_stretched_CheckBox );
      this.imageParamsSet1.add( this.unscreen_stars_CheckBox );
      this.imageParamsSet1.add( this.forceNewMask_CheckBox );
      this.imageParamsSet1.add( this.shadowClip_CheckBox );
      
      // Image parameters set 2.
      this.imageParamsSet2 = new VerticalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.no_SCNR_CheckBox );
      this.imageParamsSet2.add( this.no_sharpening_CheckBox );
      this.imageParamsSet2.add( this.skip_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.skip_star_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.use_background_neutralization_CheckBox );
      this.imageParamsSet2.add( this.useLocalNormalizationCheckBox );
      this.imageParamsSet2.add( this.skip_color_calibration_CheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_ABE_CheckBox );
      this.imageParamsSet2.add( this.use_spcc_CheckBox );
      this.imageParamsSet2.add( this.ABE_on_lights_CheckBox );
      this.imageParamsSet2.add( this.ABE_before_channel_combination_CheckBox );
      this.imageParamsSet2.add( this.useABE_L_RGB_CheckBox );
      this.imageParamsSet2.add( this.useABE_L_RGB_stretched_CheckBox );
      this.imageParamsSet2.add( this.use_drizzle_CheckBox );

      // Image group par.
      this.imageParamsControl = new Control( this );
      this.imageParamsControl.sizer = new HorizontalSizer;
      this.imageParamsControl.sizer.margin = 6;
      this.imageParamsControl.sizer.spacing = 4;
      this.imageParamsControl.sizer.add( this.imageParamsSet1 );
      this.imageParamsControl.sizer.add( this.imageParamsSet2 );
      this.imageParamsControl.visible = false;
      //this.imageParamsControl.sizer.addStretch();

      // LRGBCombination selection
      this.LRGBCombinationLightnessControl = newNumericEdit(this, "Lightness", par.LRGBCombination_lightness, 0, 1, 
            "<p>LRGBCombination lightness setting. Smaller value gives more bright image. Usually should be left to the default value.</p>");

      this.LRGBCombinationSaturationControl = newNumericEdit(this, "Saturation", par.LRGBCombination_saturation, 0, 1, 
            "<p>LRGBCombination saturation setting. Smaller value gives more saturated image. Usually should be left to the default value.</p>");

      this.LRGBCombinationGroupBoxLabel = newSectionLabel(this, "LRGBCombination settings");
      this.LRGBCombinationGroupBoxLabel.toolTip = 
            "LRGBCombination settings can be used to fine tune image. For relatively small " +
            "and bright objects like galaxies it may be useful to reduce brightness and increase saturation.";
      this.LRGBCombinationGroupBoxSizer = new HorizontalSizer;
      this.LRGBCombinationGroupBoxSizer.margin = 6;
      this.LRGBCombinationGroupBoxSizer.spacing = 4;
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationLightnessControl );
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationSaturationControl );
      this.LRGBCombinationGroupBoxSizer.addStretch();

      this.LRGBCombinationSizer = new VerticalSizer;
      this.LRGBCombinationSizer.margin = 6;
      this.LRGBCombinationSizer.spacing = 4;
      this.LRGBCombinationSizer.add( this.LRGBCombinationGroupBoxLabel );
      this.LRGBCombinationSizer.add( this.LRGBCombinationGroupBoxSizer );
      this.LRGBCombinationSizer.addStretch();

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
      this.cometAlignFirstXYButton = newPushorToolButton(this, null, "Preview", "<p>Show the first comet image in the preview tab.</p>" + comet_alignment_toolTip, cometFirstImageAction, false);
      this.cometAlignLastLabel = newLabel(this, "Last image X₁,Y₁:", "<p>Coordinates for the last comet image.</p>" + comet_alignment_toolTip);
      this.cometAlignLastXY = newTextEdit(this, par.comet_last_xy, this.cometAlignLastLabel.toolTip);
      this.cometAlignLastXYButton = newPushorToolButton(this, null, "Preview", "<p>Show the last image in the preview tab.</p>" + comet_alignment_toolTip, cometLastImageAction, false);

      this.cometAlignmentGroupBoxSizer = new HorizontalSizer;
      this.cometAlignmentGroupBoxSizer.margin = 6;
      this.cometAlignmentGroupBoxSizer.spacing = 4;
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstLabel );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstXY );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignFirstXYButton );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastLabel );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastXY );
      this.cometAlignmentGroupBoxSizer.add( this.cometAlignLastXYButton );
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
      var noiseReductionToolTipCommon = "<p>Noise reduction is done using a luminance mask to target noise reduction on darker areas of the image. " +
                                        "Bigger strength value means stronger noise reduction. Noise reduction uses MultiscaleLinerTransform or NoiseXTerminator.</p>" + 
                                        "<p>With MultiscaleLinerTransform the strength between 3 and 5 is the number of layers used to reduce noise. " + 
                                        "Strength values 1 and 2 are very mild three layer noise reductions and strength 6 is very aggressive five layer noise reduction.</p>" +
                                        "<p>With NoiseXTerminator the strength changes denoise and detail values. Strength value has the following mapping to denoise " + 
                                        "and detail: 1=0.60 0.10, 2=0.70 0.15 3=0.80 0.15 4=0.90 0.15, 5=0.90 0.20 and 6=0.95 0.20.t</p>";
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
      this.channel_noise_reduction_CheckBox = newCheckBox(this, "Channel image", par.channel_noise_reduction,
            "<p>Do noise reduction on each color channels and luminance image separately. This option enables also color/OSC image noise reduction.</p>");
      this.combined_noise_reduction_CheckBox = newCheckBox(this, "Combined image", par.combined_image_noise_reduction,
            "<p>Do noise reduction on combined image and luminance image in linear stage instead of each color channels separately. This option enables also color/OSC image noise reduction.</p>" );
      this.non_linear_noise_reduction_CheckBox = newCheckBox(this, "Non-linear image", par.non_linear_noise_reduction, 
            "<p>Do noise reduction in non-linear state after stretching on combined and luminance images.</p>" );
      this.color_noise_reduction_CheckBox = newCheckBox(this, "Color noise reduction", par.use_color_noise_reduction, 
            "<p>Do color noise reduction.</p>" );

      var ACDNR_StdDev_tooltip = "<p>A mild ACDNR noise reduction with StdDev value between 1.0 and 2.0 can be useful to smooth image and reduce black spots left from previous noise reduction.</p>";
      this.ACDNR_noise_reduction_Control = newNumericEdit(this, "ACDNR noise reduction", par.ACDNR_noise_reduction, 0, 5, 
            "<p>If non-zero, sets StdDev value and runs ACDNR noise reduction.</p>" +
            ACDNR_StdDev_tooltip);

      this.noiseReductionGroupBoxLabel = newSectionLabel(this, "Noise reduction settings");
      this.noiseReductionGroupBoxSizer1 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer1.margin = 2;
      this.noiseReductionGroupBoxSizer1.spacing = 4;
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.addStretch();

      this.noiseReductionGroupBoxSizer11 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer11.margin = 2;
      this.noiseReductionGroupBoxSizer11.spacing = 4;
      this.noiseReductionGroupBoxSizer11.add( this.color_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.ACDNR_noise_reduction_Control );
      this.noiseReductionGroupBoxSizer11.addStretch();

      this.noiseReductionGroupBoxSizer2 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer2.margin = 2;
      this.noiseReductionGroupBoxSizer2.spacing = 4;
      this.noiseReductionGroupBoxSizer2.add( this.noise_reduction_checkbox_label );
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

      this.sharpeningGroupBoxLabel = newSectionLabel(this, "Sharpening settings");

      this.bxtLabel = newLabel(this, "BlurXterminator", "Settings for BlurXTerminator. To use BlurXTerminator you need to check <i>Use BlurXTerminator</i> in <i>Other parameters</i> section.");
      this.bxtSharpenStars = newNumericEdit(this, "Sharpen stars", par.bxt_sharpen_stars, 0, 0.50, "Amount to reduce the diameter of stars.  Use a value between 0.00 and 0.50.");
      this.bxtAdjustHalo = newNumericEdit(this, "Adjust star halos", par.bxt_adjust_halo, -0.50, 0.50, "Amount to adjust star halos. Use a value between -0.50 and 0.50.");
      this.bxtSharpenNonstellar = newNumericEdit(this, "Sharpen nonstellar", par.bxt_sharpen_nonstellar, 0, 1, "The amount to sharpen non-stellar image features. Use a value between 0.00 and 1.00.");

      this.sharpeningGroupBoxSizer = new HorizontalSizer;
      this.sharpeningGroupBoxSizer.margin = 2;
      this.sharpeningGroupBoxSizer.spacing = 4;
      this.sharpeningGroupBoxSizer.add( this.bxtLabel );
      this.sharpeningGroupBoxSizer.add( this.bxtSharpenStars );
      this.sharpeningGroupBoxSizer.add( this.bxtAdjustHalo );
      this.sharpeningGroupBoxSizer.add( this.bxtSharpenNonstellar );
      this.sharpeningGroupBoxSizer.addStretch();

      this.bxtPSF = newNumericEdit(this, "PSF", par.bxt_psf, 0, 8, "Manual PSF value if a non-zero value is given.");
      this.bxtImagePSF = newCheckBox(this, "Get PSF from image", par.bxt_image_psf, 
            "<p>Get PSF value from image using FWHM.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>" );
      this.bxtMedianPSF = newCheckBox(this, "Use median PSF", par.bxt_median_psf, 
            "<p>Use median FWHM from subframe selector as PSF value. It can be useful when PSF cannot be calculated from the image.</p>" + 
            "<p>" + BXT_no_PSF_tip + "</p>" );
      this.bxtCorrectFirst = newCheckBox(this, "Correct first", par.bxt_correct_first, 
            "<p>Set correct first flag for BlurXTerminator.</p>" );

      this.sharpeningGroupBoxSizer2 = new HorizontalSizer;
      this.sharpeningGroupBoxSizer2.margin = 2;
      this.sharpeningGroupBoxSizer2.spacing = 4;
      this.sharpeningGroupBoxSizer2.add( this.bxtPSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtImagePSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtMedianPSF );
      this.sharpeningGroupBoxSizer2.add( this.bxtCorrectFirst );
      this.sharpeningGroupBoxSizer2.addStretch();

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
            "Do Canon banding reduction using the method in CanonBandingReduction script.");
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
                                                       "<p>Search button can be used to search coordinames.</p>");
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

      this.imageSolvingGroupBoxSizer = new HorizontalSizer;
      this.imageSolvingGroupBoxSizer.margin = 2;
      this.imageSolvingGroupBoxSizer.spacing = 4;
      this.imageSolvingGroupBoxSizer.add( this.targetNameLabel );
      this.imageSolvingGroupBoxSizer.add( this.targetNameEdit );
      this.imageSolvingGroupBoxSizer.add( this.targetRaDecLabel );
      this.imageSolvingGroupBoxSizer.add( this.targetRaDecEdit );
      this.imageSolvingGroupBoxSizer.add( this.findTargetCoordinatesButton );
      this.imageSolvingGroupBoxSizer.addStretch();

      this.targetFocalLabel = newLabel(this, "Focal length mm", "Focal length in millimeters. Empty value uses image metadata.");
      this.targetFocalEdit = newTextEdit(this, par.target_focal, this.targetFocalLabel.toolTip);
      this.targetPixelSizeLabel = newLabel(this, "Pixel size μm", "Pixel size in μm. Empty value uses image metadata.");
      this.targetPixelSizeEdit = newTextEdit(this, par.target_pixel_size, this.targetPixelSizeLabel.toolTip);

      this.imageSolvingGroupBoxLabel = newSectionLabel(this, "Image solving");
      this.imageSolvingGroupBoxSizer = new HorizontalSizer;
      this.imageSolvingGroupBoxSizer.margin = 2;
      this.imageSolvingGroupBoxSizer.spacing = 4;
      this.imageSolvingGroupBoxSizer.add( this.targetNameLabel );
      this.imageSolvingGroupBoxSizer.add( this.targetNameEdit );
      this.imageSolvingGroupBoxSizer.add( this.targetRaDecLabel );
      this.imageSolvingGroupBoxSizer.add( this.targetRaDecEdit );
      this.imageSolvingGroupBoxSizer.add( this.findTargetCoordinatesButton );
      this.imageSolvingGroupBoxSizer.addStretch();

      this.imageSolvingGroupBoxSizer2 = new HorizontalSizer;
      this.imageSolvingGroupBoxSizer2.margin = 2;
      this.imageSolvingGroupBoxSizer2.spacing = 4;
      this.imageSolvingGroupBoxSizer2.add( this.targetFocalLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetFocalEdit );
      this.imageSolvingGroupBoxSizer2.add( this.targetPixelSizeLabel );
      this.imageSolvingGroupBoxSizer2.add( this.targetPixelSizeEdit );
      this.imageSolvingGroupBoxSizer2.addStretch();

      this.spccDetectionScalesLabel = newLabel(this, "Detection scales", "Number of layers used for structure detection. Larger value detects larger stars for signal evaluation.");
      this.spccDetectionScalesSpinBox = newSpinBox(this, par.spcc_detection_scales, 1, 8, this.spccDetectionScalesLabel.toolTip);
      this.spccNoiseScalesLabel = newLabel(this, "Noise scales", "Number of layers used for noise reduction. Can be increased to avoid detecting image artifacts as real stars.");
      this.spccNoiseScalesSpinBox = newSpinBox(this, par.spcc_noise_scales, 0, 4, this.spccNoiseScalesLabel.toolTip);
      this.spccMinStructSizeLabel = newLabel(this, "Minumum structure size", "Minimum size for a detectable star structure. Can be increased to avoid detecting image artifacts as real stars.");
      this.spccMinStructSizeSpinBox = newSpinBox(this, par.spcc_min_struct_size, 0, 1000, this.spccMinStructSizeLabel.toolTip);

      this.colorCalibrationGroupBoxLabel = newSectionLabel(this, "Spectrophotometric Color Calibration");
      this.colorCalibrationGroupBoxSizer = new HorizontalSizer;
      this.colorCalibrationGroupBoxSizer.margin = 6;
      this.colorCalibrationGroupBoxSizer.spacing = 4;
      this.colorCalibrationGroupBoxSizer.add( this.spccDetectionScalesLabel );
      this.colorCalibrationGroupBoxSizer.add( this.spccDetectionScalesSpinBox );
      this.colorCalibrationGroupBoxSizer.add( this.spccNoiseScalesLabel );
      this.colorCalibrationGroupBoxSizer.add( this.spccNoiseScalesSpinBox );
      this.colorCalibrationGroupBoxSizer.add( this.spccMinStructSizeLabel );
      this.colorCalibrationGroupBoxSizer.add( this.spccMinStructSizeSpinBox );
      this.colorCalibrationGroupBoxSizer.addStretch();

      // Other parameters set 1.
      this.otherParamsSet1 = new VerticalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.CalibrateOnlyCheckBox );
      this.otherParamsSet1.add( this.DebayerOnlyCheckBox );
      this.otherParamsSet1.add( this.BinningOnlyCheckBox );
      this.otherParamsSet1.add( this.ExtractChannelsOnlyCheckBox );
      this.otherParamsSet1.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet1.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet1.add( this.CropInfoOnlyCheckBox );
      this.otherParamsSet1.add( this.imageWeightTestingCheckBox );
      this.otherParamsSet1.add( this.start_from_imageintegration_CheckBox );
      this.otherParamsSet1.add( this.RRGB_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_missing_images_CheckBox );
      this.otherParamsSet1.add( this.no_subdirs_CheckBox );
      this.otherParamsSet1.add( this.use_starxterminator_CheckBox );
      this.otherParamsSet1.add( this.use_starnet2_CheckBox );
      this.otherParamsSet1.add( this.use_noisexterminator_CheckBox );
      this.otherParamsSet1.add( this.use_blurxterminator_CheckBox );

      // Other parameters set 2.
      this.otherParamsSet2 = new VerticalSizer;
      this.otherParamsSet2.margin = 6;
      this.otherParamsSet2.spacing = 4;
      this.otherParamsSet2.add( this.keepIntegratedImagesCheckBox );
      this.otherParamsSet2.add( this.keepTemporaryImagesCheckBox );
      this.otherParamsSet2.add( this.save_processed_channel_images_CheckBox );
      this.otherParamsSet2.add( this.save_all_files_CheckBox );
      this.otherParamsSet2.add( this.select_all_files_CheckBox );
      this.otherParamsSet2.add( this.unique_file_names_CheckBox );
      this.otherParamsSet2.add( this.win_prefix_to_log_files_CheckBox );
      this.otherParamsSet2.add( this.batch_mode_CheckBox );
      this.otherParamsSet2.add( this.force_file_name_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_imagetyp_CheckBox );
      this.otherParamsSet2.add( this.generate_xdrz_CheckBox );
      this.otherParamsSet2.add( this.blink_checkbox );
      this.otherParamsSet2.add( this.StartWithEmptyWindowPrefixBox );
      this.otherParamsSet2.add( this.ManualIconColumnBox );
      this.otherParamsSet2.add( this.AutoSaveSetupBox );
      this.otherParamsSet2.add( this.UseProcessedFilesBox );
      this.otherParamsSet2.add( this.saveCroppedImagesBox );
      this.otherParamsSet2.add( this.resetOnSetupLoadCheckBox );

      // Other Group par.
      this.otherParamsControl = new Control( this );
      this.otherParamsControl.sizer = new HorizontalSizer;
      this.otherParamsControl.sizer.margin = 6;
      this.otherParamsControl.sizer.spacing = 4;
      this.otherParamsControl.sizer.add( this.otherParamsSet1 );
      this.otherParamsControl.sizer.add( this.otherParamsSet2 );
      this.otherParamsControl.visible = false;
      //this.otherParamsControl.sizer.addStretch();
      
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

      var weightLimitToolTip = "Limit value for SSWEIGHT. If value for SSWEIGHT is below the limit " +
                               "it is not included in the set of processed images.";
      this.weightLimitEdit = newNumericEditPrecision(this, "Limit", par.ssweight_limit, 0, 999999, weightLimitToolTip, 4);
      
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
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "Hot Sigma and Cold Sigma values for CosmeticCorrection";

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
            "<p>Default for linear fit is to use the luminance channel. If the luminance channel is not present then RGB images use a red channel and narrowband images do not do linear fit.</p>" +
            "<p>In case of narrowband images, note that if luminance image is generated and luminance is used for linear fit then in auto mode the channels will be linked by default.</p>"
      );

      this.linearFitGroupBoxLabel = newSectionLabel(this, "Linear fit setting");
      this.linearFitGroupBoxSizer = new HorizontalSizer;
      this.linearFitGroupBoxSizer.margin = 6;
      this.linearFitGroupBoxSizer.spacing = 4;
      this.linearFitGroupBoxSizer.add( this.linearFitComboBox );
      this.linearFitGroupBoxSizer.addStretch();

      this.linearFitSizer = new VerticalSizer;
      this.linearFitSizer.margin = 6;
      this.linearFitSizer.spacing = 4;
      this.linearFitSizer.add( this.linearFitGroupBoxLabel );
      this.linearFitSizer.add( this.linearFitGroupBoxSizer );
      this.linearFitSizer.addStretch();

      this.linearFitAndLRGBCombinationSizer = new HorizontalSizer;
      this.linearFitAndLRGBCombinationSizer.spacing = 4;
      this.linearFitAndLRGBCombinationSizer.add( this.linearFitSizer );
      this.linearFitAndLRGBCombinationSizer.add( this.LRGBCombinationSizer );
      this.linearFitAndLRGBCombinationSizer.addStretch();

      //
      // Stretching
      //

      var Hyperbolic_tips = "<p>Generalized Hyperbolic Stretching (GHS) is most useful on bright targets where AutoSTF may not work well. " + 
                            "It often preserves background and stars well and also saturation is good. For very dim or small targets " + 
                            "the implementation in AutoIntegrate does not work that well.</p>" + 
                            "<p>It is recommended that dark background is as clean as possible from any gradients with GHS. " + 
                            "Consider using ABE on combined images and maybe also BackgroundNeutralization to clean image background. Local Normalization can be useful too.</p>" +
                            "<p>It is also recommended that Crop to common are option is used. It cleans the image from bad data and makes " + 
                            "finding the symmetry point more robust.</p>" + 
                            "<p>Generalized Hyperbolic Stretching is using PixelMath formulas from PixInsight forum member dapayne (David Payne).</p>";

      var histogramStretchToolTip = "Using a simple histogram transformation with some clipping to get histogram median or peak to the target value. " + 
                                    "Works best with images that are processed with the Crop to common area option.";
      var stretchingTootip = 
            "<ul>" +
            "<li>Auto STF - Use auto Screen Transfer Function to stretch image to non-linear.</li>" +
            "<li>Masked Stretch - Use MaskedStretch to stretch image to non-linear.<p>Useful when AutoSTF generates too bright images, like on some galaxies.</p></li>" +
            "<li>Arcsinh Stretch - Use ArcsinhStretch to stretch image to non-linear.<p>Useful also when stretching stars to keep good star color.</p></li>" +
            "<li>Histogram stretch - " + histogramStretchToolTip + "</li>" +
            "<li>Hyperbolic - Experimental, Generalized Hyperbolic Stretching using GeneralizedHyperbolicStretch process. " + Hyperbolic_tips + "</li>" +
            "</ul>";
      this.stretchingComboBox = newComboBox(this, par.image_stretching, image_stretching_values, stretchingTootip);
      this.starsStretchingLabel = newLabel(this, " Stars ", "Stretching for stars if stars are extracted from image.");
      this.starsStretchingComboBox = newComboBox(this, par.stars_stretching, image_stretching_values, stretchingTootip);
      var stars_combine_operations_Tooltip = "<p>Possible combine operations are:</p>" +
                                             "<ul>" + 
                                             "<li>Add - Use stars+starless formula in Pixelmath</li>" +
                                             "<li>Screen - Similar to screen in Photoshop</li>" +
                                             "<li>Lighten - Similar to lighten in Photoshop</li>" +
                                             "</ul>";
      var stars_combine_Tooltip = "<p>Select how to combine star and starless image.</p>" + stars_combine_operations_Tooltip;
      this.starsCombineLabel = newLabel(this, " Combine ", stars_combine_Tooltip);
      this.starsCombineComboBox = newComboBox(this, par.stars_combine, starless_and_stars_combine_values, stars_combine_Tooltip);
      
      this.stretchingChoiceSizer = new HorizontalSizer;
      this.stretchingChoiceSizer.margin = 6;
      this.stretchingChoiceSizer.spacing = 4;
      this.stretchingChoiceSizer.add( this.stretchingComboBox );
      this.stretchingChoiceSizer.add( this.starsStretchingLabel );
      this.stretchingChoiceSizer.add( this.starsStretchingComboBox );
      this.stretchingChoiceSizer.add( this.starsCombineLabel );
      this.stretchingChoiceSizer.add( this.starsCombineComboBox );
      this.stretchingChoiceSizer.addStretch();

      this.STFLabel = new Label( this );
      this.STFLabel.text = "Auto STF link RGB channels";
      this.STFLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.STFLabel.toolTip = 
      "<p>" +
      "RGB channel linking in Screen Transfer Function." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband and OSC/DSLR images the default " +
      "is to use unlinked channels. But if linear fit is done with narrowband images, then linked channels are used." +
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
      this.STFSizer.addStretch()

      /* Masked.
       */
      this.MaskedStretchTargetBackgroundEdit = newNumericEdit(this, "Masked Stretch targetBackground", par.MaskedStretch_targetBackground, 0, 1,
            "<p>Masked Stretch targetBackground value. Usually values between 0.1 and 0.2 work best. Possible values are between 0 and 1.</p>");

      this.MaskedStretchSizer = new HorizontalSizer;
      this.MaskedStretchSizer.spacing = 4;
      this.MaskedStretchSizer.margin = 2;
      this.MaskedStretchSizer.add( this.MaskedStretchTargetBackgroundEdit );
      this.MaskedStretchSizer.addStretch();
      
      /* Arcsinh.
       */
      this.Arcsinh_stretch_factor_Edit = newNumericEdit(this, "Arcsinh Stretch Factor", par.Arcsinh_stretch_factor, 1, 1000,
            "<p>Arcsinh Stretch Factor value. Smaller values are usually better than really big ones.</p>" +
            "<p>For some smaller but bright targets like galaxies it may be useful to increase stretch factor and iterations. A good starting point could be 100 and 5.</p>" +
            "<p>Useful for stretching stars to keep star colors. Depending on the star combine method you may need to use a different values. For less stars you can use a smaller value.</p>");
      this.Arcsinh_black_point_Control = newNumericEdit(this, "Black point value %", par.Arcsinh_black_point, 0, 99,
            "<p>Arcsinh Stretch black point value.</p>" + 
            "<p>The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>");
      this.Arcsinh_black_point_Control.setPrecision( 4 );
      var Arcsinh_iterations_tooltip = "Number of iterations used to get the requested stretch factor."
      this.Arcsinh_iterations_Label = newLabel(this, "Iterations", Arcsinh_iterations_tooltip);
      this.Arcsinh_iterations_SpinBox = newSpinBox(this, par.Arcsinh_iterations, 1, 10, Arcsinh_iterations_tooltip);

      this.ArcsinhSizer = new HorizontalSizer;
      this.ArcsinhSizer.spacing = 4;
      this.ArcsinhSizer.margin = 2;
      this.ArcsinhSizer.add( this.Arcsinh_stretch_factor_Edit );
      this.ArcsinhSizer.add( this.Arcsinh_black_point_Control );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_Label );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_SpinBox );
      this.ArcsinhSizer.addStretch();

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
      this.hyperbolicSizer1.margin = 2;
      this.hyperbolicSizer1.add( this.Hyperbolic_D_Control );
      this.hyperbolicSizer1.add( this.Hyperbolic_b_Control );
      this.hyperbolicSizer1.add( this.Hyperbolic_SP_Control );
      this.hyperbolicSizer1.addStretch();
      this.hyperbolicSizer2 = new HorizontalSizer;
      this.hyperbolicSizer2.spacing = 4;
      this.hyperbolicSizer2.margin = 2;
      this.hyperbolicSizer2.add( this.Hyperbolic_target_Control );
      this.hyperbolicSizer2.add( this.hyperbolicIterationsLabel );
      this.hyperbolicSizer2.add( this.hyperbolicIterationsSpinBox );
      this.hyperbolicSizer2.add( this.hyperbolicModeLabel );
      this.hyperbolicSizer2.add( this.hyperbolicModeSpinBox );
      this.hyperbolicSizer2.addStretch();
      this.hyperbolicSizer = new VerticalSizer;
      this.hyperbolicSizer.spacing = 4;
      this.hyperbolicSizer.margin = 2;
      this.hyperbolicSizer.add( this.hyperbolicSizer1 );
      this.hyperbolicSizer.add( this.hyperbolicSizer2 );
      this.hyperbolicSizer.addStretch();

      this.histogramShadowClip_Control = newNumericEditPrecision(this, "Histogram stretch shadow clip", par.histogram_shadow_clip, 0, 99,
                                          "Percentage of shadows that are clipped with Histogram stretch.", 3);
      this.histogramTypeLabel = newLabel(this, "Target type", "Target type specifies what value calculated from histogram is tried to get close to Target value.");
      this.histogramTypeComboBox = newComboBox(this, par.histogram_stretch_type, histogram_stretch_type_values, this.histogramTypeLabel.toolTip);
      this.histogramTargetValue_Control = newNumericEdit(this, "Target value", par.histogram_stretch_target, 0, 1, 
            "<p>Target value specifies where we try to get the the value calculated using Target type.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>");

      this.histogramStretchingSizer = new HorizontalSizer;
      this.histogramStretchingSizer.spacing = 4;
      this.histogramStretchingSizer.margin = 2;
      this.histogramStretchingSizer.add( this.histogramShadowClip_Control );
      this.histogramStretchingSizer.add( this.histogramTypeLabel );
      this.histogramStretchingSizer.add( this.histogramTypeComboBox );
      this.histogramStretchingSizer.add( this.histogramTargetValue_Control );
      this.histogramStretchingSizer.addStretch();

      var smoothBackgroundTooltipGeneric = 
            "<p>A limit value specifies below which the smoothing is done. " + 
            "The value should be selected so that no foreground data is lost.</p>" + 
            "<p>Smoothing sets a new relative value for pixels that are below the given limit value. " +
            "The new pixel values will be slightly higher than the old values.</p>" +
            "<p>Smoothening can also help ABE to clean up the background better in case of " + 
            "very uneven background.</p>";

      this.smoothBackgroundEdit = newNumericEdit(this, "Smoothen background %", par.smoothbackground, 0, 100, 
            "<p>Gives the limit value as percentage of shadows that is used for shadow " + 
            "smoothing. Smoothing is done after image has been stretched to non-linear " + 
            "and before optional Use ABE on stretched image is done.</p>" +
            "<p>Usually values below 50 work best. Possible values are between 0 and 100. " + 
            "Zero values does not do smoothing.</p>" +
            smoothBackgroundTooltipGeneric);

      this.smoothBackgroundSizer = new HorizontalSizer;
      this.smoothBackgroundSizer.spacing = 4;
      this.smoothBackgroundSizer.margin = 2;
      this.smoothBackgroundSizer.add( this.smoothBackgroundEdit );
      this.smoothBackgroundSizer.addStretch();
      
      /* Options.
       */
      this.StretchingOptionsSizer = new VerticalSizer;
      this.StretchingOptionsSizer.spacing = 4;
      this.StretchingOptionsSizer.margin = 2;
      this.StretchingOptionsSizer.add( this.STFSizer );
      this.StretchingOptionsSizer.add( this.MaskedStretchSizer );
      this.StretchingOptionsSizer.add( this.ArcsinhSizer );
      this.StretchingOptionsSizer.addStretch();

      this.StretchingGroupBoxLabel = newSectionLabel(this, "Image stretching settings");
      this.StretchingGroupBoxLabel.toolTip = "Settings for stretching linear image image to non-linear.";
      this.StretchingGroupBoxSizer = new VerticalSizer;
      this.StretchingGroupBoxSizer.margin = 6;
      this.StretchingGroupBoxSizer.spacing = 4;
      this.StretchingGroupBoxSizer.add( this.stretchingChoiceSizer );
      this.StretchingGroupBoxSizer.add( this.StretchingOptionsSizer );
      this.StretchingOptionsSizer.add( this.hyperbolicSizer );
      this.StretchingOptionsSizer.add( this.histogramStretchingSizer );
      this.StretchingOptionsSizer.add( this.smoothBackgroundSizer );
      this.StretchingGroupBoxSizer.addStretch();

      //
      // Image integration
      //
      // normalization
      this.ImageIntegrationNormalizationLabel = new Label( this );
      this.ImageIntegrationNormalizationLabel.text = "Normalization";
      this.ImageIntegrationNormalizationLabel.toolTip = "Rejection normalization. This is value is ignored if local normalization is used.";
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
            "- Sigma clipping for 8 - 10 images<br>" +
            "- Winsorised sigma clipping for 11 - 19 images<br>" +
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

      this.clippingGroupBoxLabel = newSectionLabel(this, 'Image integration pixel rejection');
      this.clippingGroupBoxSizer = new VerticalSizer;
      this.clippingGroupBoxSizer.margin = 6;
      this.clippingGroupBoxSizer.spacing = 4;
      this.clippingGroupBoxSizer.toolTip = ImageIntegrationHelpToolTips;
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer1 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer2 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer3 );
      //this.clippingGroupBoxSizer.addStretch();

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
      this.localNormalizationGroupBoxSizer.toolTip = "Local normalization settings.";
      this.localNormalizationGroupBoxSizer.add( this.localNormalizationGroupBoxLabel );
      this.localNormalizationGroupBoxSizer.add( this.localNormalizationSizer );
      //this.localNormalizationGroupBoxSizer.addStretch();

      // Narrowband palette

      var narrowbandAllTip = 
            "Option All runs all narrowband palettes in a batch mode and creates images with names Auto_+palette-name. You can use " +
            "extra options, then also images with name Auto_+palette-name+_extra are created. Images are saved as .xisf files. " +
            "Use Save batch result files buttons to save them all in a different format. " + 
            "To use All option all HSO filters must be available.";

      var narrowbandToolTip = 
      "<p>" +
      "Color palette used to map SII, Ha and OIII to R, G and B" +
      "</p><p>" +
      "There is a list of predefined mapping that can be used, some examples are below." +
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
      narrowbandAllTip + 
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
            "Dynamic palettes, credit https://thecoldestnights.com/2020/06/PixInsight-dynamic-narrowband-combinations-with-pixelmath/<br>" +
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
      this.narrowbandCustomPalette_Sizer.margin = 6;
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
      this.mapping_on_nonlinear_data_Sizer.margin = 2;
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
      this.NbLuminanceSizer.margin = 2;
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
      this.narrowbandSelectMultipleButton.toolTip = "Select narrowband mappings.";
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
      this.narrowbandSelectMultipleSizer.margin = 2;
      this.narrowbandSelectMultipleSizer.spacing = 4;
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleCheckBox );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleButton );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleLabel );
      this.narrowbandSelectMultipleSizer.add( this.narrowbandSelectMultipleEdit );
      this.narrowbandSelectMultipleSizer.addStretch();

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
            "</p>";
            
      this.useRGBNBmapping_CheckBox = newCheckBox(this, "Use Narrowband RGB mapping", par.use_RGBNB_Mapping, RGBNB_tooltip);
      this.useRGBbandwidth_CheckBox = newCheckBox(this, "Use RGB image", par.use_RGB_image, 
            "<p>" +
            "Use RGB image for bandwidth mapping instead of separate R, G and B channel images. " +
            "R channel bandwidth is then used for the RGB image." +
            "</p>" );
      this.useRGBNBmappingSizer = new HorizontalSizer;
      this.useRGBNBmappingSizer.margin = 6;
      this.useRGBNBmappingSizer.spacing = 4;
      this.useRGBNBmappingSizer.add( this.useRGBNBmapping_CheckBox );
      this.useRGBNBmappingSizer.add( this.useRGBbandwidth_CheckBox );

      // Button to test narrowband mapping
      this.testNarrowbandMappingButton = new PushButton( this );
      this.testNarrowbandMappingButton.text = "Test";
      this.testNarrowbandMappingButton.toolTip = 
            "<p>" +
            "Test narrowband RGB mapping. This requires that you have opened:" +
            "</p><p>" +
            "- Integration_RGB file.<br>" +
            "- Those narrowband files Integration_[SHO] that are used in the mapping." +
            "</p><p>" +
            "To get required Integration_RGB and Integration_[SHO] files you can a full workflow first." +
            "</p><p>" +
            "Result image will be in linear mode." +
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
                  engine.writeProcessingSteps(null, true, ppar.win_prefix + "AutoRGBNB");
                  console.endLog();
                  util.setDefaultDirs();
            }
            par.use_RGBNB_Mapping.val = false;
      };   

      // channel mapping
      this.RGBNB_MappingLabel = newLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = newLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = newComboBox(this, par.L_mapping, RGBNB_mapping_values, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = newLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = newComboBox(this, par.R_mapping, RGBNB_mapping_values, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = newLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = newComboBox(this, par.G_mapping, RGBNB_mapping_values, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = newLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = newComboBox(this, par.B_mapping, RGBNB_mapping_values, this.RGBNB_MappingBLabel.toolTip);

      this.RGBNB_MappingSizer = new HorizontalSizer;
      this.RGBNB_MappingSizer.margin = 6;
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
      this.RGBNB_BoostLabel = newLabel(this, 'Boost', "Select boost, or multiplication factor, for the channels.");
      this.RGBNB_BoostLValue = newRGBNBNumericEdit(this, 'L', par.L_BoostFactor, "Boost, or multiplication factor, for the L channel.");
      this.RGBNB_BoostRValue = newRGBNBNumericEdit(this, 'R', par.R_BoostFactor, "Boost, or multiplication factor, for the R channel.");
      this.RGBNB_BoostGValue = newRGBNBNumericEdit(this, 'G', par.G_BoostFactor, "Boost, or multiplication factor, for the G channel.");
      this.RGBNB_BoostBValue = newRGBNBNumericEdit(this, 'B', par.B_BoostFactor, "Boost, or multiplication factor, for the B channel.");

      this.RGBNB_BoostSizer = new HorizontalSizer;
      this.RGBNB_BoostSizer.margin = 6;
      this.RGBNB_BoostSizer.spacing = 4;
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLabel );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostRValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostGValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostBValue );
      this.RGBNB_BoostSizer.addStretch();

      this.RGBNB_Sizer1 = new HorizontalSizer;
      this.RGBNB_Sizer1.add(this.RGBNB_MappingSizer);
      this.RGBNB_Sizer1.add(this.RGBNB_BoostSizer);
      this.RGBNB_Sizer1.addStretch();

      // Bandwidth for different channels
      this.RGBNB_BandwidthLabel = newLabel(this, 'Bandwidth', "Select bandwidth (nm) for each filter.");
      this.RGBNB_BandwidthLValue = newRGBNBNumericEdit(this, 'L', par.L_bandwidth, "Bandwidth (nm) for the L filter.");
      this.RGBNB_BandwidthRValue = newRGBNBNumericEdit(this, 'R', par.R_bandwidth, "Bandwidth (nm) for the R filter.");
      this.RGBNB_BandwidthGValue = newRGBNBNumericEdit(this, 'G', par.G_bandwidth, "Bandwidth (nm) for the G filter.");
      this.RGBNB_BandwidthBValue = newRGBNBNumericEdit(this, 'B', par.B_bandwidth, "Bandwidth (nm) for the B filter.");
      this.RGBNB_BandwidthHValue = newRGBNBNumericEdit(this, 'H', par.H_bandwidth, "Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.");
      this.RGBNB_BandwidthSValue = newRGBNBNumericEdit(this, 'S', par.S_bandwidth, "Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.");
      this.RGBNB_BandwidthOValue = newRGBNBNumericEdit(this, 'O', par.O_bandwidth, "Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.");

      this.RGBNB_BandwidthSizer = new HorizontalSizer;
      this.RGBNB_BandwidthSizer.margin = 6;
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
      this.RGBNB_Sizer.margin = 6;
      //this.RGBNB_Sizer.spacing = 4;
      this.RGBNB_Sizer.toolTip = RGBNB_tooltip;
      this.RGBNB_Sizer.add(this.useRGBNBmappingSizer);
      this.RGBNB_Sizer.add(this.RGBNB_Sizer1);
      this.RGBNB_Sizer.add(this.RGBNB_BandwidthSizer);
      this.RGBNB_Sizer.addStretch();

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

      this.narrowbandRGBmappingControl = new Control( this );
      //this.narrowbandRGBmappingControl.title = "Narrowband to RGB mapping";
      this.narrowbandRGBmappingControl.sizer = new VerticalSizer;
      this.narrowbandRGBmappingControl.sizer.margin = 6;
      this.narrowbandRGBmappingControl.sizer.spacing = 4;
      this.narrowbandRGBmappingControl.sizer.add( this.RGBNB_Sizer );
      //this.narrowbandRGBmappingControl.sizer.add( this.narrowbandAutoContinue_sizer );
      // hide this section by default
      this.narrowbandRGBmappingControl.visible = false;

      // Narrowband extra processing
      this.fix_narrowband_star_color_CheckBox = newCheckBox(this, "Fix star colors", par.fix_narrowband_star_color, 
            "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars.</p>" );
      this.narrowband_orange_hue_shift_CheckBox = newCheckBox(this, "Hue shift for more orange", par.run_orange_hue_shift, 
            "<p>Do hue shift to enhance orange color. Useful with SHO color palette.</p>" );
      this.narrowband_hue_shift_CheckBox = newCheckBox(this, "Hue shift for SHO", par.run_hue_shift, 
            "<p>Do hue shift to enhance HSO colors. Useful with SHO color palette.</p>" );
      this.narrowband_leave_some_green_CheckBox = newCheckBox(this, "Leave some green", par.leave_some_green, 
            "<p>Leave some green color on image when running SCNR. Useful with SHO color palette. </p>");
      this.narrowband_leave_some_green_Edit = newNumericEdit(this, "Amount", par.leave_some_green_amount, 0, 1, 
            "<p>Amount value 0 keeps all the green, value 1 removes all green.</p>");
      this.narrowband_leave_some_green_sizer = new HorizontalSizer;
      this.narrowband_leave_some_green_sizer.spacing = 4;
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_CheckBox );
      this.narrowband_leave_some_green_sizer.add( this.narrowband_leave_some_green_Edit );
      this.narrowband_leave_some_green_sizer.addStretch();
      this.run_narrowband_SCNR_CheckBox = newCheckBox(this, "Remove green cast", par.run_narrowband_SCNR, 
            "<p>Run SCNR to remove green cast. Useful with SHO color palette.</p>");
      this.no_star_fix_mask_CheckBox = newCheckBox(this, "No mask when fixing star colors", par.skip_star_fix_mask, 
            "<p>Do not use star mask when fixing star colors</p>" );
      this.remove_magenta_color_CheckBox = newCheckBox(this, "Remove magenta color", par.remove_magenta_color, 
            "<p>Remove magenta color from image.</p>" );

      this.narrowbandOptions1_sizer = new VerticalSizer;
      this.narrowbandOptions1_sizer.margin = 6;
      this.narrowbandOptions1_sizer.spacing = 4;
      this.narrowbandOptions1_sizer.add( this.narrowband_orange_hue_shift_CheckBox );
      this.narrowbandOptions1_sizer.add( this.run_narrowband_SCNR_CheckBox );
      this.narrowbandOptions1_sizer.add( this.remove_magenta_color_CheckBox );
      this.narrowbandOptions1_sizer.add( this.fix_narrowband_star_color_CheckBox );

      this.narrowbandOptions2_sizer = new VerticalSizer;
      this.narrowbandOptions2_sizer.margin = 6;
      this.narrowbandOptions2_sizer.spacing = 4;
      this.narrowbandOptions2_sizer.add( this.narrowband_hue_shift_CheckBox );
      this.narrowbandOptions2_sizer.add( this.narrowband_leave_some_green_sizer );
      this.narrowbandOptions2_sizer.add( this.no_star_fix_mask_CheckBox );

      this.narrowbandExtraLabel = newSectionLabel(this, "Extra processing for narrowband");
      this.narrowbandExtraLabel.toolTip = 
            "<p>" +
            "Extra processing options to be applied on narrowband images. "+
            "They are applied before other extra processing options in the following order:" +
            "</p><p>" +
            "1. Hue shift for more orange<br>" +
            "2. Remove green cast and Leave some green<br>" +
            "3. Fix star colors" +
            "</p>";
      this.narrowbandExtraOptionsSizer = new HorizontalSizer;
      //this.narrowbandExtraOptionsSizer.margin = 6;
      //this.narrowbandExtraOptionsSizer.spacing = 4;
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions1_sizer );
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions2_sizer );
      this.narrowbandExtraOptionsSizer.toolTip = this.narrowbandExtraLabel.toolTip;
      this.narrowbandExtraOptionsSizer.addStretch();

      // Extra processing
      var extraRemoveStars_Tooltip = 
            "<p>Run Starnet or StarXTerminator on image to generate a starless image and a separate image for the stars.</p>" + 
            "<p>When this is selected, extra processing is applied to the starless image. Smaller stars option is run on star images.</p>" + 
            "<p>At the end of the processing a combined image can be created from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            stars_combine_operations_Tooltip;
      this.extraRemoveStars_CheckBox = newCheckBox(this, "Remove stars", par.extra_remove_stars, extraRemoveStars_Tooltip);
      this.extraUnscreenStars_CheckBox = newCheckBox(this, "Unscreen", par.extra_unscreen_stars, unscreen_tooltip);
      this.extraRemoveStars_Sizer = new HorizontalSizer;
      this.extraRemoveStars_Sizer.spacing = 4;
      this.extraRemoveStars_Sizer.add( this.extraRemoveStars_CheckBox);
      this.extraRemoveStars_Sizer.add( this.extraUnscreenStars_CheckBox);
      this.extraRemoveStars_Sizer.toolTip = this.narrowbandExtraLabel.toolTip;
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
            "<li>All occurances of text starless replaced with text stars</li>" +
            "<li>All occurances of text starless_edit followed by a number (starless_edit[1-9]*) replaced with text stars</li>" +
            "<li>Text starless at the end replaced with text stars</li>" +
            "<li>Text starless and any text that follows it (starless.*) replaced with text stars</li>" +
            "<li>Text starless and any text that follows it (starless.*) replaced with text stars and any text after text stars " + 
            "is accepted (stars.*). So starless image <i>sameprefix</i>_starless_<i>whatever</i> is matched with stars image " + 
            "<i>sameprefix</i>_stars_<i>doesnotmatterwhatishere</i>.</li>" +
            "</ol>" +
            stars_combine_operations_Tooltip + 
            extraCombineStarsReduce_Tooltip;
      this.extraCombineStars_CheckBox = newCheckBox(this, "Combine starless and stars", par.extra_combine_stars, extraCombineStars_Tooltip);
      this.extraCombineStars_ComboBox = newComboBox(this, par.extra_combine_stars_mode, starless_and_stars_combine_values, extraCombineStars_Tooltip);
      
      this.extraCombineStars_Sizer1= new HorizontalSizer;
      this.extraCombineStars_Sizer1.spacing = 4;
      this.extraCombineStars_Sizer1.add( this.extraCombineStars_CheckBox);
      this.extraCombineStars_Sizer1.add( this.extraCombineStars_ComboBox);
      this.extraCombineStars_Sizer1.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombineStars_Sizer1.addStretch();

      this.extraCombineStarsReduce_Label = newLabel(this, "Reduce stars", extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_ComboBox = newComboBox(this, par.extra_combine_stars_reduce, star_reduce_methods, 
            extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_S_edit = newNumericEdit(this, 'S', par.extra_combine_stars_reduce_S, 0.0, 1.0, 
            "<p>To reduce stars size more with Transfer and Halo, lower S value.<p>" + extraCombineStarsReduce_Tooltip);
      var extraCombineStarsReduce_M_toolTip = "<p>Star method mode; 1=Strong; 2=Moderate; 3=Soft reductions.</p>" + extraCombineStarsReduce_Tooltip;
      this.extraCombineStarsReduce_M_Label = newLabel(this, "I", extraCombineStarsReduce_M_toolTip);
      this.extraCombineStarsReduce_M_SpinBox = newSpinBox(this, par.extra_combine_stars_reduce_M, 1, 3, 
            extraCombineStarsReduce_M_toolTip);

      this.extraCombineStars_Sizer2 = new HorizontalSizer;
      this.extraCombineStars_Sizer2.spacing = 4;
      this.extraCombineStars_Sizer2.addSpacing(20);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_Label);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_ComboBox);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_S_edit);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_M_Label);
      this.extraCombineStars_Sizer2.add( this.extraCombineStarsReduce_M_SpinBox);
      this.extraCombineStars_Sizer2.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombineStars_Sizer2.addStretch();

      this.extraStarsImageLabel = newLabel(this, "Starless image", "Text Auto or empty image uses default starless image.");
      this.extraStarsImageEdit = newTextEdit(this, par.extra_combine_stars_image, this.extraStarsImageLabel.toolTip);
      this.extraStarsImageSelectButton = new ToolButton(this);
      this.extraStarsImageSelectButton.text = "Select";
      this.extraStarsImageSelectButton.icon = this.scaledResource(":/icons/find.png");
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
                  this.dialog.extraStarsImageEdit.text = selectStars.name;
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
      this.extraCombineStars_Sizer.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombineStars_Sizer.addStretch();

      this.extraDarkerBackground_CheckBox = newCheckBox(this, "Darker background", par.extra_darker_background, 
            "<p>Make image background darker.</p>" );
      this.extraABE_CheckBox = newCheckBox(this, "ABE", par.extra_ABE, 
            "<p>Run AutomaticBackgroundExtractor.</p>" );

      var extra_ET_tooltip = "<p>Run ExponentialTransform on image using a mask.</p>";
      this.extra_ET_CheckBox = newCheckBox(this, "ExponentialTransform,", par.extra_ET, extra_ET_tooltip);
      this.extra_ET_edit = newNumericEdit(this, 'Order', par.extra_ET_order, 0.1, 6, "Order value for ExponentialTransform.");
      this.extra_ET_Sizer = new HorizontalSizer;
      this.extra_ET_Sizer.spacing = 4;
      this.extra_ET_Sizer.add( this.extra_ET_CheckBox );
      this.extra_ET_Sizer.add( this.extra_ET_edit );
      this.extra_ET_Sizer.toolTip = extra_ET_tooltip;
      this.extra_ET_Sizer.addStretch();

      var extra_HDRMLT_tooltip = "<p>Run HDRMultiscaleTransform on image using a mask.</p>" +
                                 "<p>Color option is used select different methods to keep hue and saturation. " + 
                                 "Option 'Preserve hue' uses HDRMLT preserve  hue option. " + 
                                 "Option 'Color corrected' uses a method described by Russell Croman</p>" + 
                                 "<p>Layers selection specifies the layers value for HDRMLT.</p>";
      this.extra_HDRMLT_CheckBox = newCheckBox(this, "HDRMultiscaleTransform", par.extra_HDRMLT, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Layers_Label = new Label( this );
      this.extra_HDRMLT_Layers_Label.text = "Layers";
      this.extra_HDRMLT_Layers_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Layers_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_Layers_SpinBox = newSpinBox(this, par.extra_HDRMLT_layers, 2, 10, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Color_Label = new Label( this );
      this.extra_HDRMLT_Color_Label.text = "Color";
      this.extra_HDRMLT_Color_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Color_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_color_ComboBox = newComboBox(this, par.extra_HDRMLT_color, extra_HDRMLT_color_values, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Options_Sizer = new HorizontalSizer;
      this.extra_HDRMLT_Options_Sizer.spacing = 4;
      this.extra_HDRMLT_Options_Sizer.addSpacing(20);
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Color_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_color_ComboBox );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_SpinBox );
      this.extra_HDRMLT_Options_Sizer.addStretch();
      this.extra_HDRMLT_Sizer = new VerticalSizer;
      this.extra_HDRMLT_Sizer.spacing = 4;
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_CheckBox );
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_Options_Sizer );
            
      var extra_LHE_tooltip = "<p>Run LocalHistogramEqualization on image using a mask.</p>";
      this.extra_LHE_CheckBox = newCheckBox(this, "LocalHistogramEqualization,", par.extra_LHE, extra_LHE_tooltip);
      this.extra_LHE_edit = newNumericEdit(this, 'Kernel Radius', par.extra_LHE_kernelradius, 16, 512, "Kernel radius value for LocalHistogramEqualization.");
      this.extra_LHE_sizer = new HorizontalSizer;
      this.extra_LHE_sizer.spacing = 4;
      this.extra_LHE_sizer.add( this.extra_LHE_CheckBox );
      this.extra_LHE_sizer.add( this.extra_LHE_edit );
      this.extra_LHE_sizer.toolTip = extra_LHE_tooltip;
      this.extra_LHE_sizer.addStretch();
      
      this.extra_Contrast_CheckBox = newCheckBox(this, "Add contrast", par.extra_contrast, 
            "<p>Run slight S shape curves transformation on image to add contrast.</p>" );
      this.contrastIterationsSpinBox = newSpinBox(this, par.extra_contrast_iterations, 1, 5, "Number of iterations for contrast enhancement");
      this.contrastIterationsLabel = new Label( this );
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

      this.extra_stretch_CheckBox = newCheckBox(this, "Auto stretch", par.extra_stretch, 
            "<p>Run automatic stretch on image. Can be helpful in some rare cases but it is most useful on testing stretching settings with Apply button.</p>" );
      this.extra_force_new_mask_CheckBox = newCheckBox(this, "New mask", par.extra_force_new_mask, 
            "<p>Do not use existing mask but create a new luminance or star mask when needed.</p>" );

      var shadowclipTooltip = "<p>Run shadow clipping on image. Clip percentage tells how many shadow pixels are clipped.</p>";
      this.extra_shadowclip_CheckBox = newCheckBox(this, "Clip shadows,", par.extra_shadowclipping, shadowclipTooltip);
      this.extra_shadowclipperc_edit = newNumericEditPrecision(this, 'percent', par.extra_shadowclippingperc, 0, 100, shadowclipTooltip, 3);
      this.extra_shadowclip_Sizer = new HorizontalSizer;
      this.extra_shadowclip_Sizer.spacing = 4;
      this.extra_shadowclip_Sizer.add( this.extra_shadowclip_CheckBox );
      this.extra_shadowclip_Sizer.add( this.extra_shadowclipperc_edit );
      this.extra_shadowclip_Sizer.toolTip = shadowclipTooltip;
      this.extra_shadowclip_Sizer.addStretch();

      var smoothBackgroundTooltip = 
            "<p>Smoothen background below a given pixel value. Pixel value can be found for example " +
            "from the preview image using a mouse.</p>" +
            smoothBackgroundTooltipGeneric;

      this.extra_smoothBackground_CheckBox = newCheckBox(this, "Smoothen background,", par.extra_smoothbackground, smoothBackgroundTooltip);
      this.extra_smoothBackground_edit = newNumericEditPrecision(this, 'value', par.extra_smoothbackgroundval, 0, 100, smoothBackgroundTooltip, 5);
      this.extra_smoothBackground_Sizer = new HorizontalSizer;
      this.extra_smoothBackground_Sizer.spacing = 4;
      this.extra_smoothBackground_Sizer.add( this.extra_smoothBackground_CheckBox );
      this.extra_smoothBackground_Sizer.add( this.extra_smoothBackground_edit );
      this.extra_smoothBackground_Sizer.toolTip = smoothBackgroundTooltip;
      this.extra_smoothBackground_Sizer.addStretch();

      this.extra_SmallerStars_CheckBox = newCheckBox(this, "Smaller stars", par.extra_smaller_stars, 
            "<p>Make stars smaller on image.</p>" );
      this.smallerStarsIterationsSpinBox = newSpinBox(this, par.extra_smaller_stars_iterations, 0, 10, 
            "Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection");
      this.smallerStarsIterationsLabel = new Label( this );
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
      this.extra_NoiseReduction_CheckBox = newCheckBox(this, "Noise reduction", par.extra_noise_reduction, 
            extra_noise_reduction_tooltip);

      this.extraNoiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.extra_noise_reduction_strength, noise_reduction_strength_values, extra_noise_reduction_tooltip);
      this.extraNoiseReductionStrengthLabel = new Label( this );
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

      this.extra_ACDNR_CheckBox = newCheckBox(this, "ACDNR noise reduction", par.extra_ACDNR, 
            "<p>Run ACDNR noise reduction on image using a lightness mask.</p><p>StdDev value is taken from noise reduction section.</p>" + ACDNR_StdDev_tooltip);
      this.extra_color_noise_CheckBox = newCheckBox(this, "Color noise reduction", par.extra_color_noise, 
            "<p>Run color noise reduction on image.</p>" );
      this.extra_star_noise_reduction_CheckBox = newCheckBox(this, "Star noise reduction", par.extra_star_noise_reduction, 
            "<p>Run star noise reduction on star image.</p>" );

      var extra_sharpen_tooltip = "<p>Sharpening on image using a luminance mask.</p>" + 
                                  "<p>Number of iterations specifies how many times the sharpening is run.</p>" +
                                  "<p>If BlurXTerminator is used for sharpening then iterations parameter is ignored.</p>";
      this.extra_sharpen_CheckBox = newCheckBox(this, "Sharpening", par.extra_sharpen, extra_sharpen_tooltip);

      this.extraSharpenIterationsSpinBox = newSpinBox(this, par.extra_sharpen_iterations, 1, 10, extra_sharpen_tooltip);
      this.extraSharpenIterationsLabel = new Label( this );
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
      this.extra_unsharpmask_CheckBox = newCheckBox(this, "UnsharpMask", par.extra_unsharpmask, unsharpmask_tooltip);
      this.extraUnsharpMaskStdDevEdit = newNumericEdit(this, "StdDev", par.extra_unsharpmask_stddev, 0.1, 250, unsharpmask_tooltip);
      this.extraUnsharpMaskSizer = new HorizontalSizer;
      this.extraUnsharpMaskSizer.spacing = 4;
      this.extraUnsharpMaskSizer.add( this.extra_unsharpmask_CheckBox );
      this.extraUnsharpMaskSizer.add( this.extraUnsharpMaskStdDevEdit );
      this.extraUnsharpMaskSizer.addStretch();
      
      var extra_saturation_tooltip = "<p>Add saturation to the image using a luminance mask.</p>" + 
                                     "<p>Number of iterations specifies how many times add saturation is run.</p>";
      this.extra_saturation_CheckBox = newCheckBox(this, "Saturation", par.extra_saturation, extra_saturation_tooltip);

      this.extraSaturationIterationsSpinBox = newSpinBox(this, par.extra_saturation_iterations, 1, 20, extra_saturation_tooltip);
      this.extraSaturationIterationsLabel = new Label( this );
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

      this.extraImageLabel = new Label( this );
      this.extraImageLabel.text = "Target image";
      this.extraImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraImageLabel.toolTip = "<p>Target image for editing. By default edits are applied on a copy of target image. Copied " + 
            "is named as <target image>_edit.</p>" +
            "<p>Auto option is used when extra processing is done with Run or AutoContinue option.</p>";
      this.extraImageComboBox = new ComboBox( this );
      this.extraImageComboBox.minItemCharWidth = 20;
      this.extraImageComboBox.onItemSelected = function( itemIndex )
      {
            if (global.extra_target_image == extra_target_image_window_list[itemIndex]) {
                  return;
            }
            close_undo_images(this.dialog);
            global.extra_target_image = extra_target_image_window_list[itemIndex];
            console.writeln("global.extra_target_image " + global.extra_target_image);
            if (global.extra_target_image == "Auto") {
                  updatePreviewNoImage();
                  this.dialog.extraSaveButton.enabled = false;
            } else {
                  updatePreviewIdReset(global.extra_target_image, true);
                  this.dialog.extraSaveButton.enabled = true;
            }
      };
      update_extra_target_image_window_list(this, "Auto");
      global.extra_target_image = extra_target_image_window_list[0];

      var notetsaved_note = "<p>Note that edited image is not automatically saved to disk.</p>";
      this.extraApplyButton = new PushButton( this );
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
                  if (undo_images.length == 0) {
                        var saved_extra_target_image = global.extra_target_image;
                        if (!par.extra_apply_no_copy_image.val) {
                              // make copy of the original image
                              global.extra_target_image = copy_undo_edit_image(global.extra_target_image);
                        }
                        var first_undo_image_id = create_undo_image(global.extra_target_image);
                  } else {
                        var first_undo_image_id = null;
                  }
                  console.writeln("Apply extra processing edits on " + global.extra_target_image);
                  try {
                        engine.extraProcessingEngine(this.dialog, global.extra_target_image, util.is_narrowband_option());
                        if (undo_images.length == 0) {
                              // add first/original undo image
                              add_undo_image(this.dialog, global.extra_target_image, first_undo_image_id);
                              // save copy of original image to the window list and make is current
                              update_extra_target_image_window_list(this.dialog, global.extra_target_image);
                        }
                        let undo_image_id = create_undo_image(global.extra_target_image);
                        add_undo_image(this.dialog, global.extra_target_image, undo_image_id);
                        console.noteln("Apply completed");
                  } 
                  catch(err) {
                        if (first_undo_image_id != null) {
                              remove_undo_image(first_undo_image_id);
                              global.extra_target_image = saved_extra_target_image;
                        }
                        console.criticalln(err);
                        console.criticalln("Operation failed!");
                  }
            }
      };   

      this.extraUndoButton = new ToolButton( this );
      this.extraUndoButton.icon = new Bitmap( ":/icons/undo.png" );
      this.extraUndoButton.toolTip = 
            "<p>Undo last extra edit operation.</p>" + notetsaved_note;
      this.extraUndoButton.enabled = false;
      this.extraUndoButton.onMousePress = function()
      {
            apply_undo(this.dialog);
      };

      this.extraRedoButton = new ToolButton( this );
      this.extraRedoButton.icon = new Bitmap( ":/icons/redo.png" );
      this.extraRedoButton.toolTip = 
            "<p>Redo last extra edit operation.</p>" + notetsaved_note;
      this.extraRedoButton.enabled = false;
      this.extraRedoButton.onMousePress = function()
      {
            apply_redo(this.dialog);
      };

      this.extraSaveButton = new ToolButton( this );
      this.extraSaveButton.icon = new Bitmap( ":/icons/save-as.png" );
      this.extraSaveButton.toolTip = 
            "<p>Save current edited image to disk.</p>" + notetsaved_note;
      this.extraSaveButton.enabled = false;
      this.extraSaveButton.onMousePress = function()
      {
            save_as_undo(this.dialog);
      };

      this.extraImageSizer = new HorizontalSizer;
      this.extraImageSizer.margin = 6;
      this.extraImageSizer.spacing = 4;
      this.extraImageSizer.add( this.extraImageLabel );
      this.extraImageSizer.add( this.extraImageComboBox );
      this.extraImageSizer.add( this.extraApplyButton );
      this.extraImageSizer.add( this.extraUndoButton );
      this.extraImageSizer.add( this.extraRedoButton );
      this.extraImageSizer.add( this.extraSaveButton );
      this.extraImageSizer.addStretch();

      this.extra_image_no_copy_CheckBox = newCheckBox(this, "Do not make a copy for Apply", par.extra_apply_no_copy_image, 
            "<p>Do not make a copy of the image for Apply.</p>" );

      this.extraOptionsSizer = new HorizontalSizer;
      this.extraOptionsSizer.margin = 6;
      this.extraOptionsSizer.spacing = 4;
      this.extraOptionsSizer.add( this.extra_image_no_copy_CheckBox );
      this.extraOptionsSizer.add( this.extra_stretch_CheckBox );
      this.extraOptionsSizer.add( this.extra_force_new_mask_CheckBox );
      this.extraOptionsSizer.addStretch();

      this.extra1 = new VerticalSizer;
      this.extra1.margin = 6;
      this.extra1.spacing = 4;
      this.extra1.add( this.extraRemoveStars_Sizer );
      this.extra1.add( this.extra_shadowclip_Sizer );
      this.extra1.add( this.extra_smoothBackground_Sizer );
      this.extra1.add( this.extraABE_CheckBox );
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extra_ET_Sizer );
      this.extra1.add( this.extra_HDRMLT_Sizer );
      this.extra1.add( this.extra_LHE_sizer );
      this.extra1.add( this.extraContrastSizer );

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extraNoiseReductionStrengthSizer );
      this.extra2.add( this.extra_ACDNR_CheckBox );
      this.extra2.add( this.extra_color_noise_CheckBox );
      this.extra2.add( this.extra_star_noise_reduction_CheckBox );
      this.extra2.add( this.extraUnsharpMaskSizer );
      this.extra2.add( this.extraSharpenIterationsSizer );
      this.extra2.add( this.extraSaturationIterationsSizer );
      this.extra2.add( this.extraSmallerStarsSizer );
      this.extra2.add( this.extraCombineStars_Sizer );

      this.extraLabel = newSectionLabel(this, "Generic extra processing");
      this.extraLabel.toolTip = 
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
            "If multiple extra processing options are selected they are executed in the following order:" + 
            "</p>" +
            "<ol>" +
            "<li>Auto stretch</li>" +
            "<li>Narrowband options</li>" +
            "<li>Remove stars</li>" +
            "<li>AutomaticBackgroundExtractor</li>" +
            "<li>Darker background</li>" +
            "<li>ExponentialTransformation</li>" +
            "<li>HDRMultiscaleTransform</li>" +
            "<li>LocalHistogramEqualization</li>" +
            "<li>Add contrast</li>" +
            "<li>Noise reduction</li>" +
            "<li>ACDNR noise reduction</li>" +
            "<li>Color noise reduction</li>" +
            "<li>Sharpen using Unsharp Mask</li>" +
            "<li>Sharpening</li>" +
            "<li>Saturation</li>" +
            "<li>Smaller stars</li>" +
            "<li>Clip shadows</li>" +
            "<li>Smoothen background</li>" +
            "<li>Combine starless and stars images</li>" +
            "</ol>" +
            "<p>" +
            "If narrowband processing options are selected they are applied before extra processing options." +
            "</p>";

      this.extraGroupBoxSizer = new HorizontalSizer;
      //this.extraGroupBoxSizer.margin = 6;
      //this.extraGroupBoxSizer.spacing = 4;
      this.extraGroupBoxSizer.add( this.extra1 );
      this.extraGroupBoxSizer.add( this.extra2 );
      this.extraGroupBoxSizer.addStretch();

      this.extraControl = new Control( this );
      // this.extraControl.title = "Extra processing";
      this.extraControl.sizer = new VerticalSizer;
      this.extraControl.sizer.margin = 6;
      this.extraControl.sizer.spacing = 4;
      this.extraControl.sizer.add( this.narrowbandExtraLabel );
      this.extraControl.sizer.add( this.narrowbandExtraOptionsSizer );
      this.extraControl.sizer.add( this.extraLabel );
      this.extraControl.sizer.add( this.extraGroupBoxSizer );
      this.extraControl.sizer.add( this.extraImageSizer );
      this.extraControl.sizer.add( this.extraOptionsSizer );
      this.extraControl.sizer.addStretch();
      this.extraControl.visible = false;

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
                  savePersistentSettings(false);
                  //this.columnCountControlComboBox.currentItem = global.columnCount + 1;
            }
            update_extra_target_image_window_list(this.dialog, null);
            console.writeln("Close prefix completed");
      };

      closeAllPrefixButton = new PushButton( this );
      closeAllPrefixButton.text = "Close all prefixes";
      closeAllPrefixButton.icon = this.scaledResource( ":/icons/window-close-all.png" );
      closeAllPrefixButton.toolTip = "!!! See setWindowPrefixHelpTip !!!";
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
                        console.writeln("Close prefix '" + ppar.win_prefix + "'");
                        util.fixAllWindowArrays(ppar.win_prefix);
                        engine.closeAllWindows(par.keep_integrated_images.val, false);
                  }
                  // Go through the prefix list
                  for (var i = 0; i < ppar.prefixArray.length; i++) {
                        if (ppar.prefixArray[i][1] != '-') {
                              console.writeln("Close prefix '" + ppar.prefixArray[i][1] + "'");
                              util.fixAllWindowArrays(ppar.prefixArray[i][1]);
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
            update_extra_target_image_window_list(this.dialog, null);
            console.writeln("Close all prefixes completed");
      };

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

      this.use_large_preview_CheckBox = newGenericCheckBox(this, "Large preview", ppar, ppar.preview.use_large_preview, 
            "<p>Use a large preview window on the side of the main dialog.</p>",
            function(checked) { this.dialog.use_large_preview_CheckBox.aiParam.preview.use_large_preview = checked; });

      this.preview1Sizer = new HorizontalSizer;
      this.preview1Sizer.margin = 6;
      this.preview1Sizer.spacing = 4;
      this.preview1Sizer.add( this.show_preview_CheckBox );
      this.preview1Sizer.add( this.use_single_column_CheckBox );
      this.preview1Sizer.add( this.use_more_tabs_CheckBox );
      this.preview1Sizer.add( this.use_large_preview_CheckBox );
      this.preview1Sizer.addStretch();

      this.preview_width_label = newLabel(this, 'Preview width', "Preview image width.");
      this.preview_width_edit = newGenericSpinBox(this, ppar, ppar.preview.preview_width, 100, 4000, 
            "Preview image width.",
            function(value) { 
                  updatePreviewSize(value, 0); 
            }
      );
      this.preview_height_label = newLabel(this, 'height', "Preview image height.");
      this.preview_height_edit = newGenericSpinBox(this, ppar, ppar.preview.preview_height, 100, 4000, 
            "Preview image height.",
            function(value) { 
                  updatePreviewSize(0, value); 
            }
      );

      this.preview2Sizer = new HorizontalSizer;
      this.preview2Sizer.margin = 6;
      this.preview2Sizer.spacing = 4;
      this.preview2Sizer.add( this.preview_width_label );
      this.preview2Sizer.add( this.preview_width_edit );
      this.preview2Sizer.add( this.preview_height_label );
      this.preview2Sizer.add( this.preview_height_edit );
      this.preview2Sizer.addStretch();
      this.preview2Sizer.add( this.saveInterfaceButton );

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
      this.processDefaultsButton.toolTip = "<p>Print process default values.</p>";
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
      this.interfaceControl.sizer.add( this.preview2Sizer );
      this.interfaceControl.sizer.add( this.interfaceSizer );
      if (par.use_manual_icon_column.val) {
            this.interfaceControl.sizer.add( this.interfaceManualColumnSizer );
      }
      this.interfaceControl.sizer.add( this.interfaceSizer2 );

      this.interfaceControl.sizer.addStretch();
      this.interfaceControl.visible = true;

      this.newInstance_Button = new ToolButton(this);
      this.newInstance_Button.icon = new Bitmap( ":/process-interface/new-instance.png" );
      this.newInstance_Button.toolTip = "New Instance";
      this.newInstance_Button.onMousePress = function()
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
      this.savedefaults_Button.onMousePress = function()
      {
            saveParametersToPersistentModuleSettings();
      };
      this.reset_Button = new ToolButton(this);
      this.reset_Button.icon = new Bitmap( ":/images/icons/reset.png" );
      this.reset_Button.toolTip = "Set default values for all parameters.";
      this.reset_Button.onMousePress = function()
      {
            util.setParameterDefaults();
      };
      this.website_Button = new ToolButton(this);
      this.website_Button.icon = new Bitmap( ":/icons/internet.png" );
      this.website_Button.toolTip = "Browse documentation on AutoIntegrate web site.";
      this.website_Button.onMousePress = function()
      {
            Dialog.openBrowser("https://ruuth.xyz/AutoIntegrateInfo.html");
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
      this.buttons_Sizer.add( this.website_Button );
      this.buttons_Sizer.addSpacing( 6 );
      this.buttons_Sizer.add( this.adjusttocontent_Button );
      this.buttons_Sizer.addSpacing( 6 );
      this.buttons_Sizer.add( this.info_Sizer );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( closeAllPrefixButton );
      this.buttons_Sizer.addSpacing( 48 );
      this.buttons_Sizer.add( this.closeAllButton );
      this.buttons_Sizer.add( this.autoContinueButton );
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
      newSectionBarAdd(this, this.leftGroupBox, this.narrowbandControl, "Narrowband processing", "Narrowband1");
      this.leftGroupBox.sizer.addStretch();

      // Settings right group box
      this.rightGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.rightGroupBox, this.otherParamsControl, "Other parameters", "Other1");
      newSectionBarAdd(this, this.rightGroupBox, this.mosaicSaveControl, "Save final image files", "Savefinalimagefiles");
      this.rightGroupBox.sizer.addStretch();

      // Left processing group box
      this.leftProcessingGroupBox = newGroupBoxSizer(this);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Stretching settings", "ps_stretching",
            [ this.StretchingGroupBoxLabel,
              this.StretchingGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Linear fit and LRGB combination settings", "ps_linearfit_combination",
            [ this.linearFitAndLRGBCombinationSizer ]);
      newSectionBarAddArray(this, this.leftProcessingGroupBox, "Saturation, noise reduction and sharpening settings", "ps_saturation_noise",
            [ this.saturationGroupBoxLabel,
              this.saturationGroupBoxSizer,
              this.noiseReductionGroupBoxLabel,
              this.noiseReductionGroupBoxSizer,
              this.sharpeningGroupBoxLabel,
              this.sharpeningGroupBoxSizer,
              this.sharpeningGroupBoxSizer2 ]);
      this.leftProcessingGroupBox.sizer.addStretch();

      // Right processing group box
      this.rightProcessingGroupBox = newGroupBoxSizer(this);
      newSectionBarAddArray(this, this.rightProcessingGroupBox, "Image integration and local normalization settings", "ps_integration",
            [ this.clippingGroupBoxLabel,
              this.clippingGroupBoxSizer,
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
              this.imageSolvingGroupBoxSizer2,
              this.colorCalibrationGroupBoxLabel,
              this.colorCalibrationGroupBoxSizer ]);
      newSectionBarAdd(this, this.rightProcessingGroupBox, this.narrowbandRGBmappingControl, "Narrowband to RGB mapping", "NarrowbandRGB1");
      this.rightProcessingGroupBox.sizer.addStretch();
        
      // Extra processing group box
      this.extraGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.extraGroupBox, this.extraControl, "Extra processing", "Extra1");
      this.extraGroupBox.sizer.addStretch();

      if (global.use_preview) {
            /* Create preview objects.
             */
            this.tabPreviewObj = newPreviewObj(this);

            tabPreviewControl = this.tabPreviewObj.control;
            tabPreviewInfoLabel = this.tabPreviewObj.infolabel;
            global.tabStatusInfoLabel = this.tabPreviewObj.statuslabel;

            this.sidePreviewObj = newPreviewObj(this);

            sidePreviewControl = this.sidePreviewObj.control;
            sidePreviewInfoLabel = this.sidePreviewObj.infolabel;
            global.sideStatusInfoLabel = this.sidePreviewObj.statuslabel;

            updateSidePreviewState();
      }

      this.interfaceGroupBox = newGroupBoxSizer(this);
      newSectionBarAdd(this, this.interfaceGroupBox, this.interfaceControl, "Interface settings", "interface");
      this.interfaceGroupBox.sizer.addStretch();

      /* ------------------------------- */
      /* Create tabs.                    */
      /* ------------------------------- */

      this.mainTabBox = new TabBox( this );
      mainTabBox = this.mainTabBox;
      let tab_index = 0;

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
                  this.previewSizer.add( this.tabPreviewObj.sizer );
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
                  this.previewSizer.add( this.tabPreviewObj.sizer );
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

      this.mainSizer = new HorizontalSizer;
      this.mainSizer.margin = 6;
      this.mainSizer.spacing = 4;

      if (global.use_preview && !ppar.preview.use_large_preview) {
            this.mainSizer.add( this.sidePreviewObj.sizer);
      }
      this.mainSizer.add( this.mainTabBox );
      //this.mainSizer.addStretch();

      this.baseSizer = new VerticalSizer;
      this.baseSizer.margin = 6;
      this.baseSizer.spacing = 4;
      this.baseSizer.add( this.tabBox);             // Files tabs
      this.baseSizer.add( this.filesButtonsSizer);  // Buttons row below files
      this.baseSizer.add( this.mainSizer );         // Main view with tabbs
      this.baseSizer.add( this.buttons_Sizer );     // Buttons at the bottom

      this.sizer = new HorizontalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      if (global.use_preview && ppar.preview.use_large_preview) {
            this.sizer.add( this.sidePreviewObj.sizer);
      }
      this.sizer.add( this.baseSizer);
      //this.sizer.addStretch();

      // Version number
      this.windowTitle = global.autointegrate_version; 
      this.userResizable = true;
      this.adjustToContents();
      //this.setVariableSize();
      //this.files_GroupBox.setFixedHeight();

      setWindowPrefixHelpTip(ppar.win_prefix);

      console.show();
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

/* Exported data for testing.
 */
this.closeAllPrefixButton = closeAllPrefixButton;

}  /* AutoIntegrateGUI*/

AutoIntegrateGUI.prototype = new Object;
