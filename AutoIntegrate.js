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

Routines applyAutoSTF and applySTF are from PixInsight scripts that are 
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

The following copyright notice is for routines applyAutoSTF and applySTF:

   Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.

The following condition apply for routines applyAutoSTF, applySTF and 
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

#engine v8
#feature-id   AutoIntegrate : AutoIntegrate > AutoIntegrate

#feature-info A script for running basic image processing workflow

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"

#include "AutoIntegrateLDD.js"
#include "AutoIntegrateBanding.js"
#include "AutoIntegrateCalibrate.js"
#include "AutoIntegrateEngine.js"

#include "AutoIntegratePreview.js"
#include "AutoIntegrateGUI.js"
#include "AutoIntegrateFlowchart.js"

class AutoIntegrate extends Object {
      constructor() {
            super();

this.global = new AutoIntegrateGlobal();
this.util = new AutoIntegrateUtil(this.global);
this.flowchart = new AutoIntegrateFlowchart(this.global, this.util);
this.engine = new AutoIntegrateEngine(this.global, this.util, this.flowchart);
this.gui = new AutoIntegrateGUI(this.global, this.util, this.engine, this.flowchart);

this.util.setGUI(this.gui);
this.engine.setGUI(this.gui);
this.flowchart.setGUI(this.gui);

this.par = this.global.par;
this.ppar = this.global.ppar;

} // constructor

/***************************************************************************
 * 
 *    test utility functions
 * 
 */
init_pixinsight_version()
{
      this.util.init_pixinsight_version();
}

readPersistentSettings()
{
      if (this.global.do_not_read_settings) {
            console.writeln("Use default settings, do not read session settings from persistent module settings");
            return;
      }
      // Read prefix info. We use new setting names to avoid conflict with
      // older this.global.columnCount/winPrefix names
      console.noteln("Read window prefix settings");
      var tempSetting = Settings.read("AutoIntegrate" + "/prefixName", DataType.String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixName '" + tempSetting + "' from settings.");
            this.ppar.win_prefix = tempSetting;
      }
      if (this.par.start_with_empty_window_prefix.val) {
            this.ppar.win_prefix = '';
      }
      var tempSetting  = Settings.read("AutoIntegrate" + "/prefixArray", DataType.String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixArray '" + tempSetting + "' from settings.");
            this.ppar.prefixArray = JSON.parse(tempSetting);
            if (this.ppar.prefixArray.length > 0 && this.ppar.prefixArray[0].length == 2) {
                  // We have old format prefix array without column position
                  // Add column position as the first array element
                  console.writeln("AutoIntegrate:converting old format prefix array " + JSON.stringify(this.ppar.prefixArray));
                  for (var i = 0; i < this.ppar.prefixArray.length; i++) {
                        if (this.ppar.prefixArray[i] == null) {
                              this.ppar.prefixArray[i] = [0, '-', 0];
                        } else if (this.ppar.prefixArray[i][0] == '-') {
                              // add zero column position
                              this.ppar.prefixArray[i].unshift(0);
                        } else {
                              // Used slot, add i as column position
                              this.ppar.prefixArray[i].unshift(i);
                        }
                  }
            }
            this.gui.fix_win_prefix_array();
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/columnCount", DataType.Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored columnCount '" + tempSetting + "' from settings.");
            this.ppar.userColumnCount = tempSetting;
      }
      if (!this.par.use_manual_icon_column.val) {
            this.ppar.userColumnCount = -1;
      }
      this.util.restoreLastDir();
      this.util.restoreMasterDir();
      var tempSetting = Settings.read("AutoIntegrate" + "/savedVersion", DataType.String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored savedVersion '" + tempSetting + "' from settings.");
            this.ppar.savedVersion = tempSetting;
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/savedInterfaceVersion", DataType.Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored savedInterfaceVersion '" + tempSetting + "' from settings.");
            this.ppar.savedInterfaceVersion = tempSetting;
      }

      var tempSetting = Settings.read("AutoIntegrate" + "/previewSettings", DataType.String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored previewSettings '" + tempSetting + "' from settings.");
            var preview = JSON.parse(tempSetting);
            // Check that all settings are defined. When coming from older version
            // some values may be missing. Use defaults for missing values.
            if (preview.show_histogram == undefined) {
                  preview.show_histogram = this.ppar.preview.show_histogram;
            }
            if (preview.side_preview_width == undefined) {
                  preview.side_preview_width = this.ppar.preview.side_preview_width;
            }
            if (preview.side_preview_height == undefined) {
                  preview.side_preview_height = this.ppar.preview.side_preview_height;
            }
            if (preview.side_histogram_height == undefined) {
                  preview.side_histogram_height = this.ppar.preview.side_histogram_height;
            }
            if (preview.black_background == undefined) {
                  preview.black_background = this.ppar.preview.black_background;
            }
            this.ppar.preview = preview;
            this.global.use_preview = this.ppar.preview.use_preview;
      } else {
            /* Read old style separate settings. */
            var tempSetting = Settings.read("AutoIntegrate" + "/usePreview", DataType.Boolean);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored usePreview '" + tempSetting + "' from settings.");
                  this.ppar.preview.use_preview = tempSetting;
                  this.global.use_preview = tempSetting;
            }
            /* Now we have preview size for each screen size. */
            var tempSetting = Settings.read("AutoIntegrate" + "/previewWidth", DataType.Int32);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored previewWidth '" + tempSetting + "' from settings.");
                  this.ppar.preview.preview_width = tempSetting;
            }
            var tempSetting = Settings.read("AutoIntegrate" + "/previewHeight", DataType.Int32);
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: Restored previewHeight '" + tempSetting + "' from settings.");
                  this.ppar.preview.preview_height = tempSetting;
            }
      }

      var tempSetting = Settings.read("AutoIntegrate" + "/useSingleColumn", DataType.Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored useSingleColumn '" + tempSetting + "' from settings.");
            this.ppar.use_single_column = tempSetting;
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/useMoreTabs ", DataType.Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored useMoreTabs '" + tempSetting + "' from settings.");
            this.ppar.use_more_tabs = tempSetting;
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/filesInTab", DataType.Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored filesInTab '" + tempSetting + "' from settings.");
            this.ppar.files_in_tab = tempSetting;
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/showStartupImage ", DataType.Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored showStartupImage '" + tempSetting + "' from settings.");
            this.ppar.show_startup_image = tempSetting;
      }
      var tempSetting = Settings.read("AutoIntegrate" + "/startupImageName", DataType.String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored startupImageName '" + tempSetting + "' from settings.");
            this.ppar.startup_image_name = tempSetting;
      }
}

readOneParameterFromProcessIcon(name, type)
{
      var val = null;
      name = this.util.mapBadChars(name);
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
                        this.util.throwFatalError("Unknown type '" + type + '" for parameter ' + name);
                        break;
            }
      }
      return val;
}

// Read default parameters from process icon
readParametersFromProcessIcon() 
{
      if (this.global.do_not_read_settings) {
            console.writeln("Use default settings, do not read parameter values from process icon");
            return;
      }
      console.writeln("readParametersFromProcessIcon");
      for (let x in this.par) {
            var param = this.par[x];
            var val = this.readOneParameterFromProcessIcon(param.name, param.type);
            if (val == null && param.oldname != undefined) {
                  val = this.readOneParameterFromProcessIcon(param.oldname, param.type);
            }
            if (val != null) {
                  this.global.setParameterValue(param, val);
            }
      }
}

test_initialize_new()
{
      this.global.debug = true;
      this.par.debug.val = true;

      this.global.testmode = true;
      this.global.testmode_log = "";

      this.global.interactiveMode = false;

      // do not read defaults from persistent module settings
      this.global.ai_use_persistent_module_settings = false; 
      this.global.do_not_read_settings = true;
      this.global.do_not_write_settings = true;

      // All logging is done by the calling test program
      this.util.loggingEnabled = false;
}

test_done()
{
      console.writeln("test_done");
}

load_setup(setup_path)
{
      console.writeln("load_setup " + setup_path);

      var pagearray = this.util.readJsonFile(setup_path, false);

      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  this.gui.addFilesToTreeBox(this.dialog, i, pagearray[i]);
            }
      }
      this.gui.updateInfoLabel(this.dialog);

      console.writeln("load_setup done");
}

test_nopreview()
{
      this.ppar.preview.use_preview = false;
      this.global.use_preview = false;
}

test_get_run_results()
{
      return this.global.run_results;
}

test_cancel()
{
      console.noteln("Cancel requested...");
      this.global.cancel_processing = true;
}

/***************************************************************************
 * 
 *    autointegrate_main
 * 
 */
autointegrate_main(runsetuppath = null)
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
            for (let i = 0; i < Runtime.jsArguments.length && !this.global.testmode; i++) {
                  if (Runtime.jsArguments[i].startsWith("runsetup=")) {
                        var eqpos = Runtime.jsArguments[i].indexOf('=');
                        if (eqpos > 0) {
                              runsetuppath = Runtime.jsArguments[i].substring(eqpos + 1).trim();
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
                  } else if (Runtime.jsArguments[i] == "do_not_read_settings") {
                        console.writeln("Found do_not_read_settings argument, no parameters are read from persistent module settings or from icon.");
                        this.global.do_not_read_settings = true;
                  } else if (Runtime.jsArguments[i] == "do_not_write_settings") {
                        console.writeln("Found do_not_write_settings argument, no parameters are written to persistent module settings.");
                        this.global.do_not_write_settings = true;
                  } else {
                        console.criticalln("Unknown argument " + Runtime.jsArguments[i]);
                        errors = true;
                  }
            }
            if (runsetuppath != null) {
                  this.global.interactiveMode = false;
            }

            this.util.setDefaultDirs();

            if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
                  // 1. Read parameters saved to process icon, these overwrite default settings
                  // read default parameters from saved settings/process icon
                  console.noteln("Read process icon settings");
                  try {
                        this.readParametersFromProcessIcon();
                  } catch(err) {
                        console.criticalln("Error reading parameters from process icon: " + err);
                        errors = true;
                  }
            } else {
                  // 2. Read saved parameters from persistent module settings
                  console.noteln("Read persistent module settings");
                  this.util.readParametersFromPersistentModuleSettings();
            }
            
            if (this.global.ai_use_persistent_module_settings) {
                  // 3. Read persistent module settings that are temporary work values
                  this.readPersistentSettings();
            } else {
                  console.noteln("Skip reading persistent settings");
            }

            this.util.fixAllWindowArrays(this.ppar.win_prefix);

            this.init_pixinsight_version();

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
            console.noteln("Web site: " + this.global.autointegrateinfo_link);
            console.noteln("Discussion forums: https://forums.ruuth.xyz");
            console.noteln("Discord: https://discord.gg/baqMqmKS3N");
            console.noteln("======================================================");
            console.noteln(this.global.autointegrate_version + ", PixInsight v" + this.global.pixinsight_version_str + ' (' + this.global.pixinsight_version_num + ')');
            console.noteln("======================================================");
            if (this.global.autointegrate_version_info.length > 0) {
                  for (var i = 0; i < this.global.autointegrate_version_info.length; i++) {
                        console.noteln(this.global.autointegrate_version_info[i]);
                  }
                  console.noteln("======================================================");
            }
            if (this.global.pixinsight_version_num < 1080810) {
                  var old_default = 'Generic';
                  if (this.par.use_weight.val == this.par.use_weight.def 
                      && this.par.use_weight.def != old_default) 
                  {
                        console.noteln("PixInsight version is older than 1.8.8-10, using " + old_default + " instead of " + 
                                       this.par.use_weight.def + " for " + this.par.use_weight.name);
                        this.par.use_weight.val = old_default;
                        this.par.use_weight.def = old_default;
                  }
            }
            if (this.global.pixinsight_version_num >= 1080902 && this.global.pixinsight_build_num >= 1601) {
                  // We have GradientCorrection process available
                  this.global.is_gc_process = true;
            } else {
                  // Old versions do not have GradientCorrection process
                  this.par.use_abe.val = true;
                  this.par.use_abe.def = true;
                  this.global.is_gc_process = false;
            }
            if (this.global.pixinsight_version_num >= 1090000) {
                  this.global.is_mgc_process = true;
            } else {
                  this.global.is_mgc_process = false;
            }
      }
      catch (x) {
            console.criticalln( x );
            errors = true;
      }

      // Create dialog objects after reading parameters, so that they are available for setting initial values for the dialog controls
      this.gui.AutoIntegrateDialog();

      this.dialog = this.gui;
      this.global.dialog = this.dialog;
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

} // AutoIntegrate class end

// Disable execution of main if the script is included as part of a test
#ifndef TEST_AUTO_INTEGRATE

function main()
{
      var autointegrate = new AutoIntegrate();

      autointegrate.autointegrate_main();

      autointegrate = null;
}

this.main();

#endif // TEST_AUTO_INTEGRATE
