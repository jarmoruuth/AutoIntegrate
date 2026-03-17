/*
        AutoIntegrate GUI components.

Interface functions:

    See end of the file.

Interface objects:

    AutoIntegrateGUI class

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2026 Jarmo Ruuth.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEGUI_JS
#define AUTOINTEGRATEGUI_JS

#include "AutoIntegrateMetricsVisualizer.js"
#include "AutoIntegrateTutorial.js"
#include "AutoIntegrateGUITools.js"
#include "AutoIntegrateEnhancementsGUI.js"

class AutoIntegrateNarrowbandSelectMultipleDialog extends Dialog
{
      constructor(global, mappings_list)
      {
            super();
            this.restyle();

      this.self = this;

      this.labelWidth = this.font.width( "Object identifier:M" );
      this.editWidth = this.font.width( 'M' )*40;

      this.names = mappings_list;
   
      this.narrowbandSelectMultipleLabel = new Label( this );
      this.narrowbandSelectMultipleLabel.text = "Select mappings:"

      this.select_Sizer = new VerticalSizer;
      this.select_Sizer.spacing = 6;

      this.current_mappings = mappings_list.split(",");
      this.checked_status = [];

      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            if (!this.global.narrowBandPalettes[i].checkable) {
                  continue;
            }
            var checked = false;
            for (var j = 0; j < current_mappings.length; j++) {
                  if (this.global.narrowBandPalettes[i].name == this.current_mappings[j].trim()) {
                        checked = true;
                        break;
                  }
            }
            this.checked_status[i] = checked

            var cb = new CheckBox( this );
            cb.text = this.global.narrowBandPalettes[i].name;
            cb.toolTip = "<p>R: " + this.global.narrowBandPalettes[i].R + ", G: " + this.global.narrowBandPalettes[i].G + ", B: " + this.global.narrowBandPalettes[i].B + "</p>";
            cb.checked = checked;
            cb.index = i;
            cb.onClick = (checked) => {
                  this.checked_status[cb.index] = checked;
            }

            this.select_Sizer.add( cb );
      }

      this.select_Sizer.addStretch();

      // Common Buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = () => {
            this.names = "";
            for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
                  if (this.checked_status[i]) {
                        if (this.names == "") {
                              this.names = this.global.narrowBandPalettes[i].name;
                        } else {
                              this.names = this.names + ", " + this.global.narrowBandPalettes[i].name;
                        }
                  }
            }
            this.dialog.ok();
      };

      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = () => {
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
      this.ensureLayoutUpdated();
      this.adjustToContents();

} // constructor
} // AutoIntegrateNarrowbandSelectMultipleDialog

class AutoIntegrateGUI extends Dialog
{

      constructor(global, util, engine, flowchart)
      {
            super();

this.global = global;
this.util = util;
this.engine = engine;
this.flowchart = flowchart;

if (this.global.debug) console.writeln("AutoIntegrateGUI");

this.guitools = new AutoIntegrateGUITools(this, global, util, engine);

this.enhancements_gui = null;

this.par = this.global.par;
this.ppar = this.global.ppar;

this.dialog_mode = 1;    // 0 = minimized, 1 = normal, 2 = maximized
this.dialog_old_position = null;
this.dialog_min_position = null;

this.infoLabel = null;
this.imageInfoLabel = null;
this.windowPrefixHelpTips = null;              // For updating tooTip
this.closeAllPrefixButton = null;              // For updating toolTip
this.windowPrefixComboBox = null;       // For updating prefix name list
this.autoContinueWindowPrefixComboBox = null; // For updating prefix name list
this.outputDirEdit = null;                     // For updating output root directory
this.previewControl = null;          // For updating preview window
this.previewInfoLabel = null;        // For updating preview info text
this.histogramControl = null;       // For updating histogram window
this.mainTabBox = null;                 // For switching to preview tab

this.filtering_changed = false;        // Filtering settings have changed
this.is_some_preview = false;
this.preview_size_changed = false;
this.preview_keep_zoom = false;

this.current_selected_file_name = null;
this.current_selected_file_filter = null;

this.monochrome_text = "Monochrome: ";

this.blink_window = null;
this.blink_zoom = false;
this.blink_zoom_x = 0;
this.blink_zoom_y = 0;

this.filterSectionbars = [];
this.filterSectionbarcontrols = [];

this.extract_channel_mapping_values = [ "None", "LRGB", "HSO", "HOS" ];
this.RGBNB_mapping_values = [ 'H', 'S', 'O', '' ];
this.use_weight_values = [ 'Generic', 'Noise', 'Stars', 'PSF Signal', 'PSF Signal scaled', 'FWHM scaled', 'Eccentricity scaled', 'SNR scaled', 'Star count' ];
this.filter_limit_values = [ 'None', 'FWHM', 'Eccentricity', 'PSFSignal', 'PSFPower', 'SNR', 'Stars'];
this.filter_sort_values = [ 'SSWEIGHT', 'FWHM', 'Eccentricity', 'PSFSignal', 'PSFPower', 'SNR', 'Stars', 'File name' ];
this.outliers_methods = [ 'Two sigma', 'One sigma', 'IQR' ];
this.use_linear_fit_values = [ 'Auto', 'Min RGB', 'Max RGB', 'Min LRGB', 'Max LRGB', 'Red', 'Green', 'Blue', 'Luminance', 'No linear fit' ];
this.use_clipping_values = [ 'Auto1', 'Auto2', 'Percentile', 'Sigma', 'Averaged sigma', 'Winsorised sigma', 'Linear fit', 'ESD', 'None' ]; 
this.narrowband_linear_fit_values = [ 'Auto', 'Min', 'Max', 'H', 'S', 'O', 'None' ];
this.imageintegration_normalization_values = [ 'Additive', 'Adaptive', 'None' ];
this.imageintegration_combination_values = [ 'Average', 'Median', 'Minimum', 'Maximum' ];
this.noise_reduction_strength_values = [ '0', '1', '2', '3', '4', '5', '6'];
this.column_count_values = [ 'Auto', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
                            '11', '12', '13', '14', '15', '16', '17', '18', '19', '20' ];
this.binning_values = [ 'None', 'Color', 'L and color'];
this.spcc_white_reference_values = [ 'Average Spiral Galaxy', 'Photon Flux' ];
this.target_binning_values = [ 'Auto', 'None',  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ];
this.target_drizzle_values = [ 'Auto', 'None',  '2', '4' ];
this.target_type_values = [ 'Default', 'Galaxy', 'Nebula', 'Star cluster' ];
this.graxpert_batch_size_values = [ '1', '2', '4', '8', '16', '32' ];
this.RGBHa_preset_values = [ 'Combine Continuum Subtract', 'SPCC Continuum Subtract' ];
this.RGBHa_prepare_method_values = [ 'Continuum Subtract', 'Basic' ];
this.RGBHa_combine_time_values = [ 'Stretched', 'SPCC linear' ];
this.RGBHa_combine_method_values = [ 'Bright structure add', 'Screen', 'Med subtract add', 'Max', 'Add', 'None' ];
this.color_calibration_time_values = [ 'auto', 'linear', 'nonlinear', 'both' ];
this.RGBHa_test_values = [ 'Mapping', 'Continuum', 'All mappings' ];
this.fast_mode_values = [ 'S', 'M' ];
this.drizzle_function_values = [ 'Square', 'Circular', 'Gaussian' ];

this.screen_size = "Unknown";       // Screen wxh size as a string
this.screen_width = 0;              // Screen width in pixels
this.screen_height = 0;             // Screen height in pixels

this.metricsVisualizerToolTip =            "<p>Show SubframeSelector metrics visualizer dialog.</p>" +
                                          "<p>Before using metrics visualizer, ensure that you have loaded light files.</p>" +
                                          "<p>Filtering settings in the <i>Preprocessing / Weighting and filtering settings</i> section " +
                                          "are used for visualization.</p>" +
                                          "<p>If no filtering rules are set then default settings are used.</p>";

this.exclusion_area_image_window_list = null;

this.AutoIntegrateDialog();

} // constructor

update_enhancements_target_image_window_list(current_item)
{
      this.exclusion_area_image_window_list = this.enhancements_gui.update_enhancements_target_image_window_list(current_item);

      // Exclusion area image list is kept in sync with extra_target_image_window_list
      this.guitools.exclusionAreasComboBox.clear();
      for (var i = 0; i < this.exclusion_area_image_window_list.length; i++) {
            this.guitools.exclusionAreasComboBox.addItem( this.exclusion_area_image_window_list[i] );
      }
}

close_undo_images()
{
      this.enhancements_gui.close_undo_images();
}

forceNewHistogram(target_win)
{
      try {
            if (!target_win.mainView.deleteProperty("Histogram16")) {
                  // console.writeln("Failed to delete property Histogram16");
            }
      } catch(err) {
            // console.writeln("Failed to delete property Histogram16 : " + err);
      }
}

flowchartUpdated()
{
      if (this.par.show_flowchart.val && !this.global.get_flowchart_data) {
            if (this.global.debug) console.writeln("flowchartUpdated");
            try {
                  var obj = this.flowchart.flowchartGraph(this.global.flowchartData, this.guitools.current_preview.image, this.guitools.current_preview.txt);
                  if (obj) {
                        this.updatePreviewImage(this.previewControl, obj.image, obj.text, this.histogramControl, this.global.enhancements_target_histogram_info, true);
                  }
            } catch (ex) {
                  console.writeln("flowchartUpdated: " + ex);
            }
      }
}

copyFileNames(fileNames)
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

generateNewFlowchartData(parent)
{
      var savedOutputRootDir = this.global.outputRootDir;

      this.util.beginLog();

      console.writeln("generateNewFlowchartData");
      console.flush();

      this.getFilesFromTreebox(parent.dialog);

      if (this.global.lightFileNames == null) {
            console.criticalln("No files, cannot generate flowchart data");
            this.util.endLog();
            return false;
      }

      var succp = true;
      this.guitools.current_preview.image = null;
      this.guitools.current_preview.image_versions = [];

      this.flowchart.flowchartReset();

      console.writeln("generateNewFlowchartData: copy file names");
      var lightFileNamesCopy = this.copyFileNames(this.global.lightFileNames);
      var darkFileNamesCopy = this.copyFileNames(this.global.darkFileNames);
      var biasFileNamesCopy = this.copyFileNames(this.global.biasFileNames);
      var flatdarkFileNamesCopy = this.copyFileNames(this.global.flatdarkFileNames);
      var flatFileNamesCopy = this.copyFileNames(this.global.flatFileNames);

      // Use prefix when running flowchart to avoid name conflicts
      var saved_win_prefix = this.ppar.win_prefix;
      this.ppar.win_prefix = "AutoIntegrateFlowchart_";

      // this.global.all_windows is a special case if we run the script multiple times
      var old_all_windows = this.global.all_windows;
      this.global.all_windows = [];

      this.util.fixAllWindowArrays(this.ppar.win_prefix);
      this.util.closeAllWindows(false, false);

      this.global.get_flowchart_data = true;
      try {
            this.engine.autointegrateProcessingEngine(parent.dialog, false, false, "Generate flowchart data");
      } catch (x) {
            this.util.addCriticalStatus("generateNewFlowchartData failed calling autointegrateProcessingEngine:" + x);
            this.global.flowchartData = null;
            this.global.is_processing = this.global.processing_state.none;
            succp = false;
      }
      this.global.get_flowchart_data = false;

      // Close all windows with flowchart prefix
      this.util.fixAllWindowArrays(this.ppar.win_prefix);
      this.util.closeAllWindows(false, false);

      // restore original prefix
      this.ppar.win_prefix = saved_win_prefix;
      this.util.fixAllWindowArrays(this.ppar.win_prefix);

      this.util.closeAllWindowsFromArray(this.global.flowchartWindows);
      this.global.flowchartWindows = [];

      console.writeln("generateNewFlowchartData: restore original file names");
      this.global.lightFileNames = lightFileNamesCopy;
      this.global.darkFileNames = darkFileNamesCopy;
      this.global.biasFileNames = biasFileNamesCopy;
      this.global.flatdarkFileNames = flatdarkFileNamesCopy;
      this.global.flatFileNames = flatFileNamesCopy;
      this.global.all_windows = old_all_windows;
      
      this.util.runGarbageCollection();
      console.flush();

      console.writeln("generateNewFlowchartData done");
      console.flush();

      this.engine.writeProcessingStepsAndEndLog(null, false, "AutoFlowchart", false);
      console.writeln("AutoFlowchart log written");
      console.flush();

      this.global.outputRootDir = savedOutputRootDir;

      return succp;
}

isbatchNarrowbandPaletteMode()
{
      return (this.par.custom_R_mapping.val == "All" && this.par.custom_G_mapping.val == "All" && this.par.custom_B_mapping.val == "All") ||
              this.par.use_narrowband_multiple_mappings.val;
}

previewControlCleanup(control)
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

previewCleanup(previewObj)
{
      this.previewControlCleanup(previewObj.control);
      previewObj.control = null;
      previewObj.infolabel = null;
      previewObj.statuslabel = null;
}

variableCleanup()
{
      this.infoLabel = null;
      this.imageInfoLabel = null;
      this.windowPrefixHelpTips = null;
      this.closeAllPrefixButton = null;
      this.windowPrefixComboBox = null;
      this.outputDirEdit = null;
      this.previewControl = null;
      this.previewInfoLabel = null;
      this.mainTabBox = null;
}

exitCleanup(dialog)
{
      // console.writeln("exitCleanup");
      if (this.blink_window != null) {
            this.blink_window.forceClose();
            this.blink_window = null;
      }
      this.close_undo_images(true);
      if (this.global.use_preview) {
            if (dialog.previewObj != null) {
                  this.previewCleanup(dialog.previewObj);
                  dialog.previewObj = null;
            }
      }
      if (this.guitools.current_preview.imgWin != null) {
            this.guitools.current_preview.imgWin.forceClose();
            this.guitools.current_preview.imgWin = null;
      }
      this.variableCleanup();
      this.util.checkEvents();
}

// Create a table of known prefix names for toolTip
// Also update window prefix combo box list
setWindowPrefixHelpTip(default_prefix)
{
      var prefix_list = "<table><tr><th>Col</th><th>Name</th><th>Icon count</th></tr>";
      if (this.ppar.prefixArray.length == 0) {
            prefix_list = prefix_list + "<tr><td></td><td><i>No prefixes</i></td><td></td></tr>";
      } else {
            for (var i = 0; i < this.ppar.prefixArray.length; i++) {
                  if (this.ppar.prefixArray[i] != null && this.ppar.prefixArray[i][1] != '-') {
                        prefix_list = prefix_list + "<tr><td>" + (this.ppar.prefixArray[i][0] + 1) + '</td><td>' + this.ppar.prefixArray[i][1] + '</td><td>' + this.ppar.prefixArray[i][2] + '</td></tr>';
                  }
            }
      }
      prefix_list = prefix_list + "</table>";
      this.windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p><p> " + prefix_list + "</p>";
      this.closeAllPrefixButton.toolTip = "<p>Close all windows that are created by this script using <b>all known prefixes</b> (which can be empty prefix).</p>" +
                                     "<p>Prefixes used to close windows are default empty prefix, prefix in the Window Prefix box and all saved window prefixes. " +
                                     "All saved prefix information is cleared after this operation.</p>" +
                                     "<p>To close windows with current prefix use Close all button.</p>" +
                                     this.windowPrefixHelpTips.toolTip;

      this.windowPrefixComboBox.clear();
      this.autoContinueWindowPrefixComboBox.clear();
      var pa = this.get_win_prefix_combobox_array(default_prefix);
      this.guitools.addArrayToComboBox(this.windowPrefixComboBox, pa);
      this.guitools.addArrayToComboBox(this.autoContinueWindowPrefixComboBox, pa);
      this.windowPrefixComboBox.editText = this.validateWindowPrefix(this.ppar.win_prefix);
      this.windowPrefixComboBox.currentItem = pa.indexOf(this.validateWindowPrefix(this.ppar.win_prefix));
}

fix_win_prefix_array()
{
      var new_prefix_array = [];

      for (var i = 0; i < this.ppar.prefixArray.length; i++) {
            if (this.ppar.prefixArray[i] == null) {
                  continue;
            } else if (!Array.isArray(this.ppar.prefixArray[i])) {
                  // bug fix, mark as free
                  continue;
            } else if (this.ppar.prefixArray[i][1] != '-') {
                  new_prefix_array[new_prefix_array.length] = this.ppar.prefixArray[i];
            }
      }
      this.ppar.prefixArray = new_prefix_array;
}

get_win_prefix_combobox_array(default_prefix)
{
      default_prefix = this.validateWindowPrefix(default_prefix);
      var name_array = [default_prefix];

      for (var i = 0; i < this.ppar.prefixArray.length; i++) {
            if (this.ppar.prefixArray[i] != null && this.ppar.prefixArray[i][1] != '-') {
                  var add_name = this.validateWindowPrefix(this.ppar.prefixArray[i][1]);
                  if (add_name != default_prefix) {
                        name_array[name_array.length] = add_name;
                  }
            }
      }
      return name_array;
}

// Find a prefix from the prefix array. Returns -1 if not
// found.
findPrefixIndex(prefix)
{
      for (var i = 0; i < this.ppar.prefixArray.length; i++) {
            if (this.ppar.prefixArray[i][1] == prefix) {
                  return i;
            }
      }
      return -1;
}

// Find a new free column position for a prefix. Prefix name '-'
// is used to mark a free position.
findNewPrefixIndex(find_free_column)
{
      if (find_free_column) {
            /* First mark all reserved column positions. */
            var reserved_columns = [];
            for (var i = 0; i < this.ppar.prefixArray.length; i++) {
                  if (this.ppar.prefixArray[i][1] != '-') {
                        reserved_columns[this.ppar.prefixArray[i][0]] = true;
                  }
            }
            /* Then find the first unused column position. */
            for (var i = 0; i < reserved_columns.length; i++) {
                  if (reserved_columns[i] != true) {
                        break;
                  }
            }
            var index = this.ppar.prefixArray.length;
            this.ppar.prefixArray[index] = [i, '-', 0];
            return index;
      } else {
            // Just return a new slot at the end of the array
            var index = this.ppar.prefixArray.length;
            this.ppar.prefixArray[index] = [0, '-', 0];
            return index;
      }
}

// Save persistent settings
savePersistentSettings(from_exit)
{
      if (this.global.do_not_write_settings) {
            console.noteln("Do not save interface settings to persistent module settings.");
      } else {
            console.noteln("Save persistent settings");
            Settings.write ("AutoIntegrate" + "/prefixName", DataType.String, this.ppar.win_prefix);
            Settings.write ("AutoIntegrate" + "/prefixArray", DataType.String, JSON.stringify(this.ppar.prefixArray));
            if (this.par.use_manual_icon_column.val) {
                  Settings.write ("AutoIntegrate" + "/this.global.columnCount", DataType.Int32, this.ppar.userColumnCount);
            }
            Settings.write ("AutoIntegrate" + "/previewSettings", DataType.String, JSON.stringify(this.ppar.preview));
            Settings.write ("AutoIntegrate" + "/useSingleColumn", DataType.Boolean, this.ppar.use_single_column);
            Settings.write ("AutoIntegrate" + "/useMoreTabs", DataType.Boolean, this.ppar.use_more_tabs);
            Settings.write ("AutoIntegrate" + "/filesInTab", DataType.Boolean, this.ppar.files_in_tab);
            Settings.write ("AutoIntegrate" + "/showStartupImage", DataType.Boolean, this.ppar.show_startup_image);
            Settings.write ("AutoIntegrate" + "/startupImageName", DataType.String, this.ppar.startup_image_name);
            Settings.write ("AutoIntegrate" + "/savedVersion", DataType.String, this.global.autointegrate_version);
            Settings.write ("AutoIntegrate" + "/savedInterfaceVersion", DataType.Int32, this.global.interface_version);
      }
      if (!from_exit) {
            this.setWindowPrefixHelpTip(this.ppar.win_prefix);
      }
}


/***************************************************************************
 * 
 *    Dialog functions are below this point
 * 
 */

// StarXTerminator settings
//
AImodelSizer(parent, name, param, toolTip) {
      var AImodelLabel = this.guitools.newLabel(parent, name, "<p>Select AI model for " + name + "</p>" + toolTip);
      var AImodelEdit = this.guitools.newTextEdit(parent, param, AImodelLabel.toolTip);
      var AImodelButton = new ToolButton( parent );
      AImodelButton.icon = parent.scaledResource(":/icons/select-file.png");
      AImodelButton.toolTip = AImodelLabel.toolTip;
      AImodelButton.setScaledFixedSize( 20, 20 );
      AImodelButton.onClick = () =>
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            AImodelEdit.text = File.extractName(ofd.fileName) + File.extractExtension(ofd.fileName);
            param.val = AImodelEdit.text;
      };
      var AImodelSizer = this.guitools.newHorizontalSizer(0, true, [ AImodelLabel, AImodelEdit, AImodelButton ]);

      return AImodelSizer
}

Autorun(parent)
{
      console.writeln("AutoRun");
      var stopped = true;
      var success = true;
      var first_step = true;
      var savedOutputRootDir = this.global.outputRootDir;
      var batch_narrowband_palette_mode = this.isbatchNarrowbandPaletteMode();
      var batch_files = [];
      var substack_mode = this.par.substack_mode.val;
      var substack_files = [];
      var substack_size = this.global.lightFileNames ? this.global.lightFileNames.length / this.par.substack_count.val : 0;
      var substack_saved_lightFileNames = this.global.lightFileNames;
      var saved_integrate_only = this.par.integrate_only.val;

      if (substack_mode && this.global.lightFileNames) {
            console.writeln("AutoRun substack size " + substack_size);
            for (var i = 0; i < this.global.lightFileNames.length; i += substack_size) {
                  substack_files[substack_files.length] = this.global.lightFileNames.slice(i, i + substack_size);
            }
            this.par.integrate_only.val = true;
      }
      this.global.substack_number = 0;

      if (this.par.batch_mode.val) {
            stopped = false;
            // Ask files before processing
            console.writeln("AutoRun in batch mode");
            for (var i = 0; ; i++) {
                  console.writeln("File names for batch " + (i + 1));
                  console.noteln("Click Cancel when all files are selected.");
                  var caption = "Select files for batch " + (i + 1) + ", Cancel ends the batch files";
                  if (this.par.open_directory.val) {
                        var lights = this.engine.openDirectoryFiles(caption, this.par.directory_files.val, true, true, this.global.pages.LIGHTS);
                  } else {
                        var lights = this.engine.openImageFiles(caption, true, false, true);
                  }
                  if (lights == null || lights.length == 0) {
                        break;
                  }
                  batch_files[batch_files.length] = lights;
            }
            if (batch_files.length == 0) {
                  console.writeln("No files selected for a batch. Stopped.");
                  return false;
            }
            var txt = "Batch processing " + batch_files.length + " panels. Do you want to proceed?";
            var response = new MessageBox(txt, "AutoIntegrate", StdIcon.Question, StdButton.Yes, StdButton.No ).execute();
            if (response != StdButton.Yes) {
                  console.writeln("Batch processing not started.");
                  return false;
            }
            this.global.lightFileNames = null; // Use files given here
      } else {
            console.writeln("AutoRun in normal mode");
      }
      do {  
            if (this.global.lightFileNames == null && !this.par.generate_masters_only.val) {
                  if (this.par.batch_mode.val) {
                        this.global.lightFileNames = batch_files.shift();
                  } else if (this.par.open_directory.val) {
                        this.global.lightFileNames = this.engine.openDirectoryFiles("Lights", this.par.directory_files.val, true, false, this.global.pages.LIGHTS);
                  } else {
                        this.global.lightFileNames = this.engine.openImageFiles("Lights", true, false, false);
                  }
                  if (this.global.lightFileNames != null) {
                        parent.dialog.treeBox[this.global.pages.LIGHTS].clear();
                        this.addFilesToTreeBox(parent.dialog, this.global.pages.LIGHTS, this.global.lightFileNames);
                        this.updateInfoLabel(parent.dialog);
                        this.updateExclusionAreaLabel(parent);
                  }
            }
            if (substack_mode) {
                  console.writeln("Get next substack");
                  if (substack_files.length == 0) {
                        console.writeln("AutoRun substack completed");
                        break;
                  }
                  this.global.lightFileNames = substack_files.shift();
                  console.writeln("AutoRun substack length " + this.global.lightFileNames.length + " files.");
                  if (this.global.lightFileNames == null || this.global.lightFileNames.length == 0) {
                        console.writeln("AutoRun substack completed");
                        break;
                  } else {
                        stopped = false;
                  }
            }  
            if (this.global.lightFileNames != null || this.par.generate_masters_only.val) {
                  if (batch_narrowband_palette_mode && this.global.lightFileNames != null) {
                        var filteredFiles = this.engine.getFilterFiles(this.global.lightFileNames, this.global.pages.LIGHTS, '');
                        if (!filteredFiles.narrowband) {
                              batch_narrowband_palette_mode = false;
                        }
                  }
                  if (first_step) {
                        if (substack_mode) {
                              this.global.substack_number = 1;
                              console.writeln("AutoRun in substack mode, substack " + this.global.substack_number);
                        } else if (this.par.batch_mode.val) {
                              console.writeln("AutoRun in batch mode");
                        } else if (batch_narrowband_palette_mode) {
                              console.writeln("AutoRun in narrowband palette batch mode");
                        } else {
                              console.writeln("AutoRun");
                        }
                        first_step = false;
                  } else {
                        this.global.user_selected_reference_image = [];
                        if (substack_mode) {
                              this.global.substack_number++;
                              console.writeln("AutoRun in substack mode, substack " + this.global.substack_number);
                        }
                  }
                  this.flowchart.flowchartReset();
                  if (this.par.run_get_flowchart_data.val && this.global.use_preview) {
                        if (substack_mode) {
                              console.writeln("Do not get flowchart data for substack mode");
                        } else if (batch_narrowband_palette_mode || this.par.batch_mode.val) {
                              console.writeln("Do not get flowchart data for batch mode");
                        } else {
                              let succ = this.generateNewFlowchartData(parent);
                        }
                  } else {
                        console.writeln("Do not get flowchart data");
                  }
                  try {
                        if (batch_narrowband_palette_mode) {
                            this.engine.autointegrateNarrowbandPaletteBatch(parent.dialog, false);
                        } else {
                            this.engine.autointegrateProcessingEngine(parent.dialog, false, false, "AutoRun");
                        }
                        this.update_enhancements_target_image_window_list(null);
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        this.engine.writeProcessingStepsAndEndLog(null, false, null, true);
                        this.global.is_processing = this.global.processing_state.none;
                        stopped = true;
                        success = false;
                  }
                  if (this.par.batch_mode.val) {
                        this.global.outputRootDir = savedOutputRootDir;
                        this.global.lightFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        this.util.closeAllWindows(this.par.keep_integrated_images.val, true);
                  }
                  if (substack_mode) {
                        console.writeln("AutoRun in substack mode, close windows");
                        this.util.closeAllWindows(this.par.keep_integrated_images.val, true);
                        console.writeln("AutoRun in substack mode, continue to next substack.");
                  }
            } else {
                  stopped = true;
            }
            if (this.global.cancel_processing) {
                  stopped = true;
                  console.writeln("Processing cancelled!");
                  success = false;
            }
      } while (!stopped);

      this.global.outputRootDir = savedOutputRootDir;
      this.par.integrate_only.val = saved_integrate_only;
      this.global.lightFileNames = substack_saved_lightFileNames;
      this.global.substack_number = 0;
      return success;
}


filesOptionsSizer(parent, name, toolTip)
{
      var label = this.guitools.newSectionLabel(parent, name);
      this.global.rootingArr.push(label);
      label.toolTip = this.util.formatToolTip(toolTip);
      var labelempty = new Label( parent );
      labelempty.text = " ";
      this.global.rootingArr.push(labelempty);

      var sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;

      sizer.add( label );
      sizer.add( labelempty );

      return sizer;
}

showOrHideFilterSectionBar(pageIndex)
{
      switch (pageIndex) {
            case this.global.pages.LIGHTS:
                  var show = this.par.lights_add_manually.val || this.par.skip_autodetect_filter.val;
                  break;
            case this.global.pages.FLATS:
                  var show = this.par.flats_add_manually.val || this.par.skip_autodetect_filter.val;
                  break;
            case this.global.pages.FLAT_DARKS:
                  var show = this.par.flatdarks_add_manually.val || this.par.skip_autodetect_filter.val;
                  break;
            default:
                  this.util.throwFatalError("showOrHideFilterSectionBar bad pageIndex " + pageIndex);
      }
      if (show) {
            this.filterSectionbars[pageIndex].show();
            this.filterSectionbarcontrols[pageIndex].visible = true;
      } else {
            this.filterSectionbars[pageIndex].hide();
            this.filterSectionbarcontrols[pageIndex].visible = false;
      }
}

lightsOptions(parent)
{
      var sizer = this.filesOptionsSizer(parent, "Add light images", parent.filesToolTip[this.global.pages.LIGHTS]);

      var debayerLabel = new Label( parent );
      this.global.rootingArr.push(debayerLabel);
      debayerLabel.text = "Debayer";
      debayerLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      debayerLabel.toolTip = "<p>Select bayer pattern for debayering color/OSC/RAW/DSLR files.</p>" +
                      "<p>Auto option tries to recognize debayer pattern from image metadata.</p>" +
                      "<p>If images are already debayered choose none which does not do debayering.</p>";

      var debayerCombobox = this.guitools.newComboBox(parent, this.par.debayer_pattern, this.global.debayerPattern_values, debayerLabel.toolTip);
      this.global.rootingArr.push(debayerCombobox);

      var extractChannelsLabel = new Label( parent );
      this.global.rootingArr.push(extractChannelsLabel);
      extractChannelsLabel.text = "Extract channels";
      extractChannelsLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      extractChannelsLabel.toolTip = 
            "<p>Extract channels from color/OSC/RAW/DSLR files.</p>" +
            "<p>Channel extraction is done right after debayering. After channels are extracted " + 
            "processing continues as mono processing with separate filter files.</p>" +
            "<p>Option LRGB extract lightness channels as L and color channels as separate R, G and B files.</p>" +
            "<p>Option HOS extract channels as RGB=HOS and option HSO extract channels RGB=HSO. " + 
            "Resulting channels can then be mixed as needed using PixMath expressions in <i>Settings / Narrowband processing</i> " + 
            "section.</p>" +
            "<p>Channel files have a channel name (_L, _R, etc.) at the end of the file name. Script " + 
            "can then automatically recognize files as filter files.</p>"
            ;

      var extractChannelsCombobox = this.guitools.newComboBox(parent, this.par.extract_channel_mapping, this.extract_channel_mapping_values, extractChannelsLabel.toolTip);
      this.global.rootingArr.push(extractChannelsCombobox);

      var add_manually_checkbox = this.guitools.newCheckBox(parent, "Add manually", this.par.lights_add_manually, 
            "<p>Add light files manually by selecting files for each filter.</p>" );
      this.global.rootingArr.push(add_manually_checkbox);
      add_manually_checkbox.onClick = (checked) => { 
            add_manually_checkbox.aiParam.val = checked; 
            this.showOrHideFilterSectionBar(this.global.pages.LIGHTS);
      }
      var interated_lights_checkbox = this.guitools.newCheckBox(parent, "Integrated lights", this.par.integrated_lights, 
            "<p>If checked consider light files to be integrated files for AutoContinue.</p>" +
            "<p>It is useful for example when using integrated lights from WBPP as there is no need to rename images.</p>");
      this.global.rootingArr.push(interated_lights_checkbox);

      var monochrome_image_CheckBox = this.guitools.newCheckBoxEx(parent, "Force monochrome", this.par.monochrome_image, 
            "<p>Force creation of a monochrome image. All images are treated as Luminance files and stacked together. " + 
            "Quite a few processing steps are skipped with this option.</p>",
            (checked) => {
                  monochrome_image_CheckBox.aiParam.val = checked;
                  this.updateSectionsInTreeBox(parent.treeBox[this.global.pages.LIGHTS]);
      });
      this.global.rootingArr.push(monochrome_image_CheckBox);

      var sortAndFilterButton = new PushButton( parent );
      sortAndFilterButton.text = "Sort and filter";
      sortAndFilterButton.icon = parent.scaledResource(":/icons/filter.png");
      sortAndFilterButton.toolTip = "<p>Filter and sort files based on current weighting and filtering settings in the " + 
                                    "<i>Preprocessing / Weighting and filtering settings</i> section.</p>" +
                                    "<p>Without any filtering rules files are just sorted by the sort order " + 
                                    "given in the <i>Preprocessing / Weighting and filtering settings</i> section.</p>" +
                                    "<p>Using the mouse hover over the file name you can see the " +
                                    "filtering and weighting information for the file.</p>";
      sortAndFilterButton.onClick = () => {
            try {
                  this.util.addStatusInfo("Sorting and filtering files");
                  this.filterTreeBoxFiles(parent.dialog, parent.dialog.tabBox.currentPageIndex);
            } catch (e) {
                  console.criticalln("Sorting and filtering files: " + e);
            } 
      };
      this.global.rootingArr.push(sortAndFilterButton);

      var metricsVisualizerButton = new PushButton( parent );
      metricsVisualizerButton.text = "Metrics visualizer";
      metricsVisualizerButton.icon = parent.scaledResource(":/icons/chart.png");
      metricsVisualizerButton.toolTip = this.metricsVisualizerToolTip;
      metricsVisualizerButton.onClick = () => {
            try {
                  this.metricsVisualizerFilters(parent);
            } catch (e) {
                  console.criticalln("Metrics visualizer: " + e);
            }
      };
      this.global.rootingArr.push(metricsVisualizerButton);

      var exclusionAreasButton = new PushButton( parent );
      exclusionAreasButton.text = "Exclusion areas";
      exclusionAreasButton.toolTip = "<p>Select exclusion areas for DBE.</p>";
      exclusionAreasButton.onClick = () => 
      {
            try {
                  this.guitools.getExclusionAreas();
            } catch (e) {
                  console.criticalln("Exclusion areas: " + e);
            }
      };
      this.global.rootingArr.push(exclusionAreasButton);

      sizer.add(debayerLabel);
      sizer.add(debayerCombobox);
      sizer.add(extractChannelsLabel);
      sizer.add(extractChannelsCombobox);
      sizer.add(monochrome_image_CheckBox);
      sizer.add(add_manually_checkbox);
      sizer.add(interated_lights_checkbox);
      sizer.addStretch();
      sizer.add(sortAndFilterButton);
      sizer.add(metricsVisualizerButton);
      sizer.add(exclusionAreasButton);

      return sizer;
}

biasOptions(parent)
{
      var sizer = this.filesOptionsSizer(parent, "Add bias images", parent.filesToolTip[this.global.pages.BIAS]);

      var checkbox = this.guitools.newCheckBox(parent, "SuperBias", this.par.create_superbias, 
            "<p>Create SuperBias from bias files.</p>" +
            "<p>For modern CMOS sensors you should not use superbias.</p>" +
            "<p>For CCD sensors you can use superbias.</p>");
      var checkbox2 = this.guitools.newCheckBox(parent, "Master files", this.par.bias_master_files,
            "<p>Files are master files.</p>" +
            "<p>When there are multiple master files, they are matched by resolution.</p>" );
      parent.biasMasterFilesCheckBox = checkbox2;
      var checkbox3 = this.guitools.newCheckBox(parent, "Use on lights", this.par.bias_use_on_lights, 
            "<p>Use bias files on light frames.</p>" +
            "<p>If there are master dark files, bias files are ignored on light frames unless explicitly enabled.</p>");
      var checkbox4 = this.guitools.newCheckBox(parent, "Use on darks", this.par.bias_use_on_darks,
            "<p>Use bias files on dark frames.</p>" +
            "<p>For modern CMOS sensors you should not use bias files on dark frames.</p>" +
            "<p>For CCD sensors you can use bias files on dark frames.</p>");

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.add(checkbox3);
      sizer.add(checkbox4);
      sizer.addStretch();

      return sizer;
}

darksOptions(parent)
{
      var sizer = this.filesOptionsSizer(parent, "Add dark images", parent.filesToolTip[this.global.pages.DARKS]);

      var checkbox = this.guitools.newCheckBox(parent, "Pre-calibrate", this.par.pre_calibrate_darks, 
            "<p>If checked darks are pre-calibrated with bias and not during ImageCalibration.</p>" );
      var checkbox2 = this.guitools.newCheckBox(parent, "Optimize", this.par.optimize_darks, 
            "<p>If checked darks are optimized when calibrating lights.</p>" + 
            "<p>For modern CMOS cameras optimization should not be used.</p>" + 
            "<p>For CCD cameras it can be used.</p>");
      var checkbox3 = this.guitools.newCheckBox(parent, "Master files", this.par.dark_master_files,
            "<p>Files are master files.</p>" +
            "<p>When there are multiple master files in a group, they are matched by resolution.</p>" );
      parent.darkMasterFilesCheckBox = checkbox3;

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.add(checkbox3);
      sizer.addStretch();

      return sizer;
}

flatsOptions(parent)
{
      var sizer = this.filesOptionsSizer(parent, "Add flat images", parent.filesToolTip[this.global.pages.FLATS]);

      var checkboxMaster = this.guitools.newCheckBox(parent, "Master files", this.par.flat_master_files,
            "<p>Files are master files.</p>" +
            "<p>When there are multiple master files in a group, they are matched by resolution.</p>" );
      parent.flatMasterFilesCheckBox = checkboxMaster;
      this.global.rootingArr.push(checkboxMaster);
      var checkboxStars = this.guitools.newCheckBox(parent, "Stars in flats", this.par.stars_in_flats, 
            "<p>If you have stars in your flats then checking this option will lower percentile " + 
            "clip values and should help remove the stars.</p>" );
      this.global.rootingArr.push(checkboxStars);
      var checkboxDarks = this.guitools.newCheckBox(parent, "Use darks", this.par.use_darks_on_flat_calibrate, 
            "<p>If selected then darks are used for flat calibration.</p>");
      this.global.rootingArr.push(checkboxDarks);
      var checkboxManual = this.guitools.newCheckBox(parent, "Add manually", this.par.flats_add_manually, 
            "<p>Add flat files manually by selecting files for each filter.</p>" );
      this.global.rootingArr.push(checkboxManual);
      checkboxManual.onClick = (checked) => {
            checkboxManual.aiParam.val = checked;
            this.showOrHideFilterSectionBar(this.global.pages.FLATS);
      }

      sizer.add(checkboxMaster);
      sizer.add(checkboxStars);
      sizer.add(checkboxDarks);
      sizer.add(checkboxManual);
      sizer.addStretch();

      return sizer;
}

flatdarksOptions(parent)
{
      var sizer = this.filesOptionsSizer(parent, "Add flat dark images", parent.filesToolTip[this.global.pages.FLAT_DARKS]);

      var checkbox = this.guitools.newCheckBox(parent, "Master files", this.par.flat_dark_master_files,
            "<p>Files are master files.</p>" +
            "<p>When there are multiple master files in a group, they are matched by resolution.</p>" );
      parent.flatDarkMasterFilesCheckBox = checkbox;
      this.global.rootingArr.push(checkbox);
      var checkboxManual = this.guitools.newCheckBox(parent, "Add manually", this.par.flatdarks_add_manually, 
            "<p>Add flat dark files manually by selecting files for each filter.</p>" );
      this.global.rootingArr.push(checkboxManual);
      checkboxManual.onClick = (checked) => {
            checkboxManual.aiParam.val = checked;
            this.showOrHideFilterSectionBar(this.global.pages.FLAT_DARKS);
      }

      sizer.add(checkbox);
      sizer.add(checkboxManual);
      sizer.addStretch();
      
      return sizer;
}

updatePreviewImage(updPreviewControl, image, txt, histogramControl, histogramInfo, force_setimage = false)
{
      if (updPreviewControl == null) {
            return;
      }
      if (!force_setimage 
          && ((this.is_some_preview && this.global.is_processing == this.global.processing_state.none) 
              || this.preview_keep_zoom))
      {
            updPreviewControl.UpdateImage(image, txt);
      } else {
            updPreviewControl.SetImage(image, txt);
      }
      if (histogramControl != null && histogramInfo != null) {
            histogramControl.aiInfo = histogramInfo;
            histogramControl.repaint();
      }
}

updatePreviewTxt(txt)
{
      txt = "Preview: " + txt;
      if (this.previewInfoLabel != null) {
            this.previewInfoLabel.text = txt;
      }
      console.writeln(txt);
}

getHistogramSize()
{
      var width = Math.floor(this.ppar.preview.side_preview_width * 0.9);
      var height = this.ppar.preview.side_histogram_height;
      return { width: width, height: height };
}

setHistogramBitmapBackground(graphics)
{
      var size = this.getHistogramSize();
      var width = size.width;
      var height = size.height;

      graphics.antialiasing = true;

      graphics.pen = new Pen(0xffffffff,1);
      
      graphics.fillRect(0, 0, width, height, new Brush(0xff000000));

      graphics.pen = new Pen(0xFF808080,0);

      for (var i = 0.25; i < 1; i += 0.25) {
            graphics.drawLine(0, height*i, width, height*i);
            graphics.drawLine(width*i, 0, width*i, height);
      }
}

calculateReverseLogarithmicXScale(minVal, maxVal, numBins) 
{
      /**
       * Calculates the boundaries for a reversed logarithmic x-axis scale
       * (smaller values have larger bins).
       *
       * Args:
       *   minVal: The minimum value in the data (for the start of the x-axis).
       *   maxVal: The maximum value in the data (for the end of the x-axis).
       *   numBins: The desired number of bins (segments on the x-axis).
       *
       * Returns:
       *   An array of x-axis boundaries.
       */
      const base = Math.pow(maxVal / minVal, 1 / numBins);
      const xScale = [];
      for (let i = 0; i <= numBins; i++) {
        // Reverse the logarithmic scaling:
        xScale.push(maxVal / Math.pow(base, i));
      }
      return xScale.sort((a, b) => a - b); // Sort in ascending order for the histogram logic
}

getHistogramInfo(imgWin, log_x_scale = false)
{
      if (this.par.debug.val || this.global.debug) console.writeln("getHistogramInfo");
      var view = imgWin.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");
      var values = [];
      var maxvalue = 0;
      var maxvalue_channel = 0;
      var maxvalue_pos = 0;
      var maxchannels = histogramMatrix.rows;

      var size = this.getHistogramSize();
      var width = size.width;
      var height = size.height;

      var bucket_size = histogramMatrix.cols / width;

      // Always autodetect linear vs non-linear images
      log_x_scale = this.engine.imageIsLinear(imgWin);

      if (log_x_scale) {
            var xscale = this.calculateReverseLogarithmicXScale(1, histogramMatrix.cols, width);
      }

      if (this.global.debug) console.writeln("getHistogramInfo: width " +  width + " maxchannels " + maxchannels +  " histogramMatrix.cols " + histogramMatrix.cols);

      for (var channel = 0; channel < maxchannels; channel++) {
            values[channel] = [];
            for (var i = 0; i < width; i++) {
                  values[channel][i] = 0;
            }
      }
      if (this.par.debug.val) console.writeln("getHistogramInfo: maxchannels ", maxchannels);
      for (var channel = 0; channel < maxchannels; channel++) {
            var xpos = 0;
            for (var col = 0; col < histogramMatrix.cols; col++) {
                  if (log_x_scale) {
                        if (col < xscale[xpos]) {
                              i = xpos;
                        } else {
                              xpos++;
                              i = xpos;
                        }
                        if (i >= width) {
                              i = width - 1;
                        }
                  } else {
                        i = Math.floor(col / bucket_size);
                  }
                  values[channel][i] += histogramMatrix.at(channel, col);
                  if (values[channel][i] > maxvalue) {
                        maxvalue = values[channel][i];
                        maxvalue_channel = channel;
                        maxvalue_pos = i;
                  }
            }
      }
      if (this.global.debug) console.writeln("getHistogramInfo: maxvalue " + maxvalue + " maxvalue_channel " + maxvalue_channel + " maxvalue_pos " + maxvalue_pos);
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

      if (this.par.debug.val) console.writeln("getHistogramInfo: width " +  width + " height " + height);

      var bitmap = new Bitmap(width, height);
      var graphics = new Graphics(bitmap);      // VectorGraphics

      this.setHistogramBitmapBackground(graphics);

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

      return { histogramBitmap: bitmap, cumulativeValues: cumulativeValues, percentageValues: percentageValues, log_x_scale: log_x_scale };
}

updatePreviewWinTxt(imgWin, txt, histogramInfo = null, run_autostf = false, imgWin_from_file = null, resampled = false)
{
      if (this.global.use_preview && imgWin != null && !this.global.get_flowchart_data) {
            if (this.global.debug) console.writeln("Preview image:" + imgWin.mainView.id + ", " + txt);
            if (this.par.debug.val) var start_time = Date.now();
            if (this.guitools.current_preview.imgWin != null) {
                  this.guitools.current_preview.imgWin.forceClose();
                  this.guitools.current_preview.imgWin = null;
            }
            if (imgWin_from_file == null) {
                  var copy_image = true;
            } else {
                  // Save possible imageWindow loaded from file
                  var copy_image = false;
                  this.guitools.current_preview.imgWin = imgWin_from_file;
            }
            this.guitools.current_preview.resampled = resampled;
            if (this.par.debug.val || this.global.debug) console.writeln("updatePreviewWinTxt:copy_image " + copy_image);
            if (this.preview_size_changed) {
                  previewControl.setSize(this.ppar.preview.side_preview_width, this.ppar.preview.side_preview_height);
                  this.preview_size_changed = false;
            }
            run_autostf = run_autostf 
                          || (this.global.is_processing == this.global.processing_state.processing
                              && this.par.preview_autostf.val 
                              && !this.util.findKeywordName(imgWin, "AutoIntegrateNonLinear"));
 
            if (this.par.debug.val) console.writeln("--- updatePreviewWinTxt:init " + (Date.now()-start_time)/1000 + " sec");
            if (this.par.debug.val) start_time = Date.now();
            if (histogramInfo) {
                  console.writeln("updatePreviewWinTxt:use existing histogramInfo");
                  this.global.enhancements_target_histogram_info = histogramInfo;
            } else {
                  if (this.histogramControl != null) {
                        console.writeln("Get new histogram info");
                        this.forceNewHistogram(imgWin);
                        histogramInfo = this.getHistogramInfo(imgWin, run_autostf);
                  } else {
                        console.writeln("No histogram");
                        histogramInfo = null;
                  }
                  this.global.enhancements_target_histogram_info = histogramInfo;
            }
            if (this.par.debug.val) console.writeln("--- updatePreviewWinTxt:histogram " + (Date.now()-start_time)/1000 + " sec");
            if (this.par.debug.val) start_time = Date.now();
            if (copy_image) {
                  this.guitools.current_preview.image_versions[0] = { image: new Image( imgWin.mainView.image ), txt: txt };
            } else {
                  this.guitools.current_preview.image_versions[0] = { image: imgWin.mainView.image, txt: txt };
            }
            if (run_autostf) {
                  // Image is linear, run AutoSTF
                  if (copy_image) {
                        if (this.par.debug.val || this.global.debug) console.writeln("updatePreviewWinTxt:run_autostf, copy image");
                        this.util.closeOneWindowById("AutoIntegrate_preview_tmp");
                        var copy_win = this.util.copyWindow(imgWin, "AutoIntegrate_preview_tmp");
                        this.engine.autoStretch(copy_win);
                        imgWin = copy_win;
                        txt = txt + " (AutoSTF)";
                        this.guitools.current_preview.image_versions[1] = { image: new Image( copy_win.mainView.image ), txt: txt };
                        this.guitools.current_preview.image = this.guitools.current_preview.image_versions[1].image;
                        this.guitools.current_preview.txt = this.guitools.current_preview.image_versions[1].txt;
                  } else {
                        if (this.par.debug.val) console.writeln("updatePreviewWinTxt:run_autostf, do not copy image");
                        this.guitools.current_preview.image_versions[1] = this.guitools.current_preview.image_versions[0];
                        var copy_win = null;
                        this.guitools.current_preview.image = this.guitools.current_preview.image_versions[0].image;
                        this.guitools.current_preview.txt = this.guitools.current_preview.image_versions[0].txt;
                        this.engine.autoStretch(imgWin);
                  }
            } else {
                  if (this.par.debug.val) console.writeln("updatePreviewWinTxt:no autostf");
                  this.guitools.current_preview.image_versions[1] = this.guitools.current_preview.image_versions[0];
                  var copy_win = null;
                  this.guitools.current_preview.image = this.guitools.current_preview.image_versions[0].image;
                  this.guitools.current_preview.txt = this.guitools.current_preview.image_versions[0].txt;
            }
            if (this.par.debug.val) console.writeln("updatePreviewWinTxt: preview image size " + this.guitools.current_preview.image.width + "x" + this.guitools.current_preview.image.height);
            if (this.par.debug.val) console.writeln("--- updatePreviewWinTxt:autostf " + (Date.now()-start_time)/1000 + " sec");
            if (this.par.debug.val) start_time = Date.now();
            if (this.global.is_processing != this.global.processing_state.none) {
                  this.flowchartUpdated();
            }
            if (!this.par.show_flowchart.val || this.global.is_processing != this.global.processing_state.processing) {
                  this.updatePreviewImage(this.previewControl, imgWin.mainView.image, txt, this.histogramControl, histogramInfo);
            }
            if (this.par.debug.val) console.writeln("--- updatePreviewWinTxt:updatePreviewImage " + (Date.now()-start_time)/1000 + " sec");
            if (this.par.debug.val) start_time = Date.now();
            if (copy_win != null) {
                  this.util.closeOneWindow(copy_win);
            }
            this.updatePreviewTxt(txt);
            console.noteln("Preview updated");
            this.is_some_preview = true;
            this.current_selected_file_name = null; // reset file name, it is set by caller if needed
            if (this.par.debug.val) console.writeln("--- updatePreviewWinTxt:end " + (Date.now()-start_time)/1000 + " sec");
      }
}

updatePreviewWin(imgWin)
{
      if (this.global.debug) console.writeln("updatePreviewWin");
      this.updatePreviewWinTxt(imgWin, imgWin.mainView.id);
}

updatePreviewFilenameAndInfo(filename, run_autostf, update_info)
{
      console.writeln("Update preview:", filename);

      if (!this.global.use_preview || this.global.get_flowchart_data) {
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

      this.updatePreviewWinTxt(imageWindow, File.extractName(filename) + File.extractExtension(filename), null, run_autostf);
      if (update_info) {
            this.util.updateStatusInfoLabel("Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height);
      }

      imageWindow.forceClose();
}

updatePreviewFilename(filename, run_autostf = false)
{
      this.updatePreviewFilenameAndInfo(filename, run_autostf, false);
}

updatePreviewId(id)
{
      if (this.global.use_preview) {
            if (this.global.debug) console.writeln("updatePreviewId ", id);
            this.updatePreviewWinTxt(ImageWindow.windowById(id), id);
      }
}

updatePreviewIdReset(id, keep_zoom, histogramInfo)
{
      if (this.global.use_preview && !this.global.get_flowchart_data) {
            if (this.global.debug) console.writeln("updatePreviewIdReset ", id, " keep_zoom ", keep_zoom);
            this.preview_keep_zoom = keep_zoom;
            var win = ImageWindow.windowById(id);
            this.updatePreviewWinTxt(win, id, histogramInfo);
            this.util.updateStatusInfoLabel("Size: " + win.mainView.image.width + "x" + win.mainView.image.height);
            this.is_some_preview = false;
            this.global.is_processing = this.global.processing_state.none;
      }
}

setPreviewIdReset(id, keep_zoom, histogramInfo)
{
      if (this.global.debug) console.writeln("setPreviewIdReset ", id, " keep_zoom ", keep_zoom);
      this.updatePreviewIdReset(id, keep_zoom, histogramInfo);
}

updatePreviewNoImageInControl(control)
{
      let show_startup_image = this.ppar.show_startup_image;

      if (show_startup_image) {
            if (this.ppar.startup_image_name == this.global.default_startup_image_name) {
                  var startup_image_name = File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ ) + "/" + this.ppar.startup_image_name;
            } else {
                  var startup_image_name = this.ppar.startup_image_name;
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
            width = this.ppar.preview.side_preview_width ;
            height = this.ppar.preview.side_preview_height;
            let ratio = width / height;
            height = 1080;
            width = height * ratio;
            var bitmap = this.util.createEmptyBitmap(width, height, 0xff808080);
      }

      var startup_text = [ this.global.autointegrate_version ];
      if (this.ppar.savedVersion == "") {
            // First run, show the welcome text
            startup_text.push("");
            startup_text.push("Welcome to AutoIntegrate!");
            startup_text.push("");
            startup_text.push("Click the Tutorials button below to get started.");
            startup_text.push("");
            startup_text.push("Visit the following resources for more information:");
            startup_text.push(" - AutoIntegrate documentation: " + this.global.autointegrateinfo_link);
            startup_text.push(" - AutoIntegrate user support forum: https://forums.ruuth.xyz/");
            startup_text.push(" - AutoIntegrate video tutorials: https://www.youtube.com/@JarmoRuuth");
      } else if (this.ppar.savedVersion != this.global.autointegrate_version) {
            // Started with a new version, show the version info
            startup_text.push("");
            for (var i = 0; i < this.global.autointegrate_version_info.length; i++) {
                  startup_text.push(this.global.autointegrate_version_info[i]);
            }
      } else if (show_startup_image) {
            // Do now show text with a startup image
            startup_text = null;
      }

      for (var fontsize = 24; fontsize > 0; fontsize -= 4) {   
            var graphics = new Graphics(bitmap);
            graphics.font = new Font( FontFamily.SansSerif, fontsize );
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
      
      var startupImage = this.util.createImageFromBitmap(bitmap);

      control.SetImage(startupImage);

      startupImage.free();
}

updatePreviewNoImage()
{
      if (this.global.use_preview && this.previewControl != null) {
            if (this.par.debug.val || this.global.debug) console.writeln("updatePreviewNoImage");
            this.updatePreviewNoImageInControl(this.previewControl);
            this.updatePreviewTxt("No preview");
            this.util.updateStatusInfoLabel("No preview");
      }
}

// Create a combined mosaic image from a list of image windows.
createCombinedMosaicPreviewWin(imgWinArr)
{
      console.writeln("createCombinedMosaicPreviewWin");

      if (imgWinArr.length == 0) {
            return null;
      }
      var width = imgWinArr[0].mainView.image.width;
      var height = imgWinArr[0].mainView.image.height;

      var combinedWindow = this.util.copyWindow(imgWinArr[0], "AutoIntegrate_combined_preview");

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
                        var bmp = this.getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
                        graphics.drawBitmap(x, height / 4, bmp);
                        x = width / 2;
                  }
            } else {
                  // Two images, rescale them to half size and put them on top of each other.
                  for (var i = 0, y = 0; i < imgWinArr.length; i++) {
                        // console.writeln("createCombinedMosaicPreviewWin, i " + i + " y " + y);
                        var imgWin = imgWinArr[i];
                        var bmp = this.getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
                        graphics.drawBitmap(width / 4, y, bmp);
                        y = height / 2;
                  }
            }
      } else {
            // Assume four images, rescale them to half size and put them into a mosaic.
            for (var i = 0, x = 0, y = 0; i < imgWinArr.length; i++) {
                  // console.writeln("createCombinedMosaicPreviewWin, i " + i + " x " + x + " y " + y);
                  var imgWin = imgWinArr[i];
                  var bmp = this.getWindowBitmap(imgWin).scaledTo(width / 2, height / 2);
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
      
      combinedWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      combinedWindow.mainView.image.blend(bitmap);
      combinedWindow.mainView.endProcess();

      return combinedWindow;
}

updateOutputDirEdit(path)
{
      this.util.setOutputRootDir(this.util.ensurePathEndSlash(path));
      console.writeln("updateOutputDirEdit, set this.global.outputRootDir ", this.global.outputRootDir);
      this.outputDirEdit.text = this.global.outputRootDir;
}

getOutputDirEdit()
{
      return this.outputDirEdit.text;
}

addOutputDir(parent)
{
      var lbl = new Label( parent );
      this.global.rootingArr.push(lbl);
      lbl.text = "Output directory";
      lbl.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      lbl.toolTip = "<p>Give output root directory.</p>" +
                    "<p>If no directory is given then the path to the " + 
                    "first light file is used as the output root directory." + 
                    "If lights files are read using a directory option then the selected directory " +
                    "is used as an output directory." +
                    "</p><p>" + 
                    "If a relative path is given then it will be appended " + 
                    "to the first light file path.</p>" +
                    "<p>If output directory is given with AutoContinue then output " + 
                    "goes to that directory and not into directory subtree.</p>" +
                    "<p>If directory does not exist it is created.</p>";
      this.outputDirEdit = new Edit( parent );
      this.outputDirEdit.text = this.global.outputRootDir;
      this.outputDirEdit.toolTip = lbl.toolTip;
      this.outputDirEdit.onEditCompleted = () => {
            this.util.setOutputRootDir(this.util.ensurePathEndSlash(this.outputDirEdit.text.trim()));
            console.writeln("addOutputDir, set this.global.outputRootDir ", this.global.outputRootDir);
      };

      var dirbutton = new ToolButton( parent );
      dirbutton.icon = parent.scaledResource( ":/icons/select-file.png" );
      dirbutton.toolTip = "<p>Select output root directory.</p>";
      dirbutton.onClick = () => {
            var gdd = new GetDirectoryDialog;
            if (this.global.outputRootDir == "") {
                  gdd.initialPath = this.ppar.lastDir;
            } else {
                  gdd.initialPath = this.global.outputRootDir;
            }
            gdd.caption = "Select Output Directory";
            if (gdd.execute()) {
                  this.updateOutputDirEdit(gdd.directory);
            }
      };
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( this.outputDirEdit );
      outputdir_Sizer.add( dirbutton );

      return { sizer: outputdir_Sizer, label: lbl };
}

validateWindowPrefix(p)
{
      p = this.util.validateViewIdCharacters(p);
      if (p != "" && !p.endsWith("_")) {
            p = p + "_";
      }
      return p;
}

// Update window prefix before using it.
// Moved from this.windowPrefixComboBox.onEditTextUpdated
// is that function is called for every character.
updateWindowPrefix()
{
      this.ppar.win_prefix = this.validateWindowPrefix(this.ppar.win_prefix);
      if (this.windowPrefixComboBox != null) {
            this.windowPrefixComboBox.editText = this.ppar.win_prefix;
      }
      console.writeln("updateWindowPrefix, set winPrefix '" + this.ppar.win_prefix + "'");
      this.util.fixAllWindowArrays(this.ppar.win_prefix);
}

addWinPrefix(parent)
{
      var lbl = new Label( parent );
      this.global.rootingArr.push(lbl);
      lbl.text = "| Window Prefix";
      lbl.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      lbl.toolTip = "<p>Give window prefix identifier.</p>" +
                    "<p>If specified, all AutoIntegrate windows will be " +
                    "prepended with the prefix and an underscore.</p>" +
                    "<p>This makes all generated window names unique " +
                    "for the current run and allows you run multiple times " +
                    "without closing or manually renaming all the windows from previous runs, " +
                    "as long as you change the prefix before each run." +
                    "<p>The window prefix will be saved across script invocations " +
                    "for convenience with the AutoContinue function.</p>";
      
      this.windowPrefixComboBox = new ComboBox( parent );
      this.windowPrefixComboBox.enabled = true;
      this.windowPrefixComboBox.editEnabled = true;
      this.windowPrefixComboBox.minItemCharWidth = 10;
      this.windowPrefixComboBox.toolTip = lbl.toolTip;
      var pa = this.get_win_prefix_combobox_array(this.ppar.win_prefix);
      this.guitools.addArrayToComboBox(this.windowPrefixComboBox, pa);
      this.windowPrefixComboBox.editText = this.ppar.win_prefix;
      this.windowPrefixComboBox.onEditTextUpdated = () => {
            // This function is called for every character edit so actions
            // are moved to function updateWindowPrefix
            this.ppar.win_prefix = this.util.validateViewIdCharacters(this.windowPrefixComboBox.editText.trim());
            this.windowPrefixComboBox.editText = this.ppar.win_prefix;
      };

      // Add a help button to show known prefixes. Maybe this should be in
      // label and edit box toolTips.
      this.windowPrefixHelpTips = new ToolButton( parent );
      this.windowPrefixHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      this.windowPrefixHelpTips.setScaledFixedSize( 20, 20 );
      this.windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p>";
      this.windowPrefixHelpTips.onClick = () =>
      {
            new MessageBox(this.windowPrefixHelpTips.toolTip, "Current Window Prefixes", StdIcon.Information ).execute();
      }

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( lbl );
      winprefix_Sizer.add( this.windowPrefixComboBox );
      winprefix_Sizer.add( this.windowPrefixHelpTips );

      return { sizer: winprefix_Sizer, label: lbl  };
}

addAutoContinueWinPrefix(parent)
{
      this.autoContinueWindowPrefixComboBox = new ComboBox( parent );
      this.autoContinueWindowPrefixComboBox.enabled = true;
      this.autoContinueWindowPrefixComboBox.editEnabled = true;
      this.autoContinueWindowPrefixComboBox.minItemCharWidth = 5;
      this.autoContinueWindowPrefixComboBox.toolTip = "<p>Give window prefix for AutoContinue start images.</p>";
      var pa = this.get_win_prefix_combobox_array("");
      this.guitools.addArrayToComboBox(this.autoContinueWindowPrefixComboBox, pa);
      this.autoContinueWindowPrefixComboBox.editText = "";
      this.autoContinueWindowPrefixComboBox.onEditTextUpdated = () => {
            // This function is called for every character edit so actions
            // are moved to function updateWindowPrefix
            this.ppar.autocontinue_win_prefix = this.util.validateViewIdCharacters(this.autoContinueWindowPrefixComboBox.editText.trim());
            this.autoContinueWindowPrefixComboBox.editText = this.ppar.autocontinue_win_prefix;
      };

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( this.autoContinueWindowPrefixComboBox );

      return winprefix_Sizer;
}

filenamesToTreeboxfiles(treeboxfiles, filenames, checked)
{
      for (var i = 0; i < filenames.length; i++) {
            treeboxfiles[treeboxfiles.length] =  [ filenames[i], checked, 0 ];
      }
}

updateTreeBoxNodeToolTip(node)
{
      var toolTip = "<p>" + node.filename + "</p><p>exptime: " + node.exptime;
      if (node.measurement_text && node.measurement_text != "") {
            toolTip = toolTip + "<br>" + node.measurement_text;
      } else if (node.ssweight > 0) {
            toolTip = toolTip + "<br>SSWEIGHT: " + node.ssweight.toFixed(10);
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

updateTreeBoxNodeFromFlags(parent, node)
{
      if (node.best_image && node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, both best image and reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item-ok.png"));
            node.checked = true;
            this.updateTreeBoxNodeToolTip(node);
      } else if (node.best_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, best image");
            node.setIcon(0, parent.scaledResource(":/icons/ok-button.png"));
            node.checked = true;
            this.updateTreeBoxNodeToolTip(node);
      } else if (node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item.png"));
            node.checked = true;
            this.updateTreeBoxNodeToolTip(node);
      } else {
            //console.writeln("updateTreeBoxNodeFromFlags, normal image");
            node.setIcon(0, parent.scaledResource(""));
            this.updateTreeBoxNodeToolTip(node);
      }
}

setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (best_image != null && this.util.compareReferenceFileNames(best_image, node.filename, filename_postfix)) {
                  //console.writeln("setBestImageInTreeBoxNode found best image");
                  // Invert the flag, either set or clear it
                  node.best_image = true;
                  this.updateTreeBoxNodeFromFlags(parent, node);
                  this.global.user_selected_best_image = node.filename;
            } else if (node.best_image) {
                  // Clear old best image flag
                  node.best_image = false;
                  this.updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.setBestImageInTreeBoxNode(parent, node.child(i), best_image, filename_postfix);
            }
      }
}

setBestImageInTreeBox(parent, node, best_image, filename_postfix)
{
      //console.writeln("setBestImageInTreeBox " + best_image);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            this.setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix);
      }
}

// Set the user selected reference image to the array of reference images by filter.
// If the filter already has a reference image, update the old one.
set_user_selected_reference_image(reference_image, filter)
{
      for (var i = 0; i < this.global.user_selected_reference_image.length; i++) {
            if (this.global.user_selected_reference_image[i][1] == filter) {
                  console.writeln("set_user_selected_reference_image, update filter " + filter + " to image " + reference_image);
                  this.global.user_selected_reference_image[i][0] = reference_image;
                  break;
            }
      }
      if (i == this.global.user_selected_reference_image.length) {
            // not found, add new
            // console.writeln("set_user_selected_reference_image, add filter " + filter + " and image " + reference_image);
            this.global.user_selected_reference_image[this.global.user_selected_reference_image.length] = [ reference_image, filter ];
      }
}

remove_user_selected_reference_image(reference_image, filter)
{
      for (var i = 0; i < this.global.user_selected_reference_image.length; i++) {
            if (this.global.user_selected_reference_image[i][0] == reference_image
                && (filter == null || this.global.user_selected_reference_image[i][1] == filter)) 
            {
                  // clear reference image
                  // console.writeln("remove_user_selected_reference_image, remove filter " + filter + " and image " + reference_image);
                  this.global.user_selected_reference_image.splice(i, 1);
                  return;
            }
      }
}

setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter)
{
      if (node.numberOfChildren == 0 && (filter == null || node.filter == filter)) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (reference_image != null && this.util.compareReferenceFileNames(reference_image, node.filename, filename_postfix)) {
                  console.writeln("setReferenceImageInTreeBoxNode found reference image, filter " + filter + ", file " + node.filename);
                  // Invert the flag, either set or clear it
                  node.reference_image = true;
                  this.updateTreeBoxNodeFromFlags(parent, node);
                  this.set_user_selected_reference_image(node.filename, filter);
            } else if (node.reference_image) {
                  // console.writeln("setReferenceImageInTreeBoxNode clear old reference image " + node.filename);
                  // Clear old reference image flag
                  node.reference_image = false;
                  this.updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.setReferenceImageInTreeBoxNode(parent, node.child(i), reference_image, filename_postfix, filter);
            }
      }
}

setReferenceImageInTreeBox(parent, node, reference_image, filename_postfix, filter)
{
      //console.writeln("setReferenceImageInTreeBox " + reference_image + " for filter " + filter);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            this.setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter);
      }
}

guiSubframeSelectorMeasure(fileNames, weight_filtering, treebox_filtering, measurementFileNames, sort_order = null)
{
      console.writeln("guiSubframeSelectorMeasure: fileNames.length " +  fileNames.length +", saved_measurements.length " + (this.global.saved_measurements ? this.global.saved_measurements.length : 0));
      if (this.global.saved_measurements && fileNames.length != this.global.saved_measurements.length) {
            console.writeln("guiSubframeSelectorMeasure: fileNames.length != this.global.saved_measurements.length, need to measure all files");
            if (this.okToMeasureAllFiles(fileNames.length, this.global.saved_measurements.length)) {
                  // User confirmed, clear old measurements
                  console.writeln("guiSubframeSelectorMeasure: clearing old measurements");
                  this.global.saved_measurements = null;
                  this.global.saved_measurements_sorted = null;
            }
      }
      // Disable fast subframe selector while running this function to get measurements from all files
      var saved_fastintegration_fast_subframeselector = this.par.fastintegration_fast_subframeselector.val;

      var ret = this.engine.subframeSelectorMeasure(fileNames, weight_filtering, treebox_filtering, measurementFileNames, sort_order);

      this.par.fastintegration_fast_subframeselector.val = saved_fastintegration_fast_subframeselector;

      return ret;
}

// 1. Find image with biggest ssweight in treebox and update it in 
//    this.global.user_selected_best_image.
// 2. For each filter find image with biggest ssweight in treebox and 
//    update it in this.global.user_selected_reference_image.
findBestImageFromTreeBoxFiles(treebox)
{
      if (treebox.numberOfChildren == 0) {
            console.writeln("No files");
            return false;
      }

      if (this.global.saved_measurements == null && !this.okToRunSubframeSelector()) {
            return false;
      }
      this.util.addStatusInfo("Finding...");

      var checked_files = [];
      var unchecked_files = [];

      this.getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
      this.getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);

      var all_files = checked_files.concat(unchecked_files);

      // get array of [ filename, weight ]
      var ssWeights = this.guiSubframeSelectorMeasure(checked_files, false, false, all_files);

      this.filtering_changed = false;

      // create treeboxfiles array of [ filename, checked, weight ]
      var treeboxfiles = [];
      for (var i = 0; i < ssWeights.length; i++) {
            treeboxfiles[treeboxfiles.length] = [ ssWeights[i][0], true, ssWeights[i][1] ];
      }

      // group files by filter
      var filteredFiles = this.engine.getFilterFiles(treeboxfiles, this.global.pages.LIGHTS, '');

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
                  this.setTreeBoxSsweight(treebox, filePath, SSWEIGHT, "");
            }
            if (bestSSWEIGHTindex == -1) {
                  console.noteln("findBestImageFromTreeBoxFiles, no SSWEIGHT for filter " + filter);
            } else {
                  console.noteln("Filter " + filter + ", " + files[bestSSWEIGHTindex].name + ", best SSWEIGHT=" + bestSSWEIGHTvalue);
                  this.set_user_selected_reference_image(files[bestSSWEIGHTindex].name, filter);

                  if (bestSSWEIGHTvalue > globalBestSSWEIGHTvalue) {
                        globalBestSSWEIGHTvalue = bestSSWEIGHTvalue;
                        globalBestSSWEIGHTfile = files[bestSSWEIGHTindex].name;
                        console.writeln("All files, " + globalBestSSWEIGHTfile + ", SSWEIGHT=" + globalBestSSWEIGHTvalue + ", new best value");
                  }
            }
      }
      if (globalBestSSWEIGHTfile != null) {
            console.noteln("All files, " + globalBestSSWEIGHTfile + ", best SSWEIGHT=" + globalBestSSWEIGHTvalue);
            this.global.user_selected_best_image = globalBestSSWEIGHTfile;
      }
      this.util.addStatusInfo("Done.");
      return true;
}

updateSectionsInTreeBoxNode(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            if (typeof node.text === "function") {
                  var txt = node.text(0);
                  var is_monochrome_txt = txt.search(this.monochrome_text) != -1;
                  if (this.par.monochrome_image.val) {
                        if (!is_monochrome_txt) {
                              node.setText(0, this.monochrome_text + txt);
                        }
                  } else {
                        if (is_monochrome_txt) {
                              node.setText(0, txt.replace(this.monochrome_text, ""));
                        }
                  }
            }
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.updateSectionsInTreeBoxNode(node.child(i));
            }
      }
}

updateSectionsInTreeBox(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            this.updateSectionsInTreeBoxNode(node);
      }
}

getTreeBoxNodeFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 1;
      } else {
            var cnt = 0;
            for (var i = 0; i < node.numberOfChildren; i++) {
                  cnt = cnt + this.getTreeBoxNodeFileCount(node.child(i));
            }
            return cnt;
      }
}

getTreeBoxFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return this.getTreeBoxNodeFileCount(node);
      }
}

checkAllTreeBoxNodeFiles(node, checked)
{
      if (node.numberOfChildren == 0) {
            node.checked = checked;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.checkAllTreeBoxNodeFiles(node.child(i), checked);
            }
      }
}
checkAllTreeBoxFiles(node, checked)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return this.checkAllTreeBoxNodeFiles(node, checked);
      }
}

setTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            if (this.util.compareReferenceFileNames(filename, node.filename, filename_postfix)) {
                  node.ssweight = ssweight;
                  node.measurement_text = this.engine.measurementTextForFilename(node.filename);
                  this.updateTreeBoxNodeToolTip(node);
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (this.setTreeBoxNodeSsweight(node.child(i), filename, ssweight, filename_postfix)) {
                        return true;
                  }
            }
      }
      return false;
}

setTreeBoxSsweight(node, filename, ssweight, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            return false;
      } else {
            return this.setTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix);
      }
}

getTreeBoxNodeFileNamesCheckedIf(node, filenames, checked)
{
      if (node.numberOfChildren == 0) {
            if (node.checked == checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.getTreeBoxNodeFileNamesCheckedIf(node.child(i), filenames, checked);
            }
      }
}

getTreeBoxFileNamesCheckedIf(node, filenames, checked)
{
      if (node.numberOfChildren > 0) {
            this.getTreeBoxNodeFileNamesCheckedIf(node, filenames, checked);
      }
}

getTreeBoxNodeFiles(node, treeboxfiles)
{
      if (node.numberOfChildren == 0) {
            if (!node.filename || !File.exists(node.filename)) {
                  console.criticalln("getTreeBoxNodeFiles, no file " + node.filename);
                  return;
            }
            if (node.lightsnode) {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked, node.ssweight, node.best_image, node.reference_image ];
            } else {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked ];
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.getTreeBoxNodeFiles(node.child(i), treeboxfiles);
            }
      }
}

getTreeBoxNodeCheckedFileNames(node, filenames)
{
      if (node.numberOfChildren == 0) {
            if (node.checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  this.getTreeBoxNodeCheckedFileNames(node.child(i), filenames);
            }
      }
}

findFileFromTreeBoxNode(node, filename)
{
      if (node.numberOfChildren == 0) {
            if (node.filename == filename) {
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (this.findFileFromTreeBoxNode(node.child(i), filename)) {
                        return true;
                  }
            }
      }
      return false;
}

findFileFromTreeBox(node, filename)
{
      if (node.numberOfChildren == 0) {
            return false;
      } else {
            return this.findFileFromTreeBoxNode(node, filename);
      }
}

setExpandedTreeBoxNode(node, expanded)
{
      if (node.numberOfChildren > 0) {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (node.collapsable) {
                        node.expanded = expanded;
                  }
                  this.setExpandedTreeBoxNode(node.child(i), expanded);
            }
      }
}

setFilteringChanged = () => {
      // Set filtering changed flag to true so that we can re-measure
      // the light files when the metrics visualizer is called.
      // This is needed when we change the filter limits.
      // If we do not set this flag then metrics visualizer will not
      // re-measure the light files and will use the old measurements.
      if (this.global.debug) console.writeln("setFilteringChanged, set filtering_changed to true");
      this.filtering_changed = true;
}

metricsVisualizerCheck(parent)
{
      if (this.global.saved_measurements == null) {
            this.util.updateStatusInfoLabel("No measurements to visualize", true);
            console.writeln("Use Light files tab to load light files. When files are loaded clicking this button will ask if you want to measure them.");
            console.writeln("Once measurements are done they can be saved to a Json file using the Setup file save button.");
            console.writeln("Measurements are also saved to the AutosaveSetup.json file after processing. Loading a Json file will also load the measurements.");

            if (!this.measureTreeBoxFiles(parent, this.global.pages.LIGHTS)) {
                  return false;
            }
      } else if (this.filtering_changed) {
            console.writeln("Metrics visualizer, measurements changed, re-measuring...");
            if (!this.measureTreeBoxFiles(parent, this.global.pages.LIGHTS)) {
                  console.writeln("Metrics visualizer, re-measuring failed, no measurements to visualize");
                  return false;
            }
      }
      return true;
}

metricsVisualizerSSWEIGHT(parent)
{
      this.util.addStatusInfo("Metrics visualizer SSWEIGHT");
      console.writeln("metricsVisualizerSSWEIGHT, filtering_changed: " + this.filtering_changed);

      var changes = this.filtering_changed;

      if (!this.metricsVisualizerCheck(parent)) {
            return;
      }
      var data  = [];
      data[0] = {
                  name: "SSWEIGHT",
                  data: this.engine.getFilterValues(this.global.saved_measurements, "SSWEIGHT"),
                  limit: this.par.ssweight_limit.val,
                  filter_high: false,
      };
      // Add empty data for the rest of the filters
      for (var i = 1; i < 4; i++) {
            data[i] = {
                        name: "SSWEIGHT",
                        data: [],
                        limit: 0,
                        filter_high: false,
            };
      }
      var metricsFilteredOut = this.engine.getMetricsFilteredOut(this.global.saved_measurements, true);

      let metricsVisualizer = new AutoIntegrateMetricsVisualizer(global);

      if (metricsVisualizer.main(data, metricsFilteredOut)) {
            // Update all changed data
            if (data[0].limit != this.par.ssweight_limit.val || changes) {
                  // Update limit
                  this.par.ssweight_limit.val = data[0].limit;
                  this.par.ssweight_limit.reset();
                  this.util.updateStatusInfoLabel("Metrics visualizer, update SSWEIGHT limit to " + data[0].limit, true);
                  // Mark all light files as checked
                  this.checkAllTreeBoxFiles(parent.dialog.treeBox[this.global.pages.LIGHTS], true);
                  // Update all treebox files with new limits
                  this.filterTreeBoxFiles(parent.dialog, this.global.pages.LIGHTS);
            } else {
                  this.util.updateStatusInfoLabel("Metrics visualizer, no changes to SSWEIGHT limit", true);
            }
      }

}

metricsVisualizerFilters(parent)
{
      this.util.addStatusInfo("Metrics visualizer filters");
      console.writeln("metricsVisualizerFilters, filtering_changed: " + this.filtering_changed);

      var changes = this.filtering_changed;

      if (!this.metricsVisualizerCheck(parent)) {
            return;
      }

      if (this.par.filter_limit1_type.val == 'None' &&
          this.par.filter_limit2_type.val == 'None' &&
          this.par.filter_limit3_type.val == 'None' &&
          this.par.filter_limit4_type.val == 'None') 
      {
            var filters = [ 'PSFSignal', 'FWHM', 'Eccentricity', 'Stars' ];
      } else {
            var filters = [ this.par.filter_limit1_type.val, this.par.filter_limit2_type.val, this.par.filter_limit3_type.val, this.par.filter_limit4_type.val ];
      }
      var limits = [ this.par.filter_limit1_val.val, this.par.filter_limit2_val.val, this.par.filter_limit3_val.val, this.par.filter_limit4_val.val ];

      var data = [];
      for (var i = 0; i < filters.length; i++) {
            data[i] = { 
                        name: filters[i], 
                        data: this.engine.getFilterValues(this.global.saved_measurements, filters[i]), 
                        limit: limits[i],
                        filter_high: this.engine.getFilterHigh(filters[i]),
                   };
      }
      var metricsFilteredOut = this.engine.getMetricsFilteredOut(this.global.saved_measurements);

      let metricsVisualizer = new AutoIntegrateMetricsVisualizer(global);

      if (metricsVisualizer.main(data, metricsFilteredOut)) {
            // Update all changed data
            for (var i = 0; i < filters.length; i++) {
                  if (data[i].limit != limits[i]) {
                        // Update limits
                        switch (i) {
                              case 0:
                                    this.par.filter_limit1_type.val = data[i].name;
                                    this.par.filter_limit1_val.val = data[i].limit;
                                    this.par.filter_limit1_type.reset();
                                    this.par.filter_limit1_val.reset();
                                    changes = true;
                                    break;
                              case 1:
                                    this.par.filter_limit2_type.val = data[i].name;
                                    this.par.filter_limit2_val.val = data[i].limit;
                                    this.par.filter_limit2_type.reset();
                                    this.par.filter_limit2_val.reset();
                                    changes = true;
                                    break;
                              case 2:
                                    this.par.filter_limit3_type.val = data[i].name;
                                    this.par.filter_limit3_val.val = data[i].limit;
                                    this.par.filter_limit3_type.reset();
                                    this.par.filter_limit3_val.reset();
                                    changes = true;
                                    break;
                              case 3:
                                    this.par.filter_limit4_type.val = data[i].name;
                                    this.par.filter_limit4_val.val = data[i].limit;
                                    this.par.filter_limit4_type.reset();
                                    this.par.filter_limit4_val.reset();
                                    changes = true;
                                    break;
                              default:
                                    console.writeln("Metrics visualizer, unknown filter index " + i);
                                    continue;
                        }
                        console.writeln("Metrics visualizer, update filter " + filters[i] + " limit to " + data[i].limit);
                  }
            }
            if (changes) {
                  this.util.updateStatusInfoLabel("Metrics visualizer, filter limits changed", true);
                  // Mark all light files as checked
                  this.checkAllTreeBoxFiles(parent.dialog.treeBox[this.global.pages.LIGHTS], true);
                  // Update all treebox files with new limits
                  this.filterTreeBoxFiles(parent.dialog, this.global.pages.LIGHTS);
            } else {
                  this.util.updateStatusInfoLabel("Metrics visualizer, no changes to filter limits", true);
            }
      } else {
            this.util.updateStatusInfoLabel("Metrics visualizer, no changes", true);
      }
}

okToRunSubframeSelector()
{
      var messagebox = new MessageBox("There are no measurements available. Do you want to run SubframeSelector now?",
                                          "AutoIntegrate", StdIcon.Warning, StdButton.Yes, StdButton.No);
      if (messagebox.execute() != StdButton.Yes) {
            console.writeln("Cancelled.");
            return false;
      }
      return true;
}

okToMeasureAllFiles(num_files, num_measurements)
{
      console.writeln("okToMeasureAllFiles, num_files: " + num_files + ", num_measurements: " + num_measurements);
      var messagebox = new MessageBox("There are " + num_files + " files and " + num_measurements + " measurements available. Do you want to measure files again?", 
                                          "AutoIntegrate", StdIcon.Warning, StdButton.Yes, StdButton.No);
      if (messagebox.execute() == StdButton.Yes) {
            console.writeln("Yes.");
            return true;
      } else {
            console.writeln("No.");
            return false;
      }
}

measureTreeBoxFiles(parent, pageIndex)
{
      console.show();
      var treebox = parent.treeBox[pageIndex];
      if (treebox.numberOfChildren == 0) {
            console.writeln("No files to measure.");
            return false;
      }

      if (this.global.saved_measurements == null && !this.okToRunSubframeSelector()) {
            return false;
      }
      console.noteln("Measuring...");

      // console.writeln("measureTreeBoxFiles " + pageIndex);

      var checked_files = [];
      var unchecked_files = [];

      this.getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
      this.getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);

      var all_files = checked_files.concat(unchecked_files);

      this.guiSubframeSelectorMeasure(all_files, false, false, all_files);

      this.filtering_changed = false;

      this.util.updateStatusInfoLabel("Measurements done", true);

      return this.global.saved_measurements != null && this.global.saved_measurements.length > 0;
}

filterTreeBoxFiles(parent, pageIndex)
{
      console.show();

      if (this.global.saved_measurements == null) {
            if (!this.measureTreeBoxFiles(parent, pageIndex)) {
                  this.util.updateStatusInfoLabel("No measurements available, cannot filter files.", true);
                  return;
            }
      }

      var treebox = parent.treeBox[pageIndex];
      if (treebox.numberOfChildren == 0) {
            this.util.updateStatusInfoLabel("No files to filter.", true);
            return;
      }

      this.util.updateStatusInfoLabel("Filtering...");

      console.writeln("filterTreeBoxFiles " + pageIndex);

      var checked_files = [];
      var unchecked_files = [];

      this.getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
      this.getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);

      var all_files = checked_files.concat(unchecked_files);

      // get treeboxfiles which is array of [ filename, checked, weight ]
      // sorted by weight
      var treeboxfiles = this.guiSubframeSelectorMeasure(checked_files, true, true, all_files, this.par.sort_order_type.val);

      this.filtering_changed = false;
      this.util.updateStatusInfoLabel("Filtering done, " + treeboxfiles.length + " files", true);

      // mark old unchecked files as unchecked
      this.filenamesToTreeboxfiles(treeboxfiles, unchecked_files, false);

      console.writeln("filterTreeBoxFiles " + treeboxfiles.length + " files");

      // remove old files
      parent.treeBox[pageIndex].clear();

      // add new filtered file list
      this.addFilesToTreeBox(parent, pageIndex, treeboxfiles);

      console.writeln("filterTreeBoxFiles, this.addFilesToTreeBox done");

      var checked_count = 0;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (treeboxfiles[i][1]) {
                  checked_count++;
            }
      }

      console.noteln("AutoIntegrate filtering completed, " + checked_count + " checked, " + (treeboxfiles.length - checked_count) + " unchecked, sorted by " + this.par.sort_order_type.val);
      this.util.updateStatusInfoLabel("Filtering completed");
}

getFilesFromTreebox(parent)
{
      for (var pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
            var treeBox = parent.treeBox[pageIndex];
            if (treeBox.numberOfChildren == 0) {
                  var filenames = null;
            } else {
                  var filenames = [];
                  this.getTreeBoxNodeCheckedFileNames(treeBox, filenames);
            }

            switch (pageIndex) {
                  case this.global.pages.LIGHTS:
                        this.global.lightFileNames = filenames;
                        break;
                  case this.global.pages.BIAS:
                        this.global.biasFileNames = filenames;
                        break;
                  case this.global.pages.DARKS:
                        this.global.darkFileNames = filenames;
                        break;
                  case this.global.pages.FLATS:
                        this.global.flatFileNames = filenames;
                        break;
                  case this.global.pages.FLAT_DARKS:
                        this.global.flatdarkFileNames = filenames;
                        break;
                  default:
                        this.util.throwFatalError("getFilesFromTreebox bad pageIndex " + pageIndex);
            }
      }
}

getNewTreeBoxFiles(parent, pageIndex, imageFileNames, skip_old_files = false)
{
      if (this.global.debug) console.writeln("getNewTreeBoxFiles " + pageIndex);

      var treeBox = parent.treeBox[pageIndex];
      var treeboxfiles = [];

      if (treeBox.numberOfChildren > 0 && !skip_old_files) {
            this.getTreeBoxNodeFiles(treeBox, treeboxfiles);
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
addFilteredFilesToTreeBox(parent, pageIndex, newImageFileNames, skip_old_files = false)
{
      if (this.global.debug) console.writeln("addFilteredFilesToTreeBox " + pageIndex);

      // ensure we have treeboxfiles which is array of [ filename, checked, weight, best_image, reference_image ]
      var treeboxfiles = this.getNewTreeBoxFiles(parent, pageIndex, newImageFileNames, skip_old_files);

      var filteredFiles = this.engine.getFilterFiles(treeboxfiles, pageIndex, '');
      if (filteredFiles.filecount == 0) {
            if (this.global.debug) console.writeln("addFilteredFilesToTreeBox no files");
            return;
      }
      if (this.global.debug) console.writeln("addFilteredFilesToTreeBox " + filteredFiles.filecount + " files");
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

      if (this.global.debug) console.writeln("addFilteredFilesToTreeBox " + filteredFiles.allfilesarr.length + " files");

      var preview_file_name = null;
      var preview_file_filter = null;
      var filename_best_image = null;

      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {

            var filterFiles = filteredFiles.allfilesarr[i].files;
            var filterName = filteredFiles.allfilesarr[i].filter;

            if (filterFiles.length > 0) {
                  if (this.global.debug) console.writeln("addFilteredFilesToTreeBox filterName " + filterName + ", " + filterFiles.length + " files");

                  var filternode = new TreeBoxNode(rootnode);
                  filternode.expanded = true;
                  filternode.setText( 0, filterName +  ' (' + filterFiles[0].filter + ') ' + filterFiles.length + ' files');
                  filternode.nodeData_type = "FrameGroup";
                  filternode.collapsable = true;
                  filternode.filename = "";

                  for (var j = 0; j < filterFiles.length; j++) {
                        if (!File.exists(filterFiles[j].name)) {
                              if (this.global.debug) console.criticalln("addFilteredFilesToTreeBox, no file " + filterFiles[j].name);
                              continue;
                        }
                        if (this.findFileFromTreeBox(files_TreeBox, filterFiles[j].name)) {
                              if (this.global.debug) console.writeln("Skipping duplicate file " + filterFiles[j].name);
                              continue;
                        }
                        var node = new TreeBoxNode(filternode);
                        var txt = File.extractName(filterFiles[j].name) + File.extractExtension(filterFiles[j].name);
                        if (pageIndex == this.global.pages.LIGHTS && this.par.monochrome_image.val) {
                              node.setText(0, this.monochrome_text + txt);
                        } else {
                              node.setText(0, txt);
                        }
                        node.filename = filterFiles[j].name;
                        node.nodeData_type = "";
                        node.checkable = true;
                        node.checked = filterFiles[j].checked;
                        node.collapsable = false;
                        node.ssweight = filterFiles[j].ssweight;
                        if (pageIndex == this.global.pages.LIGHTS) {
                              node.measurement_text = this.engine.measurementTextForFilename(node.filename);
                        }
                        node.exptime = filterFiles[j].exptime;
                        node.filter = filterName;
                        if (node.filter == undefined) {
                              this.util.throwFatalError("addFilteredFilesToTreeBox bad filter " + node.filename);
                        }
                        node.best_image = filterFiles[j].best_image;
                        node.reference_image = filterFiles[j].reference_image;
                        if (pageIndex == this.global.pages.LIGHTS) {
                              node.lightsnode = true;
                        } else {
                              node.lightsnode = false;
                        }
                        this.updateTreeBoxNodeToolTip(node);
                        if (pageIndex == this.global.pages.LIGHTS && filterFiles[j].name.indexOf("best_image") != -1) {
                              filename_best_image = filterFiles[j].name;
                        }
                        if (this.global.use_preview && preview_file_name == null) {
                              if (!this.is_some_preview || pageIndex == this.global.pages.LIGHTS) {
                                    preview_file_name = node.filename;
                                    preview_file_filter = node.filter;
                              }
                        }
                  }
            }
      }
      files_TreeBox.canUpdate = true;

      if (pageIndex == this.global.pages.LIGHTS) {
            if (this.global.user_selected_best_image != null) {
                  this.setBestImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], this.global.user_selected_best_image, "");
            } else if (filename_best_image != null) {
                  this.setBestImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], filename_best_image, "");
            }
            for (var i = 0; i < this.global.user_selected_reference_image.length; i++)  {
                  this.setReferenceImageInTreeBox(
                        parent, 
                        parent.treeBox[this.global.pages.LIGHTS], 
                        this.global.user_selected_reference_image[i][0],
                        "",
                        this.global.user_selected_reference_image[i][1]);
            }
      }

      if (preview_file_name != null) {
            this.updatePreviewFilenameAndInfo(preview_file_name, true, true);
            this.current_selected_file_name = preview_file_name;
            this.current_selected_file_filter = preview_file_filter;
      }
}

addUnfilteredFilesToTreeBox(parent, pageIndex, newImageFileNames, skip_old_files = false)
{
      console.writeln("addUnfilteredFilesToTreeBox " + pageIndex);

      var files_TreeBox = parent.treeBox[pageIndex];

      var treeboxfiles = this.getNewTreeBoxFiles(parent, pageIndex, newImageFileNames, skip_old_files);
      
      files_TreeBox.clear();

      files_TreeBox.canUpdate = false;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (!File.exists(treeboxfiles[i][0])) {
                  console.criticalln("addUnfilteredFilesToTreeBox, no file " + treeboxfiles[i][0]);
                  continue;
            }
            if (this.findFileFromTreeBox(files_TreeBox, treeboxfiles[i][0])) {
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

addExptimeGroupedFilesToTreeBox(parent, pageIndex, newImageFileNames, skip_old_files = false)
{
      console.writeln("addExptimeGroupedFilesToTreeBox " + pageIndex);

      var treeboxfiles = this.getNewTreeBoxFiles(parent, pageIndex, newImageFileNames, skip_old_files);
      if (treeboxfiles.length == 0) {
            if (this.global.debug) console.writeln("addExptimeGroupedFilesToTreeBox no files");
            return;
      }

      // Group files by exposure time
      var groups = {};
      for (var i = 0; i < treeboxfiles.length; i++) {
            var filename = treeboxfiles[i][0];
            var exptime = this.engine.getExptimeFromFile(filename);
            var key = exptime.toString();
            if (!groups[key]) {
                  groups[key] = { exptime: exptime, files: [] };
            }
            groups[key].files.push(treeboxfiles[i]);
      }

      // Sort groups by exposure time ascending
      var sortedKeys = Object.keys(groups).sort(function(a, b) {
            return parseFloat(a) - parseFloat(b);
      });

      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var rootnode = new TreeBoxNode(files_TreeBox);
      rootnode.expanded = true;
      rootnode.setText(0, "Files grouped by exposure time");
      rootnode.nodeData_type = "FrameGroup";
      rootnode.collapsable = false;

      files_TreeBox.canUpdate = false;

      for (var k = 0; k < sortedKeys.length; k++) {
            var key = sortedKeys[k];
            var group = groups[key];
            var exptimeLabel = group.exptime > 0 ? group.exptime + "s" : "Unknown";

            var groupnode = new TreeBoxNode(rootnode);
            groupnode.expanded = true;
            groupnode.setText(0, exptimeLabel + " - " + group.files.length + " files");
            groupnode.nodeData_type = "FrameGroup";
            groupnode.collapsable = true;
            groupnode.filename = "";

            for (var j = 0; j < group.files.length; j++) {
                  var fileEntry = group.files[j];
                  if (!File.exists(fileEntry[0])) {
                        console.criticalln("addExptimeGroupedFilesToTreeBox, no file " + fileEntry[0]);
                        continue;
                  }
                  if (this.findFileFromTreeBox(files_TreeBox, fileEntry[0])) {
                        console.writeln("Skipping duplicate file " + fileEntry[0]);
                        continue;
                  }
                  var node = new TreeBoxNode(groupnode);
                  node.setText(0, File.extractName(fileEntry[0]) + File.extractExtension(fileEntry[0]));
                  node.setToolTip(0, fileEntry[0]);
                  node.filename = fileEntry[0];
                  node.nodeData_type = "";
                  node.checkable = true;
                  node.checked = fileEntry[1];
                  node.collapsable = false;
                  node.filter = '';
                  node.best_image = false;
                  node.reference_image = false;
            }
      }
      files_TreeBox.canUpdate = true;
}

addFilesToTreeBox(parent, pageIndex, imageFileNames, skip_old_files = false)
{
      if (imageFileNames == null) {
            parent.treeBox[pageIndex].clear();
            return;
      }
      switch (pageIndex) {
            case this.global.pages.LIGHTS:
            case this.global.pages.FLATS:
            case this.global.pages.FLAT_DARKS:
                  this.addFilteredFilesToTreeBox(parent, pageIndex, imageFileNames, skip_old_files);
                  break;
            case this.global.pages.DARKS:
                  this.addExptimeGroupedFilesToTreeBox(parent, pageIndex, imageFileNames, skip_old_files);
                  break;
            case this.global.pages.BIAS:
                  this.addUnfilteredFilesToTreeBox(parent, pageIndex, imageFileNames, skip_old_files);
                  break;
            default:
                  this.util.throwFatalError("addFilesToTreeBox bad pageIndex " + pageIndex);
      }
}

loadJsonFileCallback = (parent, pagearray) =>
{
      console.writeln("loadJsonFileCallback");

      // page array of treebox files names
      for (var i = 0; i < pagearray.length; i++) {
            this.addFilesToTreeBox(parent, i, pagearray[i], true);
      }
      this.updateInfoLabel(parent);
      this.updateExclusionAreaLabel(parent);
      if (this.par.show_flowchart.val && this.global.flowchartData != null) {
            this.flowchartUpdated();
      }
      this.updateParameterDependencies(parent.dialog);
}

addOneFilesButton(parent, filetype, pageIndex, toolTip)
{
      if (this.global.debug) console.writeln("addOneFilesButton " + filetype + ", pageIndex: " + pageIndex);
      var filesAdd_Button = new PushButton( parent );
      this.global.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = this.util.formatToolTip(toolTip);
      filesAdd_Button.onClick = () =>
      {
            if (this.par.open_directory.val) {
                  var pagearray = this.engine.openDirectoryFiles(filetype, this.par.directory_files.val, false, false, pageIndex);
            } else {
                  var pagearray = this.engine.openImageFiles(filetype, false, false, false);
            }
            if (pagearray == null) {
                  return;
            }
            if (pagearray.length == 1) {
                  // simple list of file names
                  var imageFileNames = pagearray[0];
                  if (pageIndex == this.global.pages.LIGHTS && !this.par.skip_autodetect_imagetyp.val) {
                        var imagetypes = this.engine.getImagetypFiles(imageFileNames);
                        for (var i = 0; i < this.global.pages.END; i++) {
                              if (imagetypes[i].length > 0) {
                                    this.addFilesToTreeBox(parent, i, imagetypes[i]);
                              }
                        }
                  } else {
                        this.addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  }
            } else {
                  // page array of treebox files names
                  for (var i = 0; i < pagearray.length; i++) {
                        if (pagearray[i] != null) {
                              this.addFilesToTreeBox(parent, i, pagearray[i]);
                        }
                  }
            }
            this.updateInfoLabel(parent);
            this.updateExclusionAreaLabel(parent);
            parent.tabBox.currentPageIndex = pageIndex;
      };
      return filesAdd_Button;
}

addMastersButton(parent)
{
      var filesAdd_Button = new PushButton( parent );
      this.global.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = "Masters";
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = this.util.formatToolTip(
            "<p>Select master calibration files (master bias, master darks, master flats, master flat darks).</p>" +
            "<p>Files are auto-classified by IMAGETYP keyword and loaded into the correct tabs. " +
            "Master file checkboxes are automatically checked for each loaded type.</p>");
      filesAdd_Button.onClick = () =>
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = true;
            ofd.caption = "Select master calibration files";
            ofd.initialPath = this.ppar.masterDir != '' ? this.ppar.masterDir : this.ppar.lastDir;
            var fits_files = "*.fit *.fits *.fts";
            ofd.filters = [
                  ["Image files", fits_files + " *.xisf"],
                  ["All files", "*.*"]
            ];

            if (!ofd.execute()) {
                  return;
            }

            var fileNames = ofd.fileNames;
            if (fileNames.length == 0) {
                  return;
            }

            this.util.saveMasterDir(File.extractDrive(fileNames[0]) + File.extractDirectory(fileNames[0]));

            var imagetypes = this.engine.getImagetypFiles(fileNames);

            var firstPageIndex = -1;

            if (imagetypes[this.global.pages.BIAS].length > 0) {
                  this.addFilesToTreeBox(parent, this.global.pages.BIAS, imagetypes[this.global.pages.BIAS]);
                  this.par.bias_master_files.val = true;
                  if (parent.biasMasterFilesCheckBox) {
                        parent.biasMasterFilesCheckBox.checked = true;
                  }
                  if (firstPageIndex == -1) firstPageIndex = this.global.pages.BIAS;
            }
            if (imagetypes[this.global.pages.DARKS].length > 0) {
                  this.addFilesToTreeBox(parent, this.global.pages.DARKS, imagetypes[this.global.pages.DARKS]);
                  this.par.dark_master_files.val = true;
                  if (parent.darkMasterFilesCheckBox) {
                        parent.darkMasterFilesCheckBox.checked = true;
                  }
                  if (firstPageIndex == -1) firstPageIndex = this.global.pages.DARKS;
            }
            if (imagetypes[this.global.pages.FLATS].length > 0) {
                  this.addFilesToTreeBox(parent, this.global.pages.FLATS, imagetypes[this.global.pages.FLATS]);
                  this.par.flat_master_files.val = true;
                  if (parent.flatMasterFilesCheckBox) {
                        parent.flatMasterFilesCheckBox.checked = true;
                  }
                  if (firstPageIndex == -1) firstPageIndex = this.global.pages.FLATS;
            }
            if (imagetypes[this.global.pages.FLAT_DARKS].length > 0) {
                  this.addFilesToTreeBox(parent, this.global.pages.FLAT_DARKS, imagetypes[this.global.pages.FLAT_DARKS]);
                  this.par.flat_dark_master_files.val = true;
                  if (parent.flatDarkMasterFilesCheckBox) {
                        parent.flatDarkMasterFilesCheckBox.checked = true;
                  }
                  if (firstPageIndex == -1) firstPageIndex = this.global.pages.FLAT_DARKS;
            }

            this.updateInfoLabel(parent);
            this.updateExclusionAreaLabel(parent);

            if (firstPageIndex != -1) {
                  parent.tabBox.currentPageIndex = firstPageIndex;
            }
      };
      return filesAdd_Button;
}

addTargetType(parent)
{
      var lbl = new Label( parent );
      this.global.rootingArr.push(lbl);
      lbl.text = "Target type";
      lbl.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      lbl.toolTip = "<p>Give target type.</p>" +
                    "<p>If target type is given then image stretching settings are selected automatically.</p>" +
                    "<p>If no target type is given then current settings are used. They should work reasonably fine in many cases.</p>" +
                    "<p>Galaxy works well when target is a lot brighter than the background.</p>" +
                    "<p>Nebula works well when target fills the whole image or is not much brighter than the background.</p>" +
                    "<p>When non-default target type is selected then stretching option is disabled.</p>";
      
      var targetTypeComboBox = this.guitools.newComboBox(parent, this.par.target_type, this.target_type_values, lbl.toolTip);
      this.global.rootingArr.push(targetTypeComboBox);
      targetTypeComboBox.onItemSelected = (itemIndex) => {
            targetTypeComboBox.aiParam.val = targetTypeComboBox.aiValarray[itemIndex];
            this.updateParameterDependencies(this.dialog);
      }

      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( targetTypeComboBox );
      outputdir_Sizer.addStretch();
      this.global.rootingArr.push(outputdir_Sizer);

      return { sizer: outputdir_Sizer, label: lbl };
}

switchToSimpleMode(parent)
{
      console.writeln("Switch to simple mode");
      this.global.expert_mode = false;

      // go through tabs in this.global.tabs and hide expert tabs
      for (var i = 0; i < this.global.tabs.length; i++) {
            var tab = this.global.tabs[i];
            if (tab.expert_mode) {
                  var j = this.findPageIndexByName(parent.mainTabBox, tab.name);
                  if (j != -1) {
                        parent.mainTabBox.removePage(j);
                  }
            }
      }
      for (var i = 0; i < this.global.expert_mode_sections.length; i++) {
            var section = this.global.expert_mode_sections[i];
            section.hide();
      }
      for (var i = 0; i < this.global.expert_mode_controls.length; i++) {
            var control = this.global.expert_mode_controls[i];
            control.hide();
      }
      parent.modeTitle.aiStyleSheet = parent.modeTitle.styleSheet;            // Save current stylesheet
      parent.modeTitle.styleSheet = "font-weight: bold;color: white;";
      parent.modeFrame.aiBackgroundColor = parent.modeFrame.backgroundColor;  // Save current background color
      parent.modeFrame.backgroundColor = this.global.simpleModeColor;
      parent.tutorialButton.aiStyleSheet = parent.tutorialButton.styleSheet;  // Save current stylesheet
      parent.tutorialButton.styleSheet = this.global.simpleModeStyleSheet;
      parent.welcomeButton.styleSheet = parent.tutorialButton.styleSheet;
    
      parent.setupAllTutorials();
      parent.mainTabBox.ensureLayoutUpdated();
      parent.mainTabBox.adjustToContents();
      parent.ensureLayoutUpdated();
      parent.adjustToContents();

      parent.saveExpertMode();
}

switchToExpertMode(parent)
{
      console.writeln("Switch to expert mode");
      this.global.expert_mode = true;

      // go through tabs in this.global.tabs and show all tabs
      for (var i = 0; i < this.global.tabs.length; i++) {
            var tab = this.global.tabs[i];
            if (tab.expert_mode) {
                  parent.mainTabBox.insertPage(i, tab.page, tab.name);
            }
      }
      for (var i = 0; i < this.global.expert_mode_sections.length; i++) {
            var section = this.global.expert_mode_sections[i];
            section.show();
      }
      for (var i = 0; i < this.global.expert_mode_controls.length; i++) {
            var control = this.global.expert_mode_controls[i];
            control.show();
            if (control.aiName) {
                  this.guitools.getSectionVisible(control.aiName, control);
            }
      }
      if (parent.modeFrame.aiBackgroundColor) {
            parent.modeTitle.styleSheet = parent.modeTitle.aiStyleSheet;            // Restore saved stylesheet
            parent.modeFrame.backgroundColor = parent.modeFrame.aiBackgroundColor;
            parent.tutorialButton.styleSheet = parent.tutorialButton.aiStyleSheet;
            parent.welcomeButton.styleSheet = parent.tutorialButton.styleSheet;
      }
      parent.setupAllTutorials();
      parent.mainTabBox.ensureLayoutUpdated();
      parent.mainTabBox.adjustToContents();
      parent.ensureLayoutUpdated();
      parent.adjustToContents();

      parent.saveExpertMode();
}

addExpertMode(parent)
{
      var toolTip = "<p>Select interface mode.</p>" +
                    "<p>In simple mode only selected tabs are shown.</p>" +
                    "<p>In expert mode all tabs and options are shown.</p>";

      parent.modeControlSizer = new HorizontalSizer;
      parent.modeControlSizer.spacing = 8;
      parent.modeControlSizer.margin = 4;

      parent.simpleRadio = new RadioButton(parent);
      parent.simpleRadio.text = "Simple";
      parent.simpleRadio.toolTip = toolTip;
      parent.simpleRadio.textAlignment = TextAlignment.VertCenter;
      parent.simpleRadio.checked = !this.global.expert_mode;
      parent.simpleRadio.onCheck = (checked) => {
            if (checked) {
                  this.switchToSimpleMode(parent);
            }
      };

      parent.expertRadio = new RadioButton(parent);
      parent.expertRadio.text = "Expert";
      parent.expertRadio.toolTip = toolTip;
      parent.simpleRadio.checked = !this.global.expert_mode;
      parent.expertRadio.checked = this.global.expert_mode;
      parent.expertRadio.onCheck = (checked) => {
            if (checked) {
                  this.switchToExpertMode(parent);
            }
      };

      parent.modeControlSizer.add(parent.simpleRadio);
      parent.modeControlSizer.add(parent.expertRadio);
      parent.modeControlSizer.addStretch();

      parent.modeFrame = new Frame(parent);
      parent.modeFrame.style = FrameStyle.Box;
      parent.modeFrame.sizer = new HorizontalSizer;
      parent.modeFrame.sizer.margin = 8;
      parent.modeFrame.sizer.spacing = 6;

      // Add a label as "title"
      parent.modeTitle = new Label(parent);
      parent.modeTitle.text = "Mode";
      parent.modeTitle.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      parent.modeTitle.toolTip = toolTip;

      parent.modeFrame.sizer.add(parent.modeTitle);
      parent.modeFrame.sizer.add(parent.modeControlSizer);

      return parent.modeFrame;
}

newRow2Obj(parent)
{
      var wpobj = this.addWinPrefix(parent);
      var winprefix_sizer = wpobj.sizer;
      var otobj = this.addOutputDir(parent);
      var outputdir_sizer = otobj.sizer;

      var filesButtons_Sizer2 = new HorizontalSizer;
      this.global.rootingArr.push(filesButtons_Sizer2);

      filesButtons_Sizer2.spacing = 4;
      filesButtons_Sizer2.addStretch();
      filesButtons_Sizer2.add( winprefix_sizer );
      filesButtons_Sizer2.add( outputdir_sizer );

      return { sizer: filesButtons_Sizer2, window_prefix_label: wpobj.label, output_dir_label: otobj.label  };
}

addFilesButtons(parent)
{
      let buttons = {
            addLightsButton: this.addOneFilesButton(parent, "Lights", this.global.pages.LIGHTS, parent.filesToolTip[this.global.pages.LIGHTS]),
            addMastersButton: this.addMastersButton(parent),
            addBiasButton: this.addOneFilesButton(parent, "Bias", this.global.pages.BIAS, parent.filesToolTip[this.global.pages.BIAS]),
            addDarksButton: this.addOneFilesButton(parent, "Darks", this.global.pages.DARKS, parent.filesToolTip[this.global.pages.DARKS]),
            addFlatsButton: this.addOneFilesButton(parent, "Flats", this.global.pages.FLATS, parent.filesToolTip[this.global.pages.FLATS]),
            addFlatDarksButton: this.addOneFilesButton(parent, "Flat Darks", this.global.pages.FLAT_DARKS, parent.filesToolTip[this.global.pages.FLAT_DARKS])
      };

      var directoryCheckBox = this.guitools.newCheckBox(parent, "Directory", this.par.open_directory, 
                  "<p>Open directory dialog instead of files dialog.</p>" + 
                  "<p>All files that match the file pattern on the right will be added as image files. " +
                  "Files are searched recursively from the selected directory and all subdirectories.</p>" +
                  "<p>Selected directory is used as the default output directory.</p>" +
                  "<p>File pattern can have multiple file types separated by space.</p>");
      var directoryFilesEdit = this.guitools.newTextEdit(parent, this.par.directory_files,
                  "<p>File pattern for files that will be added as image files.</p>" +
                  "<p>File pattern can have multiple file types separated by space.</p>");
      directoryFilesEdit.setFixedWidth(8 * parent.font.width( 'M' ));

      var filesButtons_Sizer1 = new HorizontalSizer;
      this.global.rootingArr.push(filesButtons_Sizer1);
      filesButtons_Sizer1.spacing = 4;
      filesButtons_Sizer1.add( buttons.addLightsButton );
      filesButtons_Sizer1.add( buttons.addMastersButton );
      filesButtons_Sizer1.add( buttons.addBiasButton );
      filesButtons_Sizer1.add( buttons.addDarksButton );
      filesButtons_Sizer1.add( buttons.addFlatsButton );
      filesButtons_Sizer1.add( buttons.addFlatDarksButton );
      filesButtons_Sizer1.addSpacing( 4 );
      filesButtons_Sizer1.add( directoryCheckBox );
      filesButtons_Sizer1.add( directoryFilesEdit );

      var filesButtons_Sizer = new VerticalSizer;
      this.global.rootingArr.push(filesButtons_Sizer);
      filesButtons_Sizer.add( filesButtons_Sizer1 );
      filesButtons_Sizer1.addStretch();

      return { sizer: filesButtons_Sizer, buttons: buttons, directoryCheckBox: directoryCheckBox };
}

addOneFileManualFilterButton(parent, filetype, pageIndex)
{
      var filesAdd_Button = new PushButton( parent );
      this.global.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      if (filetype == 'C') {
            filesAdd_Button.toolTip = "<p>Add color/OSC/DSLR files</p>";
      } else {
            filesAdd_Button.toolTip = "<p>Add " + filetype + " files</p>";
      }
      filesAdd_Button.onClick = () => {
            var imageFileNames = this.engine.openImageFiles(filetype, true, false, false);
            if (imageFileNames != null) {
                  if (this.global.debug) console.writeln("addOneFileManualFilterButton.onClick " + filetype + ", pageIndex: " + pageIndex);
                  var filterSet;
                  switch (pageIndex) {
                        case this.global.pages.LIGHTS:
                              if (this.global.lightFilterSet == null) {
                                    this.global.lightFilterSet = this.util.initFilterSets();
                              }
                              filterSet = this.util.findFilterSet(this.global.lightFilterSet, filetype);
                              break;
                        case this.global.pages.FLATS:
                              if (this.global.flatFilterSet == null) {
                                    this.global.flatFilterSet = this.util.initFilterSets();
                              }
                              filterSet = this.util.findFilterSet(this.global.flatFilterSet, filetype);
                              break;
                        case this.global.pages.FLAT_DARKS:
                              if (this.global.flatDarkFilterSet == null) {
                                    this.global.flatDarkFilterSet = this.util.initFilterSets();
                              }
                              filterSet = this.util.findFilterSet(this.global.flatDarkFilterSet, filetype);
                              break;
                        default:
                              this.util.throwFatalError("addOneFileManualFilterButton bad pageIndex " + pageIndex);
                  }
                  console.writeln("addOneFileManualFilterButton add " + filetype + " files");
                  for (var i = 0; i < imageFileNames.length; i++) {
                        this.util.addFilterSetFile(filterSet, imageFileNames[i], filetype);
                  }
                  this.addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  this.updateInfoLabel(parent);
                  this.updateExclusionAreaLabel(parent);
            }
      };
      return filesAdd_Button;
}

addFileFilterButtons(parent, pageIndex)
{
      var buttonsControl = new Control(parent);
      buttonsControl.sizer = new HorizontalSizer;
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'L', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'R', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'G', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'B', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'H', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'S', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'O', pageIndex));
      buttonsControl.sizer.add(this.addOneFileManualFilterButton(parent, 'C', pageIndex));
      buttonsControl.visible = false;
      return buttonsControl;
}

addFileFilterButtonSectionBar(parent, pageIndex)
{
      var control = this.addFileFilterButtons(parent, pageIndex);

      var sb = new SectionBar(parent, "Add filter files manually");
      this.global.rootingArr.push(sb);
      sb.setSection(control);
      sb.hide();
      sb.toolTip = "<p>Select manually files for each filter. Useful if filters are not recognized automatically.</p>";
      sb.onToggleSection = (bar, beginToggle) => {
            parent.ensureLayoutUpdated();
            parent.adjustToContents();
      };

      this.filterSectionbars[pageIndex] = sb;
      this.filterSectionbarcontrols[pageIndex] = control;

      var gb = new Control( parent );
      this.global.rootingArr.push(gb);
      gb.sizer = new VerticalSizer;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

blink_x(imageWindow, x)
{
      var overflow = false;
      var imageWidth = imageWindow.mainView.image.width;
      var viewportWidth = imageWindow.visibleViewportRect.width;
      var viewportWidth = imageWindow.width;
      var point_x = (imageWidth / 2) - (viewportWidth / 2) + (viewportWidth / 2) * (this.blink_zoom_x + x);
      if (point_x < 0) {
            point_x = 0;
            overflow = true;
      } else if (point_x > imageWidth) {
            point_x = imageWidth;
            overflow = true;
      }
      return { x: point_x, overflow: overflow, imageWidth: imageWidth, viewportWidth: viewportWidth};
}

blink_y(imageWindow, y)
{
      var overflow = false;
      var imageHeight = imageWindow.mainView.image.height;
      var viewportHeight = imageWindow.visibleViewportRect.height;
      var viewportHeight = imageWindow.height;
      var point_y = (imageHeight) / 2 - (viewportHeight / 2) + (viewportHeight / 2) * (this.blink_zoom_y + y);
      if (point_y < 0) {
            point_y = 0;
            overflow = true;
      } else if (point_y > imageHeight) {
            point_y = imageHeight;
            overflow = true;
      }
      return { y: point_y, overflow: overflow, imageHeight: imageHeight, viewportHeight: viewportHeight};
}

inside_image(imageWindow, x, y)
{
      var new_x = this.blink_x(imageWindow, x);
      if (new_x.overflow) {
            return false;
      }
      var new_y = this.blink_y(imageWindow, y);
      if (new_y.overflow) {
            return false;
      }
      return true;
}

blinkWindowZoomedUpdate(imageWindow, x, y)
{
      console.writeln("blinkWindowZoomedUpdate, x=" + x + ", y=" + y);

      if (this.inside_image(imageWindow, 0, 0) || this.inside_image(imageWindow, x, y)) {
            // old or new position is inside image, update position
            this.blink_zoom_x = this.blink_zoom_x + x;
            this.blink_zoom_y = this.blink_zoom_y + y;
            console.writeln("blinkWindowZoomedUpdate, new blink_zoom_x=" + this.blink_zoom_x + ", blink_zoom_y=" + this.blink_zoom_y);
      } else {
            console.writeln("blinkWindowZoomedUpdate, use old blink_zoom_x=" + this.blink_zoom_x + ", blink_zoom_y=" + this.blink_zoom_y);
      }

      var point_x = this.blink_x(imageWindow, 0);
      var point_y = this.blink_y(imageWindow, 0);

      console.writeln("blinkWindowZoomedUpdate, image.width=" + point_x.imageWidth + ", image.height=" + point_y.imageHeight);
      console.writeln("blinkWindowZoomedUpdate, viewportWidth=" + point_x.viewportWidth + ", viewportHeight=" + point_y.viewportHeight);

      console.writeln("blinkWindowZoomedUpdate, point_x=" + point_x.x + ", point_y=" + point_y.y);
      
      var center = new Point(point_x.x, point_y.y);
      
      imageWindow.zoomFactor = 1;
      imageWindow.viewportPosition = center;
}

findPageIndexByName(tabBox, name)
{
      for (var j = 0; j < tabBox.numberOfPages; j++) {
            if (tabBox.pageLabel(j) == name) {
                  return j;
            }
      }
      return -1;
}

filesTreeBox(parent, optionsSizer, pageIndex)
{
      if (this.global.debug) console.writeln("filesTreeBox " + pageIndex);

      parent.treeBoxRootingArr[pageIndex] = [];

      /* Tree box to show files. */
      var files_TreeBox = new TreeBox( parent );
      this.global.rootingArr.push(files_TreeBox);
      files_TreeBox.multipleSelection = true;
      files_TreeBox.rootDecoration = false;
      files_TreeBox.alternateRowColor = true;
      files_TreeBox.setScaledMinSize( 150, 150 ); // we could use this.screen_height but since this is min size a small value should be good
      files_TreeBox.numberOfColumns = 1;
      files_TreeBox.headerVisible = false;
      files_TreeBox.onCurrentNodeUpdated = () =>
      {
            if (this.par.skip_blink.val) {
                  return;
            }
            try {
                  if (files_TreeBox.currentNode != null && files_TreeBox.currentNode.nodeData_type == "") {
                        // Show preview or "blink" window. 
                        // Note: Files are added by routine addFilteredFilesToTreeBox
                        if (!this.global.use_preview) {
                              console.hide();
                        } else {
                              this.updatePreviewTxt("Processing...");
                        }
                        if (this.par.debug.val) var start_time = Date.now();
                        console.writeln("files_TreeBox.onCurrentNodeUpdated " + files_TreeBox.currentNode.filename);
                        var imageWindows = ImageWindow.open(files_TreeBox.currentNode.filename);
                        if (imageWindows == null || imageWindows.length == 0) {
                              return;
                        }
                        var imageWindow = imageWindows[0];
                        if (!this.global.use_preview) {
                              if (this.blink_window != null) {
                                    imageWindow.position = this.blink_window.position;
                              } else {
                                    imageWindow.position = new Point(0, 0);
                              }
                        }
                        if (this.par.debug.val || this.global.debug) console.writeln("onCurrentNodeUpdated:read image name " + imageWindow.mainView.id);
                        if (this.par.debug.val) console.writeln("--- onCurrentNodeUpdated:read " + (Date.now()-start_time)/1000 + " sec");
                        if (this.par.debug.val) start_time = Date.now();
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
                        if (this.par.debug.val || this.global.debug) console.writeln("onCurrentNodeUpdated:imageInfoTxt " + imageInfoTxt);
                        if (this.par.debug.val) console.writeln("--- onCurrentNodeUpdated:properties " + (Date.now()-start_time)/1000 + " sec");
                        if (this.par.debug.val) start_time = Date.now();
                        if (!this.global.use_preview) {
                              this.engine.autoStretch(imageWindow);
                              this.updateImageInfoLabel(imageInfoTxt);
                              if (this.blink_zoom) {
                                    this.blinkWindowZoomedUpdate(imageWindow, 0, 0);
                              }
                              imageWindow.show();
                              if (this.blink_window != null) {
                                    blink_window.forceClose();
                              }
                              this.blink_window = imageWindow;
                        } else {
                              let resampled = false;
                              if (this.par.preview_resample.val) {
                                    var maxlen = Math.max(imageWindow.mainView.image.width, imageWindow.mainView.image.height);
                                    var resample_factor = this.par.preview_resample_target.val / maxlen;
                                    if (resample_factor < 1) {
                                          this.engine.runResample(imageWindow, resample_factor);
                                          if (this.par.debug.val) console.writeln("--- onCurrentNodeUpdated:runResample " + (Date.now()-start_time)/1000 + " sec, resample_factor " + resample_factor);
                                          console.writeln("Resampled image size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height);
                                          resampled = true;
                                    }
                              }
                              this.updatePreviewWinTxt(
                                    imageWindow, 
                                    File.extractName(files_TreeBox.currentNode.filename) + File.extractExtension(files_TreeBox.currentNode.filename),
                                    null,
                                    true,
                                    imageWindow,
                                    resampled
                              );
                              if (this.par.debug.val) console.writeln("--- onCurrentNodeUpdated:updatePreviewWinTxt " + (Date.now()-start_time)/1000 + " sec");
                              if (this.par.debug.val) start_time = Date.now();
                              this.util.updateStatusInfoLabel(imageInfoTxt);
                        }
                        this.current_selected_file_name = files_TreeBox.currentNode.filename;
                        this.current_selected_file_filter = files_TreeBox.currentNode.filter;
                        if (this.par.debug.val) console.writeln("--- onCurrentNodeUpdated:end " + (Date.now()-start_time)/1000 + " sec");
                  }
            } catch(err) {
                  console.show();
                  console.criticalln(err);
            }
      }
      parent.treeBox[pageIndex] = files_TreeBox;

      var filesControl = new Control(parent);
      this.global.rootingArr.push(filesControl);
      filesControl.sizer = new VerticalSizer;
      filesControl.sizer.add(files_TreeBox);
      filesControl.sizer.addSpacing( 4 );
      if (pageIndex == this.global.pages.LIGHTS || pageIndex == this.global.pages.FLATS || pageIndex == this.global.pages.FLAT_DARKS) {
            let obj = this.addFileFilterButtonSectionBar(parent, pageIndex);
            this.global.rootingArr.push(obj);
            filesControl.sizer.add(obj);
      }

      var files_GroupBox = new GroupBox( parent );
      files_GroupBox.sizer = new HorizontalSizer;
      files_GroupBox.sizer.spacing = 4;
      files_GroupBox.sizer.add( filesControl, parent.textEditWidth );
      files_GroupBox.sizer.add( optionsSizer );

      return files_GroupBox;
}

appendInfoTxt(txt, cnt, type)
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

updateInfoLabel(parent)
{
      var txt = "";
      txt = this.appendInfoTxt(txt, this.getTreeBoxFileCount(parent.treeBox[this.global.pages.LIGHTS]), "light");
      txt = this.appendInfoTxt(txt, this.getTreeBoxFileCount(parent.treeBox[this.global.pages.BIAS]), "bias");
      txt = this.appendInfoTxt(txt, this.getTreeBoxFileCount(parent.treeBox[this.global.pages.DARKS]), "dark");
      txt = this.appendInfoTxt(txt, this.getTreeBoxFileCount(parent.treeBox[this.global.pages.FLATS]), "flat");
      txt = this.appendInfoTxt(txt, this.getTreeBoxFileCount(parent.treeBox[this.global.pages.FLAT_DARKS]), "flat dark");

      console.writeln(txt);

      this.infoLabel.text = txt;
}

updateExclusionAreaLabel(parent)
{
      this.guitools.exclusionAreaCountLabel.text = "Count: " + this.global.exclusion_areas.polygons.length;
}

updateImageInfoLabel(txt)
{
      console.writeln(txt);

      this.imageInfoLabel.text = txt;
}

// Write default parameters to process icon
saveParametersToProcessIcon()
{
      console.writeln("saveParametersToProcessIcon");
      for (let x in this.par) {
            var param = this.par[x];
            if (this.global.isParameterChanged(param)) {
                  var name = this.util.mapBadChars(param.name);
                  console.writeln(name + "=" + param.val);
                  Parameters.set(name, param.val);
            }
      }
}

// Save default parameters to persistent module settings
saveParametersToPersistentModuleSettings()
{
      if (this.global.do_not_write_settings) {
            console.writeln("Do not save parameter values persistent module settings");
            return;
      }
      console.writeln("saveParametersToPersistentModuleSettings");

      // Ask for confirmation before saving default values because it can overwrite previously saved values.
      var mb = new MessageBox("<p>Are you sure you want to save current parameter values to persistent module settings?</p>" +
                              "<p>This will overwrite any previously saved values.</p>", "Save default values", StdIcon.Question, StdButton.Yes, StdButton.No);
      if (mb.execute() != StdButton.Yes) {
            console.noteln("User canceled saving settings");
            return;
      }

      for (let x in this.par) {
            this.util.writeParameterToSettings(this.par[x]);
      }
}

processingCompletedText(success)
{
      if (success) {
            console.noteln("**********************************");
            console.noteln("* Processing completed           *");
            console.noteln("**********************************");
      } else {
            console.noteln("**********************************");
            console.noteln("* Processing stopped with errors *");
            console.noteln("**********************************");
      }
}

runAction(parent)
{
      console.writeln("Run button pressed");
      this.exitFromDialog();
      if (this.par.integrated_lights.val) {
            console.criticalln("Cannot use Run button with Integrated lights option, Autocontinue button must be used.");
            return;
      }
      this.guitools.current_preview.image = null;
      this.guitools.current_preview.image_versions = [];
      this.updateWindowPrefix();
      this.getFilesFromTreebox(parent.dialog);
      this.global.haveIconized = 0;
      var index = this.findPrefixIndex(this.ppar.win_prefix);
      if (index == -1) {
            index = this.findNewPrefixIndex(this.ppar.userColumnCount == -1);
      }
      if (this.ppar.userColumnCount == -1) {
            this.global.columnCount = this.ppar.prefixArray[index][0];
            console.writeln('Using auto icon column ' + this.global.columnCount);
      } else {
            this.global.columnCount = this.ppar.userColumnCount;
            console.writeln('Using user icon column ' + this.global.columnCount);
      }
      this.global.iconStartRow = 0;
      this.global.write_processing_log_file = true;
      var success = this.Autorun(parent);
      if (this.global.haveIconized) {
            // We have iconized something so update prefix array
            this.ppar.prefixArray[index] = [ this.global.columnCount, this.ppar.win_prefix, this.global.haveIconized ];
            this.fix_win_prefix_array();
            if (this.ppar.userColumnCount != -1 && this.par.use_manual_icon_column.val) {
                  this.ppar.userColumnCount = this.global.columnCount + 1;
                  parent.dialog.columnCountControlComboBox.currentItem = this.ppar.userColumnCount + 1;
            }
            this.savePersistentSettings(false);
      }
      this.processingCompletedText(success);
}

newRunButton(parent, toolbutton)
{
      var local_run_action = () =>
      {
            if (!this.global.get_flowchart_data) {
                  this.runAction(parent);
            }
      };
      return this.guitools.newPushOrToolButton(
                  parent,
                  ":/icons/power.png",
                  "Run",
                  "Run the script.",
                  local_run_action,
                  toolbutton
      );
}

newExitButton(parent, toolbutton)
{
      var exit_action = () =>
      {
            console.noteln("AutoIntegrate exiting");
            // save settings at the end
            this.savePersistentSettings(true);
            this.exitFromDialog();
            this.exitCleanup(parent.dialog);
            console.noteln("Close dialog");
            parent.dialog.cancel();
      };

      return this.guitools.newPushOrToolButton(
                  parent,
                  ":/icons/close.png",
                  "Exit",
                  "<p>Exit the script and save interface settings.</p>" + 
                  "<p>Note that closing the script from top right corner close icon does not save interface settings.</p>",
                  exit_action,
                  toolbutton
      );
}

newCancelButton(parent, toolbutton)
{
      var cancel_action = () =>
      {
            if (this.global.is_processing != this.global.processing_state.none) {
                  console.noteln("Cancel requested...");
                  this.global.cancel_processing = true;
            }
      };

      return this.guitools.newPushOrToolButton(
                  parent,
                  ":/icons/cancel.png",
                  "Cancel",
                  "<p>Cancel the current script run.</p>" + 
                  "<p>Current processing is canceled as soon as control returns to the script.</p>",
                  cancel_action,
                  toolbutton
      );
}

newAutoContinueButton(parent, toolbutton)
{
      var autocontinue_action = () =>
      {
            this.exitFromDialog();
            console.writeln("Start AutoContinue");

            // Do not create subdirectory structure with AutoContinue

            this.guitools.current_preview.image = null;
            this.guitools.current_preview.image_versions = [];
            if (this.global.outputRootDir == "" || this.util.pathIsRelative(this.global.outputRootDir)) {
                  // If we do not have a fixed output directory then do not use subdirectories 
                  this.util.clearDefaultDirs();
            }
            this.getFilesFromTreebox(parent.dialog);
            if (this.isbatchNarrowbandPaletteMode() && this.engine.autocontinueHasNarrowband()) {
                  var batch_narrowband_palette_mode = true;
            } else {
                  var batch_narrowband_palette_mode = false;
            }
            
            this.global.haveIconized = 0;
            this.global.write_processing_log_file = true;
            try {
                  this.updateWindowPrefix();
                  this.global.run_auto_continue = true;
                  if (batch_narrowband_palette_mode) {

                        this.engine.autointegrateNarrowbandPaletteBatch(parent.dialog, true);

                  } else {
                        var index = this.findPrefixIndex(this.ppar.win_prefix);
                        if (index == -1) {
                              this.global.iconStartRow = 0;
                              index = this.findNewPrefixIndex(this.ppar.userColumnCount == -1);
                        } else {
                              // With AutoContinue start icons below current
                              // icons.
                              this.global.iconStartRow = this.ppar.prefixArray[index][2];
                        }
                        if (this.ppar.userColumnCount == -1) {
                              this.global.columnCount = this.ppar.prefixArray[index][0];
                              console.writeln('Using auto icon column ' + this.global.columnCount);
                        } else {
                              this.global.columnCount = this.ppar.userColumnCount;
                              this.global.iconStartRow = 11;
                              console.writeln('Using user icon column ' + this.global.columnCount);
                        }
                        this.flowchart.flowchartReset();

                        this.engine.autointegrateProcessingEngine(parent.dialog, true, this.util.is_narrowband_option(), "AutoContinue");

                  }
                  this.global.run_auto_continue = false;
                  this.util.setDefaultDirs();
                  this.update_enhancements_target_image_window_list(null);
                  if (this.global.haveIconized && !batch_narrowband_palette_mode) {
                        // We have iconized something so update prefix array
                        this.ppar.prefixArray[index] = [ this.global.columnCount, this.ppar.win_prefix, Math.max(this.global.haveIconized, this.global.iconStartRow) ];
                        this.fix_win_prefix_array();
                        //parent.columnCountControlComboBox.currentItem = this.global.columnCount + 1;
                        this.savePersistentSettings(false);
                  }
                  this.processingCompletedText(true);
            }
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  this.engine.writeProcessingStepsAndEndLog(null, true, null, true);
                  this.global.run_auto_continue = false;
                  this.global.is_processing = this.global.processing_state.none;
                  this.util.setDefaultDirs();
                  this.fix_win_prefix_array();
                  this.processingCompletedText(false);
            }
      };

      var autocontinueToolTip =
      "AutoContinue - Run automatic processing from previously created LRGB, narrowband or Color images." +
      "<p>Image check order is:</p>" +
      "<ol>" +
      "<li>AutoLRGB or AutoRGB - Final image for enhancements</li>" +
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


      return this.guitools.newPushOrToolButton(
            parent,
            ":/icons/goto-next.png",
            "AutoContinue",
            autocontinueToolTip,
            autocontinue_action,
            toolbutton
      );
}

newAdjustToContentButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/toolbar/preview-reset.png" );
      button.toolTip = "<p>Adjust script window to content.</p>";
      button.onClick = () =>
      {
            parent.ensureLayoutUpdated();
            parent.adjustToContents();
      };
      return button;
}

newCollapeSectionsButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/process-interface/contract-vert.png" );
      button.toolTip = "<p>Collapse all sections.</p>" + 
                       "<p>Useful when you have trouble to fit the dialog to the screen.</p>" + 
                       "<p>Note that to adjust script window to content you may need to click  " + 
                       "the separate Adjust button.</p>";
      button.onClick = () =>
      {
            for (var i = 0; i < this.global.sectionBars.length; i++) {
                  this.global.sectionBars[i].aiControl.hide();
                  if (!this.global.do_not_write_settings) {
                        Settings.write("AutoIntegrate" + '/' + this.global.sectionBars[i].aiName, DataType.Boolean, this.global.sectionBars[i].aiControl.visible);
                  }
                  parent.ensureLayoutUpdated();
                  parent.adjustToContents();
            }
      };
      return button;
}

blinkArrowButton(parent, icon, x, y)
{
      var blinkArrowButton = new ToolButton( parent );
      this.global.rootingArr.push(blinkArrowButton);
      blinkArrowButton.icon = parent.scaledResource(icon);
      blinkArrowButton.toolTip = "<p>Blink window move zoomed area</p>";
      blinkArrowButton.setScaledFixedSize( 20, 20 );
      blinkArrowButton.onClick = () =>
      {
            if (this.par.skip_blink.val) {
                  return;
            }
            if (this.blink_window != null && this.blink_zoom) {
                  console.writeln("blinkArrowButton");
                  this.blinkWindowZoomedUpdate(this.blink_window, x, y);
            }
      };
      return blinkArrowButton;
}

updateParameterDependencies(parent)
{
      // Update the enabled state of the stretchingComboBox based on the target_type
      parent.guitools.stretchingComboBox.enabled = (parent.par.target_type.val === "Default");
      let stretching = parent.engine.targetTypeToStretching(parent.par.target_type.val);
      if (stretching != null) {
            parent.guitools.stretchingComboBox.currentItem = parent.guitools.stretchingComboBox.aiValarray.indexOf(stretching);
            parent.guitools.stretchingComboBox.aiParam.val = stretching;
      }
      // console.writeln("Setting stretchingComboBox.enabled to " + dialog.stretchingComboBox.enabled + " based on target_type " + this.par.target_type.val);
}

newMaximizeDialogButton(parent)
{
      var maxDialogButton = new ToolButton( parent );
      maxDialogButton.icon = parent.scaledResource( ":/real-time-preview/full-view.png" );

      var maxDialogToolTip = "<p>Maximize dialog size to (almost) full screen.</p>" +
                             "<p>Note that the maximizing works best when the side preview is enabled in the <i>Interface / Interface settings</i> section.</p>";

      maxDialogButton.setScaledFixedSize( 20, 20 );
      maxDialogButton.toolTip = maxDialogToolTip;
      maxDialogButton.onClick = () =>
      {
            if (this.dialog_mode == 0) {
                  // minimized, do nothing
                  return;
            }
            if (!this.global.use_preview) {
                  console.criticalln("No preview, cannot maximize.");
                  return;
            }
            if (this.dialog_mode == 2) {   // restore
                  console.writeln("Maximize dialog: restore");
                  maxDialogButton.icon = parent.scaledResource( ":/real-time-preview/full-view.png" );
                  maxDialogButton.toolTip = maxDialogToolTip;
                  previewControl.setSize(this.ppar.preview.side_preview_width, this.ppar.preview.side_preview_height);
                  previewControl.adjustToContents();
                  parent.dialog.move(this.dialog_old_position);
                  this.dialog_mode = 1;
                  parent.dialog.adjustToContents();
            } else if (this.dialog_mode == 1) {
                  // maximize
                  // calculate starting point for maximized dialog size
                  console.writeln("Maximize dialog: maximize");
                  maxDialogButton.icon = parent.scaledResource( ":/image-window/fit-view-active.png" );
                  maxDialogButton.toolTip = "Restore dialog to a normal size.";
                  var preview_width = this.ppar.preview.side_preview_width;
                  var preview_height = this.ppar.preview.side_preview_height;
                  var preview_control_width = previewControl.width;
                  var preview_control_height = previewControl.height;
                  if (!this.ppar.preview.show_histogram) {
                        var histogram_control_height = 0;
                  } else {
                        var histogram_control_height = histogramControl.height;
                  }

                  var emptyAreaHeight = mainTabBox.height - preview_control_height - histogram_control_height;
                  if (emptyAreaHeight < 0) {
                        emptyAreaHeight = 0;
                  }
                  var dialog_width = parent.dialog.width;
                  var dialog_height = parent.dialog.height;
                  if (this.par.debug.val) console.writeln("DEBUG:Maximize dialog: dialog " + dialog_width + "x" + dialog_height + ", preview " + preview_width + "x" + preview_height + ", preview control " + preview_control_width + "x" + preview_control_height + ", empty area " + emptyAreaHeight);
                  var max_preview_width = preview_width + (this.screen_width - dialog_width) - 100;
                  var max_preview_height = preview_height + (this.screen_height - dialog_height) + emptyAreaHeight - 100;

                  var preview_size = this.util.adjustDialogToScreen(
                                          parent.dialog, 
                                          this.previewControl,
                                          true,       // maximize
                                          max_preview_width, 
                                          max_preview_height);

                  this.dialog_old_position = parent.dialog.position;   // save old position so we can restore it
                  parent.dialog.move(10, 10);                     // move to top left corner
                  this.dialog_mode = 2;

                  // console.writeln("preview width overhead " + (preview_control_width - preview_width) + ", height overhead " + (preview_control_height - preview_height));
                  console.writeln("Maximize dialog: screen " + this.screen_width + "x" + this.screen_height + ", dialog " + dialog_width + "x" + dialog_height + ", preview " + preview_width + "x" + preview_height + 
                                  ", max preview " + preview_size.width + "x" + preview_size.height);

            }
            parent.dialog.adjustToContents();
            this.util.runGarbageCollection();
      };

      return maxDialogButton;
}

newMinimizeDialogButton(parent)
{
      var minDialogButton = new ToolButton( parent );
      minDialogButton.icon = parent.scaledResource( ":/workspace/window-iconize.png" );

      minDialogButton.setScaledFixedSize( 20, 20 );
      var minDialogToolTip = "Minimize dialog to a minimum size.";
      minDialogButton.toolTip = minDialogToolTip;
      minDialogButton.onClick = () =>
      {
            if (this.dialog_mode == 2) {
                  // maximized, do nothing
                  return;
            }
            if (this.dialog_mode == 0) {   // restore
                  console.writeln("Minimize dialog: restore");
                  this.dialog_min_position = parent.dialog.position;    // save old position so we can restore it
                  minDialogButton.icon = parent.scaledResource( ":/workspace/window-iconize.png" );
                  minDialogButton.toolTip = minDialogToolTip;
                  if (this.global.use_preview) {
                        previewControl.show();
                        if (this.histogramControl != null) {
                              histogramControl.show();
                        }
                  }
                  parent.top2ndRowControl.show();
                  mainTabBox.show();
                  parent.dialog.move(this.dialog_old_position);
                  this.dialog_mode = 1;
                  parent.dialog.adjustToContents();
            } else if (this.dialog_mode == 1) {
                  // minimize
                  console.writeln("Minimize dialog: minimize");
                  minDialogButton.icon = parent.scaledResource( ":/workspace/window-maximize.png" );
                  minDialogButton.toolTip = "Restore dialog to normal size.";
                  this.dialog_old_position = parent.dialog.position;    // save old position so we can restore it
                  if (this.global.use_preview) {
                        previewControl.hide();
                        if (this.histogramControl != null) {
                              histogramControl.hide();
                        }
                  }
                  mainTabBox.hide();
                  parent.top2ndRowControl.hide();
                  if (this.dialog_min_position == null) {
                        parent.dialog.move(Math.floor(this.screen_width / 2), Math.floor(this.screen_height / 2)); // move to center of screen
                  } else {
                        parent.dialog.move(this.dialog_min_position);
                  }
                  this.dialog_mode = 0;
                  parent.dialog.adjustToContents();
            }
            minDialogButton.aiminDialogMode = !minDialogButton.aiminDialogMode;
            parent.dialog.ensureLayoutUpdated();
            parent.dialog.adjustToContents();
            this.util.runGarbageCollection();
      };

      return minDialogButton;
}

newActionSizer(parent)
{
      var actionsSizer = new HorizontalSizer;
      this.global.rootingArr.push(actionsSizer);

      let obj = this.guitools.newLabel(parent, "Actions", "Script actions, these are the same as in the bottom row of the script.");
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = this.newCancelButton(parent, true);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = this.newAutoContinueButton(parent, true);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = this.newRunButton(parent, true);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );

      obj = this.newExitButton(parent, true);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 12 );

      obj = this.newCollapeSectionsButton(parent);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 6 );

      obj = this.newAdjustToContentButton(parent);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );
      actionsSizer.addSpacing( 12 );

      obj = this.newMinimizeDialogButton(parent);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );

      obj = this.newMaximizeDialogButton(parent);
      this.global.rootingArr.push(obj);
      actionsSizer.add( obj );

      return actionsSizer;
}

newPageButtonsSizer(parent, jsonSizer, actionSizer)
{
      if (!this.global.use_preview) {
            // Blink
            var blinkLabel = new Label( parent );
            this.global.rootingArr.push(blinkLabel);
            blinkLabel.text = "Blink";
            blinkLabel.toolTip = "<p>Blink zoom control.</p><p>You can blink images by clicking them in the image list.</p>";
            blinkLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

            var blinkFitButton = new ToolButton( parent );
            this.global.rootingArr.push(blinkFitButton);
            blinkFitButton.icon = parent.scaledResource(":/toolbar/view-zoom-optimal-fit.png");
            blinkFitButton.toolTip = "<p>Blink window zoom to optimal fit</p>";
            blinkFitButton.setScaledFixedSize( 20, 20 );
            blinkFitButton.onClick = () =>
            {
                  if (this.par.skip_blink.val) {
                        return;
                  }
                  if (this.blink_window != null) {
                        this.blink_window.zoomToOptimalFit();
                        this.blink_zoom = false;
                  }
            };
            var blinkZoomButton = new ToolButton( parent );
            this.global.rootingArr.push(blinkZoomButton);
            blinkZoomButton.icon = parent.scaledResource(":/icons/zoom-1-1.png");
            blinkZoomButton.toolTip = "<p>Blink window zoom to 1:1</p>";
            blinkZoomButton.setScaledFixedSize( 20, 20 );
            blinkZoomButton.onClick = () =>
            {
                  if (this.par.skip_blink.val) {
                        return;
                  }
                  if (this.blink_window != null) {
                        this.blink_zoom = true;
                        this.blink_zoom_x = 0;
                        this.blink_zoom_y = 0;
                        this.blinkWindowZoomedUpdate(this.blink_window, 0, 0);
                  }
            };
            var blinkLeft = this.blinkArrowButton(parent, ":/icons/arrow-left.png", -1, 0);
            var blinkRight = this.blinkArrowButton(parent, ":/icons/arrow-right.png", 1, 0);
            var blinkUp = this.blinkArrowButton(parent, ":/icons/arrow-up.png", 0, -1);
            var blinkDown = this.blinkArrowButton(parent, ":/icons/arrow-down.png", 0, 1);
      }
      var currentPageLabel = new Label( parent );
      this.global.rootingArr.push(currentPageLabel);
      currentPageLabel.text = "Current page";
      currentPageLabel.toolTip = "<p>Operations on the current page.</p>";
      currentPageLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;

      var currentPageCheckButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageCheckButton);
      currentPageCheckButton.icon = parent.scaledResource(":/icons/check.png");
      currentPageCheckButton.toolTip = "<p>Mark all files in the current page as checked.</p>";
      currentPageCheckButton.setScaledFixedSize( 20, 20 );
      currentPageCheckButton.onClick = () =>
      {
            this.checkAllTreeBoxFiles(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], true);
      };
      var currentPageUncheckButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageUncheckButton);
      currentPageUncheckButton.icon = parent.scaledResource(":/qss/checkbox-unchecked.png");
      currentPageUncheckButton.toolTip = "<p>Mark all files in the current page as unchecked.</p>";
      currentPageUncheckButton.setScaledFixedSize( 20, 20 );
      currentPageUncheckButton.onClick = () =>
      {
            this.checkAllTreeBoxFiles(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], false);
      };
      var currentPageClearButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageClearButton);
      currentPageClearButton.icon = parent.scaledResource(":/icons/clear.png");
      currentPageClearButton.toolTip = "<p>Clear the list of input images in the current page.</p>";
      currentPageClearButton.setScaledFixedSize( 20, 20 );
      currentPageClearButton.onClick = () =>
      {
            if (this.global.debug.val) console.writeln("currentPageClearButton clicked");
            var pageIndex = parent.tabBox.currentPageIndex;
            parent.treeBox[pageIndex].clear();
            this.updateInfoLabel(parent);
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS) {
                  this.global.user_selected_best_image = null;
                  this.global.user_selected_reference_image = [];
                  this.global.star_alignment_image = null;
                  this.global.lightFilterSet = null;
            }
            if (parent.tabBox.currentPageIndex == this.global.pages.FLATS) {
                  this.global.flatFilterSet = null;
            }
            if (parent.tabBox.currentPageIndex == this.global.pages.FLAT_DARKS) {
                  this.global.flatDarkFilterSet = null;
            }
      };

      var currentPageRemoveSelectedButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageRemoveSelectedButton);
      currentPageRemoveSelectedButton.icon = parent.scaledResource(":/icons/remove.png");
      currentPageRemoveSelectedButton.toolTip = "<p>Remove unchecked images in the current page.</p>";
      currentPageRemoveSelectedButton.setScaledFixedSize( 20, 20 );
      currentPageRemoveSelectedButton.onClick = () =>
      {
            if (this.global.debug.val) console.writeln("currentPageRemoveSelectedButton clicked");
            var pageIndex = parent.tabBox.currentPageIndex;
            var treebox = parent.treeBox[pageIndex];
            // get checked files and unchecked files
            var checked_files = [];
            var unchecked_files = [];
            this.getTreeBoxFileNamesCheckedIf(treebox, checked_files, true);
            this.getTreeBoxFileNamesCheckedIf(treebox, unchecked_files, false);
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS) {
                  // find this.global.user_selected_best_image from unchecked files
                  if (this.global.user_selected_best_image != null) {
                        var index = unchecked_files.indexOf(this.global.user_selected_best_image);
                        if (index != -1) {
                              // clear best image
                              this.global.user_selected_best_image = null;
                        }
                  }
                  // remove unchecked files from this.global.user_selected_reference_image array
                  for (var i = 0; i < unchecked_files.length; i++) {
                        this.remove_user_selected_reference_image(unchecked_files[i], null);
                  }
                  // find this.global.star_alignment_image from unchecked files
                  if (this.global.star_alignment_image != null) {
                        var index = unchecked_files.indexOf(this.global.star_alignment_image);
                        if (index != -1) {
                              // clear star alignment image
                              this.global.star_alignment_image = null;
                        }
                  }
                  // find unchecked files from this.global.lightFilterSet
                  if (this.global.lightFilterSet != null) {
                        for (var i = 0; i < unchecked_files.length; i++) {
                              this.util.removeFilterFile(this.global.lightFilterSet, unchecked_files[i]);
                        }
                  }
            }
            if (parent.tabBox.currentPageIndex == this.global.pages.FLATS) {
                  // find unchecked files from this.global.flatFilterSet
                  if (this.global.flatFilterSet != null) {
                        for (var i = 0; i < unchecked_files.length; i++) {
                              this.util.removeFilterFile(this.global.flatFilterSet, unchecked_files[i]);
                        }
                  }
            }
            if (parent.tabBox.currentPageIndex == this.global.pages.FLAT_DARKS) {
                  // find unchecked files from this.global.flatDarkFilterSet
                  if (this.global.flatDarkFilterSet != null) {
                        for (var i = 0; i < unchecked_files.length; i++) {
                              this.util.removeFilterFile(this.global.flatDarkFilterSet, unchecked_files[i]);
                        }
                  }
            }
            // add checked files back
            treebox.clear();
            var treeboxfiles = [];
            this.filenamesToTreeboxfiles(treeboxfiles, checked_files, true);
            this.addFilesToTreeBox(parent, pageIndex, treeboxfiles);
            this.updateInfoLabel(parent);
      };

      var currentPageCollapseButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageCollapseButton);
      currentPageCollapseButton.icon = parent.scaledResource(":/browser/collapse.png");
      currentPageCollapseButton.toolTip = "<p>Collapse all sections in the current page.</p>";
      currentPageCollapseButton.setScaledFixedSize( 20, 20 );
      currentPageCollapseButton.onClick = () => {
            this.setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], false);
      };
      var currentPageExpandButton = new ToolButton( parent );
      this.global.rootingArr.push(currentPageExpandButton);
      currentPageExpandButton.icon = parent.scaledResource(":/browser/expand.png");
      currentPageExpandButton.toolTip = "<p>Expand all sections in the current page.</p>";
      currentPageExpandButton.setScaledFixedSize( 20, 20 );
      currentPageExpandButton.onClick = () => {
            this.setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], true);
      };

      var bestImageLabel = this.guitools.newLabel( parent, "Reference images", "Selecting the reference images for star alignment, image integration and local normalization.");

      var setBestImageButton = new ToolButton( parent );
      this.global.rootingArr.push(setBestImageButton);
      setBestImageButton.icon = parent.scaledResource(":/icons/ok-button.png");
      setBestImageButton.toolTip = "<p>Set current preview/selected image as the reference image for star alignment.</p>";
      setBestImageButton.setScaledFixedSize( 20, 20 );
      setBestImageButton.onClick = () => {
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS && this.current_selected_file_name != null) {
                  this.setBestImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], this.current_selected_file_name, "");
            }
      };

      var setReferenceImageButton = new ToolButton( parent );
      this.global.rootingArr.push(setReferenceImageButton);
      setReferenceImageButton.icon = parent.scaledResource(":/icons/item.png");
      setReferenceImageButton.toolTip = "<p>Set current preview/selected image as the reference image for current filter for image integration and local normalization.</p>";
      setReferenceImageButton.setScaledFixedSize( 20, 20 );
      setReferenceImageButton.onClick = () =>
      {
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS && this.current_selected_file_name != null) {
                  this.setReferenceImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], this.current_selected_file_name, "", this.current_selected_file_filter);
            }
      };

      var clearBestImageButton = new ToolButton( parent );
      this.global.rootingArr.push(clearBestImageButton);
      clearBestImageButton.icon = parent.scaledResource(":/browser/disable.png");
      clearBestImageButton.toolTip = "<p>Clear all reference image settings.</p>";
      clearBestImageButton.setScaledFixedSize( 20, 20 );
      clearBestImageButton.onClick = () =>
      {
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS) {
                  this.setBestImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], null, "");
                  this.setReferenceImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], null, "", null);
                  this.global.user_selected_best_image = null;
                  this.global.user_selected_reference_image = [];
                  this.global.star_alignment_image = null;
            }
      };

      var findBestImageButton = new ToolButton( parent );
      this.global.rootingArr.push(findBestImageButton);
      findBestImageButton.icon = parent.scaledResource(":/icons/find.png");
      findBestImageButton.toolTip = "<p>Find reference images based on SSWEIGHT.</p>" + 
                                    "<p>This will overwrite all current reference image selections.</p>";
      findBestImageButton.setScaledFixedSize( 20, 20 );
      findBestImageButton.onClick = () =>
      {
            if (parent.tabBox.currentPageIndex == this.global.pages.LIGHTS) {
                  if (this.findBestImageFromTreeBoxFiles(parent.treeBox[this.global.pages.LIGHTS])) {
                        // Best files are set into this.global.user_selected_best_image and this.global.user_selected_reference_image
                        this.setBestImageInTreeBox(
                              parent, 
                              parent.treeBox[this.global.pages.LIGHTS], 
                              this.global.user_selected_best_image,
                              "");
                        for (var i = 0; i < this.global.user_selected_reference_image.length; i++)  {
                              this.setReferenceImageInTreeBox(
                                    parent, 
                                    parent.treeBox[this.global.pages.LIGHTS], 
                                    this.global.user_selected_reference_image[i][0],
                                    "",
                                    this.global.user_selected_reference_image[i][1]);
                        }
                  }
            }
      };

      var clippedPixelsLabel = this.guitools.newLabel( parent, "Clipped pixels", this.guitools.clippedPixelsToolTip);

      var setClippedPixelsButton = new ToolButton( parent );
      this.global.rootingArr.push(setClippedPixelsButton);
      setClippedPixelsButton.icon = parent.scaledResource(":/icons/clap.png");
      setClippedPixelsButton.toolTip = this.guitools.clippedPixelsToolTip;
      setClippedPixelsButton.setScaledFixedSize( 20, 20 );
      setClippedPixelsButton.onClick = () =>
      {
            this.previewControl.showClippedImage();
      };


      var buttonsSizer = new HorizontalSizer;
      this.global.rootingArr.push(buttonsSizer);
      buttonsSizer.spacing = 4;

      if (!this.global.use_preview) {
            buttonsSizer.add( blinkLabel );
            buttonsSizer.add( blinkFitButton );
            buttonsSizer.add( blinkZoomButton );
            buttonsSizer.add( blinkLeft );
            buttonsSizer.add( blinkRight );
            buttonsSizer.add( blinkUp );
            buttonsSizer.add( blinkDown );
            buttonsSizer.addSpacing( 12 );
      }

      buttonsSizer.add( currentPageLabel );
      buttonsSizer.add( currentPageCheckButton );
      buttonsSizer.add( currentPageUncheckButton );
      buttonsSizer.add( currentPageClearButton );
      buttonsSizer.add( currentPageRemoveSelectedButton );
      buttonsSizer.add( currentPageCollapseButton );
      buttonsSizer.add( currentPageExpandButton );

      buttonsSizer.addSpacing( 12 );
      buttonsSizer.add( bestImageLabel );
      buttonsSizer.add( setBestImageButton );
      buttonsSizer.add( setReferenceImageButton );
      buttonsSizer.add( clearBestImageButton );
      buttonsSizer.add( findBestImageButton );

      buttonsSizer.addSpacing( 12 );
      buttonsSizer.add( clippedPixelsLabel );
      buttonsSizer.add( setClippedPixelsButton );

      buttonsSizer.addStretch();
      if (actionSizer) {
            buttonsSizer.add( actionSizer );
      }

      return buttonsSizer;
}

getWindowBitmap(imgWin)
{
      return this.util.getWindowBitmap(imgWin);
}

newPreviewObj(parent)
{
      var newPreviewControl = new AutoIntegratePreviewControl(parent, "side", this.engine, this.util, this.global, this.ppar.preview.side_preview_width, this.ppar.preview.side_preview_height);

      this.enhancements_gui.setPreviewControl(newPreviewControl);

      var previewImageSizer = new Sizer();
      previewImageSizer.add(newPreviewControl);

      if (0) {
            var newPreviewInfoLabel = new Label( parent );
            newPreviewInfoLabel.text = "<b>Preview</b> No preview";
            newPreviewInfoLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
            newPreviewInfoLabel.useRichText = true;
      } else {
            var newPreviewInfoLabel = null;
      }

      var newStatusInfoLabel = new Label( parent );
      newStatusInfoLabel.text = "";
      newStatusInfoLabel.textAlignment = TextAlignment.VertCenter;

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

newHistogramControl(parent)
{
      if (!this.ppar.preview.show_histogram) {
            return null;
      }
      var size = this.getHistogramSize();
      var width = size.width;
      var height = size.height;

      var histogramViewControl = new Control(parent);
      histogramViewControl.scaledMinWidth = width;
      histogramViewControl.scaledMinHeight = height;

      var bitmap = new Bitmap(width, height);
      var graphics = new Graphics(bitmap);      // VectorGraphics
      this.setHistogramBitmapBackground(graphics);
      graphics.end();
      histogramViewControl.aiInfo = { histogramBitmap: bitmap, scaledValues: null, cumulativeValues: null, percentageValues: null, log_x_scale: false };
      histogramViewControl.onPaint = function(x0, y0, x1, y1) {
            var graphics = new Graphics(this);  // VectorGraphics
            graphics.antialiasing = true;
            graphics.drawBitmap(0, 0, this.aiInfo.histogramBitmap);
            graphics.end();
            if (this.aiInfo.log_x_scale) {
                  this.aiLabelLog.text = "Log";
                  this.aiLabelLog.toolTip = "<p>Logarithmic scale on X axis.</p>";
            } else {
                  this.aiLabelLog.text = "Normal";
                  this.aiLabelLog.toolTip = "<p>Normal scale on X axis.</p>";
            }
      };
      histogramViewControl.onMousePress = function(x, y, buttonState, modifiers) {
            // console.writeln("histogramViewControl.onMousePress " + x + ", " + y);
            if (x >= 0 && x < this.aiInfo.histogramBitmap.width && y >= 0 && y < this.aiInfo.histogramBitmap.height) {
                  this.aiLabelX.text = "x: " + (x / this.aiInfo.histogramBitmap.width).toFixed(4);
                  this.aiLabelX.toolTip = "<p>X coordinate value.</p>";
                  this.aiLabelY.text = "y: " + (1 - y / this.aiInfo.histogramBitmap.height).toFixed(4);
                  this.aiLabelY.toolTip = "<p>Y coordinate value.</p>";
                  if (this.aiInfo.cumulativeValues) {
                        this.aiLabelCnt.text = "Cnt: " + this.aiInfo.cumulativeValues[x];
                        this.aiLabelCnt.toolTip = "<p>Cumulative number of pixels with values less than or equal to the X coordinate value.</p>";
                        this.aiLabelPrc.text = "%: " + this.aiInfo.percentageValues[x].toFixed(4);
                        this.aiLabelPrc.toolTip = "<p>Percentage of pixels with values less than or equal to the X coordinate value.</p>";
                  }
            }
      };

      histogramViewControl.aiLabelX = this.guitools.newLabel(parent, "x:", "Click on histogram to get values");
      histogramViewControl.aiLabelY = this.guitools.newLabel(parent, "y:", "Click on histogram to get values");
      histogramViewControl.aiLabelCnt = this.guitools.newLabel(parent, "Cnt:", "Click on histogram to get values");
      histogramViewControl.aiLabelPrc = this.guitools.newLabel(parent, "%:", "Click on histogram to get values");
      histogramViewControl.aiLabelLog = this.guitools.newLabel(parent, "", "Normal scale on X axis");
      histogramViewControl.sizer = new VerticalSizer;
      histogramViewControl.sizer.margin = 6;
      histogramViewControl.sizer.spacing = 4;
      histogramViewControl.sizer.add( histogramViewControl.aiLabelX );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelY );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelCnt );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelPrc );
      histogramViewControl.sizer.add( histogramViewControl.aiLabelLog );
      histogramViewControl.sizer.addStretch();

      histogramViewControl.repaint();

      return histogramViewControl;
}

mainSizerTab(parent, sizer)
{
      var gb = new Control( parent );
      gb.sizer = new HorizontalSizer;
      gb.sizer.add( sizer );

      this.global.rootingArr.push(gb);

      return gb;
}

exitFromDialog()
{
      console.show();
      if (this.blink_window != null) {
            this.blink_window.forceClose();
            this.blink_window = null;
      }
      this.updateImageInfoLabel("");
}

updatePreviewSize(w, h, hh, sw, sh, shh)
{
      this.preview_size_changed = true;

      if (w > 0) {
            this.ppar.preview.preview_width = w;
      }
      if (h > 0) {
            this.ppar.preview.preview_height = h;
      }
      if (hh > 0) {
            this.ppar.preview.histogram_height = hh;
      }
      if (sw > 0) {
            this.ppar.preview.side_preview_width = sw;
      }
      if (sh > 0) {
            this.ppar.preview.side_preview_height = sh;
      }
      if (shh > 0) {
            this.ppar.preview.side_histogram_height = shh;
      }

      for (var i = 0; i < this.ppar.preview.preview_sizes.length; i++) {
            if (this.ppar.preview.preview_sizes[i][0] == this.screen_size) {
                  /* Found, update existing size. */
                  if (w > 0) {
                        this.ppar.preview.preview_sizes[i][1] = w;
                  }
                  if (h > 0) {
                        this.ppar.preview.preview_sizes[i][2] = h;
                  }
                  if (hh > 0) {
                        this.ppar.preview.preview_sizes[i][3] = hh;
                  } else {
                        this.ppar.preview.preview_sizes[i][3] = this.ppar.preview.histogram_height;
                  }
                  if (sw > 0) {
                        this.ppar.preview.preview_sizes[i][4] = sw;
                  } else {
                        this.ppar.preview.preview_sizes[i][4] = this.ppar.preview.side_preview_width;
                  }
                  if (sh > 0) {
                        this.ppar.preview.preview_sizes[i][5] = sh;
                  } else {
                        this.ppar.preview.preview_sizes[i][5] = this.ppar.preview.side_preview_height;
                  }
                  if (shh > 0) {
                        this.ppar.preview.preview_sizes[i][6] = shh;
                  } else {
                        this.ppar.preview.preview_sizes[i][6] = this.ppar.preview.side_histogram_height;
                  }

                  console.writeln("Update existing preview size for screen size " + this.screen_size + " to " + this.ppar.preview.preview_sizes[i][1] + ", " + this.ppar.preview.preview_sizes[i][2] + ", " + this.ppar.preview.preview_sizes[i][3]);
                  return;
            }
      }
      /* Not found, add a new one. */
      this.ppar.preview.preview_sizes[this.ppar.preview.preview_sizes.length] = [ this.screen_size, this.ppar.preview.preview_width, this.ppar.preview.preview_height, this.ppar.preview.histogram_height,  
                                                                        this.ppar.preview.side_preview_width, this.ppar.preview.side_preview_height, this.ppar.preview.side_histogram_height];
      console.writeln("Add a new preview size for screen size " + this.screen_size + " as " + this.ppar.preview.preview_sizes[i][1] + ", " + this.ppar.preview.preview_sizes[i][2] + ", " + this.ppar.preview.preview_sizes[i][3] + ", " + 
                        this.ppar.preview.preview_sizes[i][4] + ", " + this.ppar.preview.preview_sizes[i][5] + ", " + this.ppar.preview.preview_sizes[i][6]);
}

getPreviewSize()
{
      let use_old_preview_size = true;

      this.ppar.preview.preview_width = 0;
      this.ppar.preview.preview_height = 0;
      this.ppar.preview.histogram_height = 0;

      if (this.ppar.preview.preview_sizes == undefined) {
            this.ppar.preview.preview_sizes = [];
      }

      /* Try to find a saved screen size for this resolution. */
      for (var i = 0; i < this.ppar.preview.preview_sizes.length; i++) {
            if (this.ppar.preview.preview_sizes[i][0] == this.screen_size) {
                  this.ppar.preview.preview_width = this.ppar.preview.preview_sizes[i][1];
                  this.ppar.preview.preview_height = this.ppar.preview.preview_sizes[i][2];
                  if (this.ppar.preview.preview_sizes[i].length > 3) {
                        this.ppar.preview.histogram_height = this.ppar.preview.preview_sizes[i][3];
                  }
                  if (this.ppar.preview.preview_sizes[i].length > 4) {
                        this.ppar.preview.side_preview_width = this.ppar.preview.preview_sizes[i][4];
                        this.ppar.preview.side_preview_height = this.ppar.preview.preview_sizes[i][5];
                        this.ppar.preview.side_histogram_height = this.ppar.preview.preview_sizes[i][6];
                  }
            }
      }

      if (this.ppar.preview.preview_width == 0) {
            /* Preview size not set for this screen size.
             * Calculate preview size from screen size.
             * Use a small preview size as a default to ensure that it fits on screen. 
             */
            let preview_size = Math.floor(Math.min(this.screen_width * 0.25, this.screen_height * 0.25));
            preview_size = Math.min(preview_size, 400);
            this.ppar.preview.preview_width = preview_size;
            this.ppar.preview.preview_height = preview_size;
            this.ppar.preview.histogram_height = Math.floor(this.screen_height * 0.05);
            use_old_preview_size = false;
      }
      if (this.ppar.preview.histogram_height == 0) {
            /* Preview size not set for this screen size.
             * Calculate histogram height from screen size.
             * Use a small preview size as a default to ensure that it fits on screen. 
             */
            this.ppar.preview.histogram_height = Math.floor(this.screen_height * 0.05);
      }
      if (this.ppar.preview.side_preview_width == 0) {
            // Side preview size not set for this screen size.
            // Calculate side preview size from screen size.
            let preview_size = Math.floor(Math.min(this.screen_width * 0.4, this.screen_height * 0.4));
            preview_size = Math.min(preview_size, 500);
            this.ppar.preview.side_preview_width = preview_size;
            this.ppar.preview.side_preview_height = preview_size;
            this.ppar.preview.side_histogram_height = Math.floor(this.screen_height * 0.1);
      }

      return use_old_preview_size;
}

/***************************************************************************
 * 
 *    AutoIntegrateDialog
 * 
 */
AutoIntegrateDialog()
{
      var thisdialog = this;

      // Check if this is first run
      this.first_run = this.isFirstRun();
      if (this.first_run) {
            this.global.expert_mode = false;
            this.markAsRun();
            this.saveExpertMode();
      } else {
            this.global.expert_mode = this.isExpertMode();
      }

      if (this.global.debug) console.writeln("AutoIntegrateDialog: constructor");

      this.windowTitle = "AutoIntegrate";

      this.onClose = () => {
            // This fires when dialog closes by ANY method
            // Including X button, Escape key, or programmatic close
            this.exitCleanup(thisdialog);
            console.noteln("Dialog is closing");
      };

      let sz = this.util.getScreenSize(this);
      let use_restored_preview_size = true;

      this.screen_width = sz[0];
      this.screen_height = sz[1];
      this.screen_size = this.screen_width + "x" + this.screen_height;

      this.global.screen_width = this.screen_width;
      this.global.screen_height = this.screen_height;

       if (this.ppar.preview.use_preview) {
            use_restored_preview_size = this.getPreviewSize();
      }

      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      // Preview functions for enhancements tab
      this.preview_functions = {
        setPreviewIdReset: (id, keep_zoom, histogramInfo) => this.setPreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewIdReset: (id, keep_zoom, histogramInfo) => this.updatePreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewTxt: (txt) => this.updatePreviewTxt(txt),
        updatePreviewNoImage: () => this.updatePreviewNoImage(),
        createCombinedMosaicPreviewWin: (imgWinArr) => this.createCombinedMosaicPreviewWin(imgWinArr),
        updatePreviewWin: (imgWin) => this.updatePreviewWin(imgWin),
        updatePreviewWinTxt: (imgWin, txt) => this.updatePreviewWinTxt(imgWin, txt),
   };

      this.enhancements_gui = new AutoIntegrateEnhancementsGUI(
                                    this, 
                                    this.guitools, 
                                    this.util, 
                                    this.global,
                                    this.engine,
                                    this.preview_functions
                              );
      this.enhancements_gui = this.enhancements_gui;

      var comet_alignment_toolTip = 
            "<p>Below is the suggested workflow with comet processing in AutoIntegrate:</p>" +
            "<ul>" +
            "<li>Run a normal workflow to get correct stars and background objects.</li>" +
            "<li>Load star aligned *_r.xisf files as light files. Those can be found from the AutoOutput directory.</li>" + 
            "<li>Set a Window prefix to avoid overwriting files in the first step.</li>" + 
            "<li>Check <i>Comet align</i> in <i>Settings / Image processing parameters</i> section.</li>" +
            "<li>Check star removal option (StarXTerminator or StarNet2) in <i>Settings / Tools</i> section.</li>" +
            "<li>Check <i>Remove stars from lights</i> in <i>Postprocessing / Star stretching and removing</i> section.</li>" +
            "<li>Check <i>No CosmeticCorrection</i> in <i>Other / Other parameters</i> section.</li>" +
            "<li>Go to the <i>Preprocessing / CometAlignment</i> section.</li>" +
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
            "you can use an option <i>ImageIntegration use ssweight</i>. " + this.guitools.BXT_no_PSF_tip + "</p>" + 
            "<p>It is also possible to manually run the CometAlignment process. Below are the steps to use AutoIntegrate with manual comet alignment:</p>" + 
            "<ul>" + 
            "<li>Run normal workflow to get correct stars and background objects.</li>" +
            "<li>Manually run the CometAlignment on star aligned *_r.xisf files. This will create *_ca.xisf files.</li>" + 
            "<li>Remove stars from *_ca.xisf files. StarXTerminator has a batch mode that makes this easier.</li>" + 
            "<li>Load comet aligned files into AutoIntegrate as lights files.</li>" + 
            "<li>Check <i>Start from ImageIntegration</i> in <i>Other parameters</i>.</li>" +
            "<li>Use the <i>Run</i> button to process images.</li>" +
            "</ul>";

      // Run, Exit and AutoContinue buttons
      this.run_Button = this.newRunButton(this, false);
      this.exit_Button = this.newExitButton(this, false);
      this.cancel_Button = this.newCancelButton(this, false);
      this.autoContinueButton = this.newAutoContinueButton(this, false);
      this.autoContinuePrefixSizer = this.addAutoContinueWinPrefix(this);
      
      this.filesToolTip = [];
      this.filesToolTip[this.global.pages.LIGHTS] = "<p>Add light files. If only lights are added " + 
                             "they are assumed to be already calibrated.</p>" +
                             "<p>If IMAGETYP is set on images the script tries to automatically detect "+
                             "bias, dark flat and flat dark images. This can be disabled with No autodetect option.</p>";
      this.filesToolTip[this.global.pages.BIAS] = "<p>Add bias files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[this.global.pages.DARKS] = "<p>Add dark files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[this.global.pages.FLATS] = "<p>Add flat files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[this.global.pages.FLAT_DARKS] = "<p>Add flat dark image files. If only one file is added " + 
                             "it is assumed to be a master file. If flat dark files are selected " + 
                             "then master flat dark is used instead of master bias and master dark " + 
                             "is not used to calibrate flats.</p>";

      this.treeBox = [];
      this.treeBoxRootingArr = [];

      this.expertModeSizer = this.addExpertMode(this);

      var obj = this.addTargetType(this);
      this.targetTypeSizer = obj.sizer;
      this.target_type_label = obj.label;

      var obj = this.newRow2Obj(this);
      this.winprefixOutputdirSizer = obj.sizer;
      this.window_prefix_label = obj.window_prefix_label;
      this.output_dir_label = obj.output_dir_label;

      var ret = this.addFilesButtons(this);
      this.filesButtonsSizer = ret.sizer;
      this.filesButtons = ret.buttons;
      this.directoryCheckBox = ret.directoryCheckBox;

      this.tabBox = new TabBox( this );

      let newFilesTreeBox = this.filesTreeBox( this, this.lightsOptions(this), this.global.pages.LIGHTS );
      this.global.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Lights" );

      newFilesTreeBox = this.filesTreeBox( this, this.biasOptions(this), this.global.pages.BIAS );
      this.global.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Bias" );

      newFilesTreeBox = this.filesTreeBox( this, this.darksOptions(this), this.global.pages.DARKS );
      this.global.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Darks" );

      newFilesTreeBox = this.filesTreeBox( this, this.flatsOptions(this), this.global.pages.FLATS );
      this.global.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flats" );

      newFilesTreeBox = this.filesTreeBox( this, this.flatdarksOptions(this), this.global.pages.FLAT_DARKS );
      this.global.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flat Darks" );

      /* Parameters check boxes. */
      this.useLocalNormalizationCheckBox = this.guitools.newCheckBox(this, "Local Normalization", this.par.local_normalization, 
            "<p>Use local normalization data for ImageIntegration</p>" +
            "<p>For local normalization settings see section <i>Integration / LocalNormalization</i></p>");
      this.FixColumnDefectsCheckBox = this.guitools.newCheckBox(this, "Fix column defects", this.par.fix_column_defects, 
            "If checked, fix linear column defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixRowDefectsCheckBox = this.guitools.newCheckBox(this, "Fix row defects", this.par.fix_row_defects, 
            "If checked, fix linear row defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.CosmeticCorrectionCheckBox = this.guitools.newCheckBox(this, "No CosmeticCorrection", this.par.skip_cosmeticcorrection, 
            "<p>Do not run CosmeticCorrection on image files.</p>" +
            "<p>Can be useful when doing Comet align.</p>" );
      this.SubframeSelectorCheckBox = this.guitools.newCheckBox(this, "No SubframeSelector", this.par.skip_subframeselector, 
            "<p>Do not run SubframeSelector to get image weights.</p>" +
            "<p>When this option is used then the first image in the list is used as a reference image unless reference image is selected manually.</p>");
      this.CometAlignCheckBox = this.guitools.newCheckBox(this, "Comet align", this.par.comet_align, 
            "<p>If checked, run CometAlign process using settings in the <i>Preprocessing / CometAlignment settings</i> section.</p>" +
            "<p>For more details see the help icon in <i>CometAlignment settings</i> section.</p>");
      this.fastIntegrationCheckBox = this.guitools.newCheckBox(this, "Fast integration", this.par.use_fastintegration, 
            "<p>If checked, use FastIntegration process instead of ImageIntegration process when integrating light images.</p>" +
            "<p>In <i>Integration</i> tab there are some settings for FastIntegration.</p>");
      this.CalibrateOnlyCheckBox = this.guitools.newCheckBox(this, "Calibrate only", this.par.calibrate_only,
            "<p>Stop after image calibration step.</p>" +
            "<p>Stopping after calibration could be useful if you for example want to check the quality of calibrated light files " +
            "and maybe set some filtering rules.</p>" );
      this.GenerateMastersOnlyCheckBox = this.guitools.newCheckBox(this, "Generate masters only", this.par.generate_masters_only,
            "<p>Generate master calibration files (bias, dark, flat dark, flat) from calibration files without requiring light files.</p>" +
            "<p>This is useful for remote telescopes where calibration files do not change often. " +
            "Generated master files can later be reused with the Master files option to speed up light file processing.</p>" );
      this.DebayerOnlyCheckBox = this.guitools.newCheckBox(this, "Debayer only", this.par.debayer_only, 
            "<p>Stop after Debayering step. Later it is possible to continue by selecting Debayered files " + 
            "and choosing None for Debayer.</p>" );
      this.ExtractChannelsOnlyCheckBox = this.guitools.newCheckBox(this, "Extract channels only", this.par.extract_channels_only, 
            "<p>Stop after Extract channels step. Later it is possible to continue by selecting extracted files " + 
            "and run a normal mono camera (LRGB/HSO) workflow.</p>" );
      this.BinningOnlyCheckBox = this.guitools.newCheckBox(this, "Binning only", this.par.binning_only, 
            "<p>Run only binning to create smaller files.</p>" );
      this.IntegrateOnlyCheckBox = this.guitools.newCheckBox(this, "Integrate only", this.par.integrate_only, 
            "<p>Run only image integration to create integrated channel images or RGB image.</p>" +
            "<p>Stopping after integration could be useful is you for example want to set some exclusions areas " + 
            "for DBE or for finding the true background.</p>");
      this.CropInfoOnlyCheckBox = this.guitools.newCheckBox(this, "Crop info only", this.par.cropinfo_only, 
            "<p>Run only image integration on *_r.xisf files to create automatic cropping info.</p>" +
            "<p>Light file list should include all registered *_r.xisf files. The result will be LowRejectionMap_ALL.xisf file " +
            "that can be used to crop files to common area during AutoContinue.</p>" );
      this.imageWeightTestingCheckBox = this.guitools.newCheckBox(this, "Image weight testing ", this.par.image_weight_testing, 
            "<p>Run only SubframeSelector to output image weight information and outlier filtering into AutoIntegrate.log AutoWeights.json. " +
            "Json file can be loaded as input file list.</p>" +
            "<p>With this option no output image files are written.</p>" );
      this.earlyPSFCheckCheckBox = this.guitools.newCheckBox(this, "Early PSF check", this.par.early_PSF_check, 
            "<p>Checking this box will enable early PSF signal test. Then light files are filtered for PSF signal values below weight limit before any processing.</p>" +
            "<p>Weight limit is set in <i>Preprocessing / Filtering</i> section.</p>" );
      this.ChannelCombinationOnlyCheckBox = this.guitools.newCheckBox(this, "ChannelCombination only", this.par.channelcombination_only, 
            "<p>Run only channel combination to linear RGB file. No auto stretch or color calibration.</p>" );
      this.keepIntegratedImagesCheckBox = this.guitools.newCheckBox(this, "Keep integrated images", this.par.keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.resetOnSetupLoadCheckBox = this.guitools.newCheckBox(this, "Reset", this.par.reset_on_setup_load, 
            "<p>Reset parameters to default values before loading a setup.</p>" + 
            "<p>This ensures that only parameters from the setup file are set and user saved default parameters are not set.</p>" +
            "<p>Uncheck this option if you want just add parameters from the setup file to the current parameters.</p>" );
      this.keepTemporaryImagesCheckBox = this.guitools.newCheckBox(this, "Keep temporary images", this.par.keep_temporary_images, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.keepProcessedImagesCheckBox = this.guitools.newCheckBox(this, "Keep processed images", this.par.keep_processed_images, 
            "<p>Keep processed images after every step a PixInsight process is applied to them. They will have process name prefix.</p>" +
            "<p>Only images after image integration are kept. Images are not saved to disk.</p>" );
      this.debugCheckBox = this.guitools.newCheckBox(this, "Debug", this.par.debug, 
            "<p>Print some additional debug information to the log output files.</p>" );
      this.flowchartDebugCheckBox = this.guitools.newCheckBox(this, "Flowchart debug", this.par.flowchart_debug, 
            "<p>Print some additional debug information when generating this.flowchart.</p>" );
      this.printProcessValuesCheckBox = this.guitools.newCheckBox(this, "Print process values", this.par.print_process_values, 
            "<p>Print PixInsight process values to the console and to the AutoIntegrate log file.</p>" );
      this.GC_before_channel_combination_CheckBox = this.guitools.newCheckBox(this, "Gradient correction on channel images", this.par.GC_before_channel_combination, 
            "<p>Use gradient correction on channel images (L,R,G,B,H,S,O) separately before channels are combined.</p>" +
            "<p>With color/OSC images this does the same thing as <i>Gradient correction on combined images</i>.</p>" );
      this.GC_on_lights_CheckBox = this.guitools.newCheckBox(this, "Gradient correction on light images", this.par.GC_on_lights, 
            "<p>Use gradient correction on all light images. It is run very early in the processing before cosmetic correction.</p>" );
      this.use_GC_L_RGB_CheckBox = this.guitools.newCheckBox(this, "Gradient correction on combined images", this.par.use_GC_on_L_RGB, 
            "<p>Use gradient correction on L and combined RGB images while image is still in linear mode.</p>" );
      this.use_GC_L_RGB_stretched_CheckBox = this.guitools.newCheckBox(this, "Gradient correction on stretched images", this.par.use_GC_on_L_RGB_stretched, 
            "<p>Use gradient correction on L and RGB images after they have been stretched to non-linear mode.</p>" +
            "<p>Note that this option should not be used with GradientCorrection process.</p>" );
      var remove_stars_Tooltip = "<p>Choose star image stretching and combining settings from <i>Postprocessing / Star stretching and removing</i> section.</p>"
      this.RGB_stars_CheckBox = this.guitools.newCheckBox(this, "RGB stars", this.par.create_RGB_stars, 
            "<p>When both RGB and narrowband data is available, process stars image from RGB channels and " + 
            "process background image from the narrowband data. In the end of processing starless and " + 
            "stars images are combined to create a narrowband image with RGB stars.</p>" +
            "<p>This option can be used for RGB only processing but the end result is basically the same as using separate remove stars options.<p>" +
            "<p>To use this option RGB channels must be available. " +
            "If no option to remove stars is selected, stars are removed before streching.");
      this.remove_stars_before_stretch_CheckBox = this.guitools.newCheckBox(this, "Remove stars before stretch", this.par.remove_stars_before_stretch, 
            "<p>Remove stars from combined RGB or narrowband images just before stretching while it still is in the linear stage. " + 
            "Stars are used only from RGB image, stars from L image are not used. " + 
            "This needs StarXTerminator.</p>" + 
            "<p>When stars are removed before stretching then a different stretching can be used for the stars and potentially " + 
            "get better star colors.</p>" + 
            "<p>For OSC data this may not work well. Separating channels might help.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_channel_CheckBox = this.guitools.newCheckBox(this, "Remove stars from channels", this.par.remove_stars_channel, 
            "<p>With LRGB or narrowband images remove stars from L, R, G, B, H, S and O channel images separately after image integration. " + 
            "while images are still in the linear stage. Star images are then combined " +
            "to create a RGB star image. This needs StarXTerminator.</p>" +
            "<p>With color images (DSLR/OSC) remove stars after image integration while image is still in linear stage. " + 
            "This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_light_CheckBox = this.guitools.newCheckBox(this, "Remove stars from lights", this.par.remove_stars_light, 
            "<p>Remove stars from light image.</p>" + 
            "<p>Stars are removed after after star alignment.</p>" + 
            "<p>If comet alignment is chosen then stars are removed before comet align.</p>");
      this.remove_stars_stretched_CheckBox = this.guitools.newCheckBox(this, "Remove stars after stretch", this.par.remove_stars_stretched, 
            "<p>Remove stars after the image has been stretched to a non-linear state. Start from RGB image are saved and they " + 
            "can be later added back to the image. This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      this.unscreen_stars_CheckBox = this.guitools.newCheckBox(this, "Unscreen stars", this.par.unscreen_stars, this.guitools.unscreen_tooltip);
      this.solve_image_CheckBox = this.guitools.newCheckBox(this, "Solve image", this.par.solve_image, 
            "<p>Solve image by running ImageSolver script.</p>" +
            "<p>Note that if <i>Color calibration using SPCC</i> is selected image is solved automatically with checking this box.</p>" +
            "<p>If the image does not have correct coordinates or focal length embedded they can be given in <i>Postprocessing / Image solving</i> section.</p>" +
            "<p>Consider also using Drizzle with scale 1 or 2 when using SPCC.</p>");
      this.use_spcc_CheckBox = this.guitools.newCheckBox(this, "Color calibration using SPCC", this.par.use_spcc, 
            "<p>Run color calibration using SpectrophotometricColorCalibration (SPCC). This requires image solving which is done automatically on " + 
            "Integration_RGB image if it is not already done.</p>" +
            "<p>If image does not have correct coordinates or focal length embedded they can be given in <i>Postprocessing / Image solving</i> section.</p>" +
            "<p>SPCC settings can be updated at <i>Postprocessing / Color calibration</i> section.</p>");
      this.use_background_neutralization_CheckBox = this.guitools.newCheckBox(this, "Use BackgroundNeutralization", this.par.use_background_neutralization, 
            "<p>Run BackgroundNeutralization before ColorCalibration.</p>" +
            "<p>By default the script tries to automatically detect an area with a true background. If it finds one, an image with name AutoBackgroundModel is created.</p>" +
            "<p>AutoBackgroundModel image has a preview that shows the background area.<p>" + 
            "<p>If AutoBackgroundModel image already exists then the background preview coordinates from there are used. " +
            "The preview in AutoBackgroundModel image can be edited to use a different area as a background reference.</p>" + 
            "<p>Automatic background detect can be turned off using option <i>No auto background</i> in <i>Other</i> tab.</p>");
      this.batch_mode_CheckBox = this.guitools.newCheckBox(this, "Batch/mosaic mode", this.par.batch_mode, 
            "<p>Run in batch mode, continue until all selected files are processed.</p>" +
            "<p>In batch mode, just click the Run button and the script will ask for files to process before starting.</p>" +
            "<p>Batch mode is intended for processing mosaic panels. " + 
            "When batch mode completes only final image windows are left visible.</p>" +
            "<p>Final images are renamed using the subdirectory name. It is " + 
            "recommended that each part of the batch is stored in a separate directory (like for example P1, P2, etc.).</p>" +
            "<p>Batch mode works only with calibrated light images.</p>");
      this.fast_mode_CheckBox = this.guitools.newCheckBox(this, "Fast mode", this.par.fast_mode, 
            "<p>Run in fast mode where images are downsampled to a smaller size and only 10% or minimum of 3 images are used.</p>" +
            "<p>With full processing, all light and possibly calibration images are downsampled.</p>" +
            "<p>With AutoContinue, all integrated images (Integration_[LRGBHSO]) are downsampled. For other AutoContinue starting points the fast mode is ignored.</p>" +
            "<p>Fast mode can be useful to do a quick overview of processing before committing to full processing.</p>" );
      this.fast_mode_ComboBox = this.guitools.newComboBox(this, this.par.fast_mode_opt, this.fast_mode_values, "<p>S uses smaller images, M uses bigger images.</p>");
      this.autodetect_imagetyp_CheckBox = this.guitools.newCheckBox(this, "Do not use IMAGETYP keyword", this.par.skip_autodetect_imagetyp, 
            "<p>If selected do not try to autodetect calibration files based on IMAGETYP keyword.</p>" );
      this.autodetect_filter_CheckBox = this.guitools.newCheckBoxEx(this, "Do not use FILTER keyword", this.par.skip_autodetect_filter, 
            "<p>If selected do not try to autodetect light and flat files based on FILTER keyword.</p>" +
            "<p>Selecting this enables manual adding of filter files for lights and flats.</p>",
            (checked) => {
                  this.autodetect_filter_CheckBox.aiParam.val = checked;
                  this.showOrHideFilterSectionBar(this.global.LIGHTS);
                  this.showOrHideFilterSectionBar(this.global.FLATS);
                  this.showOrHideFilterSectionBar(this.global.FLAT_DARKS);
            });
      this.save_all_files_CheckBox = this.guitools.newCheckBox(this, "Save all files", this.par.save_all_files, 
            "<p>If selected save buttons will save all processed and iconized files and not just final image files. </p>" );
      this.select_all_files_CheckBox = this.guitools.newCheckBox(this, "Select all files", this.par.select_all_files, 
            "<p>If selected default file select pattern is all files (*.*) and not image files.</p>" );
      this.no_subdirs_CheckBox = this.guitools.newCheckBoxEx(this, "No subdirectories", this.par.no_subdirs, 
            "<p>If selected output files are not written into subdirectories</p>",
            (checked) => {
                  this.no_subdirs_CheckBox.aiParam.val = checked;
                  if (this.no_subdirs_CheckBox.aiParam.val) {
                        this.util.clearDefaultDirs();
                  } else {
                        this.util.setDefaultDirs();
                  }
            });
      this.create_process_icons_CheckBox = this.guitools.newCheckBox(this, "Create process icons", this.par.create_process_icons, 
            "<p>If selected process icons will be created for all processing steps.</p>" );
      this.use_drizzle_CheckBox = this.guitools.newCheckBox(this, "Drizzle, scale", this.par.use_drizzle, 
            "<p>Use Drizzle integration</p>" +
            "<p>Drizzle scale 1 does not change the image size but may help with fine details like stars in the image.</p>" +
            "<p>Drizzle scale 2 doubles the image resolution and may help with small details in the image.</p>" +
            "<p>Consider using drizzle when selecting SPCC for color calibration.</p>" +
            "<p>For Drizzle settings see <i>Integration / Drizzle</i> section.</p>");
      this.drizzle_scale_SpinBox = this.guitools.newSpinBox(this, this.par.drizzle_scale, 1, 10, this.use_drizzle_CheckBox.toolTip);

      this.drizzleSizer = new HorizontalSizer;
      this.drizzleSizer.spacing = 2;
      this.drizzleSizer.add( this.use_drizzle_CheckBox );
      this.drizzleSizer.add( this.drizzle_scale_SpinBox );
      this.drizzleSizer.addStretch();

      this.imageintegration_ssweight_CheckBox = this.guitools.newCheckBox(this, "ImageIntegration use ssweight", this.par.use_imageintegration_ssweight, 
            "<p>Use SSWEIGHT weight keyword during ImageIntegration.</p>" );
      this.imageintegration_clipping_CheckBox = this.guitools.newCheckBox(this, "No ImageIntegration clipping", this.par.skip_imageintegration_clipping, 
            "<p>Do not use clipping in ImageIntegration</p>" );
      this.crop_to_common_area_CheckBox = this.guitools.newCheckBox(this, "Crop to common area", this.par.crop_to_common_area, 
            "<p>Crop all channels to area covered by all images</p>" );
      this.RRGB_image_CheckBox = this.guitools.newCheckBox(this, "RRGB image", this.par.RRGB_image, 
            "<p>RRGB image using R as Luminance.</p>" );
      this.synthetic_l_image_CheckBox = this.guitools.newCheckBox(this, "Synthetic L image", this.par.synthetic_l_image, 
            "<p>Create synthetic L image from all light images.</p>" );
      this.synthetic_missing_images_CheckBox = this.guitools.newCheckBox(this, "Synthetic missing image", this.par.synthetic_missing_images, 
            "<p>Create synthetic image for any missing image.</p>" );
      this.force_file_name_filter_CheckBox = this.guitools.newCheckBox(this, "Use file name for filters", this.par.force_file_name_filter, 
            "<p>Use file name for recognizing filters and ignore FILTER keyword.</p>" );
      this.unique_file_names_CheckBox = this.guitools.newCheckBox(this, "Use unique file names", this.par.unique_file_names, 
            "<p>Use unique file names by adding a timestamp when saving to disk.</p>" );
      this.skip_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "No noise reduction", this.par.skip_noise_reduction, 
            "<p>Do not use noise reduction. This option disables all noise reduction regardless of what other noise reduction settings are selected.</p>" + 
            "<p>More fine grained noise reduction settings can be found in the <i>Postprocessing / Noise reduction</i> section.</p>" );
      this.skip_star_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "No star noise reduction", this.par.skip_star_noise_reduction, 
            "<p>Do not use star noise reduction. Star noise reduction is used when stars are removed from image.</p>" );
      this.no_mask_contrast_CheckBox = this.guitools.newCheckBox(this, "No added contrast on mask", this.par.skip_mask_contrast, 
            "<p>Do not add contrast on automatically created luminance mask.</p>" );
      this.no_sharpening_CheckBox = this.guitools.newCheckBox(this, "No sharpening", this.par.skip_sharpening, 
            "<p>Do not use sharpening on the image. Sharpening uses a luminance and star mask to target light parts of the image.</p>" );
      this.forceNewMask_CheckBox = this.guitools.newCheckBox(this, "New mask", this.par.force_new_mask, 
            "<p>Do not use an existing mask but always create a new mask.</p>");
      this.no_SCNR_CheckBox = this.guitools.newCheckBox(this, "No SCNR", this.par.skip_SCNR, 
            "<p>Do not use SCNR to remove green cast.</p>"  +
            "<p>SCNR is automatically skipped when processing narrowband images.</p>" +
            "<p>Skipping SCNR can be useful when processing for example comet images.</p>");
      this.skip_color_calibration_CheckBox = this.guitools.newCheckBox(this, "No color calibration", this.par.skip_color_calibration, 
            "<p>Do not run color calibration. Color calibration is run by default on RGB data.</p>" );
      this.skip_auto_background_CheckBox = this.guitools.newCheckBox(this, "No auto background", this.par.skip_auto_background, 
            "<p>Do not try to find background area.</p>" );

      this.win_prefix_to_log_files_CheckBox = this.guitools.newCheckBox(this, "Add window prefix to log files", this.par.win_prefix_to_log_files, 
            "<p>Add window prefix to AutoIntegrate.log and AutoContinue.log files.</p>" );
      this.start_from_imageintegration_CheckBox = this.guitools.newCheckBox(this, "Start from ImageIntegration", this.par.start_from_imageintegration, 
            "<p>Start processing from ImageIntegration. File list should include star aligned files (*_r.xisf).</p>" +
            "<p>This option can be useful for testing different processing like Local Normalization or Drizzle " + 
            "(if Generate .xdrz files is selected). This is also useful if there is a need to manually remove " + 
            "bad files after alignment.</p>" +
            "<p>This option is also useful when doing comet alignment. Then input files should be comet aligned *_ca.xisf files.</p>" +
            "<p>If filter type is not included in the file keywords it cannot be detected from the file name. In that case " + 
            "filter files must be added manually to the file list.</p>" );
      this.save_processed_channel_images_CheckBox = this.guitools.newCheckBox(this, "Save processed channel images", this.par.save_processed_channel_images,
            "<p>For mono RGB images, channel images are saved before channel combination.</p>" +
            "<p>For mono narrowband images, channel images are saved before RGB mapping.</p>");
      this.save_stretched_starless_channel_images_CheckBox = this.guitools.newCheckBox(this, "Save stretched starless channel images", this.par.save_stretched_starless_channel_images,
            "<p>Save stretched starless channel images. Images are saved as .xisf and .tif files.</p>" +
            "<p>These can be used for example for narrowband color mapping in Photoshop. For a great example see " + 
            "Utah Desert Remote Observatories YouTube channel.</p>" +
            "<p>For mono RGB images, channel images are saved before channel combination.</p>" +
            "<p>For mono narrowband images, channel images are saved before RGB mapping.</p>" +
            "<p>For OSC/color images, channel images are extracted and saved before stretching.</p>" +
            "<p>When using this options is is often useful to select <i>Gradient correction on channel images</i> in <i>Settings</i> tab, " + 
            "Noise reduction on <i>Channel image</i> in <i>Postprocessing</i> tab and BlurXTerminator option <i>Correct only on channel images</i> in <i>Postprocessing</i> tab.</p>");
      this.stretched_channel_auto_contrast_CheckBox = this.guitools.newCheckBox(this, "Auto contrast on channel images", this.par.stretched_channel_auto_contrast, 
            "<p>Run auto contrast on stretched channel images.</p>");
      this.generate_xdrz_CheckBox = this.guitools.newCheckBox(this, "Generate .xdrz files", this.par.generate_xdrz, 
            "<p>Generate .xdrz files even if Drizzle integration is not used. It is useful if you want to try Drizzle " + 
            "integration later with Start from ImageIntegration option.</p>" );
      if (!this.global.use_preview) {
            this.par.skip_blink.used = false;  // Special case with no preiew.
            this.blink_checkbox = this.guitools.newCheckBoxEx(this, "No blink", this.par.skip_blink, "<p>Disable blinking of files.</p>");
            var blink_checkbox = this.blink_checkbox;
            this.blink_checkbox.onClick = (checked) => { 
                  blink_checkbox.aiParam.val = checked;
                  if (blink_checkbox.aiParam.val) {
                        if (this.blink_window != null) {
                              this.blink_window.forceClose();
                              this.blink_window = null;
                        }
                  }
            };
      }
      this.StartWithEmptyWindowPrefixBox = this.guitools.newCheckBox(this, "Start with empty window prefix", this.par.start_with_empty_window_prefix, 
            "<p>Start the script with empty window prefix</p>" );
      this.ManualIconColumnBox = this.guitools.newCheckBox(this, "Manual icon column control", this.par.use_manual_icon_column, 
            "<p>Enable manual control of icon columns. Useful for example when using multiple Workspaces.</p>" +
            "<p>When this option is enabled the control for icon column is in the <i>Interface / Interface settings</i> section.</p>" +
            "<p>This setting is effective only after restart of the script.</p>" );
      this.AutoSaveSetupBox = this.guitools.newCheckBox(this, "Autosave setup", this.par.autosave_setup, 
            "<p>Save setup after successful processing into AutosaveSetup.json file. Autosave is done only after the Run command, " + 
            "it is not done after the AutoContinue command.</p>" +
            "<p>File is saved to the lights file directory, or to the user given output directory.</p>" +
            "<p>Setup can be later loaded into AutoIntegrate to see the settings or run the setup again possibly with different options.</p>");
      this.UseProcessedFilesBox = this.guitools.newCheckBox(this, "Use processed files", this.par.use_processed_files, 
            "<p>When possible use already processed files. This option can be useful when adding files to an already processed set of files. " +
            "Only files generated before image integration are reused.</p>" +
            "<p>Option works best with a Json setup file that is saved after processing or with Autosave generated AutosaveSetup.json file because " + 
            "then star alignment reference image and possible defect info is saved.</p>" +
            "<p>With image calibration it is possible to use previously generated master files by adding already processed master files " +
            "into calibration file lists. If only one calibration file is present then the script automatically uses it as a master file.</p>");
      this.saveCroppedImagesBox = this.guitools.newCheckBox(this, "Save cropped images", this.par.save_cropped_images, "Save cropped image files with _crop postfix.");

      // Image parameters set 1.
      this.imageParamsSet1_left = new VerticalSizer;
      this.imageParamsSet1_left.margin = 6;
      this.imageParamsSet1_left.spacing = 4;
      this.imageParamsSet1_left.add( this.CalibrateOnlyCheckBox );
      this.imageParamsSet1_left.add( this.GenerateMastersOnlyCheckBox );
      this.imageParamsSet1_left.add( this.IntegrateOnlyCheckBox );
      this.imageParamsSet1_left.add( this.FixColumnDefectsCheckBox );
      this.imageParamsSet1_left.add( this.FixRowDefectsCheckBox );
      this.imageParamsSet1_left.add( this.CometAlignCheckBox );

      this.imageParamsSet1_right = new VerticalSizer;
      this.imageParamsSet1_right.margin = 6;
      this.imageParamsSet1_right.spacing = 4;
      this.imageParamsSet1_right.add( this.crop_to_common_area_CheckBox );
      this.imageParamsSet1_right.add( this.imageintegration_ssweight_CheckBox );
      this.imageParamsSet1_right.add( this.fastIntegrationCheckBox );
      this.imageParamsSet1_right.add( this.useLocalNormalizationCheckBox );
      this.imageParamsSet1_right.add( this.drizzleSizer );

      this.imageParamsSet1Label = this.guitools.newSectionLabel( this, "Preprocessing" );
      this.imageParamsSet1 = new HorizontalSizer;
      this.imageParamsSet1.margin = 6;
      this.imageParamsSet1.spacing = 4;
      this.imageParamsSet1.add( this.imageParamsSet1_left );
      this.imageParamsSet1.add( this.imageParamsSet1_right );
      this.imageParamsSet1.addStretch();

      // Image parameters set 2.

      this.imageParamsSet2_left = new VerticalSizer;
      this.imageParamsSet2_left.margin = 6;
      this.imageParamsSet2_left.spacing = 4;
      this.imageParamsSet2_left.add( this.GC_before_channel_combination_CheckBox );
      this.imageParamsSet2_left.add( this.use_GC_L_RGB_CheckBox );
      this.imageParamsSet2_left.add( this.use_GC_L_RGB_stretched_CheckBox );

      this.imageParamsSet2_right = new VerticalSizer;
      this.imageParamsSet2_right.margin = 6;
      this.imageParamsSet2_right.spacing = 4;
      this.imageParamsSet2_right.add( this.use_background_neutralization_CheckBox );
      this.imageParamsSet2_right.add( this.use_spcc_CheckBox );

      this.imageParamsSet2Label = this.guitools.newSectionLabel( this, "Postprocessing" );
      this.imageParamsSet2 = new HorizontalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.imageParamsSet2_left );
      this.imageParamsSet2.add( this.imageParamsSet2_right );
      this.imageParamsSet2.addStretch();

      //
      // Stretching choice
      //

      this.imageParamsControlSubSizer = this.guitools.newVerticalSizer(0, true, [ this.imageParamsSet1Label, this.imageParamsSet1, this.imageParamsSet2Label, this.imageParamsSet2 ]);

      this.stretchingSizer = this.guitools.createStrechingChoiceSizer(this,  this.updateParameterDependencies);

      // Image group this.par.
      this.imageParamsControl = new Control( this );
      this.imageParamsControl.sizer = new VerticalSizer;
      this.imageParamsControl.sizer.margin = 6;
      this.imageParamsControl.sizer.spacing = 4;
      this.imageParamsControl.sizer.add( this.imageParamsControlSubSizer );
      this.imageParamsControl.sizer.add( this.stretchingSizer );
      this.imageParamsControl.visible = true;
      this.imageParamsControl.sizer.addStretch();

      this.fastModeSizer = new HorizontalSizer;
      this.fastModeSizer.margin = 6;
      this.fastModeSizer.spacing = 4;
      this.fastModeSizer.add( this.fast_mode_CheckBox );
      this.fastModeSizer.add( this.fast_mode_ComboBox );
      this.fastModeSizer.addStretch();

      // Image tools other.
      this.imageToolsOtherSet1 = new VerticalSizer;
      this.imageToolsOtherSet1.margin = 6;
      this.imageToolsOtherSet1.spacing = 4;
      this.imageToolsOtherSet1.add( this.batch_mode_CheckBox );
      this.imageToolsOtherSet1.add( this.solve_image_CheckBox );

      this.imageToolsOtherSet2 = new VerticalSizer;
      this.imageToolsOtherSet2.margin = 6;
      this.imageToolsOtherSet2.spacing = 4;
      this.imageToolsOtherSet2.add( this.fast_mode_CheckBox );
      this.imageToolsOtherSet2.add( this.fast_mode_ComboBox );

      this.imageToolsOtherSet2 = new VerticalSizer;
      this.imageToolsOtherSet2.margin = 6;
      this.imageToolsOtherSet2.spacing = 4;
      this.imageToolsOtherSet2.add( this.fastModeSizer );

      this.imageToolsOtherControl = new Control( this );
      this.imageToolsOtherControl.sizer = new HorizontalSizer;
      this.imageToolsOtherControl.sizer.margin = 6;
      this.imageToolsOtherControl.sizer.spacing = 4;
      this.imageToolsOtherControl.sizer.add( this.imageToolsOtherSet1 );
      this.imageToolsOtherControl.sizer.add( this.imageToolsOtherSet2 );
      this.imageToolsOtherControl.visible = false;
      this.imageToolsOtherControl.sizer.addStretch();

      // Other parameters set 0.
      this.otherParamsSet01 = new VerticalSizer;
      this.otherParamsSet01.margin = 6;
      this.otherParamsSet01.spacing = 4;
      this.otherParamsSet01.add( this.CosmeticCorrectionCheckBox );
      this.otherParamsSet01.add( this.SubframeSelectorCheckBox );
      this.otherParamsSet01.add( this.imageintegration_clipping_CheckBox );
      this.otherParamsSet01.add( this.forceNewMask_CheckBox );
      this.otherParamsSet01.add( this.no_mask_contrast_CheckBox );
      this.otherParamsSet01.add( this.no_SCNR_CheckBox );

      this.otherParamsSet02 = new VerticalSizer;
      this.otherParamsSet02.margin = 6;
      this.otherParamsSet02.spacing = 4;
      this.otherParamsSet02.add( this.no_sharpening_CheckBox );
      this.otherParamsSet02.add( this.skip_noise_reduction_CheckBox );
      this.otherParamsSet02.add( this.skip_star_noise_reduction_CheckBox );
      this.otherParamsSet02.add( this.skip_color_calibration_CheckBox );
      this.otherParamsSet02.add( this.skip_auto_background_CheckBox );
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
      this.otherParamsSet11.add( this.DebayerOnlyCheckBox );
      this.otherParamsSet11.add( this.BinningOnlyCheckBox );
      this.otherParamsSet11.add( this.ExtractChannelsOnlyCheckBox );
      this.otherParamsSet11.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet11.add( this.CropInfoOnlyCheckBox );
      this.otherParamsSet11.add( this.imageWeightTestingCheckBox );
      this.otherParamsSet11.add( this.earlyPSFCheckCheckBox );
      this.otherParamsSet11.add( this.start_from_imageintegration_CheckBox );
      this.otherParamsSet11.add( this.save_processed_channel_images_CheckBox );

      this.otherParamsSet121 = new HorizontalSizer;
      this.otherParamsSet121.addSpacing( 20 );
      this.otherParamsSet121.add( this.stretched_channel_auto_contrast_CheckBox );

      this.otherParamsSet12 = new VerticalSizer;
      this.otherParamsSet12.margin = 6;
      this.otherParamsSet12.spacing = 4;
      this.otherParamsSet12.add( this.save_stretched_starless_channel_images_CheckBox );
      this.otherParamsSet12.add( this.otherParamsSet121 );
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
      this.systemParamsSet1.add( this.create_process_icons_CheckBox );

      this.systemParamsSet2 = new VerticalSizer;
      this.systemParamsSet2.margin = 6;
      this.systemParamsSet2.spacing = 4;
      if (!this.global.use_preview) {
            this.systemParamsSet2.add( this.blink_checkbox );
      }
      this.systemParamsSet2.add( this.StartWithEmptyWindowPrefixBox );
      this.systemParamsSet2.add( this.ManualIconColumnBox );
      this.systemParamsSet2.add( this.AutoSaveSetupBox );
      this.systemParamsSet2.add( this.UseProcessedFilesBox );
      this.systemParamsSet2.add( this.saveCroppedImagesBox );

      this.systemParamsSet = new HorizontalSizer;
      this.systemParamsSet.margin = 6;
      this.systemParamsSet.spacing = 4;
      this.systemParamsSet.add( this.systemParamsSet1 );
      this.systemParamsSet.add( this.systemParamsSet2 );

      // Other Group this.par.
      this.otherParamsControl = new Control( this );
      this.otherParamsControl.sizer = new VerticalSizer;
      this.otherParamsControl.sizer.margin = 6;
      this.otherParamsControl.sizer.spacing = 4;
      this.otherParamsControl.sizer.add( this.guitools.newLabel(this, "Additional processing options", null, true) );
      this.otherParamsControl.sizer.add( this.otherParamsSet0 );
      this.otherParamsControl.sizer.add( this.guitools.newLabel(this, "Special processing", null, true) );
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

       // Create labels and edit controls for each filter
      this.createAstrobinInput = (parent, filterName, labelText, edit_par) => {
            var toolTip = "<p>Astrobin filter configuration for " + filterName + " filter.</p>" +
                          "<p>Give Astrobin filter number to be used in AstrobinInfo.csv file.</p>";
            var label = this.guitools.newLabel(parent, labelText, toolTip);
            label.minWidth = 30;
            var edit = this.guitools.newTextEdit(parent, edit_par, toolTip);
            edit.minWidth = 20;
            return {
                  label: label,
                  edit: edit,
                  toolTip: toolTip
            };
      };
      
      // Create all filter inputs
      this.astrobinLabel = this.guitools.newSectionLabel(this, "Astrobin filter configuration");
      this.astrobinLabel.toolTip = "<p>Astrobin filter configuration is used to set filter numbers for AstrobinInfo.csv file.</p>";
      this.luminanceInput = this.createAstrobinInput(this, "L", "Luminance (L)", this.par.astrobin_L);
      this.redInput = this.createAstrobinInput(this, "R", "Red (R)", this.par.astrobin_R);
      this.greenInput = this.createAstrobinInput(this, "G", "Green (G)", this.par.astrobin_G);
      this.blueInput = this.createAstrobinInput(this, "B", "Blue (B)", this.par.astrobin_B);
      this.hydrogenInput = this.createAstrobinInput(this, "H", "Hydrogen Alpha (H)", this.par.astrobin_H);
      this.sulfurInput = this.createAstrobinInput(this, "S", "Sulfur II (S)", this.par.astrobin_S);
      this.oxygenInput = this.createAstrobinInput(this, "O", "Oxygen III (O)", this.par.astrobin_O);
      this.oscInput = this.createAstrobinInput(this, "C", "OSC/Color (C)", this.par.astrobin_C);

      this.astrobinSizer1 = this.guitools.newHorizontalSizer(6, true, [
            this.luminanceInput.label, this.luminanceInput.edit ]);
      this.astrobinSizer2 = this.guitools.newHorizontalSizer(6, true, [
            this.redInput.label, this.redInput.edit,
            this.greenInput.label, this.greenInput.edit,
            this.blueInput.label, this.blueInput.edit ]);
      this.astrobinSizer3 = this.guitools.newHorizontalSizer(6, true, [
            this.hydrogenInput.label, this.hydrogenInput.edit,
            this.sulfurInput.label, this.sulfurInput.edit,
            this.oxygenInput.label, this.oxygenInput.edit ]);
      this.astrobinSizer4 = this.guitools.newHorizontalSizer(6, true, [
            this.oscInput.label, this.oscInput.edit ]);

      this.astrobinControl = new Control( this );
      this.astrobinControl.sizer = new VerticalSizer;
      this.astrobinControl.sizer.margin = 6;
      this.astrobinControl.sizer.spacing = 4;
      this.astrobinControl.sizer.add( this.astrobinLabel );
      this.astrobinControl.sizer.add( this.astrobinSizer1 );
      this.astrobinControl.sizer.add( this.astrobinSizer2 );
      this.astrobinControl.sizer.add( this.astrobinSizer3 );
      this.astrobinControl.sizer.add( this.astrobinSizer4 );
      this.astrobinControl.visible = false;

      // LRGBCombination selection
      this.LRGBCombinationLinearFitCheckBox = this.guitools.newCheckBox(this, "Linear fit", this.par.LRGBCombination_linearfit,
            "<p>Do linear fit on luminance using RGB as a reference before LRGBCombination process.</p>");
      this.LRGBCombinationLightnessControl = this.guitools.newNumericEdit(this, "Lightness", this.par.LRGBCombination_lightness, 0, 1, 
            "<p>LRGBCombination lightness setting. A smaller value gives a brighter image. Usually should be left to the default value.</p>");
      this.LRGBCombinationSaturationControl = this.guitools.newNumericEdit(this, "Saturation", this.par.LRGBCombination_saturation, 0, 1, 
            "<p>LRGBCombination saturation setting. A smaller value gives a more saturated image. Usually should be left to the default value.</p>");

      this.LRGBCombinationGroupBoxLabel = this.guitools.newSectionLabel(this, "LRGBCombination settings");
      this.LRGBCombinationGroupBoxLabel.toolTip = 
            "<p>LRGBCombination settings can be used to fine tune the image. For relatively small " +
            "and bright objects like galaxies it may be useful to reduce brightness and increase saturation.</p>";
      this.LRGBCombinationSizer = this.guitools.newHorizontalSizer(6, true, [this.LRGBCombinationLinearFitCheckBox, this.LRGBCombinationLightnessControl, this.LRGBCombinationSaturationControl] );

      // StarAlignment selection
      var starAlignmentValuesToolTip = "<p>If the star aligment fails you can try to change values. Here is one suggestion of values that might help:<br>" +
                                       "- Sensitivity: 0.70<br>" + 
                                       "- Noise reduction<br>" + 
                                       "If you have very bad distortion then also increasing maximum distortion can help.</p>";
      this.sensitivityStarAlignmentControl = this.guitools.newNumericEdit(this, "Sensitivity", this.par.staralignment_sensitivity, 0, 1, 
            "<p>Sensitivity setting. Bigger value will detect fainter stars.</p>" + starAlignmentValuesToolTip);
      this.maxStarDistortionStarAlignmentControl = this.guitools.newNumericEdit(this, "Maximum distortion", this.par.staralignment_maxstarsdistortion, 0, 1, 
            "<p>Maximum star distortion setting. Bigger value will detect more irregular stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentLabel = this.guitools.newLabel(this, "Structure layers", "<p>Structure layers setting. Bigger value will detect more stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentControl = this.guitools.newSpinBox(this, this.par.staralignment_structurelayers, 1, 8, this.structureLayersStarAlignmentLabel.toolTip);
      this.noiseReductionFilterRadiusStarAlignmentLabel = this.guitools.newLabel(this, "Noise reduction", "<p>Noise reduction filter radius layers setting. Bigger value can help with very noisy images.</p>" + starAlignmentValuesToolTip);
      this.noiseReductionFilterRadiusStarAlignmentControl = this.guitools.newSpinBox(this, this.par.staralignment_noisereductionfilterradius, 0, 50, this.noiseReductionFilterRadiusStarAlignmentLabel.toolTip);

      this.StarAlignmentGroupBoxLabel = this.guitools.newSectionLabel(this, "StarAlignment settings");
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

      this.cometAlignmentGroupBoxLabel = this.guitools.newSectionLabel(this, "CometAlignment settings");
      this.cometAlignmentGroupBoxLabel.toolTip = 
            "<p>CometAlignment settings can be used to set values for comet alignment process.</p>" +
            comet_alignment_toolTip;

      var cometFirstImageAction = () => {
            if (this.engine.firstDateFileInfo == null) {
                  console.criticalln("No first image.");
            } else {
                  this.updatePreviewFilename(this.engine.firstDateFileInfo.name, true);
            }
      }
      var cometLastImageAction = () => {
            if (this.engine.lastDateFileInfo == null) {
                  console.criticalln("No last image.");
            } else {
                  this.updatePreviewFilename(this.engine.lastDateFileInfo.name, true);
            }
      }

      this.cometAlignFirstLabel = this.guitools.newLabel(this, "First image X₀,Y₀:", "<p>Coordinates for the first comet image.</p>" + comet_alignment_toolTip);
      this.cometAlignFirstXY = this.guitools.newTextEdit(this, this.par.comet_first_xy, this.cometAlignFirstLabel.toolTip);
      this.cometAlignFirstXYButton = this.guitools.newPushOrToolButton(this, null, "Preview", "<p>Show the first comet image in the preview tab.</p>" + comet_alignment_toolTip, cometFirstImageAction, false);
      this.cometAlignLastLabel = this.guitools.newLabel(this, "Last image X₁,Y₁:", "<p>Coordinates for the last comet image.</p>" + comet_alignment_toolTip);
      this.cometAlignLastXY = this.guitools.newTextEdit(this, this.par.comet_last_xy, this.cometAlignLastLabel.toolTip);
      this.cometAlignLastXYButton = this.guitools.newPushOrToolButton(this, null, "Preview", "<p>Show the last image in the preview tab.</p>" + comet_alignment_toolTip, cometLastImageAction, false);

      this.cometAlignHelpTips = new ToolButton( this );
      this.cometAlignHelpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.cometAlignHelpTips.setScaledFixedSize( 20, 20 );
      this.cometAlignHelpTips.toolTip = comet_alignment_toolTip;
      var cometAlignHelpTips = this.cometAlignHelpTips;
      this.cometAlignHelpTips.onClick = () =>
      {
            new MessageBox(comet_alignment_toolTip, "Comet alignment", StdIcon.Information ).execute();
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
      this.linearSaturationLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.linearSaturationLabel.toolTip = "<p>Saturation increase in linear state using a mask.</p>";
      this.linearSaturationSpinBox = this.guitools.newSpinBox(this, this.par.linear_increase_saturation, 0, 10, this.linearSaturationLabel.toolTip);

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.nonLinearSaturationLabel.toolTip = "<p>Saturation increase in non-linear state using a mask.</p>";
      this.nonLinearSaturationSpinBox = this.guitools.newSpinBox(this, this.par.non_linear_increase_saturation, 0, 10, this.nonLinearSaturationLabel.toolTip);

      this.use_chrominance_CheckBox = this.guitools.newCheckBox(this, "Use chrominance", this.par.use_chrominance,
            "<p>Use chrominance instead of saturation to boost colors.</p>");

      this.saturationGroupBoxLabel = this.guitools.newSectionLabel(this, "Saturation setting");
      this.saturationGroupBoxSizer = new HorizontalSizer;
      this.saturationGroupBoxSizer.margin = 6;
      this.saturationGroupBoxSizer.spacing = 4;
      this.saturationGroupBoxSizer.add( this.linearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.linearSaturationSpinBox );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationSpinBox );
      this.saturationGroupBoxSizer.add( this.use_chrominance_CheckBox );
      this.saturationGroupBoxSizer.addStretch();

      // Noise reduction
      var noiseReductionStregthToolTip = "<p>With MultiscaleLinerTransform the strength between 3 and 5 is the number of layers used to reduce noise. " + 
                                         "Strength values 1 and 2 are very mild three layer noise reductions and strength 6 is very aggressive five layer noise reduction.</p>";

      this.noiseReductionStrengthLabel = new Label( this );
      this.noiseReductionStrengthLabel.text = "Noise reduction";
      this.noiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for color channel (R,G,B,H,S,O) or color images.</p>" + noiseReductionStregthToolTip;
      this.noiseReductionStrengthLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
      this.noiseReductionStrengthComboBox = this.guitools.newComboBoxStrvalsToInt(this, this.par.noise_reduction_strength, this.noise_reduction_strength_values, this.noiseReductionStrengthLabel.toolTip);

      this.luminanceNoiseReductionStrengthLabel = new Label( this );
      this.luminanceNoiseReductionStrengthLabel.text = "Luminance noise reduction";
      this.luminanceNoiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for luminance image.</p>" + noiseReductionStregthToolTip;
      this.luminanceNoiseReductionStrengthLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
      this.luminanceNoiseReductionStrengthComboBox = this.guitools.newComboBoxStrvalsToInt(this, this.par.luminance_noise_reduction_strength, this.noise_reduction_strength_values, this.luminanceNoiseReductionStrengthLabel.toolTip);

      this.noise_reduction_checkbox_label = this.guitools.newLabel(this, "Noise reduction on", 
                                                "Select when noise reduction is done. Multiple options can be selected. " +
                                                "When using BlurXTerminator it is recommended to use Combined image noise reduction.");
      this.auto_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Auto", this.par.auto_noise_reduction,
            "<p>Select automatically correct time for noise reduction.</p>" + 
            "<p>If BlurXTerminator is used, then processed linear image noise reduction is used. Otherwise " + 
            "channel noise reduction is used except for OSC/color images where processed linear image is used.</p>");
      this.channel_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Channel image", this.par.channel_noise_reduction,
            "<p>Do noise reduction on each color channels and luminance image separately.</p>" + 
            "<p>This option does nothing with color/OSC images.</p>");
      this.integrated_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Combined image", this.par.combined_image_noise_reduction,
            "<p>Do noise reduction on combined image. Image can be from channel combination or from integrated color/OSC image.</p>" +
            "<p>On L image noise reduction is done before processing which is the same as channel noise reduction.</p>");
      this.processed_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Processed linear image", this.par.processed_image_noise_reduction,
            "<p>Do noise reduction on processed RGB image and possible luminance image in linear stage.</p>");
      this.non_linear_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Non-linear image", this.par.non_linear_noise_reduction, 
            "<p>Do noise reduction in non-linear state after stretching on combined and luminance images.</p>" );
      this.color_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Color noise reduction", this.par.use_color_noise_reduction, 
            "<p>Do color noise reduction using TGVDenoise.</p>" );

      this.ACDNR_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "ACDNR noise reduction,", this.par.use_ACDNR_noise_reduction, 
            "<p>Runs ACDNR noise reduction.</p>" );
      this.ACDNR_noise_reduction_Control = this.guitools.newNumericEdit(this, "StdDev", this.par.ACDNR_noise_reduction, 0, 5, 
            "<p>If non-zero, sets StdDev value and runs ACDNR noise reduction.</p>" +
            this.guitools.ACDNR_StdDev_tooltip);

      // Generic noise reduction settings
      //
      this.noiseReductionGroupBoxSizer11 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer11.spacing = 4;
      this.noiseReductionGroupBoxSizer11.margin = 2;
      this.noiseReductionGroupBoxSizer11.add( this.noise_reduction_checkbox_label );
      this.noiseReductionGroupBoxSizer11.add( this.auto_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.channel_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.integrated_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.processed_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.add( this.non_linear_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer11.addStretch();

      this.noiseReductionGroupBoxSizer12 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer12.spacing = 4;
      this.noiseReductionGroupBoxSizer12.margin = 2;
      this.noiseReductionGroupBoxSizer12.add( this.color_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer12.add( this.ACDNR_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer12.add( this.ACDNR_noise_reduction_Control );
      this.noiseReductionGroupBoxSizer12.addStretch();

      this.noiseReductionGroupBoxLabel1 = this.guitools.newSectionLabel(this, "Generic noise reduction settings");
      this.noiseReductionGroupBoxSizer1 = new VerticalSizer;
      this.noiseReductionGroupBoxSizer1.margin = 6;
      this.noiseReductionGroupBoxSizer1.spacing = 4;
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionGroupBoxSizer11 );
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionGroupBoxSizer12 );
      this.noiseReductionGroupBoxSizer1.addStretch();

      // MultiscaleLinearTransform noise reduction settings
      //
      this.noiseReductionGroupBoxLabel2 = this.guitools.newSectionLabel(this, "MultiscaleLinearTransform noise reduction settings");
      this.noiseReductionGroupBoxSizer2 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer2.margin = 6;
      this.noiseReductionGroupBoxSizer2.spacing = 4;
      this.noiseReductionGroupBoxSizer2.add( this.noiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer2.add( this.noiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer2.add( this.luminanceNoiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer2.add( this.luminanceNoiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer2.addStretch();

      // NoiseXTerminator noise reduction settings
      //

      this.noisexterminatorDenoiseEdit = this.guitools.newNumericEdit(this, "Denoise", this.par.nxt_denoise, 0, 1, "<p>Amount of noise reduction.</p><p>Depending on options: Denoise, Denoise intensity, Denoise HF or Denoise HF Intensity.</p>");
      this.noisexterminatorIterationsEdit = this.guitools.newNumericEditPrecision(this, "Iterations", this.par.nxt_iterations, 1, 5, "Number of iterations for noise reduction.", 0);

      this.noisexterminatorColorSeparationCheckBox = this.guitools.newCheckBox(this, "Intensity/color separation", this.par.nxt_enable_color_separation, "<p>Depending on options: Denoise Color or Denoise HF Color</p>");
      this.noisexterminatorColorSeparationCheckBox.onClick = (checked) => {
            if (checked && this.dialog.noisexterminatorFreqSeparationCheckBox.checked) {
                  this.dialog.noisexterminatorDenoiseLFColorEdit.enabled = true;
            } else {
                  this.dialog.noisexterminatorDenoiseLFColorEdit.enabled = false;
            }
      }
      this.noisexterminatorColorEdit = this.guitools.newNumericEdit(this, "Color", this.par.nxt_denoise_color, 0, 1, "Amount of high frequency color noise to remove.");

      this.noisexterminatorFreqSeparationCheckBox = this.guitools.newCheckBox(this, "Frequency separation", this.par.nxt_enable_frequency_separation, "Enable frequency separation.");
      this.noisexterminatorFreqSeparationCheckBox.onClick = (checked) => {
            if (checked && this.dialog.noisexterminatorColorSeparationCheckBox.checked) {
                  this.dialog.noisexterminatorDenoiseLFColorEdit.enabled = true;
            } else {
                  this.dialog.noisexterminatorDenoiseLFColorEdit.enabled = false;
            }
      }
      this.noisexterminatorDenoiseLFEdit = this.guitools.newNumericEdit(this, "LF", this.par.nxt_denoise_lf, 0, 1, "<p>Depending on options: Denoise LF or Denoise LF Intensity.</p>");
      this.noisexterminatorScaleEdit = this.guitools.newNumericEdit(this, "HF/LF Scale (pixels)", this.par.nxt_frequency_scale, 0.5, 100, "Pixel scale for transition between HF and LF noise reduction.");

      this.noisexterminatorDenoiseLFColorEdit = this.guitools.newNumericEdit(this, "LF Color", this.par.nxt_denoise_lf_color, 0, 1, "<p>Used only if both Intensity/color separation and Frequency separation are selected.</p>");
      if (this.noisexterminatorColorSeparationCheckBox.checked && this.noisexterminatorFreqSeparationCheckBox.checked) {
            this.noisexterminatorDenoiseLFColorEdit.enabled = true;
      } else {
            this.noisexterminatorDenoiseLFColorEdit.enabled = false;
      }

      this.noiseReductionGroupBoxSizer31 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer31.margin = 2;
      this.noiseReductionGroupBoxSizer31.spacing = 4;
      this.noiseReductionGroupBoxSizer31.add( this.noisexterminatorDenoiseEdit );
      this.noiseReductionGroupBoxSizer31.add( this.noisexterminatorIterationsEdit );
      this.noiseReductionGroupBoxSizer31.addStretch();

      this.noiseReductionGroupBoxSizer32 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer32.margin = 2;
      this.noiseReductionGroupBoxSizer32.spacing = 4;
      this.noiseReductionGroupBoxSizer32.add( this.noisexterminatorColorSeparationCheckBox );
      this.noiseReductionGroupBoxSizer32.add( this.noisexterminatorColorEdit );
      this.noiseReductionGroupBoxSizer32.addStretch();

      this.noiseReductionGroupBoxSizer33 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer33.margin = 2;
      this.noiseReductionGroupBoxSizer33.spacing = 4;
      this.noiseReductionGroupBoxSizer33.add( this.noisexterminatorFreqSeparationCheckBox );
      this.noiseReductionGroupBoxSizer33.add( this.noisexterminatorDenoiseLFEdit );
      this.noiseReductionGroupBoxSizer33.add( this.noisexterminatorScaleEdit );
      this.noiseReductionGroupBoxSizer33.add( this.noisexterminatorDenoiseLFColorEdit );
      this.noiseReductionGroupBoxSizer33.addStretch();

      this.noiseReductionGroupBoxLabel3 = this.guitools.newSectionLabel(this, "NoiseXTerminator settings");
      this.noiseReductionGroupBoxSizer3 = new VerticalSizer;
      this.noiseReductionGroupBoxSizer3.margin = 6;
      this.noiseReductionGroupBoxSizer3.spacing = 4;
      this.noiseReductionGroupBoxSizer3.add( this.noiseReductionGroupBoxSizer31 );
      this.noiseReductionGroupBoxSizer3.add( this.noiseReductionGroupBoxSizer32 );
      this.noiseReductionGroupBoxSizer3.add( this.noiseReductionGroupBoxSizer33 );
      this.noiseReductionGroupBoxSizer3.addStretch();

      // GraXpert noise reduction settings
      //
      this.graxpertDenoiseStrengthEdit = this.guitools.newNumericEdit(this, "Denoise smoothing", this.par.graxpert_denoise_strength, 0, 1, "Strength for GraXpert denoise.");
      this.graxpertBatchSizeLabel = this.guitools.newLabel(this, "Batch size", "Batch size for GraXpert denoise.", true);
      this.graxpertDenoiseBatchSizeComboBox = this.guitools.newComboBox(this, this.par.graxpert_denoise_batch_size, this.graxpert_batch_size_values, this.graxpertBatchSizeLabel.toolTip);
      this.graxpertDenoiseSizer = this.guitools.newHorizontalSizer(2, true, [this.graxpertDenoiseStrengthEdit, this.graxpertBatchSizeLabel, this.graxpertDenoiseBatchSizeComboBox]);

      this.noiseReductionGroupBoxLabel4 = this.guitools.newSectionLabel(this, "GraXpert denoise settings");
      this.noiseReductionGroupBoxSizer4 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer4.margin = 6;
      this.noiseReductionGroupBoxSizer4.spacing = 4;
      this.noiseReductionGroupBoxSizer4.add( this.graxpertDenoiseSizer );
      this.noiseReductionGroupBoxSizer4.addStretch();

      // DeepSNR noise reduction settings
      //
      this.noiseReductionGroupBoxLabel5 = this.guitools.newSectionLabel(this, "DeepSNR denoise settings");
      this.deepSNRAmountEdit = this.guitools.newNumericEdit(this, "Amount", this.par.deepsnr_amount, 0, 1, "Amount of noise reduction.");
      this.noiseReductionGroupBoxSizer5 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer5.margin = 6;
      this.noiseReductionGroupBoxSizer5.spacing = 4;
      this.noiseReductionGroupBoxSizer5.add( this.deepSNRAmountEdit );
      this.noiseReductionGroupBoxSizer5.addStretch();

      // BlurXTerminator settings
      //
      this.blurxterminatorGroupBoxLabel = this.guitools.newSectionLabel(this, "BlurXTerminator settings");
      this.blurxterminatorGroupBoxLabel.toolTip = "Settings for BlurXTerminator. To use BlurXTerminator you need to check <i>Use BlurXTerminator</i> in <i>Settings / Tools</i> section.";

      this.bxtSharpenStars = this.guitools.newNumericEdit(this, "Sharpen stars", this.par.bxt_sharpen_stars, 0, 0.50, "Amount to reduce the diameter of stars.  Use a value between 0.00 and 0.50.");
      this.bxtAdjustHalo = this.guitools.newNumericEdit(this, "Adjust star halos", this.par.bxt_adjust_halo, -0.50, 0.50, "Amount to adjust star halos. Use a value between -0.50 and 0.50.");
      this.bxtSharpenNonstellar = this.guitools.newNumericEdit(this, "Sharpen nonstellar", this.par.bxt_sharpen_nonstellar, 0, 1, "The amount to sharpen non-stellar image features. Use a value between 0.00 and 1.00.");

      this.blurxterminatorGroupBoxSizer1 = new HorizontalSizer;
      // this.blurxterminatorGroupBoxSizer1.margin = 6;
      this.blurxterminatorGroupBoxSizer1.spacing = 4;
      this.blurxterminatorGroupBoxSizer1.add( this.bxtSharpenStars );
      this.blurxterminatorGroupBoxSizer1.add( this.bxtAdjustHalo );
      this.blurxterminatorGroupBoxSizer1.add( this.bxtSharpenNonstellar );
      this.blurxterminatorGroupBoxSizer1.addStretch();

      this.bxtPSF = this.guitools.newNumericEdit(this, "PSF", this.par.bxt_psf, 0, 8, "Manual PSF value if a non-zero value is given.");
      this.bxtImagePSF = this.guitools.newCheckBox(this, "Get PSF from image", this.par.bxt_image_psf, 
            "<p>Get PSF value from image using FWHM.</p>" + 
            "<p>" + this.guitools.BXT_no_PSF_tip + "</p>" );
      this.bxtMedianPSF = this.guitools.newCheckBox(this, "Use median PSF", this.par.bxt_median_psf, 
            "<p>Use median FWHM from subframe selector as PSF value. It can be useful when PSF cannot be calculated from the image.</p>" + 
            "<p>Value is saved to the FITS header and used if available. Value is also printed to the AutoIntegrate.log file with a name AutoIntegrateMEDFWHM.</p>" + 
            "<p>" + this.guitools.BXT_no_PSF_tip + "</p>" );
      this.bxtCorrectOnlyBeforeCC = this.guitools.newCheckBox(this, "Correct only before CC", this.par.bxt_correct_only_before_cc, 
            "<p>Run BlurXTerminator in correct only mode before color calibration.</p>" );
      this.bxtCorrectOnlyChannel = this.guitools.newCheckBox(this, "Correct only on channel images", this.par.bxt_correct_channels, 
            "<p>Run BlurXTerminator in correct only mode on channel images.</p>" );
      
      this.blurxterminatorGroupBoxSizer2 = new HorizontalSizer;
      // this.blurxterminatorGroupBoxSizer2.margin = 2;
      this.blurxterminatorGroupBoxSizer2.spacing = 4;
      this.blurxterminatorGroupBoxSizer2.add( this.bxtPSF );
      this.blurxterminatorGroupBoxSizer2.add( this.bxtImagePSF );
      this.blurxterminatorGroupBoxSizer2.add( this.bxtMedianPSF );
      this.blurxterminatorGroupBoxSizer2.addStretch();

      this.blurxterminatorGroupBoxSizer3 = new HorizontalSizer;
      // this.blurxterminatorGroupBoxSizer3.margin = 2;
      this.blurxterminatorGroupBoxSizer3.spacing = 4;
      this.blurxterminatorGroupBoxSizer3.add( this.bxtCorrectOnlyBeforeCC );
      this.blurxterminatorGroupBoxSizer3.add( this.bxtCorrectOnlyChannel );
      this.blurxterminatorGroupBoxSizer3.addStretch();

      this.blurxterminatorGroupBoxSizer = new VerticalSizer;
      this.blurxterminatorGroupBoxSizer.margin = 6;
      this.blurxterminatorGroupBoxSizer.spacing = 4;
      this.blurxterminatorGroupBoxSizer.add( this.blurxterminatorGroupBoxSizer1 );
      this.blurxterminatorGroupBoxSizer.add( this.blurxterminatorGroupBoxSizer2 );
      this.blurxterminatorGroupBoxSizer.add( this.blurxterminatorGroupBoxSizer3 );
      this.blurxterminatorGroupBoxSizer.addStretch();

      var starxterminator_default_ai_model = "unknown";

      try {
            var P = new StarXTerminator;
            starxterminator_default_ai_model = P.ai_file
      } catch (e) {
      }

      if (starxterminator_default_ai_model != "unknown" && this.par.starxterminator_ai_model.val == "") {
            this.par.starxterminator_ai_model.val = starxterminator_default_ai_model;
      }
      this.StarXTerminatorAImodeSizer = this.AImodelSizer(this, "AI model", this.par.starxterminator_ai_model, 
                                                "<p>Use the selected AI model. Default AI model is " + starxterminator_default_ai_model + "</p>" +
                                                "<p>AI models are stored in the PixInsight installation directory and have a .pb extension. " + 
                                                "At least in Windows they are in PixInsight/library directory.</p>");
      this.StarXTerminatorLargeOverlapCheckBox = this.guitools.newCheckBox(this, "Large overlap", this.par.starxterminator_large_overlap, 
            "<p>Uses large overlap on tiles to avoid tiling artifacts</p>");

      this.StarXTerminatorSizer = new HorizontalSizer;
      this.StarXTerminatorSizer.margin = 6;
      this.StarXTerminatorSizer.spacing = 4;
      this.StarXTerminatorSizer.add( this.StarXTerminatorAImodeSizer );
      this.StarXTerminatorSizer.add( this.StarXTerminatorLargeOverlapCheckBox );
      this.StarXTerminatorSizer.addStretch();

      this.StarXTerminatorGroupBoxLabel = this.guitools.newSectionLabel(this, "StarXTerminator settings");

      // NoiseXterminator info
      //
      this.NoiseXTerminatorInfoGroupBoxLabel = this.guitools.newSectionLabel(this, "NoiseXTerminator");
      this.NoiseXTerminatorInfoTxt = this.guitools.newLabel(this, "NoiseXTerminator settings are in the Postprocessing / Noise reduction section.", ".", true);
      this.NoiseXTerminatorInfoSizer = new VerticalSizer;
      this.NoiseXTerminatorInfoSizer.margin = 6;
      this.NoiseXTerminatorInfoSizer.spacing = 4;
      this.NoiseXTerminatorInfoSizer.add( this.NoiseXTerminatorInfoTxt );
      this.NoiseXTerminatorInfoSizer.addStretch();

      // Binning settings
      //
      this.binningLabel = new Label( this );
      this.binningLabel.text = "Binning";
      this.binningLabel.toolTip = 
            "<p>Do binning for each light file. Binning is done first on calibrated light files before any other operations.<p>" +
            "<p>With Color option binning is done only for color channel files.<p>" +
            "<p>With L and Color option binning is done for both luminance and color channel files.<p>" +
            "<p>Binning uses IntegerResample process and should help to reduce noise at the cost of decreased resolution.<p>";
      this.binningLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
      // Binning
      //
      this.binningComboBox = this.guitools.newComboBoxIndex(this, this.par.binning, this.binning_values, this.binningLabel.toolTip);
      this.binningSpinBoxLabel = this.guitools.newLabel(this, "Resample factor", 
                                          "<p>Resample factor for binning.</p>" +
                                          this.binningLabel.toolTip);
      this.binningSpinBox = this.guitools.newSpinBox(this, this.par.binning_resample, 2, 4, this.binningSpinBoxLabel.toolTip);

      this.binningGroupBoxLabel = this.guitools.newSectionLabel(this, "Binning");
      this.binningGroupBoxSizer = new HorizontalSizer;
      this.binningGroupBoxSizer.margin = 6;
      this.binningGroupBoxSizer.spacing = 4;
      this.binningGroupBoxSizer.add( this.binningLabel );
      this.binningGroupBoxSizer.add( this.binningComboBox );
      this.binningGroupBoxSizer.add( this.binningSpinBoxLabel );
      this.binningGroupBoxSizer.add( this.binningSpinBox );
      this.binningGroupBoxSizer.addStretch();

      // Banding
      this.bandingCheckBox = this.guitools.newCheckBox(this, "Banding reduction", this.par.banding_reduction, 
            "<p>Do Canon banding reduction using the method in CanonBandingReduction script.</p>" +
            "<p>Banding reduction is run for each light file separately after cosmetic correction and possible debayering.</p>");
      this.bandingHighlightCheckBox = this.guitools.newCheckBox(this, "Protect highlights", this.par.banding_reduction_protect_highlights, 
            "Protection for highlights.");
      this.bandingAmountControl = this.guitools.newNumericEdit(this, "Amount", this.par.banding_reduction_amount, 0, 4, 
            "<p>Reduction amount. An amount less than 1.0 is often necessary with fainter banding. </p>");

      this.bandingGroupBoxLabel = this.guitools.newSectionLabel(this, "Banding");
      this.bandingGroupBoxSizer = new HorizontalSizer;
      this.bandingGroupBoxSizer.margin = 6;
      this.bandingGroupBoxSizer.spacing = 4;
      this.bandingGroupBoxSizer.add( this.bandingCheckBox );
      this.bandingGroupBoxSizer.add( this.bandingHighlightCheckBox );
      this.bandingGroupBoxSizer.addSpacing( 5 );
      this.bandingGroupBoxSizer.add( this.bandingAmountControl );
      this.bandingGroupBoxSizer.addStretch();

      this.calibrationAutoPedestalCheckBox = this.guitools.newCheckBox(this, "Auto output pedestal", this.par.auto_output_pedestal, 
            "<p>Use automatic output pedestal when calibrating lights.</p>");
      this.calibrationPedestalLabel = this.guitools.newLabel(this, "Output pedestal", "<p>Pedestal value added when calibrating lights if auto output pedestal is not checked. Value is from range 0 to 65535.</p>");
      this.calibrationPedestalSpinBox = this.guitools.newSpinBox(this, this.par.output_pedestal, 0, 1000, this.calibrationPedestalLabel.toolTip);

      this.calibrationGroupBoxSizer1 = new HorizontalSizer;
      this.calibrationGroupBoxSizer1.margin = 6;
      this.calibrationGroupBoxSizer1.spacing = 4;
      this.calibrationGroupBoxSizer1.add( this.calibrationPedestalLabel );
      this.calibrationGroupBoxSizer1.add( this.calibrationPedestalSpinBox );
      this.calibrationGroupBoxSizer1.addStretch();

      this.calibrationGroupBoxSizer = new VerticalSizer;
      this.calibrationGroupBoxSizer.margin = 6;
      this.calibrationGroupBoxSizer.spacing = 4;
      this.calibrationGroupBoxSizer.add( this.calibrationAutoPedestalCheckBox );
      this.calibrationGroupBoxSizer.add( this.calibrationGroupBoxSizer1 );
      this.calibrationGroupBoxSizer.addStretch();

      this.targetNameLabel = this.guitools.newLabel(this, "Name", "Target name (optional).");
      this.targetNameEdit = this.guitools.newTextEdit(this, this.par.target_name, this.targetNameLabel.toolTip);

      this.targetRaDecLabel = this.guitools.newLabel(this, "RA DEC", "<p>Target RA DEC in decimal hours and degrees.</p>" + 
                                                       "<p>Should be given if target image does not contain coordinates.</p>" +
                                                       "<p>Search button can be used to search coordinates.</p>");
      this.targetRaDecEdit = this.guitools.newTextEdit(this, this.par.target_radec, this.targetRaDecLabel.toolTip);

      this.findTargetCoordinatesButton = new ToolButton(this);
      this.findTargetCoordinatesButton.text = "Search";
      this.findTargetCoordinatesButton.icon = this.scaledResource(":/icons/find.png");
      this.findTargetCoordinatesButton.toolTip = "<p>Search for target coordinates or add coordinates manually.</p>";
      this.findTargetCoordinatesButton.onClick = () =>
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
                  this.par.target_name.val = search.object.name;
                  this.dialog.targetRaDecEdit.text = (search.object.posEq.x/15).toFixed(5) + " " + search.object.posEq.y.toFixed(5);
                  this.par.target_radec.val = this.dialog.targetRaDecEdit.text;
            }
      };

      this.targetFocalLabel = this.guitools.newLabel(this, "Focal length mm", "Focal length in millimeters. Empty value uses image metadata.");
      this.targetFocalEdit = this.guitools.newTextEdit(this, this.par.target_focal, this.targetFocalLabel.toolTip);
      this.targetPixelSizeLabel = this.guitools.newLabel(this, "Pixel size μm", "Pixel size in μm. Empty value uses image metadata.");
      this.targetPixelSizeEdit = this.guitools.newTextEdit(this, this.par.target_pixel_size, this.targetPixelSizeLabel.toolTip);
      this.targetBinningLabel = this.guitools.newLabel(this, "Binning", "<p>Target binning. Binning multiplies the pixel size by the binning value.</p>" + 
                                                            "<ul>" +
                                                            "<li>Auto uses image metadata XBINNING value when available.</li>" +
                                                            "<li>None does not modify pixel size.</li>" +
                                                            "<li>Values 2 and 4 multiply the pixel size by those values.</li>" +
                                                            "</ul>");
      this.targetBinningComboBox = this.guitools.newComboBox(this, this.par.target_binning, this.target_binning_values, this.targetBinningLabel.toolTip);
      this.targetDrizzleLabel = this.guitools.newLabel(this, "Drizzle", "<p>Target drizzle. Drizzle divides the pixel size by the drizzle value.</p>" + 
                                                            "<ul>" +
                                                            "<li>Auto uses image metadata 'DrizzleIntegration.scale:' value when available.</li>" +
                                                            "<li>None does not modify pixel size.</li>" +
                                                            "<li>Numeric values divide the pixel size by those values.</li>" +
                                                            "</ul>");
      this.targetDrizzleComboBox = this.guitools.newComboBox(this, this.par.target_drizzle, this.target_drizzle_values, this.targetDrizzleLabel.toolTip);
      this.targetForceSolveCheckBox = this.guitools.newCheckBox(this, "Force solve", this.par.target_forcesolve, 
                                                      "<p>Force solving images even if it already solved.</p>" +
                                                      "<p>Can be useful for example when using old data with a newer SPCC version.</p>");
      this.targetInteractiveSolveCheckBox = this.guitools.newCheckBox(this, "Interactive solve", this.par.target_interactivesolve, 
                                                      "<p>Try solving the image interactively using image solver dialog.</p>");
      
      this.imageSolvingGroupBoxSizer1 = new HorizontalSizer;
      // this.imageSolvingGroupBoxSizer1.margin = 6;
      this.imageSolvingGroupBoxSizer1.spacing = 4;
      this.imageSolvingGroupBoxSizer1.add( this.targetNameLabel );
      this.imageSolvingGroupBoxSizer1.add( this.targetNameEdit );
      this.imageSolvingGroupBoxSizer1.add( this.targetRaDecLabel );
      this.imageSolvingGroupBoxSizer1.add( this.targetRaDecEdit );
      this.imageSolvingGroupBoxSizer1.add( this.findTargetCoordinatesButton );
      this.imageSolvingGroupBoxSizer1.add( this.targetForceSolveCheckBox );
      this.imageSolvingGroupBoxSizer1.add( this.targetInteractiveSolveCheckBox );
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

      this.imageSolvingGroupBoxLabel = this.guitools.newSectionLabel(this, "Image solving");
      this.imageSolvingGroupBoxSizer = new VerticalSizer;
      this.imageSolvingGroupBoxSizer.margin = 6;
      this.imageSolvingGroupBoxSizer.spacing = 4;
      this.imageSolvingGroupBoxSizer.add( this.imageSolvingGroupBoxSizer1 );
      this.imageSolvingGroupBoxSizer.add( this.imageSolvingGroupBoxSizer2 );
      this.imageSolvingGroupBoxSizer.addStretch();

      this.colorCalibrationGroupBoxLabel = this.guitools.newSectionLabel(this, "Color Calibration");

      this.colorCalibrationNarrowbandCheckBox = this.guitools.newCheckBox(this, "Use for narrowband", this.par.color_calibration_narrowband, 
            "Enable ColorCalibration for narrowband images.");

      this.colorCalibrationTimeLabel = this.guitools.newLabel(this, "When to run color calibration", 
                        "<p>When to run ColorCalibration process</p>" +
                        "<ul>" +
                        "<li>With <b>auto</b> the ColorCalibration process is run in both linear and nonlinear phase (non-stretched and stretched image). " +
                        "Running the ColorCalibration process twice seems to give a better final image in many cases. If SPCC is used for " +
                        "color calibration then with <i>auto</i> option the ColorCalibration process is not run.</li>" + 
                        "<li>With <b>linear</b> the ColorCalibration process is run only in linear phase (non-stretched image).</li>" + 
                        "<li>With <b>nonlinear</b> the ColorCalibration process is run only in nonlinear phase (stretched image).</li>" + 
                        "<li>With <b>both</b> the ColorCalibration process is run in both linear and nonlinear phase (non-stretched and stretched image).</li>" + 
                        "</ul>" +
                        "<p>When using the SPCC process the color calibration is always in a linear phase (non-stretched image).</p>" + 
                        "<p>Note that when using narrowband data color calibration is not run by default and must be enabled separately.</p>"
                  );
      this.colorCalibrationTimeComboBox = this.guitools.newComboBox(this, this.par.color_calibration_time, this.color_calibration_time_values, this.colorCalibrationTimeLabel.toolTip);
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

      this.spccDetectionScalesLabel = this.guitools.newLabel(this, "Detection scales", "Number of layers used for structure detection. Larger value detects larger stars for signal evaluation. If SPCC fails you can try increasing the value.");
      this.spccDetectionScalesSpinBox = this.guitools.newSpinBox(this, this.par.spcc_detection_scales, 1, 8, this.spccDetectionScalesLabel.toolTip);
      this.spccNoiseScalesLabel = this.guitools.newLabel(this, "Noise scales", "Number of layers used for noise reduction. If SPCC fails you can try increasing the value.");
      this.spccNoiseScalesSpinBox = this.guitools.newSpinBox(this, this.par.spcc_noise_scales, 0, 4, this.spccNoiseScalesLabel.toolTip);
      this.spccMinStructSizeLabel = this.guitools.newLabel(this, "Minimum structure size", "Minimum size for a detectable star structure. Can be increased to avoid detecting image artifacts as real stars.");
      this.spccMinStructSizeSpinBox = this.guitools.newSpinBox(this, this.par.spcc_min_struct_size, 0, 1000, this.spccMinStructSizeLabel.toolTip);
      this.spccLimitMagnitudeLabel = this.guitools.newLabel(this, "Limit magnitude", "Limit magnitude for catalog search. Can be changed from Auto to something like 20 or larger if SPCC fails. Maximum value is 30.");
      this.spccLimitMagnitudeEdit = this.guitools.newTextEdit(this, this.par.spcc_limit_magnitude, this.spccLimitMagnitudeLabel.toolTip);
      this.spccSaturationThresholdEdit = this.guitools.newNumericEdit(this, "Saturation threshold", this.par.spcc_saturation_threshold, 0, 1, 
                                                      "If SPCC fails you can try increasing this to for example 0.90.");
      this.spccMinSNREdit = this.guitools.newNumericEdit(this, "Min SNR", this.par.spcc_min_SNR, 0, 1000, 
                                                      "If SPCC fails you can try decreasing this value. You can for example try value 0.");

      this.spccWhiteReferenceLabel = this.guitools.newLabel(this, "White reference", "<p>Select white reference for SPCC.</p>" +
                                                                       "<p>Usually Average Spiral Galaxy is the best choice but for narrowband images Photon Flux should be used.</p>");
      this.spccWhiteReferenceComboBox = this.guitools.newComboBox(this, this.par.spcc_white_reference, this.spcc_white_reference_values, this.spccWhiteReferenceLabel.toolTip);

      this.spccGroupBoxLabel = this.guitools.newSectionLabel(this, "Spectrophotometric Color Calibration");

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

      this.spccNarrowbandCheckBox = this.guitools.newCheckBox(this, "Narrowband mode", this.par.spcc_narrowband_mode, 
            "Enable SPCC for narrowband images and use narrowband filter values.");
      this.spccBackgroundNeutralizationCheckBox = this.guitools.newCheckBox(this, "Background neutralization", this.par.spcc_background_neutralization, 
            "Do background neutralization during SPCC.");
      this.spccAutoUpdateFiltersCheckBox = this.guitools.newCheckBox(this, "Narrowband auto mode", this.par.spcc_auto_narrowband, 
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

      this.spccRedFilterWavelength = this.guitools.newNumericEdit(this, "Narrowband Red Wavelength", this.par.spcc_red_wavelength, 0, 999999, spccFilterTooTip);
      this.spccRedFilterBandwidth = this.guitools.newNumericEdit(this, "Bandwidth", this.par.spcc_red_bandwidth, 0, 999999, spccFilterTooTip);
      this.spccGreenFilterWavelength = this.guitools.newNumericEdit(this, "Narrowband Green Wavelength", this.par.spcc_green_wavelength, 0, 999999, spccFilterTooTip);
      this.spccGreenFilterBandwidth = this.guitools.newNumericEdit(this, "Bandwidth", this.par.spcc_green_bandwidth, 0, 999999, spccFilterTooTip);
      this.spccBlueFilterWavelength = this.guitools.newNumericEdit(this, "Narrowband Blue Wavelength", this.par.spcc_blue_wavelength, 0, 999999, spccFilterTooTip);
      this.spccBlueFilterBandwidth = this.guitools.newNumericEdit(this, "Bandwidth", this.par.spcc_blue_bandwidth, 0, 999999, spccFilterTooTip);

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
      this.weightLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.weightComboBox = this.guitools.newComboBox(this, this.par.use_weight, this.use_weight_values, weightHelpToolTips);

      var weightLimitToolTip = "<p>Limit value for SSWEIGHT. If value for SSWEIGHT is below the limit " +
                               "it is not included in the set of processed images.</p>" + 
                               "<p>Note that the value is written to the FITS header using 10 digits. Smaller than 10 digit limit values should not be used " + 
                               "if using the SSWEIGHT value that is written to FITS header.</p>";
      this.weightLimitEdit = this.guitools.newNumericEditPrecision(this, "Limit", this.par.ssweight_limit, 0, 999999, weightLimitToolTip, 10, this.setFilteringChanged);
      this.metricsVisualizerSSWEIGHTButton = new PushButton( this );
      this.metricsVisualizerSSWEIGHTButton.icon = this.scaledResource(":/icons/chart.png");
      this.metricsVisualizerSSWEIGHTButton.text = "Metrics visualizer";
      this.metricsVisualizerSSWEIGHTButton.toolTip = this.metricsVisualizerToolTip;
      this.metricsVisualizerSSWEIGHTButton.onClick = () => 
      {
            try {
                  this.metricsVisualizerSSWEIGHT(this.dialog);
            } catch (e) {
                  console.criticalln("Metrics visualizer: " + e);
            }
      };

      this.filterSortLabel = this.guitools.newLabel(this, "Sort order", "<p>Sort order for the filter and sort button.</p>");
      this.filterSortComboBox = this.guitools.newComboBox(this, this.par.sort_order_type, this.filter_sort_values, this.filterSortLabel.toolTip);

      this.clearMetricsButton = new PushButton( this );
      this.clearMetricsButton.text = "Clear metrics";
      this.clearMetricsButton.toolTip = "<p>Clear metrics data cached in memory.</p>";
      this.clearMetricsButton.onClick = () => 
      {
            this.global.saved_measurements = null;
            this.global.saved_measurements_sorted = null;
      };

      var filterLimitHelpToolTips= "<p>Choose filter measure and value. FWHM and Eccentricity are filtered for too high values (min), and all others are filtered for too low values (max).</p>" +
                                   "<p>Limit value zero (0.0000) means that there is no filtering.</p>";
      this.filterLimit1Label = this.guitools.newLabel(this, "Filter 1", filterLimitHelpToolTips);
      this.filterLimit1ComboBox = this.guitools.newComboBox(this, this.par.filter_limit1_type, this.filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit1Edit = this.guitools.newNumericEditPrecision(this, "Limit", this.par.filter_limit1_val, 0, 999999, filterLimitHelpToolTips, 4);
      this.filterLimit2Label = this.guitools.newLabel(this, "Filter 2", filterLimitHelpToolTips);
      this.filterLimit2ComboBox = this.guitools.newComboBox(this, this.par.filter_limit2_type, this.filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit2Edit = this.guitools.newNumericEditPrecision(this, "Limit", this.par.filter_limit2_val, 0, 999999, filterLimitHelpToolTips, 4);
      this.filterLimit3Label = this.guitools.newLabel(this, "Filter 3", filterLimitHelpToolTips);
      this.filterLimit3ComboBox = this.guitools.newComboBox(this, this.par.filter_limit3_type, this.filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit3Edit = this.guitools.newNumericEditPrecision(this, "Limit", this.par.filter_limit3_val, 0, 999999, filterLimitHelpToolTips, 4);
      this.filterLimit4Label = this.guitools.newLabel(this, "Filter 4", filterLimitHelpToolTips);
      this.filterLimit4ComboBox = this.guitools.newComboBox(this, this.par.filter_limit4_type, this.filter_limit_values, filterLimitHelpToolTips);
      this.filterLimit4Edit = this.guitools.newNumericEditPrecision(this, "Limit", this.par.filter_limit4_val, 0, 999999, filterLimitHelpToolTips, 4);

      this.metricsVisualizerFiltersButton = new PushButton( this );
      this.metricsVisualizerFiltersButton.icon = this.scaledResource(":/icons/chart.png");
      this.metricsVisualizerFiltersButton.text = "Metrics visualizer";
      this.metricsVisualizerFiltersButton.toolTip = this.metricsVisualizerToolTip;
      this.metricsVisualizerFiltersButton.onClick = () => 
      {
            try {
                  this.metricsVisualizerFilters(this.dialog);
            } catch (e) {
                  console.criticalln("Metrics visualizer: " + e);
            }
      };

      this.outlierMethodLabel = new Label( this );
      this.outlierMethodLabel.text = "Outlier method";
      this.outlierMethodLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.outlierMethodLabel.toolTip = 
            "<p>Different methods are available for detecting outliers.<p>" +
            "<p>Two sigma filters out outliers that are two sigmas away from mean value.</p>" +
            "<p>One sigma filters out outliers that are one sigmas away from mean value. This option filters "+ 
            "more outliers than the two other options.</p>" +
            "<p>Interquartile range (IQR) measurement is based on median calculations. It should be " + 
            "relatively close to two sigma method.</p>";
      this.outlierMethodComboBox = this.guitools.newComboBox(this, this.par.outliers_method, this.outliers_methods, this.outlierMethodLabel.toolTip, this.setFilteringChanged);

      this.outlierMinMax_CheckBox = this.guitools.newCheckBox(this, "Min Max", this.par.outliers_minmax, 
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
      this.outlierLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.outlierLabel.toolTip = outlier_filtering_tooltip;
      this.outlier_ssweight_CheckBox = this.guitools.newCheckBox(this, "SSWEIGHT", this.par.outliers_ssweight, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_fwhm_CheckBox = this.guitools.newCheckBox(this, "FWHM", this.par.outliers_fwhm, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_ecc_CheckBox = this.guitools.newCheckBox(this, "Ecc", this.par.outliers_ecc, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_snr_CheckBox = this.guitools.newCheckBox(this, "SNR", this.par.outliers_snr, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_psfsignal_CheckBox = this.guitools.newCheckBox(this, "PSF Signal", this.par.outliers_psfsignal, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_psfpower_CheckBox = this.guitools.newCheckBox(this, "PSF Power", this.par.outliers_psfpower, outlier_filtering_tooltip, this.setFilteringChanged);
      this.outlier_stars_CheckBox = this.guitools.newCheckBox(this, "Stars", this.par.outliers_stars, outlier_filtering_tooltip, this.setFilteringChanged);

      this.weightGroupBoxLabel = this.guitools.newSectionLabel(this, "Image weight calculation settings");

      this.weightGroupBoxSizer = new HorizontalSizer;
      this.weightGroupBoxSizer.margin = 6;
      this.weightGroupBoxSizer.spacing = 4;
      this.weightGroupBoxSizer.add( this.weightLabel );
      this.weightGroupBoxSizer.add( this.weightComboBox );
      this.weightGroupBoxSizer.add( this.weightLimitEdit );
      this.weightGroupBoxSizer.add( this.metricsVisualizerSSWEIGHTButton );
      this.weightGroupBoxSizer.addStretch();

      this.sortOrderSizer = this.guitools.newHorizontalSizer(4, true, [ this.filterSortLabel, this.filterSortComboBox, this.clearMetricsButton ]);

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

      this.filterGroupBoxSizer2 = new HorizontalSizer;
      this.filterGroupBoxSizer2.margin = 6;
      this.filterGroupBoxSizer2.spacing = 4;
      this.filterGroupBoxSizer2.add( this.filterLimit3Label );
      this.filterGroupBoxSizer2.add( this.filterLimit3ComboBox );
      this.filterGroupBoxSizer2.add( this.filterLimit3Edit );
      this.filterGroupBoxSizer2.add( this.filterLimit4Label );
      this.filterGroupBoxSizer2.add( this.filterLimit4ComboBox );
      this.filterGroupBoxSizer2.add( this.filterLimit4Edit );
      this.filterGroupBoxSizer2.add( this.metricsVisualizerFiltersButton );
      this.filterGroupBoxSizer2.addStretch();

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
      this.weightSizer.add( this.sortOrderSizer );
      this.weightSizer.add( this.weightGroupBoxSizer );
      this.weightSizer.add( this.filterGroupBoxSizer );
      this.weightSizer.add( this.filterGroupBoxSizer2 );
      this.weightSizer.add( this.weightGroupBoxSizer2 );
      this.weightSizer.add( this.weightGroupBoxSizer3 );

      // CosmeticCorrection Sigma values
      //
      this.cosmeticCorrectionSigmaGroupBoxLabel = this.guitools.newSectionLabel(this, "CosmeticCorrection Sigma values");
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "<p>Hot Sigma and Cold Sigma values for CosmeticCorrection</p>";

      this.cosmeticCorrectionHotSigmaGroupBoxLabel = this.guitools.newLabel(this, "Hot Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionHotSigmaSpinBox = this.guitools.newSpinBox(this, this.par.cosmetic_correction_hot_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColSigmaGroupBoxLabel = this.guitools.newLabel(this, "Cold Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColdSigmaSpinBox = this.guitools.newSpinBox(this, this.par.cosmetic_correction_cold_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
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

      this.linearFitLabel = this.guitools.newLabel(this, "Linear fit", 
            "<p>Choose how to do linear fit of RGB images. Linear fit is done only on RGB channels.</p>" + 
            "<p>For narrowband images linear fit settings are in the <i>Settings / Narrowband processing</i> section.</p>" +
            "<ul>" + 
            "<li><b>Auto</b> does linear fit using Min RGB.</li>" + 
            "<li><b>Min RGB</b> does linear fit using RGB channels with minimum median value as the reference image.</li>" + 
            "<li><b>Max RGB</b> does linear fit using RGB channels with maximum median value as the reference image.</li>" + 
            "<li><b>Min LRGB</b> does linear fit using LRGB channels with minimum median value as the reference image.</li>" + 
            "<li><b>Max LRGB</b> does linear fit using LRGB channels with maximum median value as the reference image.</li>" + 
            "</ul>" +
            "<p>When a channel is selected it uses that channel as the the reference image for RGB images.<p>" +
            "<p>When Luminance channel is selected also the luminance channel is used for linear fit. If the luminance " + 
            "channel is not present then the red channel is used as the reference image.</p>");
      this.linearFitComboBox = this.guitools.newComboBox(this, this.par.use_linear_fit, this.use_linear_fit_values, this.linearFitLabel.toolTip);

      this.linearFitGroupBoxLabel = this.guitools.newSectionLabel(this, "Linear fit settings");
      this.linearFitSizer = this.guitools.newHorizontalSizer(6, true, [this.linearFitLabel, this.linearFitComboBox]);

      this.graxpertPathSizer = this.guitools.createGraXpertPathSizer(this);

      // GraXpert Gradient correction
      //
      this.graxpertGradientCorrectionSizer = this.guitools.createGraXpertGradientCorrectionSizer(this);

      // GraXpert Deconvolution
      //
      var graxpertDenconvolutionToolTip = "<p>GraXpert deconvolution is used for stellar and non-stellar sharpening.</p>";
      this.graxpertDenconvolutionStellarStrengthEdit = this.guitools.newNumericEdit(this, "Deconvolution stars strength", this.par.graxpert_deconvolution_stellar_strength, 0, 1, "<p>Strength for GraXpert stars deconvolution.</p>" + graxpertDenconvolutionToolTip);
      this.graxpertDenconvolutionStellarPsfEdit = this.guitools.newNumericEdit(this, "Stars FWHM", this.par.graxpert_deconvolution_stellar_psf, 0, 14, "<p>FWHM in pixels for GraXpert stars deconvolution.</p>" + graxpertDenconvolutionToolTip);
      this.graxpertDenconvolutionStellarSizer = this.guitools.newHorizontalSizer(2, true, [this.graxpertDenconvolutionStellarStrengthEdit, this.graxpertDenconvolutionStellarPsfEdit]);

      this.graxpertDenconvolutionNonStellarStrengthEdit = this.guitools.newNumericEdit(this, "Deconvolution object strength", this.par.graxpert_deconvolution_nonstellar_strength, 0, 1, "<p>Strength for GraXpert object deconvolution.</p>" + graxpertDenconvolutionToolTip);
      this.graxpertDenconvolutionNonStellarPsfEdit = this.guitools.newNumericEdit(this, "Object FWHM", this.par.graxpert_deconvolution_nonstellar_psf, 0, 14, "<p>FWHM in pixels for GraXpert object deconvolution.</p>" + graxpertDenconvolutionToolTip);
      this.graxpertDenconvolutionNonStellarSizer = this.guitools.newHorizontalSizer(2, true, [this.graxpertDenconvolutionNonStellarStrengthEdit, this.graxpertDenconvolutionNonStellarPsfEdit]);

      this.graxpertDenconvolutionMedianPSF = this.guitools.newCheckBox(this, "Use median FWHM", this.par.graxpert_median_psf, 
            "<p>Use median FWHM from subframe selector as FWHM value.</p>" + 
            "<p>Value is saved to the FITS header and used if available. Value is also printed to the AutoIntegrate.log file with a name AutoIntegrateMEDFWHM.</p>");

      this.graxpertDenconvolutionLabel = this.guitools.newSectionLabel(this, "Deconvolution settings");
      this.graxpertDenconvolutionLabel.toolTip = graxpertDenconvolutionToolTip;

      this.graxpertDenconvolutionSizer = this.guitools.newVerticalSizer(2, true, [this.graxpertDenconvolutionStellarSizer, this.graxpertDenconvolutionNonStellarSizer, this.graxpertDenconvolutionMedianPSF]);

      // Noise reduction
      //
      this.graxpertInfoDenoiseLabel = this.guitools.newSectionLabel(this, "Denoise settings");
      this.graxpertInfoDenoiseText = this.guitools.newLabel(this, "GraXpert denoise settings are in the Postprocessing / Noise reduction section.", "", true);
      this.graxpertInfoDenoiseSizer = this.guitools.newVerticalSizer(6, true, [this.graxpertInfoDenoiseText]);

      this.graxpertControl = new Control( this );
      this.graxpertControl.sizer = new VerticalSizer;
      this.graxpertControl.sizer.margin = 6;
      this.graxpertControl.sizer.spacing = 4;
      this.graxpertControl.sizer.add( this.graxpertGradientCorrectionSizer );
      this.graxpertControl.sizer.add( this.graxpertDenconvolutionLabel );
      this.graxpertControl.sizer.add( this.graxpertDenconvolutionSizer );
      this.graxpertControl.sizer.add( this.graxpertInfoDenoiseLabel );
      this.graxpertControl.sizer.add( this.graxpertInfoDenoiseSizer );
      this.graxpertControl.visible = true;

      // Graxpert all settings
      //
      this.graxpertGroupBoxSizer = this.guitools.newVerticalSizer(6, true, [
            this.graxpertPathSizer, 
            this.graxpertControl
      ]);

      this.global.expert_mode_controls.push(this.graxpertControl);

      // Cropping settings
      //
      this.CropToleranceLabel = this.guitools.newLabel(this, "Tolerance", "Number of consecutive bad pixels allowed before detecting crop edge.");
      this.CropToleranceSpinBox = this.guitools.newSpinBox(this, this.par.crop_tolerance, 0, 100, this.CropToleranceLabel.toolTip);
      this.cropUseRejectionLowCheckBox = this.guitools.newCheckBox(this, "Use rejection low", this.par.crop_use_rejection_low, "Use rejection_low from ImageIntegration instead of integrated data to calculate crop amount.");
      this.cropRejectionLowLimitEdit = this.guitools.newNumericEdit(this, "Limit", this.par.crop_rejection_low_limit, 0, 1, 
            "<p>Limit value for detecting crop edges. Values below the limit are considered to be inside the cropped area.</p>" +
            "<p>This value is used only if rejection low is selected.</p>");
      this.cropCheckLimitEdit = this.guitools.newNumericEdit(this, "Warning limit", this.par.crop_check_limit, 0, 100, 
            "<p>Warning limit value in percentages. If image is cropped more than the warning limit percentage a warning message is printed at the end of processing.</p>" +
            "<p>After a warning you should manually check the cropping area.</p>");

      this.CropToleranceSizer = this.guitools.newHorizontalSizer(0, true, [this.CropToleranceLabel, this.CropToleranceSpinBox]);

      this.CropToleranceGroupBoxLabel = this.guitools.newSectionLabel(this, "Crop settings");
      this.CropSizer = this.guitools.newHorizontalSizer(6, true, [this.cropUseRejectionLowCheckBox, 
                                                  this.CropToleranceSizer, this.cropRejectionLowLimitEdit, this.cropCheckLimitEdit]);

      this.GCStarXSizer = this.guitools.createGradientCorrectionSizer(this, 2);

      //
      // Stretching parameters
      //

      this.starsStretchingLabel = this.guitools.newLabel(this, "Stretching for Stars ", "Stretching for stars if stars are extracted from a linear image.");
      this.starsStretchingComboBox = this.guitools.newComboBox(this, this.par.stars_stretching, this.global.image_stretching_values, this.guitools.stretchingTootip);
      var stars_combine_Tooltip = "<p>Select how to combine star and starless image.</p>" + this.guitools.stars_combine_operations_Tooltip;
      this.starsCombineLabel = this.guitools.newLabel(this, " Combine ", stars_combine_Tooltip);
      this.starsCombineComboBox = this.guitools.newComboBox(this, this.par.stars_combine, this.guitools.starless_and_stars_combine_values, stars_combine_Tooltip);
      
      this.starStretchingChoiceSizer = new HorizontalSizer;
      //this.starStretchingChoiceSizer.margin = 6;
      this.starStretchingChoiceSizer.spacing = 4;
      this.starStretchingChoiceSizer.add( this.starsStretchingLabel );
      this.starStretchingChoiceSizer.add( this.starsStretchingComboBox );
      this.starStretchingChoiceSizer.add( this.starsCombineLabel );
      this.starStretchingChoiceSizer.add( this.starsCombineComboBox );
      this.starStretchingChoiceSizer.addStretch();

      this.StarStretchingGroupBoxSizer1 = this.guitools.newVerticalSizer(0, false, [this.remove_stars_channel_CheckBox,
                                                                      this.remove_stars_before_stretch_CheckBox,
                                                                      this.remove_stars_stretched_CheckBox ]);
      this.StarStretchingGroupBoxSizer2 = this.guitools.newVerticalSizer(0, false, [this.unscreen_stars_CheckBox,
                                                                      this.remove_stars_light_CheckBox ]);

      this.StarStretchingGroupBoxSizer0 = this.guitools.newHorizontalSizer(0, false, [this.StarStretchingGroupBoxSizer1, 
                                                                       this.StarStretchingGroupBoxSizer2]);
      this.StarStretchingGroupBoxSizer = new VerticalSizer;
      this.StarStretchingGroupBoxSizer.margin = 6;
      this.StarStretchingGroupBoxSizer.spacing = 4;
      this.StarStretchingGroupBoxSizer.add( this.starStretchingChoiceSizer );
      this.StarStretchingGroupBoxSizer.add( this.StarStretchingGroupBoxSizer0 );          
      this.StarStretchingGroupBoxSizer.addStretch();

      this.RGBStarsGroupBoxSizer = new VerticalSizer;
      this.RGBStarsGroupBoxSizer.margin = 6;
      this.RGBStarsGroupBoxSizer.spacing = 4;
      this.RGBStarsGroupBoxSizer.add( this.RGB_stars_CheckBox );
      this.RGBStarsGroupBoxSizer.addStretch();

      //
      // Image integration
      //
      // normalization
      this.ImageIntegrationCombinationLabel = new Label( this );
      this.ImageIntegrationCombinationLabel.text = "Combination";
      this.ImageIntegrationCombinationLabel.toolTip = "<p>Pixel combination operation</p>";
      this.ImageIntegrationCombinationLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.ImageIntegrationCombinationComboBox = this.guitools.newComboBox(this, this.par.integration_combination, this.imageintegration_combination_values, this.ImageIntegrationCombinationLabel.toolTip);

      this.ImageIntegrationCombinationSizer = new HorizontalSizer;
      this.ImageIntegrationCombinationSizer.spacing = 4;
      this.ImageIntegrationCombinationSizer.add( this.ImageIntegrationCombinationLabel );
      this.ImageIntegrationCombinationSizer.add( this.ImageIntegrationCombinationComboBox, 100 );

      this.ImageIntegrationNormalizationLabel = new Label( this );
      this.ImageIntegrationNormalizationLabel.text = "Normalization";
      this.ImageIntegrationNormalizationLabel.toolTip = "<p>Rejection normalization. This is value is ignored if local normalization is used.</p>";
      this.ImageIntegrationNormalizationLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.ImageIntegrationNormalizationComboBox = this.guitools.newComboBox(this, this.par.imageintegration_normalization, this.imageintegration_normalization_values, this.ImageIntegrationNormalizationLabel.toolTip);
   
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
            "<b>None</b> - No rejection. Useful for example with a blown out comet core." +
            "</p>";

      this.ImageIntegrationRejectionLabel = new Label( this );
      this.ImageIntegrationRejectionLabel.text = "Rejection";
      this.ImageIntegrationRejectionLabel.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
      this.ImageIntegrationRejectionComboBox = this.guitools.newComboBox(this, this.par.use_clipping, this.use_clipping_values, ImageIntegrationHelpToolTips);
   
      // Image integration
      this.ImageIntegrationRejectionSizer = new HorizontalSizer;
      this.ImageIntegrationRejectionSizer.spacing = 4;
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionLabel );
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionComboBox, 100 );

      this.ImageIntegrationPercentileLow = this.guitools.newNumericEdit(this, 'Percentile Low', this.par.percentile_low, 0, 1, "<p>Percentile low clipping factor.</p>");
      this.ImageIntegrationPercentileHigh = this.guitools.newNumericEdit(this, 'High', this.par.percentile_high, 0, 1, "<p>Percentile high clipping factor.</p>");
      this.ImageIntegrationSigmaLow = this.guitools.newNumericEdit(this, 'Sigma Low', this.par.sigma_low, 0, 10, "<p>Sigma low clipping factor.</p>");
      this.ImageIntegrationSigmaHigh = this.guitools.newNumericEdit(this, 'High', this.par.sigma_high, 0, 10, "<p>Sigma high clipping factor.</p><p>" + sigma_tips + "</p><p>" + winsorised_tips + "</p>");
      this.ImageIntegrationWinsorisedCutoff = this.guitools.newNumericEdit(this, 'Winsorization cutoff', this.par.winsorised_cutoff, 3, 10, "<p>Cutoff point for Winsorised sigma clipping.</p>");
      this.ImageIntegrationLinearFitLow = this.guitools.newNumericEdit(this, 'Linear fit Low', this.par.linearfit_low, 0, 10, "<p>Tolerance of low values for linear fit low clipping.</p>");
      this.ImageIntegrationLinearFitHigh = this.guitools.newNumericEdit(this, 'High', this.par.linearfit_high, 0, 10, "<p>Tolerance of high values for linear fit low clipping.</p>");
      this.ImageIntegrationESDOutliers = this.guitools.newNumericEdit(this, 'ESD Outliers', this.par.ESD_outliers, 0, 1, "<p>ESD outliers.</p>");
      this.ImageIntegrationESDSignificance = this.guitools.newNumericEdit(this, 'Significance', this.par.ESD_significance, 0, 1, "<p>ESD significance.</p><p>" + ESD_tips + "</p>");

      this.ImageIntegrationRejectionSettingsSizer1 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer1.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer1.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionSettingsSizer1.add( this.ImageIntegrationCombinationSizer );
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

      this.ImageIntegrationLargeScaleRejectionLabel = this.guitools.newLabel(this, 'Large scale pixel rejection', "<p>Enable large scale rejection of pixels.</p>");
      this.ImageIntegrationLargeScaleRejectionHighCheckBox = this.guitools.newCheckBox(this, "High", this.par.large_scale_pixel_rejection_high, 
            "<p>Enable large scale rejection of high pixels.</p>" +
            "<p>Large scale rejection of high pixels may help for example with satellite trails.</p>");
      this.ImageIntegrationLargeScaleRejectionLowCheckBox = this.guitools.newCheckBox(this, "Low", this.par.large_scale_pixel_rejection_low, 
            "<p>Enable large scale rejection of low pixels.</p>");
      
      this.ImageIntegrationRejectionSettingsSizer4 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer4.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer4.add( this.ImageIntegrationLargeScaleRejectionLabel );
      this.ImageIntegrationRejectionSettingsSizer4.add( this.ImageIntegrationLargeScaleRejectionHighCheckBox );
      this.ImageIntegrationRejectionSettingsSizer4.add( this.ImageIntegrationLargeScaleRejectionLowCheckBox );
      this.ImageIntegrationRejectionSettingsSizer4.addStretch();

      this.ImageIntegrationSubstackCheckBox = this.guitools.newCheckBox(this, "Substack,", this.par.substack_mode, 
            "<p>Divide light files into <i>Number of substacks</i> substacks and stack them separately. Stacked files are named as Stack_<i>num</i>_Integration_RGB.</p>" +
            "<p>When this option is enabled only image integration is done and final images are not generated. The idea is to use substacks to generate the final image.</p>" +
            "<p>Note that this works only with color (OSC) files but no checks for that are done.</p>" );
      this.ImageIntegrationSubstackLabel = this.guitools.newLabel(this, 'Number of substacks', "<p>Number of substacks.</p>");
      this.ImageIntegrationSubstackSpinbox = this.guitools.newSpinBox(this, this.par.substack_count, 2, 999, this.ImageIntegrationSubstackLabel.toolTip);

      this.ImageIntegrationSubstackSettingsSizer = new HorizontalSizer;
      this.ImageIntegrationSubstackSettingsSizer.spacing = 4;
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackCheckBox );
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackLabel );
      this.ImageIntegrationSubstackSettingsSizer.add( this.ImageIntegrationSubstackSpinbox );
      this.ImageIntegrationSubstackSettingsSizer.addStretch();

      this.clippingGroupBoxLabel = this.guitools.newSectionLabel(this, 'Image integration settings');
      this.clippingGroupBoxSizer = new VerticalSizer;
      this.clippingGroupBoxSizer.margin = 6;
      this.clippingGroupBoxSizer.spacing = 4;
      this.clippingGroupBoxSizer.toolTip = ImageIntegrationHelpToolTips;
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer1 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer2 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer3 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer4 );
      this.clippingGroupBoxSizer.addSpacing( 8 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationSubstackSettingsSizer );
      //this.clippingGroupBoxSizer.addStretch();

      this.fastIntegrationIterationsLabel = this.guitools.newLabel(this, 'Iterations', 
                  "<p>Increase the value if you have a lot of drift between images.</p>");
      this.fastIntegrationIterationsSpinbox = this.guitools.newSpinBox(this, this.par.fastintegration_iterations, 1, 6, this.fastIntegrationIterationsLabel.toolTip);
      this.fastIntegrationFlux = this.guitools.newNumericEdit(this, 'Max relative flux', this.par.fastintegration_max_flux, 0, 0.5, 
                  "<p>Increase the value if you have a dense starfield. Smaller values can be used for sparse starfields.</p>");
      this.fastIntegrationErrorTolerance = this.guitools.newNumericEdit(this, 'Error tolerance', this.par.fastintegration_errortolerance, 0, 4, 
                  "<p>Alignment error tolerance. You can try increasing the value if alignment fails.</p>");
      this.fastIntegrationSubframeSelectorCheckBox = this.guitools.newCheckBox(this, "Fast SubframeSelector", this.par.fastintegration_fast_subframeselector, 
            "<p>Run SubframeSelector only to a subset of images when using FastIntegration. SubframeSelector is used only to find the reference image.</p>" +
            "<p>When this option is used then the first 32 images in the list are used to find the reference image unless reference image is selected manually.</p>");
      this.fastIntegrationCosmeticCorrectionCheckBox = this.guitools.newCheckBox(this, "Skip CosmeticCorrection", this.par.fastintegration_skip_cosmeticcorrection, 
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

      this.fastIntegrationGroupBoxLabel = this.guitools.newSectionLabel(this, 'FastIntegration settings');
      this.fastIntegrationGroupBoxSizer = new VerticalSizer;
      this.fastIntegrationGroupBoxSizer.margin = 6;
      this.fastIntegrationGroupBoxSizer.spacing = 4;
      this.fastIntegrationGroupBoxSizer.toolTip = "Settings for FastIntegration.";
      this.fastIntegrationGroupBoxSizer.add( this.fastIntegrationSettingsSizer1 );
      this.fastIntegrationGroupBoxSizer.add( this.fastIntegrationSettingsSizer2 );

      this.localNormalizationMultiscaleCheckBox = this.guitools.newCheckBox(this, "Use multiscale analysis", this.par.use_localnormalization_multiscale, 
            "<p>During local normalization use multiscale analysis instead of PSF flux evaluation.</p>" +
            "<p>Using multiscale analysis may help if you get errors like <i>PSFScaleEstimator::EstimateScale(): Internal error: No reference image has been defined</i>.</p>" );

      this.localNormalizationSizer = new HorizontalSizer;
      this.localNormalizationSizer.margin = 6;
      this.localNormalizationSizer.spacing = 4;
      this.localNormalizationSizer.add( this.localNormalizationMultiscaleCheckBox );
      this.localNormalizationSizer.addStretch();
      
      this.localNormalizationGroupBoxLabel = this.guitools.newSectionLabel(this, 'Local normalization');
      this.localNormalizationGroupBoxSizer = new VerticalSizer;
      this.localNormalizationGroupBoxSizer.margin = 6;
      this.localNormalizationGroupBoxSizer.spacing = 4;
      this.localNormalizationGroupBoxSizer.toolTip = "<p>Local normalization settings.</p>";
      this.localNormalizationGroupBoxSizer.add( this.localNormalizationSizer );
      //this.localNormalizationGroupBoxSizer.addStretch();

      this.drizzleFunctionLabel = this.guitools.newLabel(this, "Kernel function", "Drizzle drop kernel function.");
      this.drizzleFunctionComboBox = this.guitools.newComboBox(this, this.par.drizzle_function, this.drizzle_function_values, this.drizzleFunctionLabel.toolTip);
      this.drizzleFastModeCheckBox = this.guitools.newCheckBox(this, "Fast mode,", this.par.drizzle_fast_mode, "<p>Use fast mode for drizzle integration.</p>");
      this.drizzleDropShrinkEdit = this.guitools.newNumericEdit(this, "Drop shrink", this.par.drizzle_drop_shrink, 0, 1, 
            "<p>Drop shrink value for drizzle.</p>");

      this.drizzleGroupBoxLabel = this.guitools.newSectionLabel(this, 'Drizzle settings');
      this.drizzleGroupBoxSizer = new HorizontalSizer;
      this.drizzleGroupBoxSizer.margin = 6;
      this.drizzleGroupBoxSizer.spacing = 4;
      this.drizzleGroupBoxSizer.toolTip = "<p>Drizzle settings.</p>";
      this.drizzleGroupBoxSizer.add( this.drizzleFunctionLabel );
      this.drizzleGroupBoxSizer.add( this.drizzleFunctionComboBox );
      this.drizzleGroupBoxSizer.add( this.drizzleFastModeCheckBox );
      this.drizzleGroupBoxSizer.add( this.drizzleDropShrinkEdit );
      this.drizzleGroupBoxSizer.addStretch();

      // Narrowband palette

      this.narrowbandColorPaletteLabel = this.guitools.newSectionLabel(this, "Color palette");
      this.narrowbandColorPaletteLabel.toolTip = this.guitools.narrowbandToolTip;

      /* Narrowband mappings. 
       */
      this.narrowbandCustomPalette_Sizer = this.guitools.createNarrowbandCustomPaletteSizer(this);

      this.force_narrowband_mapping_CheckBox = this.guitools.newCheckBox(this, "Force narrowband mapping", this.par.force_narrowband_mapping, 
            "<p>" +
            "Force narrowband mapping using formulas given in <i>Settings / Narrowband processing</i> section." +
            "</p>" );
      this.mapping_on_nonlinear_data_CheckBox = this.guitools.newCheckBox(this, "Narrowband mapping using non-linear data", this.par.mapping_on_nonlinear_data, 
            "<p>" +
            "Do narrowband mapping using non-linear data. Before running PixelMath, images are stretched to non-linear state. " +
            "</p>" );

      this.narrowbandLinearFit_Label = new Label( this );
      this.narrowbandLinearFit_Label.text = "Linear fit";
      this.narrowbandLinearFit_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.narrowbandLinearFit_Label.toolTip = 
            "<p>Linear fit setting before running PixelMath to combine narrowband channel.</p>" +
            "<p>Auto does not use linear if Auto STF or Histogram stretch is used for stretching. Otherwise it uses Min.<br>" +
            "<p>Min does linear fit using the channel with minimum median value as the reference image.</p>" + 
            "<p>Max does linear fit using the channel with maximum median value as the reference image.</p>" + 
            "<p>When a channel is selected it uses that channel as the the reference image.<p>" +
            "<p>Other selections use linear fit with that channel image as the reference image.</p>";
      this.narrowbandLinearFit_Label.margin = 6;
      this.narrowbandLinearFit_Label.spacing = 4;
      this.narrowbandLinearFit_ComboBox = this.guitools.newComboBox(this, this.par.narrowband_linear_fit, this.narrowband_linear_fit_values, this.narrowbandLinearFit_Label.toolTip);

      this.mapping_on_nonlinear_data_Sizer = new HorizontalSizer;
      // this.mapping_on_nonlinear_data_Sizer.margin = 2;
      this.mapping_on_nonlinear_data_Sizer.spacing = 4;
      this.mapping_on_nonlinear_data_Sizer.add( this.force_narrowband_mapping_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.add( this.mapping_on_nonlinear_data_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.addStretch();

      /* Luminance channel mapping.
       */
      this.narrowbandLuminancePalette_ComboBox = new ComboBox( this );
      this.narrowbandLuminancePalette_ComboBox.addItem( "Auto" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "L" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "max(L, H)" );
      this.narrowbandLuminancePalette_ComboBox.toolTip = "<p>Mapping of Luminance channel with narrowband data if both RGB and narrowband data are available.</p>" +
                                                         "<p>With empty text no mapping is done.</p>";
      this.narrowbandLuminancePalette_ComboBox.onItemSelected = (itemIndex) =>
      {
            switch (itemIndex) {
                  case 0:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "Auto";
                        break;
                  case 1:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "";
                        break;
                  case 2:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "L";
                        break;
                  case 2:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "max(L, H)";
                        break;
            }
            this.par.custom_L_mapping.val = this.dialog.narrowbandCustomPalette_L_ComboBox.editText;
      };

      this.narrowbandCustomPalette_L_Label = new Label( this );
      this.narrowbandCustomPalette_L_Label.text = "L";
      this.narrowbandCustomPalette_L_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.narrowbandCustomPalette_L_Label.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;

      this.narrowbandCustomPalette_L_ComboBox = this.guitools.newComboBoxpalette(this, this.par.custom_L_mapping, [this.par.custom_L_mapping.val, "max(L, H)"], this.narrowbandLuminancePalette_ComboBox.toolTip);

      this.NbLuminanceLabel = new Label( this );
      this.NbLuminanceLabel.text = "Luminance mapping";
      this.NbLuminanceLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
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

      this.narrowbandSelectMultipleCheckBox = this.guitools.newCheckBox(this, "Use multiple mappings", this.par.use_narrowband_multiple_mappings, "Use multiple narrowband mappings.");
      this.narrowbandSelectMultipleLabel = this.guitools.newLabel(this, "Mappings", "");
      this.narrowbandSelectMultipleEdit = this.guitools.newTextEdit(this, this.par.narrowband_multiple_mappings_list, "");
      this.narrowbandSelectMultipleEdit.setFixedWidth(32 * this.font.width( 'M' ));
      this.narrowbandSelectMultipleButton = new PushButton(this);
      this.narrowbandSelectMultipleButton.text = "Select";
      this.narrowbandSelectMultipleButton.icon = this.scaledResource(":/icons/find.png");
      this.narrowbandSelectMultipleButton.toolTip = "<p>Select narrowband mappings.</p>";
      this.narrowbandSelectMultipleButton.onClick = () =>
      {
            let narrowbandSelectMultiple = new AutoIntegrateNarrowbandSelectMultipleDialog(global, this.par.narrowband_multiple_mappings_list.val);
            narrowbandSelectMultiple.windowTitle = "Select Narrowband Mappings";
            if (narrowbandSelectMultiple.execute()) {
                  if (narrowbandSelectMultiple.names == null) {
                        console.writeln("No mappings selected");
                        return;
                  }
                  console.writeln("Selected mappings " + narrowbandSelectMultiple.names);
                  this.dialog.narrowbandSelectMultipleEdit.text = narrowbandSelectMultiple.names;
                  this.par.narrowband_multiple_mappings_list.val = narrowbandSelectMultiple.names;
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
            
      this.useRGBNBmapping_CheckBox = this.guitools.newCheckBox(this, "Use Narrowband RGB mapping", this.par.use_RGBNB_Mapping, RGBNB_tooltip);
      this.RGBNB_gradient_correction_CheckBox = this.guitools.newCheckBox(this, "Gradient correction", this.par.RGBNB_gradient_correction, 
            "<p>Do gradient correction on narrowband image before mapping.</p>" );
      this.RGBNB_linear_fit_CheckBox = this.guitools.newCheckBox(this, "Linear fit", this.par.RGBNB_linear_fit, 
            "<p>Do linear fit on narrowband image before mapping. Not used with Add option.</p>" );
      this.useRGBbandwidth_CheckBox = this.guitools.newCheckBox(this, "Use RGB image", this.par.RGBNB_use_RGB_image, 
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
            "- Separate RGB channel files Integration_[RGB].<br>" +
            "- Those narrowband channel files Integration_[SHO] that are used in the mapping." +
            "</p><p>" +
            "To get required Integration_[RGB] and Integration_[SHO] channel files you can run a full workflow first." +
            "</p>";
      this.testNarrowbandMappingButton.onClick = () =>
      {
            console.writeln("Test narrowband mapping");
            this.par.use_RGBNB_Mapping.val = true;
            this.util.clearDefaultDirs();
            try {
                  this.engine.testRGBNBmapping();
                  this.util.setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  this.engine.writeProcessingStepsAndEndLog(null, true, this.ppar.win_prefix + "AutoRGBNB", true);
                  this.util.setDefaultDirs();
            }
            this.par.use_RGBNB_Mapping.val = false;
      };

      // channel mapping
      this.RGBNB_MappingLabel = this.guitools.newLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = this.guitools.newLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = this.guitools.newComboBox(this, this.par.RGBNB_L_mapping, this.RGBNB_mapping_values, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = this.guitools.newLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = this.guitools.newComboBox(this, this.par.RGBNB_R_mapping, this.RGBNB_mapping_values, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = this.guitools.newLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = this.guitools.newComboBox(this, this.par.RGBNB_G_mapping, this.RGBNB_mapping_values, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = this.guitools.newLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = this.guitools.newComboBox(this, this.par.RGBNB_B_mapping, this.RGBNB_mapping_values, this.RGBNB_MappingBLabel.toolTip);

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
      this.RGBNB_BoostLabel = this.guitools.newLabel(this, 'Boost', "Select boost, or multiplication factor, for the channels.");
      this.RGBNB_BoostLValue = this.guitools.newRGBNBNumericEdit(this, 'L', this.par.RGBNB_L_BoostFactor, "<p>Boost, or multiplication factor, for the L channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostRValue = this.guitools.newRGBNBNumericEdit(this, 'R', this.par.RGBNB_R_BoostFactor, "<p>Boost, or multiplication factor, for the R channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostGValue = this.guitools.newRGBNBNumericEdit(this, 'G', this.par.RGBNB_G_BoostFactor, "<p>Boost, or multiplication factor, for the G channel.</p>" + RGBNB_boost_common_tooltip);
      this.RGBNB_BoostBValue = this.guitools.newRGBNBNumericEdit(this, 'B', this.par.RGBNB_B_BoostFactor, "<p>Boost, or multiplication factor, for the B channel.</p>" + RGBNB_boost_common_tooltip);

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
      this.RGBNB_BandwidthLabel = this.guitools.newLabel(this, 'Bandwidth', "Select bandwidth (nm) for each filter.");
      this.RGBNB_BandwidthLValue = this.guitools.newRGBNBNumericEdit(this, 'L', this.par.RGBNB_L_bandwidth, "<p>Bandwidth (nm) for the L filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthRValue = this.guitools.newRGBNBNumericEdit(this, 'R', this.par.RGBNB_R_bandwidth, "<p>Bandwidth (nm) for the R filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthGValue = this.guitools.newRGBNBNumericEdit(this, 'G', this.par.RGBNB_G_bandwidth, "<p>Bandwidth (nm) for the G filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthBValue = this.guitools.newRGBNBNumericEdit(this, 'B', this.par.RGBNB_B_bandwidth, "<p>Bandwidth (nm) for the B filter.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthHValue = this.guitools.newRGBNBNumericEdit(this, 'H', this.par.RGBNB_H_bandwidth, "<p>Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthSValue = this.guitools.newRGBNBNumericEdit(this, 'S', this.par.RGBNB_S_bandwidth, "<p>Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);
      this.RGBNB_BandwidthOValue = this.guitools.newRGBNBNumericEdit(this, 'O', this.par.RGBNB_O_bandwidth, "<p>Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.</p>" + RGBNB_bandwidth_common_tooltip);

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
            "A special processing is used to add Ha to the RGB image." +
            "</p><p>" +
            "If Ha to RGB mapping is used then a narrowband color palette is not used." +
            "</p>" +
            "<p>Some good combinations are:</p>" + 
            "<ul>" +
            "<li>Continuum Subtract - Bright structure add</li>" +
            "<li>Continuum Subtract - Med subtract add</li>" +
            "<li>Continuum Subtract - Screen</li>" +
            "</ul>" +
            "<p>" +
            "Information for processing and formulas are collected from multiple sources, including:" +
            "</p>" + 
            "<ul>" +
            "<li>Night Photons website</li>" +
            "<li>VisibleDark YouTube channel</li>" +
            "</ul>" +
            "";

      this.useRGBHamapping_CheckBox = this.guitools.newCheckBox(this, "Use Ha RGB mapping", this.par.use_RGBHa_Mapping, RGBHa_tooltip);

      this.RGBHaPresetLabel = this.guitools.newLabel(this, "Preset", "<p>Some useful combinations to try.</p>" + RGBHa_tooltip);
      this.RGBHaPresetComboBox = this.guitools.newComboBox(this, this.par.RGBHa_preset, this.RGBHa_preset_values, this.RGBHaPresetLabel.toolTip);
      this.RGBHaPresetComboBox.onItemSelected = (itemIndex) =>
      {
            switch (this.RGBHa_preset_values[itemIndex]) {
                  case 'Combine Continuum Subtract':
                        this.par.RGBHa_prepare_method.val = 'Continuum Subtract';
                        this.par.RGBHa_combine_time.val = 'Stretched';
                        this.par.RGBHa_combine_method.val = 'Bright structure add';
                        this.par.RGBHa_Combine_BoostFactor.val = this.par.RGBHa_Combine_BoostFactor.def;
                        this.par.RGBHa_Combine_BoostFactor.reset();
                        break;
                  case 'SPCC Continuum Subtract':
                        this.par.RGBHa_prepare_method.val = 'Continuum Subtract';
                        this.par.RGBHa_combine_time.val = 'SPCC linear';
                        this.par.RGBHa_combine_method.val = 'Add';
                        this.par.RGBHa_Add_BoostFactor.val = this.par.RGBHa_Add_BoostFactor.def;
                        this.par.RGBHa_Add_BoostFactor.reset();
                        break;
                  case 'Max 0.7':   // Not used
                        this.par.RGBHa_prepare_method.val = 'Basic';
                        this.par.RGBHa_combine_time.val = 'Stretched';
                        this.par.RGBHa_combine_method.val = 'Max';
                        this.par.RGBHa_Combine_BoostFactor.val = 0.7;
                        this.par.RGBHa_Combine_BoostFactor.reset();
                        break;
                  default:
                        this.util.throwFatalError("Unknown preset " + this.RGBHa_preset_values[itemIndex]);
                        break;
            }
            this.par.RGBHa_prepare_method.reset();
            this.par.RGBHa_combine_time.reset();
            this.par.RGBHa_combine_method.reset();
      }

      this.RGBHaPrepareMethodLabel = this.guitools.newLabel(this, "Prepare Ha", RGBHa_tooltip);
      this.RGBHaPrepareMethodComboBox = this.guitools.newComboBox(this, this.par.RGBHa_prepare_method, this.RGBHa_prepare_method_values, RGBHa_tooltip);
      this.RGBHaCombineTimeLabel = this.guitools.newLabel(this, "Combine time", RGBHa_tooltip);
      this.RGBHaCombineTimeComboBox = this.guitools.newComboBox(this, this.par.RGBHa_combine_time, this.RGBHa_combine_time_values, RGBHa_tooltip);
      this.RGBHaCombineMethodLabel = this.guitools.newLabel(this, "Combine method", RGBHa_tooltip);
      this.RGBHaCombineMethodComboBox = this.guitools.newComboBox(this, this.par.RGBHa_combine_method, this.RGBHa_combine_method_values, RGBHa_tooltip);
      
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
      this.testRGBHaMappingButton.onClick = () =>
      {
            console.writeln("Test Ha mapping");
            this.util.clearDefaultDirs();
            try {
                  this.engine.testRGBHaMapping();
                  this.util.setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  this.engine.writeProcessingStepsAndEndLog(null, true, this.ppar.win_prefix + "AutoRGBHa", true);
                  this.util.setDefaultDirs();
            }
      };   
      this.testRGBHaMappingOptions = this.guitools.newComboBox(this, this.par.RGBHa_test_value, this.RGBHa_test_values, this.testRGBHaMappingButton.toolTip);

      // Boost factor for RGB
      var RGBHa_boost_common_tooltip = "<p>A bigger value will make the mapping more visible.</p>";
      this.RGBHa_BoostLabel = this.guitools.newLabel(this, 'Boost:', "Select boost, or multiplication factor.");
      this.RGBHa_CombineBoostValue = this.guitools.newRGBNBNumericEdit(this, 'Combine', this.par.RGBHa_Combine_BoostFactor, 
                                                         "<p>Boost, or multiplication factor, for combining R and Ha.</p>" + 
                                                         "<p>A bigger value will make the mapping more visible by increasing the amount of Ha.</p>" +
                                                         "<p>This value is used  with all other methods except Add.</p>");
      this.RGBHa_SPCCBoostValue = this.guitools.newRGBNBNumericEdit(this, 'Add', this.par.RGBHa_Add_BoostFactor, 
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

      this.RGBHa_noise_reduction_CheckBox = this.guitools.newCheckBox(this, "Noise reduction,", this.par.RGBHa_noise_reduction, 
            "<p>Do noise reduction on Ha image after mapping.</p>" );
      this.RGBHa_boost_edit = this.guitools.newNumericEdit(this, 'Continuum boost', this.par.RGBHa_boost, 0, 6, 
            "<b>Boost value for continuum subtracted image using ExponentialTransformation.</b>");
      this.RGBHa_gradient_correction_CheckBox = this.guitools.newCheckBox(this, "Gradient correction", this.par.RGBHa_gradient_correction, 
            "<p>Do gradient correction on Ha image before mapping.</p>" );
      this.RGBHa_smoothen_background_CheckBox = this.guitools.newCheckBox(this, "Smoothen", this.par.RGBHa_smoothen_background, 
            "<p>Smoothen background which may help with gradient correction. It may sometimes help with extreme cases for example when using ABE.</p>" +
            "<p>Select a percentage value below which smoothing is done. Usually values below 50 work best. Possible values are between 0 and 100.</p>");

      this.RGBHa_smoothen_background_value_edit = this.guitools.newNumericEditPrecision(this, 'value', this.par.RGBHa_smoothen_background_value, 0, 100, this.RGBHa_smoothen_background_CheckBox.toolTip, 2);
      this.RGBHa_remove_stars_CheckBox = this.guitools.newCheckBox(this, "Remove stars", this.par.RGBHa_remove_stars, 
            "<p>Remove stars before combining Ha to RGB.</p>" );

      this.RGBHa_Sizer2 = new HorizontalSizer;
      // this.RGBHa_Sizer2.margin = 6;
      this.RGBHa_Sizer2.spacing = 4;
      this.RGBHa_Sizer2.add( this.RGBHa_gradient_correction_CheckBox );
      this.RGBHa_Sizer2.add( this.RGBHa_smoothen_background_CheckBox );
      this.RGBHa_Sizer2.add( this.RGBHa_smoothen_background_value_edit );
      this.RGBHa_Sizer2.add( this.RGBHa_remove_stars_CheckBox );
      this.RGBHa_Sizer2.addStretch();

      this.RGBHa_Sizer3 = new HorizontalSizer;
      // this.RGBHa_Sizer2.margin = 6;
      this.RGBHa_Sizer3.spacing = 4;
      this.RGBHa_Sizer3.add( this.RGBHa_noise_reduction_CheckBox );
      this.RGBHa_Sizer3.add( this.RGBHa_boost_edit );
      this.RGBHa_Sizer3.addStretch();
      this.RGBHa_Sizer3.add( this.testRGBHaMappingButton );
      this.RGBHa_Sizer3.add( this.testRGBHaMappingOptions );

      this.RGBHa_Sizer = new VerticalSizer;
      // this.RGBHa_Sizer.margin = 6;
      this.RGBHa_Sizer.spacing = 4;
      this.RGBHa_Sizer.toolTip = RGBHa_tooltip;
      this.RGBHa_Sizer.add(this.useRGBHaMappingSizer);
      this.RGBHa_Sizer.add(this.useRGBHaMethodSizer);
      this.RGBHa_Sizer.add(this.RGBHa_BoostSizer);
      this.RGBHa_Sizer.add(this.RGBHa_Sizer2);
      this.RGBHa_Sizer.add(this.RGBHa_Sizer3);
      this.RGBHa_Sizer.addStretch();

      this.RGBHaMappingControl = new Control( this );
      this.RGBHaMappingControl.sizer = new VerticalSizer;
      this.RGBHaMappingControl.sizer.margin = 6;
      this.RGBHaMappingControl.sizer.spacing = 4;
      this.RGBHaMappingControl.sizer.add( this.RGBHa_Sizer );
      // hide this section by default
      this.RGBHaMappingControl.visible = false;

      var enhancementsGUIControls = this.enhancements_gui.createEnhancementsGUIControls(this);

      this.enhancementsTargetImageControl = enhancementsGUIControls.targetImageControl;
      this.enhancementsOptionsControl = enhancementsGUIControls.optionsControl;
      this.enhancementsGenericControl = enhancementsGUIControls.genericControl;
      this.enhancementsNarrowbandControl = enhancementsGUIControls.narrowbandControl;
      this.enhancementsStarsControl = enhancementsGUIControls.starsControl;
      this.enhancementsSelectiveColorControl3 = enhancementsGUIControls.selectiveColorControl;

      this.imageToolsControl = this.guitools.createImageToolsControl(this);
      this.imageToolsControl.visible = true;

      // Button to close all windows
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close prefix";
      this.closeAllButton.icon = this.scaledResource( ":/icons/window-close.png" );
      this.closeAllButton.toolTip = "<p>Close all windows that are created by this script using the <b>current prefix</b> (including empty prefix).</p>" +
                                    "<p>If Window Prefix is used then all windows with that prefix are closed. " +
                                    "To close all windows with all prefixes use button Close all prefixes</p>";
      this.closeAllButton.onClick = () =>
      {
            console.noteln("Close prefix");
            this.updateWindowPrefix();
            // Close all using the current this.ppar.win_prefix
            this.util.closeAllWindows(this.par.keep_integrated_images.val, false);
            var index = this.findPrefixIndex(this.ppar.win_prefix);
            if (index != -1) {
                  // If prefix was found update array
                  if (this.par.keep_integrated_images.val) {
                        // If we keep integrated images then we can start
                        // from zero icon position
                        this.ppar.prefixArray[index][2] = 0;
                  } else {
                        // Mark closed position as empty/free
                        this.ppar.prefixArray[index] = [ 0, '-', 0 ];
                        this.fix_win_prefix_array();
                  }
                  this.ppar.win_prefix = "";

                  this.savePersistentSettings(false);
                  //this.columnCountControlComboBox.currentItem = this.global.columnCount + 1;
            }
            this.update_enhancements_target_image_window_list(null);
            console.noteln("Close prefix completed");
      };

      this.closeAllPrefixButton = new PushButton( this );
      this.closeAllPrefixButton.text = "Close all prefixes";
      this.closeAllPrefixButton.icon = this.scaledResource( ":/icons/window-close-all.png" );
      this.closeAllPrefixButton.toolTip = "<p>!!! See setWindowPrefixHelpTip !!!</p>";
      this.closeAllPrefixButton.onClick = () =>
      {
            console.noteln("Close all prefixes");
            try {
                  this.updateWindowPrefix();
                  // Always close default/empty prefix
                  // For delete to work we need to update fixed window
                  // names with the prefix we use for closing
                  this.util.fixAllWindowArrays("");
                  console.writeln("Close default empty prefix");
                  this.util.closeAllWindows(this.par.keep_integrated_images.val, false);
                  if (this.ppar.win_prefix != "" && this.findPrefixIndex(this.ppar.win_prefix) == -1) {
                        // Window prefix box has unsaved prefix, clear that too.
                        var prefix = this.validateWindowPrefix(this.ppar.win_prefix);
                        console.writeln("Close prefix '" + prefix + "'");
                        this.util.fixAllWindowArrays(prefix);
                        this.util.closeAllWindows(this.par.keep_integrated_images.val, false);
                  }
                  // Go through the prefix list
                  for (var i = 0; i < this.ppar.prefixArray.length; i++) {
                        if (this.ppar.prefixArray[i][1] != '-') {
                              var prefix = this.validateWindowPrefix(this.ppar.prefixArray[i][1]);
                              console.writeln("Close prefix '" + prefix + "'");
                              this.util.fixAllWindowArrays(prefix);
                              this.util.closeAllWindows(this.par.keep_integrated_images.val, false);
                              if (this.par.keep_integrated_images.val) {
                                    // If we keep integrated images then we can start
                                    // from zero icon position
                                    this.ppar.prefixArray[i][2] = 0;
                              } else {
                                    // Mark closed position as empty/free
                                    this.ppar.prefixArray[i] = [ 0, '-', 0 ];
                              }
                        }
                  }
                  if (this.par.use_manual_icon_column.val && this.ppar.userColumnCount != -1) {
                        this.ppar.userColumnCount = 0;
                  }
            }  catch (x) {
                  console.writeln( x );
            }
            this.fix_win_prefix_array();
            this.savePersistentSettings(false);
            // restore original prefix
            this.util.fixAllWindowArrays(this.ppar.win_prefix);
            this.update_enhancements_target_image_window_list(null);
            console.noteln("Close all prefixes completed");
      };

      // Add "Welcome" button to menu or toolbar
      this.welcomeButton = new PushButton(this);
      this.welcomeButton.text = "Welcome";
      this.welcomeButton.icon = this.scaledResource(":/icons/info.png");
      this.welcomeButton.toolTip = "Show welcome screen";
      this.welcomeButton.onClick = () => {
            this.dialog.showWelcomeDialog(this.dialog.global);
      };
    
      this.tutorialButton = new PushButton(this);
      this.tutorialButton.text = "Tutorials";
      this.tutorialButton.icon = this.scaledResource(":/icons/help.png");
      this.tutorialButton.onClick = () => {
            this.dialog.showTutorialManager();
      };

      if (this.global.use_preview) {
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
            this.newFlowchartButton.onClick = () =>
            {
                  if (this.global.is_processing != this.global.processing_state.none) {
                        return;
                  }

                  console.noteln("New flowchart");
                  if (this.generateNewFlowchartData(this.parent)) {
                        this.flowchartUpdated();
                        console.noteln("Flowchart updated");
                  } else {
                        console.noteln("No flowchart data available");
                  }
            };

            this.showFlowchartCheckBox = this.guitools.newCheckBoxEx(this, "Show Flowchart", this.par.show_flowchart, 
                  "<p>Switch between flowchart and image view if flowchart is available.</p>" +
                  "<p>Can be checked during processing. In that case live updates to the flowchart are shown.</p>" + 
                  "<p>If Flowchart setting <i>Get flowchart data before processing</i> is checked then the live flowchart " + 
                  "view uses full processing this.flowchart.</p>" + 
                  this.guitools.skip_reset_tooltip,
                  function(checked) { 
                        this.par.show_flowchart.val = checked;
                        if (checked) {
                              if (this.global.flowchartData != null) {
                                    this.flowchartUpdated();
                              } else {
                                    console.noteln("No flowchart data available");
                              }
                        } else {
                              if (this.guitools.current_preview.image != null) {
                                    previewControl.SetImage(this.guitools.current_preview.image, this.guitools.current_preview.txt);
                              }
                        }
                  });

            var showFlowchartToolTip = 
                  "<h4>Generate Flowchart</h4>" +
                  "<p>" +
                  "Using the New Flowchart button the script will generate a flowchart of the processing workflow. " +
                  "Flowchart uses the current settings and images. A partially simulated minimal workflow is run to " +
                  "generate flowchart information. To run the simulated workflow all relevant files must be loaded " +
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
                  "checkbox it is possible to switch between the current preview image and this.flowchart." +
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
            this.showFlowchartHelpTips.onClick = () =>
            {
                  new MessageBox(showFlowchartToolTip, "Show Flowchart", StdIcon.Information ).execute();
            }
      }

      this.previewAutoSTFCheckBox = this.guitools.newCheckBoxEx(this, "AutoSTF", this.par.preview_autostf, 
            "<p>When checked, a preview image during the processing is always shown in a stretched (non-linear) format. " + 
            "Image name on top of the preview window has text AutoSTF when image is stretched for preview.</p>" + 
            "<p>When unchecked preview image is shown in original format.</p>" +
            "<p>Stretched format can be useful for visualizing the current processed image.</p>",
            function(checked) { 
                  this.par.preview_autostf.val = checked;
                  if (this.guitools.current_preview.image != null) {
                        if (checked) {
                              this.guitools.current_preview.image = this.guitools.current_preview.image_versions[1].image;
                              this.guitools.current_preview.txt = this.guitools.current_preview.image_versions[1].txt;
                        } else {
                              this.guitools.current_preview.image = this.guitools.current_preview.image_versions[0].image;
                              this.guitools.current_preview.txt = this.guitools.current_preview.image_versions[0].txt;
                        }
                  }
                  if (this.par.show_flowchart.val) {
                        if (this.global.flowchartData != null) {
                              this.flowchartUpdated();
                        } else {
                              // console.noteln("No flowchart data available");
                        }
                  } else {
                        if (this.guitools.current_preview.image != null) {
                              previewControl.SetImage(this.guitools.current_preview.image, this.guitools.current_preview.txt);
                        }
                  }
            });

      this.resampleCheckBox = this.guitools.newCheckBox(this, "Resample", this.par.preview_resample, 
            "<p>Use Resample process to reduce the size of preview images. The target image size can be changed in the <i>Interface</i> tab.</p>" +
            "<p>Resample will make it faster to blink through images. Only the preview image is resample, original image is not modified.</p>" +
            "<p>Note that resample may alter how preview image and histogram are shown during the preview.</p>");

      if (this.par.use_manual_icon_column.val) {
            this.columnCountControlLabel = new Label( this );
            this.columnCountControlLabel.text = "Icon Column ";
            this.columnCountControlLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
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
            this.guitools.this.guitools.addArrayToComboBox(this.columnCountControlComboBox, this.column_count_values);
            if (this.ppar.userColumnCount == -1) {
                  this.columnCountControlComboBox.currentItem = 0;
            } else {
                  this.columnCountControlComboBox.currentItem = this.ppar.userColumnCount + 1;
            }
            this.columnCountControlComboBox.toolTip = this.columnCountControlLabel.toolTip;
            this.columnCountControlComboBox.onItemSelected = (itemIndex) =>
            {
                  if (itemIndex == 0) {
                        // Auto
                        this.ppar.userColumnCount = -1;
                  } else {
                        // Combo box values start with one but in the code
                        // we want values to start with zero.
                        this.ppar.userColumnCount = parseInt(this.column_count_values[itemIndex]) - 1;
                  }
            };
      }

      // Buttons for saving final images in different formats
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSaveXisfButton.onClick = () =>
      {
            console.writeln("Save XISF");
            this.util.saveAllFinalImageWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave16bitButton.onClick = () =>
      {
            console.writeln("Save 16 bit TIFF");
            this.util.saveAllFinalImageWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave8bitButton.onClick = () =>
      {
            console.writeln("Save 8 bit TIFF");
            this.util.saveAllFinalImageWindows(8);
      };   
      this.mosaicSaveJpgButton = new PushButton( this );
      this.mosaicSaveJpgButton.text = "JPG";
      this.mosaicSaveJpgButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSaveJpgButton.onClick = () =>
      {
            console.writeln("Save JPG");
            this.util.saveAllFinalImageWindows(1);
      };   
      this.saveButtonsSizer = this.guitools.newHorizontalSizer(4, true, [ this.mosaicSaveXisfButton, this.mosaicSave16bitButton, this.mosaicSave8bitButton, this.mosaicSaveJpgButton ]);

      this.saveFinalImageLabel = this.guitools.newLabel(this, "Autosave final image as");
      this.saveFinalImageTiffCheckBox = this.guitools.newCheckBox(this, "TIFF", this.par.save_final_image_tiff, 
            "<p>Automatically save the final image also as a 16-bit TIFF image.</p>" +
            "<p>By default the final image is automatically saved only in XISF format.</p>");
      this.saveFinalImageJpgCheckBox = this.guitools.newCheckBox(this, "JPG", this.par.save_final_image_jpg, 
            "<p>Automatically save the final image also as a JPG image.</p>" +
            "<p>By default the final image is automatically saved only in XISF format.</p>");
      this.saveFinalImageJpgQualityEdit = this.guitools.newNumericEditPrecision(this, "quality", this.par.save_final_image_jpg_quality, 20, 100, "Quality of the JPG image.", 0);
      
      this.saveFinalImageSizer = this.guitools.newHorizontalSizer(4, true, [ this.saveFinalImageLabel, this.saveFinalImageTiffCheckBox, this.saveFinalImageJpgCheckBox, this.saveFinalImageJpgQualityEdit ]);
      
      this.saveFinalImageControl = new Control( this );
      this.saveFinalImageControl.sizer = new VerticalSizer;
      this.saveFinalImageControl.sizer.margin = 6;
      this.saveFinalImageControl.sizer.spacing = 4;
      this.saveFinalImageControl.sizer.add( this.saveButtonsSizer );
      this.saveFinalImageControl.sizer.add( this.saveFinalImageSizer );
      this.saveFinalImageControl.visible = false;

      /* Interface.
       */

      this.screenSizeLabel = this.guitools.newLabel(this, "Screen size: " + this.screen_size, "Screen size as reported by PixInsight.");

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
      this.saveInterfaceButton.onClick = () => {
            this.savePersistentSettings(false);
      };

      this.show_preview_CheckBox = this.guitools.newPparCheckBox(this, "Enable preview", this.ppar, this.ppar.preview.use_preview, 
            "Enable image preview on script preview window. You need to restart the script before this setting is effective.",
            function(checked) { this.dialog.show_preview_CheckBox.aiParam.preview.use_preview = checked; });

      this.show_histogram_CheckBox = this.guitools.newPparCheckBox(this, "Show histogram", this.ppar, this.ppar.preview.show_histogram, 
            "<p>Show image histogram.</p>",
            function(checked) { this.dialog.show_histogram_CheckBox.aiParam.preview.show_histogram = checked; });

      this.show_black_background_CheckBox = this.guitools.newPparCheckBox(this, "Black background", this.ppar, this.ppar.preview.black_background, 
            "<p>Use pure black as an image background. It may help to check that background is not made too dark.</p>",
            function(checked) { this.dialog.show_black_background_CheckBox.aiParam.preview.black_background = checked; });

      this.show_startup_image_CheckBox = this.guitools.newPparCheckBox(this, "Startup image", this.ppar, this.ppar.show_startup_image, 
            "<p>Show startup image in preview window.</p>",
            function(checked) { this.dialog.show_startup_image_CheckBox.aiParam.show_startup_image = checked; });
      this.startup_image_name_Edit = this.guitools.newPparTextEdit(this, this.ppar, this.ppar.startup_image_name, 
            "<p>Startup image name.</p>" +
            "<p>You can set your own startup image here.</p>" + 
            "<p><b>NOTE!</b> Remember to use the Save button to save the name to persistent module settings.</p>",
            function(value) { this.ppar.startup_image_name = value; });
      this.startup_image_name_Button = new ToolButton( this );
      this.startup_image_name_Button.icon = this.scaledResource(":/icons/select-file.png");
      this.startup_image_name_Button.toolTip = this.startup_image_name_Edit.toolTip;
      this.startup_image_name_Button.setScaledFixedSize( 20, 20 );
      this.startup_image_name_Button.onClick = () =>
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            this.dialog.startup_image_name_Edit.text = ofd.fileName;
            this.ppar.startup_image_name = ofd.fileName;
      };
      
      this.preview1Sizer = new HorizontalSizer;
      this.preview1Sizer.margin = 6;
      this.preview1Sizer.spacing = 4;
      this.preview1Sizer.add( this.show_preview_CheckBox );
      this.preview1Sizer.add( this.show_histogram_CheckBox );
      this.preview1Sizer.addStretch();

      this.preview10SizerLabel = this.guitools.newLabel(this, 'Preview options', "Options for preview image.");
      this.preview10Sizer = new HorizontalSizer;
      this.preview10Sizer.margin = 6;
      this.preview10Sizer.spacing = 4;
      this.preview10Sizer.add( this.preview10SizerLabel );
      this.preview10Sizer.add( this.previewAutoSTFCheckBox );
      this.preview10Sizer.add( this.resampleCheckBox );
      this.preview10Sizer.add( this.show_black_background_CheckBox );
      this.preview10Sizer.addStretch();

      this.preview11Sizer = new HorizontalSizer;
      this.preview11Sizer.margin = 6;
      this.preview11Sizer.spacing = 4;
      this.preview11Sizer.add( this.show_startup_image_CheckBox );
      this.preview11Sizer.add( this.startup_image_name_Edit );
      this.preview11Sizer.add( this.startup_image_name_Button );
      this.preview11Sizer.addStretch();

      this.side_preview_width_label = this.guitools.newLabel(this, 'Preview width', "Preview image width.");
      this.side_preview_width_edit = this.guitools.newPparSpinBox(this, this.ppar, this.ppar.preview.side_preview_width, 100, 4000, 
            "Preview image width.",
            function(value) { 
                  this.updatePreviewSize(0, 0, 0, value, 0); 
            }
      );
      this.side_preview_height_label = this.guitools.newLabel(this, 'height', "Preview image height.");
      this.side_preview_height_edit = this.guitools.newPparSpinBox(this, this.ppar, this.ppar.preview.side_preview_height, 100, 4000, 
            "Preview image height.",
            function(value) { 
                  this.updatePreviewSize(0, 0, 0, 0, value); 
            }
      );

      this.side_histogram_height_label = this.guitools.newLabel(this, 'Preview histogram height', "Image histogram height in preview.");
      this.side_histogram_height_edit = this.guitools.newPparSpinBox(this, this.ppar, this.ppar.preview.side_histogram_height, 50, 2000, 
            this.side_histogram_height_label.toolTip,
            function(value) { 
                  this.updatePreviewSize(0, 0, 0, 0, 0, value);
            }
      );

      this.preview2Sizer = new HorizontalSizer;
      this.preview2Sizer.margin = 6;
      this.preview2Sizer.spacing = 4;
      this.preview2Sizer.add( this.side_preview_width_label );
      this.preview2Sizer.add( this.side_preview_width_edit );
      this.preview2Sizer.add( this.side_preview_height_label );
      this.preview2Sizer.add( this.side_preview_height_edit );
      this.preview2Sizer.add( this.side_histogram_height_label );
      this.preview2Sizer.add( this.side_histogram_height_edit );
      this.preview2Sizer.addStretch();
      this.preview2Sizer.add( this.saveInterfaceButton );

      this.resample_target_Label = this.guitools.newLabel(this, 'Resample target', "<p>Target size for preview image resample.</p>" +
                                                                     "<p>Note that resample may alter how preview image and histogram are shown during the preview.</p>");

      this.resample_target_SpinBox = this.guitools.newSpinBox(this, this.par.preview_resample_target, 100, 10000, this.resample_target_Label.toolTip);

      this.preview4Sizer = new HorizontalSizer;
      this.preview4Sizer.margin = 6;
      this.preview4Sizer.spacing = 4;
      this.preview4Sizer.add( this.resample_target_Label );
      this.preview4Sizer.add( this.resample_target_SpinBox );
      this.preview4Sizer.addStretch();

      this.processConsole_label = this.guitools.newLabel(this, 'Process console', "Show or hide process console.");

      this.hideProcessConsoleButton = new PushButton( this );
      this.hideProcessConsoleButton.text = "Hide";
      this.hideProcessConsoleButton.icon = this.scaledResource( ":/auto-hide/hide.png" );
      this.hideProcessConsoleButton.toolTip = "<p>Hide Process Console.</p>";
      this.hideProcessConsoleButton.onClick = () => {
            console.hide();
            this.global.console_hidden = true;
      };

      this.showProcessConsoleButton = new PushButton( this );
      this.showProcessConsoleButton.text = "Show";
      this.showProcessConsoleButton.icon = this.scaledResource( ":/toolbar/view-process-console.png" );
      this.showProcessConsoleButton.toolTip = "<p>Show Process Console.</p>";
      this.showProcessConsoleButton.onClick = () => {
            console.show();
            this.global.console_hidden = false;
      };

      this.interfaceSizer = new HorizontalSizer;
      this.interfaceSizer.margin = 6;
      this.interfaceSizer.spacing = 4;
      this.interfaceSizer.add( this.processConsole_label );
      this.interfaceSizer.add( this.showProcessConsoleButton );
      this.interfaceSizer.add( this.hideProcessConsoleButton );
      this.interfaceSizer.addStretch();

      if (this.par.use_manual_icon_column.val) {
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
      this.interfaceSizer2.addStretch();

      this.interfaceControl = new Control( this );
      this.interfaceControl.sizer = new VerticalSizer;
      this.interfaceControl.sizer.margin = 6;
      this.interfaceControl.sizer.spacing = 4;
      this.interfaceControl.sizer.add( this.preview0Sizer );
      this.interfaceControl.sizer.add( this.preview1Sizer );
      this.interfaceControl.sizer.add( this.preview10Sizer );
      this.interfaceControl.sizer.add( this.preview11Sizer );
      this.interfaceControl.sizer.add( this.preview2Sizer );
      this.interfaceControl.sizer.add( this.preview4Sizer );
      this.interfaceControl.sizer.add( this.interfaceSizer );
      if (this.par.use_manual_icon_column.val) {
            this.interfaceControl.sizer.add( this.interfaceManualColumnSizer );
      }
      this.interfaceControl.sizer.add( this.interfaceSizer2 );

      this.interfaceControl.sizer.addStretch();
      this.interfaceControl.visible = true;

      this.runGetFlowchartDataCheckBox = this.guitools.newCheckBox(this, "Get flowchart data before processing", this.par.run_get_flowchart_data, 
            "<p>Get the full flowchart data before processing when a normal processing is done using the Run button. This makes it possible to follow progress " +
            "in the complete flowchart if Show Flowchart is checked.</p>" +
            "<p>If this option is not checked or AutoContinue or batch processing is done, flowchart data is generated during processing.</p>" +
            this.guitools.skip_reset_tooltip);
      this.flowchartBackgroundImageCheckBox = this.guitools.newCheckBox(this, "Flowchart show processed image", this.par.flowchart_background_image, 
            "<p>If checked then the current processed image is shown in the flowchart background.</p>" +
            this.guitools.skip_reset_tooltip);
      this.flowchartTimeCheckBox = this.guitools.newCheckBox(this, "Flowchart show processing time", this.par.flowchart_time, 
            "<p>If checked then the operation processing time is shown in the this.flowchart.</p>" +
            this.guitools.skip_reset_tooltip);
      this.flowchartSaveImageCheckBox = this.guitools.newCheckBox(this, "Flowchart save image", this.par.flowchart_saveimage, 
            "<p>If checked then the flowchart image is saved into AutoProcessed directory after processing is complete.</p>" +
            this.guitools.skip_reset_tooltip);
                  
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

      this.processDefaultsButton = new PushButton( this );
      this.processDefaultsButton.text = "Print process defaults";
      this.processDefaultsButton.toolTip = "<p>Print process default values to the console. For debugging purposes.</p>";
      this.processDefaultsButton.onClick = () => {
            this.engine.getProcessDefaultValues();
      }
      this.processDefaultsSizer = new HorizontalSizer;
      this.processDefaultsSizer.margin = 6;
      this.processDefaultsSizer.spacing = 4;
      this.processDefaultsSizer.add( this.processDefaultsButton );
      this.processDefaultsSizer.addStretch();

      this.debugControl = new Control( this );
      this.debugControl.sizer = new VerticalSizer;
      this.debugControl.sizer.margin = 6;
      this.debugControl.sizer.spacing = 4;
      this.debugControl.sizer.add( this.printProcessValuesCheckBox );
      this.debugControl.sizer.add( this.debugCheckBox );
      this.debugControl.sizer.add( this.flowchartDebugCheckBox );
      this.debugControl.sizer.add( this.keepProcessedImagesCheckBox );
      this.debugControl.sizer.add( this.keepTemporaryImagesCheckBox );
      this.debugControl.sizer.add( this.processDefaultsSizer );
      this.debugControl.sizer.addStretch();
      this.debugControl.visible = false;

      this.newInstance_Button = new ToolButton(this);
      this.newInstance_Button.icon = new Bitmap( ":/process-interface/new-instance.png" );
      this.newInstance_Button.toolTip = "<p>New Instance</p>";
      this.newInstance_Button.onMousePress = () =>
      {
         this.hasFocus = true;
         this.saveParametersToProcessIcon();
         this.pushed = false;
         this.dialog.newInstance();
         console.noteln("New instance created");
      };
      this.savedefaults_Button = new ToolButton(this);
      this.savedefaults_Button.icon = new Bitmap( ":/process-interface/edit-preferences.png" );
      this.savedefaults_Button.toolTip = 
            "<p>Save all current parameter values using the PixInsight persistent module settings mechanism. Saved parameter " + 
            "values are remembered and automatically restored when the script starts.</p> " +
            "<p>Persistent module settings are overwritten by any settings restored from process icon.</p>" +
            "<p>Set default button sets default values for all parameters.</p>";
      this.savedefaults_Button.onClick = () =>
      {
            // We ask for confirmation in function saveParametersToPersistentModuleSettings
            this.saveParametersToPersistentModuleSettings();
      };
      this.reset_Button = new ToolButton(this);
      this.reset_Button.icon = new Bitmap( ":/images/icons/reset.png" );
      this.reset_Button.toolTip = "<p>Set default values for all parameters.</p>";
      this.reset_Button.onClick = () =>
      {
            // Ask for confirmation before setting default values because it can not be undone.
            var mb = new MessageBox("<p>Are you sure you want to set default values for all parameters?</p>" +
                                    "<p>This can not be undone.</p>", "Set default values", StdIcon.Question, StdButton.Yes, StdButton.No);
            if (mb.execute() != StdButton.Yes) {
                  return;
            }
            this.util.setParameterDefaults();
      };
      this.changedParametersButton = new ToolButton(this);
      this.changedParametersButton.icon = new Bitmap( ":/icons/document-edit.png" );
      this.changedParametersButton.toolTip = "<p>Print non-default parameter values to the Process Console.</p>";
      this.changedParametersButton.onClick = () =>
      {
            var processingOptions = this.engine.getChangedProcessingOptions();
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
      this.website_Button.onClick = () =>
      {
            Dialog.openBrowser(this.global.autointegrateinfo_link);
      };

      this.adjusttocontent_Button = this.newAdjustToContentButton(this);
   
      this.infoLabel = new Label( this );
      this.infoLabel.text = "";
      this.infoLabel = this.infoLabel;

      this.imageInfoLabel = new Label( this );
      this.imageInfoLabel.text = "";
      this.imageInfoLabel.textAlignment = TextAlignment.VertCenter;
      this.imageInfoLabel = this.imageInfoLabel;

      this.info1_Sizer = new HorizontalSizer;
      this.info1_Sizer.spacing = 6;
      this.info1_Sizer.add( this.infoLabel );
      this.info1_Sizer.addSpacing( 6 );
      this.info1_Sizer.add( this.imageInfoLabel );
      this.info1_Sizer.addStretch();

      if (!this.global.use_preview) {
            this.statusInfoLabel = new Label( this );
            this.statusInfoLabel.text = "";
            this.statusInfoLabel.textAlignment = TextAlignment.VertCenter;
            this.global.statusInfoLabel = this.statusInfoLabel;

            this.info2_Sizer = new HorizontalSizer;
            this.info2_Sizer.spacing = 6;
            this.info2_Sizer.add( this.statusInfoLabel );
            this.info2_Sizer.addStretch();
      }

      this.info_Sizer = new VerticalSizer;
      this.info_Sizer.add( this.info1_Sizer );
      if (!this.global.use_preview) {
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
      if (this.global.use_preview) {
            this.buttons_Sizer.addSpacing( 48 );
            this.buttons_Sizer.add( this.newFlowchartButton );
            this.buttons_Sizer.add( this.showFlowchartCheckBox );
            this.buttons_Sizer.add( this.showFlowchartHelpTips );
            // this.buttons_Sizer.add( this.previewAutoSTFCheckBox );
            // this.buttons_Sizer.add( this.resampleCheckBox );
      }
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.addSpacing( 12 );
      this.buttons_Sizer.add( this.closeAllPrefixButton );
      this.buttons_Sizer.addSpacing( 24 );
      this.buttons_Sizer.add( this.closeAllButton );
      this.buttons_Sizer.add( this.autoContinueButton );
      this.buttons_Sizer.add( this.autoContinuePrefixSizer);
      this.buttons_Sizer.add( this.cancel_Button );
      this.buttons_Sizer.addSpacing( 12 );
      this.buttons_Sizer.add( this.run_Button );
      this.buttons_Sizer.add( this.exit_Button );

      /***********************************************\
       * Collect all items into GroupBox objects.
      \***********************************************/

      // ---------------------------------------------
      // Settings group box
      // ---------------------------------------------
      this.settingsGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAdd(this, this.settingsGroupBox, this.imageParamsControl, "Image processing parameters", "Image1");
      this.guitools.newSectionBarAdd(this, this.settingsGroupBox, this.imageToolsControl, "Tools", "ImageTools");
      var sb = this.guitools.newSectionBarAdd(this, this.settingsGroupBox, this.imageToolsOtherControl, "Other", "ImageToolsOther");
      this.global.expert_mode_sections.push(sb);
      this.global.expert_mode_controls.push(this.imageToolsOtherControl);
      this.guitools.newSectionBarAdd(this, this.settingsGroupBox, this.narrowbandControl, "Narrowband processing", "Narrowband1");
      this.guitools.newSectionBarAdd(this, this.settingsGroupBox, this.saveFinalImageControl, "Save final image files", "Savefinalimagefiles");
      this.settingsGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Other group box
      // ---------------------------------------------
      this.otherGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAdd(this, this.otherGroupBox, this.otherParamsControl, "Other parameters", "Other1");
      this.guitools.newSectionBarAdd(this, this.otherGroupBox, this.systemParamsControl, "System settings", "System1");
      this.guitools.newSectionBarAdd(this, this.otherGroupBox, this.astrobinControl, "Astrobin", "Astrobin");
      this.otherGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Preprocessing group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create preprocessing group box");
      this.preprocessingGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAddArray(this, this.preprocessingGroupBox, "Image calibration", "ps_calibration",
            [ this.calibrationGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.preprocessingGroupBox, "Cosmetic correction", "ps_CC",
            [ this.cosmeticCorrectionGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.preprocessingGroupBox, "Star and comet alignment ", "ps_alignment",
            [ this.StarAlignmentGroupBoxLabel,
            this.StarAlignmentGroupBoxSizer,
            this.cometAlignmentGroupBoxLabel,
            this.cometAlignmentGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.preprocessingGroupBox, "Weighting and filtering", "ps_weighting",
            [ this.weightSizer ]);
      this.guitools.newSectionBarAddArray(this, this.preprocessingGroupBox, "Banding and binning", "ps_binning_banding",
            [ this.bandingGroupBoxLabel,
            this.bandingGroupBoxSizer,
            this.binningGroupBoxLabel,
            this.binningGroupBoxSizer ]);
      this.preprocessingGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Integration Group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create integration group box");
      this.integrationGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAddArray(this, this.integrationGroupBox, "Image integration", "ps_integration",
            [ this.clippingGroupBoxLabel,
            this.clippingGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.integrationGroupBox, "FastIntegration", "ps_fastintegration",
            [ this.fastIntegrationGroupBoxLabel,
            this.fastIntegrationGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.integrationGroupBox, "Local normalization and drizzle", "ps_localnorm",
            [ this.localNormalizationGroupBoxLabel,
            this.localNormalizationGroupBoxSizer,
            this.drizzleGroupBoxLabel,
            this.drizzleGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.integrationGroupBox, "Crop", "ps_crop",
            [ this.CropToleranceGroupBoxLabel, this.CropSizer ]);
      this.guitools.newSectionBarAddArray(this, this.integrationGroupBox, "Linear fit, LRGB combination settings", "ps_linearfit_combination",
            [ this.linearFitGroupBoxLabel, this.linearFitSizer, 
              this.LRGBCombinationGroupBoxLabel, this.LRGBCombinationSizer ]);
      this.integrationGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Postprocessing group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create postprocessing group box");

      this.postProcessingGroupBox = this.guitools.newGroupBoxSizer(this);
      this.StretchingSettingsGroupBoxSizer = this.guitools.createStretchingSettingsSizer(this, this.engine, 2);

      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Stretching", "ps_stretching",
            [ this.StretchingSettingsGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Star stretching and removing", "ps_starstretching",
            [ this.StarStretchingGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "RGB stars", "ps_rgb_stars",
            [ this.RGBStarsGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Gradient correction, ABE settings, DBE settings", "ps_ave_graxpert",
            [ this.GCStarXSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Saturation", "ps_saturation",
            [ this.saturationGroupBoxLabel,
            this.saturationGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Noise reduction", "ps_noise",
            [ this.noiseReductionGroupBoxLabel1,
            this.noiseReductionGroupBoxSizer1,
            this.noiseReductionGroupBoxLabel2,
            this.noiseReductionGroupBoxSizer2,
            this.noiseReductionGroupBoxLabel3,
            this.noiseReductionGroupBoxSizer3,
            this.noiseReductionGroupBoxLabel4,
            this.noiseReductionGroupBoxSizer4,
            this.noiseReductionGroupBoxLabel5,
            this.noiseReductionGroupBoxSizer5 ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Image solving", "ps_imagesolving",
            [ this.imageSolvingGroupBoxLabel,
            this.imageSolvingGroupBoxSizer ]);
      this.guitools.newSectionBarAddArray(this, this.postProcessingGroupBox, "Color calibration", "ps_colorcalibration",
            [ this.colorCalibrationGroupBoxLabel,
            this.colorCalibrationSizer,
            this.spccGroupBoxLabel,
            this.spccGroupBoxSizer ]);
      this.guitools.newSectionBarAdd(this, this.postProcessingGroupBox, this.narrowbandRGBmappingControl, "Narrowband to RGB mapping", "NarrowbandRGB1");
      this.guitools.newSectionBarAdd(this, this.postProcessingGroupBox, this.RGBHaMappingControl, "Ha to RGB mapping", "NarrowbandRGB2");
      this.postProcessingGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Tools group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create tools group box");
      this.toolsGroupBox = this.guitools.newGroupBoxSizer(this);
      var sb_control = this.guitools.newSectionBarAddArray(this, this.toolsGroupBox, "StarXTerminator, BlurXTerminator, NoiseXTerminator", "ps_rcastro",
            [ this.StarXTerminatorGroupBoxLabel,
            this.StarXTerminatorSizer,
            this.blurxterminatorGroupBoxLabel,
            this.blurxterminatorGroupBoxSizer,
            this.NoiseXTerminatorInfoGroupBoxLabel,
            this.NoiseXTerminatorInfoSizer ]);
      this.global.expert_mode_sections.push(sb_control.section);
      this.global.expert_mode_controls.push(sb_control.control);
      this.guitools.newSectionBarAddArray(this, this.toolsGroupBox, "GraXpert", "ps_graxpert",
            [ this.graxpertGroupBoxSizer  ]);
      this.toolsGroupBox.sizer.addStretch();

      // ---------------------------------------------
      // Enhancements group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create enhancementsGroupBox");
      this.enhancementsGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsTargetImageControl, "Target image for enhancements", "EnhancementsTarget");
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsOptionsControl, "Misc options", "EnhancementsOptions");
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsNarrowbandControl, "Narrowband enhancements", "Enhancements2");
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsSelectiveColorControl3, "Selective Color", "Enhancements3");
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGenericControl, "Generic enhancements", "Enhancements1");
      this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsStarsControl, "Stars enhancements", "EnhancementsStars");
      this.enhancementsGroupBox.sizer.addStretch();

      if (this.global.use_preview) {
            /* Create preview objects.
             */
            if (this.global.debug) console.writeln("Create preview objects");
            this.previewObj = this.newPreviewObj(this);
            this.histogramControl = this.newHistogramControl(this);

            this.previewControl = this.previewObj.control;
            this.previewInfoLabel = this.previewObj.infolabel;
            this.global.statusInfoLabel = this.previewObj.statuslabel;
      }

      // ---------------------------------------------
      // Interface group box
      // ---------------------------------------------
      if (this.global.debug) console.writeln("Create interfaceGroupBox");
      this.interfaceGroupBox = this.guitools.newGroupBoxSizer(this);
      this.guitools.newSectionBarAdd(this, this.interfaceGroupBox, this.interfaceControl, "Interface settings", "interface");
      this.guitools.newSectionBarAdd(this, this.interfaceGroupBox, this.flowchartControl, "Flowchart settings", "Flowchart");
      var sb = this.guitools.newSectionBarAdd(this, this.interfaceGroupBox, this.debugControl, "Debug settings", "debugsettings");
      this.global.expert_mode_sections.push(sb);
      this.global.expert_mode_controls.push(this.debugControl);
      this.interfaceGroupBox.sizer.addStretch();

      /***********************************************\
       * Create tabs.
      \***********************************************/

      if (this.global.debug) console.writeln("Create tabs");

      this.mainTabBox = new TabBox( this );
      this.mainTabBox = this.mainTabBox;

      this.pageButtonsSizer = this.newPageButtonsSizer(this);
      this.filesTabSizer = new VerticalSizer;
      this.filesTabSizer.margin = 6;
      this.filesTabSizer.spacing = 4;
      this.filesTabSizer.add( this.tabBox );
      this.filesTabSizer.add( this.filesButtonsSizer );
      this.filesTabSizer.add( this.pageButtonsSizer );
      this.filesPage = { page: this.mainSizerTab(this, this.filesTabSizer), name: "Files", expert_mode: false };
      this.global.tabs.push(this.filesPage);
      this.mainTabBox.addPage( this.filesPage.page, this.filesPage.name );

      this.settingsTabSizer = new HorizontalSizer;
      this.settingsTabSizer.margin = 6;
      this.settingsTabSizer.spacing = 4;
      this.settingsTabSizer.add( this.settingsGroupBox );
      this.settingsPage = { page: this.mainSizerTab(this, this.settingsTabSizer), name: "Settings", expert_mode: false };
      this.global.tabs.push(this.settingsPage);
      this.mainTabBox.addPage( this.settingsPage.page, this.settingsPage.name );

      this.otherTabSizer = new HorizontalSizer;
      this.otherTabSizer.margin = 6;
      this.otherTabSizer.spacing = 4;
      this.otherTabSizer.add( this.otherGroupBox );
      this.otherPage = { page: this.mainSizerTab(this, this.otherTabSizer), name: "Other", expert_mode: true };
      this.global.tabs.push(this.otherPage);
      this.mainTabBox.addPage( this.otherPage.page, this.otherPage.name );

      if (this.global.debug) console.writeln("Create preprocessing tab");
      this.preProcessingsTabSizer = new HorizontalSizer;
      this.preProcessingsTabSizer.margin = 6;
      this.preProcessingsTabSizer.spacing = 4;
      this.preProcessingsTabSizer.add( this.preprocessingGroupBox );
      this.preProcessingsPage = { page: this.mainSizerTab(this, this.preProcessingsTabSizer), name: "Preprocessing", expert_mode: true };
      this.global.tabs.push(this.preProcessingsPage);
      this.mainTabBox.addPage( this.preProcessingsPage.page, this.preProcessingsPage.name );

      if (this.global.debug) console.writeln("Create integration tab");
      this.integrationTabSizer = new HorizontalSizer;
      this.integrationTabSizer.margin = 6;
      this.integrationTabSizer.spacing = 4;
      this.integrationTabSizer.add( this.integrationGroupBox );
      this.integrationPage = { page: this.mainSizerTab(this, this.integrationTabSizer), name: "Integration", expert_mode: true };
      this.global.tabs.push(this.integrationPage);
      this.mainTabBox.addPage( this.integrationPage.page, this.integrationPage.name );

      if (this.global.debug) console.writeln("Create postprocessing tab");
      this.postProcessingTabSizer = new HorizontalSizer;
      this.postProcessingTabSizer.margin = 6;
      this.postProcessingTabSizer.spacing = 4;
      this.postProcessingTabSizer.add( this.postProcessingGroupBox );
      this.postProcessingPage = { page: this.mainSizerTab(this, this.postProcessingTabSizer), name: "Postprocessing", expert_mode: true };
      this.global.tabs.push(this.postProcessingPage);
      this.mainTabBox.addPage( this.postProcessingPage.page, this.postProcessingPage.name );

      if (this.global.debug) console.writeln("Create tools tab");
      this.toolsTabSizer = new HorizontalSizer;
      this.toolsTabSizer.margin = 6;
      this.toolsTabSizer.spacing = 4;
      this.toolsTabSizer.add( this.toolsGroupBox );
      this.toolsPage = { page: this.mainSizerTab(this, this.toolsTabSizer), name: "Tools", expert_mode: false };
      this.global.tabs.push(this.toolsPage);
      this.mainTabBox.addPage( this.toolsPage.page, this.toolsPage.name );

      this.enhancementsSizer = new HorizontalSizer;
      this.enhancementsSizer.margin = 6;
      this.enhancementsSizer.spacing = 4;
      this.enhancementsSizer.add( this.enhancementsGroupBox );
      let tabname;
      if (this.global.use_preview) {
            tabname = "Enhancements";
      } else {
            tabname = "Enhancements";
      }
      this.enhancementsPage = { page: this.mainSizerTab(this, this.enhancementsSizer), name: tabname, expert_mode: false };
      this.global.tabs.push(this.enhancementsPage);
      this.mainTabBox.addPage( this.enhancementsPage.page, this.enhancementsPage.name );

      if (this.global.debug) console.writeln("Create interfaceTabSizer");
      this.interfaceTabSizer = new HorizontalSizer;
      this.interfaceTabSizer.margin = 6;
      this.interfaceTabSizer.spacing = 4;
      this.interfaceTabSizer.add( this.interfaceGroupBox );
      this.interfacePage = { page: this.mainSizerTab(this, this.interfaceTabSizer), name: "Interface", expert_mode: false };
      this.global.tabs.push(this.interfacePage);
      this.mainTabBox.addPage( this.interfacePage.page, this.interfacePage.name );

      this.mainTabsSizer = new HorizontalSizer;
      this.mainTabsSizer.margin = 6;
      this.mainTabsSizer.spacing = 4;

      this.mainTabsSizer.add( this.mainTabBox );
      //this.mainTabsSizer.addStretch();

      this.baseSizer = new VerticalSizer;
      this.baseSizer.margin = 6;
      this.baseSizer.spacing = 4;

      this.actionSizer = this.newActionSizer(this);

      var res = this.guitools.newJsonSizerObj(this, this.loadJsonFileCallback);
      this.jsonSizer = res.sizer;
      this.jsonLabel = res.label;

      this.topButtonsSizer = new HorizontalSizer;
      this.topButtonsSizer.spacing = 4;
      this.topButtonsSizer.add( this.expertModeSizer );
      this.topButtonsSizer.add( this.tutorialButton );
      this.topButtonsSizer.add( this.welcomeButton );
      this.topButtonsSizer.addStretch();
      this.topButtonsSizer.add( this.actionSizer );
      this.baseSizer.add( this.topButtonsSizer );

      this.topButtonsSizer2 = new HorizontalSizer;
      this.topButtonsSizer2.spacing = 4;
      this.topButtonsSizer2.add( this.targetTypeSizer );
      this.topButtonsSizer2.addSpacing( 4 );
      this.topButtonsSizer2.add( this.jsonSizer );
      this.topButtonsSizer2.addSpacing( 4 );
      this.topButtonsSizer2.add( this.resetOnSetupLoadCheckBox );
      this.topButtonsSizer2.addStretch();
      this.topButtonsSizer2.addSpacing( 4 );
      this.topButtonsSizer2.add( this.winprefixOutputdirSizer );
      this.top2ndRowControl = new Control( this );
      this.top2ndRowControl.sizer = new HorizontalSizer;
      this.top2ndRowControl.sizer.add(this.topButtonsSizer2);
      this.baseSizer.add( this.top2ndRowControl );

      this.baseSizer.add( this.mainTabsSizer );     // Main view with tabs
      this.baseSizer.add( this.info_Sizer );
      // this.baseSizer.add( this.buttons_Sizer );     // Buttons at the bottom

      this.sizer1 = new HorizontalSizer;
      //this.sizer1.margin = 6;
      //this.sizer1.spacing = 4;
      if (this.global.use_preview) {
            if (this.global.debug) console.writeln("Adding side preview to main tabs sizer");
            this.sidePreviewSizer = new VerticalSizer;
            this.sidePreviewSizer.margin = 6;
            this.sidePreviewSizer.spacing = 4;
            this.sidePreviewSizer.add( this.previewObj.sizer );
            if (this.histogramControl != null) {
                  this.sidePreviewSizer.add( this.histogramControl );
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
      this.windowTitle = this.global.autointegrate_version; 
      this.userResizable = true;
      this.ensureLayoutUpdated();
      this.adjustToContents();
      
      // Force proper sizing when preview is disabled
      if (!this.global.use_preview) {
            this.adjustToContents();
            this.setVariableSize();
      }
      //this.files_GroupBox.setFixedHeight();

      this.setWindowPrefixHelpTip(this.ppar.win_prefix);
      this.util.updateStatusInfoLabel(this.global.autointegrate_version);

      console.show();

       if (this.ppar.preview.use_preview && !use_restored_preview_size) {
            // preview size not set, adjust to screen
            console.noteln("Preview size not restored from settings, adjusting to screen");
            var preview_size = this.util.adjustDialogToScreen(
                                    this.dialog, 
                                    this.previewControl,
                                    false,      // maxsize
                                    this.ppar.preview.side_preview_width,
                                    this.ppar.preview.side_preview_height);
            if (preview_size.changes) {
                  // side preview
                  if (this.ppar.preview.side_preview_width != preview_size.width || this.ppar.preview.side_preview_height != preview_size.height) { 
                        console.writeln("Adjusted preview size from " + this.ppar.preview.side_preview_width + "x" + this.ppar.preview.side_preview_height + " to " + preview_size.width + "x" + preview_size.height);
                  }
                  this.ppar.preview.side_preview_width = preview_size.width;
                  this.ppar.preview.side_preview_height = preview_size.height;
            }
      }
      if (this.ppar.preview.use_preview) {
            if (this.par.debug.val || this.global.debug) console.writeln("updatePreviewNoImage, side_preview");
            this.updatePreviewNoImageInControl(this.previewControl);
            console.writeln("Screen size " + this.screen_size +  
                            ", preview size " + this.ppar.preview.side_preview_width + "x" + this.ppar.preview.side_preview_height + 
                            ", histogram height " + this.ppar.preview.side_histogram_height + 
                            ", dialog size " + this.width + "x" + this.height);
      }

      this.global.reportUnusedParameters();

      if (this.global.expert_mode) {
            this.switchToExpertMode(this);
      } else {
            this.switchToSimpleMode(this);
      }

      // Initialize tutorial system
      this.tutorial = new AutoIntegrateTutorialSystem(this, this.global, this.util);
      this.setupAllTutorials();
      // this.setupGettingStartedTutorial();
      // this.setupProcessingTutorial();

      // Show welcome dialog on first run
      if (this.shouldShowWelcome(this.global)) {
            var timer = new Timer();
            timer.singleShot = true;
            timer.interval = 0.5;  // Delay to ensure main dialog is shown
            timer.onTimeout = () => {
                  this.showWelcomeDialog(this.global);
            };
            timer.start();
      }
} // End of AutoIntegrateDialog function

// ============================================================================
// Welcome Dialog Integration with AutoIntegrateDialog
// ============================================================================


// Check if welcome dialog should be shown
shouldShowWelcome(global) {
      if (!this.global.interactiveMode) {
            if (this.global.debug) console.writeln("Non-interactive mode, skipping welcome dialog");
            return false;
      }
      if (this.global.do_not_read_settings) {
            if (this.global.debug) console.writeln("do_not_read_settings is true, showing welcome dialog");
            return true;
      }
      // Check if this is first run
      if (this.first_run) {
            if (this.global.debug) console.writeln("First run, showing welcome dialog");
            return true;
      }

      var showOnStartup = Settings.read("AutoIntegrate" + "/ShowWelcomeOnStartup", DataType.Boolean);
      if (this.global.debug) console.writeln("Show welcome dialog on startup setting: " + showOnStartup);
      return Settings.lastReadOK && showOnStartup;
}

isExpertMode() {
      if (this.global.do_not_read_settings) {
            return false;
      } else {
            var setting = Settings.read("AutoIntegrate" + "/ExpertMode", DataType.Boolean);
            if (!Settings.lastReadOK) {
                  // Setting not found, assume that AutoIntegrate has been used 
                  // already so expert mode is likely desired.
                  return true;
            } else {
                  if (this.global.debug) console.writeln("Read ExpertMode setting: " + setting);
                  return setting;
            }
      }
};

saveExpertMode() {
      if (!this.global.do_not_write_settings) {
            Settings.write("AutoIntegrate" + "/ExpertMode", DataType.Boolean, this.global.expert_mode);
      }
}

isFirstRun() {
      if (this.global.do_not_read_settings) {
            if (this.global.debug) console.writeln("do_not_read_settings is true, treating as first run");
            return true;
      } else {
            var hasRun = Settings.read("AutoIntegrate" + "/HasRun", DataType.Boolean);
            if (this.global.debug) console.writeln("Read HasRun setting: " + hasRun);
            return !Settings.lastReadOK || !hasRun;
      }
};

// Mark that AutoIntegrate has been run
markAsRun() {
      if (!this.global.do_not_write_settings) {
            if(this.global.debug) console.writeln("*** Marking AutoIntegrate as run in settings");
            Settings.write("AutoIntegrate" + "/HasRun", DataType.Boolean, true);
      } else {
            if(this.global.debug) console.writeln("do_not_write_settings is true, not marking as run in settings");
      }
}

// Show welcome dialog
showWelcomeDialog(global) {
      var welcome = new AutoIntegrateWelcomeDialog(global);
      var result = welcome.execute();
      
      // Save preference
      welcome.saveShowOnStartup();
      
      if (result) {
            // User clicked OK or a tutorial button
            if (welcome.selectedTutorial === "getting-started") {
                  // Launch getting started tutorial
                  this.startTutorialById("getting-started");
            } else if (welcome.selectedTutorial === "show-manager") {
                  // Show tutorial manager
                  this.showTutorialManager();
            }
            // else: User clicked "Skip" - just continue
      }
      // else: User clicked "Close" or X - dialog closes
}


// ============================================================================
// Tutorial System Integration with AutoIntegrateDialog
// ============================================================================

// Show tutorial manager
showTutorialManager() {
    
      var manager = new AutoIntegrateTutorialManagerDialog(this, global);
      manager.execute();
};


// Setup all tutorials
setupAllTutorials() {
      if (this.global.expert_mode) {
            this.tutorials = {
                  "getting-started": this.getGettingStartedSteps(),
                  "file-management": this.getFileManagementSteps(),
                  "processing-settings": this.getProcessingSettingsSteps(),
                  "comet-processing": this.getCometProcessingSteps()
            };
      } else {
            this.tutorials = {
                  "getting-started": this.getGettingStartedSteps(),
                  "file-management": this.getFileManagementSteps(),
                  "processing-settings": this.getProcessingSettingsSteps()
            };
      }
      if (this.global.debug) {
            // Check that target in tutorials exist
            for (var tutorialId in this.tutorials) {
                  var steps = this.tutorials[tutorialId];
                  for (var i = 1; i < steps.length-1; i++) {
                        var step = steps[i];
                        // Check that target is a valid GUI object
                        if (!(step.target instanceof Control)) {
                              console.criticalln("Error: Tutorial '" + tutorialId + "', step " + step.title + ", " + (i+1) + ": target is not a Control object.");
                        }
                  }
            }
      }
}

// Start tutorial by ID
startTutorialById = (tutorialId) => {
      var steps = this.tutorials[tutorialId];
      
      if (!steps) {
            console.warningln("Tutorial not found: " + tutorialId);
            return;
      }
      
      this.tutorial.defineSteps(steps);
      this.tutorial.currentTutorialId = tutorialId;
      this.tutorial.start();
}

// ============================================================================
// Tutorial Step Definitions
// ============================================================================
getGettingStartedSteps = () => {
    return [
        {
            title: "Welcome to AutoIntegrate!",
            description: "<p>This quick tutorial will guide you through the most important features. You can restart this tutorial anytime by clicking the 'Tutorial' button.</p>",
            target: null,
            tooltipPosition: "center",
            switchToTab: null  // No tab switch
        },
        {
            title: "Files Tab",
            description: "<p>Start here in the Files tab by adding your light frames, bias, darks, and flat frames.</p>" +
                         "<p>You can load all files supported by PixInsight.</p>" +
                         "<p>AutoIntegrate will automatically detect the filter used on each file based on its metadata.</p>",
            target: this.filesPage.page,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)  // Switch to Files tab
        },
        {
            title: "Add Light Frames",
            description: "<p>Click this button to add your light frames (the actual images of your target). You can add multiple files at once.</p>" + 
                         "<p>If your light files are already calibrated, you can skip adding calibration frames.</p>" +
                         "<p>You can add calibration frames using separate buttons.</p>" +
                         "<p>AutoIntegrate will automatically select the best images as reference images.</p>",
            target: this.filesButtons.addLightsButton,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)  // Switch to Files tab
        },
        {
            title: "Settings Tab",
            description: "<p>The Settings tab contains most important processing options.</p>",
            target: this.settingsPage.page,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.settingsPage.name),      // Switch to Settings tab
            sectionBars: ["Image1", "ImageTools"]     // Show Image processing parameters and tools
        },
        {
            title: "Target type",
            description: "<p>If you are just starting out, here you can specify the type of your target object. This information is used to optimize some of the processing parameters.</p>" +
                         "<p>Currently only the stretching setting is affected by this selection.</p>",
            target: this.target_type_label,
            tooltipPosition: "center"
        },
        {
            title: "Stretching",
            description: "<p>Usually it is better to specify the stretching method instead of the target type. For the best results it is important to select stretching method that suits your data best.</p>" +
                         "<p>For targets like galaxy and star cluster you should start with a masked stretch. For others the Auto STF is a good starting point.</p>",
            target: this.guitools.stretchingLabel,
            tooltipPosition: "center"
        },
        {
            title: "Enhancements Tab",
            description: "<p>The Enhancements tab lets you apply additional processing steps to a final image after the main processing workflow is complete.</p>" + 
                         "<p>There are undo and redo buttons so you can easily experiment with different settings.</p>",
            target: this.enhancementsPage.page,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.enhancementsPage.name),        // Switch on Enhancements tab
            sectionBars: ["EnhancementsTarget", "Enhancements1"]    // Show some sections
        },
        {
            title: "Interface settings Tab",
            description: "<p>The Interface settings tab allows you to customize the AutoIntegrate user interface, including preview options and flowchart settings.</p>" +
                         "<p>It is recommended that you adjust the preview size to match your screen size for optimal experience.</p>",
            target: this.side_preview_width_label,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.interfacePage.name),    // Switch to Interface tab
            sectionBars: ["interface"]                // Show some sections
        },
        {
            title: "Flowchart settings",
            description: "<p>By default flowchart is created to the preview window as the processing progresses.</p>" +
                         "<p>Checking the Get flowchart data before processing option created the full flowchart before processing starts. " + 
                         "This may take a little extra time but allows you to see the full processing plan in advance.</p>",
            target: this.runGetFlowchartDataCheckBox,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.interfacePage.name),    // Switch to Interface tab
            sectionBars: ["Flowchart"]                // Show some sections
        },
        {
            title: "Save current parameter values",
            description: "<p>At the bottom left corner click the wrench button to save all current parameter values</p>" + 
                         "<p>Parameters are saved using the PixInsight persistent module settings mechanism. " + 
                         "Saved parameter values are remembered and automatically restored when the script starts.</p>",
            target: this.savedefaults_Button,
            tooltipPosition: "center"
        },
        {
            title: "Load/Save Configuration",
            description: "<p>Save your file selections and settings to a JSON file, so you can easily reload them later or share with others.</p>",
            target: this.jsonLabel,
            tooltipPosition: "center"
        },
        {
            title: "Run Button",
            description: "<p>When you're ready, click Run to start the processing workflow. AutoIntegrate will calibrate, align, integrate and process your images automatically!</p>",
            target: this.run_Button,
            tooltipPosition: "center"
        },
        {
            title: "You're Ready!",
            description: "<p>That's it! You now know the basics of AutoIntegrate. Start by adding your files and explore the other tabs for more advanced options.</p>" + 
                         "<p>Check out also other tutorials in the <i>Interface section!</i></p>",
            target: null,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)   // Back to Files tab
        }
    ];
}

getFileManagementSteps = () => {
    return [
        {
            title: "File Management Tutorial",
            description: "<p>Learn how to load and save your imaging files.</p>",
            target: null,
            tooltipPosition: "center"
        },
        {
            title: "Files Tab",
            description: "<p>In the Files tab you can load your light frames, bias, darks, and flat frames. Click on the tabs to see all calibration frame options.</p>",
            target: this.filesPage.page,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)  // Switch to Files tab
        },
        {
            title: "Directory Checkbox",
            description: "<p>Use the directory checkbox to recursively load files from a specific directory.</p>" +
                         "<p>When this option is enabled, AutoIntegrate will scan the selected directory and all its subdirectories for files matching the search pattern.</p>",
            target: this.directoryCheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Windows prefixes",
            description: "<p>Use window prefixes to group related files together. " + 
                         "This is especially useful when working with multiple targets or sessions.</p>" + 
                         "<p>By default AutoIntegrate always generates files with the same names. Using prefixes helps to avoid name conflicts.</p>",
            target: this.window_prefix_label,
            tooltipPosition: "center"
        },
        {
            title: "Output directory",
            description: "<p>Specify the directory where processed files will be saved.</p>" + 
                         "<p>By default AutoIntegrate saves files in the same directory as the light frames.</p>",
            target: this.output_dir_label,
            tooltipPosition: "center"
        },
        {
            title: "Saving final image in different formats",
            description: "<p>By default AutoIntegrate saves all files in XISF format.</p>" +
                         "<p>You can save final image also in other formats like TIFF or JPEG here.</p>",
            target: this.saveFinalImageControl,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.settingsPage.name),     // Switch to Settings tab
            sectionBars: ["Savefinalimagefiles"]      // Show some sections
        },
        {
            title: "Save in enhancements tab",
            description: "<p>If you use enhancements options for the final image, " +
                         "there is a button where you can save the image in XISF and 16-bit TIFF formats.</p>",
            target: this.enhancements_gui.enhancementsSaveButton,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.enhancementsPage.name),        // Switch to Enhancements tab
            sectionBars: ["EnhancementsTarget"]              // Show some sections
        },
        {
            title: "Tutorial Complete!",
            description: "<p>You now know how to manage files in AutoIntegrate!</p>",
            target: null,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)   // Back to Files tab
        }
    ];
}

getProcessingSettingsSteps = () => {
    return [
        {
            title: "Processing Settings",
            description: "<p>Explore powerful processing options to get the most from your data.</p>" +
                         "<p>Most commonly used settings can be found from the Settings tab.</p>",
            target: null,
            tooltipPosition: "center"
        },
        {
            title: "Cropping",
            description: "<p>Automatically crop your final image to remove unwanted edges and artifacts after integration.</p>",
            target: this.crop_to_common_area_CheckBox,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.settingsPage.name),     // Switch to Settings tab
            sectionBars: ["Image1"]                   // Show Image processing parameters
        },
        {
            title: "Local normalization",
            description: "<p>You can use LocalNormalization during the integration of your images.</p>",
            target: this.useLocalNormalizationCheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Drizzle",
            description: "<p>Here you can specify drizzle integration for your images.</p>" +
                         "<p>Drizzle is a powerful digital image processing algorithm used to increase the resolution and preserve detail when stacking multiple images, especially those that are undersampled.</p>",
            target: this.use_drizzle_CheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Gradient correction",
            description: "<p>You can select if gradient correction is done and when it is done for your images.</p>" +
                         "<p>In the <i>Tools</i> section below in this tab you can select which gradient correction method is used.</p>" +
                         "<p>Note that if none of these options are checked no gradient correction is applied.</p>",
            target: this.GC_before_channel_combination_CheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Color calibration using SPCC",
            description: "<p>You can use SpectrophotometricColorCalibration (SPCC) for color calibration. " +
                         "It is the recommended method for color calibration.</p>" +
                         "<p>Note that SPCC should be used only for RGB images and " +
                         "you need to download Gaia DR3/SP Catalogs.</p>",
            target: this.use_spcc_CheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Stretching",
            description: "<p>Here you can specify stretching of your final image. It is important to select stretching method that suits your data best.</p>" +
                         "<p>For targets like galaxy and star cluster you should start with a masked stretch. For others the Auto STF is a good starting point.</p>",
            target: this.guitools.stretchingLabel,
            tooltipPosition: "center"
        },
        {
            title: "Tools",
            description: "<p>Here you can specify various tools for your image processing tasks.</p>" +
                         "<p>It is recommended that you install the necessary external tools for your workflow.</p>" +
                         "<p>External tools that are supported are: RC Astro tools, GraXpert tools, StarNet and DeepSNR.</p>" +
                         "<p>Note that external tools need to be installed separately.</p>",
            target: this.imageToolsControl,
            tooltipPosition: "center",
            sectionBars: ["ImageTools"]               // Show Image processing parameters
        },
        {
            title: "Narrowband processing",
            description: "<p>Here you can set narrowband image processing settings. You can specify how narrowband images are mapped to RGB channels.</p>",
            target: this.narrowbandControl,
            tooltipPosition: "center",
            sectionBars: ["Narrowband1"]              // Show Image processing parameters
        },
        {
            title: "Narrowband mapping",
            description: "<p>There are several predefined mappings available, or you can create your own custom mapping.</p>" +
                         "<p>The Auto option creates either SHO or HOO mapping depending on available narrowband channels.</p>",
            target: this.guitools.narrowbandCustomPalette_ComboBox,
            tooltipPosition: "center"
        },
        {
            title: "Tutorial Complete!",
            description: "<p>You now know some of the powerful processing settings in AutoIntegrate!</p>",
            target: null,
            tooltipPosition: "center"
        }
    ];
}

getCometProcessingSteps = () => {
    return [
        {
            title: "Comet processing",
            description: "<p>AutoIntegrate can do comet processing. It involves several steps that are described here.</p>" +
                         "<p>Comet processing steps are described also in the <i>Preprocessing / Comet alignment</i> section using the help button.</p>",
            target: null,
            tooltipPosition: "center"
        },
        {
            title: "Run a normal workflow first",
            description: "<p>First run a normal workflow to get correct stars and background objects.</p>",
            target: this.run_Button,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.filesPage.name)         // Switch to Files tab
        },
        {
            title: "Load star aligned files",
            description: "<p>Next run the comet processing.</p>" +
                         "<p>Load star aligned *_r.xisf files as light files. Those can be found from the AutoOutput directory.</p>",
            target: this.filesButtons.addLightsButton,
            tooltipPosition: "center"
        },
        {
            title: "Set window prefix",
            description: "<p>Set a Window prefix to avoid overwriting files in the first step.</p>",
            target: this.window_prefix_label,
            tooltipPosition: "center"
        },
        {
            title: "Check comet align",
            description: "<p>Check Comet align in <i>Settings / Image processing parameters</i> section.</p>",
            target: this.CometAlignCheckBox,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.settingsPage.name),           // Switch to Settings tab
            sectionBars: ["Image1"]                         // Show Image processing parameters
        },
        {
            title: "Select star removal tool",
            description: "<p>Check desired star removal tool (StarXTerminator or StarNet2) in <i>Settings / Tools</i> section.</p>",
            target: this.guitools.use_StarXTerminator_CheckBox,
            tooltipPosition: "center"
        },
        {
            title: "Remove stars",
            description: "<p>Check Remove stars from lights in <i>Postprocessing / Star stretching and removing</i> section.</p>",
            target: this.remove_stars_light_CheckBox,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.postProcessingPage.name),     // Switch to postprocessing tab
            sectionBars: ["ps_starstretching"]              // Show Image processing parameters
        },
        {
            title: "No cosmetic correction",
            description: "<p>Check No CosmeticCorrection in <i>Other / Other parameters</i> section.</p>",
            target: this.CosmeticCorrectionCheckBox,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.otherPage.name),        // Switch to Other tab
            sectionBars: ["Other1"]                   // Show Other parameters
        },
        {
            title: "Show the first comet image",
            description: "<p>Go to the <i>Preprocessing / CometAlignment</i> section. Click the Preview button for the first image " + 
                         "to show the first image in the preview window.",
            target: this.cometAlignFirstXYButton,
            tooltipPosition: "center",
            switchToTab: this.findPageIndexByName(this.mainTabBox, this.preProcessingsPage.name),     // Switch to Preprocessing tab
            sectionBars: ["ps_alignment"]                   // Show Comet alignment
        },
        {
            title: "Get first comet position coordinates",
            description: "<p>Zoom to 1:1 view in the preview and click the comet nucleus with the left mouse button to get coordinates to the coordinates box.</p>" +
                         "<p>Use the arrow buttons next to preview window coordinates box to automatically copy coordinates to the First image box.</p>",
            target: this.cometAlignFirstLabel,
            named_target: "coordinatesCopyFirstButton",
            tooltipPosition: "top-right"
        },
        {
            title: "Get last comet position coordinates",
            description: "<p>Repeat the same steps for the last comet image. Click the Preview button for the last image " +
                         "to show the last image in the preview window and then get the coordinates.</p>",
            target: this.cometAlignLastXYButton,
            tooltipPosition: "center",
        },
        {
            title: "Process the comet image",
            description: "<p>Use the Run button to process comet image.</p>",
            target: this.run_Button,
            tooltipPosition: "center",
        },
        {
            title: "Tutorial Complete!",
            description: "<p>You now have a normally processed image for the background and stars and a comet processed image with stars removed!</p>",
            target: null,
            tooltipPosition: "center"
        }
    ];
};

/* Interface functions.
this.updatePreviewWin = updatePreviewWin;
this.updatePreviewFilename = updatePreviewFilename;
this.updatePreviewId = updatePreviewId;
this.setBestImageInTreeBox = setBestImageInTreeBox;
this.setReferenceImageInTreeBox = setReferenceImageInTreeBox;
this.addFilesToTreeBox = addFilesToTreeBox;
this.updateInfoLabel = updateInfoLabel;
this.setTreeBoxSsweight = setTreeBoxSsweight;
this.close_undo_images = close_undo_images;
this.update_enhancements_target_image_window_list = update_enhancements_target_image_window_list;
this.fix_win_prefix_array = fix_win_prefix_array;
this.updateWindowPrefix = updateWindowPrefix;
this.updateOutputDirEdit = updateOutputDirEdit;
this.getOutputDirEdit = getOutputDirEdit;
this.getTreeBoxNodeFiles = getTreeBoxNodeFiles;
this.flowchartUpdated = flowchartUpdated;

 */

}  /* AutoIntegrateGUI */

#endif /* AUTOINTEGRATEGUI_JS */
