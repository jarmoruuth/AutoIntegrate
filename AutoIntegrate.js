/*

Script to automate initial steps of image processing in PixInsight.

For information check the page https://ruuth.xyz/AutoIntegrateInfo.html

Script has a GUI interface where some processing options can be selected.

In the end there will be integrated light files and automatically
processed final image. Script accepts LRGB, color and narrowband files. 
It is also possible do only partial processing and continue manually.

Clicking button Run on GUI all the following steps listed below are performed.

LRGB files need to have keyword FILTER that has values for Luminance, Red, Green
or Blue channels. A couple of variants are accepted like 'Red' or 'R'.
If keyword FILTER is not found file name is use to resolve filter. If that
fails then images are assumed to be color images. Also camera RAW files can be used.

Script creates an AutoIntegrate.log file where details of the processing can be checked.

NOTE! These steps may not be updated with recent changes. They do describe the basic
      processing but some details may have changed. To get a detailed workflow check the
      Flowchart buttons on the GUI.


Manual processing
-----------------

It is possible to rerun the script by clicking button AutoContinue with following steps 
if there are manually created images:
- L_HT + RGB_HT
  LRGB image with HistogramTransformation already done, the script starts after step <lHT> and <rgbHT>.
- RGB_HT
  Color (RGB) image with HistogramTransformation already done, the script starts after step <colorHT>.
- Integration_L_GC + Integration_RGB_GC
  LRGB image background extracted, the script starts after step <lGC> and <rgbGC>.
- Integration_RGB_GC
  Color (RGB) image background extracted, the script starts with after step <colorGC>.
- Integration_L_GC + Integration_R_GC + Integration_G_GC + Integration_B_GC
  LRGB image background extracted before image integration, the script starts after step <lGC> and 
   <rgbGC>. Automatic background extract is then skipped.
- Integration_L + Integration_R + Integration_G + Integration_B + + Integration_H + Integration_S + Integration_O
  (L)RGB or narrowband image with integrated L,R,G,B;H,S,O images the script starts with step <lII>. 

Note that it is possible to run first automatic processing and then manually enhance some 
intermediate files and autocontinue there. 
- Crop integrated images and continue automatic processing using cropped images.
- Run manual DBE or other gradient correction.

Calibration steps
-----------------

Calibration can run two basic workflows, one with bias files and one
with flat dark files. There are some option to make small changes
on those,

1. In each file page in GUI, select light, bias, dark, flat and/or flat dark frames. 
   If only light are selected the calibration is skipped. Also bias, dark, flat or 
   flat dark files may be not selected, so any one of those can be left out. Script 
   tries to automatically detect different filters, or OSC/RAW files.
2. If bias files are present, those are integrated into master bias. Optionally a superbias
   file is created.
3. If dark files are present, those are optionally calibrated using master bias and then integrated 
   into master dark.
4. If flat dark files are present, those are integrated  into master flat dark.
5. If flat files are present, those are calibrated using master bias and master dark, or master
   flat dark, and then integrated into master flat.
6. Light files are then calibrated using master bias, master dark and master flat.

Generic steps for all files
---------------------------

1. If light files not already selects, script opens a file dialog. On that select 
   all *.fit (or other) files. LRGB, color, RAW and narrowband files can be used.
2. Optionally linear defect detection is run to find column and row defects. Defect information
   is used by the CosmeticCorrection.
3. By default run CosmeticCorrection for each file.
4. OSC/RAW files are debayered.
5. SubframeSelector is run on files to measure and generate SSWEIGHT for
   each file. Output is *_a.xisf files.
6. Files are scanned and the file with highest SSWEIGHT is selected as a
   reference.
7. StarAlign is run on all files and *_a_r.xisf files are
   generated.
8. Optionally there is LocalNormalization on all files.

Steps with LRGB files
---------------------

1. ImageIntegration is run on LRGB files. Rejection method is chosen dynamically 
   based on the number of image files, or specified by the user. <lII>
   After this step there are Integration_L, Integration_R, Integration_G and Integration_B images,
   or with narrowband Integration_H, Integration_S and Integration_O.
2. Optionally the Integration images and corresponding support images are cropped to the area
   contributed to by all images.
3. Optionally gradient correction in run on L image. <lGC>
4. HistogramTransform is run on L image. <lHT>
5. Stretched L image is stored as a mask unless user has a predefined mask named AutoMask.
6. Noise reduction is run on L image using a mask.
7. If GC_before_channel_combination is selected then gradient correction is run on each color channel (R,G,B). 
   <rgbGC>
8. By default LinearFit is run on RGB channels using L, R, G or B as a reference
9. If Channel noise reduction is non-zero then noise reduction is done separately 
   for each R,G and B images using a mask.
10. ChannelCombination is run on Red, Green and Blue integrated images to
   create an RGB image. After that there is one L and one RGB image.
12. Optionally gradient correction is run on RGB image. <rgbGC>
13. Color calibration is run on RGB image. Optionally
    BackgroundNeutralization is run before color calibration
14. HistogramTransform is run on RGB image. <rgbHT>
15. Optionally TGVDenoise is run to reduce color noise.
16. Optionally a slight CurvesTransformation is run on RGB image to increase saturation.
    By default saturation is increased also when the image is still in a linear
    format.
17. LRGBCombination is run to generate final LRGB image.

Steps with color files
----------------------

1. ImageIntegration is run on color *_a_r.xisf files.
   Rejection method is chosen dynamically based on the number of image files.
   After this step there is Integration_RGB_color image.
3. Optionally gradient correction in run on RGB image. <colorGC>
4. Color calibration is run on RGB image. Optionally
   BackgroundNeutralization is run before color calibration
5. HistogramTransform is run on RGB image. <colorHT>
6. A mask is created from an extracted and stretched luminance channel.
7. MultiscaleLinearTransform is run on color RGB image to reduce noise.
   Mask is used to target noise reduction more on the background.
8. Optionally a slight CurvesTransformation is run on RGB image to increase saturation.

Steps with narrowband files
---------------------------

Steps for narrowband files are a bit similar to LRGB files but without L channel.
- There is an option to choose how S, H and O files and mapped to R, G and B channels.
- Color calibration is not run on narrowband images
- Saturation default setting 1 does not increase saturation on narrowband images.
- Linear fit for can be used for R, G or B channels. In that case script runs linked STF 
  stretch. Default is to use unlinked STF stretch for narrowband files.
- PixelMath expression can chosen from a list or edited manually for custom blending.
  PixelMath expressions can also include RGB channels.

Narrowband to RGB mapping
-------------------------

A special processing is used for narrowband to (L)RGB image mapping. It is used 
to enhance (L)RGB channels with narrowband data. It cannot be used without RGB filters.
This mapping is similar to NBRGBCombination script in PixInsight or as described in 
Light Vortex Astronomy tutorial Combining LRGB with Narrowband. You can find more 
details on parameters from those sources.

Common final steps for all images
---------------------------------

1. SCNR is run on to reduce green cast.
2. MultiscaleLinearTransform is run to sharpen the image. A mask is used to target
   sharpening more on the light parts of the image.
3. Extra windows are closed or minimized.

Notes to self:
- Start mask when set will target operation on stars.
- Luminance mask when set will target operations on light parts of the image.
- Mask from RangeSelection is opposite to luminance mask. So user must invert 
  range_mask and rename it as AutoMask.


Credits and Copyright notices
-----------------------------

PixInsight scripts that come with the product were a great help.
Web site Light Vortex Astronomy (http://www.lightvortexastronomy.com/)
was a great place to find details and best practices when using PixInsight.
For calibration another useful link is a PixInsight forum post
"For beginners: Guide to PI's ImageCalibration":
https://pixinsight.com/forum/index.php?threads/for-beginners-guide-to-pis-imagecalibration.11547/

Routines ApplyAutoSTF and applySTF are from PixInsight scripts that are 
distributed with PixInsight. 

Routines for Linear Defect Detection are from PixInsight scripts 
LinearDefectDetection.js and CommonFunctions.jsh that is distributed 
with PixInsight. 

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2026 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

PreviewControl module

      Copyright (C) 2013, Andres del Pozo

The following copyright notice is for Linear Defect Detection

   Copyright (c) 2019 Vicent Peris (OAUV). All Rights Reserved.

The following copyright notice is for routines ApplyAutoSTF and applySTF:

   Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.

The following condition apply for routines ApplyAutoSTF, applySTF and 
Linear Defect Detection:

   Redistribution and use in both source and binary forms, with or without
   modification, is permitted provided that the following conditions are met:
   
   1. All redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
   
   2. All redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
   
   3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
      of their contributors, may be used to endorse or promote products derived
      from this software without specific prior written permission. For written
      permission, please contact info@pixinsight.com.
  
   4. All products derived from this software, in any form whatsoever, must
      reproduce the following acknowledgment in the end-user documentation
      and/or other materials provided with the product:
  
      "This product is based on software from the PixInsight project, developed
      by Pleiades Astrophoto and its contributors (https://pixinsight.com/)."
   
      Alternatively, if that is where third-party acknowledgments normally
      appear, this acknowledgment must be reproduced in the product itself.
  
   THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
   TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
   PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
   INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
   DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   POSSIBILITY OF SUCH DAMAGE.

*/

#ifndef TEST_AUTO_INTEGRATE
"use strict;"
#endif

#feature-id   AutoIntegrate : AutoIntegrate > AutoIntegrate

#feature-info A script for running basic image processing workflow

#include <pjsr/ColorSpace.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SectionBar.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/StdCursor.jsh>

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"

#include "AutoIntegrateLDD.js"
#include "AutoIntegrateBanding.js"
#include "AutoIntegrateEngine.js"

#include "AutoIntegratePreview.js"
#include "AutoIntegrateGUI.js"
#include "AutoIntegrateFlowchart.js"

function AutoIntegrate() {

this.__base__ = Object;
this.__base__();

var global = new AutoIntegrateGlobal();
var util = new AutoIntegrateUtil(global);
var flowchart = new AutoIntegrateFlowchart(global, util);
var engine = new AutoIntegrateEngine(global, util, flowchart);
var gui = new AutoIntegrateGUI(global, util, engine, flowchart);

util.setGUI(gui);
engine.setGUI(gui);
flowchart.setGUI(gui);

var par = global.par;
var ppar = global.ppar;

/***************************************************************************
 * 
 *    test utility functions
 * 
 */
function init_pixinsight_version()
{
      util.init_pixinsight_version();
}

function readPersistentSettings()
{
      if (global.do_not_read_settings) {
            console.writeln("Use default settings, do not read session settings from persistent module settings");
            return;
      }
      // Read prefix info. We use new setting names to avoid conflict with
      // older global.columnCount/winPrefix names
      console.noteln("Read window prefix settings");
      var tempSetting = Settings.read(SETTINGSKEY + "/prefixName", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixName '" + tempSetting + "' from settings.");
            ppar.win_prefix = tempSetting;
      }
      if (par.start_with_empty_window_prefix.val) {
            ppar.win_prefix = '';
      }
      var tempSetting  = Settings.read(SETTINGSKEY + "/prefixArray", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixArray '" + tempSetting + "' from settings.");
            ppar.prefixArray = JSON.parse(tempSetting);
            if (ppar.prefixArray.length > 0 && ppar.prefixArray[0].length == 2) {
                  // We have old format prefix array without column position
                  // Add column position as the first array element
                  console.writeln("AutoIntegrate:converting old format prefix array " + JSON.stringify(ppar.prefixArray));
                  for (var i = 0; i < ppar.prefixArray.length; i++) {
                        if (ppar.prefixArray[i] == null) {
                              ppar.prefixArray[i] = [0, '-', 0];
                        } else if (ppar.prefixArray[i][0] == '-') {
                              // add zero column position
                              ppar.prefixArray[i].unshift(0);
                        } else {
                              // Used slot, add i as column position
                              ppar.prefixArray[i].unshift(i);
                        }
                  }
            }
            gui.fix_win_prefix_array();
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/global.columnCount", DataType_Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored global.columnCount '" + tempSetting + "' from settings.");
            ppar.userColumnCount = tempSetting;
      }
      if (!par.use_manual_icon_column.val) {
            ppar.userColumnCount = -1;
      }
      util.restoreLastDir();
      var tempSetting = Settings.read(SETTINGSKEY + "/savedVersion", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored savedVersion '" + tempSetting + "' from settings.");
            ppar.savedVersion = tempSetting;
      }

      var tempSetting = Settings.read(SETTINGSKEY + "/previewSettings", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored previewSettings '" + tempSetting + "' from settings.");
            var preview = JSON.parse(tempSetting);
            // Check that all settings are defined. When coming from older version
            // some values may be missing. Use defaults for missing values.
            if (preview.show_histogram == undefined) {
                  preview.show_histogram = ppar.preview.show_histogram;
            }
            if (preview.histogram_height == undefined) {
                  preview.histogram_height = ppar.preview.histogram_height;
            }
            if (preview.side_preview_width == undefined) {
                  preview.side_preview_width = ppar.preview.side_preview_width;
            }
            if (preview.side_preview_height == undefined) {
                  preview.side_preview_height = ppar.preview.side_preview_height;
            }
            if (preview.side_histogram_height == undefined) {
                  preview.side_histogram_height = ppar.preview.side_histogram_height;
            }
            if (preview.black_background == undefined) {
                  preview.black_background = ppar.preview.black_background;
            }
            ppar.preview = preview;
            global.use_preview = ppar.preview.use_preview;
      } else {
            /* Read old style separate settings. */
            var tempSetting = Settings.read(SETTINGSKEY + "/usePreview", DataType_Boolean);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored usePreview '" + tempSetting + "' from settings.");
                  ppar.preview.use_preview = tempSetting;
                  global.use_preview = tempSetting;
            }
            var tempSetting = Settings.read(SETTINGSKEY + "/sidePreviewVisible", DataType_Boolean);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored sidePreviewVisible '" + tempSetting + "' from settings.");
                  ppar.preview.side_preview_visible = tempSetting;
            }
            /* Now we have preview size for each screen size. */
            var tempSetting = Settings.read(SETTINGSKEY + "/previewWidth", DataType_Int32);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored previewWidth '" + tempSetting + "' from settings.");
                  ppar.preview.preview_width = tempSetting;
            }
            var tempSetting = Settings.read(SETTINGSKEY + "/previewHeight", DataType_Int32);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored previewHeight '" + tempSetting + "' from settings.");
                  ppar.preview.preview_height = tempSetting;
            }
            var tempSetting = Settings.read(SETTINGSKEY + "/useLargePreview", DataType_Boolean);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored useLargePreview '" + tempSetting + "' from settings.");
                  ppar.preview.use_large_preview = tempSetting;
            }
      }

      var tempSetting = Settings.read(SETTINGSKEY + "/useSingleColumn", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored useSingleColumn '" + tempSetting + "' from settings.");
            ppar.use_single_column = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/useMoreTabs ", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored useMoreTabs '" + tempSetting + "' from settings.");
            ppar.use_more_tabs = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/filesInTab", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored filesInTab '" + tempSetting + "' from settings.");
            ppar.files_in_tab = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/showStartupImage ", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored showStartupImage '" + tempSetting + "' from settings.");
            ppar.show_startup_image = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/startupImageName", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored startupImageName '" + tempSetting + "' from settings.");
            ppar.startup_image_name = tempSetting;
      }
}

function readOneParameterFromProcessIcon(name, type)
{
      var val = null;
      name = util.mapBadChars(name);
      if (Parameters.has(name)) {
            switch (type) {
                  case 'S':
                        var val = Parameters.getString(name);
                        console.writeln(name + "=" + val);
                        break;
                  case 'O':
                        var val = Parameters.getString(name);
                        console.writeln(name + "=" + val);
                        val = JSON.parse(val);
                        break;
                  case 'B':
                        var val = Parameters.getBoolean(name);
                        console.writeln(name + "=" + val);
                        break;
                  case 'I':
                        var val = Parameters.getInteger(name);
                        console.writeln(name + "=" + val);
                        break;
                  case 'R':
                        var val = Parameters.getReal(name);
                        console.writeln(name + "=" + val);
                        break;
                  default:
                        util.throwFatalError("Unknown type '" + type + '" for parameter ' + name);
                        break;
            }
      }
      return val;
}

// Read default parameters from process icon
function readParametersFromProcessIcon() 
{
      if (global.do_not_read_settings) {
            console.writeln("Use default settings, do not read parameter values from process icon");
            return;
      }
      console.writeln("readParametersFromProcessIcon");
      for (let x in par) {
            var param = par[x];
            var val = readOneParameterFromProcessIcon(param.name, param.type);
            if (val == null && param.oldname != undefined) {
                  val = readOneParameterFromProcessIcon(param.oldname, param.type);
            }
            if (val != null) {
                  global.setParameterValue(param, val);
            }
      }
}

this.test_initialize_new = function()
{
      global.debug = true;
      global.par.debug.val = true;

      global.testmode = true;
      global.testmode_log = "";

      // do not read defaults from persistent module settings
      global.ai_use_persistent_module_settings = false; 
      global.do_not_read_settings = true;
      global.do_not_write_settings = true;

      // All logging is done by the calling test program
      util.loggingEnabled = false;
}

this.test_initdebug = function()
{
      global.par.debug.val = true;
      global.ai_use_persistent_module_settings = false;  // do not read defaults from persistent module settings
}

this.test_initialize = function()
{
      console.writeln("test_initialize");

      init_pixinsight_version();

      global.interactiveMode = false;
      global.do_not_write_settings = true;
      global.testmode = true;
      global.testmode_log = "";
      global.debug = true;

      util.setDefaultDirs();

      // Initialize ppar to the default values they have when the script is started
      ppar.win_prefix = '';
      ppar.prefixArray = [];
      ppar.userColumnCount = -1;    
      ppar.lastDir = '';  

      // Hopefully remove the prefixes of a previous run
      util.fixAllWindowArrays(ppar.win_prefix);

      // Reset the parameters to the default they would have when the program is loaded
      util.setParameterDefaults();

      console.writeln("test_initialize done");
}

this.load_setup = function(setup_path)
{
      console.writeln("load_setup " + setup_path);

      var pagearray = util.readJsonFile(setup_path, false);

      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  gui.addFilesToTreeBox(this.dialog, i, pagearray[i]);
            }
      }
      gui.updateInfoLabel(this.dialog);

      console.writeln("load_setup done");
}

this.test_autosetup = function(autosetup_path)
{
      console.writeln("test_autosetup");

      this.load_setup(autosetup_path);

      console.writeln("test_autosetup done");
}

this.test_getpar = function()
{
      return par;
}

this.test_getppar = function()
{
      return ppar;
}

this.test_gui = function()
{
      return gui;
}

this.get_run_results = function()
{
      return global.run_results;
}

this.get_autointegrate_version = function()
{
      return global.autointegrate_version;
}

this.set_outputRootDir = function(dir)
{
      util.setOutputRootDir(dir);
}

this.set_dialog = function(dialog)
{
      this.dialog = dialog;
}

this.openImageWindowFromFile = function(name)
{
      return util.openImageWindowFromFile(name);
}

/***************************************************************************
 * 
 *    autointegrate_main
 * 
 */
this.autointegrate_main = function(runsetuppath = null)
{
      var errors = false;

      console.writeln("autointegrate_main");
      try {
            /* Check command line arguments. Arguments can be given by starting the script from
             * the operating system command prompt or command line in the Process Console window. 
             *
             * The following arguments are recognized:
             * - runsetup=<path-to-json-setup-file>
             * - do_not_read_settings
             * - do_not_write_settings
             * 
             * In the operating system command prompt the arguments can be given when the
             * script is started with a run option.
             * 
             * For example:
             *   <path_to_pixinsight>/pixinsight -run="<path_to_script>/AutoIntegrate.js,runsetup=<json-file>" --force-exit
             * 
             * In the Process Console window arguments are given using syntax: a="value"
             * 
             * For example:
             *    run -a="do_not_read_settings" -a="do_not_write_settings" --execute-mode=auto "C:/path_to_script/AutoIntegrate.js"
             */
            for (let i = 0; i < jsArguments.length; i++) {
                  if (jsArguments[i].startsWith("runsetup=")) {
                        var eqpos = jsArguments[i].indexOf('=');
                        if (eqpos > 0) {
                              runsetuppath = jsArguments[i].substring(eqpos + 1).trim();
                              if (runsetuppath.length > 0) {
                                    console.writeln("Found runsetup argument, file " + runsetuppath);
                              } else {
                                    console.criticalln("Error: runsetup argument missing file name");
                                    errors = true;
                              }
                        } else {
                              console.criticalln("Error: runsetup argument missing file name");
                              errors = true;
                        }
                  } else if (jsArguments[i] == "do_not_read_settings") {
                        console.writeln("Found do_not_read_settings argument, no parameters are read from persistent module settings or from icon.");
                        global.do_not_read_settings = true;
                  } else if (jsArguments[i] == "do_not_write_settings") {
                        console.writeln("Found do_not_write_settings argument, no parameters are written to persistent module settings.");
                        global.do_not_write_settings = true;
                  } else {
                        console.criticalln("Unknown argument " + jsArguments[i]);
                        errors = true;
                  }
            }
            if (runsetuppath != null) {
                  global.interactiveMode = false;
            }

            util.setDefaultDirs();

            if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
                  // 1. Read parameters saved to process icon, these overwrite default settings
                  // read default parameters from saved settings/process icon
                  console.noteln("Read process icon settings");
                  try {
                        readParametersFromProcessIcon();
                  } catch(err) {
                        console.criticalln("Error reading parameters from process icon: " + err);
                        errors = true;
                  }
            } else {
                  // 2. Read saved parameters from persistent module settings
                  console.noteln("Read persistent module settings");
                  util.readParametersFromPersistentModuleSettings();
            }
            
            if (global.ai_use_persistent_module_settings) {
                  // 3. Read persistent module settings that are temporary work values
                  readPersistentSettings();
            } else {
                  console.noteln("Skip reading persistent settings");
            }

            util.fixAllWindowArrays(ppar.win_prefix);

            init_pixinsight_version();

            console.criticalln("   _____          __         .___        __                              __           ");
            console.criticalln("  \/  _     __ ___\/  |_  ____ |   | _____\/  |_  ____   ________________ _\/  |_  ____   ");
            console.criticalln(" \/  \/_    |  |      __ \/  _  |   |\/        __ \/ __   \/ ___ _  __  __       __ \/ __    ");
            console.warningln("\/    |       |  \/|  | (  (_) )   |   |     |    ___\/\/ \/_\/  >  |  \/\/ __  |  |    ___\/  ");
            console.warningln(" ____|__  \/____\/ |__|   ____\/|___|___|  \/__|   ___  >___  \/|__|  (____  \/__|   ___  > ");
            console.warningln("         \/                             \/           \/_____\/             \/           \/  ");

            console.noteln("======================================================");
            console.noteln("To enable automatic updates add the following link to ");
            console.noteln("the PixInsight update repository: ");
            console.noteln("https://ruuth.xyz/autointegrate/ ");
            console.noteln("======================================================");
            console.noteln("For more information visit the following links:");
            console.noteln("Web site: " + global.autointegrateinfo_link);
            console.noteln("Discussion forums: https://forums.ruuth.xyz");
            console.noteln("Discord: https://discord.gg/baqMqmKS3N");
            console.noteln("======================================================");
            console.noteln(global.autointegrate_version + ", PixInsight v" + global.pixinsight_version_str + ' (' + global.pixinsight_version_num + ')');
            console.noteln("======================================================");
            if (global.autointegrate_version_info.length > 0) {
                  for (var i = 0; i < global.autointegrate_version_info.length; i++) {
                        console.noteln(global.autointegrate_version_info[i]);
                  }
                  console.noteln("======================================================");
            }
            if (global.pixinsight_version_num < 1080810) {
                  var old_default = 'Generic';
                  if (par.use_weight.val == par.use_weight.def 
                      && par.use_weight.def != old_default) 
                  {
                        console.noteln("PixInsight version is older than 1.8.8-10, using " + old_default + " instead of " + 
                                       par.use_weight.def + " for " + par.use_weight.name);
                        par.use_weight.val = old_default;
                        par.use_weight.def = old_default;
                  }
            }
            if (global.pixinsight_version_num >= 1080902 && global.pixinsight_build_num >= 1601) {
                  // We have GradientCorrection process available
                  global.is_gc_process = true;
            } else {
                  // Old versions do not have GradientCorrection process
                  par.use_abe.val = true;
                  par.use_abe.def = true;
                  global.is_gc_process = false;
            }
            if (global.pixinsight_version_num >= 1090000) {
                  global.is_mgc_process = true;
            } else {
                  global.is_mgc_process = false;
            }
      }
      catch (x) {
            console.criticalln( x );
            errors = true;
      }

      this.dialog = new gui.AutoIntegrateDialog(global);
      global.dialog = this.dialog;
      if (runsetuppath != null) {
            console.noteln("Using JSON file: " + runsetuppath);
            // Load Json file
            this.load_setup(runsetuppath);
            // Run processing directly
            this.dialog.run_Button.onClick();
      } else {
            this.dialog.execute();
      }
}

} // AutoIntegrate wrapper end

AutoIntegrate.prototype = new Object;

// Disable execution of main if the script is included as part of a test
#ifndef TEST_AUTO_INTEGRATE

function main()
{
      var autointegrate = new AutoIntegrate();

      autointegrate.autointegrate_main();

      autointegrate = null;
}

main();

#endif // TEST_AUTO_INTEGRATE
