/*

Script to automate initial steps of image processing in PixInsight.

For information check the page https://ruuth.xyz/AutoIntegrateInfo.html

Script has a GUI interface where some processing options can be selected.

In the end there will be integrated light files and automatically
processed final image. Script accepts LRGB, color and narrowband files. 
It is also possible do only partial processing and continue manually.

Clicking button AutoRun on GUI all the following steps listed below are performed.

LRGB files need to have keyword FILTER that has values for Luminance, Red, Green
or Blue channels. A couple of variants are accepted like 'Red' or 'R'.
If keyword FILTER is not found images are assumed to be color images. Also
camera RAW files can be used.

Script creates an AutoIntegrate.log file where details of the processing can be checked.

NOTE! These steps may not be updated with recent changes. They do describe the basic
      processing but some details may have changed.

Manual processing
-----------------

It is possible to rerun the script by clicking button AutoContinue with following steps 
if there are manually created images:
- L_HT + RGB_HT
  LRGB image with HistogramTransformation already done, the script starts after step <lHT> and <rgbHT>.
- RGB_HT
  Color (RGB) image with HistogramTransformation already done, the script starts after step <colorHT>.
- Integration_L_DBE + Integration_RGB_DBE
  LRGB image background extracted, the script starts after step <lABE> and <rgbABE>.
- Integration_RGB_DBE
  Color (RGB) image background extracted, the script starts with after step <colorABE>.
- Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE
  LRGB image background extracted before image integration, the script starts after step <lABE> and 
   <rgbDBE>. Automatic ABE is then skipped.
- Integration_L + Integration_R + Integration_G + Integration_B + + Integration_H + Integration_S + Integration_O
  (L)RGB or narrowband image with integrated L,R,G,B;H,S,O images the script starts with step <lII>. 

Note that it is possible to run first automatic processing and then manually enhance some 
intermediate files and autocontinue there. 
- Crop integrated images and continue automatic processing using cropped images.
- Run manual DBE.

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
3. Optionally ABE in run on L image. <lABE>
4. HistogramTransform is run on L image. <lHT>
5. Stretched L image is stored as a mask unless user has a predefined mask named AutoMask.
6. Noise reduction is run on L image using a mask.
7. If ABE_before_channel_combination is selected then ABE is run on each color channel (R,G,B). 
   <rgbDBE>
8. By default LinearFit is run on RGB channels using L, R, G or B as a reference
9. If Channel noise reduction is non-zero then noise reduction is done separately 
   for each R,G and B images using a mask.
10. ChannelCombination is run on Red, Green and Blue integrated images to
   create an RGB image. After that there is one L and one RGB image.
11. If color_calibration_before_ABE is selected then color calibration is run on RGB image.
    If use_background_neutralization is selected then BackgroundNeutralization is run before
    color calibration.
12. Optionally AutomaticBackgroundExtraction is run on RGB image. <rgbABE>
13. If color calibration is not yet done the color calibration is run on RGB image. Optionally
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
   After this step there is Integration_RGBcolor image.
2. If color_calibration_before_ABE is selected then color calibration is run on RGB image.
   If use_background_neutralization is selected then BackgroundNeutralization is run before
   color calibration.
3. Optionally ABE in run on RGB image. <colorABE>
4. If color calibration is not yet done the color calibration is run on RGB image. Optionally
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

Copyright (c) 2018-2022 Jarmo Ruuth.

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

#feature-id   AutoIntegrate : Batch Processing > AutoIntegrate

#feature-info A script for running basic image processing workflow

#define SETTINGSKEY "AutoIntegrate"

#include <pjsr/ColorSpace.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/SectionBar.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"
#include "AutoIntegrateLDD.js"
#include "AutoIntegratePreview.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegrateGUI.js"

// temporary debugging
#ifndef TEST_AUTO_INTEGRATE
// The variables defined here should have a default of 'false' and must be defined
// by the testing scripts including this script. This allow changing the ai_debug
// in the test scripts without modifying the main script
var ai_debug = false;                  // temp setting for debugging
var ai_get_process_defaults = false;   // temp setting to print process defaults
var ai_use_persistent_module_settings = true;  // read some defaults from persistent module settings
#endif

/*
 * Wrapper function to hide global variables and function to avoid name collisions.
 */
function AutoIntegrate() {

this.__base__ = Object;
this.__base__();

function setMaskChecked(imgWin, maskWin)
{
      try {
            imgWin.setMask(maskWin);
      } catch(err) {
            console.criticalln("setMask failed: " + err);
            console.criticalln("Maybe mask is from different data set, different image size/binning or different crop to common areas setting.");
            throwFatalError("Error setting the mask.");
      }
}

function getProcessingOptions()
{
      var options = [];
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  options[options.length] = [ param.name, param.val ];
            }
      }
      return options;
}

function boolToInteger(b)
{
      b == true ? 1 : 0;
}

function checkOptions()
{
      var intval = boolToInteger(par.remove_stars_before_stretch.val) + boolToInteger(par.remove_stars_channel.val) + 
                   boolToInteger(par.remove_stars_stretched.val);
      if (intval > 1) {
            throwFatalError("Only one remove stars option can be selected.")
      }
      var intval = boolToInteger(par.target_type_galaxy.val) + boolToInteger(par.target_type_nebula.val);
      if (intval > 1) {
            throwFatalError("Only one target type option can be selected.")
      }
}

function printProcessDefaultValues(name, obj)
{
      console.writeln(name);
      console.writeln(obj.toSource());
}

function getProcessDefaultValues()
{
      console.beginLog();

      write_processing_log_file = true;
      console.writeln("PixInsight process default values");
      console.writeln("PixInsight version " + pixinsight_version_str);

      printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      printProcessDefaultValues("new ImageIntegration", new ImageIntegration);
      printProcessDefaultValues("new Superbias", new Superbias);
      printProcessDefaultValues("new ImageCalibration", new ImageCalibration);
      printProcessDefaultValues("new IntegerResample", new IntegerResample);
      printProcessDefaultValues("new CosmeticCorrection", new CosmeticCorrection);
      printProcessDefaultValues("new SubframeSelector", new SubframeSelector);
      printProcessDefaultValues("new PixelMath", new PixelMath);
      if (par.use_starxterminator.val) {
            printProcessDefaultValues("new StarXTerminator", new StarXTerminator);
      }
      if (par.use_noisexterminator.val) {
            printProcessDefaultValues("new NoiseXTerminator", new NoiseXTerminator);
      }
      if (par.use_starnet2.val) {
            printProcessDefaultValues("new StarNet2", new StarNet2);
      }
      printProcessDefaultValues("new StarNet", new StarNet);
      printProcessDefaultValues("new StarAlignment", new StarAlignment);
      printProcessDefaultValues("new LocalNormalization", new LocalNormalization);
      printProcessDefaultValues("new LinearFit", new LinearFit);
      printProcessDefaultValues("new DrizzleIntegration", new DrizzleIntegration);
      printProcessDefaultValues("new AutomaticBackgroundExtractor", new AutomaticBackgroundExtractor);
      printProcessDefaultValues("new ScreenTransferFunction", new ScreenTransferFunction);
      printProcessDefaultValues("new HistogramTransformation", new HistogramTransformation);
      printProcessDefaultValues("new MaskedStretch", new MaskedStretch);
      printProcessDefaultValues("new ACDNR", new ACDNR);
      printProcessDefaultValues("new MultiscaleLinearTransform", new MultiscaleLinearTransform);
      printProcessDefaultValues("new TGVDenoise", new TGVDenoise);
      printProcessDefaultValues("new BackgroundNeutralization", new BackgroundNeutralization);
      printProcessDefaultValues("new ColorCalibration", new ColorCalibration);
      printProcessDefaultValues("new ColorSaturation", new ColorSaturation);
      printProcessDefaultValues("new CurvesTransformation", new CurvesTransformation);
      printProcessDefaultValues("new LRGBCombination", new LRGBCombination);
      printProcessDefaultValues("new SCNR", new SCNR);
      printProcessDefaultValues("new Debayer", new Debayer);
      printProcessDefaultValues("new ChannelCombination", new ChannelCombination);
      printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      printProcessDefaultValues("new Invert", new Invert);
      printProcessDefaultValues("new StarMask", new StarMask);
      printProcessDefaultValues("new HDRMultiscaleTransform", new HDRMultiscaleTransform);
      printProcessDefaultValues("new LocalHistogramEqualization", new LocalHistogramEqualization);
      printProcessDefaultValues("new MorphologicalTransformation", new MorphologicalTransformation);

      writeProcessingSteps(null, false, "AutoProcessDefaults_" + pixinsight_version_str);
}

/***************************************************************************
 * 
 *    test utility functions
 * 
 */
function init_pixinsight_version()
{
      pixinsight_version_str = CoreApplication.versionMajor + '.' + CoreApplication.versionMinor + '.' + 
                               CoreApplication.versionRelease + '-' + CoreApplication.versionRevision;
      pixinsight_version_num = CoreApplication.versionMajor * 1e6 + 
                               CoreApplication.versionMinor * 1e4 + 
                               CoreApplication.versionRelease * 1e2 + 
                               CoreApplication.versionRevision;
}

this.test_initialize = function()
{
      console.writeln("test_initialize");

      init_pixinsight_version();

      do_not_write_settings = true;

      setDefaultDirs();

      // Initialize ppar to the default values they have when the script is started
      ppar.win_prefix = '';
      ppar.prefixArray = [];
      ppar.userColumnCount = -1;    
      ppar.lastDir = '';  

      // Hopefully remove the prefixes of a previous run
      fixAllWindowArrays(ppar.win_prefix);

      // Reset the parameters to the default they would have when the program is loaded
      setParameterDefaults();

      console.writeln("test_initialize done");
}

this.test_autosetup = function(autosetup_path)
{
      console.writeln("test_autosetup");

      var pagearray = readJsonFile(autosetup_path, false);

      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  addFilesToTreeBox(this.dialog, i, pagearray[i]);
            }
      }
      updateInfoLabel(this.dialog);

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

this.get_run_results = function()
{
      return run_results;
}

this.get_autointegrate_version = function()
{
      return autointegrate_version;
}

this.set_outputRootDir = function(dir)
{
      outputRootDir = dir;
}

this.set_dialog = function(dialog)
{
      this.dialog = dialog;
}

this.openImageWindowFromFile = function(name)
{
      return openImageWindowFromFile(name);
}

/***************************************************************************
 * 
 *    autointerate_main
 * 
 */
 this.autointerate_main = function ()
{
      console.writeln("autointerate_main");
      try {
            /* Check command line arguments. Arguments can be given by starting the script from
             * the command line in the Process Console window. Arguments are given using syntax:
             *    -a="value"
             * For example:
             *    run -a="do_not_read_settings" -a="do_not_write_settings" --execute-mode=auto "C:/Users/jarmo_000/GitHub/AutoIntegrate/AutoIntegrate.js"
             * You can find the start command line by checking the Process Console window after starting
             * the scrip.
             */
            for (let i = 0; i < jsArguments.length; i++) {
                  if (jsArguments[i] == "do_not_read_settings") {
                        console.writeln("Found do_not_read_settings argument, no parameters are read from persistent module settings or from icon.");
                        do_not_read_settings = true;
                  } 
                  if (jsArguments[i] == "do_not_write_settings") {
                        console.writeln("Found do_not_write_settings argument, no parameters are written to persistent module settings.");
                        do_not_write_settings = true;
                  } 
            }

            setDefaultDirs();

            // 1. Read saved parameters from persistent module settings
            console.noteln("Read persistent module settings");
            ReadParametersFromPersistentModuleSettings();

            // 2. Read parameters saved to process icon, these overwrite persistent module settings
            if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
                  // read default parameters from saved settings/process icon
                  console.noteln("Read process icon settings");
                  readParametersFromProcessIcon();
            }
            
            if (ai_use_persistent_module_settings) {
                  // 3. Read persistent module settings that are temporary work values
                  readPersistentSettings();
            } else {
                  console.noteln("Skip reading persistent settings");
            }

            fixAllWindowArrays(ppar.win_prefix);

            init_pixinsight_version();
            console.noteln("======================================================");
            console.noteln("To enable automatic updates add the following link to ");
            console.noteln("the PixInsight update repository: ");
            console.noteln("https://ruuth.xyz/autointegrate ");
            console.noteln("======================================================");
            console.noteln("For more information visit the following link:");
            console.noteln("https://ruuth.xyz/AutoIntegrateInfo.html");
            console.noteln("======================================================");
            console.noteln(autointegrate_version + ", PixInsight v" + pixinsight_version_str + ' (' + pixinsight_version_num + ')');
            console.noteln("======================================================");
            
            if (pixinsight_version_num < 1080810) {
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
      }
      catch (x) {
            console.writeln( x );
      }


      this.dialog = new AutoIntegrateDialog();

      this.dialog.execute();
}

} // AutoIntegrate wrapper end

AutoIntegrateDialog.prototype = new Dialog;
PreviewControl.prototype = new Frame;
AutoIntegrate.prototype = new Object;

function main()
{
      var autointegrate = new AutoIntegrate();

      autointegrate.autointerate_main();

      autointegrate = null;
}

// Disable execution of main if the script is included as part of a test
#ifndef TEST_AUTO_INTEGRATE
main();
#endif
